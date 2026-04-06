import Phaser from "phaser";
import { CardData, CardType, CardBackgroundMap, CardDescrMap, CardBigBackgroundMap, CardBigDescrMap, CardTitleColorMap } from "./CardData";
import { getAbility } from "../data/abilityRegistry";
import { createRichDescription } from "./RichText";
import { FONT_CARD, FONT_UI } from "../fonts";

export const CARD_W = 171;
export const CARD_H = 202;
export const BIG_CARD_W = 234;
export const BIG_CARD_H = 276;

const ART_MAX_W = 130;
const ART_MAX_H = 110;
const ART_CENTER_Y = -8;
const DESCR_BG_W = 163;
const DESCR_BG_H = 74;
const TITLE_RECT_H = 32;
const TITLE_Y = -CARD_H / 2 + 6 + TITLE_RECT_H / 2;
const TITLE_MAX_W = 100; // narrower to avoid stat icon overlap
const TITLE_MAX_H = TITLE_RECT_H - 4; // usable text height
const DESCR_Y = CARD_H / 2 - DESCR_BG_H / 2 - 6;

// Big preview layout
const BIG_ART_MAX_W = 178;
const BIG_ART_MAX_H = 150;
const BIG_ART_CENTER_Y = -11;
const BIG_DESCR_BG_W = 229;
const BIG_DESCR_BG_H = 102;
const BIG_TITLE_RECT_H = 44;
const BIG_TITLE_Y = -BIG_CARD_H / 2 + 8 + BIG_TITLE_RECT_H / 2;
const BIG_TITLE_MAX_W = 137;
const BIG_TITLE_MAX_H = BIG_TITLE_RECT_H - 4;
const BIG_DESCR_Y = BIG_CARD_H / 2 - BIG_DESCR_BG_H / 2 - 8;

