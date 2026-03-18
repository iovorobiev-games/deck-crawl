/**
 * Standalone script to calculate gold values for all cards in the registry.
 *
 * Gold value represents:
 *   Monsters  – difficulty (how much treasure they should guard)
 *   Treasure  – benefit to the player
 *   Potions   – benefit to the player (healing, tools)
 *   Traps     – difficulty cost
 *   Chests    – difficulty cost
 *   Events    – magnitude of impact (used for insertion calculations)
 *
 * Run:  npx tsx scripts/calculateGoldValues.ts
 *       npx tsx scripts/calculateGoldValues.ts --dry-run   (print only, don't modify)
 */

import * as fs from "fs";
import * as path from "path";
import { cardRegistry } from "../src/data/cardRegistry";
import { getAbility } from "../src/data/abilityRegistry";
import { CardData, CardType } from "../src/entities/CardData";

// ── Gold rates ──────────────────────────────────────────────────────────────
const GOLD_PER_HP = 2;
const GOLD_PER_POWER = 8;
const GOLD_PER_AGILITY = 6;
const GOLD_PER_ENEMY_POWER = 2;
const GOLD_PER_DIFFICULTY = 0.66;
const FATE_DECK = [2, 1, 0, 0, -1, -2];
const FATE_DECK_SIZE = FATE_DECK.length;
const ONCE_MULT = 0.25;
const STARTING_AGILITY = 1;
const P_SCROLL_REUSE = 2; // expected extra uses per scroll from recycling
const P_BOW_SHOT_REUSE = 1.5; // expected extra uses per bow shot from recycling
const AVG_MELEE_POWER_BOOST = 3; // avg total melee weapon power across both slots
const AVG_ABILITY_USES = 2; // avg times a damage-boost passive triggers per game
const P_CONDITIONAL_RETURN = 0.5; // probability a conditional return-to-deck triggers

/** Probability of failing an agility check against a given difficulty. */
function failProbability(lockDifficulty: number): number {
  const fails = FATE_DECK.filter(
    mod => Math.max(0, STARTING_AGILITY + mod) < lockDifficulty,
  ).length;
  return fails / FATE_DECK_SIZE;
}

// ── Memoisation cache ───────────────────────────────────────────────────────
const cache: Record<string, number> = {};

/** Average gold value of cards matching a filter (computed lazily from registry). */
function avgGold(filter: (c: CardData) => boolean): number {
  const cards = Object.values(cardRegistry).filter(filter);
  if (cards.length === 0) return 0;
  return cards.reduce((sum, c) => sum + calcGold(c), 0) / cards.length;
}

