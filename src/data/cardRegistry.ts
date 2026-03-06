import { CardType, CardData } from "../entities/CardData";

export const cardRegistry: Record<string, CardData> = {
  // --- Monsters ---
  skeleton_warrior: { id: "skeleton_warrior", type: CardType.Monster, name: "Skeleton Warrior", value: 3, description: "A shambling skeleton", image: "Skeleton War" },
  skeleton: { id: "skeleton", type: CardType.Monster, name: "Skeleton", value: 1, description: "Rattling bones", image: "Skeleton War" },
  zombie: { id: "zombie", type: CardType.Monster, name: "Zombie", value: 2, description: "Shambling undead", image: "Zombie" },
  bloated_zombie: { id: "bloated_zombie", type: CardType.Monster, name: "Bloated Zombie", value: 2, description: "Explodes on counterattack", image: "Zombie", abilities: [{ abilityId: "bonus_counter_damage", params: { amount: 1 } }] },
  dark_knight: { id: "dark_knight", type: CardType.Monster, name: "Dark Knight", value: 4, description: "A heavily armored foe", image: "dark_knight" },
  skeleton_archer: { id: "skeleton_archer", type: CardType.Monster, name: "Skeleton Archer", value: 1, description: "Fires from the shadows", image: "Skeleton Archer", abilities: [{ abilityId: "summonToDeck", params: { cardId: "attack_from_shadows", count: 1 } }] },

  swarm_of_bats: { id: "swarm_of_bats", type: CardType.Monster, name: "Swarm Of Bats", value: 1, description: "Weakens your agility", image: "swarm_of_bats", abilities: [{ abilityId: "agility_drain", params: { amount: -1 } }] },

  // --- Bosses ---
  cultist: { id: "cultist", type: CardType.Monster, name: "Cultist", value: 3, description: "Leader of the cult", image: "cultist" },
  vengeful_revenant: { id: "vengeful_revenant", type: CardType.Monster, name: "Vengeful Revenant", value: 2, description: "An undead spirit of vengeance", image: "vengeful_revenant", abilities: [{ abilityId: "revenant_return", params: {} }, { abilityId: "power_drain", params: { amount: -1 } }] },
  crypt_lord: { id: "crypt_lord", type: CardType.Monster, name: "Crypt Lord", value: 3, description: "The master of this dungeon", image: "crypt_lord", abilities: [{ abilityId: "summonToDeck", params: { cardId: "skeleton_warrior", count: 1 } }, { abilityId: "return_conditional", params: { requiredDiscardId: "phylactery" } }] },

  // --- Tentacle chain ---
  tentacle: { id: "tentacle", type: CardType.Monster, name: "Tentacle", value: 2, description: "A writhing appendage", image: "horrendous_tentacle", abilities: [{ abilityId: "tentacle_summon", params: { cardId: "horrendous_tentacle", count: 1 } }] },
  horrendous_tentacle: { id: "horrendous_tentacle", type: CardType.Monster, name: "Horrendous Tentacle", value: 4, description: "A massive tentacle", image: "horrendous_tentacle", abilities: [{ abilityId: "horrendous_summon", params: { cardId: "terrible_tentacle", count: 1 } }] },
  terrible_tentacle: { id: "terrible_tentacle", type: CardType.Monster, name: "Terrible Tentacle", value: 6, description: "An enormous tentacle", image: "horrendous_tentacle", abilities: [{ abilityId: "terrible_summon", params: { cardId: "terror_from_beyond", count: 1 } }] },
  terror_from_beyond: { id: "terror_from_beyond", type: CardType.Monster, name: "Terror From The Beyond", value: 15, description: "An eldritch horror", image: "horror_from_beyond", abilities: [{ abilityId: "terror_reveal_damage", params: { amount: 5 } }, { abilityId: "terror_explore_damage", params: { amount: 2 } }, { abilityId: "terror_buff_monsters", params: { amount: 2 } }] },

  // --- Potions ---
  health_potion: { id: "health_potion", type: CardType.Potion, name: "Healing Potion", value: 4, description: "Restores 4 HP", slot: "backpack", image: "healing_potion", abilities: [{ abilityId: "healing", params: { amount: 4 } }] },
  lesser_health_potion: { id: "lesser_health_potion", type: CardType.Potion, name: "Lesser Health Potion", value: 2, description: "Restores 2 HP", slot: "backpack", image: "healing_potion", abilities: [{ abilityId: "healing", params: { amount: 2 } }] },
  minor_health_potion: { id: "minor_health_potion", type: CardType.Potion, name: "Minor Health Potion", value: 3, description: "Restores 3 HP", slot: "backpack", image: "healing_potion", abilities: [{ abilityId: "healing", params: { amount: 3 } }] },

  // --- Traps ---
  spike_trap: { id: "spike_trap", type: CardType.Trap, name: "Spike Trap", value: 2, description: "Deals 2 damage", lockDifficulty: 2, trapDamage: 2, image: "bear_trap" },
  spike_trap_heavy: { id: "spike_trap_heavy", type: CardType.Trap, name: "Spike Trap", value: 4, description: "Deals 4 damage", lockDifficulty: 3, trapDamage: 4, image: "pressure_plate" },
  poison_gas: { id: "poison_gas", type: CardType.Trap, name: "Poison Gas", value: 3, description: "Deals 3 damage", lockDifficulty: 3, trapDamage: 3, image: "poison_dart_trap" },
  poison_dart_trap: { id: "poison_dart_trap", type: CardType.Trap, name: "Poison Dart Trap", value: 0, description: "Poisons on trigger", lockDifficulty: 3, trapDamage: 0, image: "poison_dart_trap", abilities: [{ abilityId: "poison_trap_insert", params: { cardId: "deadly_poisoning", count: 2 } }] },
  pressure_plate: { id: "pressure_plate", type: CardType.Trap, name: "Pressure Plate", value: 0, description: "A hidden pressure plate", lockDifficulty: 2, trapDamage: 1, image: "pressure_plate" },
  bear_trap: { id: "bear_trap", type: CardType.Trap, name: "Bear Trap", value: 0, description: "A concealed bear trap", lockDifficulty: 2, trapDamage: 2, image: "bear_trap" },
  hidden_pit: { id: "hidden_pit", type: CardType.Trap, name: "Hidden Pit", value: 0, description: "A covered pit trap", lockDifficulty: 3, trapDamage: 1, image: "hidden_pit" },

  // --- Gold ---
  gold_pile_small: { id: "gold_pile_small", type: CardType.Treasure, name: "Pile of Gold", value: 2, description: "+2 gold", image: "pile_of_gold" },
  gold_pile_3: { id: "gold_pile_3", type: CardType.Treasure, name: "Pile of Gold", value: 3, description: "+3 gold", image: "pile_of_gold" },
  gold_pile_medium: { id: "gold_pile_medium", type: CardType.Treasure, name: "Pile of Gold", value: 4, description: "+4 gold", image: "pile_of_gold" },
  gold_pile_large: { id: "gold_pile_large", type: CardType.Treasure, name: "Pile of Gold", value: 6, description: "+6 gold", image: "pile_of_gold" },

  // --- Treasure - Weapons ---
  guardsman_sword: { id: "guardsman_sword", type: CardType.Treasure, name: "Guardsman Sword", value: 1, description: "+1 power", slot: "weapon", image: "shortsword" },
  short_sword: { id: "short_sword", type: CardType.Treasure, name: "Short Sword", value: 2, description: "+2 power, heals 1 HP on equip", slot: "weapon", image: "shortsword", abilities: [{ abilityId: "equip_heal", params: { amount: 1 } }] },
  knights_sword: { id: "knights_sword", type: CardType.Treasure, name: "Knights Sword", value: 2, description: "+2 power", slot: "weapon", image: "knights_sword" },
  battle_axe: { id: "battle_axe", type: CardType.Treasure, name: "Battle Axe", value: 4, description: "+4 power", slot: "weapon", image: "crude_axe" },
  shortbow: { id: "shortbow", type: CardType.Treasure, name: "Shortbow", value: 0, description: "Inserts Bow Shots into deck", slot: "weapon", image: "shortbow", tag: "bow", abilities: [{ abilityId: "equip_degrade", params: { cardId: "bow_shot", count: 3 } }] },
  elven_bow: { id: "elven_bow", type: CardType.Treasure, name: "Elven Bow", value: 0, description: "+1 agility, inserts Strong Bow Shots", slot: "weapon", image: "elven_bow", tag: "bow", agilityBonus: 1, abilities: [{ abilityId: "equip_degrade", params: { cardId: "strong_bow_shot", count: 3 } }] },
  ogre_axe: { id: "ogre_axe", type: CardType.Treasure, name: "Ogre Axe", value: 2, description: "+2 power, degrades", slot: "weapon", image: "crude_axe", abilities: [{ abilityId: "equip_degrade", params: { cardId: "weapon_degradation", count: 1 } }] },

  // --- Treasure - Shields ---
  wooden_shield: { id: "wooden_shield", type: CardType.Treasure, name: "Wooden Shield", value: 0, description: "Absorbs 2 damage", slot: "weapon", image: "wooden_shield", abilities: [{ abilityId: "armour", params: { amount: 2 } }] },
  spiked_shield: { id: "spiked_shield", type: CardType.Treasure, name: "Spiked Shield", value: 1, description: "+1 power, absorbs 3 damage", slot: "weapon", image: "spiked_shield", abilities: [{ abilityId: "armour", params: { amount: 3 } }] },
  guardsman_shield: { id: "guardsman_shield", type: CardType.Treasure, name: "Guardsman Shield", value: 0, description: "Absorbs 3 damage", slot: "weapon", image: "knights_shield", abilities: [{ abilityId: "armour", params: { amount: 3 } }] },

  // --- Treasure - Armour ---
  leather_armour: { id: "leather_armour", type: CardType.Treasure, name: "Leather Armour", value: 1, description: "+1 power, cursed: 1 damage on discard", slot: "armour", image: "rusty_cuirass", abilities: [{ abilityId: "discard_damage", params: { amount: 1 } }] },
  chain_mail: { id: "chain_mail", type: CardType.Treasure, name: "Chain Mail", value: 3, description: "+3 power", slot: "armour", image: "metal_cuirass" },
  cloak_of_swiftness: { id: "cloak_of_swiftness", type: CardType.Treasure, name: "Cloak of Swiftness", value: 0, description: "+1 agility", slot: "armour", image: "cloak_of_swiftness", agilityBonus: 1 },
  rusty_armour: { id: "rusty_armour", type: CardType.Treasure, name: "Rusty Armour", value: 0, description: "+1 Max HP", slot: "armour", image: "rusty_cuirass", maxHpBonus: 1 },
  guardsman_armour: { id: "guardsman_armour", type: CardType.Treasure, name: "Guardsman Armour", value: 0, description: "+2 Max HP", slot: "armour", image: "metal_cuirass", maxHpBonus: 2 },

  // --- Treasure - Head ---
  iron_helm: { id: "iron_helm", type: CardType.Treasure, name: "Iron Helm", value: 1, description: "+1 power, heals 1 HP on kill", slot: "head", abilities: [{ abilityId: "vampiric", params: { amount: 1 } }] },
  crown: { id: "crown", type: CardType.Treasure, name: "Crown", value: 2, description: "+2 power, cursed: 1 damage on counterattack", slot: "head", abilities: [{ abilityId: "thorns", params: { amount: 1 } }] },

  // --- Treasure - Backpack ---
  quiver: { id: "quiver", type: CardType.Treasure, name: "Quiver", value: 0, description: "Triggers bow ability on equip", slot: "backpack", image: "quiver", abilities: [{ abilityId: "quiver_trigger", params: {} }] },
  phylactery: { id: "phylactery", type: CardType.Treasure, name: "Phylactery", value: 0, description: "Discarding strengthens the Crypt Lord", image: "phylactery", abilities: [{ abilityId: "buff_monster_type", params: { monsterId: "crypt_lord", amount: 2 } }] },

  // --- Consumables ---
  poison_vial: { id: "poison_vial", type: CardType.Treasure, name: "Poison", value: 0, description: "Drag onto weapon: +2 power next battle", slot: "backpack", image: "poison", abilities: [{ abilityId: "temp_buff_weapon", params: { amount: 2 } }] },
  lockpick: { id: "lockpick", type: CardType.Treasure, name: "Lockpick", value: 0, description: "Drag onto chest to auto-open", slot: "backpack", image: "lockpicks", abilities: [{ abilityId: "auto_open_chest", params: {} }] },

  // --- Scrolls ---
  fireball_scroll: { id: "fireball_scroll", type: CardType.Treasure, name: "Scroll of Fireball", value: 0, description: "Reduce target and adjacent monsters' power by 2", slot: "backpack", image: "scroll_of_fireball", abilities: [{ abilityId: "reduce_adjacent_monsters", params: { amount: 2 } }] },
  scroll_of_fire_bolt: { id: "scroll_of_fire_bolt", type: CardType.Treasure, name: "Scroll of Fire Bolt", value: 0, description: "Reduce 1 enemy power by 2", slot: "backpack", image: "scroll_of_firebolt", abilities: [{ abilityId: "reduce_target_monster", params: { amount: 2 } }] },
  scroll_of_cleansing: { id: "scroll_of_cleansing", type: CardType.Treasure, name: "Scroll of Cleansing", value: 0, description: "Removes a dark event from the deck", slot: "backpack", image: "scroll_of_cleansing", abilities: [{ abilityId: "remove_dark_event", params: {} }] },
  scroll_of_blessing: { id: "scroll_of_blessing", type: CardType.Treasure, name: "Scroll of Blessing", value: 0, description: "Adds +2 to your fate deck", slot: "backpack", image: "scroll_of_blessing", abilities: [{ abilityId: "add_fate_modifier", params: { modifier: 2 } }] },

  // --- Other tools ---
  whetstone: { id: "whetstone", type: CardType.Potion, name: "Whetstone", value: 0, description: "Drag onto weapon to sharpen", slot: "backpack", image: "healing_potion", abilities: [{ abilityId: "apply_to_weapon", params: { amount: 1 } }] },
  disarm_kit: { id: "disarm_kit", type: CardType.Potion, name: "Disarming Kit", value: 0, description: "Drag onto trap to disarm", slot: "backpack", image: "disarming_kit", abilities: [{ abilityId: "disarm_tool", params: { amount: 1 } }] },

  // --- Degrading weapons ---
  rusty_sword: { id: "rusty_sword", type: CardType.Treasure, name: "Rusty Sword", value: 1, description: "+1 power, degrades", slot: "weapon", image: "rusty_sword", abilities: [{ abilityId: "equip_degrade", params: { cardId: "weapon_degradation", count: 1 } }] },
  crude_axe: { id: "crude_axe", type: CardType.Treasure, name: "Crude Axe", value: 2, description: "+2 power, degrades", slot: "weapon", image: "crude_axe", abilities: [{ abilityId: "equip_degrade", params: { cardId: "weapon_degradation", count: 1 } }] },

  // --- Events ---
  merchant: { id: "merchant", type: CardType.Event, name: "Merchant", value: 0, description: "Trade goods" },
  attack_from_shadows: { id: "attack_from_shadows", type: CardType.Event, name: "Attack from Shadows", value: 1, description: "A hidden blade strikes!", image: "attack_from_shadows", tag: "dark", abilities: [{ abilityId: "attack_from_shadows", params: { amount: 1 } }] },
  dark_ritual: { id: "dark_ritual", type: CardType.Event, name: "Dark Ritual", value: 0, description: "Summons a tentacle", image: "dark_ritual", tag: "dark", abilities: [{ abilityId: "dark_ritual_summon", params: { cardId: "tentacle", count: 1 } }] },
  deadly_poisoning: { id: "deadly_poisoning", type: CardType.Event, name: "Deadly Poisoning", value: 1, description: "Poison courses through your veins", image: "poison", tag: "dark", abilities: [{ abilityId: "deadly_poison_damage", params: { amount: 1 } }] },
  weapon_degradation: { id: "weapon_degradation", type: CardType.Event, name: "Weapon Degradation", value: 0, description: "Your weapon dulls", image: "weapon_degradation", tag: "dark", abilities: [{ abilityId: "weapon_degrade", params: { amount: 1 } }] },
  bow_shot: { id: "bow_shot", type: CardType.Event, name: "Bow Shot", value: 0, description: "Reduces a random enemy's power by 2", image: "bow_shot", abilities: [{ abilityId: "reduce_random_enemy", params: { amount: 2 } }] },
  strong_bow_shot: { id: "strong_bow_shot", type: CardType.Event, name: "Strong Bow Shot", value: 0, description: "Reduces a random enemy's power by 3", image: "bow_shot", abilities: [{ abilityId: "reduce_random_enemy", params: { amount: 3 } }] },
  altar_of_luck: { id: "altar_of_luck", type: CardType.Treasure, name: "Altar Of Luck", value: 0, description: "Pay 1 gold: +2 fate", image: "altar_of_luck", exchangePrice: { resource: "gold", amount: 1 }, exchangeReward: { type: "fate", modifier: 2 } },

  // --- Chests ---
  wooden_chest: { id: "wooden_chest", type: CardType.Chest, name: "Wooden Chest", value: 0, description: "A simple wooden chest", lockDifficulty: 2, trapDamage: 2, image: "wooden_chest" },
  iron_chest: { id: "iron_chest", type: CardType.Chest, name: "Iron Chest", value: 0, description: "A sturdy iron chest", lockDifficulty: 4, trapDamage: 3, image: "hardened_chest" },
  iron_chest_heavy: { id: "iron_chest_heavy", type: CardType.Chest, name: "Iron Chest", value: 0, description: "A sturdy iron chest", lockDifficulty: 5, trapDamage: 4, image: "posh_chest" },
  ominous_chest: { id: "ominous_chest", type: CardType.Chest, name: "Ominous Chest", value: 0, description: "A foreboding chest", lockDifficulty: 2, trapDamage: 4, image: "ominuous_chest" },
  rusty_chest: { id: "rusty_chest", type: CardType.Chest, name: "Rusty Chest", value: 0, description: "A rusted old chest", lockDifficulty: 1, trapDamage: 3, image: "strong_chest" },
  trapped_chest: { id: "trapped_chest", type: CardType.Chest, name: "Trapped Chest", value: 0, description: "A clearly trapped chest", lockDifficulty: 2, trapDamage: 3, image: "posh_chest" },
  hardened_chest: { id: "hardened_chest", type: CardType.Chest, name: "Hardened Chest", value: 0, description: "A reinforced chest", lockDifficulty: 3, trapDamage: 1, image: "hardened_chest" },

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
  return { ...card, abilities: card.abilities?.map(a => ({ ...a, params: { ...a.params } })) };
}
