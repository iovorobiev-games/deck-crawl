import Phaser from "phaser";
import { CARD_W, CARD_H } from "./Card";
import { Player } from "../systems/Player";

const CORNER_R = 8;
const BORDER_COLOR = 0xddaa22;
const BG_COLOR = 0x1a1a2e;
const STACK_BG = 0x2a2a4e;
const STACK_BORDER = 0x4444aa;

export class PlayerView extends Phaser.GameObjects.Container {
  private portraitBg!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private powerText!: Phaser.GameObjects.Text;
  private agilityText!: Phaser.GameObjects.Text;
  private fateDeckGfx!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.createFateDeckStack();
    this.createPortrait();

    this.setSize(CARD_W, CARD_H);
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, CARD_W, CARD_H),
      Phaser.Geom.Rectangle.Contains
    );

    scene.add.existing(this);
  }

  private createFateDeckStack(): void {
    this.fateDeckGfx = this.scene.add.graphics();
    // Draw 2 offset card backs behind the portrait
    for (let i = 0; i < 2; i++) {
      const ox = (2 - i) * 2;
      const oy = (2 - i) * 2;
      this.fateDeckGfx.fillStyle(STACK_BG, 1);
      this.fateDeckGfx.fillRoundedRect(
        -CARD_W / 2 + ox,
        -CARD_H / 2 + oy,
        CARD_W,
        CARD_H,
        CORNER_R
      );
      this.fateDeckGfx.lineStyle(1, STACK_BORDER, 0.8);
      this.fateDeckGfx.strokeRoundedRect(
        -CARD_W / 2 + ox,
        -CARD_H / 2 + oy,
        CARD_W,
        CARD_H,
        CORNER_R
      );
    }
    this.add(this.fateDeckGfx);
  }

  private createPortrait(): void {
    this.portraitBg = this.scene.add.graphics();
    this.drawPortraitBg();
    this.add(this.portraitBg);

    // Placeholder character silhouette — simple colored rectangle
    const silhouette = this.scene.add.graphics();
    silhouette.fillStyle(0x445577, 1);
    silhouette.fillRoundedRect(-14, -22, 28, 32, 4);
    // Head
    silhouette.fillStyle(0x556688, 1);
    silhouette.fillCircle(0, -30, 10);
    this.add(silhouette);

    // Stat background rects (drawn once; text overlays them)
    const statBgs = this.scene.add.graphics();
    // HP badge — top-left
    statBgs.fillStyle(0xcc3333, 0.5);
    statBgs.fillRoundedRect(-CARD_W / 2 + 3, -CARD_H / 2 + 2, 30, 14, 3);
    // Power badge — bottom-left
    statBgs.fillStyle(0xcc7722, 0.5);
    statBgs.fillRoundedRect(-CARD_W / 2 + 3, CARD_H / 2 - 18, 26, 14, 3);
    // Agility badge — bottom-right
    statBgs.fillStyle(0x22aa55, 0.5);
    statBgs.fillRoundedRect(CARD_W / 2 - 29, CARD_H / 2 - 18, 26, 14, 3);
    this.add(statBgs);

    // Stats — HP top-left
    this.hpText = this.scene.add
      .text(-CARD_W / 2 + 6, -CARD_H / 2 + 4, "", {
        fontSize: "10px",
        fontFamily: "monospace",
        color: "#ff6666",
        fontStyle: "bold",
      })
      .setOrigin(0, 0);
    this.add(this.hpText);

    // Power bottom-left
    this.powerText = this.scene.add
      .text(-CARD_W / 2 + 6, CARD_H / 2 - 16, "", {
        fontSize: "10px",
        fontFamily: "monospace",
        color: "#ffaa44",
        fontStyle: "bold",
      })
      .setOrigin(0, 0);
    this.add(this.powerText);

    // Agility bottom-right
    this.agilityText = this.scene.add
      .text(CARD_W / 2 - 6, CARD_H / 2 - 16, "", {
        fontSize: "10px",
        fontFamily: "monospace",
        color: "#44dd88",
        fontStyle: "bold",
      })
      .setOrigin(1, 0);
    this.add(this.agilityText);
  }

  private drawPortraitBg(): void {
    this.portraitBg.clear();
    this.portraitBg.fillStyle(BG_COLOR, 1);
    this.portraitBg.fillRoundedRect(
      -CARD_W / 2,
      -CARD_H / 2,
      CARD_W,
      CARD_H,
      CORNER_R
    );
    this.portraitBg.lineStyle(2, BORDER_COLOR, 1);
    this.portraitBg.strokeRoundedRect(
      -CARD_W / 2,
      -CARD_H / 2,
      CARD_W,
      CARD_H,
      CORNER_R
    );
  }

  updateStats(player: Player): void {
    this.hpText.setText(`\u2665${player.hp}`);
    this.powerText.setText(`\u2694${player.power}`);
    this.powerText.setColor("#ffaa44");
    this.agilityText.setText(`\u25C6${player.agility}`);
  }

  slideFateDeckUp(scene: Phaser.Scene): void {
    scene.tweens.add({
      targets: this.fateDeckGfx,
      y: this.fateDeckGfx.y - 20,
      duration: 300,
      ease: "Power2",
    });
  }

  slideFateDeckDown(scene: Phaser.Scene): void {
    scene.tweens.add({
      targets: this.fateDeckGfx,
      y: 0,
      duration: 300,
      ease: "Power2",
    });
  }

  getFateDeckWorldPos(): { x: number; y: number } {
    return {
      x: this.x,
      y: this.y - 20,
    };
  }

  showTempPower(value: number): void {
    this.powerText.setText(`\u2694${value}`);
    this.powerText.setColor("#ffff44");
  }

  restorePower(player: Player): void {
    this.updateStats(player);
  }
}
