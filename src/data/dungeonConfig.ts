import { DeckEntry } from "./deckConfig";

export interface DungeonLevel {
  name: string;
  flavorText: string;
  cards: DeckEntry[];
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
        // Encounters
        { id: "skeleton", count: 2 },
        { id: "skeleton_archer", count: 1 },
        { id: "zombie", count: 3 },
        { id: "wooden_chest", count: 1 },
        { id: "ominous_chest", count: 1 },
        { id: "swarm_of_bats", count: 1 },
        { id: "pressure_plate", count: 2 },
        { id: "gold_pile_small", count: 1 },
        { id: "gold_pile_3", count: 1 },
        { id: "lesser_health_potion", count: 1 },
        // Treasure / loot
        { id: "minor_health_potion", count: 1 },
        { id: "lockpick", count: 1 },
        { id: "disarm_kit", count: 1 },
        { id: "altar_of_luck", count: 1 },
        { id: "wooden_shield", count: 1 },
        { id: "cloak_of_swiftness", count: 1 },
        { id: "rusty_sword", count: 1 },
        { id: "shortbow", count: 1 },
        { id: "quiver", count: 1 },
      ],
      boss: "cultist",
      key: "rusty_key",
      door: "hall_door",
    },
    {
      name: "Underground Temple",
      flavorText: "Ancient carvings line the walls...",
      cards: [
        // Encounters
        { id: "cultist", count: 2 },
        { id: "bloated_zombie", count: 2 },
        { id: "zombie", count: 1 },
        { id: "skeleton", count: 1 },
        { id: "swarm_of_bats", count: 1 },
        { id: "rusty_chest", count: 1 },
        { id: "trapped_chest", count: 1 },
        { id: "hardened_chest", count: 1 },
        { id: "spike_trap", count: 1 },
        { id: "hidden_pit", count: 1 },
        { id: "minor_health_potion", count: 1 },
        { id: "gold_pile_3", count: 1 },
        { id: "gold_pile_medium", count: 1 },
        { id: "quiver", count: 1 },
        // Treasure / loot
        { id: "minor_health_potion", count: 1 },
        { id: "rusty_armour", count: 1 },
        { id: "lockpick", count: 1 },
        { id: "disarm_kit", count: 1 },
        { id: "spiked_shield", count: 1 },
        { id: "guardsman_sword", count: 1 },
        { id: "scroll_of_cleansing", count: 1 },
        { id: "scroll_of_fire_bolt", count: 1 },
        { id: "wooden_shield", count: 1 },
        { id: "ogre_axe", count: 1 },
      ],
      boss: "vengeful_revenant",
      key: "temple_key",
      door: "temple_gate",
    },
    {
      name: "Torture Rooms",
      flavorText: "Screams echo from the darkness...",
      cards: [
        // Encounters
        { id: "swarm_of_bats", count: 1 },
        { id: "skeleton", count: 1 },
        { id: "skeleton_archer", count: 2 },
        { id: "bloated_zombie", count: 1 },
        { id: "zombie", count: 1 },
        { id: "dark_knight", count: 1 },
        { id: "cultist", count: 2 },
        { id: "trapped_chest", count: 2 },
        { id: "hardened_chest", count: 2 },
        { id: "poison_dart_trap", count: 1 },
        { id: "bear_trap", count: 1 },
        { id: "minor_health_potion", count: 1 },
        { id: "quiver", count: 1 },
        { id: "gold_pile_large", count: 1 },
        { id: "rusty_sword", count: 1 },
        // Treasure / loot
        { id: "phylactery", count: 1 },
        { id: "health_potion", count: 1 },
        { id: "elven_bow", count: 1 },
        { id: "guardsman_armour", count: 1 },
        { id: "knights_sword", count: 1 },
        { id: "fireball_scroll", count: 1 },
        { id: "lockpick", count: 1 },
        { id: "scroll_of_blessing", count: 1 },
        { id: "guardsman_shield", count: 1 },
        { id: "spiked_shield", count: 1 },
        { id: "scroll_of_fire_bolt", count: 2 },
        { id: "disarm_kit", count: 1 },
      ],
      boss: "crypt_lord",
      key: "master_key",
      door: "final_door",
    },
  ],
};
