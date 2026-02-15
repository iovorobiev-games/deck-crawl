import Phaser from "phaser";
import { Card, CARD_W, CARD_H } from "../entities/Card";
import { PlayerView } from "../entities/PlayerView";
import { FateDeckPopup } from "../entities/FateDeckPopup";
import { Deck } from "../systems/Deck";
import { Grid, COLS, ROWS } from "../systems/Grid";
import { Player } from "../systems/Player";
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

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x0e0e1a);

    this.player = new Player(10);
    this.deck = new Deck(deckConfig);
    this.grid = new Grid(GAME_W, GAME_H);

    this.createHUD();
    this.createGridBackground();
    this.createDeckVisual();
    this.createExploreButton();
    this.createPlayerView();

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
    this.playerView.updateStats(this.player);
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

  private setupCardInteraction(card: Card): void {
    card.on("pointerover", () => {
      if (!this.isResolving) card.setHighlight(true);
    });
    card.on("pointerout", () => {
      card.setHighlight(false);
    });
    card.on("pointerdown", () => {
      if (this.isResolving) return;
      this.resolveCard(card);
    });
  }

  private resolveCard(card: Card): void {
    const cell = this.grid.findCard(card);
    if (!cell) return;

    this.isResolving = true;
    this.grid.removeCard(cell.col, cell.row);

    card.resolve(() => {
      this.isResolving = false;
      // Future: trigger card effect based on card.cardData.type
    });
  }

  private disableExploreButton(): void {
    this.drawExploreButtonBg(0x333344);
    this.exploreBtnText.setText("EMPTY");
    this.exploreBtnText.setColor("#666666");
  }
}
