import Phaser from "phaser";

const GAME_W = 1920;
const GAME_H = 1080;
const CARD_W = 100;
const CARD_H = 140;
const GAP = 12;
const CORNER_R = 12;
const PANEL_PAD = 24;

export class FateDeckPopup extends Phaser.GameObjects.Container {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    fateDeck: number[]
  ) {
    super(scene, 0, 0);
    this.setDepth(1000);

    // Full-screen backdrop to dismiss on click
    const backdrop = scene.add.rectangle(
      GAME_W / 2,
      GAME_H / 2,
      GAME_W * 4,
      GAME_H * 4,
      0x000000,
      0.4
    );
    backdrop.setInteractive();
    backdrop.on("pointerdown", () => this.close());
    this.add(backdrop);

    // Panel sizing
    const totalCardsW = fateDeck.length * CARD_W + (fateDeck.length - 1) * GAP;
    const panelW = totalCardsW + PANEL_PAD * 2;
    const panelH = CARD_H + PANEL_PAD * 2 + 16; // extra for close button

    // Panel background
    const panelGfx = scene.add.graphics();
    panelGfx.fillStyle(0x12121e, 0.95);
    panelGfx.fillRoundedRect(
      x - panelW / 2,
      y - panelH / 2,
      panelW,
      panelH,
      20
    );
    panelGfx.lineStyle(1, 0x5555aa, 0.8);
    panelGfx.strokeRoundedRect(
      x - panelW / 2,
      y - panelH / 2,
      panelW,
      panelH,
      20
    );
    this.add(panelGfx);

    // Close button
    const closeBtn = scene.add
      .text(x + panelW / 2 - 20, y - panelH / 2 + 8, "\u2715", {
        fontSize: "28px",
        fontFamily: "monospace",
        color: "#ff5555",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0)
      .setInteractive()
      .setDepth(100);
    closeBtn.on("pointerdown", () => this.close());
    this.add(closeBtn);

    // Fate modifier cards
    const startX = x - totalCardsW / 2 + CARD_W / 2;
    const cardY = y + 8;

    fateDeck.forEach((mod, i) => {
      const cx = startX + i * (CARD_W + GAP);
      const card = this.createFateCard(scene, cx, cardY, mod);
      this.add(card);
    });

    scene.add.existing(this);
  }

  private createFateCard(
    scene: Phaser.Scene,
    x: number,
    y: number,
    modifier: number
  ): Phaser.GameObjects.Container {
    const container = scene.add.container(x, y);

    const bg = scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 1);
    bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CORNER_R);
    bg.lineStyle(1, 0x4444aa, 0.8);
    bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CORNER_R);
    container.add(bg);

    let color: string;
    let label: string;
    if (modifier > 0) {
      color = "#44dd88";
      label = `+${modifier}`;
    } else if (modifier < 0) {
      color = "#ff5555";
      label = `${modifier}`;
    } else {
      color = "#888888";
      label = "0";
    }

    const txt = scene.add
      .text(0, 0, label, {
        fontSize: "40px",
        fontFamily: "monospace",
        color,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    container.add(txt);

    container.setSize(CARD_W, CARD_H);
    container.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, CARD_W, CARD_H),
      Phaser.Geom.Rectangle.Contains
    );

    container.on("pointerover", () => {
      scene.tweens.add({
        targets: container,
        scaleX: 1.4,
        scaleY: 1.4,
        y: y - 20,
        duration: 150,
        ease: "Back.easeOut",
      });
      container.setDepth(10);
    });

    container.on("pointerout", () => {
      scene.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        y,
        duration: 150,
        ease: "Power2",
      });
      container.setDepth(0);
    });

    return container;
  }

  private close(): void {
    this.destroy();
  }
}
