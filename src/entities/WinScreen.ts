import Phaser from "phaser";
import { Player } from "../systems/Player";
import { Inventory, SLOT_DEFS } from "../systems/Inventory";
import { CardData } from "./CardData";

const GAME_W = 1920;
const GAME_H = 1080;

export class WinScreen extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, player: Player, inventory: Inventory) {
    super(scene, 0, 0);
    this.setDepth(2000);

    // Dark backdrop
    const backdrop = scene.add.rectangle(
      GAME_W / 2,
      GAME_H / 2,
      GAME_W,
      GAME_H,
      0x000000,
      0.7
    );
    this.add(backdrop);

    // VICTORY! title
    const title = scene.add
      .text(GAME_W / 2, 240, "VICTORY!", {
        fontSize: "96px",
        fontFamily: "monospace",
        color: "#ddaa22",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add(title);

    // Subtitle
    const subtitle = scene.add
      .text(GAME_W / 2, 320, "You escaped the dungeon!", {
        fontSize: "32px",
        fontFamily: "monospace",
        color: "#ccbb88",
      })
      .setOrigin(0.5);
    this.add(subtitle);

    // Gold display
    const goldText = scene.add
      .text(GAME_W / 2, 400, `Gold: ${player.gold}`, {
        fontSize: "40px",
        fontFamily: "monospace",
        color: "#ffdd44",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add(goldText);

    // Equipped loot list
    let lootY = 470;
    for (const def of SLOT_DEFS) {
      const item: CardData | null = inventory.getItem(def.name);
      if (item) {
        const lootLine = scene.add
          .text(GAME_W / 2, lootY, `${def.label}: ${item.name} (+${item.value})`, {
            fontSize: "28px",
            fontFamily: "monospace",
            color: "#cccccc",
          })
          .setOrigin(0.5);
        this.add(lootLine);
        lootY += 44;
      }
    }

    // PLAY AGAIN button
    const btnW = 320;
    const btnH = 80;
    const btnY = Math.max(lootY + 60, 760);
    const btn = scene.add.container(GAME_W / 2, btnY);

    const btnBg = scene.add.graphics();
    btnBg.fillStyle(0x33aa55, 1);
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16);
    btnBg.lineStyle(3, 0x44bb66, 0.8);
    btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16);
    btn.add(btnBg);

    const btnText = scene.add
      .text(0, 0, "PLAY AGAIN", {
        fontSize: "36px",
        fontFamily: "monospace",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    btn.add(btnText);

    btn.setSize(btnW, btnH);
    btn.setInteractive(
      new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH),
      Phaser.Geom.Rectangle.Contains
    );

    btn.on("pointerover", () => {
      btnBg.clear();
      btnBg.fillStyle(0x44bb66, 1);
      btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16);
      btnBg.lineStyle(3, 0x44bb66, 0.8);
      btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16);
    });

    btn.on("pointerout", () => {
      btnBg.clear();
      btnBg.fillStyle(0x33aa55, 1);
      btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16);
      btnBg.lineStyle(3, 0x44bb66, 0.8);
      btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16);
    });

    btn.on("pointerdown", () => {
      scene.scene.restart();
    });

    this.add(btn);

    scene.add.existing(this);
  }
}
