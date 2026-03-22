export type AbilityTrigger =
  | "dragOnPlayerPortrait"
  | "dragOnTrap"
  | "dragOnWeapon"
  | "dragOnMonster"
  | "dragOnChest"
  | "dragOnTag"
  | "onReveal"
  | "onExplore"
  | "onDamage"
  | "onEquip"
  | "onDiscard"
  | "onMonsterDeath"
  | "onCounterAttack"
  | "onResolve"
  | "onTrapTriggered"
  | "passive";

export type AbilityEffect =
  | "healPlayer"
  | "damagePlayer"
  | "shuffleIntoDeck"
  | "shuffleIntoDeckIfAbsent"
  | "shuffleSelfIntoDeck"
  | "absorbDamage"
  | "modifyAgility"
  | "modifyPower"
  | "modifyMonsterPower"
  | "reduceWeaponPower"
  | "reduceRandomEnemyPower"
  | "reduceTargetMonsterPower"
  | "reduceAdjacentMonsterPower"
  | "autoOpenChest"
  | "tempBuffWeapon"
  | "removeDarkEvent"
  | "removeFromDeck"
  | "addFateModifier"
  | "buffMonsterType"
  | "returnSelfConditional"
  | "bonusCounterDamage"
  | "triggerBowAbility"
  | "boostMeleeWeaponPower"
  | "boostScrollDamage"
  | "recycleScrolls"
  | "boostBowDamage"
  | "addAgilityToBowDamage"
  | "recycleBowShots";

export interface AbilityDef {
  id: string;
  trigger: AbilityTrigger;
  effect: AbilityEffect;
  description: string;
}

export interface CardAbility {
  abilityId: string;
  params: Record<string, number | string>;
}

