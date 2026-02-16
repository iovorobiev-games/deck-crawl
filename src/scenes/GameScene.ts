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
import { CardType } from "../entities/CardData";
import { deckConfig } from "../data/deckConfig";

const GAME_W = 960;
const GAME_H = 540;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private deck!: Deck;
  private grid!: Grid;
  private deckText!: Phaser.GameObjects.Text;
  private exploreBtn!: Phaser.GameObjects.Container;
  private exploreBtnBg!: Phaser.GameObjects.Graphics;
  private exploreBtnText!: Phaser.GameObjects.Text;
  private deckVisual!: Phaser.GameObjects.Graphics;
  private playerView!: PlayerView;
  private fateDeckPopup: FateDeckPopup | null = null;
  private isResolving = false;
  private combatMonster: Card | null = null;
  private combatOverlay: Phaser.GameObjects.Rectangle | null = null;
  private fightBtn: Phaser.GameObjects.Container | null = null;
  private gridBgGraphics!: Phaser.GameObjects.Graphics;
  private inventory!: Inventory;
  private inventoryView!: InventoryView;
  private dragCard: Card | null = null;
  private dragStartPos: { x: number; y: number } | null = null;
  private dragOrigGridPos: { col: number; row: number } | null = null;
  private isDragging = false;

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x0e0e1a);

    this.player = new Player(10);
    this.deck = new Deck(deckConfig);
    this.grid = new Grid(GAME_W, GAME_H);

    this.inventory = new Inventory();

    this.createHUD();
    this.createGridBackground();
    this.createDeckVisual();
    this.createExploreButton();
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
    this.deckText = this.add.text(90, 44, "", {
      fontSize: "14px",
      fontFamily: "monospace",
      color: "#aaaacc",
    });

    this.updateHUD();
  }

  private updateHUD(): void {
    this.deckText.setText(`Deck: ${this.deck.remaining} cards`);
  }

  private createGridBackground(): void {
    const gfx = this.add.graphics();
    this.gridBgGraphics = gfx;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const pos = this.grid.worldPos(c, r);
        gfx.fillStyle(0x1a1a2e, 0.3);
        gfx.fillRoundedRect(
          pos.x - CARD_W / 2,
          pos.y - CARD_H / 2,
          CARD_W,
          CARD_H,
          8
        );
        gfx.lineStyle(1, 0x333355, 0.5);
        gfx.strokeRoundedRect(
          pos.x - CARD_W / 2,
          pos.y - CARD_H / 2,
          CARD_W,
          CARD_H,
          8
        );
      }
    }
  }

  private createDeckVisual(): void {
    this.deckVisual = this.add.graphics();
    this.updateDeckVisual();
  }

  private updateDeckVisual(): void {
    this.deckVisual.clear();
    if (this.deck.isEmpty) return;

    const baseX = 16;
    const baseY = 16;
    // Stacked card backs
    const layers = Math.min(3, Math.ceil(this.deck.remaining / 5));
    for (let i = 0; i < layers; i++) {
      const offset = i * 2;
      this.deckVisual.fillStyle(0x2a2a4e, 1);
      this.deckVisual.fillRoundedRect(baseX + offset, baseY + offset, 50, 70, 6);
      this.deckVisual.lineStyle(1, 0x4444aa, 0.8);
      this.deckVisual.strokeRoundedRect(baseX + offset, baseY + offset, 50, 70, 6);
    }
    // Pattern on top card
    this.deckVisual.lineStyle(1, 0x5555bb, 0.5);
    const topOff = (layers - 1) * 2;
    this.deckVisual.strokeRect(baseX + topOff + 8, baseY + topOff + 10, 34, 50);
  }

  private createExploreButton(): void {
    const btnX = 40;
    const btnY = 110;

    this.exploreBtn = this.add.container(btnX, btnY);

    this.exploreBtnBg = this.add.graphics();
    this.drawExploreButtonBg(0x3355aa);
    this.exploreBtn.add(this.exploreBtnBg);

    this.exploreBtnText = this.add.text(0, 0, "EXPLORE", {
      fontSize: "14px",
      fontFamily: "monospace",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.exploreBtn.add(this.exploreBtnText);

    this.exploreBtn.setSize(70, 28);
    this.exploreBtn.setInteractive(
      new Phaser.Geom.Rectangle(-35, -14, 70, 28),
      Phaser.Geom.Rectangle.Contains
    );

    this.exploreBtn.on("pointerover", () => {
      if (!this.deck.isEmpty) this.drawExploreButtonBg(0x4466cc);
    });
    this.exploreBtn.on("pointerout", () => {
      this.drawExploreButtonBg(this.deck.isEmpty ? 0x333344 : 0x3355aa);
    });
    this.exploreBtn.on("pointerdown", () => this.onExplore());
  }

  private drawExploreButtonBg(color: number): void {
    this.exploreBtnBg.clear();
    this.exploreBtnBg.fillStyle(color, 1);
    this.exploreBtnBg.fillRoundedRect(-35, -14, 70, 28, 6);
    this.exploreBtnBg.lineStyle(1, 0x6688ee, 0.6);
    this.exploreBtnBg.strokeRoundedRect(-35, -14, 70, 28, 6);
  }

  private createPlayerView(): void {
    this.playerView = new PlayerView(this, GAME_W / 2, 475);
    this.playerView.updateStats(this.player);

    this.playerView.on("pointerdown", () => {
      if (this.fateDeckPopup) return;
      this.fateDeckPopup = new FateDeckPopup(
        this,
        GAME_W / 2,
        370,
        this.player.fateDeckCards
      );
      this.fateDeckPopup.once("destroy", () => {
        this.fateDeckPopup = null;
      });
    });
  }

  private updatePlayerStats(): void {
    this.playerView.updateStats(this.player, this.inventory.powerBonus);
  }

  private onExplore(): void {
    if (this.deck.isEmpty || this.isResolving) return;
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

    drawn.forEach((cardData, index) => {
      const slot = emptySlots[index];
      const pos = this.grid.worldPos(slot.col, slot.row);

      // Stagger reveal
      this.time.delayedCall(index * 150, () => {
        const card = new Card(this, pos.x, pos.y, cardData);
        this.grid.placeCard(slot.col, slot.row, card);
        card.reveal();
        this.setupCardInteraction(card);
      });
    });

    this.updateHUD();
    this.updateDeckVisual();

    if (this.deck.isEmpty) {
      this.disableExploreButton();
    }
  }

  private isEquippable(card: Card): boolean {
    return (
      (card.cardData.type === CardType.Treasure ||
        card.cardData.type === CardType.Potion) &&
      !!card.cardData.slot
    );
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
      if (this.isEquippable(card)) {
        this.dragStartPos = { x: pointer.x, y: pointer.y };
        this.dragCard = card;

        // Use scene-level listeners for drag detection (card pointermove
        // only fires while pointer is over the card's hit area)
        const onMoveDetect = (p: Phaser.Input.Pointer) => {
          if (!this.dragStartPos || this.isDragging) return;
          const dx = p.x - this.dragStartPos.x;
          const dy = p.y - this.dragStartPos.y;
          if (Math.sqrt(dx * dx + dy * dy) > 8) {
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
    };

    const onUp = (pointer: Phaser.Input.Pointer) => {
      this.input.off("pointermove", onMove);
      this.input.off("pointerup", onUp);

      const world = this.toWorldCoords(pointer);
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

          if (!dragging && Math.sqrt(dx * dx + dy * dy) > 12) {
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
          }
        };
        const onUp = (p: Phaser.Input.Pointer) => {
          this.input.off("pointermove", onMove);
          this.input.off("pointerup", onUp);
          if (!dragging || !ghost) return;

          const world = this.toWorldCoords(p);
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
        }
      }
    }

    // Dim grid background, deck visual, HUD, explore button
    this.gridBgGraphics.setAlpha(0.3);
    this.deckVisual.setAlpha(0.3);
    this.deckText.setAlpha(0.3);
    this.exploreBtn.setAlpha(0.3);

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
    const btnW = 80;
    const btnH = 30;
    this.fightBtn = this.add.container(card.x, card.y + CARD_H / 2 + 24);
    this.fightBtn.setDepth(110);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xcc3333, 1);
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
    btnBg.lineStyle(2, 0xff5555, 0.8);
    btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
    this.fightBtn.add(btnBg);

    const btnText = this.add
      .text(0, 0, "FIGHT", {
        fontSize: "16px",
        fontFamily: "monospace",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.fightBtn.add(btnText);

    this.fightBtn.setSize(btnW, btnH);
    this.fightBtn.setInteractive(
      new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH),
      Phaser.Geom.Rectangle.Contains
    );

    this.fightBtn.on("pointerover", () => {
      btnBg.clear();
      btnBg.fillStyle(0xee4444, 1);
      btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
      btnBg.lineStyle(2, 0xff5555, 0.8);
      btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
    });

    this.fightBtn.on("pointerout", () => {
      btnBg.clear();
      btnBg.fillStyle(0xcc3333, 1);
      btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
      btnBg.lineStyle(2, 0xff5555, 0.8);
      btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
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

    // Restore all grid card alphas
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard) gridCard.setAlpha(1);
      }
    }

    // Restore HUD alphas
    this.gridBgGraphics.setAlpha(1);
    this.deckVisual.setAlpha(1);
    this.deckText.setAlpha(1);
    this.exploreBtn.setAlpha(1);

    // Reset monster depth
    if (this.combatMonster) {
      this.combatMonster.setDepth(0);
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
    const fateCardW = 50;
    const fateCardH = 70;
    const fateCard = this.add.container(fateDeckPos.x, fateDeckPos.y);
    fateCard.setDepth(200);
    fateCard.setScale(0.3);

    const fateBg = this.add.graphics();
    fateBg.fillStyle(0x1a1a2e, 1);
    fateBg.fillRoundedRect(-fateCardW / 2, -fateCardH / 2, fateCardW, fateCardH, 6);
    fateBg.lineStyle(1, 0x4444aa, 0.8);
    fateBg.strokeRoundedRect(-fateCardW / 2, -fateCardH / 2, fateCardW, fateCardH, 6);
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
        fontSize: "20px",
        fontFamily: "monospace",
        color: modColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    fateCard.add(modText);

    // Animate fate card appearing above player
    const targetX = this.playerView.x - 70;
    const targetY = this.playerView.y - 60;

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
                      x: monsterCard.x + 5,
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

    // Remove monster from grid
    const cell = this.grid.findCard(monsterCard);
    if (cell) this.grid.removeCard(cell.col, cell.row);

    monsterCard.resolve(() => {
      // Shuffle fate card back
      this.player.shuffleFateCardBack(fateModifier);

      // Restore alphas
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const gridCard = this.grid.getCardAt(c, r);
          if (gridCard) gridCard.setAlpha(1);
        }
      }
      this.gridBgGraphics.setAlpha(1);
      this.deckVisual.setAlpha(1);
      this.deckText.setAlpha(1);
      this.exploreBtn.setAlpha(1);

      // Slide fate deck down and restore power display
      this.playerView.slideFateDeckDown(this);
      this.playerView.restorePower(this.player, this.inventory.powerBonus);

      this.isResolving = false;
      this.combatMonster = null;

      // Check game over
      if (this.player.hp <= 0) {
        this.showGameOver();
      }
    });
  }

  private showGameOver(): void {
    new GameOverScreen(this);

  }

  private disableExploreButton(): void {
    this.drawExploreButtonBg(0x333344);
    this.exploreBtnText.setText("EMPTY");
    this.exploreBtnText.setColor("#666666");
  }
}
