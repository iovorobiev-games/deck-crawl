export type AbilityTrigger = "dragOnPlayerPortrait" | "onReveal" | "onExplore" | "onDamage";

export type AbilityEffect = "healPlayer" | "damagePlayer" | "shuffleIntoDeck" | "absorbDamage";

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
};

export function getAbility(id: string): AbilityDef {
  const ability = abilityRegistry[id];
  if (!ability) throw new Error(`Unknown ability id: ${id}`);
  return ability;
}
