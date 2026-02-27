import Phaser from "phaser";
import { Inventory, SLOT_DEFS, SlotDef } from "../systems/Inventory";
import { CardData, CardColorMap } from "./CardData";

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

  private updateSlotContent(slotName: string, item: CardData | null): void {
    const visual = this.slotVisuals.get(slotName);
    if (!visual) return;

    // Remove existing mini-card
    if (visual.miniCard) {
      visual.miniCard.destroy();
      visual.miniCard = null;
    }

    if (item) {
      visual.slotBgImage?.setVisible(false);
      visual.miniCard = this.createMiniCard(item);
      visual.container.add(visual.miniCard);
    } else {
      visual.slotBgImage?.setVisible(true);
    }
  }

  private createMiniCard(item: CardData): Phaser.GameObjects.Container {
    const mc = this.scene.add.container(0, 0);
    const color = CardColorMap[item.type];
    const miniW = SLOT_W - 20;
    const miniH = SLOT_H - 20;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 1);
    bg.fillRoundedRect(-miniW / 2, -miniH / 2, miniW, miniH, 8);
    bg.lineStyle(1, color, 1);
    bg.strokeRoundedRect(-miniW / 2, -miniH / 2, miniW, miniH, 8);
    // Color band
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-miniW / 2, -miniH / 2, miniW, 36, {
      tl: 8,
      tr: 8,
      bl: 0,
      br: 0,
    });
    mc.add(bg);

    const nameText = this.scene.add
      .text(0, 4, item.name, {
        fontSize: "18px",
        fontFamily: "monospace",
        color: "#ddd",
        align: "center",
        wordWrap: { width: miniW - 12 },
      })
      .setOrigin(0.5);
    mc.add(nameText);

    if (item.value > 0) {
      const valText = this.scene.add
        .text(0, miniH / 2 - 32, `+${item.value}`, {
          fontSize: "28px",
          fontFamily: "monospace",
          color: "#ffdd44",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      mc.add(valText);
    }

    return mc;
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
