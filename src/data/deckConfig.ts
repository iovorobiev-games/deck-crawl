export interface DeckEntry {
  id: string;
  count: number;
}

export const deckConfig: DeckEntry[] = [
  { id: "skeleton_warrior", count: 6 },
  { id: "skeleton", count: 4 },
  { id: "health_potion", count: 5 },
  { id: "spike_trap", count: 3 },
  { id: "short_sword", count: 3 },
  { id: "battle_axe", count: 2 },
  { id: "leather_armour", count: 3 },
  { id: "chain_mail", count: 1 },
  { id: "iron_helm", count: 3 },
  { id: "crown", count: 1 },
  { id: "fireball_scroll", count: 2 },
  { id: "merchant", count: 2 },
  { id: "altar_of_luck", count: 2 },
  { id: "poison_gas", count: 2 },
  { id: "wooden_chest", count: 3 },
  { id: "iron_chest", count: 2 },
];

/** Pool of loot cards that monsters can guard (not drawn from the deck). */
export const lootPool: string[] = [
  "short_sword",
  "battle_axe",
  "wooden_shield",
  "leather_armour",
  "chain_mail",
  "iron_helm",
  "crown",
  "health_potion",
  "fireball_scroll",
  "whetstone",
  "disarm_kit",
  "gold_pile_small",
  "gold_pile_medium",
  "gold_pile_large",
];
