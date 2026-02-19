import { CardType, CardData } from "../entities/CardData";
import { DeckEntry } from "./deckConfig";

export interface DungeonLevel {
  name: string;
  flavorText: string;
  cards: DeckEntry[];
  boss: DeckEntry;
  key: CardData;
  door: CardData;
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
        { type: CardType.Monster, name: "Goblin", value: 3, description: "A weak goblin", count: 4 },
        { type: CardType.Monster, name: "Skeleton", value: 5, description: "Rattling bones", count: 2 },
        { type: CardType.Potion, name: "Health Potion", value: 4, description: "Restores 4 HP", count: 3, slot: "backpack" },
        { type: CardType.Trap, name: "Spike Trap", value: 2, description: "Deals 2 damage", count: 2 },
        { type: CardType.Treasure, name: "Short Sword", value: 2, description: "+2 power", count: 2, slot: "weapon" },
        { type: CardType.Treasure, name: "Leather Armour", value: 1, description: "+1 power", count: 2, slot: "armour" },
        { type: CardType.Treasure, name: "Iron Helm", value: 1, description: "+1 power", count: 2, slot: "head" },
        { type: CardType.Chest, name: "Wooden Chest", value: 0, description: "A simple wooden chest", count: 2, lockDifficulty: 2, trapDamage: 1 },
      ],
      boss: { type: CardType.Monster, name: "Goblin Chief", value: 6, description: "Leader of the goblins", count: 1 },
      key: { type: CardType.Treasure, name: "Rusty Key", value: 1, description: "Opens the hall door", slot: "weapon", isKey: true, deckLevel: 1 },
      door: { type: CardType.Door, name: "Hall Door", value: 0, description: "A heavy wooden door", deckLevel: 1 },
    },
    {
      name: "Underground Temple",
      flavorText: "Ancient carvings line the walls...",
      cards: [
        { type: CardType.Monster, name: "Dark Acolyte", value: 5, description: "A shadowy cultist", count: 3 },
        { type: CardType.Monster, name: "Stone Golem", value: 8, description: "Animated stone guardian", count: 2 },
        { type: CardType.Potion, name: "Health Potion", value: 4, description: "Restores 4 HP", count: 2, slot: "backpack" },
        { type: CardType.Trap, name: "Poison Gas", value: 3, description: "Deals 3 damage", count: 2 },
        { type: CardType.Treasure, name: "Battle Axe", value: 4, description: "+4 power", count: 1, slot: "weapon" },
        { type: CardType.Treasure, name: "Chain Mail", value: 3, description: "+3 power", count: 1, slot: "armour" },
        { type: CardType.Scroll, name: "Fireball Scroll", value: 6, description: "Deals 6 damage to a monster", count: 1 },
        { type: CardType.Chest, name: "Iron Chest", value: 0, description: "A sturdy iron chest", count: 2, lockDifficulty: 4, trapDamage: 3 },
      ],
      boss: { type: CardType.Monster, name: "High Priest", value: 10, description: "Master of dark rituals", count: 1 },
      key: { type: CardType.Treasure, name: "Temple Key", value: 2, description: "Opens the temple gate", slot: "weapon", isKey: true, deckLevel: 2 },
      door: { type: CardType.Door, name: "Temple Gate", value: 0, description: "An ornate stone gate", deckLevel: 2 },
    },
    {
      name: "Torture Rooms",
      flavorText: "Screams echo from the darkness...",
      cards: [
        { type: CardType.Monster, name: "Torturer", value: 7, description: "A cruel jailer", count: 3 },
        { type: CardType.Monster, name: "Bone Dragon", value: 12, description: "Undead wyrm of bone", count: 1 },
        { type: CardType.Potion, name: "Health Potion", value: 4, description: "Restores 4 HP", count: 2, slot: "backpack" },
        { type: CardType.Trap, name: "Spike Trap", value: 4, description: "Deals 4 damage", count: 2 },
        { type: CardType.Treasure, name: "Crown", value: 2, description: "+2 power", count: 1, slot: "head" },
        { type: CardType.Event, name: "Merchant", value: 0, description: "Trade goods", count: 1 },
        { type: CardType.Chest, name: "Iron Chest", value: 0, description: "A sturdy iron chest", count: 1, lockDifficulty: 5, trapDamage: 4 },
      ],
      boss: { type: CardType.Monster, name: "Dungeon Lord", value: 15, description: "The master of this dungeon", count: 1 },
      key: { type: CardType.Treasure, name: "Master Key", value: 3, description: "Opens the final door", slot: "weapon", isKey: true, deckLevel: 3 },
      door: { type: CardType.Door, name: "Final Door", value: 0, description: "The last barrier", deckLevel: 3 },
    },
  ],
};
