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
        { id: "goblin", count: 4 },
        { id: "skeleton", count: 2 },
        { id: "health_potion", count: 3 },
        { id: "spike_trap", count: 2 },
        { id: "short_sword", count: 2 },
        { id: "leather_armour", count: 2 },
        { id: "iron_helm", count: 2 },
        { id: "wooden_chest", count: 2 },
      ],
      boss: "goblin_chief",
      key: "rusty_key",
      door: "hall_door",
    },
    {
      name: "Underground Temple",
      flavorText: "Ancient carvings line the walls...",
      cards: [
        { id: "dark_acolyte", count: 3 },
        { id: "stone_golem", count: 2 },
        { id: "health_potion", count: 2 },
        { id: "poison_gas", count: 2 },
        { id: "battle_axe", count: 1 },
        { id: "chain_mail", count: 1 },
        { id: "fireball_scroll", count: 1 },
        { id: "iron_chest", count: 2 },
      ],
      boss: "high_priest",
      key: "temple_key",
      door: "temple_gate",
    },
    {
      name: "Torture Rooms",
      flavorText: "Screams echo from the darkness...",
      cards: [
        { id: "torturer", count: 3 },
        { id: "bone_dragon", count: 1 },
        { id: "health_potion", count: 2 },
        { id: "spike_trap_heavy", count: 2 },
        { id: "crown", count: 1 },
        { id: "merchant", count: 1 },
        { id: "iron_chest_heavy", count: 1 },
      ],
      boss: "dungeon_lord",
      key: "master_key",
      door: "final_door",
    },
  ],
};
