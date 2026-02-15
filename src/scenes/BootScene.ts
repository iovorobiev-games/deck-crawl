import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    // Future: load sprite sheets, audio, etc.
  }

  create(): void {
    this.scene.start("GameScene");
  }
}
