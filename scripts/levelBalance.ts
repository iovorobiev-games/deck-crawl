/**
 * Calculates dungeon deck vs loot deck gold value per level.
 * Run: npx tsx scripts/levelBalance.ts
 */

import { cardRegistry } from "../src/data/cardRegistry";
import { dungeonConfig } from "../src/data/dungeonConfig";
import { CardType } from "../src/entities/CardData";

// LootConfig types — mirrors the interfaces in dungeonConfig.ts
interface LootEntry {
  id: string;
  weight: number;
  maxCount: number;
}

interface LootConfig {
  guaranteed?: string[];
  pool: LootEntry[];
  bufferSize: number;
}

const ENEMY_TYPES = new Set([CardType.Monster, CardType.Trap, CardType.Chest, CardType.Event]);
const LOOT_CONSUMER_TYPES = new Set([CardType.Monster, CardType.Chest]);
const POWER_ADJUSTMENT_PER_ENEMY = [0, 4, 8]; // gold added per enemy for levels 1, 2, 3

for (let i = 0; i < dungeonConfig.levels.length; i++) {
  const level = dungeonConfig.levels[i];
  const adj = POWER_ADJUSTMENT_PER_ENEMY[i] || 0;

  // Dungeon deck: cards + boss
  let dungeonEnemyGold = 0;
  let dungeonBenefitGold = 0;
  let enemyCount = 0;
  let consumerCount = 0;
  const dungeonBreakdown: string[] = [];

  for (const entry of level.cards) {
    const card = cardRegistry[entry.id];
    if (!card) continue;
    const gold = (card.goldValue || 0) * entry.weight;
    if (ENEMY_TYPES.has(card.type)) {
      dungeonEnemyGold += gold;
      if (card.type === CardType.Monster) enemyCount += entry.weight;
      if (LOOT_CONSUMER_TYPES.has(card.type)) consumerCount += entry.weight;
      dungeonBreakdown.push(`  ${entry.id} x${entry.weight}: ${gold.toFixed(2)} (${card.type})`);
    } else {
      dungeonBenefitGold += gold;
      dungeonBreakdown.push(`  ${entry.id} x${entry.weight}: +${gold.toFixed(2)} (benefit)`);
    }
  }

  // Boss (also a loot consumer)
  const boss = cardRegistry[level.boss];
  if (boss) {
    const bossGold = boss.goldValue || 0;
    dungeonEnemyGold += bossGold;
    enemyCount += 1;
    consumerCount += 1;
    dungeonBreakdown.push(`  ${level.boss} (boss): ${bossGold.toFixed(2)}`);
  }

  // Power adjustment
  const powerAdj = adj * enemyCount;
  dungeonEnemyGold += powerAdj;

  // Loot pool (new LootConfig format)
  const lootCfg = level.loot as unknown as LootConfig;
  const guaranteed = lootCfg.guaranteed || [];
  const pool = lootCfg.pool;
  const bufferSize = lootCfg.bufferSize;
  const poolSize = consumerCount + bufferSize;

  // Guaranteed cards gold
  let guaranteedGold = 0;
  const guaranteedBreakdown: string[] = [];
  for (const id of guaranteed) {
    const card = cardRegistry[id];
    if (!card) continue;
    const gv = card.goldValue || 0;
    guaranteedGold += gv;
    guaranteedBreakdown.push(`  ${id}: ${gv.toFixed(2)} (guaranteed)`);
  }

  // Weighted pool expected card gold value: E[card] = sum(weight_i * gv_i) / sum(weight_i)
  let totalWeight = 0;
  let weightedGoldSum = 0;
  const poolBreakdown: string[] = [];
  for (const entry of pool) {
    const card = cardRegistry[entry.id];
    if (!card) continue;
    const gv = card.goldValue || 0;
    totalWeight += entry.weight;
    weightedGoldSum += entry.weight * gv;
    poolBreakdown.push(`  ${entry.id} w=${entry.weight} max=${entry.maxCount}: gv=${gv.toFixed(2)}`);
  }

  const expectedCardGold = totalWeight > 0 ? weightedGoldSum / totalWeight : 0;

  // Pool composition: guaranteed.length guaranteed cards + (poolSize - guaranteed.length) random cards
  const randomSlots = Math.max(0, poolSize - guaranteed.length);
  const totalPoolGold = guaranteedGold + randomSlots * expectedCardGold;

  // Expected consumed gold = (consumers / poolSize) * totalPoolGold
  const expectedConsumedGold = poolSize > 0
    ? (consumerCount / poolSize) * totalPoolGold
    : 0;

  const totalDungeon = dungeonEnemyGold - dungeonBenefitGold;
  const diff = expectedConsumedGold - totalDungeon;

  console.log(`\n══ Level ${i + 1}: ${level.name} ══`);
  console.log(`\nDungeon deck (enemies/obstacles):`);
  dungeonBreakdown.forEach(l => console.log(l));
  if (adj > 0) {
    console.log(`  power adjustment: +${powerAdj.toFixed(2)} (${adj}/enemy × ${enemyCount} enemies)`);
  }
  console.log(`  ── Enemy/obstacle total:  ${dungeonEnemyGold.toFixed(2)}`);
  console.log(`  ── Dungeon benefits:     -${dungeonBenefitGold.toFixed(2)}`);
  console.log(`  ── Net difficulty:        ${totalDungeon.toFixed(2)}`);

  console.log(`\nLoot pool (consumers=${consumerCount}, bufferSize=${bufferSize}, poolSize=${poolSize}):`);
  if (guaranteedBreakdown.length > 0) {
    console.log(`  Guaranteed cards:`);
    guaranteedBreakdown.forEach(l => console.log(`  ${l}`));
    console.log(`  ── Guaranteed total:      ${guaranteedGold.toFixed(2)}`);
  }
  console.log(`  Weighted pool (E[card] = ${expectedCardGold.toFixed(2)}):`);
  poolBreakdown.forEach(l => console.log(`  ${l}`));
  console.log(`  ── Random slots:          ${randomSlots} × E[card] ${expectedCardGold.toFixed(2)} = ${(randomSlots * expectedCardGold).toFixed(2)}`);
  console.log(`  ── Total pool gold:       ${totalPoolGold.toFixed(2)}`);
  console.log(`  ── Expected consumed:     ${consumerCount}/${poolSize} × ${totalPoolGold.toFixed(2)} = ${expectedConsumedGold.toFixed(2)}`);

  console.log(`\n  ⇒ Difference (loot - difficulty): ${diff >= 0 ? "+" : ""}${diff.toFixed(2)}`);
}
