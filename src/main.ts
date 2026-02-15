import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#0e0e1a",
  scene: [BootScene, GameScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: 960,
    height: 540,
  },
  render: {
    roundPixels: true,
  },
};

new Phaser.Game(config);
