import Phaser from "phaser";
import { CardData, CardType, CardBackgroundMap, CardDescrMap, CardTitleColorMap } from "./CardData";
import { getAbility } from "../data/abilityRegistry";
import { createRichDescription } from "./RichText";
import { FONT_CARD, FONT_UI } from "../fonts";
import { CARD_W, CARD_H } from "./Card";

const S = 1.5;
const PW = CARD_W * S;       // 256.5
const PH = CARD_H * S;       // 303

const ART_MAX_W = 130 * S;
const ART_MAX_H = 110 * S;
const ART_CENTER_Y = -8 * S;
const DESCR_BG_W = 163 * S;
const DESCR_BG_H = 74 * S;
const TITLE_RECT_H = 32 * S;
const TITLE_Y = -PH / 2 + 6 * S + TITLE_RECT_H / 2;
const TITLE_MAX_W = 150;
const TITLE_MAX_H = TITLE_RECT_H - 6;
const DESCR_Y = PH / 2 - DESCR_BG_H / 2 - 6 * S;

/**
 * A large non-interactive card preview shown to the right of the grid.
 * Sprites are scaled to 1.5x; text is rendered at native font sizes (not scaled).
 */
export class CardPreview extends Phaser.GameObjects.Container {
  private currentId: string | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.setVisible(false);
    scene.add.existing(this);
  }

  show(data: CardData): void {
    if (this.currentId === data.id) {
      this.setVisible(true);
      return;
    }
    this.currentId = data.id;
    this.removeAll(true);
    this.buildVisual(data);
    this.setVisible(true);
  }

  hide(): void {
    this.setVisible(false);
  }

  private buildVisual(data: CardData): void {
    const type = data.type;

    // Background sprite (scaled)
    const bg = this.scene.add.image(0, 0, CardBackgroundMap[type]).setScale(S);
    this.add(bg);

    // Card art (scaled to fit larger area)
    if (data.image) {
      const art = this.scene.add.image(0, ART_CENTER_Y, data.image);
      const tex = art.texture.getSourceImage();
      const artScale = Math.min(ART_MAX_W / tex.width, ART_MAX_H / tex.height);
      art.setScale(artScale);
      this.add(art);
    }

    // Description BG sprite (scaled)
    const descrBg = this.scene.add.image(0, DESCR_Y, CardDescrMap[type]).setScale(S);
    this.add(descrBg);

    // Title — native font, fitted to scaled title area
    this.add(this.createFittedTitle(data.name, CardTitleColorMap[type]));

    // Description — native font at larger size to fill scaled description area
    const descText = data.description || this.fallbackDescription(data);
    const descrContainer = createRichDescription(this.scene, descText, {
      maxWidth: DESCR_BG_W - 24,
      fontSize: 19,
      baseColor: "#ddd",
      maxHeight: DESCR_BG_H - 12,
      minFontSize: 12,
    });
    descrContainer.setPosition(0, DESCR_Y);
    this.add(descrContainer);

    // Tag badge (Event cards)
    if (data.tag && data.type === CardType.Event) {
      const tagY = PH / 2 - 3;
      const tagBg = this.scene.add.image(0, tagY, "tag_bg").setScale(S);
      this.add(tagBg);
      const label = data.tag.charAt(0).toUpperCase() + data.tag.slice(1);
      const tagText = this.scene.add.text(0, tagY, label, {
        fontSize: "16px",
        fontFamily: FONT_CARD,
        color: "#fff",
        fontStyle: "bold",
      }).setOrigin(0.5);
      this.add(tagText);
    }

    // Stat icons (scaled positions, native font)
    this.createStatIcons(data);
  }

  private createStatIcons(d: CardData): void {
    const statY = -PH / 2 + 8 * S + 18 * S;
    const leftX = -PW / 2 + 14 * S;
    const rightX = PW / 2 - 12 * S;

    // Power icon
    const bowAbility = d.abilities?.find(a => getAbility(a.abilityId).effect === "reduceRandomEnemyPower");
    const hasPower = d.type === CardType.Monster || (d.tag === "weapon" && !d.isKey) || (d.slot && d.slot !== "backpack" && d.value > 0 && !d.isKey) || bowAbility;
    if (hasPower) {
      this.add(this.scene.add.image(leftX, statY, "icon_big_power").setFlipX(true));
      const val = bowAbility ? (bowAbility.params.amount as number) : d.value;
      this.add(this.scene.add.text(leftX, statY - 3.5 * S, `${val}`, {
        fontSize: "30px",
        fontFamily: FONT_UI,
        color: "#240a0e",
        fontStyle: "bold",
      }).setOrigin(0.5));
    }

    // Shield icon
    const armourAbility = d.abilities?.find(a => a.abilityId === "armour");
    if (armourAbility) {
      this.add(this.scene.add.image(rightX, statY, "icon_shield").setScale(S));
      this.add(this.scene.add.text(rightX, statY - 4 * S, `${armourAbility.params.amount}`, {
        fontSize: "30px",
        fontFamily: FONT_UI,
        color: "#240a0e",
        fontStyle: "bold",
      }).setOrigin(0.5));
    }

    // Agility icon
    if (d.agilityBonus) {
      const agiX = rightX + 4 * S;
      const agiY = statY - 4 * S;
      this.add(this.scene.add.image(agiX, agiY, "icon_big_agility"));
      this.add(this.scene.add.text(agiX - 12 * S, agiY + 2 * S, `${d.agilityBonus}`, {
        fontSize: "30px",
        fontFamily: FONT_UI,
        color: "#240a0e",
        fontStyle: "bold",
      }).setOrigin(0.5));
    }

    // Lock icon
    if (d.lockDifficulty != null) {
      this.add(this.scene.add.image(rightX, statY, "icon_big_lock"));
      this.add(this.scene.add.text(rightX, statY + 4 * S, `${d.lockDifficulty}`, {
        fontSize: "30px",
        fontFamily: FONT_UI,
        color: "#240a0e",
        fontStyle: "bold",
      }).setOrigin(0.5));
    }
  }

  private createFittedTitle(name: string, color: string): Phaser.GameObjects.Text {
    let fontSize = 21;
    const text = this.scene.add.text(0, TITLE_Y, name, {
      fontSize: `${fontSize}px`,
      fontFamily: FONT_CARD,
      color,
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: TITLE_MAX_W },
    }).setOrigin(0.5);

    while (text.height > TITLE_MAX_H && fontSize > 12) {
      fontSize--;
      text.setFontSize(fontSize);
    }
    return text;
  }

  private fallbackDescription(d: CardData): string {
    switch (d.type) {
      case CardType.Monster: return "";
      case CardType.Chest: return d.trapDamage ? `Trap: -${d.trapDamage} HP` : "";
      case CardType.Trap: return d.trapDamage ? `Damage: ${d.trapDamage}` : "";
      case CardType.Door: return "Locked";
      default: return d.value > 0 ? `Value: ${d.value}` : "";
    }
  }
}
