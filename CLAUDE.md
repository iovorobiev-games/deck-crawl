# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow

1. Never jump straight into implementation. Interview the user to clarify requirements and narrow down the scope of the task.
2. Before beginning any new task, start a new git worktree and work within it.
3. In the worktree, pull the latest master and create a new branch from it. ALWAYS make changes on top of the latest master.

## Commands

- **Dev server:** `npm run dev` (Vite, opens at localhost:5173)
- **Build:** `npm run build` (runs `tsc && vite build`, outputs to `dist/`)
- **Preview production build:** `npm run preview`
- **Type-check only:** `npx tsc --noEmit`

No unit tests exist. ALWAYS use ui-test skill to verify changes visually.

## Architecture

Deck Crawl is a browser-based card-crawling game built with **Phaser 3** and **TypeScript**, bundled with **Vite**.

Game resolution is 1920x1080 with `Phaser.Scale.FIT` auto-centering. UI chrome (player portrait, panels, inventory slots, stat icons) uses sprite assets from `public/sprites/`. Cards are still drawn programmatically with `Phaser.GameObjects.Graphics`.

### Source layout (`src/`)

- **`main.ts`** — Entry point. Creates the Phaser game with scene list `[BootScene, GameScene]`.
- **`scenes/`** — Phaser scenes. `BootScene` preloads all sprite assets from `public/sprites/`; `GameScene` owns all gameplay logic and orchestrates all systems and entities (~2000 lines).
- **`entities/`** — Phaser `Container` subclasses for visual game objects: `Card`, `PlayerView`, `InventoryView`, `FateDeckPopup`, `GameOverScreen`, `WinScreen`. Also contains `CardData.ts` which defines `CardType` enum, `EquipSlot` type, `CardData` interface, and `CardColorMap`.
- **`systems/`** — Logic classes (extend `Phaser.Events.EventEmitter` where events are needed). `Grid` manages a 5x3 cell array. `Deck` holds a shuffled `CardData[]` and supports `Deck.fromDungeonLevel()` factory. `Player` tracks HP/power/agility/gold/fateDeck. `Inventory` tracks 6 equipment slots.
- **`data/cardRegistry.ts`** — Central card definitions. `cardRegistry` maps string IDs to `CardData` objects. `getCard(id)` factory function creates card instances from the registry.
- **`data/deckConfig.ts`** — `DeckEntry` interface (`{ id, count }`), default `deckConfig` array, and `lootPool` array of treasure/potion/scroll cards for monster-guarded loot.
- **`data/dungeonConfig.ts`** — `DungeonLevel` and `DungeonConfig` interfaces. Defines the 3-level dungeon (Greeting Hall → Underground Temple → Torture Rooms), each with level-specific cards, boss, key, and door.

### Card data architecture

Card definitions are decoupled from deck composition:
- **`cardRegistry`** defines each card once (stats, type, slot, lockDifficulty, etc.)
- **`deckConfig`** and **`dungeonConfig`** reference cards by ID with a count — `{ id: "goblin", count: 4 }`
- `Deck.fromDungeonLevel(level)` expands level cards from registry + adds boss/key/door

### Entity/system relationships

```
GameScene
  owns: Player, Deck, Grid, Inventory (systems)
  owns: PlayerView, InventoryView (entities)
  creates: Card instances placed into Grid cells
  creates: FateDeckPopup on demand, GameOverScreen/WinScreen on game end

Player  --emits-->  hpChanged, goldChanged  -->  GameScene (updates HUD)
Inventory  --emits-->  slotChanged  -->  InventoryView (refreshes slot display)
Inventory  --emits-->  statsChanged  -->  GameScene (calls updatePlayerStats)
```

`PlayerView.updateStats(player, equipPowerBonus)` reads from both `Player` and `Inventory.powerBonus`.

### Card types and effect status

`CardType` enum: `Monster`, `Potion`, `Trap`, `Treasure`, `Scroll`, `Event`, `Chest`.

