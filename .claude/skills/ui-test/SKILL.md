---
name: ui-test
description: Launch the game in a headless browser, take screenshots, and interact with UI elements to visually verify layout and behavior.
allowed-tools: Bash, Read
---

# UI Testing — Deck Crawl

Use Puppeteer (already installed as a project dependency) to launch the game in a headless browser, interact with it, and take screenshots for visual verification.

## 1. Start the Dev Server

Start Vite on a fixed port as a background task:

```bash
cd /e/Projects/deck-crawl && npx vite --port 5555 &
sleep 3 && echo "ready"
```

Run this with `run_in_background: true`. Wait a few seconds, then confirm the server is up by reading the background task output.

## 2. Take a Screenshot

Use a Node one-liner with Puppeteer. Key points:
- Use `headless: true`
- Set viewport to the game resolution: **960 x 540**
- Use `waitUntil: 'domcontentloaded'` (not `networkidle0` — Phaser's WebSocket HMR keeps the connection open and will cause `networkidle0` to timeout)
- **Wait 3–4 seconds** after navigation for Phaser to initialize and card animations to finish
- Save screenshots to the project root (e.g. `screenshot.png`)
- **Always close the browser** at the end

Minimal template:

```js
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 540 });
  await page.goto('http://localhost:5555/', { waitUntil: 'domcontentloaded', timeout: 10000 });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: 'screenshot.png' });
  await browser.close();
})();
```

Run with `node -e "..."` via Bash, then use the **Read tool** on the saved `.png` file to view it (Claude Code renders images natively).

## 3. Interact with the Game

Puppeteer can simulate mouse events on the Phaser canvas. All coordinates are in game-space (960x540) since the viewport matches.

### Click an element

```js
await page.mouse.click(x, y);
await new Promise(r => setTimeout(r, 500)); // wait for animations
```

### Hover over an element

```js
await page.mouse.move(x, y);
await new Promise(r => setTimeout(r, 400)); // wait for hover tween
```

### Common game coordinates

| Element | Position (x, y) | Notes |
|---------|-----------------|-------|
| Explore button | (40, 110) | Top-left, below dungeon deck |
| Player portrait | (480, 475) | Bottom-center; click to open fate deck popup |
| Fate deck popup backdrop | (800, 100) | Click any empty area to dismiss popup |
| Fate card +2 | (340, 374) | Leftmost card when popup is open |
| Fate card +1 | (396, 374) | Second card |
| Fate card 0 (first) | (452, 374) | Third card |
| Fate card 0 (second) | (508, 374) | Fourth card |
| Fate card -1 | (564, 374) | Fifth card |
| Fate card -2 | (620, 374) | Rightmost card |
| Grid cell (col, row) | Use `Grid.worldPos()` | See formula below |

### Grid cell position formula

The grid is 5x3. Cell centers:
- **X**: `264 + col * 108` (col 0–4)
- **Y**: `112 + row * 118` (row 0–2)

Example: cell (2, 1) = (480, 230) — center of the grid.

## 4. Multi-Step Test Flow

Chain interactions in a single Puppeteer script. Example — open popup, hover a card, screenshot, dismiss:

```js
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 540 });
  await page.goto('http://localhost:5555/', { waitUntil: 'domcontentloaded', timeout: 10000 });
  await new Promise(r => setTimeout(r, 3000));

  // Screenshot initial state
  await page.screenshot({ path: 'test-1-initial.png' });

  // Click portrait to open fate popup
  await page.mouse.click(480, 475);
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: 'test-2-popup.png' });

  // Hover the +2 fate card
  await page.mouse.move(340, 374);
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: 'test-3-hover.png' });

  // Dismiss popup
  await page.mouse.click(800, 100);
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'test-4-dismissed.png' });

  await browser.close();
})();
```

## 5. Cleanup

After testing:
- Delete screenshot files: `rm /e/Projects/deck-crawl/test-*.png /e/Projects/deck-crawl/screenshot*.png`
- Stop the background dev server via `TaskStop` if still running

## Tips

- If the dev server port is already in use, Vite auto-increments. Use a specific port (`--port 5555`) to keep coordinates predictable.
- Always use `timeout: 10000` on `page.goto` to fail fast if the server isn't ready.
- For debugging layout issues, take screenshots at each step rather than one big script.
- Card placement is random each run, so grid card positions will vary — use the grid formula to click specific cells, not specific cards.
