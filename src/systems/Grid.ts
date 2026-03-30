import { Card, CARD_W, CARD_H } from "../entities/Card";

export const DEFAULT_COLS = 4;
export const DEFAULT_ROWS = 3;
const GAP_X = 16;
const GAP_Y = 32;

export interface CellPos {
  col: number;
  row: number;
}

export class Grid {
  private cells: (Card | null)[][] = [];
  private originX: number;
  private originY: number;
  readonly cols: number;
  readonly rows: number;

  constructor(screenW: number, screenH: number, cols = DEFAULT_COLS, rows = DEFAULT_ROWS) {
    this.cols = cols;
    this.rows = rows;
    const gridW = cols * CARD_W + (cols - 1) * GAP_X;
    const gridH = rows * CARD_H + (rows - 1) * GAP_Y;
    this.originX = (screenW - gridW) / 2 + CARD_W / 2;
    this.originY = (screenH - gridH) / 2 + CARD_H / 2 - 140;

    for (let r = 0; r < rows; r++) {
      this.cells[r] = [];
      for (let c = 0; c < cols; c++) {
        this.cells[r][c] = null;
      }
    }
  }

  worldPos(col: number, row: number): { x: number; y: number } {
    return {
      x: this.originX + col * (CARD_W + GAP_X),
      y: this.originY + row * (CARD_H + GAP_Y),
    };
  }

  getEmptySlots(): CellPos[] {
    const empty: CellPos[] = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
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

  /** Return all cards currently on the grid (non-destructive). */
  getOccupiedCards(): Card[] {
    const cards: Card[] = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const card = this.cells[r][c];
        if (card) cards.push(card);
      }
    }
    return cards;
  }

  /** Remove and return all cards currently on the grid */
  getAllCards(): Card[] {
    const cards: Card[] = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
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
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.cells[r][c] === card) {
          return { col: c, row: r };
        }
      }
    }
    return null;
  }
}
