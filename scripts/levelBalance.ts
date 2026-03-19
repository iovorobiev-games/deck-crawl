/**
 * Calculates dungeon deck vs loot deck gold value per level.
 * Run: npx tsx scripts/levelBalance.ts
 */

import { cardRegistry } from "../src/data/cardRegistry";
import { dungeonConfig } from "../src/data/dungeonConfig";
import { CardType } from "../src/entities/CardData";

const ENEMY_TYPES = new Set([CardType.Monster, CardType.Trap, CardType.Chest, CardType.Event]);
const POWER_ADJUSTMENT_PER_ENEMY = [0, 4, 8]; // gold added per enemy for levels 1, 2, 3

for (let i = 0; i < dungeonConfig.levels.length; i++) {
  const level = dungeonConfig.levels[i];
  const adj = POWER_ADJUSTMENT_PER_ENEMY[i] || 0;

  // Dungeon deck: cards + boss
  let dungeonEnemyGold = 0;
  let dungeonBenefitGold = 0;
  let enemyCount = 0;
  const dungeonBreakdown: string[] = [];

  for (const entry of level.cards) {
    const card = cardRegistry[entry.id];
    if (!card) continue;
    const gold = (card.goldValue || 0) * entry.weight;
    if (ENEMY_TYPES.has(card.type)) {
      dungeonEnemyGold += gold;
      if (card.type === CardType.Monster) enemyCount += entry.weight;
      dungeonBreakdown.push(`  ${entry.id} x${entry.weight}: ${gold.toFixed(2)} (${card.type})`);
    } else {
      dungeonBenefitGold += gold;
      dungeonBreakdown.push(`  ${entry.id} x${entry.weight}: +${gold.toFixed(2)} (benefit)`);
    }
  }

  // Boss
  const boss = cardRegistry[level.boss];
  if (boss) {
    const bossGold = boss.goldValue || 0;
    dungeonEnemyGold += bossGold;
    enemyCount += 1;
    dungeonBreakdown.push(`  ${level.boss} (boss): ${bossGold.toFixed(2)}`);
  }

  // Power adjustment
  const powerAdj = adj * enemyCount;
  dungeonEnemyGold += powerAdj;

  // Loot deck
  let lootGold = 0;
  const lootBreakdown: string[] = [];
  for (const entry of level.loot) {
    const card = cardRegistry[entry.id];
    if (!card) continue;
    const gold = (card.goldValue || 0) * entry.weight;
    lootGold += gold;
    lootBreakdown.push(`  ${entry.id} x${entry.weight}: ${gold.toFixed(2)}`);
  }

  const totalDungeon = dungeonEnemyGold - dungeonBenefitGold;
  const diff = lootGold - totalDungeon;

  console.log(`\n══ Level ${i + 1}: ${level.name} ══`);
  console.log(`\nDungeon deck (enemies/obstacles):`);
  dungeonBreakdown.forEach(l => console.log(l));
  if (adj > 0) {
    console.log(`  power adjustment: +${powerAdj.toFixed(2)} (${adj}/enemy × ${enemyCount} enemies)`);
  }
  console.log(`  ── Enemy/obstacle total:  ${dungeonEnemyGold.toFixed(2)}`);
  console.log(`  ── Dungeon benefits:     -${dungeonBenefitGold.toFixed(2)}`);
  console.log(`  ── Net difficulty:        ${totalDungeon.toFixed(2)}`);

  console.log(`\nLoot deck:`);
  lootBreakdown.forEach(l => console.log(l));
  console.log(`  ── Loot total:            ${lootGold.toFixed(2)}`);

  console.log(`\n  ⇒ Difference (loot - difficulty): ${diff >= 0 ? "+" : ""}${diff.toFixed(2)}`);
}
