import { CardType, CardData } from "../entities/CardData";

export const cardRegistry: Record<string, CardData> = {
  // --- Monsters ---
  skeleton_warrior: { id: "skeleton_warrior", type: CardType.Monster, name: "Skeleton Warrior", value: 3, description: "A shambling skeleton", image: "Skeleton War" },
  skeleton: { id: "skeleton", type: CardType.Monster, name: "Skeleton", value: 5, description: "Rattling bones", image: "Skeleton Archer" },

  // --- Bosses ---
  cultist: { id: "cultist", type: CardType.Monster, name: "Cultist", value: 6, description: "Leader of the cult", image: "cultist", isBoss: true },
  vengeful_revenant: { id: "vengeful_revenant", type: CardType.Monster, name: "Vengeful Revenant", value: 10, description: "An undead spirit of vengeance", image: "vengeful_revenant", isBoss: true },
  crypt_lord: { id: "crypt_lord", type: CardType.Monster, name: "Crypt Lord", value: 15, description: "The master of this dungeon", image: "crypt_lord", isBoss: true },

  // --- Potions ---
  health_potion: { id: "health_potion", type: CardType.Potion, name: "Health Potion", value: 4, description: "Restores 4 HP", slot: "backpack", image: "healing_potion", abilities: [{ abilityId: "healing", params: { amount: 4 } }] },

  // --- Traps ---
  spike_trap: { id: "spike_trap", type: CardType.Trap, name: "Spike Trap", value: 2, description: "Deals 2 damage", lockDifficulty: 2, trapDamage: 2, image: "bear_trap" },
  spike_trap_heavy: { id: "spike_trap_heavy", type: CardType.Trap, name: "Spike Trap", value: 4, description: "Deals 4 damage", lockDifficulty: 3, trapDamage: 4, image: "pressure_plate" },
  poison_gas: { id: "poison_gas", type: CardType.Trap, name: "Poison Gas", value: 3, description: "Deals 3 damage", lockDifficulty: 3, trapDamage: 3, image: "poison_dart_trap" },

  // --- Treasure ---
  short_sword: { id: "short_sword", type: CardType.Treasure, name: "Short Sword", value: 2, description: "+2 power", slot: "weapon", image: "shortsword" },
  battle_axe: { id: "battle_axe", type: CardType.Treasure, name: "Battle Axe", value: 4, description: "+4 power", slot: "weapon", image: "crude_axe" },
  leather_armour: { id: "leather_armour", type: CardType.Treasure, name: "Leather Armour", value: 1, description: "+1 power", slot: "armour", image: "rusty_cuirass" },
  chain_mail: { id: "chain_mail", type: CardType.Treasure, name: "Chain Mail", value: 3, description: "+3 power", slot: "armour", image: "metal_cuirass" },
  iron_helm: { id: "iron_helm", type: CardType.Treasure, name: "Iron Helm", value: 1, description: "+1 power", slot: "head" },
  crown: { id: "crown", type: CardType.Treasure, name: "Crown", value: 2, description: "+2 power", slot: "head" },

  // --- Scrolls ---
  fireball_scroll: { id: "fireball_scroll", type: CardType.Scroll, name: "Fireball Scroll", value: 6, description: "Deals 6 damage to a monster", image: "scroll_of_fireball" },

  // --- Events ---
  merchant: { id: "merchant", type: CardType.Event, name: "Merchant", value: 0, description: "Trade goods" },
  shrine: { id: "shrine", type: CardType.Event, name: "Shrine", value: 0, description: "A mysterious shrine", image: "altar_of_luck" },
  attack_from_shadows: { id: "attack_from_shadows", type: CardType.Event, name: "Attack from Shadows", value: 1, description: "A hidden blade strikes!", image: "attack_from_shadows", abilities: [{ abilityId: "attack_from_shadows", params: { amount: 1 } }] },

  // --- Chests ---
  wooden_chest: { id: "wooden_chest", type: CardType.Chest, name: "Wooden Chest", value: 0, description: "A simple wooden chest", lockDifficulty: 2, trapDamage: 1, image: "wooden_chest" },
  iron_chest: { id: "iron_chest", type: CardType.Chest, name: "Iron Chest", value: 0, description: "A sturdy iron chest", lockDifficulty: 4, trapDamage: 3, image: "hardened_chest" },
  iron_chest_heavy: { id: "iron_chest_heavy", type: CardType.Chest, name: "Iron Chest", value: 0, description: "A sturdy iron chest", lockDifficulty: 5, trapDamage: 4, image: "posh_chest" },

  // --- Keys ---
  rusty_key: { id: "rusty_key", type: CardType.Treasure, name: "Rusty Key", value: 1, description: "Opens the hall door", slot: "weapon", isKey: true, deckLevel: 1, image: "rusty_key" },
  temple_key: { id: "temple_key", type: CardType.Treasure, name: "Temple Key", value: 2, description: "Opens the temple gate", slot: "weapon", isKey: true, deckLevel: 2, image: "rusty_key" },
  master_key: { id: "master_key", type: CardType.Treasure, name: "Master Key", value: 3, description: "Opens the final door", slot: "weapon", isKey: true, deckLevel: 3, image: "rusty_key" },

  // --- Doors ---
  hall_door: { id: "hall_door", type: CardType.Door, name: "Hall Door", value: 0, description: "A heavy wooden door", deckLevel: 1, image: "door" },
  temple_gate: { id: "temple_gate", type: CardType.Door, name: "Temple Gate", value: 0, description: "An ornate stone gate", deckLevel: 2, image: "door" },
  final_door: { id: "final_door", type: CardType.Door, name: "Final Door", value: 0, description: "The last barrier", deckLevel: 3, image: "door" },
};

export function getCard(id: string): CardData {
  const card = cardRegistry[id];
  if (!card) throw new Error(`Unknown card id: ${id}`);
  return { ...card };
}
