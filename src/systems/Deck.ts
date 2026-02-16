import { CardData } from "../entities/CardData";
import { DeckEntry } from "../data/deckConfig";

export class Deck {
  private cards: CardData[] = [];

  constructor(config: DeckEntry[]) {
    for (const entry of config) {
      for (let i = 0; i < entry.count; i++) {
        this.cards.push({
          type: entry.type,
          name: entry.name,
          value: entry.value,
          description: entry.description,
          slot: entry.slot,
          lockDifficulty: entry.lockDifficulty,
          trapDamage: entry.trapDamage,
        });
      }
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