// ── Ability gold contribution ───────────────────────────────────────────────
function abilityGold(
  abilityId: string,
  params: Record<string, number | string>,
  card: CardData,
): number {
  const amt = typeof params.amount === "number" ? params.amount : 0;
  const count = typeof params.count === "number" ? params.count : 1;
  const mod = typeof params.modifier === "number" ? params.modifier : 0;
  const cardId = typeof params.cardId === "string" ? params.cardId : "";

  switch (abilityId) {
    // ── Direct heal / absorb ────────────────────────────────────────────
    case "healing":
      return amt * GOLD_PER_HP;
    case "armour":
      return amt * GOLD_PER_HP;
    case "vampiric":
      return amt * GOLD_PER_HP;

    // ── Monster difficulty modifiers ────────────────────────────────────
    case "bonus_counter_damage":
      return amt * GOLD_PER_HP;
    case "agility_drain":
      return Math.abs(amt) * GOLD_PER_AGILITY;
    case "power_drain":
      return Math.abs(amt) * GOLD_PER_POWER;
    case "terror_reveal_damage":
      return amt * GOLD_PER_HP;
    case "terror_explore_damage":
      return amt * GOLD_PER_HP;
    case "terror_buff_monsters":
      return amt * GOLD_PER_ENEMY_POWER;

    // ── Event direct effects (cost to player) ───────────────────────────
    case "attack_from_shadows":
      return amt * GOLD_PER_HP;
    case "deadly_poison_damage":
      return amt * GOLD_PER_HP;
    case "weapon_degrade":
      return amt * GOLD_PER_POWER;

    // ── Insertion: onExplore (recurring, full value) ────────────────────
    case "summonToDeck":
    case "cultist_ritual": {
      const spawned = cardRegistry[cardId];
      if (!spawned) return 0;
      return calcGold(spawned) * count;
    }

    // ── Insertion: one-time (0.25×) ─────────────────────────────────────
    case "tentacle_summon":
    case "horrendous_summon":
    case "terrible_summon":
    case "dark_ritual_summon": {
      const spawned = cardRegistry[cardId];
      if (!spawned) return 0;
      return calcGold(spawned) * count * ONCE_MULT;
    }
    case "poison_trap_insert": {
      const spawned = cardRegistry[cardId];
      if (!spawned) return 0;
      // Only triggers on trap failure, scale by P(fail)
      const pFail = failProbability(card.lockDifficulty || 0);
      return calcGold(spawned) * count * ONCE_MULT * pFail;
    }

    // ── Equip-triggered insertion (one-time) ────────────────────────────
    case "equip_degrade": {
      const spawned = cardRegistry[cardId];
      if (!spawned) return 0;
      const spawnedGold = calcGold(spawned);
      // Curse cards hurt the player → subtract from equipment value
      // Beneficial cards (bow shots) → add to equipment value
      if (spawned.tag === "curse") {
        return -spawnedGold * count * ONCE_MULT;
      }
      return spawnedGold * count * ONCE_MULT;
    }

    // ── Enemy power reduction ───────────────────────────────────────────
    case "reduce_random_enemy":
      return amt * GOLD_PER_ENEMY_POWER;
    case "reduce_target_monster":
      return amt * GOLD_PER_ENEMY_POWER;
    case "reduce_adjacent_monsters":
      return amt * 2 * GOLD_PER_ENEMY_POWER; // avg 2 targets × amount × rate

    // ── Temporary weapon buff (one-time use) ────────────────────────────
    case "temp_buff_weapon":
      return amt * GOLD_PER_POWER * ONCE_MULT;

    // ── Fate deck ───────────────────────────────────────────────────────
    case "add_fate_modifier":
      return (mod / (FATE_DECK_SIZE + 1)) * GOLD_PER_POWER;

    // ── Return-to-deck (correction applied in calcGold) ────────────────
    case "return_conditional":
      return 0; // handled via algebraic correction in calcGold

    // ── Utility items ───────────────────────────────────────────────────
    case "auto_open_chest":
      return avgGold(c => c.type === CardType.Chest);
    case "disarm_tool":
      return avgGold(c => c.type === CardType.Trap);
    case "remove_dark_event":
      return avgGold(c => c.tag === "curse");

    // ── Synergy passives ────────────────────────────────────────────────
    case "melee_weapon_boost":
      // amt > 0: flat +amt per weapon; amt = 0: doubles weapon power
      return (amt > 0 ? amt : 1) * AVG_MELEE_POWER_BOOST * GOLD_PER_POWER;
    case "scroll_damage_boost":
      return amt * GOLD_PER_ENEMY_POWER * AVG_ABILITY_USES;
    case "bow_damage_boost":
      return amt * GOLD_PER_ENEMY_POWER * AVG_ABILITY_USES;
    case "scroll_recycle":
      return avgGold(c => c.tag === "scroll") * P_SCROLL_REUSE;
    case "bow_agility_damage": {
      // Adds player agility to each bow shot's damage
      const bows = Object.values(cardRegistry).filter(c => c.tag === "bow");
      const avgShots = bows.length === 0 ? 0
        : bows.reduce((sum, b) => {
            const eq = b.abilities?.find(a => a.abilityId === "equip_degrade");
            return sum + (typeof eq?.params.count === "number" ? eq.params.count : 1);
          }, 0) / bows.length;
      return STARTING_AGILITY * avgShots * GOLD_PER_ENEMY_POWER;
    }
    case "bow_shot_recycle":
      return avgGold(c => c.id === "bow_shot" || c.id === "strong_bow_shot") * P_BOW_SHOT_REUSE;
    case "quiver_trigger": {
      // Triggers bow ability — value = average bow equip_degrade contribution
      const bows = Object.values(cardRegistry).filter(c => c.tag === "bow");
      if (bows.length === 0) return 0;
      let total = 0;
      for (const bow of bows) {
        const eq = bow.abilities?.find(a => a.abilityId === "equip_degrade");
        if (eq) total += abilityGold("equip_degrade", eq.params, bow);
      }
      return total / bows.length;
    }
    case "buff_monster_type":
      return -(amt * GOLD_PER_ENEMY_POWER);

    default:
      return 0;
  }
}

