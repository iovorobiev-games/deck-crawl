import { CardType, CardData } from "../entities/CardData";

export interface DeckEntry extends CardData {
  count: number;
}

export const deckConfig: DeckEntry[] = [
  { type: CardType.Monster, name: "Goblin", value: 3, description: "A weak goblin", count: 6 },
  { type: CardType.Monster, name: "Skeleton", value: 5, description: "Rattling bones", count: 4 },
  { type: CardType.Potion, name: "Health Potion", value: 4, description: "Restores 4 HP", count: 5, slot: "backpack" },
  { type: CardType.Trap, name: "Spike Trap", value: 2, description: "Deals 2 damage", count: 3 },
  { type: CardType.Treasure, name: "Short Sword", value: 2, description: "+2 power", count: 3, slot: "weapon" },
  { type: CardType.Treasure, name: "Battle Axe", value: 4, description: "+4 power", count: 2, slot: "weapon" },
  { type: CardType.Treasure, name: "Leather Armour", value: 1, description: "+1 power", count: 3, slot: "armour" },
  { type: CardType.Treasure, name: "Chain Mail", value: 3, description: "+3 power", count: 1, slot: "armour" },
  { type: CardType.Treasure, name: "Iron Helm", value: 1, description: "+1 power", count: 3, slot: "head" },
  { type: CardType.Treasure, name: "Crown", value: 2, description: "+2 power", count: 1, slot: "head" },
  { type: CardType.Scroll, name: "Fireball Scroll", value: 6, description: "Deals 6 damage to a monster", count: 2 },
  { type: CardType.Event, name: "Merchant", value: 0, description: "Trade goods", count: 2 },
  { type: CardType.Event, name: "Shrine", value: 0, description: "A mysterious shrine", count: 2 },
  { type: CardType.Trap, name: "Poison Gas", value: 3, description: "Deals 3 damage", count: 2 },
  { type: CardType.Chest, name: "Wooden Chest", value: 0, description: "A simple wooden chest", count: 3, lockDifficulty: 2, trapDamage: 1 },
  { type: CardType.Chest, name: "Iron Chest", value: 0, description: "A sturdy iron chest", count: 2, lockDifficulty: 4, trapDamage: 3 },
];

/** Pool of loot cards that monsters can guard (not drawn from the deck). */
export const lootPool: CardData[] = [
  { type: CardType.Treasure, name: "Short Sword", value: 2, description: "+2 power", slot: "weapon" },
  { type: CardType.Treasure, name: "Battle Axe", value: 4, description: "+4 power", slot: "weapon" },
  { type: CardType.Treasure, name: "Leather Armour", value: 1, description: "+1 power", slot: "armour" },
  { type: CardType.Treasure, name: "Chain Mail", value: 3, description: "+3 power", slot: "armour" },
  { type: CardType.Treasure, name: "Iron Helm", value: 1, description: "+1 power", slot: "head" },
  { type: CardType.Treasure, name: "Crown", value: 2, description: "+2 power", slot: "head" },
  { type: CardType.Potion, name: "Health Potion", value: 4, description: "Restores 4 HP", slot: "backpack" },
  { type: CardType.Scroll, name: "Fireball Scroll", value: 6, description: "Deals 6 damage to a monster" },
];
