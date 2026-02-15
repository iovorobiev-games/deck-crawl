import Phaser from "phaser";
import { CardData, CardColorMap } from "./CardData";

export const CARD_W = 100;
export const CARD_H = 110;
const CORNER_R = 8;

export class Card extends Phaser.GameObjects.Container {
  cardData: CardData;
  private bg!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private typeText!: Phaser.GameObjects.Text;
  private valueText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, data: CardData) {
    super(scene, x, y);
    this.cardData = data;
    this.setSize(CARD_W, CARD_H);
    this.createVisual();
    this.setInteractive(
      new Phaser.Geom.Rectangle(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H),
      Phaser.Geom.Rectangle.Contains
    );
    scene.add.existing(this);
  }

  private createVisual(): void {
    const color = CardColorMap[this.cardData.type];

    this.bg = this.scene.add.graphics();
    this.bg.fillStyle(0x1a1a2e, 1);
    this.bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CORNER_R);
    this.bg.lineStyle(2, color, 1);
    this.bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CORNER_R);
    // Color band at top
    this.bg.fillStyle(color, 1);
    this.bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, 28, { tl: CORNER_R, tr: CORNER_R, bl: 0, br: 0 });
    this.add(this.bg);

    this.typeText = this.scene.add.text(0, -CARD_H / 2 + 14, this.cardData.type, {
      fontSize: "11px",
      fontFamily: "monospace",
      color: "#fff",
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.add(this.typeText);

    this.nameText = this.scene.add.text(0, 8, this.cardData.name, {
      fontSize: "12px",
      fontFamily: "monospace",
      color: "#eee",
      align: "center",
      wordWrap: { width: CARD_W - 12 },
    }).setOrigin(0.5);
    this.add(this.nameText);

    if (this.cardData.value > 0) {
      this.valueText = this.scene.add.text(0, CARD_H / 2 - 20, String(this.cardData.value), {
        fontSize: "18px",
        fontFamily: "monospace",
        color: "#fff",
        fontStyle: "bold",
      }).setOrigin(0.5);
      this.add(this.valueText);
    }
  }

  reveal(): void {
    this.setScale(0);
    this.setAlpha(0);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 300,
      ease: "Back.easeOut",
    });
  }

  resolve(onComplete?: () => void): void {
    this.disableInteractive();
    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 250,
      ease: "Power2",
      onComplete: () => {
        this.destroy();
        onComplete?.();
      },
    });
  }

  setHighlight(on: boolean): void {
    if (on) {
      this.bg.clear();
      const color = CardColorMap[this.cardData.type];
      this.bg.fillStyle(0x2a2a4e, 1);
      this.bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CORNER_R);
      this.bg.lineStyle(3, 0xffffff, 1);
      this.bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CORNER_R);
      this.bg.fillStyle(color, 1);
      this.bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, 28, { tl: CORNER_R, tr: CORNER_R, bl: 0, br: 0 });
    } else {
      this.bg.clear();
      const color = CardColorMap[this.cardData.type];
      this.bg.fillStyle(0x1a1a2e, 1);
      this.bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CORNER_R);
      this.bg.lineStyle(2, color, 1);
      this.bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CORNER_R);
      this.bg.fillStyle(color, 1);
      this.bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, 28, { tl: CORNER_R, tr: CORNER_R, bl: 0, br: 0 });
    }
  }
}
