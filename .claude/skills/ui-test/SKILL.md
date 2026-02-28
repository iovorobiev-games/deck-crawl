---
name: ui-test
description: Launch the game in a headless browser, take screenshots, and interact with UI elements to visually verify layout and behavior.
allowed-tools: Bash, Read
---

# UI Testing — Deck Crawl

Use Puppeteer (already installed as a project dependency) to launch the game in a headless browser, interact with it, and take screenshots for visual verification.

Two tools are available in `.claude/skills/ui-test/`:
- **`cli.cjs`** — CLI for common one-shot actions (screenshot, explore, click). **Prefer this for simple tasks.**
- **`helpers.cjs`** — require-able module for custom multi-step scripts.

## 1. Start the Dev Server

Start Vite on a fixed port as a background task:

```bash
npx vite --port 5555 &
sleep 3 && echo "ready"
```

Run this with `run_in_background: true`. Wait a few seconds, then confirm the server is up by reading the background task output.

## 2. CLI Commands (preferred)

Run via `node .claude/skills/ui-test/cli.cjs <command> [args]`. Each command launches the game, performs the action, takes a screenshot, prints the path, and exits.

| Command | Usage | Description |
|---------|-------|-------------|
| `screenshot` | `screenshot [name]` | Take a screenshot of the current game state |
| `explore` | `explore [name]` | Click Explore, then screenshot |
| `click-cell` | `click-cell <col> <row> [name]` | Click a grid cell, then screenshot |
| `fate-popup` | `fate-popup [name]` | Open fate deck popup, then screenshot |
| `explore-and-click` | `explore-and-click <col> <row> [name]` | Explore, click a cell, then screenshot |
| `sequence` | `sequence <actions...> [--name <base>]` | Run multiple actions, screenshot after each |

### Sequence actions

The `sequence` command accepts a chain of named actions:

| Action | Example | Description |
|--------|---------|-------------|
| `explore` | `explore` | Click Explore button |
| `click:<col>,<row>` | `click:2,1` | Click grid cell |
| `hover:<col>,<row>` | `hover:0,0` | Hover over grid cell |
| `portrait` | `portrait` | Open fate deck popup |
| `dismiss` | `dismiss` | Dismiss popup |
| `fate:<index>` | `fate:0` | Click fate card (0–5) |
| `slot:<name>` | `slot:weapon1` | Click inventory slot |
| `drag:<col>,<row>,<slot>` | `drag:1,0,weapon1` | Drag grid card to inventory slot |
| `wait:<ms>` | `wait:1000` | Wait for given milliseconds |

Example:
```bash
node .claude/skills/ui-test/cli.cjs sequence explore click:2,1 portrait --name test
```

This takes an initial screenshot, then screenshots after each action: `test-1-initial.png`, `test-2-explore.png`, `test-3-click-2-1.png`, `test-4-portrait.png`.

After running any CLI command, use the **Read tool** on the output `.png` file to view it.

## 3. Helpers Module (for custom scripts)

For complex flows not covered by the CLI, write a script using the helpers module:

```js
const h = require('./.claude/skills/ui-test/helpers');
(async () => {
  await h.launchGame();
  await h.screenshot('screenshot');
  await h.cleanup();
})();
```

Run with `node -e "..."` via Bash, then use the **Read tool** on the `.png`.

### API

### Core

| Function | Description |
|----------|-------------|
| `launchGame(opts?)` | Launch browser, navigate to game, wait for init. Options: `{ port: 5555, wait: 3000 }` |
| `screenshot(name?)` | Save screenshot as `{name}.png`. Auto-increments if no name given. Returns the file path. |
| `cleanup()` | Close browser. **Always call this at the end.** |
| `sleep(ms)` | Async delay. |

### Interactions

