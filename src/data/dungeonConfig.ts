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
        // Monsters
        { id: "zombie", count: 3 },
        { id: "bloated_zombie", count: 2 },
        { id: "skeleton_archer", count: 2 },
        { id: "dark_knight", count: 1 },
        { id: "skeleton", count: 2 },
        // Weapons & shields
        { id: "guardsman_sword", count: 1 },
        { id: "knights_sword", count: 1 },
        { id: "shortbow", count: 1 },
        { id: "spiked_shield", count: 1 },
        // Armour
        { id: "cloak_of_swiftness", count: 1 },
        { id: "guardsman_armour", count: 1 },
        // Consumables & scrolls
        { id: "poison_vial", count: 1 },
        { id: "lockpick", count: 1 },
        { id: "scroll_of_fire_bolt", count: 1 },
        { id: "scroll_of_blessing", count: 1 },
        // Potions
        { id: "health_potion", count: 2 },
        { id: "lesser_health_potion", count: 1 },
        // Traps & chests
        { id: "pressure_plate", count: 1 },
        { id: "hidden_pit", count: 1 },
        { id: "ominous_chest", count: 1 },
        { id: "hardened_chest", count: 1 },
        // Gold & events
        { id: "gold_pile_3", count: 2 },
        { id: "bow_shot", count: 1 },
        { id: "phylactery", count: 1 },
      ],
      boss: "crypt_lord",
      key: "rusty_key",
      door: "hall_door",
    },
    {
      name: "Underground Temple",
      flavorText: "Ancient carvings line the walls...",
      cards: [
        { id: "skeleton", count: 3 },
        { id: "skeleton_warrior", count: 2 },
        { id: "health_potion", count: 2 },
        { id: "poison_gas", count: 2 },
        { id: "crude_axe", count: 1 },
        { id: "chain_mail", count: 1 },
        { id: "fireball_scroll", count: 1 },
        { id: "iron_chest", count: 2 },
        { id: "attack_from_shadows", count: 1 },
        { id: "altar_of_luck", count: 1 },
        { id: "gold_pile_medium", count: 2 },
        { id: "swarm_of_bats", count: 1 },
      ],
      boss: "vengeful_revenant",
      key: "temple_key",
      door: "temple_gate",
    },
    {
      name: "Torture Rooms",
      flavorText: "Screams echo from the darkness...",
      cards: [
        { id: "skeleton_warrior", count: 3 },
        { id: "skeleton", count: 1 },
        { id: "health_potion", count: 2 },
        { id: "spike_trap_heavy", count: 2 },
        { id: "crown", count: 1 },
        { id: "merchant", count: 1 },
        { id: "iron_chest_heavy", count: 1 },
        { id: "attack_from_shadows", count: 1 },
        { id: "gold_pile_large", count: 2 },
        { id: "swarm_of_bats", count: 1 },
      ],
      boss: "crypt_lord",
      key: "master_key",
      door: "final_door",
    },
  ],
};
