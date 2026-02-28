const puppeteer = require("puppeteer");

// --- Constants -----------------------------------------------------------

const VIEWPORT_W = 960;
const VIEWPORT_H = 540;
const SERVER_PORT = 5555;

// Grid (viewport coords). Game: CARD_W=171, CARD_H=202, GAP_X=16, GAP_Y=32
const GRID_ORIGIN_X = 293;
const GRID_ORIGIN_Y = 83;
const GRID_STEP_X = 93.5;
const GRID_STEP_Y = 117;

// UI positions (viewport coords)
const POS = {
  explore: { x: 175, y: 199 },
  portrait: { x: 480, y: 455 },
  popupDismiss: { x: 400, y: 50 },
  inventory: {
    weapon1: { x: 214, y: 455 },
    weapon2: { x: 298, y: 455 },
    head: { x: 382, y: 455 },
    armour: { x: 578, y: 455 },
    backpack1: { x: 662, y: 455 },
    backpack2: { x: 746, y: 455 },
  },
};

// Fate card positions when popup is open (viewport coords)
const FATE_CARDS = [
  { mod: +2, x: 340, y: 354 },
  { mod: +1, x: 396, y: 354 },
  { mod: 0, x: 452, y: 354 },
  { mod: 0, x: 508, y: 354 },
  { mod: -1, x: 564, y: 354 },
  { mod: -2, x: 620, y: 354 },
];

// --- State ---------------------------------------------------------------

let browser = null;
let page = null;
let screenshotCounter = 0;

// --- Helpers -------------------------------------------------------------

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function gridPos(col, row) {
  return {
    x: GRID_ORIGIN_X + col * GRID_STEP_X,
    y: GRID_ORIGIN_Y + row * GRID_STEP_Y,
  };
}

// --- Core ----------------------------------------------------------------

async function launchGame(opts = {}) {
  const port = opts.port || SERVER_PORT;
  const waitMs = opts.wait || 3000;

  browser = await puppeteer.launch({ headless: true });
  page = await browser.newPage();
  await page.setViewport({ width: VIEWPORT_W, height: VIEWPORT_H });
  await page.goto(`http://localhost:${port}/`, {
    waitUntil: "domcontentloaded",
    timeout: 10000,
  });
  await sleep(waitMs);
  return page;
}

async function screenshot(name) {
  if (!name) {
    screenshotCounter++;
    name = `screenshot-${screenshotCounter}`;
  }
  const path = `${name}.png`;
  await page.screenshot({ path });
  return path;
}

async function cleanup() {
  if (browser) {
    await browser.close();
    browser = null;
    page = null;
  }
}

// --- Interactions --------------------------------------------------------

async function click(x, y, waitMs = 500) {
  await page.mouse.click(x, y);
  await sleep(waitMs);
}

async function hover(x, y, waitMs = 400) {
  await page.mouse.move(x, y);
  await sleep(waitMs);
}

async function clickExplore() {
  await click(POS.explore.x, POS.explore.y);
}

async function clickGridCell(col, row) {
  const pos = gridPos(col, row);
  await click(pos.x, pos.y);
}

async function hoverGridCell(col, row) {
  const pos = gridPos(col, row);
  await hover(pos.x, pos.y);
}

async function clickPortrait() {
  await click(POS.portrait.x, POS.portrait.y, 800);
}

async function dismissPopup() {
  await click(POS.popupDismiss.x, POS.popupDismiss.y);
}

async function clickFateCard(index) {
  const card = FATE_CARDS[index];
  if (!card) throw new Error(`Fate card index ${index} out of range (0-5)`);
  await click(card.x, card.y);
}

async function clickInventorySlot(name) {
  const pos = POS.inventory[name];
  if (!pos)
    throw new Error(
      `Unknown slot: ${name}. Use: ${Object.keys(POS.inventory).join(", ")}`
    );
  await click(pos.x, pos.y);
}

async function dragToSlot(fromX, fromY, slotName) {
  const slot = POS.inventory[slotName];
  if (!slot)
    throw new Error(
      `Unknown slot: ${slotName}. Use: ${Object.keys(POS.inventory).join(", ")}`
    );
  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  await sleep(100);
  await page.mouse.move(slot.x, slot.y, { steps: 10 });
  await sleep(100);
  await page.mouse.up();
  await sleep(500);
}

async function dragGridCellToSlot(col, row, slotName) {
  const pos = gridPos(col, row);
  await dragToSlot(pos.x, pos.y, slotName);
}

// --- Exports -------------------------------------------------------------

module.exports = {
  // Core
  launchGame,
  screenshot,
  cleanup,
  sleep,
  // Low-level
  click,
  hover,
  gridPos,
  // Interactions
  clickExplore,
  clickGridCell,
  hoverGridCell,
  clickPortrait,
  dismissPopup,
  clickFateCard,
  clickInventorySlot,
  dragToSlot,
  dragGridCellToSlot,
  // Constants
  POS,
  FATE_CARDS,
  VIEWPORT_W,
  VIEWPORT_H,
};
