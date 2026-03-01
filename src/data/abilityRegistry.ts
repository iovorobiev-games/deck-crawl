export type AbilityTrigger =
  | "dragOnPlayerPortrait"
  | "dragOnTrap"
  | "dragOnWeapon"
  | "dragOnMonster"
  | "onReveal"
  | "onExplore"
  | "onDamage"
  | "onEquip"
  | "onDiscard"
  | "onMonsterDeath"
  | "onCounterAttack"
  | "passive";

export type AbilityEffect = "healPlayer" | "damagePlayer" | "shuffleIntoDeck" | "absorbDamage" | "modifyAgility";

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
};

export function getAbility(id: string): AbilityDef {
  const ability = abilityRegistry[id];
  if (!ability) throw new Error(`Unknown ability id: ${id}`);
  return ability;
}
