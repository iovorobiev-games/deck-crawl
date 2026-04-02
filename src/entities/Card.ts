import Phaser from "phaser";
import { CardData, CardType, CardBackgroundMap, CardDescrMap, CardTitleColorMap } from "./CardData";
import { getAbility } from "../data/abilityRegistry";
import { createRichDescription } from "./RichText";
import { FONT_CARD, FONT_UI } from "../fonts";

export const CARD_W = 171;
export const CARD_H = 202;

const ART_MAX_W = 130;
const ART_MAX_H = 110;
const ART_CENTER_Y = -8;
const DESCR_BG_W = 163;
const DESCR_BG_H = 74;
const TITLE_Y = -CARD_H / 2 + 6 + 16; // 6px margin from top + half of 32px rect
const DESCR_Y = CARD_H / 2 - DESCR_BG_H / 2 - 6;

export class Card extends Phaser.GameObjects.Container {
  cardData: CardData;
  guardedLoot: Card | null = null;
  private bgSprite!: Phaser.GameObjects.Image;
  private cardImage: Phaser.GameObjects.Image | null = null;
  private descrSprite!: Phaser.GameObjects.Image;
  private nameText!: Phaser.GameObjects.Text;
  private descrContainer!: Phaser.GameObjects.Container;
  private highlightGfx: Phaser.GameObjects.Graphics | null = null;
  private dropTargetGfx: Phaser.GameObjects.Graphics | null = null;
  private buffText: Phaser.GameObjects.Text | null = null;
  private powerIcon: Phaser.GameObjects.Image | null = null;
  private powerValueText: Phaser.GameObjects.Text | null = null;
  private shieldIcon: Phaser.GameObjects.Image | null = null;
  private shieldValueText: Phaser.GameObjects.Text | null = null;
  private lockIcon: Phaser.GameObjects.Image | null = null;
  private lockValueText: Phaser.GameObjects.Text | null = null;

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
      fontSize: "14px",
      fontFamily: FONT_CARD,
      color: CardTitleColorMap[type],
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: 148 },
    }).setOrigin(0.5);
    this.add(this.nameText);

    // 5. Mechanical description text on description BG (rich text)
    this.rebuildDescription(this.buildDescriptionText());

    // 6. Tag badge (centered near bottom of card, Event cards only)
    if (this.cardData.tag && this.cardData.type === CardType.Event) {
      const tagY = CARD_H / 2 - 2;
      const tagBg = this.scene.add.image(0, tagY, "tag_bg");
      this.add(tagBg);
      const label = this.cardData.tag.charAt(0).toUpperCase() + this.cardData.tag.slice(1);
      const tagText = this.scene.add.text(0, tagY, label, {
        fontSize: "11px",
        fontFamily: FONT_CARD,
        color: "#fff",
        fontStyle: "bold",
      }).setOrigin(0.5);
      this.add(tagText);
    }

    // 7. Stat icons (power, shield) on card corners
    this.createStatIcons();
  }

  private createStatIcons(): void {
    const d = this.cardData;

    // Power icon — bottom-left corner of card
    // Show for monsters, equippable items that grant power, and bow shot cards
    const bowAbility = d.abilities?.find(a => getAbility(a.abilityId).effect === "reduceRandomEnemyPower");
    const hasPower = d.type === CardType.Monster || (d.tag === "weapon" && !d.isKey) || (d.slot && d.slot !== "backpack" && d.value > 0 && !d.isKey) || bowAbility;
    if (hasPower) {
      const iconX = -CARD_W / 2 + 15;
      const iconY = CARD_H / 2 - 12;
      this.powerIcon = this.scene.add.image(iconX, iconY, "icon_card_power");
      this.add(this.powerIcon);
      const displayValue = bowAbility ? (bowAbility.params.amount as number) : d.value;
      // Text sits in a 32x32 rect: margins top 4, left 18, right 11, bottom 11
      // Center of that rect relative to icon center: (+3.5, -3.5)
      this.powerValueText = this.scene.add.text(iconX + 3.5, iconY - 3.5, `${displayValue}`, {
        fontSize: "20px",
        fontFamily: FONT_UI,
        color: "#240a0e",
        fontStyle: "bold",
      }).setOrigin(0.5);
      this.add(this.powerValueText);
    }

    // Shield icon — bottom-right corner of card
    const armourAbility = d.abilities?.find(a => a.abilityId === "armour");
    if (armourAbility) {
      const iconX = CARD_W / 2 - 9;
      const iconY = CARD_H / 2 - 12;
      this.shieldIcon = this.scene.add.image(iconX, iconY, "icon_shield");
      this.add(this.shieldIcon);
      this.shieldValueText = this.scene.add.text(iconX, iconY - 4, `${armourAbility.params.amount}`, {
        fontSize: "20px",
        fontFamily: FONT_UI,
        color: "#240a0e",
        fontStyle: "bold",
      }).setOrigin(0.5);
      this.add(this.shieldValueText);
    }

    // Lock icon — bottom-right corner of card (for cards with lockDifficulty)
    if (d.lockDifficulty != null) {
      const iconX = CARD_W / 2 - 9;
      const iconY = CARD_H / 2 - 16;
      this.lockIcon = this.scene.add.image(iconX, iconY, "icon_lock");
      this.add(this.lockIcon);
      this.lockValueText = this.scene.add.text(iconX, iconY + 4, `${d.lockDifficulty}`, {
        fontSize: "20px",
        fontFamily: FONT_UI,
        color: "#240a0e",
        fontStyle: "bold",
      }).setOrigin(0.5);
      this.add(this.lockValueText);
    }
  }

  private rebuildDescription(text: string): void {
    if (this.descrContainer) {
      this.descrContainer.destroy();
    }
    this.descrContainer = createRichDescription(this.scene, text, {
      maxWidth: DESCR_BG_W - 16,
      fontSize: 13,
      baseColor: "#ddd",
      maxHeight: DESCR_BG_H - 8,
      minFontSize: 8,
    });
    this.descrContainer.setPosition(0, DESCR_Y);
    this.add(this.descrContainer);
  }

  private buildDescriptionText(): string {
    const d = this.cardData;
    if (d.description) return d.description;
    switch (d.type) {
      case CardType.Monster:
        return "";
      case CardType.Chest:
        return d.trapDamage ? `Trap: -${d.trapDamage} HP` : "";
      case CardType.Trap:
        return d.trapDamage ? `Damage: ${d.trapDamage}` : "";
      case CardType.Door:
        return "Locked";
      default:
        return d.value > 0 ? `Value: ${d.value}` : "";
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

  dealFrom(fromX: number, fromY: number, onComplete?: () => void): void {
    const targetX = this.x;
    const targetY = this.y;
    this.setPosition(fromX, fromY);
    this.setScale(0.5);
    this.setAlpha(0);
    this.scene.tweens.add({
      targets: this,
      x: targetX,
      y: targetY,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 400,
      ease: "Power2",
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
    this.rebuildDescription(this.buildDescriptionText());
    if (this.powerValueText) {
      this.powerValueText.setText(`${newValue}`);
    }
  }

  /** Update the displayed power value (e.g. to show equipped bonuses). */
  setPowerDisplay(amount: number): void {
    if (this.powerValueText) {
      this.powerValueText.setText(`${amount}`);
    }
  }

  markDoorOpened(): void {
    this.bgSprite.setTint(0xaa88ff);
    this.nameText.setText("OPENED!");
    this.rebuildDescription("Unlocked");
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

  setBuffIndicator(buff: number): void {
    if (buff > 0) {
      if (!this.buffText) {
        this.buffText = this.scene.add.text(CARD_W / 2 - 8, DESCR_Y - 14, "", {
          fontSize: "11px",
          fontFamily: FONT_UI,
          color: "#ff6644",
          fontStyle: "bold",
        }).setOrigin(1, 0.5);
        this.add(this.buffText);
      }
      this.buffText.setText(`(+${buff})`);
    } else {
      if (this.buffText) {
        this.buffText.destroy();
        this.buffText = null;
      }
    }
  }

  setDropTargetHighlight(on: boolean): void {
    if (on) {
      if (!this.dropTargetGfx) {
        this.dropTargetGfx = this.scene.add.graphics();
        this.dropTargetGfx.fillStyle(0xff0000, 0.15);
        this.dropTargetGfx.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 8);
        this.dropTargetGfx.lineStyle(3, 0xff3333, 0.8);
        this.dropTargetGfx.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 8);
        this.add(this.dropTargetGfx);
      }
    } else {
      if (this.dropTargetGfx) {
        this.dropTargetGfx.destroy();
        this.dropTargetGfx = null;
      }
    }
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