export class Card extends Phaser.GameObjects.Container {
  cardData: CardData;
  guardedLoot: Card | null = null;
  readonly big: boolean;
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
  private agilityIcon: Phaser.GameObjects.Image | null = null;
  private agilityValueText: Phaser.GameObjects.Text | null = null;
  private lockIcon: Phaser.GameObjects.Image | null = null;
  private lockValueText: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, data: CardData, options?: { bigPreview?: boolean }) {
    super(scene, x, y);
    this.cardData = data;
    this.big = options?.bigPreview ?? false;
    const w = this.big ? BIG_CARD_W : CARD_W;
    const h = this.big ? BIG_CARD_H : CARD_H;
    this.setSize(w, h);
    this.createVisual();
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, w, h),
      Phaser.Geom.Rectangle.Contains
    );
    scene.add.existing(this);
  }

  private createVisual(): void {
    const type = this.cardData.type;
    const b = this.big;
    const artMaxW = b ? BIG_ART_MAX_W : ART_MAX_W;
    const artMaxH = b ? BIG_ART_MAX_H : ART_MAX_H;
    const artCY = b ? BIG_ART_CENTER_Y : ART_CENTER_Y;
    const dY = b ? BIG_DESCR_Y : DESCR_Y;
    const ch = b ? BIG_CARD_H : CARD_H;

    // 1. Background sprite
    const bgMap = b ? CardBigBackgroundMap : CardBackgroundMap;
    this.bgSprite = this.scene.add.image(0, 0, bgMap[type]);
    this.add(this.bgSprite);

    // 2. Card art image (if defined)
    if (this.cardData.image) {
      this.cardImage = this.scene.add.image(0, artCY, this.cardData.image);
      const tex = this.cardImage.texture.getSourceImage();
      const scale = Math.min(artMaxW / tex.width, artMaxH / tex.height);
      this.cardImage.setScale(scale);
      this.add(this.cardImage);
    }

    // 3. Description BG sprite — anchored to bottom of card
    const descrMap = b ? CardBigDescrMap : CardDescrMap;
    this.descrSprite = this.scene.add.image(0, dY, descrMap[type]);
    this.add(this.descrSprite);

    // 4. Title text on the top stripe — auto-sized to fit
    this.nameText = this.createFittedTitle(this.cardData.name, CardTitleColorMap[type]);
    this.add(this.nameText);

    // 5. Mechanical description text on description BG (rich text)
    this.rebuildDescription(this.buildDescriptionText());

    // 6. Tag badge (centered near bottom of card, Event cards only)
    if (this.cardData.tag && this.cardData.type === CardType.Event) {
      const tagY = ch / 2 - 2;
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
    const b = this.big;
    const cw = b ? BIG_CARD_W : CARD_W;
    const ch = b ? BIG_CARD_H : CARD_H;
    const fontSize = b ? "27px" : "20px";

    // Stat icons sit at the top edge of the card.
    const statY = -ch / 2 + (b ? 11 : 8) + (b ? 25 : 18);
    const leftX = -cw / 2 + (b ? 19 : 14);
    const rightX = cw / 2 - (b ? 16 : 12);

    // Power icon — top-left
    const bowAbility = d.abilities?.find(a => getAbility(a.abilityId).effect === "reduceRandomEnemyPower");
    const hasPower = d.type === CardType.Monster || (d.tag === "weapon" && !d.isKey) || (d.slot && d.slot !== "backpack" && d.value > 0 && !d.isKey) || bowAbility;
    if (hasPower) {
      if (!b) this.addStatBacking(leftX, statY);
      this.powerIcon = this.scene.add.image(leftX, statY, b ? "icon_big_power" : "icon_card_power").setFlipX(true);
      this.add(this.powerIcon);
      const displayValue = bowAbility ? (bowAbility.params.amount as number) : d.value;
      const offX = b ? -5 : -3.5;
      const offY = b ? -5 : -3.5;
      this.powerValueText = this.scene.add.text(leftX + offX, statY + offY, `${displayValue}`, {
        fontSize,
        fontFamily: FONT_UI,
        color: "#240a0e",
        fontStyle: "bold",
      }).setOrigin(0.5);
      this.add(this.powerValueText);
    }

    // Shield icon — top-right
    const armourAbility = d.abilities?.find(a => a.abilityId === "armour");
    if (armourAbility) {
      this.shieldIcon = this.scene.add.image(rightX, statY, "icon_shield");
      this.add(this.shieldIcon);
      this.shieldValueText = this.scene.add.text(rightX, statY - (b ? 5 : 4), `${armourAbility.params.amount}`, {
        fontSize,
        fontFamily: FONT_UI,
        color: "#240a0e",
        fontStyle: "bold",
      }).setOrigin(0.5);
      this.add(this.shieldValueText);
    }

    // Agility icon — top-right (for cards with agilityBonus)
    if (d.agilityBonus) {
      const agiX = rightX + (b ? 5 : 4);
      const agiY = statY - (b ? 5 : 4);
      this.agilityIcon = this.scene.add.image(agiX, agiY, b ? "icon_big_agility" : "icon_card_agility");
      this.add(this.agilityIcon);
      this.agilityValueText = this.scene.add.text(agiX - (b ? 16 : 12), agiY + (b ? 3 : 2), `${d.agilityBonus}`, {
        fontSize,
        fontFamily: FONT_UI,
        color: "#240a0e",
        fontStyle: "bold",
      }).setOrigin(0.5);
      this.add(this.agilityValueText);
    }

    // Lock icon — top-right (for cards with lockDifficulty)
    if (d.lockDifficulty != null) {
      this.lockIcon = this.scene.add.image(rightX, statY, b ? "icon_big_lock" : "icon_lock");
      this.add(this.lockIcon);
      this.lockValueText = this.scene.add.text(rightX, statY + (b ? 5 : 4), `${d.lockDifficulty}`, {
        fontSize,
        fontFamily: FONT_UI,
        color: "#240a0e",
        fontStyle: "bold",
      }).setOrigin(0.5);
      this.add(this.lockValueText);
    }
  }

  private addStatBacking(x: number, y: number): void {
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0x000000, 0.4);
    gfx.fillCircle(x, y, 18);
    this.add(gfx);
  }

  private createFittedTitle(name: string, color: string): Phaser.GameObjects.Text {
    const b = this.big;
    let fontSize = b ? 19 : 14;
    const tY = b ? BIG_TITLE_Y : TITLE_Y;
    const maxW = b ? BIG_TITLE_MAX_W : TITLE_MAX_W;
    const maxH = b ? BIG_TITLE_MAX_H : TITLE_MAX_H;
    const text = this.scene.add.text(0, tY, name, {
      fontSize: `${fontSize}px`,
      fontFamily: FONT_CARD,
      color,
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: maxW },
    }).setOrigin(0.5);

    while (text.height > maxH && fontSize > 8) {
      fontSize--;
      text.setFontSize(fontSize);
    }
    return text;
  }

  private rebuildDescription(text: string): void {
    if (this.descrContainer) {
      this.descrContainer.destroy();
    }
    const b = this.big;
    const dbgW = b ? BIG_DESCR_BG_W : DESCR_BG_W;
    const dbgH = b ? BIG_DESCR_BG_H : DESCR_BG_H;
    const dY = b ? BIG_DESCR_Y : DESCR_Y;
    this.descrContainer = createRichDescription(this.scene, text, {
      maxWidth: dbgW - 16,
      fontSize: b ? 18 : 13,
      baseColor: "#ddd",
      maxHeight: dbgH - 8,
      minFontSize: b ? 11 : 8,
    });
    this.descrContainer.setPosition(0, dY);
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
