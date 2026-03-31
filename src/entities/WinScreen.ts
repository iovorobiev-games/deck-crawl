import Phaser from "phaser";
import { Player } from "../systems/Player";
import { Inventory, SLOT_DEFS } from "../systems/Inventory";
import { CardData } from "./CardData";
import { SpriteButton } from "./SpriteButton";
import { FONT_UI } from "../fonts";

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
        fontFamily: FONT_UI,
        color: "#ddaa22",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add(title);

    // Subtitle
    const subtitle = scene.add
      .text(GAME_W / 2, 320, "You escaped the dungeon!", {
        fontSize: "32px",
        fontFamily: FONT_UI,
        color: "#ccbb88",
      })
      .setOrigin(0.5);
    this.add(subtitle);

    // Gold display
    const goldText = scene.add
      .text(GAME_W / 2, 400, `Gold: ${player.gold}`, {
        fontSize: "40px",
        fontFamily: FONT_UI,
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
            fontFamily: FONT_UI,
            color: "#cccccc",
          })
          .setOrigin(0.5);
        this.add(lootLine);
        lootY += 44;
      }
    }

    // PLAY AGAIN button
    const btnY = Math.max(lootY + 60, 760);
    const btn = new SpriteButton(scene, GAME_W / 2, btnY, 320, 80, "PLAY AGAIN", {
      fontSize: "36px",
    });
    btn.on("pointerdown", () => {
      window.location.reload();
    });
    this.add(btn);

    scene.add.existing(this);
  }
}
