import Phaser from "phaser";
import { SoundManager } from "../systems/SoundManager";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    // Sounds
    SoundManager.preload(this);
    // Background
    this.load.image("background", "sprites/Background.PNG");

    // Buttons
    this.load.image("button_bottom", "sprites/button_bottom.png");
    this.load.image("button_top", "sprites/button_top.png");

    // Tutorial
    this.load.image("tutorial_text_bg", "sprites/tutorial.png");
    this.load.image("pointer_1", "sprites/Pointer-1.png");
    this.load.image("pointer_2", "sprites/Pointer-2.png");

    // Grid & deck
    this.load.image("grid_item", "sprites/grid_item.PNG");
    this.load.image("card_back", "sprites/Card Back.PNG");

    // Player panel
    this.load.image("player_panel_bg", "sprites/player_panel_bg.PNG");
    this.load.image("player_portrait", "sprites/Player Portrait.PNG");
    this.load.image("fate_card", "sprites/Fate_Card.png");
    this.load.image("fate_card_face", "sprites/Fate_Card_Face.png");

    // Stat icons
    this.load.image("icon_power", "sprites/Power.PNG");
    this.load.image("icon_hp", "sprites/hp.PNG");
    this.load.image("icon_agility", "sprites/Agility.PNG");

    // Inventory slot backgrounds
    this.load.image("slot_left_arm", "sprites/Inventory_Hand_1.png");
    this.load.image("slot_right_arm", "sprites/Inventory_Hand_2.png");
    this.load.image("slot_head", "sprites/Inventory_Head.png");
    this.load.image("slot_armour", "sprites/Inventory_Body.png");
    this.load.image("slot_backpack1", "sprites/Inventory_Bag_1.png");
    this.load.image("slot_backpack2", "sprites/Inventory_Bag_2.png");

    // Card stat icons
    this.load.image("icon_card_power", "sprites/card_power.PNG");
    this.load.image("icon_shield", "sprites/shield.PNG");
    this.load.image("icon_gold", "sprites/gold.PNG");
    this.load.image("icon_lock", "sprites/lock.PNG");
    this.load.image("icon_card_agility", "sprites/Agility_small.png");
    this.load.image("tag_bg", "sprites/tag.png");

    // Card background sprites
    this.load.image("bg_monster", "sprites/Monster.PNG");
    this.load.image("bg_treasure", "sprites/Treasure.PNG");
    this.load.image("bg_event", "sprites/Event.PNG");

    // Description background sprites
    this.load.image("descr_monster", "sprites/monstr_descr_bg.PNG");
    this.load.image("descr_treasure", "sprites/treasure_descr_bg.PNG");
    this.load.image("descr_event", "sprites/event_descr.PNG");

    // Card art sprites
    this.load.image("Skeleton War", "sprites/Skeleton War.PNG");
    this.load.image("swarm_of_bats", "sprites/swarm_of_bats.PNG");
    this.load.image("Skeleton Archer", "sprites/Skeleton Archer.PNG");
    this.load.image("cultist", "sprites/cultist.PNG");
    this.load.image("vengeful_revenant", "sprites/vengeful_revenant.PNG");
    this.load.image("crypt_lord", "sprites/crypt_lord.PNG");
    this.load.image("healing_potion", "sprites/healing_potion.PNG");
    this.load.image("bear_trap", "sprites/bear_trap.PNG");
    this.load.image("pressure_plate", "sprites/pressure_plate.PNG");
    this.load.image("poison_dart_trap", "sprites/poison_dart_trap.PNG");
    this.load.image("shortsword", "sprites/shortsword.PNG");
    this.load.image("crude_axe", "sprites/crude_axe.PNG");
    this.load.image("wooden_shield", "sprites/wooden_shield.PNG");
    this.load.image("rusty_cuirass", "sprites/rusty_cuirass.PNG");
    this.load.image("metal_cuirass", "sprites/metal_cuirass.PNG");
    this.load.image("scroll_of_fireball", "sprites/scroll_of_fireball.PNG");
    this.load.image("altar_of_luck", "sprites/altar_of_luck.PNG");
    this.load.image("wooden_chest", "sprites/wooden_chest.PNG");
    this.load.image("hardened_chest", "sprites/hardened_chest.PNG");
    this.load.image("posh_chest", "sprites/posh_chest.PNG");
    this.load.image("rusty_key", "sprites/rusty_key.PNG");
    this.load.image("door", "sprites/door.PNG");
    this.load.image("attack_from_shadows", "sprites/attack_from_shadows.PNG");
    this.load.image("pile_of_gold", "sprites/pile_of_gold.PNG");
    this.load.image("dark_ritual", "sprites/dark_ritual.PNG");
    this.load.image("horrendous_tentacle", "sprites/horrendous_tentacle.PNG");
    this.load.image("horror_from_beyond", "sprites/horror_from_beyond.PNG");
    this.load.image("poison", "sprites/poison.PNG");
    this.load.image("rusty_sword", "sprites/rusty_sword.PNG");
    this.load.image("weapon_degradation", "sprites/weapon_degradation.PNG");

    // New card art sprites
    this.load.image("Zombie", "sprites/Zombie.PNG");
    this.load.image("dark_knight", "sprites/dark_knight.PNG");
    this.load.image("knights_sword", "sprites/knights_sword.PNG");
    this.load.image("shortbow", "sprites/shortbow.PNG");
    this.load.image("elven_bow", "sprites/elven_bow.PNG");
    this.load.image("spiked_shield", "sprites/spiked_shield.PNG");
    this.load.image("knights_shield", "sprites/knights_shield.PNG");
    this.load.image("cloak_of_swiftness", "sprites/cloak_of_swiftness.PNG");
    this.load.image("quiver", "sprites/quiver.PNG");
    this.load.image("phylactery", "sprites/phylactery.PNG");
    this.load.image("lockpicks", "sprites/lockpicks.PNG");
    this.load.image("disarming_kit", "sprites/disarming_kit.PNG");
    this.load.image("scroll_of_firebolt", "sprites/scroll_of_firebolt.PNG");
    this.load.image("scroll_of_cleansing", "sprites/scroll_of_cleansing.PNG");
    this.load.image("scroll_of_blessing", "sprites/scroll_of_blessing.PNG");
    this.load.image("bow_shot", "sprites/bow_shot.PNG");
    this.load.image("hidden_pit", "sprites/hidden_pit.PNG");
    this.load.image("ominuous_chest", "sprites/ominuous_chest.PNG");
    this.load.image("strong_chest", "sprites/strong_chest.PNG");

    // Equipment sprites
    this.load.image("wizard_hat", "sprites/wizard_hat.PNG");
    this.load.image("mages_robe", "sprites/mages_robe.PNG");
    this.load.image("warrior_helm", "sprites/warrior_helm.PNG");
    this.load.image("marksman_hat", "sprites/marksman_hat.PNG");
    this.load.image("cape", "sprites/cape.PNG");
  }

  create(): void {
    // Generate a small circle texture for particle effects
    const gfx = this.add.graphics();
    gfx.fillStyle(0xffffff);
    gfx.fillCircle(8, 8, 8);
    gfx.generateTexture("particle_circle", 16, 16);
    gfx.clear();
    gfx.fillStyle(0xffffff);
    gfx.fillRect(0, 0, 16, 16);
    gfx.generateTexture("particle_square", 16, 16);
    gfx.destroy();

    const fontReady = Promise.all([
      document.fonts.load('16px "Bonescript"'),
      document.fonts.load('16px "Dungeon Mode"'),
      document.fonts.load('16px "Antiquity Print"'),
    ]);
    const timeout = new Promise<void>(r => setTimeout(r, 2000));
    Promise.race([fontReady, timeout]).then(() => {
      this.scene.start("MainMenuScene");
    });
  }
}
