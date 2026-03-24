import { DeckEntry } from "./deckConfig";

export interface LootEntry {
  id: string;
  weight: number;
  maxCount: number;
}

export interface LootConfig {
  guaranteed?: string[];
  pool: LootEntry[];
  bufferSize: number;
}

export interface DungeonLevel {
  name: string;
  flavorText: string;
  cards: DeckEntry[];
  loot: LootConfig;
  boss: string;
  /** Card ID that must be discarded before the boss drops the key. */
  keyCondition?: string;
  key: string;
  door: string;
}

export interface DungeonConfig {
  name: string;
  levels: DungeonLevel[];
}

export const dungeonConfig: DungeonConfig = {
  name: "Dungeon Decks",
  levels: [
    {
      name: "Greeting Hall",
      flavorText: "The entrance is deceptively calm...",
      cards: [
        { id: "skeleton", weight: 3 },
        { id: "skeleton_archer", weight: 1 },
        { id: "zombie", weight: 3 },
        { id: "wooden_chest", weight: 1 },
        { id: "ominous_chest", weight: 1 },
        { id: "swarm_of_bats", weight: 1 },
        { id: "gold_pile_3", weight: 1 },
        { id: "lockpick", weight: 1 },
      ],
      loot: {
        pool: [
          // Potions (consumable)
          { id: "lesser_health_potion", weight: 5.5, maxCount: 3 },
          { id: "minor_health_potion", weight: 4, maxCount: 3 },
          { id: "health_potion", weight: 1.5, maxCount: 2 },
          // Tools (consumable)
          { id: "lockpick", weight: 4.5, maxCount: 3 },
          { id: "altar_of_luck", weight: 6, maxCount: 2 },
          { id: "poison_vial", weight: 3.5, maxCount: 3 },
          // Shields (constant)
          { id: "wooden_shield", weight: 1.3, maxCount: 3 },
          { id: "spiked_shield", weight: 0.08, maxCount: 2 },
          { id: "guardsman_shield", weight: 0.35, maxCount: 2 },
          // Armour (constant)
          { id: "cloak_of_swiftness", weight: 0.35, maxCount: 2 },
          { id: "rusty_armour", weight: 1, maxCount: 2 },
          { id: "guardsman_armour", weight: 0.15, maxCount: 1 },
          { id: "wizards_robe", weight: 0.15, maxCount: 1 },
          { id: "marksman_cloak", weight: 0.35, maxCount: 1 },
          // Head (constant)
          { id: "warrior_helm", weight: 0.05, maxCount: 1 },
          { id: "wizard_hat", weight: 0.15, maxCount: 1 },
          { id: "marksman_hat", weight: 0.15, maxCount: 2 },
          { id: "ranger_cape", weight: 0.2, maxCount: 1 },
          // Weapons (degrading: rusty_sword, crude_axe, ogre_axe; constant: rest)
          { id: "rusty_sword", weight: 3, maxCount: 3 },
          { id: "guardsman_sword", weight: 0.15, maxCount: 2 },
          { id: "knights_sword", weight: 0.06, maxCount: 1 },
          { id: "ogre_axe", weight: 0.7, maxCount: 2 },
          { id: "crude_axe", weight: 0.7, maxCount: 2 },
          { id: "shortbow", weight: 2, maxCount: 3 },
          { id: "elven_bow", weight: 0.25, maxCount: 1 },
          // Backpack (constant)
          { id: "quiver", weight: 1.3, maxCount: 3 },
          // Scrolls (consumable)
          { id: "fireball_scroll", weight: 2.5, maxCount: 2 },
          { id: "scroll_of_fire_bolt", weight: 4.5, maxCount: 3 },
          { id: "scroll_of_cleansing", weight: 4.5, maxCount: 3 },
          { id: "scroll_of_blessing", weight: 5, maxCount: 3 },
        ],
        bufferSize: 6,
      },
      boss: "cultist",
      key: "rusty_key",
      door: "hall_door",
    },
    {
      name: "Underground Temple",
      flavorText: "Ancient carvings line the walls...",
      cards: [
        { id: "cultist", weight: 2 },
        { id: "bloated_zombie", weight: 2 },
        { id: "zombie", weight: 2 },
        { id: "skeleton", weight: 1 },
        { id: "swarm_of_bats", weight: 1 },
        { id: "rusty_chest", weight: 1 },
        { id: "trapped_chest", weight: 1 },
        { id: "hardened_chest", weight: 1 },
        { id: "spike_trap", weight: 1 },
        { id: "hidden_pit", weight: 1 },
        { id: "gold_pile_medium", weight: 1 },
        { id: "quiver", weight: 1 },
        { id: "lockpick", weight: 1 },
      ],
      loot: {
        pool: [
          // Potions
          { id: "lesser_health_potion", weight: 2, maxCount: 3 },
          { id: "minor_health_potion", weight: 4, maxCount: 3 },
          { id: "health_potion", weight: 4, maxCount: 3 },
          // Tools
          { id: "lockpick", weight: 2, maxCount: 3 },
          { id: "disarm_kit", weight: 2, maxCount: 3 },
          { id: "altar_of_luck", weight: 0.5, maxCount: 2 },
          { id: "poison_vial", weight: 2, maxCount: 3 },
          // Shields
          { id: "wooden_shield", weight: 2, maxCount: 3 },
          { id: "spiked_shield", weight: 3, maxCount: 3 },
          { id: "guardsman_shield", weight: 2, maxCount: 3 },
          // Armour
          { id: "cloak_of_swiftness", weight: 1, maxCount: 2 },
          { id: "rusty_armour", weight: 1, maxCount: 2 },
          { id: "guardsman_armour", weight: 2, maxCount: 2 },
          { id: "wizards_robe", weight: 2, maxCount: 2 },
          { id: "marksman_cloak", weight: 1, maxCount: 2 },
          // Head
          { id: "warrior_helm", weight: 1.5, maxCount: 1 },
          { id: "wizard_hat", weight: 3, maxCount: 2 },
          { id: "marksman_hat", weight: 2, maxCount: 2 },
          { id: "ranger_cape", weight: 1.5, maxCount: 2 },
          // Weapons
          { id: "rusty_sword", weight: 3, maxCount: 3 },
          { id: "guardsman_sword", weight: 4, maxCount: 3 },
          { id: "knights_sword", weight: 1.5, maxCount: 1 },
          { id: "battle_axe", weight: 1, maxCount: 1 },
          { id: "ogre_axe", weight: 3, maxCount: 3 },
          { id: "crude_axe", weight: 2, maxCount: 3 },
          { id: "shortbow", weight: 1.5, maxCount: 3 },
          { id: "elven_bow", weight: 2.5, maxCount: 2 },
          // Backpack
          { id: "quiver", weight: 1, maxCount: 3 },
          // Scrolls
          { id: "fireball_scroll", weight: 2, maxCount: 3 },
          { id: "scroll_of_fire_bolt", weight: 3, maxCount: 3 },
          { id: "scroll_of_cleansing", weight: 1, maxCount: 3 },
          { id: "scroll_of_blessing", weight: 1, maxCount: 3 },
        ],
        bufferSize: 8,
      },
      boss: "vengeful_revenant",
      key: "temple_key",
      door: "temple_gate",
    },
    {
      name: "Torture Rooms",
      flavorText: "Screams echo from the darkness...",
      cards: [
        { id: "swarm_of_bats", weight: 1 },
        { id: "skeleton_archer", weight: 2 },
        { id: "bloated_zombie", weight: 1 },
        { id: "dark_knight", weight: 1 },
        { id: "cultist", weight: 2 },
        { id: "trapped_chest", weight: 2 },
        { id: "hardened_chest", weight: 2 },
        { id: "poison_dart_trap", weight: 1 },
        { id: "bear_trap", weight: 1 },
        { id: "pressure_plate", weight: 2 },
        { id: "quiver", weight: 1 },
        { id: "gold_pile_large", weight: 1 },
        { id: "lockpick", weight: 1 },
      ],
      loot: {
        guaranteed: ["phylactery"],
        pool: [
          // Potions
          { id: "lesser_health_potion", weight: 1.5, maxCount: 3 },
          { id: "minor_health_potion", weight: 2.5, maxCount: 3 },
          { id: "health_potion", weight: 7, maxCount: 3 },
          // Tools
          { id: "lockpick", weight: 1, maxCount: 3 },
          { id: "disarm_kit", weight: 1, maxCount: 3 },
          { id: "altar_of_luck", weight: 0.5, maxCount: 2 },
          { id: "poison_vial", weight: 2, maxCount: 3 },
          // Shields
          { id: "wooden_shield", weight: 1, maxCount: 3 },
          { id: "spiked_shield", weight: 5, maxCount: 3 },
          { id: "guardsman_shield", weight: 1, maxCount: 3 },
          // Armour
          { id: "cloak_of_swiftness", weight: 0.5, maxCount: 2 },
          { id: "rusty_armour", weight: 0.5, maxCount: 2 },
          { id: "guardsman_armour", weight: 4, maxCount: 2 },
          { id: "wizards_robe", weight: 3, maxCount: 2 },
          { id: "marksman_cloak", weight: 2, maxCount: 2 },
          // Head
          { id: "warrior_helm", weight: 5, maxCount: 1 },
          { id: "wizard_hat", weight: 3, maxCount: 2 },
          { id: "marksman_hat", weight: 2, maxCount: 2 },
          { id: "ranger_cape", weight: 2, maxCount: 2 },
          // Weapons
          { id: "rusty_sword", weight: 1, maxCount: 3 },
          { id: "guardsman_sword", weight: 4, maxCount: 3 },
          { id: "knights_sword", weight: 5, maxCount: 2 },
          { id: "battle_axe", weight: 3, maxCount: 1 },
          { id: "ogre_axe", weight: 4, maxCount: 3 },
          { id: "crude_axe", weight: 4, maxCount: 3 },
          { id: "shortbow", weight: 1, maxCount: 3 },
          { id: "elven_bow", weight: 5, maxCount: 2 },
          // Backpack
          { id: "quiver", weight: 1, maxCount: 3 },
          // Scrolls
          { id: "fireball_scroll", weight: 3.5, maxCount: 3 },
          { id: "scroll_of_fire_bolt", weight: 5, maxCount: 4 },
          { id: "scroll_of_cleansing", weight: 2, maxCount: 3 },
          { id: "scroll_of_blessing", weight: 2, maxCount: 3 },
        ],
        bufferSize: 8,
      },
      boss: "crypt_lord",
      keyCondition: "phylactery",
      key: "master_key",
      door: "final_door",
    },
  ],
};
