# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server:** `npm run dev` (Vite, opens at localhost:5173)
- **Build:** `npm run build` (runs `tsc && vite build`, outputs to `dist/`)
- **Preview production build:** `npm run preview`
- **Type-check only:** `npx tsc --noEmit`

No test framework is configured yet.

## Architecture

Deck Crawl is a browser-based card-crawling game built with **Phaser 3** and **TypeScript**, bundled with **Vite**.

Game resolution is 960x540 with `Phaser.Scale.FIT` auto-centering. All visuals are drawn programmatically with `Phaser.GameObjects.Graphics` (no sprite assets).

### Source layout (`src/`)

- **`main.ts`** — Entry point. Creates the Phaser game with scene list `[BootScene, GameScene]`.
- **`scenes/`** — Phaser scenes. `BootScene` is a placeholder for future asset loading; `GameScene` owns all gameplay logic (HUD, grid rendering, card drawing/placement, explore button, card interaction).
- **`entities/`** — `CardData.ts` defines the `CardType` enum, `CardData` interface, and color map. `Card.ts` is a `Phaser.GameObjects.Container` that renders a card face with type-colored header band and handles reveal/resolve tweens.
- **`systems/`** — Pure logic classes. `Grid` manages a 4x4 cell array mapping grid positions to Cards and converts grid coords to world positions. `Deck` holds a shuffled `CardData[]` and splices from the front on draw. `Player` extends `Phaser.Events.EventEmitter` and emits `hpChanged`/`goldChanged` events for reactive HUD updates.
- **`data/deckConfig.ts`** — Static deck definition. Each `DeckEntry` extends `CardData` with a `count` field; the `Deck` constructor expands these into individual cards.

### Key patterns

- Card effects are **not yet implemented** — `resolveCard` animates card removal but does not apply effects based on `CardType`.
- `Grid` is a plain class (not a Phaser object); it only tracks cell occupancy and coordinate math.
- The explore button draws 3 cards into random empty grid slots; the game lock (`isResolving`) prevents interaction during card animations.
