import { CardData, CardType } from "../entities/CardData";
import { DeckEntry, DUNGEON_DECK_SIZE } from "../data/deckConfig";
import { DungeonLevel, LootConfig } from "../data/dungeonConfig";
import { cardRegistry, getCard } from "../data/cardRegistry";

function weightedSample(entries: DeckEntry[], size: number): CardData[] {
  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  const cards: CardData[] = [];
  for (let i = 0; i < size; i++) {
    let roll = Math.random() * totalWeight;
    for (const entry of entries) {
      roll -= entry.weight;
      if (roll <= 0) {
        cards.push(getCard(entry.id));
        break;
      }
    }
  }
  return cards;
}

export class Deck {
  private cards: CardData[] = [];
  private lootPool: CardData[] = [];
  private isOrdered = false;
  onShuffle: (() => void) | null = null;

  /** Scale monster power by dungeon depth: +2 per gameplay level above the first. */
  static applyLevelScaling(card: CardData, gameplayLevelIndex: number): void {
    const powerBonus = Math.max(0, gameplayLevelIndex) * 2;
    if (powerBonus > 0 && card.type === CardType.Monster) {
      card.value += powerBonus;
    }
  }

  constructor(config: DeckEntry[]) {
    if (config.length > 0) {
      this.cards = weightedSample(config, DUNGEON_DECK_SIZE);
    }
    this.shuffle();
  }

  static fromDungeonLevel(level: DungeonLevel, levelIndex: number, gameplayLevelIndex = levelIndex): Deck {
    const deck = new Deck([]);

    if (level.orderedCards) {
      // Fixed card order — no weighted sampling, no shuffle
      deck.cards = level.orderedCards.map(id => {
        const card = getCard(id);
        if (id === level.boss) card.isBoss = true;
        return card;
      });
      if (level.orderedLoot) {
        deck.lootPool = level.orderedLoot.map(id => getCard(id));
      }
      deck.isOrdered = true;
      return deck;
    }

    deck.cards = weightedSample(level.cards, DUNGEON_DECK_SIZE);

    // Count loot consumers (non-boss monsters + chests)
    // Use weighted proportion of DUNGEON_DECK_SIZE to estimate actual card counts
    const totalWeight = level.cards.reduce((sum, e) => sum + e.weight, 0);
    let consumers = 0;
    for (const entry of level.cards) {
      const card = cardRegistry[entry.id];
      if (card && (card.type === CardType.Monster || card.type === CardType.Chest)) {
        consumers += Math.round((entry.weight / totalWeight) * DUNGEON_DECK_SIZE);
      }
    }
    const poolSize = consumers + level.loot.bufferSize;
    deck.generateLootPool(level.loot, poolSize);

    const bossCard = getCard(level.boss);
    bossCard.isBoss = true;
    deck.cards.push(bossCard);
    deck.cards.push(getCard(level.door));

    for (const card of deck.cards) {
      Deck.applyLevelScaling(card, gameplayLevelIndex);
    }

    deck.shuffle();
    return deck;
  }

  private generateLootPool(config: LootConfig, poolSize: number): void {
    const guaranteed: CardData[] = [];

    // Collect guaranteed cards separately
    if (config.guaranteed) {
      for (const id of config.guaranteed) {
        guaranteed.push(getCard(id));
      }
    }

    // Build candidates with count tracking
    this.lootPool = [];
    const candidates = config.pool.map(entry => ({
      ...entry,
      currentCount: 0,
    }));

    // Fill slots with weighted random draws
    const remaining = poolSize - guaranteed.length;
    for (let i = 0; i < remaining; i++) {
      const available = candidates.filter(c => c.currentCount < c.maxCount);
      if (available.length === 0) break;

      const totalWeight = available.reduce((sum, c) => sum + c.weight, 0);
      let roll = Math.random() * totalWeight;
      let selected = available[available.length - 1]; // fallback
      for (const candidate of available) {
        roll -= candidate.weight;
        if (roll <= 0) {
          selected = candidate;
          break;
        }
      }

      this.lootPool.push(getCard(selected.id));
      selected.currentCount++;
    }

    // Shuffle random items, then insert guaranteed items in the first half
    this.shuffleLoot();
    const halfPool = Math.max(1, Math.floor(this.lootPool.length / 2));
    for (const card of guaranteed) {
      const pos = Math.floor(Math.random() * halfPool);
      this.lootPool.splice(pos, 0, card);
    }
  }

  mergeCards(newCards: CardData[]): void {
    for (const card of newCards) {
      this.cards.push(card);
    }
    this.shuffle();
  }

  replaceLoot(newLoot: CardData[]): void {
    this.lootPool = newLoot;
  }

  private shuffle(): void {
    if (this.isOrdered) return;
    // Fisher-Yates
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
    this.onShuffle?.();
  }

  private shuffleLoot(): void {
    for (let i = this.lootPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.lootPool[i], this.lootPool[j]] = [this.lootPool[j], this.lootPool[i]];
    }
    this.onShuffle?.();
  }

  draw(n: number): CardData[] {
    return this.cards.splice(0, Math.min(n, this.cards.length));
  }

  get remaining(): number {
    return this.cards.length;
  }

  get isEmpty(): boolean {
    return this.cards.length === 0;
  }

  hasCard(id: string): boolean {
    return this.cards.some(c => c.id === id);
  }

  removeFirstByTag(tag: string): CardData | null {
    const idx = this.cards.findIndex(c => c.tag === tag);
    if (idx === -1) return null;
    return this.cards.splice(idx, 1)[0];
  }

  removeCardById(id: string): CardData | null {
    const idx = this.cards.findIndex(c => c.id === id);
    if (idx === -1) return null;
    return this.cards.splice(idx, 1)[0];
  }

  drawLoot(): CardData | null {
    if (this.lootPool.length === 0) return null;
    return this.lootPool.splice(0, 1)[0];
  }

  drawLootForChest(): CardData | null {
    const idx = this.lootPool.findIndex(c => !c.onlyGuarded);
    if (idx === -1) return null;
    return this.lootPool.splice(idx, 1)[0];
  }

  drainLoot(): CardData[] {
    return this.lootPool.splice(0, this.lootPool.length);
  }

  buffCardById(id: string, amount: number): void {
    for (const card of this.cards) {
      if (card.id === id) {
        card.value += amount;
      }
    }
  }
}
