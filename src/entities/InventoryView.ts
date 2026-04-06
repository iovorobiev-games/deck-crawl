import Phaser from "phaser";
import { Inventory, SLOT_DEFS, SlotDef } from "../systems/Inventory";
import { CardData, CardType, CardColorMap, CardBackgroundMap, CardDescrMap, CardTitleColorMap } from "./CardData";
import { CARD_W as FULL_CARD_W, CARD_H as FULL_CARD_H } from "./Card";
import { createRichDescription } from "./RichText";
import { FONT_CARD, FONT_UI } from "../fonts";

const SLOT_W = 157;
const SLOT_H = 186;
const CORNER_R = 12;
const BORDER_DEFAULT = 0x333355;
const BORDER_VALID = 0x33cc55;
const BORDER_VALID_DIM = 0x226633;
const BORDER_INVALID = 0xcc3333;
const BORDER_INVALID_DIM = 0x662222;

const SLOT_SPRITE_MAP: Record<string, string> = {
  weapon1: "slot_left_arm",
  weapon2: "slot_right_arm",
  head: "slot_head",
  armour: "slot_armour",
  backpack1: "slot_backpack1",
  backpack2: "slot_backpack2",
};

const SLOT_LABEL_MAP: Record<string, string> = {
  weapon1: "Hand",
  weapon2: "Hand",
  head: "Head",
  armour: "Body",
  backpack1: "Bag",
  backpack2: "Bag",
};

interface SlotVisual {
  def: SlotDef;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  slotBgImage: Phaser.GameObjects.Image | null;
  miniCard: Phaser.GameObjects.Container | null;
  worldX: number;
  worldY: number;
}

// Layout positions for each slot (absolute x, all at same y)
const SLOT_POSITIONS: Record<string, number> = {
  weapon1: 297.5,
  weapon2: 480,
  head: 662.5,
  armour: 1257,
  backpack1: 1439.5,
  backpack2: 1622.5,
};

const SLOT_Y = 918;

export class InventoryView extends Phaser.GameObjects.Container {
  private slotVisuals: Map<string, SlotVisual> = new Map();
  private inventory: Inventory;

  constructor(scene: Phaser.Scene, inventory: Inventory) {
    super(scene, 0, 0);
    this.inventory = inventory;

    for (const def of SLOT_DEFS) {
      this.createSlotVisual(def);
    }

    inventory.on("slotChanged", (slotName: string, item: CardData | null) => {
      this.updateSlotContent(slotName, item);
    });

    scene.add.existing(this);
  }

