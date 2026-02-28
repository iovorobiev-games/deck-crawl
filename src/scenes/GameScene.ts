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
import { lootPool } from "../data/deckConfig";
import { dungeonConfig, DungeonLevel } from "../data/dungeonConfig";
import { getCard } from "../data/cardRegistry";
import { getAbility } from "../data/abilityRegistry";
import { WinScreen } from "../entities/WinScreen";

const GAME_W = 1920;
const GAME_H = 1080;
const TREASURE_OFFSET_Y = 56;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private deck!: Deck;
  private grid!: Grid;
  private deckText!: Phaser.GameObjects.Text;
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
  private chestLoot: Map<Card, { lootData: CardData; cardBack: Phaser.GameObjects.Container }> = new Map();
  private currentLevelIndex = 0;
  private dungeonLevels!: DungeonLevel[];
  private currentLevelKey: CardData | null = null;
  private levelIndicator!: Phaser.GameObjects.Text;
  private levelFlavorText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    this.add.image(GAME_W / 2, GAME_H / 2, "background");

    this.player = new Player(10);
    this.grid = new Grid(GAME_W, GAME_H);

    this.dungeonLevels = dungeonConfig.levels;
    this.currentLevelIndex = 0;
    this.initLevel(0);

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
  }

  private createHUD(): void {
    this.deckText = this.add.text(0, 320, "", {
      fontSize: "28px",
      fontFamily: "monospace",
      color: "#aaaacc",
    }).setOrigin(0.5, 0);
    this.deckGroup.add(this.deckText);

    this.updateHUD();
  }

  private updateHUD(): void {
    this.deckText.setText(`Deck: ${this.deck.remaining} cards`);
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
    this.deck = Deck.fromDungeonLevel(level);
    this.currentLevelKey = getCard(level.key);
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
    this.playerView.updateStats(this.player, this.inventory.powerBonus);
  }

  private onExplore(): void {
    if (this.deck.isEmpty || this.isResolving || this.hasTrapOnGrid()) return;
    this.drawAndPlaceCards(3);
  }

  private drawAndPlaceCards(count: number): void {
    const emptySlots = this.grid.getEmptySlots();
    if (emptySlots.length === 0) return;

    const slotsToFill = Math.min(count, emptySlots.length);
    const drawn = this.deck.draw(slotsToFill);

    // Shuffle empty slots for random placement
    for (let i = emptySlots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [emptySlots[i], emptySlots[j]] = [emptySlots[j], emptySlots[i]];
    }

    // Pre-plan: determine which monsters claim existing loot or generate new loot
    const claimedSet = new Set<Card>();
    interface PlacementPlan {
      cardData: CardData;
      slot: { col: number; row: number };
      existingLoot?: Card;       // existing grid loot to claim
      generatedLoot?: CardData;  // new loot to generate
    }
    const plans: PlacementPlan[] = [];

    for (let i = 0; i < drawn.length; i++) {
      const cardData = drawn[i];
      const slot = emptySlots[i];
      const plan: PlacementPlan = { cardData, slot };

      if (cardData.type === CardType.Monster) {
        if (cardData.isBoss && this.currentLevelKey) {
          plan.generatedLoot = this.currentLevelKey;
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
            plan.generatedLoot = this.pickRandomLoot();
          }
        }
      }

      plans.push(plan);
    }

    // Execute with staggered reveals
    plans.forEach((plan, index) => {
      this.time.delayedCall(index * 150, () => {
        const pos = this.grid.worldPos(plan.slot.col, plan.slot.row);

        if (plan.cardData.type === CardType.Monster) {
          let lootCard: Card;

          if (plan.existingLoot) {
            // Claim existing loot card: remove from grid, reposition as peek above monster
            lootCard = plan.existingLoot;
            const lootCell = this.grid.findCard(lootCard);
            if (lootCell) this.grid.removeCard(lootCell.col, lootCell.row);
            lootCard.setPosition(pos.x, pos.y - TREASURE_OFFSET_Y);
            lootCard.setDepth(5);
          } else {
            // Generate new loot card at peek position above monster
            lootCard = new Card(this, pos.x, pos.y - TREASURE_OFFSET_Y, plan.generatedLoot!);
            lootCard.setDepth(5);
            lootCard.reveal();
          }

          // Create monster on top
          const monsterCard = new Card(this, pos.x, pos.y, plan.cardData);
          monsterCard.setDepth(10);
          this.grid.placeCard(plan.slot.col, plan.slot.row, monsterCard);
          monsterCard.reveal();

          // Link monster and loot
          monsterCard.guardedLoot = lootCard;
          this.guardedByMonster.set(lootCard, monsterCard);

          this.setupGuardedLootInteraction(lootCard, monsterCard);
          this.setupCardInteraction(monsterCard);
        } else if (plan.cardData.type === CardType.Chest) {
          // Create face-down loot card back behind chest
          const lootData = this.pickRandomLoot();
          const cardBack = this.createCardBack(pos.x, pos.y - TREASURE_OFFSET_Y);
          cardBack.setDepth(5);

          const chestCard = new Card(this, pos.x, pos.y, plan.cardData);
          chestCard.setDepth(10);
          this.grid.placeCard(plan.slot.col, plan.slot.row, chestCard);
          chestCard.reveal();

          this.chestLoot.set(chestCard, { lootData, cardBack });
          this.setupCardInteraction(chestCard);
        } else if (plan.cardData.type === CardType.Door) {
          const doorCard = new Card(this, pos.x, pos.y, plan.cardData);
          this.grid.placeCard(plan.slot.col, plan.slot.row, doorCard);
          doorCard.reveal();
          this.setupDoorInteraction(doorCard);
        } else {
          const card = new Card(this, pos.x, pos.y, plan.cardData);
          this.grid.placeCard(plan.slot.col, plan.slot.row, card);
          card.reveal();
          this.setupCardInteraction(card);
          if (plan.cardData.type === CardType.Trap) {
            this.updateExploreButtonState();
          }
        }
      });
    });

    this.updateHUD();
    this.updateDeckVisual();
    this.updateExploreButtonState();
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

  private pickRandomLoot(): CardData {
    const id = lootPool[Math.floor(Math.random() * lootPool.length)];
    return getCard(id);
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
    // Clear guard links
    this.guardedByMonster.delete(lootCard);

    // Remove all existing listeners from guarded interaction
    lootCard.removeAllListeners();

    const targetPos = this.grid.worldPos(cellPos.col, cellPos.row);
    lootCard.setAlpha(1);

    this.tweens.add({
      targets: lootCard,
      x: targetPos.x,
      y: targetPos.y,
      duration: 400,
      ease: "Back.easeOut",
      onComplete: () => {
        lootCard.setDepth(0);
        lootCard.restoreFullHitArea();
        this.grid.placeCard(cellPos.col, cellPos.row, lootCard);
        this.setupCardInteraction(lootCard);
      },
    });
  }

  private isEquippable(card: Card): boolean {
    return (
      (card.cardData.type === CardType.Treasure ||
        card.cardData.type === CardType.Potion) &&
      !!card.cardData.slot
    );
  }

  private hasDragAbility(card: Card): boolean {
    if (!card.cardData.abilities) return false;
    return card.cardData.abilities.some((a) => {
      const def = getAbility(a.abilityId);
      return def.trigger === "dragOnPlayerPortrait";
    });
  }

  private isDraggable(card: Card): boolean {
    return this.isEquippable(card) || this.hasDragAbility(card);
  }

  private setupCardInteraction(card: Card): void {
    card.on("pointerover", () => {
      if (!this.isResolving && !this.isDragging) card.setHighlight(true);
    });
    card.on("pointerout", () => {
      card.setHighlight(false);
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

    const cell = this.grid.findCard(card);
    if (cell) {
      this.dragOrigGridPos = { col: cell.col, row: cell.row };
      this.grid.removeCard(cell.col, cell.row);
    }

    card.setDepth(500);
    card.setScale(0.85);

    // Show slot highlights immediately
    for (const def of SLOT_DEFS) {
      this.inventoryView.setSlotHighlight(
        def.name,
        this.inventory.canEquip(def.name, card.cardData) ? "valid" : "invalid"
      );
    }

    const onMove = (pointer: Phaser.Input.Pointer) => {
      const world = this.toWorldCoords(pointer);
      card.setPosition(world.x, world.y);

      // Update slot highlights — bright when hovered, dim otherwise
      const hit = this.inventoryView.getSlotAtPoint(world.x, world.y);
      for (const def of SLOT_DEFS) {
        const canEquip = this.inventory.canEquip(def.name, card.cardData);
        if (hit === def.name) {
          this.inventoryView.setSlotHighlight(def.name, canEquip ? "valid" : "invalid");
        } else {
          this.inventoryView.setSlotHighlight(def.name, canEquip ? "valid_dim" : "invalid_dim");
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

      // Highlight portrait if dragging a card with drag ability
      if (this.hasDragAbility(card)) {
        if (this.playerView.isPointOver(world.x, world.y)) {
          const ability = card.cardData.abilities!.find((a) => {
            const def = getAbility(a.abilityId);
            return def.trigger === "dragOnPlayerPortrait";
          })!;
          this.playerView.showDropHighlight(ability.params.amount);
        } else {
          this.playerView.hideDropHighlight();
        }
      }
    };

    const onUp = (pointer: Phaser.Input.Pointer) => {
      this.input.off("pointermove", onMove);
      this.input.off("pointerup", onUp);

      const world = this.toWorldCoords(pointer);

      // Check if card with drag ability dropped on portrait
      if (this.hasDragAbility(card) && this.playerView.isPointOver(world.x, world.y)) {
        this.playerView.hideDropHighlight();
        this.inventoryView.clearAllHighlights();
        this.executeAbility(card);
        return;
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

      if (slotName && this.inventory.canEquip(slotName, card.cardData)) {
        // Equip item
        const previous = this.inventory.equip(slotName, card.cardData);
        if (previous) {
          const slotPos = this.inventoryView.getSlotWorldPos(slotName);
          if (slotPos) {
            this.inventoryView.playDissolveAt(this, slotPos.x, slotPos.y, previous);
          }
        }
        card.disableInteractive();
        card.resolve(() => {
          this.finishDrag();
        });
      } else {
        // Snap back to grid
        this.snapBackToGrid(card);
      }

      this.inventoryView.clearAllHighlights();
    };

    this.input.on("pointermove", onMove);
    this.input.on("pointerup", onUp);
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

  private finishDrag(): void {
    this.dragCard = null;
    this.dragStartPos = null;
    this.dragOrigGridPos = null;
    this.isDragging = false;
    this.isResolving = false;
  }

  private executeAbility(card: Card): void {
    const ability = card.cardData.abilities?.find((a) => {
      const def = getAbility(a.abilityId);
      return def.trigger === "dragOnPlayerPortrait";
    });
    if (!ability) return;

    const def = getAbility(ability.abilityId);
    switch (def.effect) {
      case "healPlayer":
        this.player.heal(ability.params.amount);
        break;
    }

    card.disableInteractive();
    card.resolve(() => {
      this.finishDrag();
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
            ghost.setDepth(500);
            this.add.existing(ghost);
            this.inventoryView.setSlotContentAlpha(def.name, 0.3);
            // Show initial slot highlights
            for (const slotDef of SLOT_DEFS) {
              const canEquip = this.inventory.canEquip(slotDef.name, item);
              this.inventoryView.setSlotHighlight(slotDef.name, canEquip ? "valid_dim" : "invalid_dim");
            }
          }

          if (dragging && ghost) {
            const world = this.toWorldCoords(p);
            ghost.setPosition(world.x, world.y);
            // Update highlights — bright when hovered, dim otherwise
            const hit = this.inventoryView.getSlotAtPoint(world.x, world.y);
            for (const slotDef of SLOT_DEFS) {
              const canEquip = this.inventory.canEquip(slotDef.name, item);
              if (hit === slotDef.name) {
                this.inventoryView.setSlotHighlight(slotDef.name, canEquip ? "valid" : "invalid");
              } else {
                this.inventoryView.setSlotHighlight(slotDef.name, canEquip ? "valid_dim" : "invalid_dim");
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

          const overSlot = this.inventoryView.getSlotAtPoint(world.x, world.y);

          this.inventoryView.clearAllHighlights();

          if (overSlot === def.name) {
            // Dropped back on same slot — cancel
            ghost.destroy();
            this.inventoryView.setSlotContentAlpha(def.name, 1);
          } else if (overSlot && this.inventory.canEquip(overSlot, item)) {
            // Dropped on a compatible slot — move item
            ghost.destroy();
            this.inventoryView.setSlotContentAlpha(def.name, 1);
            const displaced = this.inventory.unequip(def.name);
            const previous = this.inventory.equip(overSlot, item);
            if (previous) {
              const slotPos = this.inventoryView.getSlotWorldPos(overSlot);
              if (slotPos) {
                this.inventoryView.playDissolveAt(this, slotPos.x, slotPos.y, previous);
              }
            }
          } else {
            // Dropped elsewhere — discard
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

    this.isResolving = true;
    this.grid.removeCard(cell.col, cell.row);

    card.resolve(() => {
      this.isResolving = false;
    });
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
    this.exploreBtn.setAlpha(0.3);
    this.levelIndicator.setAlpha(0.3);
    this.levelFlavorText.setAlpha(0.3);

    // Bring monster to top
    card.setDepth(100);

    // Create clickable overlay behind fight button (to cancel combat)
    this.combatOverlay = this.add.rectangle(
      GAME_W / 2,
      GAME_H / 2,
      GAME_W,
      GAME_H,
      0x000000,
      0.01
    );
    this.combatOverlay.setDepth(50);
    this.combatOverlay.setInteractive();
    this.combatOverlay.on("pointerdown", () => this.exitCombatMode());

    // Create FIGHT button below the monster card
    const btnW = 160;
    const btnH = 60;
    this.fightBtn = this.add.container(card.x, card.y + CARD_H / 2 + 48);
    this.fightBtn.setDepth(110);

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
    if (this.fightBtn) this.fightBtn.disableInteractive();
    if (this.combatOverlay) this.combatOverlay.disableInteractive();

    // Step 1: Draw & reveal fate card
    const modifier = this.player.drawFateCard();
    const fateDeckPos = this.playerView.getFateDeckWorldPos();

    // Create fate card visual
    const fateCardW = 100;
    const fateCardH = 140;
    const fateCard = this.add.container(fateDeckPos.x, fateDeckPos.y);
    fateCard.setDepth(200);
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
          const modifiedPower = Math.max(0, this.player.power + this.inventory.powerBonus + modifier);

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
                              this.monsterCounterattack(monsterCard, origX, origY, modifier);
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
    playerOrigX: number,
    playerOrigY: number,
    fateModifier: number
  ): void {
    const monsterOrigX = monsterCard.x;
    const monsterOrigY = monsterCard.y;
    const attackX = monsterOrigX + (playerOrigX - monsterOrigX) * 0.6;
    const attackY = monsterOrigY + (playerOrigY - monsterOrigY) * 0.6;

    this.tweens.add({
      targets: monsterCard,
      x: attackX,
      y: attackY,
      duration: 250,
      ease: "Power2",
      onComplete: () => {
        // Hit player
        this.player.takeDamage(monsterCard.cardData.value);

        // Flash player portrait
        this.tweens.add({
          targets: this.playerView,
          alpha: 0.3,
          duration: 80,
          yoyo: true,
          repeat: 2,
          onComplete: () => {
            // Return monster to position
            this.tweens.add({
              targets: monsterCard,
              x: monsterOrigX,
              y: monsterOrigY,
              duration: 250,
              ease: "Power2",
              onComplete: () => {
                this.combatCleanup(monsterCard, fateModifier);
              },
            });
          },
        });
      },
    });
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
      this.exploreBtn.setAlpha(1);
      this.levelIndicator.setAlpha(1);
      this.levelFlavorText.setAlpha(1);

      // Slide fate deck down and restore power display
      this.playerView.slideFateDeckDown(this);
      this.playerView.restorePower(this.player, this.inventory.powerBonus);

      // Free the guarded loot into the now-empty grid slot
      if (guardedLoot && cellPos) {
        this.freeGuardedLoot(guardedLoot, cellPos);
      }

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
    this.exploreBtn.setAlpha(0.3);
    this.levelIndicator.setAlpha(0.3);
    this.levelFlavorText.setAlpha(0.3);

    // Bring chest to top
    card.setDepth(100);

    // Create clickable overlay behind crack button (to cancel)
    this.chestOverlay = this.add.rectangle(
      GAME_W / 2,
      GAME_H / 2,
      GAME_W,
      GAME_H,
      0x000000,
      0.01
    );
    this.chestOverlay.setDepth(50);
    this.chestOverlay.setInteractive();
    this.chestOverlay.on("pointerdown", () => this.exitChestMode());

    // Create CRACK button below chest
    const btnW = 160;
    const btnH = 60;
    this.crackBtn = this.add.container(card.x, card.y + CARD_H / 2 + 48);
    this.crackBtn.setDepth(110);

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
    if (this.crackBtn) this.crackBtn.disableInteractive();
    if (this.chestOverlay) this.chestOverlay.disableInteractive();

    const modifier = this.player.drawFateCard();
    const fateDeckPos = this.playerView.getFateDeckWorldPos();

    // Create fate card visual
    const fateCardW = 100;
    const fateCardH = 140;
    const fateCard = this.add.container(fateDeckPos.x, fateDeckPos.y);
    fateCard.setDepth(200);
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
          const modifiedAgility = Math.max(0, this.player.agility + modifier);

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
                  this.chestCleanup(chestCard, modifier);
                } else {
                  const trapDamage = chestCard.cardData.trapDamage ?? 0;
                  if (trapDamage > 0) {
                    this.player.takeDamage(trapDamage);
                    // Flash player portrait
                    this.tweens.add({
                      targets: this.playerView,
                      alpha: 0.3,
                      duration: 80,
                      yoyo: true,
                      repeat: 2,
                      onComplete: () => {
                        this.chestCleanup(chestCard, modifier);
                      },
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
    this.exploreBtn.setAlpha(0.3);
    this.levelIndicator.setAlpha(0.3);
    this.levelFlavorText.setAlpha(0.3);

    // Bring trap to top
    card.setDepth(100);

    // Create clickable overlay behind disarm button (to cancel)
    this.trapOverlay = this.add.rectangle(
      GAME_W / 2,
      GAME_H / 2,
      GAME_W,
      GAME_H,
      0x000000,
      0.01
    );
    this.trapOverlay.setDepth(50);
    this.trapOverlay.setInteractive();
    this.trapOverlay.on("pointerdown", () => this.exitTrapMode());

    // Create DISARM button below trap
    const btnW = 160;
    const btnH = 60;
    this.disarmBtn = this.add.container(card.x, card.y + CARD_H / 2 + 48);
    this.disarmBtn.setDepth(110);

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
    if (this.disarmBtn) this.disarmBtn.disableInteractive();
    if (this.trapOverlay) this.trapOverlay.disableInteractive();

    // Reuse the same fate card + agility check flow as chest cracking
    const modifier = this.player.drawFateCard();
    const fateDeckPos = this.playerView.getFateDeckWorldPos();

    const fateCardW = 100;
    const fateCardH = 140;
    const fateCard = this.add.container(fateDeckPos.x, fateDeckPos.y);
    fateCard.setDepth(200);
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
          const modifiedAgility = Math.max(0, this.player.agility + modifier);

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
                  this.trapCleanup(trapCard, modifier);
                } else {
                  const trapDamage = trapCard.cardData.trapDamage ?? 0;
                  if (trapDamage > 0) {
                    this.player.takeDamage(trapDamage);
                    this.tweens.add({
                      targets: this.playerView,
                      alpha: 0.3,
                      duration: 80,
                      yoyo: true,
                      repeat: 2,
                      onComplete: () => {
                        this.trapCleanup(trapCard, modifier);
                      },
                    });
                  } else {
                    this.trapCleanup(trapCard, modifier);
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
    const gfx = this.add.graphics();
    gfx.fillStyle(0x2a2a4e, 1);
    gfx.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 16);
    gfx.lineStyle(2, 0x4444aa, 0.8);
    gfx.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 16);
    gfx.lineStyle(2, 0x5555bb, 0.5);
    gfx.strokeRect(-CARD_W / 2 + 24, -CARD_H / 2 + 30, CARD_W - 48, CARD_H - 60);
    container.add(gfx);

    const questionMark = this.add
      .text(0, 0, "?", {
        fontSize: "48px",
        fontFamily: "monospace",
        color: "#5555bb",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    container.add(questionMark);

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
      const cell = this.grid.findCard(doorCard);
      if (cell) this.grid.removeCard(cell.col, cell.row);
      doorCard.destroy();

      this.clearGrid(() => {
        if (this.currentLevelIndex >= this.dungeonLevels.length - 1) {
          this.showWinScreen();
          return;
        }

        this.currentLevelIndex++;
        const nextLevel = this.dungeonLevels[this.currentLevelIndex];

        // Build next level's cards and merge into current deck
        const tempDeck = Deck.fromDungeonLevel(nextLevel);
        const newCards = tempDeck.draw(tempDeck.remaining);
        this.deck.mergeCards(newCards);

        this.currentLevelKey = getCard(nextLevel.key);

        // Update HUD
        this.updateHUD();
        this.updateDeckVisual();
        this.updateLevelIndicator();

        // Re-enable explore button
        this.enableExploreButton();

        this.isResolving = false;
        this.drawAndPlaceCards(3);
      });
    });
  }

  private clearGrid(onComplete: () => void): void {
    const cards = this.grid.getAllCards();
    const toDestroy: Phaser.GameObjects.GameObject[] = [...cards];

    // Collect associated objects
    for (const card of cards) {
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
