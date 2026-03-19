import { DeckEntry } from "./deckConfig";

export interface DungeonLevel {
  name: string;
  flavorText: string;
  cards: DeckEntry[];
  loot: DeckEntry[];
  boss: string;
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
      loot: [
        { id: "minor_health_potion", weight: 1 },
        { id: "lockpick", weight: 1 },
        { id: "altar_of_luck", weight: 1 },
        { id: "wooden_shield", weight: 1 },
        { id: "cloak_of_swiftness", weight: 1 },
        { id: "rusty_sword", weight: 1 },
        { id: "shortbow", weight: 1 },
        { id: "quiver", weight: 1 },
        { id: "rusty_armour", weight: 1 },
        { id: "scroll_of_fire_bolt", weight: 1 },
      ],
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
      loot: [
        { id: "minor_health_potion", weight: 1 },
        { id: "lockpick", weight: 1 },
        { id: "disarm_kit", weight: 1 },
        { id: "spiked_shield", weight: 1 },
        { id: "guardsman_sword", weight: 1 },
        { id: "scroll_of_fire_bolt", weight: 1 },
        { id: "scroll_of_cleansing", weight: 1 },
        { id: "wooden_shield", weight: 1 },
        { id: "ogre_axe", weight: 1 },
        { id: "wizard_hat", weight: 1 },
        { id: "marksman_hat", weight: 1 },
        { id: "warrior_helm", weight: 1 },
      ],
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
      loot: [
        { id: "minor_health_potion", weight: 1 },
        { id: "phylactery", weight: 1 },
        { id: "health_potion", weight: 1 },
        { id: "elven_bow", weight: 1 },
        { id: "guardsman_armour", weight: 1 },
        { id: "knights_sword", weight: 1 },
        { id: "fireball_scroll", weight: 1 },
        { id: "lockpick", weight: 1 },
        { id: "scroll_of_blessing", weight: 1 },
        { id: "guardsman_shield", weight: 1 },
        { id: "spiked_shield", weight: 1 },
        { id: "scroll_of_fire_bolt", weight: 2 },
        { id: "disarm_kit", weight: 2 },
        { id: "wizards_robe", weight: 1 },
        { id: "marksman_cloak", weight: 1 },
        { id: "ranger_cape", weight: 1 },
      ],
      boss: "crypt_lord",
      key: "master_key",
      door: "final_door",
    },
  ],
};
