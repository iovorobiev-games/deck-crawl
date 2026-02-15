import { CardType, CardData } from "../entities/CardData";

export interface DeckEntry extends CardData {
  count: number;
}

export const deckConfig: DeckEntry[] = [
  { type: CardType.Monster, name: "Goblin", value: 3, description: "A weak goblin", count: 6 },
  { type: CardType.Monster, name: "Skeleton", value: 5, description: "Rattling bones", count: 4 },
  { type: CardType.Potion, name: "Health Potion", value: 4, description: "Restores 4 HP", count: 5 },
  { type: CardType.Trap, name: "Spike Trap", value: 2, description: "Deals 2 damage", count: 3 },
  { type: CardType.Treasure, name: "Gold Chest", value: 10, description: "Contains 10 gold", count: 4 },
  { type: CardType.Scroll, name: "Fireball Scroll", value: 6, description: "Deals 6 damage to a monster", count: 2 },
  { type: CardType.Event, name: "Merchant", value: 0, description: "Trade goods", count: 2 },
  { type: CardType.Event, name: "Shrine", value: 0, description: "A mysterious shrine", count: 2 },
  { type: CardType.Trap, name: "Poison Gas", value: 3, description: "Deals 3 damage", count: 2 },
];