const abilityRegistry: Record<string, AbilityDef> = {
  healing: {
    id: "healing",
    trigger: "dragOnPlayerPortrait",
    effect: "healPlayer",
    description: "Drag onto player portrait to restore HP",
  },
  attack_from_shadows: {
    id: "attack_from_shadows",
    trigger: "onReveal",
    effect: "damagePlayer",
    description: "Deals damage to the player when revealed",
  },
  summonToDeck: {
    id: "summonToDeck",
    trigger: "onExplore",
    effect: "shuffleIntoDeck",
    description: "Shuffles minions into the dungeon deck when you explore",
  },
  armour: {
    id: "armour",
    trigger: "onDamage",
    effect: "absorbDamage",
    description: "Absorbs damage before it reaches HP",
  },
  agility_drain: {
    id: "agility_drain",
    trigger: "passive",
    effect: "modifyAgility",
    description: "-1 Agility",
  },
  equip_heal: {
    id: "equip_heal",
    trigger: "onEquip",
    effect: "healPlayer",
    description: "Heals when equipped",
  },
  discard_damage: {
    id: "discard_damage",
    trigger: "onDiscard",
    effect: "damagePlayer",
    description: "Hurts when discarded",
  },
  vampiric: {
    id: "vampiric",
    trigger: "onMonsterDeath",
    effect: "healPlayer",
    description: "Heals when a monster is slain",
  },
  thorns: {
    id: "thorns",
    trigger: "onCounterAttack",
    effect: "damagePlayer",
    description: "Damages attacker before counterattack",
  },
  disarm_tool: {
    id: "disarm_tool",
    trigger: "dragOnTrap",
    effect: "healPlayer",
    description: "Drag onto a trap to disarm it",
  },
  apply_to_weapon: {
    id: "apply_to_weapon",
    trigger: "dragOnWeapon",
    effect: "healPlayer",
    description: "Drag onto a weapon to apply",
  },
  throw_at_monster: {
    id: "throw_at_monster",
    trigger: "dragOnMonster",
    effect: "damagePlayer",
    description: "Drag onto a monster to throw",
  },
  cultist_ritual: {
    id: "cultist_ritual",
    trigger: "onExplore",
    effect: "shuffleIntoDeck",
    description: "Summons dark rituals when you explore",
  },
  dark_ritual_summon: {
    id: "dark_ritual_summon",
    trigger: "onResolve",
    effect: "shuffleIntoDeck",
    description: "Summons a tentacle into the deck",
  },
  tentacle_summon: {
    id: "tentacle_summon",
    trigger: "onReveal",
    effect: "shuffleIntoDeck",
    description: "Summons a horrendous tentacle",
  },
  horrendous_summon: {
    id: "horrendous_summon",
    trigger: "onReveal",
    effect: "shuffleIntoDeck",
    description: "Summons a terrible tentacle",
  },
  terrible_summon: {
    id: "terrible_summon",
    trigger: "onReveal",
    effect: "shuffleIntoDeckIfAbsent",
    description: "Summons the Terror From The Beyond",
  },
  terror_reveal_damage: {
    id: "terror_reveal_damage",
    trigger: "onReveal",
    effect: "damagePlayer",
    description: "Deals 5 damage on reveal",
  },
  terror_explore_damage: {
    id: "terror_explore_damage",
    trigger: "onExplore",
    effect: "damagePlayer",
    description: "Deals 2 damage when you explore",
  },
  terror_buff_monsters: {
    id: "terror_buff_monsters",
    trigger: "passive",
    effect: "modifyMonsterPower",
    description: "+2 to all monsters",
  },
  poison_trap_insert: {
    id: "poison_trap_insert",
    trigger: "onTrapTriggered",
    effect: "shuffleIntoDeck",
    description: "Poisons shuffle into deck on trigger",
  },
  deadly_poison_damage: {
    id: "deadly_poison_damage",
    trigger: "onResolve",
    effect: "damagePlayer",
    description: "Deals 1 damage",
  },
  power_drain: {
    id: "power_drain",
    trigger: "passive",
    effect: "modifyPower",
    description: "-1 Power",
  },
  equip_degrade: {
    id: "equip_degrade",
    trigger: "onEquip",
    effect: "shuffleIntoDeck",
    description: "Inserts weapon degradation into deck",
  },
  weapon_degrade: {
    id: "weapon_degrade",
    trigger: "onReveal",
    effect: "reduceWeaponPower",
    description: "Reduces weapon power by 1",
  },
  reduce_random_enemy: {
    id: "reduce_random_enemy",
    trigger: "onReveal",
    effect: "reduceRandomEnemyPower",
    description: "Reduces a random enemy's power",
  },
  reduce_target_monster: {
    id: "reduce_target_monster",
    trigger: "dragOnMonster",
    effect: "reduceTargetMonsterPower",
    description: "Reduces target monster's power",
  },
  reduce_adjacent_monsters: {
    id: "reduce_adjacent_monsters",
    trigger: "dragOnMonster",
    effect: "reduceAdjacentMonsterPower",
    description: "Reduces target and adjacent monsters' power",
  },
  auto_open_chest: {
    id: "auto_open_chest",
    trigger: "dragOnChest",
    effect: "autoOpenChest",
    description: "Drag onto a chest to open it",
  },
  temp_buff_weapon: {
    id: "temp_buff_weapon",
    trigger: "dragOnWeapon",
    effect: "tempBuffWeapon",
    description: "Temporarily boosts weapon power for next battle",
  },
  remove_dark_event: {
    id: "remove_dark_event",
    trigger: "dragOnPlayerPortrait",
    effect: "removeDarkEvent",
    description: "Removes a dark event from the deck",
  },
  add_fate_modifier: {
    id: "add_fate_modifier",
    trigger: "onDiscard",
    effect: "addFateModifier",
    description: "Adds a modifier to your fate deck",
  },
  buff_monster_type: {
    id: "buff_monster_type",
    trigger: "onDiscard",
    effect: "buffMonsterType",
    description: "Strengthens a specific monster type",
  },
  return_conditional: {
    id: "return_conditional",
    trigger: "onMonsterDeath",
    effect: "returnSelfConditional",
    description: "Returns to deck if condition met",
  },
  bonus_counter_damage: {
    id: "bonus_counter_damage",
    trigger: "onCounterAttack",
    effect: "bonusCounterDamage",
    description: "Deals extra damage on counterattack",
  },
  quiver_trigger: {
    id: "quiver_trigger",
    trigger: "dragOnTag",
    effect: "triggerBowAbility",
    description: "Triggers equipped bow's ability",
  },
  purify_deck: {
    id: "purify_deck",
    trigger: "onResolve",
    effect: "removeFromDeck",
    description: "Removes a dark card from the deck",
  },
  bless_fate: {
    id: "bless_fate",
    trigger: "onResolve",
    effect: "addFateModifier",
    description: "Adds a +2 fate card to your fate deck",
  },
  melee_weapon_boost: {
    id: "melee_weapon_boost",
    trigger: "passive",
    effect: "boostMeleeWeaponPower",
    description: "Doubles melee weapon power",
  },
  scroll_damage_boost: {
    id: "scroll_damage_boost",
    trigger: "passive",
    effect: "boostScrollDamage",
    description: "+2 damage from scrolls",
  },
  scroll_recycle: {
    id: "scroll_recycle",
    trigger: "passive",
    effect: "recycleScrolls",
    description: "All scrolls return to the Dungeon Deck after use",
  },
  bow_damage_boost: {
    id: "bow_damage_boost",
    trigger: "passive",
    effect: "boostBowDamage",
    description: "+2 to Bow Shot damage",
  },
  bow_agility_damage: {
    id: "bow_agility_damage",
    trigger: "passive",
    effect: "addAgilityToBowDamage",
    description: "Adds Agility to Bow Shot damage",
  },
  bow_shot_recycle: {
    id: "bow_shot_recycle",
    trigger: "passive",
    effect: "recycleBowShots",
    description: "Bow shots return to the Dungeon Deck if target survives",
  },
};

export function getAbility(id: string): AbilityDef {
  const ability = abilityRegistry[id];
  if (!ability) throw new Error(`Unknown ability id: ${id}`);
  return ability;
}
