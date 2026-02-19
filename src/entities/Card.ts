import Phaser from "phaser";
import { CardData, CardType, CardColorMap } from "./CardData";

export const CARD_W = 100;
export const CARD_H = 110;
const CORNER_R = 8;

export class Card extends Phaser.GameObjects.Container {
  cardData: CardData;
  guardedLoot: Card | null = null;
  private bg!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private typeText!: Phaser.GameObjects.Text;
  private valueText!: Phaser.GameObjects.Text;
  private trapText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, data: CardData) {
    super(scene, x, y);
    this.cardData = data;
    this.setSize(CARD_W, CARD_H);
    this.createVisual();
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, CARD_W, CARD_H),
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

    if (this.cardData.type === CardType.Chest && this.cardData.lockDifficulty != null) {
      this.valueText = this.scene.add.text(0, CARD_H / 2 - 20, `\u{1F512}${this.cardData.lockDifficulty}`, {
        fontSize: "16px",
        fontFamily: "monospace",
        color: "#fff",
        fontStyle: "bold",
      }).setOrigin(0.5);
      this.add(this.valueText);

      if (this.cardData.trapDamage != null) {
        this.trapText = this.scene.add.text(-CARD_W / 2 + 8, CARD_H / 2 - 18, `\u2665-${this.cardData.trapDamage}`, {
          fontSize: "10px",
          fontFamily: "monospace",
          color: "#ff6666",
        }).setOrigin(0, 0.5);
        this.add(this.trapText);
      }
    } else if (this.cardData.type === CardType.Door) {
      this.valueText = this.scene.add.text(0, CARD_H * 0.28, "\u{1F512}", {
        fontSize: "22px",
        fontFamily: "monospace",
      }).setOrigin(0.5);
      this.add(this.valueText);
    } else if (this.cardData.value > 0) {
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

  updateValue(newValue: number): void {
    this.cardData.value = newValue;
    if (this.valueText) {
      this.valueText.setText(String(newValue));
    }
  }

  markDoorOpened(): void {
    this.bg.clear();
    this.bg.fillStyle(0x2a1a4e, 1);
    this.bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CORNER_R);
    this.bg.lineStyle(3, 0xeeddff, 1);
    this.bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CORNER_R);
    this.bg.fillStyle(0xaa88ff, 1);
    this.bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, 28, { tl: CORNER_R, tr: CORNER_R, bl: 0, br: 0 });

    this.nameText.setText("OPENED!");
    if (this.valueText) {
      this.valueText.setText("\u{1F513}");
    }
  }

  /** Restrict hit area to only the bottom peekHeight pixels (the visible peek region). */
  setPeekHitArea(peekHeight: number): void {
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, CARD_H / 2 - peekHeight / 2, CARD_W, peekHeight),
      Phaser.Geom.Rectangle.Contains
    );
  }

  /** Restore the default full-card hit area. */
  restoreFullHitArea(): void {
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, CARD_W, CARD_H),
      Phaser.Geom.Rectangle.Contains
    );
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
