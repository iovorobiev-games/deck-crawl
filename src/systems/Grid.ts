import { Card, CARD_W, CARD_H } from "../entities/Card";

export const COLS = 5;
export const ROWS = 3;
const GAP = 16;

export interface CellPos {
  col: number;
  row: number;
}

export class Grid {
  private cells: (Card | null)[][] = [];
  private originX: number;
  private originY: number;

  constructor(screenW: number, screenH: number) {
    const gridW = COLS * CARD_W + (COLS - 1) * GAP;
    const gridH = ROWS * CARD_H + (ROWS - 1) * GAP;
    this.originX = (screenW - gridW) / 2 + CARD_W / 2;
    this.originY = (screenH - gridH) / 2 + CARD_H / 2 - 140;

    for (let r = 0; r < ROWS; r++) {
      this.cells[r] = [];
      for (let c = 0; c < COLS; c++) {
        this.cells[r][c] = null;
      }
    }
  }

  worldPos(col: number, row: number): { x: number; y: number } {
    return {
      x: this.originX + col * (CARD_W + GAP),
      y: this.originY + row * (CARD_H + GAP),
    };
  }

  getEmptySlots(): CellPos[] {
    const empty: CellPos[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!this.cells[r][c]) {
          empty.push({ col: c, row: r });
        }
      }
    }
    return empty;
  }

  placeCard(col: number, row: number, card: Card): void {
    this.cells[row][col] = card;
  }

  removeCard(col: number, row: number): Card | null {
    const card = this.cells[row][col];
    this.cells[row][col] = null;
    return card;
  }

  getCardAt(col: number, row: number): Card | null {
    return this.cells[row]?.[col] ?? null;
  }

  /** Remove and return all cards currently on the grid */
  getAllCards(): Card[] {
    const cards: Card[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const card = this.cells[r][c];
        if (card) {
          cards.push(card);
          this.cells[r][c] = null;
        }
      }
    }
    return cards;
  }

  /** Find which cell a card belongs to */
  findCard(card: Card): CellPos | null {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.cells[r][c] === card) {
          return { col: c, row: r };
        }
      }
    }
    return null;
  }
}
