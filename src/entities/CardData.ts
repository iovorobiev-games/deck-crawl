export enum CardType {
  Monster = "Monster",
  Potion = "Potion",
  Trap = "Trap",
  Treasure = "Treasure",
  Scroll = "Scroll",
  Event = "Event",
  Chest = "Chest",
  Door = "Door",
}

export type EquipSlot = "weapon" | "armour" | "head" | "backpack";

export interface CardData {
  type: CardType;
  name: string;
  value: number;
  description: string;
  slot?: EquipSlot;
  lockDifficulty?: number;
  trapDamage?: number;
  isKey?: boolean;
  isBoss?: boolean;
  deckLevel?: number;
}

export const CardColorMap: Record<CardType, number> = {
  [CardType.Monster]: 0xcc3333,
  [CardType.Potion]: 0x33aa55,
  [CardType.Trap]: 0xdd8833,
  [CardType.Treasure]: 0xddaa22,
  [CardType.Scroll]: 0x3366cc,
  [CardType.Event]: 0x8833aa,
  [CardType.Chest]: 0x88664d,
  [CardType.Door]: 0x6644aa,
};
