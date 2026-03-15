import { CardData, CardType } from "../entities/CardData";
import { DeckEntry } from "../data/deckConfig";
import { DungeonLevel } from "../data/dungeonConfig";
import { getCard } from "../data/cardRegistry";

export class Deck {
  private cards: CardData[] = [];
  private lootPool: CardData[] = [];

  constructor(config: DeckEntry[]) {
    this.expandEntries(config);
    this.shuffle();
  }

  private expandEntries(config: DeckEntry[]): void {
    for (const entry of config) {
      for (let i = 0; i < entry.count; i++) {
        this.cards.push(getCard(entry.id));
      }
    }
  }

  private expandLootEntries(config: DeckEntry[]): void {
    for (const entry of config) {
      for (let i = 0; i < entry.count; i++) {
        this.lootPool.push(getCard(entry.id));
      }
    }
  }

  static fromDungeonLevel(level: DungeonLevel, levelIndex: number): Deck {
    const deck = new Deck([]);
    deck.expandEntries(level.cards);
    deck.expandLootEntries(level.loot);
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
