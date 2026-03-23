import Phaser from "phaser";
import { Inventory, SLOT_DEFS, SlotDef } from "../systems/Inventory";
import { CardData, CardType, CardColorMap, CardBackgroundMap, CardDescrMap, CardTitleColorMap } from "./CardData";
import { CARD_W as FULL_CARD_W, CARD_H as FULL_CARD_H } from "./Card";

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
  head: 764,
  weapon2: 596,
  weapon1: 428,
  armour: 1156,
  backpack1: 1324,
  backpack2: 1492,
};

const SLOT_Y = 910;

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
      slotBgImage = this.scene.add.image(0, 0, slotSpriteKey);
      container.add(slotBgImage);
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
      visual.slotBgImage?.setVisible(false);
      visual.miniCard = this.createMiniCard(item, powerBonus);
      visual.container.add(visual.miniCard);
    } else {
      visual.slotBgImage?.setVisible(true);
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

    // Title text
    const nameText = this.scene.add.text(0, TITLE_Y, item.name, {
      fontSize: "14px",
      fontFamily: "monospace",
      color: CardTitleColorMap[item.type],
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: 148 },
    }).setOrigin(0.5);
    mc.add(nameText);

    // Description text
    const descrText = this.scene.add.text(0, DESCR_Y, item.description || "", {
      fontSize: "13px",
      fontFamily: "monospace",
      color: "#ddd",
      align: "center",
      wordWrap: { width: DESCR_BG_W - 16 },
    }).setOrigin(0.5);
    mc.add(descrText);

    // Power icon — bottom-left
    const displayPower = item.value + powerBonus;
    const hasPower = item.type === CardType.Monster || (item.slot && item.slot !== "backpack" && displayPower > 0 && !item.isKey);
    if (hasPower) {
      const iconX = -FULL_CARD_W / 2 + 15;
      const iconY = FULL_CARD_H / 2 - 12;
      mc.add(this.scene.add.image(iconX, iconY, "icon_card_power"));
      mc.add(this.scene.add.text(iconX + 3.5, iconY - 3.5, `${displayPower}`, {
        fontSize: "20px",
        fontFamily: "monospace",
        color: "#240a0e",
        fontStyle: "bold",
      }).setOrigin(0.5));
    }

    // Shield icon — bottom-right
    const armourAbility = item.abilities?.find(a => a.abilityId === "armour");
    if (armourAbility) {
      const iconX = FULL_CARD_W / 2 - 9;
      const iconY = FULL_CARD_H / 2 - 12;
      mc.add(this.scene.add.image(iconX, iconY, "icon_shield"));
      mc.add(this.scene.add.text(iconX, iconY - 4, `${armourAbility.params.amount}`, {
        fontSize: "20px",
        fontFamily: "monospace",
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