  private createSlotVisual(def: SlotDef): void {
    const x = SLOT_POSITIONS[def.name];
    const y = SLOT_Y;

    const container = this.scene.add.container(x, y);

    const slotSpriteKey = SLOT_SPRITE_MAP[def.name];
    let slotBgImage: Phaser.GameObjects.Image | null = null;
    if (slotSpriteKey) {
      slotBgImage = this.scene.add.image(0, -18, slotSpriteKey);
      container.add(slotBgImage);
    }

    const label = SLOT_LABEL_MAP[def.name];
    if (label) {
      const labelText = this.scene.add.text(0, -109, label, {
        fontSize: "20px",
        fontFamily: FONT_CARD,
        color: "#35160e",
        fontStyle: "bold",
        align: "center",
      }).setOrigin(0.5);
      container.add(labelText);
    }

    const bg = this.scene.add.graphics();
    this.drawSlotBg(bg, BORDER_DEFAULT);
    container.add(bg);

    container.setSize(SLOT_W, SLOT_H);
    container.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, SLOT_W, SLOT_H),
      Phaser.Geom.Rectangle.Contains
    );

    this.add(container);

    const visual: SlotVisual = {
      def,
      container,
      bg,
      slotBgImage,
      miniCard: null,
      worldX: x,
      worldY: y,
    };
    this.slotVisuals.set(def.name, visual);
  }

  private drawSlotBg(
    bg: Phaser.GameObjects.Graphics,
    borderColor: number
  ): void {
    bg.clear();
    if (borderColor !== BORDER_DEFAULT) {
      bg.lineStyle(3, borderColor, 0.8);
      bg.strokeRoundedRect(
        -SLOT_W / 2,
        -SLOT_H / 2,
        SLOT_W,
        SLOT_H,
        CORNER_R
      );
    }
  }

  private updateSlotContent(slotName: string, item: CardData | null, powerBonus = 0): void {
    const visual = this.slotVisuals.get(slotName);
    if (!visual) return;

    // Remove existing mini-card
    if (visual.miniCard) {
      visual.miniCard.destroy();
      visual.miniCard = null;
    }

    if (item) {
      visual.miniCard = this.createMiniCard(item, powerBonus);
      visual.container.add(visual.miniCard);
    }
  }

  private createMiniCard(item: CardData, powerBonus = 0): Phaser.GameObjects.Container {
    const mc = this.scene.add.container(0, 0);
    const scaleX = (SLOT_W - 10) / FULL_CARD_W;
    const scaleY = (SLOT_H - 10) / FULL_CARD_H;
    const s = Math.min(scaleX, scaleY);

    const ART_MAX_W = 130;
    const ART_MAX_H = 110;
    const ART_CENTER_Y = -8;
    const DESCR_BG_W = 163;
    const DESCR_BG_H = 74;
    const TITLE_Y = -FULL_CARD_H / 2 + 6 + 16;
    const DESCR_Y = FULL_CARD_H / 2 - DESCR_BG_H / 2;

    // Background sprite
    const bgSprite = this.scene.add.image(0, 0, CardBackgroundMap[item.type]);
    mc.add(bgSprite);

    // Apply green poison tint
    if (item.poisoned) {
      bgSprite.setTint(0x88ff88);
    }

    // Card art
    if (item.image) {
      const cardImage = this.scene.add.image(0, ART_CENTER_Y, item.image);
      const tex = cardImage.texture.getSourceImage();
      const artScale = Math.min(ART_MAX_W / tex.width, ART_MAX_H / tex.height);
      cardImage.setScale(artScale);
      if (item.poisoned) {
        cardImage.setTint(0x88ff88);
      }
      mc.add(cardImage);
    }

    // Description BG
    const descrSprite = this.scene.add.image(0, DESCR_Y, CardDescrMap[item.type]);
    mc.add(descrSprite);

    // Title text — auto-sized to fit
    const TITLE_MAX_W = 100;
    const TITLE_MAX_H = 28;
    let titleFontSize = 14;
    const nameText = this.scene.add.text(0, TITLE_Y, item.name, {
      fontSize: `${titleFontSize}px`,
      fontFamily: FONT_CARD,
      color: CardTitleColorMap[item.type],
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: TITLE_MAX_W },
    }).setOrigin(0.5);
    while (nameText.height > TITLE_MAX_H && titleFontSize > 8) {
      titleFontSize--;
      nameText.setFontSize(titleFontSize);
    }
    mc.add(nameText);

    // Description text (rich text) — same constraints as Card.ts
    const descrContainer = createRichDescription(this.scene, item.description || "", {
      maxWidth: DESCR_BG_W - 16,
      fontSize: 13,
      baseColor: "#ddd",
      maxHeight: DESCR_BG_H - 8,
      minFontSize: 8,
    });
    descrContainer.setPosition(0, DESCR_Y);
    mc.add(descrContainer);

    // Stat icons — on art area, at the art/description boundary
    const statY = -FULL_CARD_H / 2 + 8 + 18;
    const leftX = -FULL_CARD_W / 2 + 14;
    const rightX = FULL_CARD_W / 2 - 12;

    // Power icon — bottom-left of art
    const displayPower = item.value + powerBonus;
    const hasPower = item.type === CardType.Monster || (item.tag === "weapon" && !item.isKey) || (item.slot && item.slot !== "backpack" && displayPower > 0 && !item.isKey);
    if (hasPower) {
      const bg = this.scene.add.graphics();
      bg.fillStyle(0x000000, 0.4);
      bg.fillCircle(leftX, statY, 18);
      mc.add(bg);
      mc.add(this.scene.add.image(leftX, statY, "icon_card_power").setFlipX(true));
      mc.add(this.scene.add.text(leftX - 3.5, statY - 3.5, `${displayPower}`, {
        fontSize: "20px",
        fontFamily: FONT_UI,
        color: "#240a0e",
        fontStyle: "bold",
      }).setOrigin(0.5));
    }

    // Shield icon — bottom-right of art
    const armourAbility = item.abilities?.find(a => a.abilityId === "armour");
    if (armourAbility) {
      mc.add(this.scene.add.image(rightX, statY, "icon_shield"));
      mc.add(this.scene.add.text(rightX, statY - 4, `${armourAbility.params.amount}`, {
        fontSize: "20px",
        fontFamily: FONT_UI,
        color: "#240a0e",
        fontStyle: "bold",
      }).setOrigin(0.5));
    }

    // Agility icon — bottom-right of art (for cards with agilityBonus)
    if (item.agilityBonus) {
      const agiX = rightX + 4;
      const agiY = statY - 4;
      mc.add(this.scene.add.image(agiX, agiY, "icon_card_agility"));
      mc.add(this.scene.add.text(agiX - 12, agiY + 2, `${item.agilityBonus}`, {
        fontSize: "20px",
        fontFamily: FONT_UI,
        color: "#240a0e",
        fontStyle: "bold",
      }).setOrigin(0.5));
    }

    mc.setScale(s);
    return mc;
  }

  refreshSlot(slotName: string, powerBonus = 0): void {
    const item = this.inventory.getItem(slotName);
    this.updateSlotContent(slotName, item, powerBonus);
  }

  setSlotHighlight(
    slotName: string,
    state: "default" | "valid" | "invalid" | "valid_dim" | "invalid_dim"
  ): void {
    const visual = this.slotVisuals.get(slotName);
    if (!visual) return;

    const colorMap: Record<string, number> = {
      valid: BORDER_VALID,
      valid_dim: BORDER_VALID_DIM,
      invalid: BORDER_INVALID,
      invalid_dim: BORDER_INVALID_DIM,
      default: BORDER_DEFAULT,
    };
    this.drawSlotBg(visual.bg, colorMap[state] ?? BORDER_DEFAULT);
  }

  clearAllHighlights(): void {
    for (const [name] of this.slotVisuals) {
      this.setSlotHighlight(name, "default");
    }
  }

  getSlotAtPoint(worldX: number, worldY: number): string | null {
    for (const [name, visual] of this.slotVisuals) {
      const dx = worldX - visual.worldX;
      const dy = worldY - visual.worldY;
      if (
        Math.abs(dx) <= SLOT_W / 2 &&
        Math.abs(dy) <= SLOT_H / 2
      ) {
        return name;
      }
    }
    return null;
  }

  getSlotWorldPos(name: string): { x: number; y: number } | null {
    const visual = this.slotVisuals.get(name);
    if (!visual) return null;
    return { x: visual.worldX, y: visual.worldY };
  }

  getSlotContainer(name: string): Phaser.GameObjects.Container | null {
    const visual = this.slotVisuals.get(name);
    return visual?.container ?? null;
  }

  createDragGhost(card: CardData): Phaser.GameObjects.Container {
    return this.createMiniCard(card);
  }

  setSlotContentAlpha(slotName: string, alpha: number): void {
    const visual = this.slotVisuals.get(slotName);
    if (visual?.miniCard) {
      visual.miniCard.setAlpha(alpha);
    }
  }

  playDissolveAt(
    scene: Phaser.Scene,
    x: number,
    y: number,
    card: CardData
  ): void {
    const ghost = this.createMiniCard(card);
    ghost.setPosition(x, y);
    this.add(ghost);

    scene.tweens.add({
      targets: ghost,
      y: y - 60,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 400,
      ease: "Power2",
      onComplete: () => {
        ghost.destroy();
      },
    });
  }
}
