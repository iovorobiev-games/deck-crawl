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
- **`entities/`** — Phaser `Container` subclasses for visual game objects. `Card` renders a card with type-colored header band and handles reveal/resolve tweens. `PlayerView` renders the player portrait card with HP/power/agility stat badges. `FateDeckPopup` is a modal overlay showing the player's fate modifier cards.
- **`systems/`** — Pure logic classes (not Phaser objects). `Grid` manages a 5x3 cell array mapping grid positions to Cards and converts grid coords to world positions. `Deck` holds a shuffled `CardData[]` and splices from the front on draw. `Player` extends `Phaser.Events.EventEmitter` and emits `hpChanged`/`goldChanged` events for reactive HUD updates.
- **`data/deckConfig.ts`** — Static deck definition. Each `DeckEntry` extends `CardData` with a `count` field; the `Deck` constructor expands these into individual cards.

### Key patterns

- Card effects are **not yet implemented** — `resolveCard` animates card removal but does not apply effects based on `CardType`.
- `Grid` is a plain class (not a Phaser object); it only tracks cell occupancy and coordinate math. Grid dimensions are exported as `COLS` (5) and `ROWS` (3).
- Card dimensions are exported from `Card.ts` as `CARD_W` (100) and `CARD_H` (110) and shared across entities and systems.
- The explore button draws 3 cards into random empty grid slots; the game lock (`isResolving`) prevents interaction during card animations.
- `Player` has a `fateDeck` (array of integer modifiers) viewable via `PlayerView` click → `FateDeckPopup`.
- All interactive Phaser containers use explicit `Phaser.Geom.Rectangle` hit areas (not auto-sized).

### CI/CD

- **Build workflow** (`.github/workflows/build.yml`): Runs on PRs and master pushes. Node 20, `npm ci`, `npm run build`, uploads `dist/` as artifact.
- **Deploy workflow** (`.github/workflows/build_deploy.yml`): Runs on GitHub releases or manual dispatch. Calls the build workflow then deploys to itch.io via Butler.
