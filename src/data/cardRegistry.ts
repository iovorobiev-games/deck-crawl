import { CardType, CardData } from "../entities/CardData";

export const cardRegistry: Record<string, CardData> = {
  // --- Monsters ---
  goblin: { id: "goblin", type: CardType.Monster, name: "Goblin", value: 3, description: "A weak goblin" },
  skeleton: { id: "skeleton", type: CardType.Monster, name: "Skeleton", value: 5, description: "Rattling bones" },
  dark_acolyte: { id: "dark_acolyte", type: CardType.Monster, name: "Dark Acolyte", value: 5, description: "A shadowy cultist" },
  stone_golem: { id: "stone_golem", type: CardType.Monster, name: "Stone Golem", value: 8, description: "Animated stone guardian" },
  torturer: { id: "torturer", type: CardType.Monster, name: "Torturer", value: 7, description: "A cruel jailer" },
  bone_dragon: { id: "bone_dragon", type: CardType.Monster, name: "Bone Dragon", value: 12, description: "Undead wyrm of bone" },

  // --- Bosses ---
  goblin_chief: { id: "goblin_chief", type: CardType.Monster, name: "Goblin Chief", value: 6, description: "Leader of the goblins" },
  high_priest: { id: "high_priest", type: CardType.Monster, name: "High Priest", value: 10, description: "Master of dark rituals" },
  dungeon_lord: { id: "dungeon_lord", type: CardType.Monster, name: "Dungeon Lord", value: 15, description: "The master of this dungeon" },

  // --- Potions ---
  health_potion: { id: "health_potion", type: CardType.Potion, name: "Health Potion", value: 4, description: "Restores 4 HP", slot: "backpack" },

  // --- Traps ---
  spike_trap: { id: "spike_trap", type: CardType.Trap, name: "Spike Trap", value: 2, description: "Deals 2 damage", lockDifficulty: 2, trapDamage: 2 },
  spike_trap_heavy: { id: "spike_trap_heavy", type: CardType.Trap, name: "Spike Trap", value: 4, description: "Deals 4 damage", lockDifficulty: 3, trapDamage: 4 },
  poison_gas: { id: "poison_gas", type: CardType.Trap, name: "Poison Gas", value: 3, description: "Deals 3 damage", lockDifficulty: 3, trapDamage: 3 },

  // --- Treasure ---
  short_sword: { id: "short_sword", type: CardType.Treasure, name: "Short Sword", value: 2, description: "+2 power", slot: "weapon" },
  battle_axe: { id: "battle_axe", type: CardType.Treasure, name: "Battle Axe", value: 4, description: "+4 power", slot: "weapon" },
  leather_armour: { id: "leather_armour", type: CardType.Treasure, name: "Leather Armour", value: 1, description: "+1 power", slot: "armour" },
  chain_mail: { id: "chain_mail", type: CardType.Treasure, name: "Chain Mail", value: 3, description: "+3 power", slot: "armour" },
  iron_helm: { id: "iron_helm", type: CardType.Treasure, name: "Iron Helm", value: 1, description: "+1 power", slot: "head" },
  crown: { id: "crown", type: CardType.Treasure, name: "Crown", value: 2, description: "+2 power", slot: "head" },

  // --- Scrolls ---
  fireball_scroll: { id: "fireball_scroll", type: CardType.Scroll, name: "Fireball Scroll", value: 6, description: "Deals 6 damage to a monster" },

  // --- Events ---
  merchant: { id: "merchant", type: CardType.Event, name: "Merchant", value: 0, description: "Trade goods" },
  shrine: { id: "shrine", type: CardType.Event, name: "Shrine", value: 0, description: "A mysterious shrine" },

  // --- Chests ---
  wooden_chest: { id: "wooden_chest", type: CardType.Chest, name: "Wooden Chest", value: 0, description: "A simple wooden chest", lockDifficulty: 2, trapDamage: 1 },
  iron_chest: { id: "iron_chest", type: CardType.Chest, name: "Iron Chest", value: 0, description: "A sturdy iron chest", lockDifficulty: 4, trapDamage: 3 },
  iron_chest_heavy: { id: "iron_chest_heavy", type: CardType.Chest, name: "Iron Chest", value: 0, description: "A sturdy iron chest", lockDifficulty: 5, trapDamage: 4 },

  // --- Keys ---
  rusty_key: { id: "rusty_key", type: CardType.Treasure, name: "Rusty Key", value: 1, description: "Opens the hall door", slot: "weapon", isKey: true, deckLevel: 1 },
  temple_key: { id: "temple_key", type: CardType.Treasure, name: "Temple Key", value: 2, description: "Opens the temple gate", slot: "weapon", isKey: true, deckLevel: 2 },
  master_key: { id: "master_key", type: CardType.Treasure, name: "Master Key", value: 3, description: "Opens the final door", slot: "weapon", isKey: true, deckLevel: 3 },

  // --- Doors ---
  hall_door: { id: "hall_door", type: CardType.Door, name: "Hall Door", value: 0, description: "A heavy wooden door", deckLevel: 1 },
  temple_gate: { id: "temple_gate", type: CardType.Door, name: "Temple Gate", value: 0, description: "An ornate stone gate", deckLevel: 2 },
  final_door: { id: "final_door", type: CardType.Door, name: "Final Door", value: 0, description: "The last barrier", deckLevel: 3 },
};

export function getCard(id: string): CardData {
  const card = cardRegistry[id];
  if (!card) throw new Error(`Unknown card id: ${id}`);
  return { ...card };
}
