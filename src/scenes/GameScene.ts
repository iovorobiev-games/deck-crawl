import Phaser from "phaser";
import { Card, CARD_W, CARD_H } from "../entities/Card";
import { PlayerView } from "../entities/PlayerView";
import { FateDeckPopup } from "../entities/FateDeckPopup";
import { GameOverScreen } from "../entities/GameOverScreen";
import { InventoryView } from "../entities/InventoryView";
import { Deck } from "../systems/Deck";
import { Grid, COLS, ROWS } from "../systems/Grid";
import { Player } from "../systems/Player";
import { Inventory, SLOT_DEFS } from "../systems/Inventory";
import { CardType, CardData } from "../entities/CardData";
import { dungeonConfig, DungeonLevel } from "../data/dungeonConfig";
import { getCard } from "../data/cardRegistry";
import { getAbility, AbilityTrigger, CardAbility } from "../data/abilityRegistry";
import { WinScreen } from "../entities/WinScreen";
import { CRTPostFX } from "../pipelines/CRTPostFX";
import { VignettePostFX } from "../pipelines/VignettePostFX";
import { getVfx, VfxTarget } from "../effects/vfxRegistry";
import { SoundManager, SOUND_KEYS, SOUND_GROUPS } from "../systems/SoundManager";

const GAME_W = 1920;
const GAME_H = 1080;
const TREASURE_OFFSET_Y = 32;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private deck!: Deck;
  private grid!: Grid;
  private deckText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text; // hidden, kept for alpha toggling
  private exploreBtn!: Phaser.GameObjects.Container;
  private exploreBtnBg!: Phaser.GameObjects.Graphics;
  private exploreBtnText!: Phaser.GameObjects.Text;
  private deckGroup!: Phaser.GameObjects.Container;
  private deckVisual: Phaser.GameObjects.Image[] = [];
  private playerView!: PlayerView;
  private fateDeckPopup: FateDeckPopup | null = null;
  private isResolving = false;
  private combatMonster: Card | null = null;
  private combatOverlay: Phaser.GameObjects.Rectangle | null = null;
  private fightBtn: Phaser.GameObjects.Container | null = null;
  private gridBgGraphics: Phaser.GameObjects.Image[] = [];
  private inventory!: Inventory;
  private inventoryView!: InventoryView;
  private dragCard: Card | null = null;
  private dragStartPos: { x: number; y: number } | null = null;
  private dragOrigGridPos: { col: number; row: number } | null = null;
  private isDragging = false;
  private guardedByMonster: Map<Card, Card> = new Map();
  private crackingChest: Card | null = null;
  private chestOverlay: Phaser.GameObjects.Rectangle | null = null;
  private crackBtn: Phaser.GameObjects.Container | null = null;
  private disarmingTrap: Card | null = null;
  private trapOverlay: Phaser.GameObjects.Rectangle | null = null;
  private disarmBtn: Phaser.GameObjects.Container | null = null;
  private exchangerCard: Card | null = null;
  private exchangerOverlay: Phaser.GameObjects.Rectangle | null = null;
  private exchangerBtn: Phaser.GameObjects.Container | null = null;
  private chestLoot: Map<Card, { lootData: CardData; cardBack: Phaser.GameObjects.Container }> = new Map();
  private currentLevelIndex = 0;
  private dungeonLevels!: DungeonLevel[];
  private currentLevelKey: CardData | null = null;
  private levelIndicator!: Phaser.GameObjects.Text;
  private levelFlavorText!: Phaser.GameObjects.Text;
  private backgroundImage!: Phaser.GameObjects.Image;
  private discardedCardIds: Set<string> = new Set();
  private poisonedWeapons: { slotName: string; amount: number }[] = [];
  private dragTargetMonster: Card | null = null;
  private hoverPreviewCard: Card | null = null;
  private vignetteFX!: VignettePostFX;
  private lastUsedScrollId: string | null = null;
  private sfx!: SoundManager;

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    this.sfx = new SoundManager(this);

    this.backgroundImage = this.add.image(GAME_W / 2, GAME_H / 2, "background")
      .setScale(1.05);

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      const offsetX = -((pointer.x / GAME_W) - 0.5) * 30;
      const offsetY = -((pointer.y / GAME_H) - 0.5) * 15;
      this.backgroundImage.x = GAME_W / 2 + offsetX;
      this.backgroundImage.y = GAME_H / 2 + offsetY;
    });

    this.player = new Player(6);
    this.grid = new Grid(GAME_W, GAME_H);

    this.dungeonLevels = dungeonConfig.levels;
    this.currentLevelIndex = 0;
    this.initLevel(0);
    this.tintBackground();

    this.inventory = new Inventory();

    this.deckGroup = this.add.container(350, 0);
    this.createHUD();
    this.createGridBackground();
    this.createDeckVisual();
    this.createExploreButton();
    this.createLevelIndicator();
    this.add.image(GAME_W / 2, 910, "player_panel_bg");
    this.createPlayerView();
    this.inventoryView = new InventoryView(this, this.inventory);
    this.setupSlotDiscard();

    this.inventory.on("statsChanged", () => this.updatePlayerStats());

    // Draw initial 3 cards
    this.drawAndPlaceCards(3);

    this.player.on("hpChanged", () => this.updatePlayerStats());
    this.player.on("goldChanged", () => this.updateHUD());

    const renderer = this.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
    renderer.pipelines.addPostPipeline("CRTPostFX", CRTPostFX);
    renderer.pipelines.addPostPipeline("VignettePostFX", VignettePostFX);
    this.cameras.main.setPostPipeline(CRTPostFX);
    this.cameras.main.setPostPipeline(VignettePostFX);
    this.vignetteFX = this.cameras.main.getPostPipeline(
      VignettePostFX
    ) as VignettePostFX;
    this.vignetteFX.setLevel(this.currentLevelIndex);
  }

  private createHUD(): void {
    this.deckText = this.add.text(0, 320, "", {
      fontSize: "28px",
      fontFamily: "monospace",
      color: "#aaaacc",
    }).setOrigin(0.5, 0);
    this.deckGroup.add(this.deckText);

    this.goldText = this.add.text(0, 460, "", {
      fontSize: "28px",
      fontFamily: "monospace",
      color: "#ddaa22",
    }).setOrigin(0.5, 0).setVisible(false);
    this.deckGroup.add(this.goldText);

    this.updateHUD();
  }

  private updateHUD(): void {
    this.deckText.setText(`Deck: ${this.deck.remaining} cards`);
    this.goldText.setText(`Gold: ${this.player.gold}`);
    this.playerView?.updateGold(this.player.gold);
  }

  private createGridBackground(): void {
    this.gridBgGraphics = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const pos = this.grid.worldPos(c, r);
        const img = this.add.image(pos.x, pos.y, "grid_item");
        img.setDisplaySize(CARD_W, CARD_H);
        this.gridBgGraphics.push(img);
      }
    }
  }

  private createDeckVisual(): void {
    this.deckVisual = [];
    this.updateDeckVisual();
  }

  private updateDeckVisual(): void {
    this.deckVisual.forEach(img => img.destroy());
    this.deckVisual = [];
    if (this.deck.isEmpty) return;

    // Stacked card backs — relative to deckGroup
    const layers = Math.min(3, Math.ceil(this.deck.remaining / 5));
    for (let i = 0; i < layers; i++) {
      const offset = i * 4;
      const img = this.add.image(offset, 200 + offset, "card_back");
      this.deckGroup.add(img);
      this.deckVisual.push(img);
    }
  }

  private createExploreButton(): void {
    this.exploreBtn = this.add.container(0, 398);
    this.deckGroup.add(this.exploreBtn);

    this.exploreBtnBg = this.add.graphics();
    this.drawExploreButtonBg(0x3355aa);
    this.exploreBtn.add(this.exploreBtnBg);

    this.exploreBtnText = this.add.text(0, 0, "EXPLORE", {
      fontSize: "28px",
      fontFamily: "monospace",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.exploreBtn.add(this.exploreBtnText);

    this.exploreBtn.setSize(140, 56);
    this.exploreBtn.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, 140, 56),
      Phaser.Geom.Rectangle.Contains
    );

    this.exploreBtn.on("pointerover", () => {
      if (!this.deck.isEmpty && !this.hasTrapOnGrid()) this.drawExploreButtonBg(0x4466cc);
    });
    this.exploreBtn.on("pointerout", () => {
      this.drawExploreButtonBg(this.isExploreBlocked() ? 0x333344 : 0x3355aa);
    });
    this.exploreBtn.on("pointerdown", () => this.onExplore());
  }

  private drawExploreButtonBg(color: number): void {
    this.exploreBtnBg.clear();
    this.exploreBtnBg.fillStyle(color, 1);
    this.exploreBtnBg.fillRoundedRect(-70, -28, 140, 56, 12);
    this.exploreBtnBg.lineStyle(2, 0x6688ee, 0.6);
    this.exploreBtnBg.strokeRoundedRect(-70, -28, 140, 56, 12);
  }

  private createPlayerView(): void {
    this.playerView = new PlayerView(this, GAME_W / 2, 910);
    this.playerView.updateStats(this.player);
    this.playerView.updateGold(this.player.gold);

    this.playerView.on("pointerdown", () => {
      if (this.fateDeckPopup) return;
      this.fateDeckPopup = new FateDeckPopup(
        this,
        GAME_W / 2,
        700,
        this.player.fateDeckCards
      );
      this.fateDeckPopup.once("destroy", () => {
        this.fateDeckPopup = null;
      });
    });
  }

  private initLevel(levelIndex: number): void {
    const level = this.dungeonLevels[levelIndex];
    this.deck = Deck.fromDungeonLevel(level, levelIndex);
    this.deck.onShuffle = () => this.sfx.play(SOUND_KEYS.cardDraw3);
    this.currentLevelKey = getCard(level.key);
  }

  /** Darken the background image based on current dungeon level. */
  private tintBackground(): void {
    // Per-level brightness: 1.0 = full bright, lower = darker
    const LEVEL_TINT = [1.0, 0.78, 0.55];
    const brightness = LEVEL_TINT[Math.min(this.currentLevelIndex, LEVEL_TINT.length - 1)];
    const channel = Math.round(brightness * 255);
    const tint = (channel << 16) | (channel << 8) | channel;
    this.backgroundImage.setTint(tint);
  }

  private createLevelIndicator(): void {
    this.levelIndicator = this.add.text(0, 20, "", {
      fontSize: "22px",
      fontFamily: "monospace",
      color: "#ddaa22",
      fontStyle: "bold",
    }).setOrigin(0.5, 0);
    this.deckGroup.add(this.levelIndicator);

    this.levelFlavorText = this.add.text(0, 48, "", {
      fontSize: "16px",
      fontFamily: "monospace",
      color: "#8888aa",
      fontStyle: "italic",
    }).setOrigin(0.5, 0);
    this.deckGroup.add(this.levelFlavorText);

    this.updateLevelIndicator();
  }

  private updateLevelIndicator(): void {
    const level = this.dungeonLevels[this.currentLevelIndex];
    this.levelIndicator.setText(`Level ${this.currentLevelIndex + 1}: ${level.name}`);
    this.levelFlavorText.setText(level.flavorText);
  }

  private updatePlayerStats(): void {
    const newMaxHp = 6 + this.inventory.maxHpBonus;
    if (newMaxHp !== this.player.maxHp) {
      const diff = newMaxHp - this.player.maxHp;
      this.player.maxHp = newMaxHp;
      if (diff > 0) {
        // MaxHP increased — heal the difference
        this.player.heal(diff);
      } else {
        // MaxHP decreased — subtract the lost bonus HP (minimum 1)
        const lost = -diff;
        this.player.hp = Math.max(1, this.player.hp - lost);
        if (this.player.hp > this.player.maxHp) {
          this.player.hp = this.player.maxHp;
        }
        this.player.emit("hpChanged", this.player.hp, this.player.maxHp);
      }
    }
    this.playerView.updateStats(this.player, this.inventory.powerBonus, this.getPassiveAgilityModifier() + this.inventory.agilityBonus, this.getPassivePowerModifier());
    this.updateMonsterBuffIndicators();
    this.refreshWeaponSlotBonuses();
    this.refreshBowShotDisplays();
  }

  private getPassivePowerModifier(): number {
    let total = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const card = this.grid.getCardAt(c, r);
        if (card?.cardData.abilities) {
          for (const ab of card.cardData.abilities) {
            const def = getAbility(ab.abilityId);
            if (def.trigger === "passive" && def.effect === "modifyPower") {
              total += Number(ab.params.amount ?? 0);
            }
          }
        }
      }
    }
    for (const slotDef of SLOT_DEFS) {
      if (slotDef.name.startsWith("backpack")) continue;
      const item = this.inventory.getItem(slotDef.name);
      if (item?.abilities) {
        for (const ab of item.abilities) {
          const def = getAbility(ab.abilityId);
          if (def.trigger === "passive" && def.effect === "modifyPower") {
            total += Number(ab.params.amount ?? 0);
          }
        }
      }
    }
    // Check for melee weapon boost from equipped items (e.g., Warrior Helm doubles weapon power)
    if (this.hasEquippedPassive("boostMeleeWeaponPower")) {
      for (const slotName of ["weapon1", "weapon2"]) {
        const weapon = this.inventory.getItem(slotName);
        if (!weapon || weapon.isKey || weapon.tag === "bow") continue;
        // Check if it's a pure shield (has absorbDamage ability and value is 0)
        const hasArmour = weapon.abilities?.some(a => getAbility(a.abilityId).effect === "absorbDamage") ?? false;
        if (hasArmour && weapon.value === 0) continue;
        total += weapon.value;
      }
    }
    return total;
  }

  private getPassiveAgilityModifier(): number {
    let total = 0;
    // Scan grid cards
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const card = this.grid.getCardAt(c, r);
        if (card?.cardData.abilities) {
          for (const ab of card.cardData.abilities) {
            const def = getAbility(ab.abilityId);
            if (def.trigger === "passive" && def.effect === "modifyAgility") {
              total += Number(ab.params.amount ?? 0);
            }
          }
        }
      }
    }
    // Scan inventory slots
    for (const slotDef of SLOT_DEFS) {
      if (slotDef.name.startsWith("backpack")) continue;
      const item = this.inventory.getItem(slotDef.name);
      if (item?.abilities) {
        for (const ab of item.abilities) {
          const def = getAbility(ab.abilityId);
          if (def.trigger === "passive" && def.effect === "modifyAgility") {
            total += Number(ab.params.amount ?? 0);
          }
        }
      }
    }
    return total;
  }

  private getEquippedPassiveAmount(effect: string): number {
    let total = 0;
    for (const slotDef of SLOT_DEFS) {
      if (slotDef.name.startsWith("backpack")) continue;
      const item = this.inventory.getItem(slotDef.name);
      if (!item?.abilities) continue;
      for (const ab of item.abilities) {
        const def = getAbility(ab.abilityId);
        if (def.trigger === "passive" && def.effect === effect) {
          total += (ab.params.amount as number) || 0;
        }
      }
    }
    return total;
  }

  private hasEquippedPassive(effect: string): boolean {
    for (const slotDef of SLOT_DEFS) {
      if (slotDef.name.startsWith("backpack")) continue;
      const item = this.inventory.getItem(slotDef.name);
      if (!item?.abilities) continue;
      for (const ab of item.abilities) {
        const def = getAbility(ab.abilityId);
        if (def.trigger === "passive" && def.effect === effect) return true;
      }
    }
    return false;
  }

  /** Refresh weapon inventory slots to show melee boost from Warrior Helm. */
  private refreshWeaponSlotBonuses(): void {
    const hasMeleeBoost = this.hasEquippedPassive("boostMeleeWeaponPower");
    for (const slotName of ["weapon1", "weapon2"]) {
      const weapon = this.inventory.getItem(slotName);
      if (!weapon || weapon.isKey || weapon.tag === "bow") {
        this.inventoryView.refreshSlot(slotName, 0);
        continue;
      }
      const hasArmour = weapon.abilities?.some(a => getAbility(a.abilityId).effect === "absorbDamage") ?? false;
      if (hasArmour && weapon.value === 0) {
        this.inventoryView.refreshSlot(slotName, 0);
        continue;
      }
      this.inventoryView.refreshSlot(slotName, hasMeleeBoost ? weapon.value : 0);
    }
  }

  /** Apply poison to an equipped weapon: increase its power and mark it poisoned until combat ends. */
  private applyPoisonToWeapon(slotName: string, amount: number): void {
    const weapon = this.inventory.getItem(slotName);
    if (!weapon) return;
    weapon.value += amount;
    weapon.poisoned = true;
    this.poisonedWeapons.push({ slotName, amount });
    this.updatePlayerStats();
  }

  /** Revert all active poison effects after combat. */
  private revertPoison(): void {
    for (const { slotName, amount } of this.poisonedWeapons) {
      const weapon = this.inventory.getItem(slotName);
      if (weapon && weapon.poisoned) {
        weapon.value = Math.max(0, weapon.value - amount);
        weapon.poisoned = false;
      }
    }
    this.poisonedWeapons = [];
    this.updatePlayerStats();
  }

  /** Update power display on all bow shot cards on the grid to reflect equipped bonuses. */
  private refreshBowShotDisplays(): void {
    const bowBonus = this.getEquippedPassiveAmount("boostBowDamage");
    let agilityBonus = 0;
    if (this.hasEquippedPassive("addAgilityToBowDamage")) {
      agilityBonus = this.player.agility + this.getPassiveAgilityModifier() + this.inventory.agilityBonus;
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const card = this.grid.getCardAt(c, r);
        if (!card?.cardData.abilities) continue;
        const bowAbility = card.cardData.abilities.find(a => getAbility(a.abilityId).effect === "reduceRandomEnemyPower");
        if (bowAbility) {
          const base = bowAbility.params.amount as number;
          card.setPowerDisplay(base + bowBonus + agilityBonus);
        }
      }
    }
  }

  /** Apply equipped bow bonuses to a single card's power display if it's a bow shot. */
  private applyLevelScaling(card: CardData): void {
    const powerBonus = this.currentLevelIndex * 2;
    if (powerBonus > 0 && card.type === CardType.Monster) {
      card.value += powerBonus;
    }
  }

  private applyBowShotBonus(card: Card): void {
    const bowAbility = card.cardData.abilities?.find(a => getAbility(a.abilityId).effect === "reduceRandomEnemyPower");
    if (!bowAbility) return;
    const base = bowAbility.params.amount as number;
    const bonus = this.getEquippedPassiveAmount("boostBowDamage");
    let agilityBonus = 0;
    if (this.hasEquippedPassive("addAgilityToBowDamage")) {
      agilityBonus = this.player.agility + this.getPassiveAgilityModifier() + this.inventory.agilityBonus;
    }
    card.setPowerDisplay(base + bonus + agilityBonus);
  }

  private getMonsterPowerBuff(): number {
    let total = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const card = this.grid.getCardAt(c, r);
        if (card?.cardData.abilities) {
          for (const ab of card.cardData.abilities) {
            const def = getAbility(ab.abilityId);
            if (def.trigger === "passive" && def.effect === "modifyMonsterPower") {
              total += Number(ab.params.amount ?? 0);
            }
          }
        }
      }
    }
    return total;
  }

  private updateMonsterBuffIndicators(): void {
    const buff = this.getMonsterPowerBuff();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const card = this.grid.getCardAt(c, r);
        if (card && card.cardData.type === CardType.Monster) {
          card.setBuffIndicator(buff);
        }
      }
    }
  }

  private onExplore(): void {
    if (this.deck.isEmpty || this.isResolving || this.hasTrapOnGrid()) return;

    const onExploreAbilities = this.collectOnExploreAbilities();
    if (onExploreAbilities.length === 0) {
      this.drawAndPlaceCards(3);
      return;
    }

    this.isResolving = true;
    this.executeOnExploreAbilities(onExploreAbilities, () => {
      this.isResolving = false;
      if (this.player.hp <= 0) {
        this.showGameOver();
        return;
      }
      this.drawAndPlaceCards(3);
    });
  }

  private drawAndPlaceCards(count: number): void {
    const emptySlots = this.grid.getEmptySlots();
    if (emptySlots.length === 0) return;

    const drawCount = Math.min(count, this.deck.remaining);
    if (drawCount === 0) return;
    const drawn = this.deck.draw(drawCount);

    // Shuffle empty slots for random placement
    for (let i = emptySlots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [emptySlots[i], emptySlots[j]] = [emptySlots[j], emptySlots[i]];
    }

    // Pre-plan: determine which monsters claim existing loot or generate new loot
    const claimedSet = new Set<Card>();
    interface PlacementPlan {
      cardData: CardData;
      slot?: { col: number; row: number };
      existingLoot?: Card;       // existing grid loot to claim
      generatedLoot?: CardData;  // new loot to generate
    }
    const plans: PlacementPlan[] = [];

    let slotIndex = 0;
    for (let i = 0; i < drawn.length; i++) {
      const cardData = drawn[i];

      // Event cards don't go on the grid
      if (cardData.type === CardType.Event) {
        plans.push({ cardData });
        continue;
      }

      if (slotIndex >= emptySlots.length) continue;
      const slot = emptySlots[slotIndex++];
      const plan: PlacementPlan = { cardData, slot };

      if (cardData.type === CardType.Monster) {
        const level = this.dungeonLevels[this.currentLevelIndex];
        const keyReady = cardData.isBoss && this.currentLevelKey
          && (!level.keyCondition || this.discardedCardIds.has(level.keyCondition));
        if (keyReady) {
          plan.generatedLoot = this.currentLevelKey!;
          this.currentLevelKey = null;
        } else {
          const existing = this.findUnguardedLootOnGrid(claimedSet);
          if (existing) {
            claimedSet.add(existing);
            plan.existingLoot = existing;
            // Monster takes over the loot's grid slot
            const lootCell = this.grid.findCard(existing);
            if (lootCell) {
              plan.slot = { col: lootCell.col, row: lootCell.row };
            }
          } else {
            const loot = this.deck.drawLoot();
            if (loot) plan.generatedLoot = loot;
          }
        }
      }

      plans.push(plan);
    }

    this.updateHUD();
    this.updateDeckVisual();

    // Process cards sequentially (events get presented, grid cards get placed)
    this.processCardQueue(plans, 0);
  }

  private processCardQueue(plans: { cardData: CardData; slot?: { col: number; row: number }; existingLoot?: Card; generatedLoot?: CardData }[], index: number): void {
    if (index >= plans.length) {
      this.updatePlayerStats();
      this.updateDeckVisual();
      this.updateExploreButtonState();
      return;
    }

    // Abort if player died from a previous event
    if (this.player.hp <= 0) {
      this.showGameOver();
      return;
    }

    const plan = plans[index];

    if (plan.cardData.type === CardType.Event) {
      this.presentEventCard(plan.cardData, () => {
        this.processCardQueue(plans, index + 1);
      });
    } else {
      this.placeGridCard(plan as { cardData: CardData; slot: { col: number; row: number }; existingLoot?: Card; generatedLoot?: CardData });
      this.time.delayedCall(150, () => {
        this.processCardQueue(plans, index + 1);
      });
    }
  }

  private placeGridCard(plan: { cardData: CardData; slot: { col: number; row: number }; existingLoot?: Card; generatedLoot?: CardData }): void {
    this.sfx.playRandom(SOUND_GROUPS.cardDraw);

    // Boss with key must occupy a genuinely empty cell — re-pick if slot was taken
    if (plan.cardData.isBoss && plan.generatedLoot && this.grid.getCardAt(plan.slot.col, plan.slot.row)) {
      const fresh = this.grid.getEmptySlots();
      if (fresh.length > 0) plan.slot = fresh[0];
    }

    const pos = this.grid.worldPos(plan.slot.col, plan.slot.row);
    const deckX = 350;
    const deckY = 200;

    if (plan.cardData.type === CardType.Monster) {
      let lootCard: Card | null = null;

      if (plan.existingLoot) {
        lootCard = plan.existingLoot;
        const lootCell = this.grid.findCard(lootCard);
        if (lootCell) this.grid.removeCard(lootCell.col, lootCell.row);
        lootCard.setPosition(pos.x, pos.y - TREASURE_OFFSET_Y);
        lootCard.setDepth(5);
      } else if (plan.generatedLoot) {
        lootCard = new Card(this, pos.x, pos.y - TREASURE_OFFSET_Y, plan.generatedLoot);
        lootCard.setDepth(5);
        lootCard.reveal();
      }

      const monsterCard = new Card(this, pos.x, pos.y, plan.cardData);
      monsterCard.setDepth(10);
      this.grid.placeCard(plan.slot.col, plan.slot.row, monsterCard);
      const selfCount = this.gridCountCard(plan.cardData.id);
      monsterCard.dealFrom(deckX, deckY, () => {
        this.executeOnRevealAbilities(monsterCard, plan.cardData, undefined, selfCount);
      });

      if (lootCard) {
        monsterCard.guardedLoot = lootCard;
        this.guardedByMonster.set(lootCard, monsterCard);
        this.setupGuardedLootInteraction(lootCard, monsterCard);
      }
      this.setupCardInteraction(monsterCard);
    } else if (plan.cardData.type === CardType.Chest) {
      const lootData = this.deck.drawLootForChest();

      const chestCard = new Card(this, pos.x, pos.y, plan.cardData);
      chestCard.setDepth(10);
      this.grid.placeCard(plan.slot.col, plan.slot.row, chestCard);
      chestCard.dealFrom(deckX, deckY);

      if (lootData) {
        const cardBack = this.createCardBack(pos.x, pos.y - TREASURE_OFFSET_Y+24);
        cardBack.setDepth(5);
        this.chestLoot.set(chestCard, { lootData, cardBack });
      }
      this.setupCardInteraction(chestCard);
    } else if (plan.cardData.type === CardType.Door) {
      const doorCard = new Card(this, pos.x, pos.y, plan.cardData);
      this.grid.placeCard(plan.slot.col, plan.slot.row, doorCard);
      doorCard.dealFrom(deckX, deckY);
      this.setupDoorInteraction(doorCard);
    } else {
      const card = new Card(this, pos.x, pos.y, plan.cardData);
      this.applyBowShotBonus(card);
      this.grid.placeCard(plan.slot.col, plan.slot.row, card);
      const selfCount = this.gridCountCard(plan.cardData.id);
      card.dealFrom(deckX, deckY, () => {
        this.executeOnRevealAbilities(card, plan.cardData, undefined, selfCount);
      });
      this.setupCardInteraction(card);
      if (plan.cardData.type === CardType.Trap) {
        this.updateExploreButtonState();
      }
    }
  }

  private presentEventCard(cardData: CardData, onComplete: () => void): void {
    this.sfx.playRandom(SOUND_GROUPS.cardDraw);
    this.isResolving = true;

    // Dark overlay — starts fully transparent
    const overlay = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0);
    overlay.setDepth(900);

    // Create card at the dungeon deck position
    const card = new Card(this, 350, 200, cardData);
    this.applyBowShotBonus(card);
    card.setDepth(910);

    // Phase 1: Card travels from deck to center while background darkens
    this.tweens.add({
      targets: card,
      x: GAME_W / 2,
      y: GAME_H / 2,
      duration: 500,
      ease: "Power2",
    });
    this.tweens.add({
      targets: overlay,
      alpha: 0.6,
      duration: 500,
      ease: "Power2",
      onComplete: () => {
        // Phase 2: Card scales up at center
        this.tweens.add({
          targets: card,
          scaleX: 1.8,
          scaleY: 1.8,
          duration: 400,
          ease: "Back.easeOut",
          onComplete: () => {
            // Hold for readability, then execute abilities
            this.time.delayedCall(1500, () => {
              this.executeOnRevealAbilities(card, cardData, () => {
                // Fire onResolve abilities before visual resolve
                const resolveAbilities = this.collectAbilities("onResolve", cardData);
                this.executeOnResolveAbilities(card, resolveAbilities, () => {
                  // Resolve card (shrink & destroy)
                  card.resolve(() => {
                    overlay.destroy();
                    this.isResolving = false;
                    if (this.player.hp <= 0) {
                      this.showGameOver();
                      return;
                    }
                    onComplete();
                  });
                });
              });
            });
          },
        });
      },
    });
  }

  private executeOnRevealAbilities(card: Card, cardData: CardData, onComplete?: () => void, gridSelfCount?: number): void {
    if (!cardData.abilities) {
      onComplete?.();
      return;
    }

    const revealAbilities = cardData.abilities.filter((a) => {
      const def = getAbility(a.abilityId);
      return def.trigger === "onReveal";
    });

    if (revealAbilities.length === 0) {
      onComplete?.();
      return;
    }

    // Process abilities sequentially
    const processNext = (idx: number) => {
      if (idx >= revealAbilities.length) {
        onComplete?.();
        return;
      }
      const ability = revealAbilities[idx];
      const def = getAbility(ability.abilityId);
      switch (def.effect) {
        case "damagePlayer":
          this.playDamagePlayerEffect(card, ability.params.amount as number, () => processNext(idx + 1));
          break;
        case "shuffleIntoDeck": {
          const cardId = ability.params.cardId as string;
          const count = ability.params.count as number;
          this.playSummonToDeckAnimation(card, cardId, count, () => processNext(idx + 1));
          break;
        }
        case "shuffleIntoDeckIfAbsent": {
          const cardId = ability.params.cardId as string;
          const count = ability.params.count as number;
          if (this.deck.hasCard(cardId) || this.gridHasCard(cardId)) {
            processNext(idx + 1);
          } else {
            this.playSummonToDeckAnimation(card, cardId, count, () => processNext(idx + 1));
          }
          break;
        }
        case "shuffleIntoDeckOnGridCount": {
          const cardId = ability.params.cardId as string;
          const count = ability.params.count as number;
          const requiredOtherCount = ability.params.requiredOtherCount as number;
          const othersOnGrid = (gridSelfCount ?? this.gridCountCard(cardData.id)) - 1;
          if (othersOnGrid === requiredOtherCount && !this.deck.hasCard(cardId) && !this.gridHasCard(cardId)) {
            // Add to deck immediately to prevent duplicate summons from simultaneous reveals
            // Suppress sound here — animation will play it at the right time
            const cardsToInsert = [];
            for (let i = 0; i < count; i++) {
              const c = getCard(cardId);
              this.applyLevelScaling(c);
              cardsToInsert.push(c);
            }
            const saved = this.deck.onShuffle;
            this.deck.onShuffle = null;
            this.deck.mergeCards(cardsToInsert);
            this.deck.onShuffle = saved;
            this.playSummonToDeckAnimation(card, cardId, count, () => processNext(idx + 1));
          } else {
            processNext(idx + 1);
          }
          break;
        }
        case "reduceWeaponPower": {
          const amount = ability.params.amount as number;
          // Bug 7: Find which weapon slot will be affected and play hit animation
          const targetSlot = this.findFirstWeaponSlot();
          if (targetSlot) {
            this.playHitOnSlotAnimation(
              card,
              targetSlot,
              () => {
                this.reduceEquippedWeaponPower(amount);
                processNext(idx + 1);
              },
            );
          } else {
            this.reduceEquippedWeaponPower(amount);
            processNext(idx + 1);
          }
          break;
        }
        case "removeFromDeck": {
          const removeCardId = ability.params.cardId as string;
          this.playRemoveFromDeckAnimation(removeCardId, () => processNext(idx + 1));
          break;
        }
        case "addFateModifier": {
          this.sfx.play(SOUND_KEYS.holySpell06);
          const mod = ability.params.modifier as number;
          this.playFlyToFateDeckAnimation({ x: card.x, y: card.y }, mod, () => processNext(idx + 1));
          break;
        }
        case "reduceRandomEnemyPower": {
          let bowDamage = ability.params.amount as number;
          // Apply bow passive bonuses from equipped items
          bowDamage += this.getEquippedPassiveAmount("boostBowDamage");
          if (this.hasEquippedPassive("addAgilityToBowDamage")) {
            bowDamage += this.player.agility + this.getPassiveAgilityModifier() + this.inventory.agilityBonus;
          }
          card.setPowerDisplay(bowDamage);
          const canRecycle = this.hasEquippedPassive("recycleBowShots");
          // Find all monsters on the grid
          const monsters: Card[] = [];
          for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
              const gc = this.grid.getCardAt(c, r);
              if (gc && gc.cardData.type === CardType.Monster) {
                monsters.push(gc);
              }
            }
          }
          if (monsters.length > 0) {
            // Bow shot hits enemy
            this.sfx.play(SOUND_KEYS.bowImpactHit);
            const target = monsters[Math.floor(Math.random() * monsters.length)];
            this.playHitOnTargetAnimation(card, target, () => {
              const newValue = Math.max(0, target.cardData.value - bowDamage);
              target.updateValue(newValue);
              if (newValue <= 0) {
                const deadCell = this.grid.findCard(target);
                if (deadCell) this.grid.removeCard(deadCell.col, deadCell.row);
                this.handleMonsterDeathAbilities(target);
                this.freeGuardedLootIfAny(target);
                target.resolve(() => processNext(idx + 1));
              } else {
                // Target survived — recycle bow shot if passive equipped
                if (canRecycle) {
                  this.deck.mergeCards([getCard(card.cardData.id)]);
                  this.updateDeckVisual();
                }
                processNext(idx + 1);
              }
            });
          } else {
            // Bow shot misses — no targets
            this.sfx.play(SOUND_KEYS.bowBlocked);
            // No monsters on grid — recycle bow shot if passive equipped
            if (canRecycle) {
              this.deck.mergeCards([getCard(card.cardData.id)]);
              this.updateDeckVisual();
            }
            processNext(idx + 1);
          }
          break;
        }
        default:
          processNext(idx + 1);
          break;
      }
    };
    processNext(0);
  }

  private playDamagePlayerEffect(source: Phaser.GameObjects.Container, amount: number, onComplete: () => void): void {
    const sourceOrigX = source.x;
    const sourceOrigY = source.y;
    const attackX = sourceOrigX + (this.playerView.x - sourceOrigX) * 0.6;
    const attackY = sourceOrigY + (this.playerView.y - sourceOrigY) * 0.6;

    this.tweens.add({
      targets: source,
      x: attackX,
      y: attackY,
      duration: 250,
      ease: "Power2",
      onComplete: () => {
        // Enemy hits player — sword impact sound
        this.sfx.play(SOUND_KEYS.swordImpactHit);
        this.applyDamageWithArmour(amount, () => {
          // Return source to original position
          this.tweens.add({
            targets: source,
            x: sourceOrigX,
            y: sourceOrigY,
            duration: 250,
            ease: "Power2",
            onComplete: () => {
              onComplete();
            },
          });
        });
      },
    });
  }

  private findUnguardedLootOnGrid(alreadyClaimed: Set<Card>): Card | null {
    const keyCards: Card[] = [];
    const nonKeyCards: Card[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const card = this.grid.getCardAt(c, r);
        if (
          card &&
          (card.cardData.type === CardType.Treasure ||
            card.cardData.type === CardType.Potion ||
            card.cardData.type === CardType.Scroll) &&
          !this.guardedByMonster.has(card) &&
          !alreadyClaimed.has(card)
        ) {
          if (card.cardData.isKey) {
            keyCards.push(card);
          } else {
            nonKeyCards.push(card);
          }
        }
      }
    }
    return keyCards[0] ?? nonKeyCards[0] ?? null;
  }

  private setupGuardedLootInteraction(lootCard: Card, monsterCard: Card): void {
    // Hover reveals full card by raising depth above monster (no movement = no twitching)
    lootCard.on("pointerover", () => {
      if (this.isResolving) return;
      lootCard.setDepth(15);
    });
    lootCard.on("pointerout", () => {
      lootCard.setDepth(5);
    });
  }

  private freeGuardedLoot(lootCard: Card, cellPos: { col: number; row: number }): void {
    this.guardedByMonster.delete(lootCard);
    lootCard.removeAllListeners();
    lootCard.setAlpha(1);
    lootCard.setDepth(0);
    lootCard.restoreFullHitArea();
    this.grid.placeCard(cellPos.col, cellPos.row, lootCard);
    this.setupCardInteraction(lootCard);
  }

  private isEquippable(card: Card): boolean {
    return (
      (card.cardData.type === CardType.Treasure ||
        card.cardData.type === CardType.Potion) &&
      !!card.cardData.slot
    );
  }

  private hasDragAbility(card: Card): boolean {
    return this.hasAnyDragAbility(card);
  }

  private isDraggable(card: Card): boolean {
    return this.isEquippable(card) || this.hasDragAbility(card);
  }

  private getLinkedCardId(card: Card): string | null {
    if (!card.cardData.abilities) return null;
    for (const ab of card.cardData.abilities) {
      const cardId = ab.params.cardId;
      if (typeof cardId === "string") return cardId;
    }
    return null;
  }

  private showHoverPreview(card: Card): void {
    this.hideHoverPreview();
    const linkedId = this.getLinkedCardId(card);
    if (!linkedId) return;
    const previewData = getCard(linkedId);
    const previewX = card.x + CARD_W + 12;
    const showRight = previewX + CARD_W / 2 <= GAME_W;
    const x = showRight ? previewX : card.x - CARD_W - 12;
    const preview = new Card(this, x, card.y, previewData);
    preview.setAlpha(0.9);
    preview.setDepth(50);
    preview.disableInteractive();
    this.hoverPreviewCard = preview;
  }

  private hideHoverPreview(): void {
    if (this.hoverPreviewCard) {
      this.hoverPreviewCard.destroy();
      this.hoverPreviewCard = null;
    }
  }

  private setupCardInteraction(card: Card): void {
    card.on("pointerover", () => {
      if (!this.isResolving && !this.isDragging) {
        card.setHighlight(true);
        this.showHoverPreview(card);
      }
    });
    card.on("pointerout", () => {
      card.setHighlight(false);
      this.hideHoverPreview();
    });
    card.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.isResolving) return;
      if (this.guardedByMonster.has(card)) return;
      if (this.isDraggable(card)) {
        this.dragStartPos = { x: pointer.x, y: pointer.y };
        this.dragCard = card;

        // Use scene-level listeners for drag detection (card pointermove
        // only fires while pointer is over the card's hit area)
        const onMoveDetect = (p: Phaser.Input.Pointer) => {
          if (!this.dragStartPos || this.isDragging) return;
          const dx = p.x - this.dragStartPos.x;
          const dy = p.y - this.dragStartPos.y;
          if (Math.sqrt(dx * dx + dy * dy) > 16) {
            this.input.off("pointermove", onMoveDetect);
            this.input.off("pointerup", onUpDetect);
            this.beginDrag(card);
          }
        };
        const onUpDetect = () => {
          this.input.off("pointermove", onMoveDetect);
          this.input.off("pointerup", onUpDetect);
          if (this.dragCard === card && !this.isDragging) {
            this.dragCard = null;
            this.dragStartPos = null;
            this.resolveCard(card);
          }
        };
        this.input.on("pointermove", onMoveDetect);
        this.input.on("pointerup", onUpDetect);
      } else {
        this.resolveCard(card);
      }
    });
  }

  private toWorldCoords(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    return { x: pointer.x, y: pointer.y };
  }

  private beginDrag(card: Card): void {
    this.isDragging = true;
    this.isResolving = true;
    card.setHighlight(false);
    this.hideHoverPreview();

    const cell = this.grid.findCard(card);
    if (cell) {
      this.dragOrigGridPos = { col: cell.col, row: cell.row };
      this.grid.removeCard(cell.col, cell.row);
    }

    card.setDepth(6000);
    card.setScale(0.85);

    // Show slot highlights immediately (only for empty compatible slots)
    for (const def of SLOT_DEFS) {
      const canDrop = this.inventory.canEquip(def.name, card.cardData) && !this.inventory.getItem(def.name);
      this.inventoryView.setSlotHighlight(def.name, canDrop ? "valid" : "invalid");
    }

    // Note: ability-target highlights (monsters, traps, etc.) are NOT shown
    // for grid drags — items must be equipped first to use abilities.

    const onMove = (pointer: Phaser.Input.Pointer) => {
      const world = this.toWorldCoords(pointer);
      card.setPosition(world.x, world.y);

      // Update slot highlights — bright when hovered, dim otherwise
      const hit = this.inventoryView.getSlotAtPoint(world.x, world.y);
      for (const def of SLOT_DEFS) {
        const canDrop = this.inventory.canEquip(def.name, card.cardData) && !this.inventory.getItem(def.name);
        if (hit === def.name) {
          this.inventoryView.setSlotHighlight(def.name, canDrop ? "valid" : "invalid");
        } else {
          this.inventoryView.setSlotHighlight(def.name, canDrop ? "valid_dim" : "invalid_dim");
        }
      }

      // Highlight door card if dragging a key
      if (card.cardData.isKey) {
        const doorCard = this.findDoorOnGrid();
        if (doorCard) {
          const dx = world.x - doorCard.x;
          const dy = world.y - doorCard.y;
          if (Math.abs(dx) < CARD_W / 2 && Math.abs(dy) < CARD_H / 2) {
            doorCard.setHighlight(true);
          } else {
            doorCard.setHighlight(false);
          }
        }
      }

      // Ability-target highlights (portrait, traps, monsters, chests, weapons, tags)
      // are NOT shown for grid drags — items must be equipped to use abilities.
    };

    const onUp = (pointer: Phaser.Input.Pointer) => {
      this.input.off("pointermove", onMove);
      this.input.off("pointerup", onUp);

      const world = this.toWorldCoords(pointer);

      // Clear all grid card highlights
      this.clearGridHighlights();

      // Items cannot use abilities from the grid — must be equipped first.
      // If dropped on a valid ability target, show feedback and snap back.
      if (this.hasAnyDragAbility(card)) {
        const hitAbilityTarget =
          (this.collectAbilities("dragOnPlayerPortrait", card.cardData).length > 0 &&
            this.playerView.isPointOver(world.x, world.y)) ||
          (this.collectAbilities("dragOnTrap", card.cardData).length > 0 &&
            !!this.findTrapAtPoint(world.x, world.y)) ||
          (this.collectAbilities("dragOnMonster", card.cardData).length > 0 &&
            !!this.findMonsterAtPoint(world.x, world.y)) ||
          (this.collectAbilities("dragOnWeapon", card.cardData).length > 0 &&
            !!this.findWeaponSlotAtPoint(world.x, world.y)) ||
          (this.collectAbilities("dragOnChest", card.cardData).length > 0 &&
            !!this.findChestAtPoint(world.x, world.y)) ||
          this.collectAbilities("dragOnTag", card.cardData).some((ab) =>
            !!this.findTagSlotAtPoint(world.x, world.y, ab.params.tag as string));

        if (hitAbilityTarget) {
          this.playerView.hideDropHighlight();
          this.inventoryView.clearAllHighlights();
          this.showEquipFirstFeedback(card.x, card.y);
          this.snapBackToGrid(card);
          return;
        }
      }

      this.playerView.hideDropHighlight();

      // Check if key dropped on door
      if (card.cardData.isKey) {
        const doorCard = this.findDoorOnGrid();
        if (doorCard) {
          const dx = world.x - doorCard.x;
          const dy = world.y - doorCard.y;
          if (Math.abs(dx) < CARD_W / 2 && Math.abs(dy) < CARD_H / 2) {
            doorCard.setHighlight(false);
            this.inventoryView.clearAllHighlights();
            card.resolve(() => {
              this.finishDrag();
              this.openDoor(doorCard);
            });
            return;
          }
          doorCard.setHighlight(false);
        }
      }

      const slotName = this.inventoryView.getSlotAtPoint(world.x, world.y);

      if (slotName && this.inventory.canEquip(slotName, card.cardData) && !this.inventory.getItem(slotName)) {
        // Key collected — play jingling sound
        if (card.cardData.isKey) {
          this.sfx.play(SOUND_KEYS.keysJingling);
        }
        // Equip item (only into empty slots — no displacement allowed)
        this.inventory.equip(slotName, card.cardData);
        // Fire onEquip for the newly equipped card (skip for backpack slots)
        const equipAbilities = slotName.startsWith("backpack") ? [] : this.collectAbilities("onEquip", card.cardData);
        const slotPos = this.inventoryView.getSlotWorldPos(slotName);
        const cardPos = slotPos ?? { x: card.x, y: card.y };
        card.disableInteractive();
        card.resolve(() => {});
        this.fireAbilities(equipAbilities, () => {
          this.finishDrag();
        }, cardPos);
      } else {
        // Snap back to grid
        this.snapBackToGrid(card);
      }

      this.inventoryView.clearAllHighlights();
    };

    this.input.on("pointermove", onMove);
    this.input.on("pointerup", onUp);
  }

  private clearGridHighlights(): void {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gc = this.grid.getCardAt(c, r);
        if (gc) {
          gc.setHighlight(false);
          gc.setDropTargetHighlight(false);
        }
      }
    }
  }

  private snapBackToGrid(card: Card): void {
    if (!this.dragOrigGridPos) {
      this.finishDrag();
      return;
    }
    const pos = this.grid.worldPos(this.dragOrigGridPos.col, this.dragOrigGridPos.row);
    this.tweens.add({
      targets: card,
      x: pos.x,
      y: pos.y,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: "Power2",
      onComplete: () => {
        if (this.dragOrigGridPos) {
          this.grid.placeCard(this.dragOrigGridPos.col, this.dragOrigGridPos.row, card);
        }
        card.setDepth(0);
        this.finishDrag();
      },
    });
  }

  private showEquipFirstFeedback(x: number, y: number): void {
    const txt = this.add.text(x, y - 40, "Equip first!", {
      fontFamily: "serif",
      fontSize: "28px",
      color: "#ffcc00",
      stroke: "#000000",
      strokeThickness: 4,
    });
    txt.setOrigin(0.5);
    txt.setDepth(7000);
    this.tweens.add({
      targets: txt,
      y: y - 100,
      alpha: 0,
      duration: 1200,
      ease: "Power2",
      onComplete: () => txt.destroy(),
    });
  }

  private finishDrag(): void {
    this.dragCard = null;
    this.dragStartPos = null;
    this.dragOrigGridPos = null;
    this.isDragging = false;
    this.isResolving = false;
  }

  private executeAbility(card: Card): void {
    const ability = card.cardData.abilities?.find((a) => {
      const aDef = getAbility(a.abilityId);
      return aDef.trigger === "dragOnPlayerPortrait";
    });
    if (!ability) return;

    const scrollId = card.cardData.tag === "scroll" ? card.cardData.id : null;
    const recycleAfterUse = () => {
      if (scrollId && this.hasScrollRecycle()) {
        this.deck.mergeCards([getCard(scrollId)]);
        this.updateDeckVisual();
      }
    };

    const def = getAbility(ability.abilityId);
    switch (def.effect) {
      case "healPlayer":
        this.sfx.play(SOUND_KEYS.potion);
        this.player.heal(ability.params.amount as number);
        break;
      case "removeDarkEvent":
        this.sfx.play(SOUND_KEYS.holySpell04);
        card.disableInteractive();
        card.resolve(() => {
          this.playRemoveCurseAnimation(() => {
            recycleAfterUse();
            this.finishDrag();
          });
        });
        return; // async — handled above
    }

    card.disableInteractive();
    card.resolve(() => {
      recycleAfterUse();
      this.finishDrag();
    });
  }

  /** Collect abilities matching a trigger from a card's ability list. */
  private collectAbilities(
    trigger: AbilityTrigger,
    cardData: CardData,
  ): CardAbility[] {
    if (!cardData.abilities) return [];
    // onEquip abilities fire only once per card
    if (trigger === "onEquip" && cardData.equipTriggered) return [];
    const results = cardData.abilities.filter((a) => getAbility(a.abilityId).trigger === trigger);
    if (trigger === "onEquip" && results.length > 0) {
      cardData.equipTriggered = true;
    }
    return results;
  }

  /** Collect abilities matching a trigger from all equipped inventory items. */
  private collectEquippedAbilities(trigger: AbilityTrigger): CardAbility[] {
    const results: CardAbility[] = [];
    for (const slotDef of SLOT_DEFS) {
      if (slotDef.name.startsWith("backpack")) continue;
      const item = this.inventory.getItem(slotDef.name);
      if (!item?.abilities) continue;
      for (const ab of item.abilities) {
        if (getAbility(ab.abilityId).trigger === trigger) {
          results.push(ab);
        }
      }
    }
    return results;
  }

  /** Execute a list of abilities sequentially, calling onComplete when done. */
  private fireAbilities(
    abilities: CardAbility[],
    onComplete: () => void,
    sourcePos?: { x: number; y: number },
  ): void {
    if (abilities.length === 0) {
      onComplete();
      return;
    }

    const [current, ...rest] = abilities;
    const def = getAbility(current.abilityId);

    switch (def.effect) {
      case "healPlayer":
        this.sfx.play(SOUND_KEYS.potion);
        this.player.heal(current.params.amount as number);
        break;
      case "damagePlayer":
        this.player.takeDamage(current.params.amount as number);
        break;
      case "shuffleIntoDeck": {
        const cardId = current.params.cardId as string;
        const count = current.params.count as number;
        // Bow adds arrows to deck
        if (cardId === "bow_shot" || cardId === "strong_bow_shot") {
          this.sfx.playRandom(SOUND_GROUPS.bowAttack);
        }
        const origin = sourcePos ?? { x: GAME_W / 2, y: GAME_H / 2 };
        this.playSummonToDeckAnimation(origin, cardId, count, () => {
          this.fireAbilities(rest, onComplete, sourcePos);
        });
        return; // async — don't fall through to chain below
      }
      case "triggerBowAbility": {
        // Find equipped bow and fire its onEquip abilities
        for (const slotName of ["weapon1", "weapon2"]) {
          const item = this.inventory.getItem(slotName);
          if (item?.tag === "bow" && item.abilities) {
            const bowEquipAbilities = item.abilities.filter(a => getAbility(a.abilityId).trigger === "onEquip");
            if (bowEquipAbilities.length > 0) {
              this.fireAbilities(bowEquipAbilities, () => {
                this.fireAbilities(rest, onComplete, sourcePos);
              }, sourcePos);
              return;
            }
          }
        }
        break;
      }
      case "removeFromDeck": {
        const cardId = current.params.cardId as string;
        this.playRemoveFromDeckAnimation(cardId, () => {
          this.fireAbilities(rest, onComplete, sourcePos);
        });
        return; // async
      }
      case "addFateModifier": {
        this.sfx.play(SOUND_KEYS.holySpell06);
        const modifier = current.params.modifier as number;
        const origin = sourcePos ?? { x: GAME_W / 2, y: GAME_H / 2 };
        this.playFlyToFateDeckAnimation(origin, modifier, () => {
          this.fireAbilities(rest, onComplete, sourcePos);
        });
        return; // async
      }
      case "buffMonsterType": {
        const monsterId = current.params.monsterId as string;
        const amount = current.params.amount as number;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const gc = this.grid.getCardAt(c, r);
            if (gc && gc.cardData.id === monsterId) {
              gc.updateValue(gc.cardData.value + amount);
            }
          }
        }
        this.deck.buffCardById(monsterId, amount);
        break;
      }
    }

    // Chain to next ability
    this.fireAbilities(rest, onComplete, sourcePos);
  }

  private fireDragOnMonsterAbilities(abilities: CardAbility[], target: Card, onComplete: () => void): void {
    if (abilities.length === 0) {
      onComplete();
      return;
    }
    const [current, ...rest] = abilities;
    const def = getAbility(current.abilityId);

    // Collect VFX targets based on effect type, then play VFX before applying the effect
    const vfxId = current.params.vfx as string | undefined;
    const vfx = vfxId ? getVfx(vfxId) : undefined;

    const applyEffect = () => {
      switch (def.effect) {
        case "reduceTargetMonsterPower": {
          let amount = current.params.amount as number;
          if (this.lastUsedScrollId) {
            amount += this.getScrollDamageBonus();
          }
          const newValue = Math.max(0, target.cardData.value - amount);
          target.updateValue(newValue);
          if (newValue <= 0) {
            const cell = this.grid.findCard(target);
            if (cell) this.grid.removeCard(cell.col, cell.row);
            target.resolve(() => {
              this.freeGuardedLootIfAny(target);
              this.fireDragOnMonsterAbilities(rest, target, onComplete);
            });
          } else {
            this.fireDragOnMonsterAbilities(rest, target, onComplete);
          }
          break;
        }
        case "reduceAdjacentMonsterPower": {
          let amount = current.params.amount as number;
          if (this.lastUsedScrollId) {
            amount += this.getScrollDamageBonus();
          }
          // Reduce target
          const newValue = Math.max(0, target.cardData.value - amount);
          target.updateValue(newValue);
          // Reduce adjacent monsters
          const adjacent = this.getAdjacentCards(target);
          for (const adj of adjacent) {
            if (adj.cardData.type === CardType.Monster) {
              const adjNewValue = Math.max(0, adj.cardData.value - amount);
              adj.updateValue(adjNewValue);
            }
          }
          // Clean up dead monsters (target first, then adjacent)
          const deadMonsters: Card[] = [];
          if (newValue <= 0) deadMonsters.push(target);
          for (const adj of adjacent) {
            if (adj.cardData.type === CardType.Monster && adj.cardData.value <= 0) {
              deadMonsters.push(adj);
            }
          }
          this.resolveDeadMonsters(deadMonsters, () => {
            this.fireDragOnMonsterAbilities(rest, target, onComplete);
          });
          break;
        }
        default:
          this.fireDragOnMonsterAbilities(rest, target, onComplete);
          break;
      }
    };

    if (vfx) {
      // Build target list based on effect type
      const vfxTargets: VfxTarget[] = [{ x: target.x, y: target.y, gameObject: target }];
      if (def.effect === "reduceAdjacentMonsterPower") {
        for (const adj of this.getAdjacentCards(target)) {
          if (adj.cardData.type === CardType.Monster) {
            vfxTargets.push({ x: adj.x, y: adj.y, gameObject: adj });
          }
        }
      }
      const source = { x: this.playerView.x, y: this.playerView.y };
      // Play magic sounds when VFX starts, not when effect resolves
      if (def.effect === "reduceTargetMonsterPower") {
        this.sfx.play(SOUND_KEYS.fireBolt);
      } else if (def.effect === "reduceAdjacentMonsterPower") {
        this.sfx.play(SOUND_KEYS.fireball);
      }
      vfx(this, source, vfxTargets, applyEffect);
    } else {
      // No VFX — play sound immediately before applying effect
      if (def.effect === "reduceTargetMonsterPower") {
        this.sfx.play(SOUND_KEYS.fireBolt);
      } else if (def.effect === "reduceAdjacentMonsterPower") {
        this.sfx.play(SOUND_KEYS.fireball);
      }
      applyEffect();
    }
  }

  private getScrollDamageBonus(): number {
    let total = 0;
    for (const slotDef of SLOT_DEFS) {
      if (slotDef.name.startsWith("backpack")) continue;
      const item = this.inventory.getItem(slotDef.name);
      if (!item?.abilities) continue;
      for (const ab of item.abilities) {
        const aDef = getAbility(ab.abilityId);
        if (aDef.trigger === "passive" && aDef.effect === "boostScrollDamage") {
          total += (ab.params.amount as number) || 0;
        }
      }
    }
    return total;
  }

  private hasScrollRecycle(): boolean {
    for (const slotDef of SLOT_DEFS) {
      if (slotDef.name.startsWith("backpack")) continue;
      const item = this.inventory.getItem(slotDef.name);
      if (!item?.abilities) continue;
      for (const ab of item.abilities) {
        const aDef = getAbility(ab.abilityId);
        if (aDef.trigger === "passive" && aDef.effect === "recycleScrolls") return true;
      }
    }
    return false;
  }

  private resolveDeadMonsters(monsters: Card[], onComplete: () => void): void {
    if (monsters.length === 0) {
      onComplete();
      return;
    }
    const [current, ...rest] = monsters;
    const cell = this.grid.findCard(current);
    if (cell) this.grid.removeCard(cell.col, cell.row);
    this.handleMonsterDeathAbilities(current);
    this.freeGuardedLootIfAny(current);
    current.resolve(() => {
      this.resolveDeadMonsters(rest, onComplete);
    });
  }

  private freeGuardedLootIfAny(monsterCard: Card): void {
    const guardedLoot = monsterCard.guardedLoot;
    if (!guardedLoot) return;
    // Try to find a free cell to place the loot
    const emptySlots = this.grid.getEmptySlots();
    if (emptySlots.length > 0) {
      const slot = emptySlots[0];
      this.freeGuardedLoot(guardedLoot, slot);
    } else {
      // No space — just destroy the loot
      guardedLoot.destroy();
    }
    this.guardedByMonster.delete(guardedLoot);
    monsterCard.guardedLoot = null;
  }

  private static readonly DRAG_TRIGGERS: AbilityTrigger[] = [
    "dragOnPlayerPortrait",
    "dragOnTrap",
    "dragOnWeapon",
    "dragOnMonster",
    "dragOnChest",
    "dragOnTag",
  ];

  /** Check if a card has any drag-type ability. */
  private hasAnyDragAbility(card: Card): boolean {
    if (!card.cardData.abilities) return false;
    return card.cardData.abilities.some((a) => {
      const def = getAbility(a.abilityId);
      return GameScene.DRAG_TRIGGERS.includes(def.trigger);
    });
  }

  /** Find a trap card at the given world coordinates on the grid. */
  private findTrapAtPoint(x: number, y: number): Card | null {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard && gridCard.cardData.type === CardType.Trap) {
          if (Math.abs(x - gridCard.x) < CARD_W / 2 && Math.abs(y - gridCard.y) < CARD_H / 2) {
            return gridCard;
          }
        }
      }
    }
    return null;
  }

  /** Find a monster card at the given world coordinates on the grid. */
  private findMonsterAtPoint(x: number, y: number): Card | null {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard && gridCard.cardData.type === CardType.Monster) {
          if (Math.abs(x - gridCard.x) < CARD_W / 2 && Math.abs(y - gridCard.y) < CARD_H / 2) {
            return gridCard;
          }
        }
      }
    }
    return null;
  }

  /** Find a chest card at the given world coordinates on the grid. */
  private findChestAtPoint(x: number, y: number): Card | null {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard && gridCard.cardData.type === CardType.Chest) {
          if (Math.abs(x - gridCard.x) < CARD_W / 2 && Math.abs(y - gridCard.y) < CARD_H / 2) {
            return gridCard;
          }
        }
      }
    }
    return null;
  }

  /** Find any card at the given world coordinates on the grid. */
  private findGridCardAtPoint(x: number, y: number): Card | null {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard) {
          if (Math.abs(x - gridCard.x) < CARD_W / 2 && Math.abs(y - gridCard.y) < CARD_H / 2) {
            return gridCard;
          }
        }
      }
    }
    return null;
  }

  /** Get all cards adjacent (up/down/left/right) to the given card on the grid. */
  private getAdjacentCards(card: Card): Card[] {
    const cell = this.grid.findCard(card);
    if (!cell) return [];
    const adjacent: Card[] = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dc, dr] of dirs) {
      const nc = cell.col + dc;
      const nr = cell.row + dr;
      if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS) {
        const adjCard = this.grid.getCardAt(nc, nr);
        if (adjCard) adjacent.push(adjCard);
      }
    }
    return adjacent;
  }

  /** Find an equipped weapon slot at the given world coordinates. */
  private findWeaponSlotAtPoint(x: number, y: number): string | null {
    const slotName = this.inventoryView.getSlotAtPoint(x, y);
    if (!slotName) return null;
    const slotDef = SLOT_DEFS.find((s) => s.name === slotName);
    if (!slotDef || !slotDef.accepted.includes("weapon")) return null;
    if (!this.inventory.getItem(slotName)) return null;
    return slotName;
  }

  /** Find an equipped (non-backpack) inventory slot whose item has the given tag. */
  private findTagSlotAtPoint(x: number, y: number, tag: string): string | null {
    const slotName = this.inventoryView.getSlotAtPoint(x, y);
    if (!slotName || slotName.startsWith("backpack")) return null;
    const item = this.inventory.getItem(slotName);
    if (!item || item.tag !== tag) return null;
    return slotName;
  }

  private gridHasCard(id: string): boolean {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const card = this.grid.getCardAt(c, r);
        if (card && card.cardData.id === id) return true;
      }
    }
    return false;
  }

  private gridCountCard(id: string): number {
    let count = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const card = this.grid.getCardAt(c, r);
        if (card && card.cardData.id === id) count++;
      }
    }
    return count;
  }

  private reduceEquippedWeaponPower(amount: number): void {
    const w1 = this.inventory.getItem("weapon1");
    const w2 = this.inventory.getItem("weapon2");
    const w1Valid = w1 && w1.slot === "weapon" && !w1.isKey;
    const w2Valid = w2 && w2.slot === "weapon" && !w2.isKey;
    let targetSlot: string | null = null;
    if (w1Valid && w2Valid) {
      targetSlot = w2!.value > w1!.value ? "weapon2" : "weapon1";
    } else if (w1Valid) {
      targetSlot = "weapon1";
    } else if (w2Valid) {
      targetSlot = "weapon2";
    }
    if (targetSlot) {
      const item = this.inventory.getItem(targetSlot)!;
      item.value = Math.max(0, item.value - amount);
      this.inventoryView.refreshSlot(targetSlot);
      this.inventory.emit("statsChanged");
    }
  }

  /** Find the first equipped non-key weapon slot name, or null. */
  private findFirstWeaponSlot(): string | null {
    for (const slotName of ["weapon1", "weapon2"]) {
      const item = this.inventory.getItem(slotName);
      if (item && item.slot === "weapon" && !item.isKey) {
        return slotName;
      }
    }
    return null;
  }

  private collectOnExploreAbilities(): Array<{ card: Card; ability: CardAbility }> {
    const results: Array<{ card: Card; ability: CardAbility }> = [];
    for (const card of this.grid.getOccupiedCards()) {
      if (!card.cardData.abilities) continue;
      for (const ability of card.cardData.abilities) {
        const def = getAbility(ability.abilityId);
        if (def.trigger === "onExplore") {
          results.push({ card, ability });
        }
      }
    }
    return results;
  }

  private executeOnExploreAbilities(
    abilities: Array<{ card: Card; ability: CardAbility }>,
    onComplete: () => void,
  ): void {
    if (abilities.length === 0) {
      onComplete();
      return;
    }

    const [current, ...rest] = abilities;
    const def = getAbility(current.ability.abilityId);

    switch (def.effect) {
      case "shuffleIntoDeck": {
        const cardId = current.ability.params.cardId as string;
        const count = current.ability.params.count as number;
        this.playSummonToDeckAnimation(current.card, cardId, count, () => {
          this.executeOnExploreAbilities(rest, onComplete);
        });
        break;
      }
      case "damagePlayer":
        this.playDamagePlayerEffect(current.card, current.ability.params.amount as number, () => {
          this.executeOnExploreAbilities(rest, onComplete);
        });
        break;
      case "removeFromDeck": {
        const removeId = current.ability.params.cardId as string;
        this.playRemoveFromDeckAnimation(removeId, () => {
          this.executeOnExploreAbilities(rest, onComplete);
        });
        break;
      }
      case "addFateModifier": {
        this.sfx.play(SOUND_KEYS.holySpell06);
        const mod = current.ability.params.modifier as number;
        this.playFlyToFateDeckAnimation({ x: current.card.x, y: current.card.y }, mod, () => {
          this.executeOnExploreAbilities(rest, onComplete);
        });
        break;
      }
      default:
        this.executeOnExploreAbilities(rest, onComplete);
        break;
    }
  }

  private playSummonToDeckAnimation(
    sourcePos: { x: number; y: number },
    cardId: string,
    count: number,
    onComplete: () => void,
  ): void {
    const centerX = GAME_W / 2;
    const centerY = GAME_H / 2;
    const cardScale = 1.4;
    const scaledW = CARD_W * cardScale;
    const spacing = scaledW + 24;
    const totalWidth = count * scaledW + (count - 1) * 24;
    const startX = centerX - totalWidth / 2 + scaledW / 2;

    // Dark overlay behind the cards
    const overlay = this.add.graphics();
    overlay.setDepth(499);
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, GAME_W, GAME_H);

    // Smoke particles burst from producer card
    const emitter = this.add.particles(sourcePos.x, sourcePos.y, "particle_circle", {
      speed: { min: 30, max: 80 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.6, end: 0 },
      tint: 0x886699,
      lifespan: 600,
      quantity: 12,
      emitting: false,
    });
    emitter.setDepth(501);
    emitter.explode(12);
    this.time.delayedCall(800, () => emitter.destroy());

    // Create temp cards at the producer card's position (small scale)
    const tempCards: Card[] = [];
    const cardDatas: CardData[] = [];

    for (let i = 0; i < count; i++) {
      const data = getCard(cardId);
      this.applyLevelScaling(data);
      cardDatas.push(data);
      const card = new Card(this, sourcePos.x, sourcePos.y, data);
      this.applyBowShotBonus(card);
      card.setScale(0.3);
      card.setDepth(6000);
      card.disableInteractive();
      card.reveal();
      tempCards.push(card);
    }

    // Fly cards from producer to screen center while scaling up
    let arrivedAtCenter = 0;
    tempCards.forEach((card, i) => {
      const targetX = startX + i * spacing;
      this.tweens.add({
        targets: card,
        x: targetX,
        y: centerY,
        scaleX: cardScale,
        scaleY: cardScale,
        duration: 400,
        delay: i * 80,
        ease: "Power2",
        onComplete: () => {
          arrivedAtCenter++;
          if (arrivedAtCenter === tempCards.length) {
            // Hold at center for ~1.5s, then fly to deck
            this.time.delayedCall(1500, () => {
              this.flySummonedCardsToDeck(tempCards, cardDatas, overlay, onComplete);
            });
          }
        },
      });
    });
  }

  private flySummonedCardsToDeck(
    tempCards: Card[],
    cardDatas: CardData[],
    overlay: Phaser.GameObjects.Graphics,
    onComplete: () => void,
  ): void {
    const deckWorldX = 350;
    const deckWorldY = 200;
    let completed = 0;

    // Play shuffle sound at the start of the fly animation
    this.sfx.play(SOUND_KEYS.cardDraw3);

    // Fade out overlay alongside card flight
    this.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: 500,
      onComplete: () => overlay.destroy(),
    });

    tempCards.forEach((card, i) => {
      this.tweens.add({
        targets: card,
        x: deckWorldX,
        y: deckWorldY,
        scaleX: 1,
        scaleY: 1,
        duration: 500,
        delay: i * 100,
        ease: "Power2",
        onUpdate: () => {
          // Once card is near the deck, drop it behind
          const dx = Math.abs(card.x - deckWorldX);
          const dy = Math.abs(card.y - deckWorldY);
          if (dx < CARD_W && dy < CARD_H) {
            card.setDepth(-1);
          }
        },
        onComplete: () => {
          card.destroy();
          completed++;
          if (completed === tempCards.length) {
            // Sound already played at animation start — suppress duplicate
            const saved = this.deck.onShuffle;
            this.deck.onShuffle = null;
            this.deck.mergeCards(cardDatas);
            this.deck.onShuffle = saved;
            this.updateDeckVisual();
            this.updateHUD();
            onComplete();
          }
        },
      });
    });
  }

  /**
   * Bug 4: Generic animation for when an ability removes a card from the dungeon deck.
   * A temporary card slides out from the deck area, pauses so the player can see it,
   * then fades away.
   */
  private playRemoveFromDeckAnimation(
    cardId: string,
    onComplete: () => void,
  ): void {
    const removed = this.deck.removeCardById(cardId);
    if (!removed) {
      onComplete();
      return;
    }

    this.updateDeckVisual();
    this.updateHUD();

    const deckWorldX = 350;
    const deckWorldY = 200;

    // Create a temp card at the deck position
    const tempCard = new Card(this, deckWorldX, deckWorldY, removed);
    tempCard.setDepth(500);
    tempCard.setScale(0.5);
    tempCard.setAlpha(0);
    tempCard.disableInteractive();

    // Slide card out from deck to the right
    const targetX = deckWorldX + 200;
    const targetY = deckWorldY;

    this.tweens.add({
      targets: tempCard,
      x: targetX,
      y: targetY,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 1,
      duration: 400,
      ease: "Back.easeOut",
      onComplete: () => {
        // Hold for ~1 second so the player can see the removed card
        this.time.delayedCall(1000, () => {
          // Fade and shrink away
          this.tweens.add({
            targets: tempCard,
            alpha: 0,
            scaleX: 0,
            scaleY: 0,
            duration: 400,
            ease: "Power2",
            onComplete: () => {
              tempCard.destroy();
              onComplete();
            },
          });
        });
      },
    });
  }

  /**
   * Remove the first curse-tagged card from the deck and animate it appearing
   * near the deck then dissolving.
   */
  private playRemoveCurseAnimation(onComplete: () => void): void {
    const removed = this.deck.removeFirstByTag("curse");
    if (!removed) {
      onComplete();
      return;
    }

    this.updateDeckVisual();
    this.updateHUD();

    const deckWorldX = 350;
    const deckWorldY = 200;

    // Create a temp card at the deck position
    const tempCard = new Card(this, deckWorldX, deckWorldY, removed);
    tempCard.setDepth(500);
    tempCard.setScale(0.5);
    tempCard.setAlpha(0);
    tempCard.disableInteractive();

    // Slide card out from deck to the right
    const targetX = deckWorldX + 200;

    this.tweens.add({
      targets: tempCard,
      x: targetX,
      y: deckWorldY,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 1,
      duration: 400,
      ease: "Back.easeOut",
      onComplete: () => {
        // Hold briefly so the player can see the removed curse
        this.time.delayedCall(1000, () => {
          // Fade and shrink away
          this.tweens.add({
            targets: tempCard,
            alpha: 0,
            scaleX: 0,
            scaleY: 0,
            duration: 400,
            ease: "Power2",
            onComplete: () => {
              tempCard.destroy();
              onComplete();
            },
          });
        });
      },
    });
  }

  /**
   * Dim everything except the given cards — same as enterCombatMode dimming.
   */
  private dimNonParticipants(except: Phaser.GameObjects.Container[]): void {
    const exceptSet = new Set(except);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard && !exceptSet.has(gridCard)) {
          gridCard.setAlpha(0.3);
          if (gridCard.guardedLoot) {
            gridCard.guardedLoot.setAlpha(0.3);
            gridCard.guardedLoot.disableInteractive();
          }
          const chestLootInfo = this.chestLoot.get(gridCard);
          if (chestLootInfo) chestLootInfo.cardBack.setAlpha(0.3);
        }
      }
    }
    this.gridBgGraphics.forEach(img => img.setAlpha(0.3));
    this.deckVisual.forEach(img => img.setAlpha(0.3));
    this.deckText.setAlpha(0.3);
    this.goldText.setAlpha(0.3);
    this.exploreBtn.setAlpha(0.3);
    this.levelIndicator.setAlpha(0.3);
    this.levelFlavorText.setAlpha(0.3);
  }

  /**
   * Restore everything after dimNonParticipants.
   */
  private undimAll(): void {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard) {
          gridCard.setAlpha(1);
          if (gridCard.guardedLoot) {
            gridCard.guardedLoot.setAlpha(1);
            gridCard.guardedLoot.setDepth(5);
            gridCard.guardedLoot.setInteractive();
          }
          const chestLootInfo = this.chestLoot.get(gridCard);
          if (chestLootInfo) chestLootInfo.cardBack.setAlpha(1);
        }
      }
    }
    this.gridBgGraphics.forEach(img => img.setAlpha(1));
    this.deckVisual.forEach(img => img.setAlpha(1));
    this.deckText.setAlpha(1);
    this.goldText.setAlpha(1);
    this.exploreBtn.setAlpha(1);
    this.levelIndicator.setAlpha(1);
    this.levelFlavorText.setAlpha(1);
  }

  /**
   * Bug 7: Full combat-style attack animation — dim, scale down, lunge, shake, return, undim.
   */
  private playHitOnTargetAnimation(
    source: Phaser.GameObjects.Container,
    target: Phaser.GameObjects.Container,
    onComplete: () => void,
  ): void {
    // Step 1: Dim everything except source and target
    this.dimNonParticipants([source, target]);
    source.setDepth(4500);
    target.setDepth(4500);

    // Step 2: Scale source down to 1.0 if enlarged (event cards are 1.8x)
    const sourceOrigScaleX = source.scaleX;
    const sourceOrigScaleY = source.scaleY;
    const needsScaleDown = sourceOrigScaleX > 1.05 || sourceOrigScaleY > 1.05;

    const doLunge = () => {
      const sourceOrigX = source.x;
      const sourceOrigY = source.y;
      const attackX = sourceOrigX + (target.x - sourceOrigX) * 0.6;
      const attackY = sourceOrigY + (target.y - sourceOrigY) * 0.6;

      // Step 3: Lunge source toward target
      this.tweens.add({
        targets: source,
        x: attackX,
        y: attackY,
        duration: 250,
        ease: "Power2",
        onComplete: () => {
          // Step 4: Shake target on hit
          const origTargetX = target.x;
          this.tweens.add({
            targets: target,
            x: origTargetX + 10,
            duration: 50,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
              target.x = origTargetX;
              // Step 5: Return source
              this.tweens.add({
                targets: source,
                x: sourceOrigX,
                y: sourceOrigY,
                duration: 250,
                ease: "Power2",
                onComplete: () => {
                  // Step 6: Restore scale if we changed it
                  if (needsScaleDown) {
                    this.tweens.add({
                      targets: source,
                      scaleX: sourceOrigScaleX,
                      scaleY: sourceOrigScaleY,
                      duration: 300,
                      ease: "Power2",
                      onComplete: () => {
                        this.undimAll();
                        source.setDepth(910);
                        target.setDepth(10);
                        onComplete();
                      },
                    });
                  } else {
                    this.undimAll();
                    source.setDepth(10);
                    target.setDepth(10);
                    onComplete();
                  }
                },
              });
            },
          });
        },
      });
    };

    if (needsScaleDown) {
      this.tweens.add({
        targets: source,
        scaleX: 1,
        scaleY: 1,
        duration: 300,
        ease: "Power2",
        onComplete: doLunge,
      });
    } else {
      doLunge();
    }
  }

  /**
   * Bug 7: Full combat-style attack animation toward an inventory slot.
   */
  private playHitOnSlotAnimation(
    source: Phaser.GameObjects.Container,
    slotName: string,
    onComplete: () => void,
  ): void {
    const slotPos = this.inventoryView.getSlotWorldPos(slotName);
    if (!slotPos) {
      onComplete();
      return;
    }

    // Step 1: Dim everything except source
    this.dimNonParticipants([source]);
    source.setDepth(4500);

    // Step 2: Scale source down to 1.0 if enlarged
    const sourceOrigScaleX = source.scaleX;
    const sourceOrigScaleY = source.scaleY;
    const needsScaleDown = sourceOrigScaleX > 1.05 || sourceOrigScaleY > 1.05;

    const doLunge = () => {
      const sourceOrigX = source.x;
      const sourceOrigY = source.y;
      const attackX = sourceOrigX + (slotPos.x - sourceOrigX) * 0.6;
      const attackY = sourceOrigY + (slotPos.y - sourceOrigY) * 0.6;

      // Step 3: Lunge source toward slot
      this.tweens.add({
        targets: source,
        x: attackX,
        y: attackY,
        duration: 250,
        ease: "Power2",
        onComplete: () => {
          // Step 4: Return source
          this.tweens.add({
            targets: source,
            x: sourceOrigX,
            y: sourceOrigY,
            duration: 250,
            ease: "Power2",
            onComplete: () => {
              // Step 5: Restore scale if we changed it
              if (needsScaleDown) {
                this.tweens.add({
                  targets: source,
                  scaleX: sourceOrigScaleX,
                  scaleY: sourceOrigScaleY,
                  duration: 300,
                  ease: "Power2",
                  onComplete: () => {
                    this.undimAll();
                    source.setDepth(910);
                    onComplete();
                  },
                });
              } else {
                this.undimAll();
                source.setDepth(10);
                onComplete();
              }
            },
          });
        },
      });
    };

    if (needsScaleDown) {
      this.tweens.add({
        targets: source,
        scaleX: 1,
        scaleY: 1,
        duration: 300,
        ease: "Power2",
        onComplete: doLunge,
      });
    } else {
      doLunge();
    }
  }

  /**
   * Bug 8: Animate a card flying from its grid position to the fate deck area,
   * used when addFateModifier ability fires.
   */
  private playFlyToFateDeckAnimation(
    sourcePos: { x: number; y: number },
    modifier: number,
    onComplete: () => void,
  ): void {
    // Add the modifier to the player's fate deck
    this.player.fateDeck.push(modifier);
    // Shuffle
    for (let i = this.player.fateDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.player.fateDeck[i], this.player.fateDeck[j]] = [this.player.fateDeck[j], this.player.fateDeck[i]];
    }

    const fateDeckPos = this.playerView.getFateDeckWorldPos();
    const fateCardW = 100;
    const fateCardH = 140;

    // Create a fate card visual at the source position
    const fateCard = this.add.container(sourcePos.x, sourcePos.y);
    fateCard.setDepth(920);
    fateCard.setScale(0.8);

    const fateBg = this.add.graphics();
    fateBg.fillStyle(0x1a1a2e, 1);
    fateBg.fillRoundedRect(-fateCardW / 2, -fateCardH / 2, fateCardW, fateCardH, 12);
    fateBg.lineStyle(2, 0x4444aa, 0.8);
    fateBg.strokeRoundedRect(-fateCardW / 2, -fateCardH / 2, fateCardW, fateCardH, 12);
    fateCard.add(fateBg);

    const modLabel = modifier > 0 ? `+${modifier}` : `${modifier}`;
    const modColor = modifier > 0 ? "#44dd88" : modifier < 0 ? "#ff5555" : "#888888";
    const modText = this.add
      .text(0, 0, modLabel, {
        fontSize: "40px",
        fontFamily: "monospace",
        color: modColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    fateCard.add(modText);

    // Scale up briefly, then fly to fate deck
    this.tweens.add({
      targets: fateCard,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 300,
      ease: "Back.easeOut",
      onComplete: () => {
        this.time.delayedCall(400, () => {
          this.tweens.add({
            targets: fateCard,
            x: fateDeckPos.x,
            y: fateDeckPos.y,
            scaleX: 0.3,
            scaleY: 0.3,
            duration: 600,
            ease: "Power2",
            onComplete: () => {
              fateCard.destroy();
              onComplete();
            },
          });
        });
      },
    });
  }

  private setupSlotDiscard(): void {
    for (const def of SLOT_DEFS) {
      const container = this.inventoryView.getSlotContainer(def.name);
      if (!container) continue;

      container.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (this.isResolving || this.isDragging) return;
        const item = this.inventory.getItem(def.name);
        if (!item) return;

        const startPos = { x: pointer.x, y: pointer.y };
        let ghost: Phaser.GameObjects.Container | null = null;
        let dragging = false;

        const onMove = (p: Phaser.Input.Pointer) => {
          const dx = p.x - startPos.x;
          const dy = p.y - startPos.y;

          if (!dragging && Math.sqrt(dx * dx + dy * dy) > 24) {
            dragging = true;
            ghost = this.inventoryView.createDragGhost(item);
            ghost.setDepth(6000);
            this.add.existing(ghost);
            this.inventoryView.setSlotContentAlpha(def.name, 0.3);
            // Show initial slot highlights
            for (const slotDef of SLOT_DEFS) {
              const isEmpty = !this.inventory.getItem(slotDef.name);
              const canDrop = (isEmpty && this.inventory.canEquip(slotDef.name, item)) || this.inventory.canSwap(def.name, slotDef.name);
              this.inventoryView.setSlotHighlight(slotDef.name, canDrop ? "valid_dim" : "invalid_dim");
            }
            // Show red drop-target highlights on all monsters if item has dragOnMonster ability
            if (this.collectAbilities("dragOnMonster", item).length > 0) {
              for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                  const gc = this.grid.getCardAt(c, r);
                  if (gc && gc.cardData.type === CardType.Monster) {
                    gc.setDropTargetHighlight(true);
                  }
                }
              }
            }
          }

          if (dragging && ghost) {
            const world = this.toWorldCoords(p);
            ghost.setPosition(world.x, world.y);
            // Update highlights — bright when hovered, dim otherwise
            const hit = this.inventoryView.getSlotAtPoint(world.x, world.y);
            for (const slotDef of SLOT_DEFS) {
              const isEmpty = !this.inventory.getItem(slotDef.name);
              const canDrop = (isEmpty && this.inventory.canEquip(slotDef.name, item)) || this.inventory.canSwap(def.name, slotDef.name);
              if (hit === slotDef.name) {
                this.inventoryView.setSlotHighlight(slotDef.name, canDrop ? "valid" : "invalid");
              } else {
                this.inventoryView.setSlotHighlight(slotDef.name, canDrop ? "valid_dim" : "invalid_dim");
              }
            }

            // Highlight door card if dragging a key from inventory
            if (item.isKey) {
              const doorCard = this.findDoorOnGrid();
              if (doorCard) {
                const ddx = world.x - doorCard.x;
                const ddy = world.y - doorCard.y;
                if (Math.abs(ddx) < CARD_W / 2 && Math.abs(ddy) < CARD_H / 2) {
                  doorCard.setHighlight(true);
                } else {
                  doorCard.setHighlight(false);
                }
              }
            }

            // Highlight portrait if item has dragOnPlayerPortrait ability
            if (this.collectAbilities("dragOnPlayerPortrait", item).length > 0) {
              if (this.playerView.isPointOver(world.x, world.y)) {
                this.playerView.showDropHighlight(item.description);
              } else {
                this.playerView.hideDropHighlight();
              }
            }

            // Highlight trap cards if item has dragOnTrap ability
            if (this.collectAbilities("dragOnTrap", item).length > 0) {
              const trapTarget = this.findTrapAtPoint(world.x, world.y);
              for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                  const gc = this.grid.getCardAt(c, r);
                  if (gc && gc.cardData.type === CardType.Trap) {
                    gc.setHighlight(gc === trapTarget);
                  }
                }
              }
            }

            // Highlight monster cards if item has dragOnMonster ability
            if (this.collectAbilities("dragOnMonster", item).length > 0) {
              const monsterTarget = this.findMonsterAtPoint(world.x, world.y);
              for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                  const gc = this.grid.getCardAt(c, r);
                  if (gc && gc.cardData.type === CardType.Monster) {
                    gc.setHighlight(gc === monsterTarget);
                  }
                }
              }
            }

            // Highlight chest cards if item has dragOnChest ability
            if (this.collectAbilities("dragOnChest", item).length > 0) {
              const chestTarget = this.findChestAtPoint(world.x, world.y);
              for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                  const gc = this.grid.getCardAt(c, r);
                  if (gc && gc.cardData.type === CardType.Chest) {
                    gc.setHighlight(gc === chestTarget);
                  }
                }
              }
            }

            // Highlight weapon slots if item has dragOnWeapon ability
            if (this.collectAbilities("dragOnWeapon", item).length > 0) {
              const weaponSlot = this.findWeaponSlotAtPoint(world.x, world.y);
              for (const slotDef of SLOT_DEFS) {
                if (slotDef.accepted.includes("weapon") && this.inventory.getItem(slotDef.name)) {
                  this.inventoryView.setSlotHighlight(
                    slotDef.name,
                    slotDef.name === weaponSlot ? "valid" : "valid_dim"
                  );
                }
              }
            }

            // Highlight equipped slots with matching tag if item has dragOnTag ability
            const invDragOnTagAbilities = this.collectAbilities("dragOnTag", item);
            if (invDragOnTagAbilities.length > 0) {
              for (const ab of invDragOnTagAbilities) {
                const requiredTag = ab.params.tag as string;
                const tagSlot = this.findTagSlotAtPoint(world.x, world.y, requiredTag);
                for (const slotDef of SLOT_DEFS) {
                  if (!slotDef.name.startsWith("backpack") && slotDef.name !== def.name) {
                    const slotItem = this.inventory.getItem(slotDef.name);
                    if (slotItem?.tag === requiredTag) {
                      this.inventoryView.setSlotHighlight(
                        slotDef.name,
                        slotDef.name === tagSlot ? "valid" : "valid_dim"
                      );
                    }
                  }
                }
              }
            }
          }
        };
        const onUp = (p: Phaser.Input.Pointer) => {
          this.input.off("pointermove", onMove);
          this.input.off("pointerup", onUp);
          if (!dragging || !ghost) return;

          const world = this.toWorldCoords(p);

          // Check if key dropped on door from inventory
          if (item.isKey) {
            const doorCard = this.findDoorOnGrid();
            if (doorCard) {
              const ddx = world.x - doorCard.x;
              const ddy = world.y - doorCard.y;
              if (Math.abs(ddx) < CARD_W / 2 && Math.abs(ddy) < CARD_H / 2) {
                doorCard.setHighlight(false);
                this.inventoryView.clearAllHighlights();
                this.inventory.unequip(def.name);
                ghost.destroy();
                this.openDoor(doorCard);
                return;
              }
              doorCard.setHighlight(false);
            }
          }

          // Clear grid card highlights
          this.clearGridHighlights();

          // Check if item with dragOnPlayerPortrait dropped on portrait
          const invPortraitAbilities = this.collectAbilities("dragOnPlayerPortrait", item);
          if (invPortraitAbilities.length > 0 && this.playerView.isPointOver(world.x, world.y)) {
            this.playerView.hideDropHighlight();
            this.inventoryView.clearAllHighlights();
            const scrollId = item.tag === "scroll" ? item.id : null;
            this.inventory.unequip(def.name);
            ghost.destroy();
            // Fire portrait abilities
            const hasAsyncAbility = invPortraitAbilities.some(ab => getAbility(ab.abilityId).effect === "removeDarkEvent");
            if (hasAsyncAbility) {
              this.sfx.play(SOUND_KEYS.holySpell04);
              this.playRemoveCurseAnimation(() => {});
            } else {
              this.fireAbilities(invPortraitAbilities, () => {});
            }
            // Recycle scroll if Wizard's Hat equipped
            if (scrollId && this.hasScrollRecycle()) {
              this.deck.mergeCards([getCard(scrollId)]);
              this.updateDeckVisual();
            }
            return;
          }
          this.playerView.hideDropHighlight();

          // Check if item with dragOnTrap dropped on a trap
          const invTrapAbilities = this.collectAbilities("dragOnTrap", item);
          if (invTrapAbilities.length > 0) {
            const trapTarget = this.findTrapAtPoint(world.x, world.y);
            if (trapTarget) {
              this.inventoryView.clearAllHighlights();
              this.inventory.unequip(def.name);
              ghost.destroy();
              this.fireAbilities(invTrapAbilities, () => {});
              const trapCell = this.grid.findCard(trapTarget);
              if (trapCell) this.grid.removeCard(trapCell.col, trapCell.row);
              this.updateExploreButtonState();
              trapTarget.resolve(() => {});
              return;
            }
          }

          // Check if item with dragOnMonster dropped on a monster
          const invMonsterAbilities = this.collectAbilities("dragOnMonster", item);
          if (invMonsterAbilities.length > 0) {
            const monsterTarget = this.findMonsterAtPoint(world.x, world.y);
            if (monsterTarget) {
              this.inventoryView.clearAllHighlights();
              this.inventory.unequip(def.name);
              ghost.destroy();
              this.dragTargetMonster = monsterTarget;
              this.lastUsedScrollId = item.tag === "scroll" ? item.id : null;
              this.fireDragOnMonsterAbilities(invMonsterAbilities, monsterTarget, () => {
                this.dragTargetMonster = null;
                // Recycle scroll if Wizard's Hat equipped
                if (this.lastUsedScrollId && this.hasScrollRecycle()) {
                  this.deck.mergeCards([getCard(this.lastUsedScrollId)]);
                  this.updateDeckVisual();
                }
                this.lastUsedScrollId = null;
              });
              return;
            }
          }

          // Check if item with dragOnWeapon dropped on an equipped weapon
          const invWeaponAbilities = this.collectAbilities("dragOnWeapon", item);
          if (invWeaponAbilities.length > 0) {
            const weaponSlot = this.findWeaponSlotAtPoint(world.x, world.y);
            if (weaponSlot) {
              this.inventoryView.clearAllHighlights();
              this.inventory.unequip(def.name);
              ghost.destroy();
              this.updatePlayerStats();
              this.fireAbilities(invWeaponAbilities, () => {});
              return;
            }
          }

          // Check if item with dragOnTag dropped on an equipped item with matching tag
          const invTagAbilities = this.collectAbilities("dragOnTag", item);
          if (invTagAbilities.length > 0) {
            for (const ab of invTagAbilities) {
              const requiredTag = ab.params.tag as string;
              const tagSlot = this.findTagSlotAtPoint(world.x, world.y, requiredTag);
              if (tagSlot) {
                this.inventoryView.clearAllHighlights();
                this.inventory.unequip(def.name);
                ghost.destroy();
                // Apply poison directly to the target weapon
                const aDef = getAbility(ab.abilityId);
                if (aDef.effect === "poisonWeapon") {
                  this.applyPoisonToWeapon(tagSlot, ab.params.amount as number);
                }
                const slotOrigin = this.inventoryView.getSlotWorldPos(tagSlot);
                this.fireAbilities([ab], () => {}, slotOrigin ?? undefined);
                return;
              }
            }
          }

          // Check if item with dragOnChest dropped on a chest
          const invChestAbilities = this.collectAbilities("dragOnChest", item);
          if (invChestAbilities.length > 0) {
            const chestTarget = this.findChestAtPoint(world.x, world.y);
            if (chestTarget) {
              this.inventoryView.clearAllHighlights();
              this.inventory.unequip(def.name);
              ghost.destroy();
              // Auto-open the chest: reveal loot without agility check
              this.sfx.play(SOUND_KEYS.chestOpen);
              const chestCell = this.grid.findCard(chestTarget);
              const lootInfo = this.chestLoot.get(chestTarget);
              if (chestCell && lootInfo) {
                this.grid.removeCard(chestCell.col, chestCell.row);
                chestTarget.resolve(() => {});
                // Reveal the loot card
                lootInfo.cardBack.destroy();
                const lootCard = new Card(this, lootInfo.cardBack.x, lootInfo.cardBack.y + TREASURE_OFFSET_Y, lootInfo.lootData);
                this.grid.placeCard(chestCell.col, chestCell.row, lootCard);
                lootCard.reveal();
                this.setupCardInteraction(lootCard);
                this.chestLoot.delete(chestTarget);
              } else if (chestCell) {
                this.grid.removeCard(chestCell.col, chestCell.row);
                chestTarget.resolve(() => {});
              }
              return;
            }
          }

          const overSlot = this.inventoryView.getSlotAtPoint(world.x, world.y);

          this.inventoryView.clearAllHighlights();

          if (overSlot === def.name) {
            // Dropped back on same slot — cancel
            ghost.destroy();
            this.inventoryView.setSlotContentAlpha(def.name, 1);
          } else if (overSlot && this.inventory.canEquip(overSlot, item) && !this.inventory.getItem(overSlot)) {
            // Dropped on a compatible empty slot — move item
            ghost.destroy();
            this.inventoryView.setSlotContentAlpha(def.name, 1);
            const displaced = this.inventory.unequip(def.name);
            this.inventory.equip(overSlot, item);
            // Fire onEquip for the moved item in its new slot (skip for backpack slots)
            const equipAbilities = overSlot.startsWith("backpack") ? [] : this.collectAbilities("onEquip", item);
            const slotOrigin = this.inventoryView.getSlotWorldPos(overSlot);
            this.fireAbilities(equipAbilities, () => {}, slotOrigin ?? undefined);
          } else if (overSlot && this.inventory.canSwap(def.name, overSlot)) {
            // Before swapping, check if either item has a dragOnTag ability matching the other's tag
            const otherItem = this.inventory.getItem(overSlot)!;
            // Check if dragged item targets the other item's tag
            if (otherItem.tag) {
              const draggedTagAbilities = this.collectAbilities("dragOnTag", item);
              const matchingAb = draggedTagAbilities.find(ab => ab.params.tag === otherItem.tag);
              if (matchingAb) {
                ghost.destroy();
                this.inventoryView.setSlotContentAlpha(def.name, 1);
                this.inventory.unequip(def.name);
                // Apply poison directly to the target weapon
                const mDef = getAbility(matchingAb.abilityId);
                if (mDef.effect === "poisonWeapon") {
                  this.applyPoisonToWeapon(overSlot, matchingAb.params.amount as number);
                }
                // Move target item to the freed source slot if compatible
                if (this.inventory.canEquip(def.name, otherItem)) {
                  this.inventory.unequip(overSlot);
                  this.inventory.equip(def.name, otherItem);
                }
                const slotOrigin = this.inventoryView.getSlotWorldPos(def.name);
                this.fireAbilities([matchingAb], () => {}, slotOrigin ?? undefined);
                return;
              }
            }
            // Check if other item targets the dragged item's tag
            if (item.tag) {
              const otherTagAbilities = this.collectAbilities("dragOnTag", otherItem);
              const matchingAb = otherTagAbilities.find(ab => ab.params.tag === item.tag);
              if (matchingAb) {
                ghost.destroy();
                this.inventoryView.setSlotContentAlpha(def.name, 1);
                // Apply poison directly to the target weapon
                const mDef = getAbility(matchingAb.abilityId);
                if (mDef.effect === "poisonWeapon") {
                  this.applyPoisonToWeapon(def.name, matchingAb.params.amount as number);
                }
                this.inventory.unequip(overSlot);
                const slotOrigin = this.inventoryView.getSlotWorldPos(def.name);
                this.fireAbilities([matchingAb], () => {}, slotOrigin ?? undefined);
                return;
              }
            }
            // Dropped on an occupied compatible slot — swap items
            ghost.destroy();
            this.inventoryView.setSlotContentAlpha(def.name, 1);
            this.inventory.swap(def.name, overSlot);
            // Fire onEquip for items landing in non-backpack (hand) slots
            const draggedEquipAbilities = overSlot.startsWith("backpack") ? [] : this.collectAbilities("onEquip", item);
            const otherEquipAbilities = def.name.startsWith("backpack") ? [] : this.collectAbilities("onEquip", otherItem);
            const allEquipAbilities = [...draggedEquipAbilities, ...otherEquipAbilities];
            if (allEquipAbilities.length > 0) {
              const slotOrigin = this.inventoryView.getSlotWorldPos(overSlot);
              this.fireAbilities(allEquipAbilities, () => {}, slotOrigin ?? undefined);
            }
          } else if (item.isKey || overSlot || this.findGridCardAtPoint(world.x, world.y) || this.playerView.isPointOver(world.x, world.y)) {
            // Snap back: key cards, incompatible slot, grid card, or portrait
            ghost.destroy();
            this.inventoryView.setSlotContentAlpha(def.name, 1);
          } else {
            // Dropped on empty space — discard
            this.discardedCardIds.add(item.id);
            const discardAbilities = this.collectAbilities("onDiscard", item);
            const discardSlotPos = this.inventoryView.getSlotWorldPos(def.name);
            this.fireAbilities(discardAbilities, () => {}, discardSlotPos ?? undefined);
            // Recycle scroll if Wizard's Hat equipped
            if (item.tag === "scroll" && discardAbilities.length > 0 && this.hasScrollRecycle()) {
              this.deck.mergeCards([getCard(item.id)]);
              this.updateDeckVisual();
            }
            this.inventory.unequip(def.name);
            ghost.destroy();
            this.inventoryView.playDissolveAt(this, world.x, world.y, item);
          }
        };
        this.input.on("pointermove", onMove);
        this.input.on("pointerup", onUp);
      });
    }
  }

  private resolveCard(card: Card): void {
    const cell = this.grid.findCard(card);
    if (!cell) return;

    // Potions are drag-only, not clickable
    if (card.cardData.type === CardType.Potion) return;

    // Cards with only onDiscard abilities shouldn't resolve on click
    if (card.cardData.abilities?.length) {
      const hasOnlyDiscardAbilities = card.cardData.abilities.every(
        a => getAbility(a.abilityId).trigger === "onDiscard"
      );
      if (hasOnlyDiscardAbilities) return;
    }

    if (card.cardData.type === CardType.Monster) {
      this.enterCombatMode(card);
      return;
    }

    if (card.cardData.type === CardType.Chest) {
      this.enterChestMode(card);
      return;
    }

    if (card.cardData.type === CardType.Trap) {
      this.enterTrapMode(card);
      return;
    }

    if (card.cardData.type === CardType.Door) {
      // Shake the door card as a hint that a key is needed
      this.tweens.add({
        targets: card,
        x: card.x + 6,
        duration: 50,
        yoyo: true,
        repeat: 2,
      });
      return;
    }

    if (card.cardData.exchangePrice) {
      this.enterExchangerMode(card);
      return;
    }

    // Gold piles: Treasure cards without a slot grant gold on resolve
    if (card.cardData.type === CardType.Treasure && !card.cardData.slot) {
      this.sfx.play(SOUND_KEYS.coinsGather);
      this.player.addGold(card.cardData.value);
    }

    this.isResolving = true;
    this.discardedCardIds.add(card.cardData.id);

    // Fire onResolve abilities before resolving
    const resolveAbilities = this.collectAbilities("onResolve", card.cardData);
    this.executeOnResolveAbilities(card, resolveAbilities, () => {
      this.grid.removeCard(cell.col, cell.row);
      this.updatePlayerStats();

      card.resolve(() => {
        this.isResolving = false;
        if (this.player.hp <= 0) {
          this.showGameOver();
        }
      });
    });
  }

  private executeOnResolveAbilities(
    card: Card,
    abilities: CardAbility[],
    onComplete: () => void,
  ): void {
    if (abilities.length === 0) {
      onComplete();
      return;
    }

    const [current, ...rest] = abilities;
    const def = getAbility(current.abilityId);

    switch (def.effect) {
      case "shuffleIntoDeck": {
        const cardId = current.params.cardId as string;
        const count = current.params.count as number;
        this.playSummonToDeckAnimation(card, cardId, count, () => {
          this.executeOnResolveAbilities(card, rest, onComplete);
        });
        break;
      }
      case "damagePlayer": {
        const amount = current.params.amount as number;
        const next = () => this.executeOnResolveAbilities(card, rest, onComplete);
        if (current.params.ignoresArmor) {
          this.player.takeDamage(amount);
          this.tweens.add({
            targets: this.playerView,
            alpha: 0.3,
            duration: 80,
            yoyo: true,
            repeat: 2,
            onComplete: () => next(),
          });
        } else {
          this.applyDamageWithArmour(amount, next);
        }
        break;
      }
      case "removeDarkEvent": {
        this.sfx.play(SOUND_KEYS.holySpell04);
        // Remove first card with tag "curse" from deck
        this.deck.removeFirstByTag("curse");
        this.executeOnResolveAbilities(card, rest, onComplete);
        break;
      }
      case "removeFromDeck": {
        const cardId = current.params.cardId as string;
        this.playRemoveFromDeckAnimation(cardId, () => {
          this.executeOnResolveAbilities(card, rest, onComplete);
        });
        break;
      }
      case "addFateModifier": {
        this.sfx.play(SOUND_KEYS.holySpell06);
        const modifier = current.params.modifier as number;
        this.playFlyToFateDeckAnimation({ x: card.x, y: card.y }, modifier, () => {
          this.executeOnResolveAbilities(card, rest, onComplete);
        });
        break;
      }
      case "buffMonsterType": {
        const monsterId = current.params.monsterId as string;
        const amount = current.params.amount as number;
        // Buff monsters on grid
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const gc = this.grid.getCardAt(c, r);
            if (gc && gc.cardData.id === monsterId) {
              gc.updateValue(gc.cardData.value + amount);
            }
          }
        }
        // Buff monsters in deck
        this.deck.buffCardById(monsterId, amount);
        this.executeOnResolveAbilities(card, rest, onComplete);
        break;
      }
      default:
        this.executeOnResolveAbilities(card, rest, onComplete);
        break;
    }
  }

  private executeOnTrapTriggeredAbilities(
    trapCard: Card,
    abilities: CardAbility[],
    onComplete: () => void,
  ): void {
    if (abilities.length === 0) {
      onComplete();
      return;
    }

    const [current, ...rest] = abilities;
    const def = getAbility(current.abilityId);

    switch (def.effect) {
      case "shuffleIntoDeck": {
        const cardId = current.params.cardId as string;
        const count = current.params.count as number;
        this.playSummonToDeckAnimation(trapCard, cardId, count, () => {
          this.executeOnTrapTriggeredAbilities(trapCard, rest, onComplete);
        });
        break;
      }
      case "removeFromDeck": {
        const cardId = current.params.cardId as string;
        this.playRemoveFromDeckAnimation(cardId, () => {
          this.executeOnTrapTriggeredAbilities(trapCard, rest, onComplete);
        });
        break;
      }
      case "addFateModifier": {
        this.sfx.play(SOUND_KEYS.holySpell06);
        const modifier = current.params.modifier as number;
        this.playFlyToFateDeckAnimation({ x: trapCard.x, y: trapCard.y }, modifier, () => {
          this.executeOnTrapTriggeredAbilities(trapCard, rest, onComplete);
        });
        break;
      }
      default:
        this.executeOnTrapTriggeredAbilities(trapCard, rest, onComplete);
        break;
    }
  }

  private enterCombatMode(card: Card): void {
    this.isResolving = true;
    this.combatMonster = card;

    // Dim other grid cards
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard && gridCard !== card) {
          gridCard.setAlpha(0.3);
          // Also dim guarded loot on non-combat monsters
          if (gridCard.guardedLoot) {
            gridCard.guardedLoot.setAlpha(0.3);
            gridCard.guardedLoot.disableInteractive();
          }
          const chestLootInfo = this.chestLoot.get(gridCard);
          if (chestLootInfo) chestLootInfo.cardBack.setAlpha(0.3);
        }
      }
    }

    // Dim the combat monster's own guarded loot
    if (card.guardedLoot) {
      card.guardedLoot.setAlpha(0.3);
      card.guardedLoot.setDepth(3);
      card.guardedLoot.disableInteractive();
    }

    // Dim grid background, deck visual, HUD, explore button, level indicator
    this.gridBgGraphics.forEach(img => img.setAlpha(0.3));
    this.deckVisual.forEach(img => img.setAlpha(0.3));
    this.deckText.setAlpha(0.3);
    this.goldText.setAlpha(0.3);
    this.exploreBtn.setAlpha(0.3);
    this.levelIndicator.setAlpha(0.3);
    this.levelFlavorText.setAlpha(0.3);

    // Bring monster to top
    card.setDepth(4500);

    // Create clickable overlay behind fight button (to cancel combat)
    this.combatOverlay = this.add.rectangle(
      GAME_W / 2,
      GAME_H / 2,
      GAME_W,
      GAME_H,
      0x000000,
      0.01
    );
    this.combatOverlay.setDepth(4000);
    this.combatOverlay.setInteractive();
    this.combatOverlay.on("pointerdown", () => this.exitCombatMode());

    // Create FIGHT button below the monster card
    const btnW = 160;
    const btnH = 60;
    this.fightBtn = this.add.container(card.x, card.y + CARD_H / 2 + 48);
    this.fightBtn.setDepth(5000);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xcc3333, 1);
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    btnBg.lineStyle(4, 0xff5555, 0.8);
    btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    this.fightBtn.add(btnBg);

    const btnText = this.add
      .text(0, 0, "FIGHT", {
        fontSize: "32px",
        fontFamily: "monospace",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.fightBtn.add(btnText);

    this.fightBtn.setSize(btnW, btnH);
    this.fightBtn.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, btnW, btnH),
      Phaser.Geom.Rectangle.Contains
    );

    this.fightBtn.on("pointerover", () => {
      btnBg.clear();
      btnBg.fillStyle(0xee4444, 1);
      btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      btnBg.lineStyle(4, 0xff5555, 0.8);
      btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    });

    this.fightBtn.on("pointerout", () => {
      btnBg.clear();
      btnBg.fillStyle(0xcc3333, 1);
      btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      btnBg.lineStyle(4, 0xff5555, 0.8);
      btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    });

    this.fightBtn.on("pointerdown", () => {
      this.executeCombat(card);
    });

    // Slide fate deck up
    this.playerView.slideFateDeckUp(this);
  }

  private exitCombatMode(): void {
    // Remove overlay and fight button
    if (this.combatOverlay) {
      this.combatOverlay.destroy();
      this.combatOverlay = null;
    }
    if (this.fightBtn) {
      this.fightBtn.destroy();
      this.fightBtn = null;
    }

    // Restore all grid card alphas, guarded loot, and chest loot
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard) {
          gridCard.setAlpha(1);
          if (gridCard.guardedLoot) {
            gridCard.guardedLoot.setAlpha(1);
            gridCard.guardedLoot.setDepth(5);
            gridCard.guardedLoot.setInteractive();
          }
          const chestLootInfo = this.chestLoot.get(gridCard);
          if (chestLootInfo) chestLootInfo.cardBack.setAlpha(1);
        }
      }
    }

    // Restore HUD alphas
    this.gridBgGraphics.forEach(img => img.setAlpha(1));
    this.deckVisual.forEach(img => img.setAlpha(1));
    this.deckText.setAlpha(1);
    this.goldText.setAlpha(1);
    this.exploreBtn.setAlpha(1);
    this.levelIndicator.setAlpha(1);
    this.levelFlavorText.setAlpha(1);

    // Reset monster depth
    if (this.combatMonster) {
      this.combatMonster.setDepth(10);
      if (this.combatMonster.guardedLoot) {
        this.combatMonster.guardedLoot.setAlpha(1);
        this.combatMonster.guardedLoot.setDepth(5);
        this.combatMonster.guardedLoot.setInteractive();
      }
    }

    // Slide fate deck down
    this.playerView.slideFateDeckDown(this);

    this.isResolving = false;
    this.combatMonster = null;
  }

  private executeCombat(monsterCard: Card): void {
    // Disable fight button and overlay clicks during combat
    if (this.fightBtn) {
      this.fightBtn.disableInteractive();
      this.fightBtn.setDepth(500);
    }
    if (this.combatOverlay) this.combatOverlay.disableInteractive();

    // Step 1: Draw & reveal fate card
    const modifier = this.player.drawFateCard();
    const fateDeckPos = this.playerView.getFateDeckWorldPos();

    // Create fate card visual
    const fateCardW = 100;
    const fateCardH = 140;
    const fateCard = this.add.container(fateDeckPos.x, fateDeckPos.y);
    fateCard.setDepth(9000);
    fateCard.setScale(0.3);

    const fateBg = this.add.graphics();
    fateBg.fillStyle(0x1a1a2e, 1);
    fateBg.fillRoundedRect(-fateCardW / 2, -fateCardH / 2, fateCardW, fateCardH, 12);
    fateBg.lineStyle(2, 0x4444aa, 0.8);
    fateBg.strokeRoundedRect(-fateCardW / 2, -fateCardH / 2, fateCardW, fateCardH, 12);
    fateCard.add(fateBg);

    let modColor: string;
    let modLabel: string;
    if (modifier > 0) {
      modColor = "#44dd88";
      modLabel = `+${modifier}`;
    } else if (modifier < 0) {
      modColor = "#ff5555";
      modLabel = `${modifier}`;
    } else {
      modColor = "#888888";
      modLabel = "0";
    }

    const modText = this.add
      .text(0, 0, modLabel, {
        fontSize: "40px",
        fontFamily: "monospace",
        color: modColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    fateCard.add(modText);

    // Animate fate card appearing above player
    const targetX = this.playerView.x - 140;
    const targetY = this.playerView.y - 120;

    this.tweens.add({
      targets: fateCard,
      x: targetX,
      y: targetY,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: "Back.easeOut",
      onComplete: () => {
        // Step 2: After a brief hold, fly fate card into player portrait
        this.time.delayedCall(300, () => {
          const modifiedPower = Math.max(0, this.player.power + this.inventory.powerBonus + modifier + this.getPassivePowerModifier());

          this.tweens.add({
            targets: fateCard,
            x: this.playerView.x,
            y: this.playerView.y,
            scaleX: 0,
            scaleY: 0,
            duration: 300,
            ease: "Power2",
            onComplete: () => {
              fateCard.destroy();
              this.playerView.showTempPower(modifiedPower);

              // Step 3: Player attacks monster
              this.time.delayedCall(100, () => {
                const origX = this.playerView.x;
                const origY = this.playerView.y;
                const attackX = origX + (monsterCard.x - origX) * 0.6;
                const attackY = origY + (monsterCard.y - origY) * 0.6;

                this.tweens.add({
                  targets: this.playerView,
                  x: attackX,
                  y: attackY,
                  duration: 250,
                  ease: "Power2",
                  onComplete: () => {
                    // Player hits monster — sword attack sound
                    this.sfx.playRandom(SOUND_GROUPS.swordAttack);
                    // Hit effect: shake monster
                    const newMonsterValue = Math.max(0, monsterCard.cardData.value - modifiedPower);
                    monsterCard.updateValue(newMonsterValue);

                    this.tweens.add({
                      targets: monsterCard,
                      x: monsterCard.x + 10,
                      duration: 50,
                      yoyo: true,
                      repeat: 3,
                      onComplete: () => {
                        // Return player to original position
                        this.tweens.add({
                          targets: this.playerView,
                          x: origX,
                          y: origY,
                          duration: 250,
                          ease: "Power2",
                          onComplete: () => {
                            // Step 4: Monster counterattack (if alive)
                            if (newMonsterValue > 0) {
                              this.monsterCounterattack(monsterCard, modifier);
                            } else {
                              this.combatCleanup(monsterCard, modifier);
                            }
                          },
                        });
                      },
                    });
                  },
                });
              });
            },
          });
        });
      },
    });
  }

  private monsterCounterattack(
    monsterCard: Card,
    fateModifier: number
  ): void {
    // Fire onCounterAttack abilities from equipped items before damage
    const counterAbilities = this.collectEquippedAbilities("onCounterAttack");
    this.fireAbilities(counterAbilities, () => {
      // Calculate bonus counter damage from monster's own abilities
      let bonusDamage = 0;
      const monsterCounterAbilities = this.collectAbilities("onCounterAttack", monsterCard.cardData);
      for (const ab of monsterCounterAbilities) {
        const def = getAbility(ab.abilityId);
        if (def.effect === "bonusCounterDamage") {
          bonusDamage += ab.params.amount as number;
        }
      }
      const damage = monsterCard.cardData.value + this.getMonsterPowerBuff() + bonusDamage;
      this.playDamagePlayerEffect(monsterCard, damage, () => {
        this.combatCleanup(monsterCard, fateModifier);
      });
    });
  }

  private applyDamageWithArmour(amount: number, onComplete: () => void): void {
    const armourPriority = ["weapon1", "weapon2", "head", "armour"];

    // Collect armour items in priority order
    const armourItems: { slotName: string; ability: { abilityId: string; params: Record<string, number | string> }; item: CardData }[] = [];
    for (const slotName of armourPriority) {
      const item = this.inventory.getItem(slotName);
      if (!item) continue;
      const ability = item.abilities?.find(a => a.abilityId === "armour");
      if (ability) {
        armourItems.push({ slotName, ability, item });
      }
    }

    // If no armour, go straight to HP damage
    if (armourItems.length === 0 || amount <= 0) {
      if (amount > 0) {
        this.player.takeDamage(amount);
        this.tweens.add({
          targets: this.playerView,
          alpha: 0.3,
          duration: 80,
          yoyo: true,
          repeat: 2,
          onComplete: () => onComplete(),
        });
      } else {
        onComplete();
      }
      return;
    }

    let remainingDamage = amount;
    let index = 0;

    const processNext = () => {
      if (index >= armourItems.length || remainingDamage <= 0) {
        // All armour processed, apply remaining damage to HP
        if (remainingDamage > 0) {
          this.player.takeDamage(remainingDamage);
          this.tweens.add({
            targets: this.playerView,
            alpha: 0.3,
            duration: 80,
            yoyo: true,
            repeat: 2,
            onComplete: () => onComplete(),
          });
        } else {
          onComplete();
        }
        return;
      }

      const { slotName, ability, item } = armourItems[index];
      index++;

      const armourValue = ability.params.amount as number;
      const absorbed = Math.min(armourValue, remainingDamage);
      const newArmour = armourValue - remainingDamage;
      remainingDamage = Math.max(0, remainingDamage - armourValue);

      const slotPos = this.inventoryView.getSlotWorldPos(slotName);
      if (!slotPos) {
        processNext();
        return;
      }

      // Floating absorbed damage text
      const floatText = this.add.text(slotPos.x, slotPos.y, `-${absorbed}`, {
        fontSize: "28px",
        fontFamily: "monospace",
        color: "#ff4444",
        fontStyle: "bold",
      }).setOrigin(0.5).setDepth(9000);

      this.tweens.add({
        targets: floatText,
        y: slotPos.y - 60,
        alpha: 0,
        duration: 600,
        ease: "Power2",
        onComplete: () => floatText.destroy(),
      });

      // Red flash on slot
      const slotContainer = this.inventoryView.getSlotContainer(slotName);
      if (slotContainer) {
        const flashRect = this.add.graphics();
        flashRect.fillStyle(0xff0000, 0.4);
        flashRect.fillRoundedRect(-78, -93, 157, 186, 12);
        slotContainer.add(flashRect);

        this.tweens.add({
          targets: flashRect,
          alpha: 0,
          duration: 80,
          yoyo: true,
          repeat: 2,
          onComplete: () => {
            flashRect.destroy();

            if (newArmour <= 0) {
              // Item destroyed
              this.inventory.unequip(slotName);
              this.inventoryView.playDissolveAt(this, slotPos.x, slotPos.y, item);
              this.time.delayedCall(200, () => processNext());
            } else {
              // Item survives - update armour value
              ability.params.amount = newArmour;
              this.inventoryView.refreshSlot(slotName);
              processNext();
            }
          },
        });
      } else {
        if (newArmour <= 0) {
          this.inventory.unequip(slotName);
          this.time.delayedCall(200, () => processNext());
        } else {
          ability.params.amount = newArmour;
          this.inventoryView.refreshSlot(slotName);
          processNext();
        }
      }
    };

    processNext();
  }

  /** Handle onMonsterDeath abilities: self-reshuffle, conditional return, key shuffle. */
  private handleMonsterDeathAbilities(monsterCard: Card): void {
    const deathAbilities = this.collectAbilities("onMonsterDeath", monsterCard.cardData);
    const hasSelfReshuffle = deathAbilities.some(a => getAbility(a.abilityId).effect === "shuffleSelfIntoDeck");

    if (hasSelfReshuffle) {
      const freshCopy = getCard(monsterCard.cardData.id);
      this.applyLevelScaling(freshCopy);
      this.deck.mergeCards([freshCopy]);
      this.updateDeckVisual();
      this.updateHUD();
    }

    const conditionalReturn = deathAbilities.filter(a => getAbility(a.abilityId).effect === "returnSelfConditional");
    for (const ab of conditionalReturn) {
      const requiredDiscardId = ab.params.requiredDiscardId as string;
      const conditionMet = this.discardedCardIds.has(requiredDiscardId);
      if (!conditionMet) {
        const freshCopy = getCard(monsterCard.cardData.id);
        if (monsterCard.cardData.isBoss) freshCopy.isBoss = true;
        this.applyLevelScaling(freshCopy);
        this.deck.mergeCards([freshCopy]);
        this.updateDeckVisual();
        this.updateHUD();
      } else if (monsterCard.cardData.isBoss && this.currentLevelKey) {
        const keyId = this.currentLevelKey.id;
        this.currentLevelKey = null;
        this.playSummonToDeckAnimation({ x: monsterCard.x, y: monsterCard.y }, keyId, 1, () => {});
      }
    }
  }

  private combatCleanup(monsterCard: Card, fateModifier: number): void {
    // Remove overlay and fight button
    if (this.combatOverlay) {
      this.combatOverlay.destroy();
      this.combatOverlay = null;
    }
    if (this.fightBtn) {
      this.fightBtn.destroy();
      this.fightBtn = null;
    }

    // Capture guarded loot info before monster resolves
    const guardedLoot = monsterCard.guardedLoot;
    const cell = this.grid.findCard(monsterCard);
    const cellPos = cell ? { col: cell.col, row: cell.row } : null;

    // Remove monster from grid
    if (cell) this.grid.removeCard(cell.col, cell.row);
    this.updatePlayerStats();

    // Combat always kills the monster (it counterattacks first if it survives the player's hit)
    const equipDeathAbilities = this.collectEquippedAbilities("onMonsterDeath");
    this.fireAbilities(equipDeathAbilities, () => {});
    this.handleMonsterDeathAbilities(monsterCard);

    monsterCard.resolve(() => {
      // Shuffle fate card back
      this.player.shuffleFateCardBack(fateModifier);

      // Restore alphas for all grid cards, guarded loot, and chest loot
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const gridCard = this.grid.getCardAt(c, r);
          if (gridCard) {
            gridCard.setAlpha(1);
            if (gridCard.guardedLoot) {
              gridCard.guardedLoot.setAlpha(1);
              gridCard.guardedLoot.setDepth(5);
              gridCard.guardedLoot.setInteractive();
            }
            const chestLootInfo = this.chestLoot.get(gridCard);
            if (chestLootInfo) chestLootInfo.cardBack.setAlpha(1);
          }
        }
      }
      this.gridBgGraphics.forEach(img => img.setAlpha(1));
      this.deckVisual.forEach(img => img.setAlpha(1));
      this.deckText.setAlpha(1);
      this.goldText.setAlpha(1);
      this.exploreBtn.setAlpha(1);
      this.levelIndicator.setAlpha(1);
      this.levelFlavorText.setAlpha(1);

      // Slide fate deck down and restore power display
      this.playerView.slideFateDeckDown(this);
      this.playerView.restorePower(this.player, this.inventory.powerBonus, this.getPassiveAgilityModifier() + this.inventory.agilityBonus, this.getPassivePowerModifier());

      // Free the guarded loot into the now-empty grid slot
      if (guardedLoot && cellPos) {
        this.freeGuardedLoot(guardedLoot, cellPos);
      }

      this.revertPoison();
      this.isResolving = false;
      this.combatMonster = null;

      // Check game over
      if (this.player.hp <= 0) {
        this.showGameOver();
      }
    });
  }

  private enterChestMode(card: Card): void {
    this.isResolving = true;
    this.crackingChest = card;

    // Dim other grid cards
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard && gridCard !== card) {
          gridCard.setAlpha(0.3);
          if (gridCard.guardedLoot) {
            gridCard.guardedLoot.setAlpha(0.3);
            gridCard.guardedLoot.disableInteractive();
          }
          const chestLootInfo = this.chestLoot.get(gridCard);
          if (chestLootInfo) chestLootInfo.cardBack.setAlpha(0.3);
        }
      }
    }

    // Dim the chest's own loot card back
    const ownLoot = this.chestLoot.get(card);
    if (ownLoot) ownLoot.cardBack.setAlpha(0.3);

    // Dim grid background, deck visual, HUD, explore button, level indicator
    this.gridBgGraphics.forEach(img => img.setAlpha(0.3));
    this.deckVisual.forEach(img => img.setAlpha(0.3));
    this.deckText.setAlpha(0.3);
    this.goldText.setAlpha(0.3);
    this.exploreBtn.setAlpha(0.3);
    this.levelIndicator.setAlpha(0.3);
    this.levelFlavorText.setAlpha(0.3);

    // Bring chest to top
    card.setDepth(4500);

    // Create clickable overlay behind crack button (to cancel)
    this.chestOverlay = this.add.rectangle(
      GAME_W / 2,
      GAME_H / 2,
      GAME_W,
      GAME_H,
      0x000000,
      0.01
    );
    this.chestOverlay.setDepth(4000);
    this.chestOverlay.setInteractive();
    this.chestOverlay.on("pointerdown", () => this.exitChestMode());

    // Create CRACK button below chest
    const btnW = 160;
    const btnH = 60;
    this.crackBtn = this.add.container(card.x, card.y + CARD_H / 2 + 48);
    this.crackBtn.setDepth(5000);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x88664d, 1);
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    btnBg.lineStyle(4, 0xaa8866, 0.8);
    btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    this.crackBtn.add(btnBg);

    const btnText = this.add
      .text(0, 0, "CRACK", {
        fontSize: "32px",
        fontFamily: "monospace",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.crackBtn.add(btnText);

    this.crackBtn.setSize(btnW, btnH);
    this.crackBtn.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, btnW, btnH),
      Phaser.Geom.Rectangle.Contains
    );

    this.crackBtn.on("pointerover", () => {
      btnBg.clear();
      btnBg.fillStyle(0xaa8866, 1);
      btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      btnBg.lineStyle(4, 0xaa8866, 0.8);
      btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    });

    this.crackBtn.on("pointerout", () => {
      btnBg.clear();
      btnBg.fillStyle(0x88664d, 1);
      btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      btnBg.lineStyle(4, 0xaa8866, 0.8);
      btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    });

    this.crackBtn.on("pointerdown", () => {
      this.executeCrack(card);
    });

    // Slide fate deck up
    this.playerView.slideFateDeckUp(this);
  }

  private exitChestMode(): void {
    if (this.chestOverlay) {
      this.chestOverlay.destroy();
      this.chestOverlay = null;
    }
    if (this.crackBtn) {
      this.crackBtn.destroy();
      this.crackBtn = null;
    }

    // Restore all grid card alphas, guarded loot, and chest loot
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard) {
          gridCard.setAlpha(1);
          if (gridCard.guardedLoot) {
            gridCard.guardedLoot.setAlpha(1);
            gridCard.guardedLoot.setDepth(5);
            gridCard.guardedLoot.setInteractive();
          }
          const chestLootInfo = this.chestLoot.get(gridCard);
          if (chestLootInfo) chestLootInfo.cardBack.setAlpha(1);
        }
      }
    }

    // Restore HUD alphas
    this.gridBgGraphics.forEach(img => img.setAlpha(1));
    this.deckVisual.forEach(img => img.setAlpha(1));
    this.deckText.setAlpha(1);
    this.goldText.setAlpha(1);
    this.exploreBtn.setAlpha(1);
    this.levelIndicator.setAlpha(1);
    this.levelFlavorText.setAlpha(1);

    // Reset chest depth
    if (this.crackingChest) {
      this.crackingChest.setDepth(10);
    }

    // Slide fate deck down
    this.playerView.slideFateDeckDown(this);

    this.isResolving = false;
    this.crackingChest = null;
  }

  private executeCrack(chestCard: Card): void {
    if (this.crackBtn) {
      this.crackBtn.disableInteractive();
      this.crackBtn.setDepth(500);
    }
    if (this.chestOverlay) this.chestOverlay.disableInteractive();

    const modifier = this.player.drawFateCard();
    const fateDeckPos = this.playerView.getFateDeckWorldPos();

    // Create fate card visual
    const fateCardW = 100;
    const fateCardH = 140;
    const fateCard = this.add.container(fateDeckPos.x, fateDeckPos.y);
    fateCard.setDepth(9000);
    fateCard.setScale(0.3);

    const fateBg = this.add.graphics();
    fateBg.fillStyle(0x1a1a2e, 1);
    fateBg.fillRoundedRect(-fateCardW / 2, -fateCardH / 2, fateCardW, fateCardH, 12);
    fateBg.lineStyle(2, 0x4444aa, 0.8);
    fateBg.strokeRoundedRect(-fateCardW / 2, -fateCardH / 2, fateCardW, fateCardH, 12);
    fateCard.add(fateBg);

    let modColor: string;
    let modLabel: string;
    if (modifier > 0) {
      modColor = "#44dd88";
      modLabel = `+${modifier}`;
    } else if (modifier < 0) {
      modColor = "#ff5555";
      modLabel = `${modifier}`;
    } else {
      modColor = "#888888";
      modLabel = "0";
    }

    const modText = this.add
      .text(0, 0, modLabel, {
        fontSize: "40px",
        fontFamily: "monospace",
        color: modColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    fateCard.add(modText);

    // Animate fate card appearing above player
    const targetX = this.playerView.x - 140;
    const targetY = this.playerView.y - 120;

    this.tweens.add({
      targets: fateCard,
      x: targetX,
      y: targetY,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: "Back.easeOut",
      onComplete: () => {
        this.time.delayedCall(300, () => {
          const modifiedAgility = Math.max(0, this.player.agility + this.inventory.agilityBonus + modifier + this.getPassiveAgilityModifier());

          this.tweens.add({
            targets: fateCard,
            x: this.playerView.x,
            y: this.playerView.y,
            scaleX: 0,
            scaleY: 0,
            duration: 300,
            ease: "Power2",
            onComplete: () => {
              fateCard.destroy();
              this.playerView.showTempAgility(modifiedAgility);

              this.time.delayedCall(300, () => {
                const lockDifficulty = chestCard.cardData.lockDifficulty ?? 0;
                const success = modifiedAgility >= lockDifficulty;

                if (success) {
                  this.sfx.play(SOUND_KEYS.chestOpen);
                  this.chestCleanup(chestCard, modifier);
                } else {
                  this.sfx.playRandom(SOUND_GROUPS.squelching);
                  const trapDamage = chestCard.cardData.trapDamage ?? 0;
                  if (trapDamage > 0) {
                    this.applyDamageWithArmour(trapDamage, () => {
                      this.chestCleanup(chestCard, modifier);
                    });
                  } else {
                    this.chestCleanup(chestCard, modifier);
                  }
                }
              });
            },
          });
        });
      },
    });
  }

  private chestCleanup(chestCard: Card, fateModifier: number): void {
    if (this.chestOverlay) {
      this.chestOverlay.destroy();
      this.chestOverlay = null;
    }
    if (this.crackBtn) {
      this.crackBtn.destroy();
      this.crackBtn = null;
    }

    const lootInfo = this.chestLoot.get(chestCard);
    const cell = this.grid.findCard(chestCard);
    const cellPos = cell ? { col: cell.col, row: cell.row } : null;

    if (cell) this.grid.removeCard(cell.col, cell.row);
    this.updatePlayerStats();
    this.chestLoot.delete(chestCard);

    chestCard.resolve(() => {
      this.player.shuffleFateCardBack(fateModifier);

      // Restore alphas
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const gridCard = this.grid.getCardAt(c, r);
          if (gridCard) {
            gridCard.setAlpha(1);
            if (gridCard.guardedLoot) {
              gridCard.guardedLoot.setAlpha(1);
              gridCard.guardedLoot.setDepth(5);
              gridCard.guardedLoot.setInteractive();
            }
            const chestLootInfo = this.chestLoot.get(gridCard);
            if (chestLootInfo) chestLootInfo.cardBack.setAlpha(1);
          }
        }
      }
      this.gridBgGraphics.forEach(img => img.setAlpha(1));
      this.deckVisual.forEach(img => img.setAlpha(1));
      this.deckText.setAlpha(1);
      this.goldText.setAlpha(1);
      this.exploreBtn.setAlpha(1);
      this.levelIndicator.setAlpha(1);
      this.levelFlavorText.setAlpha(1);

      this.playerView.slideFateDeckDown(this);
      this.playerView.restoreAgility(this.player);

      // Reveal loot card
      if (lootInfo && cellPos) {
        lootInfo.cardBack.destroy();
        const targetPos = this.grid.worldPos(cellPos.col, cellPos.row);
        const lootCard = new Card(this, targetPos.x, targetPos.y, lootInfo.lootData);
        lootCard.setScale(0, 1);
        this.grid.placeCard(cellPos.col, cellPos.row, lootCard);

        this.tweens.add({
          targets: lootCard,
          scaleX: 1,
          duration: 300,
          ease: "Back.easeOut",
          onComplete: () => {
            this.setupCardInteraction(lootCard);
            this.isResolving = false;
            this.crackingChest = null;
            this.disarmingTrap = null;
            this.updateExploreButtonState();
          },
        });
      } else {
        this.isResolving = false;
        this.crackingChest = null;
        this.disarmingTrap = null;
        this.updateExploreButtonState();
      }

      if (this.player.hp <= 0) {
        this.showGameOver();
      }
    });
  }

  private enterTrapMode(card: Card): void {
    this.isResolving = true;
    this.disarmingTrap = card;

    // Dim other grid cards
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard && gridCard !== card) {
          gridCard.setAlpha(0.3);
          if (gridCard.guardedLoot) {
            gridCard.guardedLoot.setAlpha(0.3);
            gridCard.guardedLoot.disableInteractive();
          }
          const chestLootInfo = this.chestLoot.get(gridCard);
          if (chestLootInfo) chestLootInfo.cardBack.setAlpha(0.3);
        }
      }
    }

    // Dim grid background, deck visual, HUD, explore button, level indicator
    this.gridBgGraphics.forEach(img => img.setAlpha(0.3));
    this.deckVisual.forEach(img => img.setAlpha(0.3));
    this.deckText.setAlpha(0.3);
    this.goldText.setAlpha(0.3);
    this.exploreBtn.setAlpha(0.3);
    this.levelIndicator.setAlpha(0.3);
    this.levelFlavorText.setAlpha(0.3);

    // Bring trap to top
    card.setDepth(4500);

    // Create clickable overlay behind disarm button (to cancel)
    this.trapOverlay = this.add.rectangle(
      GAME_W / 2,
      GAME_H / 2,
      GAME_W,
      GAME_H,
      0x000000,
      0.01
    );
    this.trapOverlay.setDepth(4000);
    this.trapOverlay.setInteractive();
    this.trapOverlay.on("pointerdown", () => this.exitTrapMode());

    // Create DISARM button below trap
    const btnW = 160;
    const btnH = 60;
    this.disarmBtn = this.add.container(card.x, card.y + CARD_H / 2 + 48);
    this.disarmBtn.setDepth(5000);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xdd8833, 1);
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    btnBg.lineStyle(4, 0xee9944, 0.8);
    btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    this.disarmBtn.add(btnBg);

    const btnText = this.add
      .text(0, 0, "DISARM", {
        fontSize: "32px",
        fontFamily: "monospace",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.disarmBtn.add(btnText);

    this.disarmBtn.setSize(btnW, btnH);
    this.disarmBtn.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, btnW, btnH),
      Phaser.Geom.Rectangle.Contains
    );

    this.disarmBtn.on("pointerover", () => {
      btnBg.clear();
      btnBg.fillStyle(0xee9944, 1);
      btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      btnBg.lineStyle(4, 0xee9944, 0.8);
      btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    });

    this.disarmBtn.on("pointerout", () => {
      btnBg.clear();
      btnBg.fillStyle(0xdd8833, 1);
      btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      btnBg.lineStyle(4, 0xee9944, 0.8);
      btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    });

    this.disarmBtn.on("pointerdown", () => {
      this.executeDisarm(card);
    });

    // Slide fate deck up
    this.playerView.slideFateDeckUp(this);
  }

  private exitTrapMode(): void {
    if (this.trapOverlay) {
      this.trapOverlay.destroy();
      this.trapOverlay = null;
    }
    if (this.disarmBtn) {
      this.disarmBtn.destroy();
      this.disarmBtn = null;
    }

    // Restore all grid card alphas, guarded loot, and chest loot
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard) {
          gridCard.setAlpha(1);
          if (gridCard.guardedLoot) {
            gridCard.guardedLoot.setAlpha(1);
            gridCard.guardedLoot.setDepth(5);
            gridCard.guardedLoot.setInteractive();
          }
          const chestLootInfo = this.chestLoot.get(gridCard);
          if (chestLootInfo) chestLootInfo.cardBack.setAlpha(1);
        }
      }
    }

    // Restore HUD alphas
    this.gridBgGraphics.forEach(img => img.setAlpha(1));
    this.deckVisual.forEach(img => img.setAlpha(1));
    this.deckText.setAlpha(1);
    this.goldText.setAlpha(1);
    this.exploreBtn.setAlpha(1);
    this.levelIndicator.setAlpha(1);
    this.levelFlavorText.setAlpha(1);

    // Reset trap depth
    if (this.disarmingTrap) {
      this.disarmingTrap.setDepth(10);
    }

    // Slide fate deck down
    this.playerView.slideFateDeckDown(this);

    this.isResolving = false;
    this.disarmingTrap = null;
  }

  private executeDisarm(trapCard: Card): void {
    if (this.disarmBtn) {
      this.disarmBtn.disableInteractive();
      this.disarmBtn.setDepth(500);
    }
    if (this.trapOverlay) this.trapOverlay.disableInteractive();

    // Reuse the same fate card + agility check flow as chest cracking
    const modifier = this.player.drawFateCard();
    const fateDeckPos = this.playerView.getFateDeckWorldPos();

    const fateCardW = 100;
    const fateCardH = 140;
    const fateCard = this.add.container(fateDeckPos.x, fateDeckPos.y);
    fateCard.setDepth(9000);
    fateCard.setScale(0.3);

    const fateBg = this.add.graphics();
    fateBg.fillStyle(0x1a1a2e, 1);
    fateBg.fillRoundedRect(-fateCardW / 2, -fateCardH / 2, fateCardW, fateCardH, 12);
    fateBg.lineStyle(2, 0x4444aa, 0.8);
    fateBg.strokeRoundedRect(-fateCardW / 2, -fateCardH / 2, fateCardW, fateCardH, 12);
    fateCard.add(fateBg);

    let modColor: string;
    let modLabel: string;
    if (modifier > 0) {
      modColor = "#44dd88";
      modLabel = `+${modifier}`;
    } else if (modifier < 0) {
      modColor = "#ff5555";
      modLabel = `${modifier}`;
    } else {
      modColor = "#888888";
      modLabel = "0";
    }

    const modText = this.add
      .text(0, 0, modLabel, {
        fontSize: "40px",
        fontFamily: "monospace",
        color: modColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    fateCard.add(modText);

    const targetX = this.playerView.x - 140;
    const targetY = this.playerView.y - 120;

    this.tweens.add({
      targets: fateCard,
      x: targetX,
      y: targetY,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: "Back.easeOut",
      onComplete: () => {
        this.time.delayedCall(300, () => {
          const modifiedAgility = Math.max(0, this.player.agility + this.inventory.agilityBonus + modifier + this.getPassiveAgilityModifier());

          this.tweens.add({
            targets: fateCard,
            x: this.playerView.x,
            y: this.playerView.y,
            scaleX: 0,
            scaleY: 0,
            duration: 300,
            ease: "Power2",
            onComplete: () => {
              fateCard.destroy();
              this.playerView.showTempAgility(modifiedAgility);

              this.time.delayedCall(300, () => {
                const lockDifficulty = trapCard.cardData.lockDifficulty ?? 0;
                const success = modifiedAgility >= lockDifficulty;

                if (success) {
                  this.sfx.play(SOUND_KEYS.clickUnlock);
                  this.trapCleanup(trapCard, modifier);
                } else {
                  this.sfx.playRandom(SOUND_GROUPS.squelching);
                  const trapDamage = trapCard.cardData.trapDamage ?? 0;
                  const afterDamage = () => {
                    // Fire onTrapTriggered abilities
                    const trigAbilities = this.collectAbilities("onTrapTriggered", trapCard.cardData);
                    this.executeOnTrapTriggeredAbilities(trapCard, trigAbilities, () => {
                      this.trapCleanup(trapCard, modifier);
                    });
                  };
                  if (trapDamage > 0) {
                    this.applyDamageWithArmour(trapDamage, afterDamage);
                  } else {
                    afterDamage();
                  }
                }
              });
            },
          });
        });
      },
    });
  }

  private trapCleanup(trapCard: Card, fateModifier: number): void {
    if (this.trapOverlay) {
      this.trapOverlay.destroy();
      this.trapOverlay = null;
    }
    if (this.disarmBtn) {
      this.disarmBtn.destroy();
      this.disarmBtn = null;
    }

    const cell = this.grid.findCard(trapCard);
    if (cell) this.grid.removeCard(cell.col, cell.row);
    this.updatePlayerStats();

    trapCard.resolve(() => {
      this.player.shuffleFateCardBack(fateModifier);

      // Restore alphas
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const gridCard = this.grid.getCardAt(c, r);
          if (gridCard) {
            gridCard.setAlpha(1);
            if (gridCard.guardedLoot) {
              gridCard.guardedLoot.setAlpha(1);
              gridCard.guardedLoot.setDepth(5);
              gridCard.guardedLoot.setInteractive();
            }
            const chestLootInfo = this.chestLoot.get(gridCard);
            if (chestLootInfo) chestLootInfo.cardBack.setAlpha(1);
          }
        }
      }
      this.gridBgGraphics.forEach(img => img.setAlpha(1));
      this.deckVisual.forEach(img => img.setAlpha(1));
      this.deckText.setAlpha(1);
      this.goldText.setAlpha(1);
      this.exploreBtn.setAlpha(1);
      this.levelIndicator.setAlpha(1);
      this.levelFlavorText.setAlpha(1);

      this.playerView.slideFateDeckDown(this);
      this.playerView.restoreAgility(this.player);

      this.isResolving = false;
      this.disarmingTrap = null;
      this.updateExploreButtonState();

      if (this.player.hp <= 0) {
        this.showGameOver();
      }
    });
  }

  private enterExchangerMode(card: Card): void {
    this.isResolving = true;
    this.exchangerCard = card;

    // Dim other grid cards
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard && gridCard !== card) {
          gridCard.setAlpha(0.3);
          if (gridCard.guardedLoot) {
            gridCard.guardedLoot.setAlpha(0.3);
            gridCard.guardedLoot.disableInteractive();
          }
          const chestLootInfo = this.chestLoot.get(gridCard);
          if (chestLootInfo) chestLootInfo.cardBack.setAlpha(0.3);
        }
      }
    }

    // Dim grid background, deck visual, HUD, explore button, level indicator
    this.gridBgGraphics.forEach(img => img.setAlpha(0.3));
    this.deckVisual.forEach(img => img.setAlpha(0.3));
    this.deckText.setAlpha(0.3);
    this.exploreBtn.setAlpha(0.3);
    this.levelIndicator.setAlpha(0.3);
    this.levelFlavorText.setAlpha(0.3);

    // Bring card to top
    card.setDepth(4500);

    // Create clickable overlay behind button (to cancel)
    this.exchangerOverlay = this.add.rectangle(
      GAME_W / 2,
      GAME_H / 2,
      GAME_W,
      GAME_H,
      0x000000,
      0.01
    );
    this.exchangerOverlay.setDepth(4000);
    this.exchangerOverlay.setInteractive();
    this.exchangerOverlay.on("pointerdown", () => this.exitExchangerMode());

    // Create OFFER button below exchanger card
    const btnW = 160;
    const btnH = 60;
    this.exchangerBtn = this.add.container(card.x, card.y + CARD_H / 2 + 48);
    this.exchangerBtn.setDepth(5000);

    const price = card.cardData.exchangePrice!;
    const canAfford = price.resource === "gold"
      ? this.player.gold >= price.amount
      : this.player.hp > price.amount;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xddaa22, 1);
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    btnBg.lineStyle(4, 0xffcc44, 0.8);
    btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    this.exchangerBtn.add(btnBg);

    const btnText = this.add
      .text(0, 0, "OFFER", {
        fontSize: "32px",
        fontFamily: "monospace",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.exchangerBtn.add(btnText);

    if (canAfford) {
      this.exchangerBtn.setSize(btnW, btnH);
      this.exchangerBtn.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, btnW, btnH),
        Phaser.Geom.Rectangle.Contains
      );

      this.exchangerBtn.on("pointerover", () => {
        btnBg.clear();
        btnBg.fillStyle(0xeebb33, 1);
        btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
        btnBg.lineStyle(4, 0xffcc44, 0.8);
        btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      });

      this.exchangerBtn.on("pointerout", () => {
        btnBg.clear();
        btnBg.fillStyle(0xddaa22, 1);
        btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
        btnBg.lineStyle(4, 0xffcc44, 0.8);
        btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      });

      this.exchangerBtn.on("pointerdown", () => {
        this.executeExchange(card);
      });
    } else {
      this.exchangerBtn.setAlpha(0.5);
    }
  }

  private exitExchangerMode(): void {
    if (this.exchangerOverlay) {
      this.exchangerOverlay.destroy();
      this.exchangerOverlay = null;
    }
    if (this.exchangerBtn) {
      this.exchangerBtn.destroy();
      this.exchangerBtn = null;
    }

    // Restore all grid card alphas, guarded loot, and chest loot
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard) {
          gridCard.setAlpha(1);
          if (gridCard.guardedLoot) {
            gridCard.guardedLoot.setAlpha(1);
            gridCard.guardedLoot.setDepth(5);
            gridCard.guardedLoot.setInteractive();
          }
          const chestLootInfo = this.chestLoot.get(gridCard);
          if (chestLootInfo) chestLootInfo.cardBack.setAlpha(1);
        }
      }
    }

    // Restore HUD alphas
    this.gridBgGraphics.forEach(img => img.setAlpha(1));
    this.deckVisual.forEach(img => img.setAlpha(1));
    this.deckText.setAlpha(1);
    this.exploreBtn.setAlpha(1);
    this.levelIndicator.setAlpha(1);
    this.levelFlavorText.setAlpha(1);

    // Reset card depth
    if (this.exchangerCard) {
      this.exchangerCard.setDepth(10);
    }

    this.isResolving = false;
    this.exchangerCard = null;
    this.updateExploreButtonState();
  }

  private executeExchange(card: Card): void {
    if (this.exchangerBtn) {
      this.exchangerBtn.disableInteractive();
      this.exchangerBtn.setDepth(500);
    }
    if (this.exchangerOverlay) this.exchangerOverlay.disableInteractive();

    const price = card.cardData.exchangePrice!;
    const reward = card.cardData.exchangeReward!;

    // Pay the price
    if (price.resource === "gold") {
      this.player.addGold(-price.amount);
    } else {
      this.player.takeDamage(price.amount);
    }

    // Apply reward
    if (reward.type === "fate") {
      this.player.fateDeck.push(reward.modifier);
      // Shuffle the fate deck
      for (let i = this.player.fateDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.player.fateDeck[i], this.player.fateDeck[j]] = [this.player.fateDeck[j], this.player.fateDeck[i]];
      }

      // Animate a fate card visual flying from the exchanger card into the fate deck
      const fateDeckPos = this.playerView.getFateDeckWorldPos();
      const fateCardW = 100;
      const fateCardH = 140;
      const fateCard = this.add.container(card.x, card.y);
      fateCard.setDepth(9000);
      fateCard.setScale(0.5);

      const fateBg = this.add.graphics();
      fateBg.fillStyle(0x1a1a2e, 1);
      fateBg.fillRoundedRect(-fateCardW / 2, -fateCardH / 2, fateCardW, fateCardH, 12);
      fateBg.lineStyle(2, 0x4444aa, 0.8);
      fateBg.strokeRoundedRect(-fateCardW / 2, -fateCardH / 2, fateCardW, fateCardH, 12);
      fateCard.add(fateBg);

      const modLabel = reward.modifier > 0 ? `+${reward.modifier}` : `${reward.modifier}`;
      const modColor = reward.modifier > 0 ? "#44dd88" : reward.modifier < 0 ? "#ff5555" : "#888888";
      const modText = this.add
        .text(0, 0, modLabel, {
          fontSize: "40px",
          fontFamily: "monospace",
          color: modColor,
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      fateCard.add(modText);

      this.tweens.add({
        targets: fateCard,
        x: fateDeckPos.x,
        y: fateDeckPos.y,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 600,
        ease: "Power2",
        onComplete: () => {
          fateCard.destroy();
          this.exchangerCleanup(card);
        },
      });
    } else {
      // Treasure reward — replace exchanger card with treasure card in the same cell
      const rewardCardData = getCard(reward.cardId);
      const cell = this.grid.findCard(card);
      const cellPos = cell ? { col: cell.col, row: cell.row } : null;

      if (cell) this.grid.removeCard(cell.col, cell.row);

      // Destroy overlay and button before card resolves
      if (this.exchangerOverlay) {
        this.exchangerOverlay.destroy();
        this.exchangerOverlay = null;
      }
      if (this.exchangerBtn) {
        this.exchangerBtn.destroy();
        this.exchangerBtn = null;
      }

      card.resolve(() => {
        // Restore alphas
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const gridCard = this.grid.getCardAt(c, r);
            if (gridCard) {
              gridCard.setAlpha(1);
              if (gridCard.guardedLoot) {
                gridCard.guardedLoot.setAlpha(1);
                gridCard.guardedLoot.setDepth(5);
                gridCard.guardedLoot.setInteractive();
              }
              const chestLootInfo = this.chestLoot.get(gridCard);
              if (chestLootInfo) chestLootInfo.cardBack.setAlpha(1);
            }
          }
        }
        this.gridBgGraphics.forEach(img => img.setAlpha(1));
        this.deckVisual.forEach(img => img.setAlpha(1));
        this.deckText.setAlpha(1);
        this.exploreBtn.setAlpha(1);
        this.levelIndicator.setAlpha(1);
        this.levelFlavorText.setAlpha(1);

        if (cellPos) {
          const targetPos = this.grid.worldPos(cellPos.col, cellPos.row);
          const lootCard = new Card(this, targetPos.x, targetPos.y, rewardCardData);
          lootCard.setScale(0, 1);
          this.grid.placeCard(cellPos.col, cellPos.row, lootCard);

          this.tweens.add({
            targets: lootCard,
            scaleX: 1,
            duration: 300,
            ease: "Back.easeOut",
            onComplete: () => {
              this.setupCardInteraction(lootCard);
              this.isResolving = false;
              this.exchangerCard = null;
              this.updateExploreButtonState();
            },
          });
        } else {
          this.isResolving = false;
          this.exchangerCard = null;
          this.updateExploreButtonState();
        }

        if (this.player.hp <= 0) {
          this.showGameOver();
        }
      });
      return;
    }
  }

  private exchangerCleanup(card: Card): void {
    if (this.exchangerOverlay) {
      this.exchangerOverlay.destroy();
      this.exchangerOverlay = null;
    }
    if (this.exchangerBtn) {
      this.exchangerBtn.destroy();
      this.exchangerBtn = null;
    }

    const cell = this.grid.findCard(card);
    if (cell) this.grid.removeCard(cell.col, cell.row);

    card.resolve(() => {
      // Restore alphas
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const gridCard = this.grid.getCardAt(c, r);
          if (gridCard) {
            gridCard.setAlpha(1);
            if (gridCard.guardedLoot) {
              gridCard.guardedLoot.setAlpha(1);
              gridCard.guardedLoot.setDepth(5);
              gridCard.guardedLoot.setInteractive();
            }
            const chestLootInfo = this.chestLoot.get(gridCard);
            if (chestLootInfo) chestLootInfo.cardBack.setAlpha(1);
          }
        }
      }
      this.gridBgGraphics.forEach(img => img.setAlpha(1));
      this.deckVisual.forEach(img => img.setAlpha(1));
      this.deckText.setAlpha(1);
      this.exploreBtn.setAlpha(1);
      this.levelIndicator.setAlpha(1);
      this.levelFlavorText.setAlpha(1);

      this.isResolving = false;
      this.exchangerCard = null;
      this.updateExploreButtonState();

      if (this.player.hp <= 0) {
        this.showGameOver();
      }
    });
  }

  private hasTrapOnGrid(): boolean {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const card = this.grid.getCardAt(c, r);
        if (card && card.cardData.type === CardType.Trap) {
          return true;
        }
      }
    }
    return false;
  }

  private isExploreBlocked(): boolean {
    return this.deck.isEmpty || this.hasTrapOnGrid();
  }

  private updateExploreButtonState(): void {
    if (this.isExploreBlocked()) {
      this.disableExploreButton();
    } else {
      this.enableExploreButton();
    }
  }

  private createCardBack(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const img = this.add.image(0, 0, "card_back");
    container.add(img);
    return container;
  }

  private setupDoorInteraction(doorCard: Card): void {
    doorCard.on("pointerover", () => {
      if (!this.isResolving && !this.isDragging) doorCard.setHighlight(true);
    });
    doorCard.on("pointerout", () => {
      doorCard.setHighlight(false);
    });
    doorCard.on("pointerdown", () => {
      if (this.isResolving) return;
      // Shake the door as a hint that a key is needed
      this.tweens.add({
        targets: doorCard,
        x: doorCard.x + 6,
        duration: 50,
        yoyo: true,
        repeat: 2,
      });
    });
  }

  private findDoorOnGrid(): Card | null {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const card = this.grid.getCardAt(c, r);
        if (card && card.cardData.type === CardType.Door) {
          return card;
        }
      }
    }
    return null;
  }

  private openDoor(doorCard: Card): void {
    this.isResolving = true;
    doorCard.markDoorOpened();

    this.time.delayedCall(600, () => {
      // Level transition — 4 sequential footstep sounds
      this.sfx.playRandomSequential(SOUND_GROUPS.stoneWalk, 4, 300);

      // Clear all grid cards except the door
      this.clearGrid(() => {
        if (this.currentLevelIndex >= this.dungeonLevels.length - 1) {
          // Remove door before showing win screen
          const cell = this.grid.findCard(doorCard);
          if (cell) this.grid.removeCard(cell.col, cell.row);
          doorCard.destroy();
          this.showWinScreen();
          return;
        }

        this.currentLevelIndex++;
        this.vignetteFX.setLevel(this.currentLevelIndex);
        this.tintBackground();
        const nextLevel = this.dungeonLevels[this.currentLevelIndex];

        // Animate card-back sprites from door to deck, then remove door
        this.animateCardsToDeck(doorCard.x, doorCard.y, () => {
          // Build next level's cards and merge into current deck
          const tempDeck = Deck.fromDungeonLevel(nextLevel, this.currentLevelIndex);
          const newCards = tempDeck.draw(tempDeck.remaining);
          this.deck.mergeCards(newCards);
          this.deck.replaceLoot(tempDeck.drainLoot());

          this.currentLevelKey = getCard(nextLevel.key);

          // Update HUD
          this.updateHUD();
          this.updateDeckVisual();
          this.updateLevelIndicator();

          // Now remove the door with a resolve animation
          const cell = this.grid.findCard(doorCard);
          if (cell) this.grid.removeCard(cell.col, cell.row);
          doorCard.resolve(() => {
            // Re-enable explore button
            this.enableExploreButton();

            this.isResolving = false;
            this.drawAndPlaceCards(3);
          });
        });
      }, doorCard);
    });
  }

  private animateCardsToDeck(
    fromX: number,
    fromY: number,
    onComplete: () => void
  ): void {
    const cardCount = 5;
    const staggerDelay = 100;
    const duration = 550;
    const targetX = 350;
    const targetY = 200;
    let completed = 0;

    for (let i = 0; i < cardCount; i++) {
      const cardSprite = this.add.image(fromX, fromY, "card_back");
      cardSprite.setDepth(800);

      this.time.delayedCall(i * staggerDelay, () => {
        this.tweens.add({
          targets: cardSprite,
          x: targetX,
          y: targetY,
          duration,
          ease: "Power2",
          onComplete: () => {
            cardSprite.destroy();
            completed++;
            if (completed === cardCount) {
              onComplete();
            }
          },
        });
      });
    }
  }

  private clearGrid(onComplete: () => void, skip?: Card): void {
    const cards = this.grid.getAllCards();
    const toDestroy: Phaser.GameObjects.GameObject[] = [];

    for (const card of cards) {
      if (card === skip) continue;
      toDestroy.push(card);
      if (card.guardedLoot) {
        toDestroy.push(card.guardedLoot);
      }
      const chestInfo = this.chestLoot.get(card);
      if (chestInfo) {
        toDestroy.push(chestInfo.cardBack);
      }
    }

    // Clear tracking maps
    this.guardedByMonster.clear();
    this.chestLoot.clear();

    if (toDestroy.length === 0) {
      onComplete();
      return;
    }

    let completed = 0;
    toDestroy.forEach((obj, i) => {
      this.time.delayedCall(i * 80, () => {
        this.tweens.add({
          targets: obj,
          alpha: 0,
          scaleX: 0,
          scaleY: 0,
          duration: 300,
          ease: "Power2",
          onComplete: () => {
            obj.destroy();
            completed++;
            if (completed === toDestroy.length) {
              onComplete();
            }
          },
        });
      });
    });
  }

  private showWinScreen(): void {
    new WinScreen(this, this.player, this.inventory);
  }

  private showGameOver(): void {
    new GameOverScreen(this);
  }

  private enableExploreButton(): void {
    this.drawExploreButtonBg(0x3355aa);
    this.exploreBtnText.setText("EXPLORE");
    this.exploreBtnText.setColor("#ffffff");
  }

  private disableExploreButton(): void {
    this.drawExploreButtonBg(0x333344);
    this.exploreBtnText.setText(this.hasTrapOnGrid() ? "BLOCKED" : "EMPTY");
    this.exploreBtnText.setColor("#666666");
  }
}
