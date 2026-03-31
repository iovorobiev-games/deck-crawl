import Phaser from "phaser";
import { SpriteButton } from "./SpriteButton";
import { FONT_UI } from "../fonts";

const GAME_W = 1920;
const GAME_H = 1080;

export class GameOverScreen extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene) {
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

    // GAME OVER text
    const title = scene.add
      .text(GAME_W / 2, GAME_H / 2 - 80, "GAME OVER", {
        fontSize: "96px",
        fontFamily: FONT_UI,
        color: "#cc3333",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add(title);

    // Try Again button
    const btn = new SpriteButton(scene, GAME_W / 2, GAME_H / 2 + 80, 320, 80, "TRY AGAIN", {
      fontSize: "36px",
    });
    btn.on("pointerdown", () => {
      window.location.reload();
    });
    this.add(btn);

    scene.add.existing(this);
  }
}
