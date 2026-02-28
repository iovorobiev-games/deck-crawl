import { CardAbility } from "../data/abilityRegistry";

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
  id: string;
  type: CardType;
  name: string;
  value: number;
  description: string;
  image?: string;
  slot?: EquipSlot;
  lockDifficulty?: number;
  trapDamage?: number;
  isKey?: boolean;
  isBoss?: boolean;
  deckLevel?: number;
  abilities?: CardAbility[];
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

/** Maps CardType to the background sprite texture key. */
export const CardBackgroundMap: Record<CardType, string> = {
  [CardType.Monster]: "bg_monster",
  [CardType.Trap]: "bg_monster",
  [CardType.Chest]: "bg_monster",
  [CardType.Treasure]: "bg_treasure",
  [CardType.Potion]: "bg_treasure",
  [CardType.Scroll]: "bg_treasure",
  [CardType.Door]: "bg_treasure",
  [CardType.Event]: "bg_event",
};

/** Maps CardType to the description-area background sprite texture key. */
export const CardDescrMap: Record<CardType, string> = {
  [CardType.Monster]: "descr_monster",
  [CardType.Trap]: "descr_monster",
  [CardType.Chest]: "descr_monster",
  [CardType.Treasure]: "descr_treasure",
  [CardType.Potion]: "descr_treasure",
  [CardType.Scroll]: "descr_treasure",
  [CardType.Door]: "descr_treasure",
  [CardType.Event]: "descr_event",
};

/** Per-type title text color for readability against each background. */
export const CardTitleColorMap: Record<CardType, string> = {
  [CardType.Monster]: "#ffdddd",
  [CardType.Trap]: "#ffdddd",
  [CardType.Chest]: "#ffdddd",
  [CardType.Treasure]: "#fff8e0",
  [CardType.Potion]: "#fff8e0",
  [CardType.Scroll]: "#fff8e0",
  [CardType.Door]: "#fff8e0",
  [CardType.Event]: "#e8ddff",
};
