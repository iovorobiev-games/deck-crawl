import Phaser from "phaser";
import { CardData, CardType, CardBackgroundMap, CardDescrMap, CardTitleColorMap } from "./CardData";

export const CARD_W = 171;
export const CARD_H = 202;

const ART_MAX_W = 130;
const ART_MAX_H = 110;
const ART_CENTER_Y = -8;
const DESCR_BG_W = 163;
const DESCR_BG_H = 74;
const TITLE_Y = -CARD_H / 2 + 16;
const DESCR_Y = CARD_H / 2 - DESCR_BG_H / 2;

export class Card extends Phaser.GameObjects.Container {
  cardData: CardData;
  guardedLoot: Card | null = null;
  private bgSprite!: Phaser.GameObjects.Image;
  private cardImage: Phaser.GameObjects.Image | null = null;
  private descrSprite!: Phaser.GameObjects.Image;
  private nameText!: Phaser.GameObjects.Text;
  private descrText!: Phaser.GameObjects.Text;
  private highlightGfx: Phaser.GameObjects.Graphics | null = null;

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
    const type = this.cardData.type;

    // 1. Background sprite
    this.bgSprite = this.scene.add.image(0, 0, CardBackgroundMap[type]);
    this.add(this.bgSprite);

    // 2. Card art image (if defined)
    if (this.cardData.image) {
      this.cardImage = this.scene.add.image(0, ART_CENTER_Y, this.cardData.image);
      const tex = this.cardImage.texture.getSourceImage();
      const scale = Math.min(ART_MAX_W / tex.width, ART_MAX_H / tex.height);
      this.cardImage.setScale(scale);
      this.add(this.cardImage);
    }

    // 3. Description BG sprite — anchored to bottom of card
    this.descrSprite = this.scene.add.image(0, DESCR_Y, CardDescrMap[type]);
    this.add(this.descrSprite);

    // 4. Title text on the top stripe
    this.nameText = this.scene.add.text(0, TITLE_Y, this.cardData.name, {
      fontSize: "12px",
      fontFamily: "monospace",
      color: CardTitleColorMap[type],
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: CARD_W - 20 },
    }).setOrigin(0.5);
    this.add(this.nameText);

    // 5. Mechanical description text on description BG
    this.descrText = this.scene.add.text(0, DESCR_Y, this.buildDescriptionText(), {
      fontSize: "11px",
      fontFamily: "monospace",
      color: "#ddd",
      align: "center",
      wordWrap: { width: DESCR_BG_W - 16 },
    }).setOrigin(0.5);
    this.add(this.descrText);
  }

  private buildDescriptionText(): string {
    const d = this.cardData;
    switch (d.type) {
      case CardType.Monster:
        return `HP: ${d.value}`;
      case CardType.Chest: {
        let text = `Lock: ${d.lockDifficulty ?? 0}`;
        if (d.trapDamage) text += `\nTrap: -${d.trapDamage} HP`;
        return text;
      }
      case CardType.Trap: {
        let text = `Difficulty: ${d.lockDifficulty ?? 0}`;
        if (d.trapDamage) text += `\nDamage: ${d.trapDamage}`;
        return text;
      }
      case CardType.Treasure:
        if (d.slot && !d.isKey) return `+${d.value} power`;
        return d.description;
      case CardType.Potion:
        return d.description;
      case CardType.Door:
        return "Locked";
      default:
        return d.description || (d.value > 0 ? `Value: ${d.value}` : "");
    }
  }

  reveal(onComplete?: () => void): void {
    this.setScale(0);
    this.setAlpha(0);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 300,
      ease: "Back.easeOut",
      onComplete: onComplete ? () => onComplete() : undefined,
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
    this.descrText.setText(this.buildDescriptionText());
  }

  markDoorOpened(): void {
    this.bgSprite.setTint(0xaa88ff);
    this.nameText.setText("OPENED!");
    this.descrText.setText("Unlocked");
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
      if (!this.highlightGfx) {
        this.highlightGfx = this.scene.add.graphics();
        this.highlightGfx.fillStyle(0xffffff, 0.15);
        this.highlightGfx.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 8);
        this.highlightGfx.lineStyle(3, 0xffffff, 0.8);
        this.highlightGfx.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 8);
        this.add(this.highlightGfx);
      }
    } else {
      if (this.highlightGfx) {
        this.highlightGfx.destroy();
        this.highlightGfx = null;
      }
    }
  }
}
