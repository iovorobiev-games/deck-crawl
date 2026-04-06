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
  agilityBonus?: number;
  maxHpBonus?: number;
  tag?: string;
  exchangePrice?: { resource: "gold" | "hp"; amount: number };
  exchangeReward?: { type: "treasure"; cardId: string } | { type: "fate"; modifier: number };
  equipTriggered?: boolean;
  goldValue?: number;
  onlyGuarded?: boolean;
  poisoned?: boolean;
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

/** Maps CardType to the big-preview background sprite texture key. */
export const CardBigBackgroundMap: Record<CardType, string> = {
  [CardType.Monster]: "bg_big",
  [CardType.Trap]: "bg_big",
  [CardType.Chest]: "bg_big",
  [CardType.Treasure]: "bg_big_tr",
  [CardType.Potion]: "bg_big_tr",
  [CardType.Scroll]: "bg_big_tr",
  [CardType.Door]: "bg_big_tr",
  [CardType.Event]: "bg_big",
};

/** Maps CardType to the big-preview description-area background sprite texture key. */
export const CardBigDescrMap: Record<CardType, string> = {
  [CardType.Monster]: "descr_big",
  [CardType.Trap]: "descr_big",
  [CardType.Chest]: "descr_big",
  [CardType.Treasure]: "descr_big_tr",
  [CardType.Potion]: "descr_big_tr",
  [CardType.Scroll]: "descr_big_tr",
  [CardType.Door]: "descr_big_tr",
  [CardType.Event]: "descr_big",
};

/** Per-type title text color for readability against each background. */
export const CardTitleColorMap: Record<CardType, string> = {
  [CardType.Monster]: "#ffdddd",
  [CardType.Trap]: "#ffdddd",
  [CardType.Chest]: "#ffdddd",
  [CardType.Treasure]: "#240a0e",
  [CardType.Potion]: "#240a0e",
  [CardType.Scroll]: "#240a0e",
  [CardType.Door]: "#240a0e",
  [CardType.Event]: "#e8ddff",
};