// ── Main gold value calculation ─────────────────────────────────────────────
function calcGold(card: CardData): number {
  if (cache[card.id] !== undefined) return cache[card.id];
  cache[card.id] = 0; // prevent infinite recursion

  // Keys and doors have no gold value
  if (card.isKey || card.type === CardType.Door) {
    cache[card.id] = 0;
    return 0;
  }

  let gold = 0;

  // Base value by card type
  switch (card.type) {
    case CardType.Monster:
      gold = card.value * GOLD_PER_ENEMY_POWER;
      break;
    case CardType.Treasure:
      if (card.slot) {
        gold = card.value * GOLD_PER_POWER;
      } else if (!card.exchangePrice) {
        gold = card.value; // gold piles: face value
      }
      break;
    case CardType.Potion:
      break; // value comes from abilities
    case CardType.Trap:
      gold = (card.trapDamage || 0) * GOLD_PER_HP * failProbability(card.lockDifficulty || 0);
      break;
    case CardType.Chest:
      gold = (card.trapDamage || 0) * GOLD_PER_HP * failProbability(card.lockDifficulty || 0);
      break;
    case CardType.Event:
      break; // value comes from abilities
    case CardType.Door:
      break;
  }

  // Stat bonuses
  if (card.agilityBonus) gold += card.agilityBonus * GOLD_PER_AGILITY;
  if (card.maxHpBonus) gold += card.maxHpBonus * GOLD_PER_HP;

  // Exchange rewards (e.g. altar_of_luck)
  if (card.exchangeReward) {
    if (card.exchangeReward.type === "fate") {
      gold += (card.exchangeReward.modifier / (FATE_DECK_SIZE + 1)) * GOLD_PER_POWER;
    } else if (card.exchangeReward.type === "treasure") {
      const rc = cardRegistry[card.exchangeReward.cardId];
      if (rc) gold += calcGold(rc);
    }
    if (card.exchangePrice) {
      if (card.exchangePrice.resource === "gold") gold -= card.exchangePrice.amount;
      else gold -= card.exchangePrice.amount * GOLD_PER_HP;
    }
  }

  // Abilities
  if (card.abilities) {
    for (const a of card.abilities) {
      gold += abilityGold(a.abilityId, a.params, card);
    }
  }

  // Algebraic correction for return-to-deck abilities:
  // If G = base + P * G * ONCE_MULT, then G = base / (1 - P * ONCE_MULT)
  if (card.abilities) {
    for (const a of card.abilities) {
      if (a.abilityId === "return_conditional") {
        const P = a.params.requiredDiscardId ? P_CONDITIONAL_RETURN : 1;
        gold = gold / (1 - P * ONCE_MULT);
      }
    }
  }

  gold = Math.round(gold * 100) / 100;
  cache[card.id] = gold;
  return gold;
}

// ── Run ─────────────────────────────────────────────────────────────────────
const dryRun = process.argv.includes("--dry-run");

// Calculate all gold values
const results: { id: string; name: string; type: string; gold: number }[] = [];
for (const [id, card] of Object.entries(cardRegistry)) {
  const gold = calcGold(card);
  results.push({ id, name: card.name, type: card.type, gold });
}

// Print summary table
console.log("\n=== Card Gold Values ===\n");
const grouped = new Map<string, typeof results>();
for (const r of results) {
  if (!grouped.has(r.type)) grouped.set(r.type, []);
  grouped.get(r.type)!.push(r);
}
for (const [type, cards] of grouped) {
  console.log(`── ${type} ──`);
  for (const c of cards) {
    console.log(`  ${c.id.padEnd(28)} ${c.gold.toString().padStart(6)} gold   (${c.name})`);
  }
  console.log();
}

if (dryRun) {
  console.log("(dry run — file not modified)");
  process.exit(0);
}

// Update cardRegistry.ts
const __dirname = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const registryPath = path.resolve(__dirname, "../src/data/cardRegistry.ts");
let source = fs.readFileSync(registryPath, "utf-8");

for (const { id, gold } of results) {
  // Remove any existing goldValue field
  const removeRe = new RegExp(`(\\b${id}:\\s*\\{[^}]*?)goldValue:\\s*[\\d.e+-]+,?\\s*`, "g");
  source = source.replace(removeRe, "$1");

  // Insert goldValue right after  id: "…",
  const insertRe = new RegExp(`(id:\\s*"${id}",\\s*)`);
  source = source.replace(insertRe, `$1goldValue: ${gold}, `);
}

fs.writeFileSync(registryPath, source, "utf-8");
console.log(`✓ Updated ${registryPath}`);
