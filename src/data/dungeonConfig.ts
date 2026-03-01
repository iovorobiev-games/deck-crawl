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
        { id: "skeleton_warrior", count: 4 },
        { id: "skeleton", count: 2 },
        { id: "health_potion", count: 3 },
        { id: "spike_trap", count: 2 },
        { id: "short_sword", count: 2 },
        { id: "leather_armour", count: 2 },
        { id: "iron_helm", count: 2 },
        { id: "wooden_chest", count: 2 },
        { id: "attack_from_shadows", count: 1 },
      ],
      boss: "cultist",
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
        { id: "battle_axe", count: 1 },
        { id: "chain_mail", count: 1 },
        { id: "fireball_scroll", count: 1 },
        { id: "iron_chest", count: 2 },
        { id: "attack_from_shadows", count: 1 },
        { id: "altar_of_luck", count: 1 },
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
      ],
      boss: "crypt_lord",
      key: "master_key",
      door: "final_door",
    },
  ],
};
