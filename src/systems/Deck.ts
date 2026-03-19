import { CardData, CardType } from "../entities/CardData";
import { DeckEntry, DUNGEON_DECK_SIZE, LOOT_POOL_SIZE } from "../data/deckConfig";
import { DungeonLevel } from "../data/dungeonConfig";
import { getCard } from "../data/cardRegistry";

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

  constructor(config: DeckEntry[]) {
    if (config.length > 0) {
      this.cards = weightedSample(config, DUNGEON_DECK_SIZE);
    }
    this.shuffle();
  }

  static fromDungeonLevel(level: DungeonLevel, levelIndex: number): Deck {
    const deck = new Deck([]);
    deck.cards = weightedSample(level.cards, DUNGEON_DECK_SIZE);
    deck.lootPool = weightedSample(level.loot, LOOT_POOL_SIZE);

    const bossCard = getCard(level.boss);
    bossCard.isBoss = true;
    deck.cards.push(bossCard);
    deck.cards.push(getCard(level.door));

    // Scale monster power by dungeon depth: +2 per level above the first
    const powerBonus = levelIndex * 2;
    if (powerBonus > 0) {
      for (const card of deck.cards) {
        if (card.type === CardType.Monster) {
          card.value += powerBonus;
        }
      }
    }

    deck.shuffle();
    deck.shuffleLoot();
    return deck;
  }

  mergeCards(newCards: CardData[]): void {
    for (const card of newCards) {
      this.cards.push(card);
    }
    this.shuffle();
  }

  mergeLoot(newLoot: CardData[]): void {
    for (const card of newLoot) {
      this.lootPool.push(card);
    }
    this.shuffleLoot();
  }

  private shuffle(): void {
    // Fisher-Yates
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  private shuffleLoot(): void {
    for (let i = this.lootPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.lootPool[i], this.lootPool[j]] = [this.lootPool[j], this.lootPool[i]];
    }
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
