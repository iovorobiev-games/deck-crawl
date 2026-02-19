import { CardData } from "../entities/CardData";
import { DeckEntry } from "../data/deckConfig";
import { DungeonLevel } from "../data/dungeonConfig";
import { getCard } from "../data/cardRegistry";

export class Deck {
  private cards: CardData[] = [];

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

  static fromDungeonLevel(level: DungeonLevel): Deck {
    const deck = new Deck([]);
    deck.expandEntries(level.cards);
    const bossCard = getCard(level.boss);
    bossCard.isBoss = true;
    deck.cards.push(bossCard);
    deck.cards.push(getCard(level.door));
    deck.shuffle();
    return deck;
  }

  mergeCards(newCards: CardData[]): void {
    for (const card of newCards) {
      this.cards.push(card);
    }
    this.shuffle();
  }

  private shuffle(): void {
    // Fisher-Yates
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
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
}
