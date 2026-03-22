import { CardType, CardData } from "../entities/CardData";

export const cardRegistry: Record<string, CardData> = {
  // --- Monsters ---
  skeleton_warrior: { id: "skeleton_warrior", goldValue: 6, type: CardType.Monster, name: "Skeleton Warrior", value: 3, description: "A shambling skeleton", image: "Skeleton War" },
  skeleton: { id: "skeleton", goldValue: 2, type: CardType.Monster, name: "Skeleton", value: 1, description: "They are in abundance here...", image: "Skeleton War" },
  zombie: { id: "zombie", goldValue: 4, type: CardType.Monster, name: "Zombie", value: 2, description: "Dumb but sturdy", image: "Zombie" },
  bloated_zombie: { id: "bloated_zombie", goldValue: 6, type: CardType.Monster, name: "Bloated Zombie", value: 2, description: "+1 damage when hits back", image: "Zombie", abilities: [{ abilityId: "bonus_counter_damage", params: { amount: 1 } }] },
  dark_knight: { id: "dark_knight", goldValue: 8, type: CardType.Monster, name: "Dark Knight", value: 4, description: "Elite warrior of the dungeon", image: "dark_knight" },
  skeleton_archer: { id: "skeleton_archer", goldValue: 4, type: CardType.Monster, name: "Skeleton Archer", value: 1, description: "Inserts Attack From Shadows into the Dungeon Deck on Explore", image: "Skeleton Archer", abilities: [{ abilityId: "summonToDeck", params: { cardId: "attack_from_shadows", count: 1 } }] },

  swarm_of_bats: { id: "swarm_of_bats", goldValue: 8, type: CardType.Monster, name: "Swarm Of Bats", value: 1, description: "-1 Hero Agility", image: "swarm_of_bats", abilities: [{ abilityId: "agility_drain", params: { amount: -1 } }] },

  // --- Bosses ---
  cultist: { id: "cultist", goldValue: 7.88, type: CardType.Monster, name: "Cultist", value: 3, description: "Inserts Dark Ritual into the Dungeon Deck on Explore", image: "cultist", abilities: [{ abilityId: "cultist_ritual", params: { cardId: "dark_ritual", count: 1 } }] },
  vengeful_revenant: { id: "vengeful_revenant", goldValue: 16, type: CardType.Monster, name: "Vengeful Revenant", value: 2, description: "Returns back to the Dungeon Deck after death as a Curse.\n-1 Hero Power", image: "vengeful_revenant", abilities: [{ abilityId: "return_conditional", params: {} }, { abilityId: "power_drain", params: { amount: -1 } }] },
  crypt_lord: { id: "crypt_lord", goldValue: 13.71, type: CardType.Monster, name: "Crypt Lord", value: 3, description: "Goes back to dungeon deck after death unless Phylactery is discarded.\n Adds Skeleton to the Dungeon Deck on Explore", image: "crypt_lord", abilities: [{ abilityId: "summonToDeck", params: { cardId: "skeleton_warrior", count: 1 } }, { abilityId: "return_conditional", params: { requiredDiscardId: "phylactery" } }] },

  // --- Tentacle chain ---
  tentacle: { id: "tentacle", goldValue: 7.5, type: CardType.Monster, name: "Tentacle", value: 2, description: "Inserts Horrendous Tentacle On Reveal", image: "horrendous_tentacle", abilities: [{ abilityId: "tentacle_summon", params: { cardId: "horrendous_tentacle", count: 1 } }] },
  horrendous_tentacle: { id: "horrendous_tentacle", goldValue: 14, type: CardType.Monster, name: "Horrendous Tentacle", value: 4, description: "Once 3 of these appear from the Dungeon Deck, Put Horror From The Beyond into the Dungeon Deck", image: "horrendous_tentacle", abilities: [{ abilityId: "horrendous_summon", params: { cardId: "terrible_tentacle", count: 1 } }] },
  terrible_tentacle: { id: "terrible_tentacle", goldValue: 24, type: CardType.Monster, name: "Terrible Tentacle", value: 6, description: "An enormous tentacle", image: "horrendous_tentacle", abilities: [{ abilityId: "terrible_summon", params: { cardId: "terror_from_beyond", count: 1 } }] },
  terror_from_beyond: { id: "terror_from_beyond", goldValue: 48, type: CardType.Monster, name: "Terror From The Beyond", value: 15, description: "Deals 1 damage for every action which is not fighting Horror from The Beyond", image: "horror_from_beyond", abilities: [{ abilityId: "terror_reveal_damage", params: { amount: 5 } }, { abilityId: "terror_explore_damage", params: { amount: 2 } }, { abilityId: "terror_buff_monsters", params: { amount: 2 } }] },

  // --- Potions ---
  health_potion: { id: "health_potion", goldValue: 8, type: CardType.Potion, name: "Healing Potion", value: 4, description: "On Self: Heals 4 HP", slot: "backpack", image: "healing_potion", abilities: [{ abilityId: "healing", params: { amount: 4 } }] },
  lesser_health_potion: { id: "lesser_health_potion", goldValue: 4, type: CardType.Potion, name: "Lesser Health Potion", value: 2, description: "On Self: Restores 2HP", slot: "backpack", image: "healing_potion", abilities: [{ abilityId: "healing", params: { amount: 2 } }] },
  minor_health_potion: { id: "minor_health_potion", goldValue: 6, type: CardType.Potion, name: "Minor Health Potion", value: 3, description: "On Self: Restores 3HP", slot: "backpack", image: "healing_potion", abilities: [{ abilityId: "healing", params: { amount: 3 } }] },

  // --- Traps ---
  spike_trap: { id: "spike_trap", goldValue: 2.67, type: CardType.Trap, name: "Spike Trap", value: 2, description: "Blocks Explore. \nDeals 2 damage", lockDifficulty: 2, trapDamage: 2, image: "bear_trap" },
  spike_trap_heavy: { id: "spike_trap_heavy", goldValue: 6.67, type: CardType.Trap, name: "Spike Trap", value: 4, description: "Blocks Explore. \nDeals 4 damage", lockDifficulty: 3, trapDamage: 4, image: "pressure_plate" },
  poison_gas: { id: "poison_gas", goldValue: 5, type: CardType.Trap, name: "Poison Gas", value: 3, description: "Blocks Explore. \nDeals 3 damage", lockDifficulty: 3, trapDamage: 3, image: "poison_dart_trap" },
  poison_dart_trap: { id: "poison_dart_trap", goldValue: 0.83, type: CardType.Trap, name: "Poison Dart Trap", value: 0, description: "Blocks Explore.\nAdds Poisoning card into the Dungeon Deck", lockDifficulty: 3, trapDamage: 0, image: "poison_dart_trap", abilities: [{ abilityId: "poison_trap_insert", params: { cardId: "deadly_poisoning", count: 2 } }] },
  pressure_plate: { id: "pressure_plate", goldValue: 1.33, type: CardType.Trap, name: "Pressure Plate", value: 0, description: "Blocks Explore.\nDamage: 1", lockDifficulty: 2, trapDamage: 1, image: "pressure_plate" },
  bear_trap: { id: "bear_trap", goldValue: 2.67, type: CardType.Trap, name: "Bear Trap", value: 0, description: "Blocks Explore.\nDamage: 2", lockDifficulty: 2, trapDamage: 2, image: "bear_trap" },
  hidden_pit: { id: "hidden_pit", goldValue: 1.67, type: CardType.Trap, name: "Hidden Pit", value: 0, description: "Blocks Explore.\nDamage: 1", lockDifficulty: 3, trapDamage: 1, image: "hidden_pit" },

  // --- Gold ---
  gold_pile_small: { id: "gold_pile_small", goldValue: 2, type: CardType.Treasure, name: "Pile of Gold", value: 2, description: "2 Gold Coins", image: "pile_of_gold" },
  gold_pile_3: { id: "gold_pile_3", goldValue: 3, type: CardType.Treasure, name: "Pile of Gold", value: 3, description: "3 Gold Coins", image: "pile_of_gold" },
  gold_pile_medium: { id: "gold_pile_medium", goldValue: 4, type: CardType.Treasure, name: "Pile of Gold", value: 4, description: "4 Gold Coins", image: "pile_of_gold" },
  gold_pile_large: { id: "gold_pile_large", goldValue: 6, type: CardType.Treasure, name: "Pile of Gold", value: 6, description: "6 Gold Coins", image: "pile_of_gold" },

  // --- Treasure - Weapons ---
  guardsman_sword: { id: "guardsman_sword", goldValue: 8, type: CardType.Treasure, name: "Guardsman Sword", value: 1, description: "", slot: "weapon", image: "shortsword" },
  knights_sword: { id: "knights_sword", goldValue: 16, type: CardType.Treasure, name: "Knights Sword", value: 2, description: "", slot: "weapon", image: "knights_sword" },
  battle_axe: { id: "battle_axe", goldValue: 32, type: CardType.Treasure, name: "Battle Axe", value: 4, description: "", slot: "weapon", image: "crude_axe" },
  shortbow: { id: "shortbow", goldValue: 3, type: CardType.Treasure, name: "Shortbow", value: 0, description: "Adds 3 Bow Shot cards into a dungeon deck", slot: "weapon", image: "shortbow", tag: "bow", abilities: [{ abilityId: "equip_degrade", params: { cardId: "bow_shot", count: 3 } }] },
  elven_bow: { id: "elven_bow", goldValue: 10.5, type: CardType.Treasure, name: "Elven Bow", value: 0, description: "Adds 3 Strong Bow Shot cards into a dungeon deck.\nAgility +1", slot: "weapon", image: "elven_bow", tag: "bow", agilityBonus: 1, abilities: [{ abilityId: "equip_degrade", params: { cardId: "strong_bow_shot", count: 3 } }] },
  ogre_axe: { id: "ogre_axe", goldValue: 14, type: CardType.Treasure, name: "Ogre Axe", value: 2, description: "Adds Weapon Degradation to Dungeon Deck if equipped", slot: "weapon", image: "crude_axe", abilities: [{ abilityId: "equip_degrade", params: { cardId: "weapon_degradation", count: 1 } }] },

  // --- Treasure - Shields ---
  wooden_shield: { id: "wooden_shield", goldValue: 4, type: CardType.Treasure, name: "Wooden Shield", value: 0, description: "", slot: "weapon", image: "wooden_shield", abilities: [{ abilityId: "armour", params: { amount: 2 } }] },
  spiked_shield: { id: "spiked_shield", goldValue: 14, type: CardType.Treasure, name: "Spiked Shield", value: 1, description: "", slot: "weapon", image: "spiked_shield", abilities: [{ abilityId: "armour", params: { amount: 3 } }] },
  guardsman_shield: { id: "guardsman_shield", goldValue: 6, type: CardType.Treasure, name: "Guardsman Shield", value: 0, description: "", slot: "weapon", image: "knights_shield", abilities: [{ abilityId: "armour", params: { amount: 3 } }] },

  // --- Treasure - Armour ---
  cloak_of_swiftness: { id: "cloak_of_swiftness", goldValue: 6, type: CardType.Treasure, name: "Cloak of Swiftness", value: 0, description: "+1 agility", slot: "armour", image: "cloak_of_swiftness", agilityBonus: 1 },
  wizards_robe: { id: "wizards_robe", goldValue: 8, type: CardType.Treasure, name: "Wizard's Robe", value: 0, description: "+2 damage from scrolls", slot: "armour", image: "mages_robe", abilities: [{ abilityId: "scroll_damage_boost", params: { amount: 2 } }] },
  marksman_cloak: { id: "marksman_cloak", goldValue: 6, type: CardType.Treasure, name: "Marksman's Cloak", value: 0, description: "Adds Agility to Bow Shot damage", slot: "armour", image: "cloak_of_swiftness", abilities: [{ abilityId: "bow_agility_damage", params: {} }] },
  ranger_cape: { id: "ranger_cape", goldValue: 7.5, type: CardType.Treasure, name: "Ranger's Cape", value: 0, description: "Bow shots return to the Dungeon Deck if they miss", slot: "head", image: "cape", abilities: [{ abilityId: "bow_shot_recycle", params: {} }] },
  rusty_armour: { id: "rusty_armour", goldValue: 4, type: CardType.Treasure, name: "Rusty Armour", value: 0, description: "Adds +2 Max HP", slot: "armour", image: "rusty_cuirass", maxHpBonus: 2 },
  guardsman_armour: { id: "guardsman_armour", goldValue: 8, type: CardType.Treasure, name: "Guardsman Armour", value: 0, description: "Adds +4 Max HP", slot: "armour", image: "metal_cuirass", maxHpBonus: 4 },

  // --- Treasure - Head ---
  wizard_hat: { id: "wizard_hat", goldValue: 8.88, type: CardType.Treasure, name: "Wizard's Hat", value: 0, description: "All scrolls return to the Dungeon Deck after use", slot: "head", image: "wizard_hat", abilities: [{ abilityId: "scroll_recycle", params: {} }] },
  warrior_helm: { id: "warrior_helm", goldValue: 24, type: CardType.Treasure, name: "Warrior Helm", value: 0, description: "Doubles melee weapon power", slot: "head", image: "warrior_helm", abilities: [{ abilityId: "melee_weapon_boost", params: {} }] },
  marksman_hat: { id: "marksman_hat", goldValue: 8, type: CardType.Treasure, name: "Marksman's Hat", value: 0, description: "+2 to Bow Shot damage", slot: "head", image: "marksman_hat", abilities: [{ abilityId: "bow_damage_boost", params: { amount: 2 } }] },

  // --- Treasure - Backpack ---
  quiver: { id: "quiver", goldValue: 3.75, type: CardType.Treasure, name: "Quiver", value: 0, description: "On Bow: Trigger Bow Ability", slot: "backpack", image: "quiver", abilities: [{ abilityId: "quiver_trigger", params: { tag: "bow" } }] },
  phylactery: { id: "phylactery", goldValue: -4, type: CardType.Treasure, name: "Phylactery", value: 0, description: "On Discard: Adds +2 Power to necromancer. \nNecromancer doesn't return after death.", slot: "backpack", image: "phylactery", abilities: [{ abilityId: "buff_monster_type", params: { monsterId: "crypt_lord", amount: 2 } }] },

  // --- Consumables ---
  poison_vial: { id: "poison_vial", goldValue: 4, type: CardType.Treasure, name: "Poison", value: 0, description: "On Weapon: Adds +2 Power for the next Battle", slot: "backpack", image: "poison", abilities: [{ abilityId: "temp_buff_weapon", params: { amount: 2 } }] },
  lockpick: { id: "lockpick", goldValue: 4.24, type: CardType.Treasure, name: "Lockpick", value: 0, description: "On Chest: Opens a chest", slot: "backpack", image: "lockpicks", onlyGuarded: true, abilities: [{ abilityId: "auto_open_chest", params: {} }] },

  // --- Scrolls ---
  fireball_scroll: { id: "fireball_scroll", goldValue: 8, type: CardType.Treasure, name: "Scroll of Fireball", value: 0, description: "On Monster: 2 Damage to target and adjacent ones", slot: "backpack", image: "scroll_of_fireball", tag: "scroll", abilities: [{ abilityId: "reduce_adjacent_monsters", params: { amount: 2, vfx: "fireball" } }] },
  scroll_of_fire_bolt: { id: "scroll_of_fire_bolt", goldValue: 4, type: CardType.Treasure, name: "Scroll of Fire Bolt", value: 0, description: "On Monster: 2 Damage", slot: "backpack", image: "scroll_of_firebolt", tag: "scroll", abilities: [{ abilityId: "reduce_target_monster", params: { amount: 2, vfx: "fireball" } }] },
  scroll_of_cleansing: { id: "scroll_of_cleansing", goldValue: 3.47, type: CardType.Treasure, name: "Scroll of Cleansing", value: 0, description: "On Self: Removes top Curse from the deck", slot: "backpack", image: "scroll_of_cleansing", tag: "scroll", abilities: [{ abilityId: "remove_dark_event", params: {} }] },
  scroll_of_blessing: { id: "scroll_of_blessing", goldValue: 2.29, type: CardType.Treasure, name: "Scroll of Blessing", value: 0, description: "On Self: Adds +2 card to your fate deck", slot: "backpack", image: "scroll_of_blessing", tag: "scroll", abilities: [{ abilityId: "add_fate_modifier", params: { modifier: 2 } }] },

  // --- Other tools ---
  disarm_kit: { id: "disarm_kit", goldValue: 2.98, type: CardType.Potion, name: "Disarming Kit", value: 0, description: "On Traps: Removes Traps", slot: "backpack", image: "disarming_kit", onlyGuarded: true, abilities: [{ abilityId: "disarm_tool", params: { amount: 1 } }] },

  // --- Degrading weapons ---
  rusty_sword: { id: "rusty_sword", goldValue: 6, type: CardType.Treasure, name: "Rusty Sword", value: 1, description: "Adds Weapon Degradation to Dungeon Deck when equipped", slot: "weapon", image: "rusty_sword", abilities: [{ abilityId: "equip_degrade", params: { cardId: "weapon_degradation", count: 1 } }] },
  crude_axe: { id: "crude_axe", goldValue: 14, type: CardType.Treasure, name: "Crude Axe", value: 2, description: "Adds Weapon Degradation to Dungeon Deck when equipped", slot: "weapon", image: "crude_axe", abilities: [{ abilityId: "equip_degrade", params: { cardId: "weapon_degradation", count: 1 } }] },

  // --- Events ---
  attack_from_shadows: { id: "attack_from_shadows", goldValue: 2, type: CardType.Event, name: "Attack from Shadows", value: 1, description: "Deals 1 Damage to the Hero", image: "attack_from_shadows", tag: "curse", abilities: [{ abilityId: "attack_from_shadows", params: { amount: 1 } }] },
  dark_ritual: { id: "dark_ritual", goldValue: 1.88, type: CardType.Event, name: "Dark Ritual", value: 0, description: "When Resolved insert Horrendous Tentacle to the dungeon deck", image: "dark_ritual", tag: "curse", abilities: [{ abilityId: "dark_ritual_summon", params: { cardId: "tentacle", count: 1 } }] },
  deadly_poisoning: { id: "deadly_poisoning", goldValue: 2, type: CardType.Event, name: "Deadly Poisoning", value: 1, description: "1 Damage to HP", image: "poison", tag: "curse", abilities: [{ abilityId: "deadly_poison_damage", params: { amount: 1, ignoresArmor: 1 } }] },
  weapon_degradation: { id: "weapon_degradation", goldValue: 8, type: CardType.Event, name: "Weapon Degradation", value: 0, description: "Reduces power of currently equipped weapon by 1", image: "weapon_degradation", tag: "curse", abilities: [{ abilityId: "weapon_degrade", params: { amount: 1 } }] },
  bow_shot: { id: "bow_shot", goldValue: 4, type: CardType.Event, name: "Bow Shot", value: 0, description: "Damages Random Enemy", image: "bow_shot", abilities: [{ abilityId: "reduce_random_enemy", params: { amount: 2 } }] },
  strong_bow_shot: { id: "strong_bow_shot", goldValue: 6, type: CardType.Event, name: "Strong Bow Shot", value: 0, description: "Damages Random Enemy", image: "bow_shot", abilities: [{ abilityId: "reduce_random_enemy", params: { amount: 3 } }] },
  altar_of_luck: { id: "altar_of_luck", goldValue: 1.29, type: CardType.Treasure, name: "Altar Of Luck", value: 0, description: "Adds +2 card into your fate deck for 1 Gold donation", image: "altar_of_luck", onlyGuarded: true, exchangePrice: { resource: "gold", amount: 1 }, exchangeReward: { type: "fate", modifier: 2 } },

  // --- Chests ---
  wooden_chest: { id: "wooden_chest", goldValue: 2.67, type: CardType.Chest, name: "Wooden Chest", value: 0, description: "Trapped: 2 Damage on failed Agility check", lockDifficulty: 2, trapDamage: 2, image: "wooden_chest" },
  iron_chest: { id: "iron_chest", goldValue: 6, type: CardType.Chest, name: "Iron Chest", value: 0, description: "Trapped: 3 Damage on failed Agility check", lockDifficulty: 4, trapDamage: 3, image: "hardened_chest" },
  iron_chest_heavy: { id: "iron_chest_heavy", goldValue: 8, type: CardType.Chest, name: "Iron Chest", value: 0, description: "Trapped: 4 Damage on failed Agility check", lockDifficulty: 5, trapDamage: 4, image: "posh_chest" },
  ominous_chest: { id: "ominous_chest", goldValue: 5.33, type: CardType.Chest, name: "Ominous Chest", value: 0, description: "Trapped: 4 Damage on failed Agility check", lockDifficulty: 2, trapDamage: 4, image: "ominuous_chest" },
  rusty_chest: { id: "rusty_chest", goldValue: 2, type: CardType.Chest, name: "Rusty Chest", value: 0, description: "Trapped: 3 Damage on failed Agility check", lockDifficulty: 1, trapDamage: 3, image: "strong_chest" },
  trapped_chest: { id: "trapped_chest", goldValue: 4, type: CardType.Chest, name: "Trapped Chest", value: 0, description: "Trapped: 3 Damage on failed Agility check", lockDifficulty: 2, trapDamage: 3, image: "posh_chest" },
  hardened_chest: { id: "hardened_chest", goldValue: 1.67, type: CardType.Chest, name: "Hardened Chest", value: 0, description: "Trapped: 1 Damage on failed Agility check", lockDifficulty: 3, trapDamage: 1, image: "hardened_chest" },

  // --- Keys ---
  rusty_key: { id: "rusty_key", goldValue: 0, type: CardType.Treasure, name: "Rusty Key", value: 1, description: "Opens The Dungeon Door", slot: "weapon", isKey: true, deckLevel: 1, image: "rusty_key" },
  temple_key: { id: "temple_key", goldValue: 0, type: CardType.Treasure, name: "Temple Key", value: 2, description: "Opens the temple gate", slot: "weapon", isKey: true, deckLevel: 2, image: "rusty_key" },
  master_key: { id: "master_key", goldValue: 0, type: CardType.Treasure, name: "Master Key", value: 3, description: "Opens the final door", slot: "weapon", isKey: true, deckLevel: 3, image: "rusty_key" },

  // --- Doors ---
  hall_door: { id: "hall_door", goldValue: 0, type: CardType.Door, name: "Hall Door", value: 0, description: "Open with the key", deckLevel: 1, image: "door" },
  temple_gate: { id: "temple_gate", goldValue: 0, type: CardType.Door, name: "Temple Gate", value: 0, description: "An ornate stone gate", deckLevel: 2, image: "door" },
  final_door: { id: "final_door", goldValue: 0, type: CardType.Door, name: "Final Door", value: 0, description: "The last barrier", deckLevel: 3, image: "door" },
};

export function getCard(id: string): CardData {
  const card = cardRegistry[id];
  if (!card) throw new Error(`Unknown card id: ${id}`);
  return { ...card, abilities: card.abilities?.map(a => ({ ...a, params: { ...a.params } })) };
}
