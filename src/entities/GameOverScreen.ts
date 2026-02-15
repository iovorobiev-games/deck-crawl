import Phaser from "phaser";

const GAME_W = 960;
const GAME_H = 540;

export class GameOverScreen extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setDepth(2000);

    // Dark backdrop
    const backdrop = scene.add.rectangle(
      GAME_W / 2,
      GAME_H / 2,
      GAME_W * 4,
      GAME_H * 4,
      0x000000,
      0.7
    );
    this.add(backdrop);

    // GAME OVER text
    const title = scene.add
      .text(GAME_W / 2, GAME_H / 2 - 40, "GAME OVER", {
        fontSize: "48px",
        fontFamily: "monospace",
        color: "#cc3333",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add(title);

    // Try Again button
    const btnW = 160;
    const btnH = 40;
    const btn = scene.add.container(GAME_W / 2, GAME_H / 2 + 40);

    const btnBg = scene.add.graphics();
    btnBg.fillStyle(0x3355aa, 1);
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
    btnBg.lineStyle(2, 0x6688ee, 0.8);
    btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
    btn.add(btnBg);

    const btnText = scene.add
      .text(0, 0, "TRY AGAIN", {
        fontSize: "18px",
        fontFamily: "monospace",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    btn.add(btnText);

    btn.setSize(btnW, btnH);
    btn.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, btnW, btnH),
      Phaser.Geom.Rectangle.Contains
    );

    btn.on("pointerover", () => {
      btnBg.clear();
      btnBg.fillStyle(0x4466cc, 1);
      btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
      btnBg.lineStyle(2, 0x6688ee, 0.8);
      btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
    });

    btn.on("pointerout", () => {
      btnBg.clear();
      btnBg.fillStyle(0x3355aa, 1);
      btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
      btnBg.lineStyle(2, 0x6688ee, 0.8);
      btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
    });

    btn.on("pointerdown", () => {
      scene.scene.restart();
    });

    this.add(btn);

    scene.add.existing(this);
  }
}