| CardType | Effect implemented? | Details |
|---|---|---|
| Monster | Yes | Full combat: fate card draw, attack, counterattack, guarded loot release |
| Chest | Yes | Fate card draw, agility vs lockDifficulty check, trap damage on fail, loot reveal on success |
| Trap | Yes | Agility-based disarm: fate draw, agility vs lockDifficulty, damage on fail |
| Treasure | Partial | Drag-to-equip into inventory slots (grants `powerBonus`); click-resolve has no effect |
| Potion | Partial | Drag-to-equip into backpack slots; click-resolve has no effect |
| Scroll | No | Card resolves but no effect |
| Event | No | Card resolves but no effect |

### Multi-level dungeon system

Three dungeon levels with increasing difficulty. Each level has a boss, a key card (dropped by boss), and a door card. Player must defeat the boss to get the key, then click the door to advance. Completing the final level triggers `WinScreen`.

Flow: `initLevel(levelIndex)` → build deck via `Deck.fromDungeonLevel()` → play through cards → defeat boss → get key → open door → `clearGrid()` → next level or win.

### Combat system

`enterCombatMode` → `executeCombat` → `monsterCounterattack` → `combatCleanup`, all in GameScene.

The player draws a fate modifier, `modifiedPower = max(0, player.power + inventory.powerBonus + modifier)`, then attacks the monster (reduces its HP via `card.updateValue`). If the monster survives, it counterattacks for its current HP value. On monster death, `freeGuardedLoot` reveals the guarded treasure card in the monster's former grid cell.

### Chest cracking system

Parallel to combat, using agility instead of power. `modifiedAgility = max(0, player.agility + modifier)` is checked against `lockDifficulty`. Failure applies `trapDamage` if > 0. Success reveals loot from `chestLoot` map.

### Trap encounter system

Same agility-based pattern as chests. `enterTrapMode` → `executeDisarm` → `trapCleanup`. Success: card resolves with no damage. Failure: player takes `trapDamage`. Unresolved traps on the grid block the Explore button.

### Monster-guarded treasure

When cards are drawn, each Monster scans for an existing unguarded loot card on the grid. If none found, `pickRandomLoot()` generates one from `lootPool`. The loot card sits behind the monster (lower depth, offset 28px up). On hover, the loot peeks above. Tracked via `Card.guardedLoot` and `GameScene.guardedByMonster` Map.

### Drag-and-drop equipment

Equippable cards (those with a `slot` field) can be dragged from the grid onto inventory slots. Inventory slots highlight green (compatible) or red (incompatible) during drag. Items can also be dragged between slots or dragged out to discard. Displaced items play a dissolve animation.

### Key patterns

- `Grid` is a plain class (not a Phaser object); it only tracks cell occupancy and coordinate math. Dimensions: `COLS` (5) and `ROWS` (3).
- Card dimensions exported from `Card.ts`: `CARD_W` (100), `CARD_H` (110).
- Equipment slot definitions exported from `Inventory.ts` as `SLOT_DEFS` (6 slots: weapon1, weapon2, head, armour, backpack1, backpack2).
- The explore button draws 3 cards into random empty grid slots; the game lock (`isResolving`) prevents interaction during card animations. Explore is also blocked while unresolved traps exist on the grid.
- `Player.fateDeck` is an array of integer modifiers `[2, 1, 0, 0, -1, -2]` drawn from the front and shuffled back after use.
- All interactive Phaser containers use explicit `Phaser.Geom.Rectangle` hit areas (not auto-sized).
- Adding a new card: define it in `cardRegistry`, then reference its ID in `deckConfig`/`dungeonConfig` level cards or `lootPool`.

### CI/CD

- **Build workflow** (`.github/workflows/build.yml`): Runs on PRs and master pushes. Node 20, `npm ci`, `npm run build`, uploads `dist/` as artifact.
- **Deploy workflow** (`.github/workflows/build_deploy.yml`): Runs on GitHub releases or manual dispatch. Calls the build workflow then deploys to itch.io via Butler.
