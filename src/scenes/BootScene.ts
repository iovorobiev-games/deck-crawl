import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    // Background
    this.load.image("background", "sprites/Background.PNG");

    // Grid & deck
    this.load.image("grid_item", "sprites/grid_item.PNG");
    this.load.image("card_back", "sprites/Card Back.PNG");

    // Player panel
    this.load.image("player_panel_bg", "sprites/player_panel_bg.PNG");
    this.load.image("player_portrait", "sprites/Player Portrait.PNG");

    // Stat icons
    this.load.image("icon_power", "sprites/Power.PNG");
    this.load.image("icon_hp", "sprites/hp.PNG");
    this.load.image("icon_agility", "sprites/Agility.PNG");

    // Inventory slot backgrounds
    this.load.image("slot_left_arm", "sprites/left_arm.PNG");
    this.load.image("slot_right_arm", "sprites/right_arm.PNG");
    this.load.image("slot_head", "sprites/head.PNG");
    this.load.image("slot_armour", "sprites/armour_slot.PNG");
    this.load.image("slot_backpack1", "sprites/backpack_1.PNG");
    this.load.image("slot_backpack2", "sprites/backpack_2.PNG");
  }

  create(): void {
    this.scene.start("GameScene");
  }
}