| Function | Description |
|----------|-------------|
| `clickExplore()` | Click the Explore button |
| `clickGridCell(col, row)` | Click a grid cell (0-indexed, 5x3) |
| `hoverGridCell(col, row)` | Hover over a grid cell |
| `clickPortrait()` | Click player portrait to open fate deck popup |
| `dismissPopup()` | Dismiss the fate deck popup |
| `clickFateCard(index)` | Click a fate card by index (0–5: +2, +1, 0, 0, -1, -2) |
| `clickInventorySlot(name)` | Click an inventory slot: `weapon1`, `weapon2`, `head`, `armour`, `backpack1`, `backpack2` |
| `dragGridCellToSlot(col, row, slotName)` | Drag a card from a grid cell to an inventory slot |
| `dragToSlot(fromX, fromY, slotName)` | Drag from arbitrary viewport coords to an inventory slot |

### Low-level

| Function | Description |
|----------|-------------|
| `click(x, y, waitMs?)` | Click at viewport coords, default 500ms wait |
| `hover(x, y, waitMs?)` | Hover at viewport coords, default 400ms wait |
| `gridPos(col, row)` | Returns `{ x, y }` in viewport coords for a grid cell |

### Constants

- `POS` — all UI element positions (viewport coords)
- `FATE_CARDS` — array of `{ mod, x, y }` for each fate card
- `VIEWPORT_W` (960), `VIEWPORT_H` (540)

## 4. Multi-Step Test Flow

Example — explore, open popup, hover a card, screenshot at each step:

```js
const h = require('./.claude/skills/ui-test/helpers');
(async () => {
  await h.launchGame();
  await h.screenshot('test-1-initial');

  await h.clickExplore();
  await h.screenshot('test-2-explored');

  await h.clickPortrait();
  await h.screenshot('test-3-popup');

  await h.hoverGridCell(2, 1);
  await h.screenshot('test-4-hover-center');

  await h.dismissPopup();
  await h.screenshot('test-5-dismissed');

  await h.cleanup();
})();
```

## 5. Coordinate Reference

All coordinates are in **viewport space** (960x540). Game resolution is 1920x1080 with `Phaser.Scale.FIT`, so viewport coords = game coords / 2.

| Element | Position (x, y) | Notes |
|---------|-----------------|-------|
| Explore button | (175, 199) | Top-left area, below dungeon deck |
| Player portrait | (480, 455) | Bottom-center; click to open fate deck popup |
| Fate deck popup backdrop | (400, 50) | Click any empty area to dismiss popup |
| Fate card +2 | (340, 354) | Leftmost card when popup is open |
| Fate card +1 | (396, 354) | Second card |
| Fate card 0 (first) | (452, 354) | Third card |
| Fate card 0 (second) | (508, 354) | Fourth card |
| Fate card -1 | (564, 354) | Fifth card |
| Fate card -2 | (620, 354) | Rightmost card |
| Inventory: weapon1 | (214, 455) | Left of player portrait |
| Inventory: weapon2 | (298, 455) | Left of player portrait |
| Inventory: head | (382, 455) | Left of player portrait |
| Inventory: armour | (578, 455) | Right of player portrait |
| Inventory: backpack1 | (662, 455) | Right of player portrait |
| Inventory: backpack2 | (746, 455) | Right of player portrait |

### Grid cell position formula

The grid is 5x3 (CARD_W=171, CARD_H=202, GAP_X=16, GAP_Y=32). Cell centers in viewport coords:
- **X**: `293 + col * 93.5` (col 0–4)
- **Y**: `83 + row * 117` (row 0–2)

Example: cell (2, 1) = (480, 200) — center of the grid.

## 6. Cleanup

After testing:
- Delete screenshot files: `rm test-*.png screenshot*.png`
- Stop the background dev server via `TaskStop` if still running

## Tips

- If the dev server port is already in use, Vite auto-increments. Use a specific port (`--port 5555`) to keep coordinates predictable.
- For debugging layout issues, take screenshots at each step rather than one big script.
- Card placement is random each run, so grid card positions will vary — use the grid formula to click specific cells, not specific cards.
- The helpers module manages browser state internally. Call `cleanup()` before `launchGame()` if you need to restart.
