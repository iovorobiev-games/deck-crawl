#!/usr/bin/env node
const h = require("./helpers.cjs");

const COMMANDS = {
  screenshot: {
    usage: "screenshot [name]",
    desc: "Take a screenshot of the current game state",
    run: async (args) => {
      await h.launchGame();
      const path = await h.screenshot(args[0] || "screenshot");
      console.log(path);
      await h.cleanup();
    },
  },
  explore: {
    usage: "explore [name]",
    desc: "Click Explore then screenshot",
    run: async (args) => {
      await h.launchGame();
      await h.clickExplore();
      const path = await h.screenshot(args[0] || "explore");
      console.log(path);
      await h.cleanup();
    },
  },
  "click-cell": {
    usage: "click-cell <col> <row> [name]",
    desc: "Click a grid cell then screenshot",
    run: async (args) => {
      const col = parseInt(args[0], 10);
      const row = parseInt(args[1], 10);
      if (isNaN(col) || isNaN(row)) {
        console.error("Usage: click-cell <col> <row> [name]");
        process.exit(1);
      }
      await h.launchGame();
      await h.clickGridCell(col, row);
      const path = await h.screenshot(args[2] || `cell-${col}-${row}`);
      console.log(path);
      await h.cleanup();
    },
  },
  "fate-popup": {
    usage: "fate-popup [name]",
    desc: "Open fate deck popup then screenshot",
    run: async (args) => {
      await h.launchGame();
      await h.clickPortrait();
      const path = await h.screenshot(args[0] || "fate-popup");
      console.log(path);
      await h.cleanup();
    },
  },
  "explore-and-click": {
    usage: "explore-and-click <col> <row> [name]",
    desc: "Explore, then click a grid cell, then screenshot",
    run: async (args) => {
      const col = parseInt(args[0], 10);
      const row = parseInt(args[1], 10);
      if (isNaN(col) || isNaN(row)) {
        console.error("Usage: explore-and-click <col> <row> [name]");
        process.exit(1);
      }
      await h.launchGame();
      await h.clickExplore();
      await h.sleep(500);
      await h.clickGridCell(col, row);
      const path = await h.screenshot(
        args[2] || `explore-click-${col}-${row}`
      );
      console.log(path);
      await h.cleanup();
    },
  },
  sequence: {
    usage: "sequence <action1> <action2> ... [--name <name>]",
    desc: "Run a sequence of actions, screenshot after each. Actions: explore, click:<col>,<row>, portrait, dismiss, fate:<index>, slot:<name>, drag:<col>,<row>,<slot>, wait:<ms>",
    run: async (args) => {
      const nameIdx = args.indexOf("--name");
      let baseName = "seq";
      let actions = args;
      if (nameIdx !== -1) {
        baseName = args[nameIdx + 1] || "seq";
        actions = args.slice(0, nameIdx);
      }

      await h.launchGame();
      let step = 0;

      const snap = async (label) => {
        step++;
        const path = await h.screenshot(`${baseName}-${step}-${label}`);
        console.log(path);
      };

      await snap("initial");

      for (const action of actions) {
        if (action === "explore") {
          await h.clickExplore();
          await snap("explore");
        } else if (action.startsWith("click:")) {
          const [col, row] = action.slice(6).split(",").map(Number);
          await h.clickGridCell(col, row);
          await snap(`click-${col}-${row}`);
        } else if (action === "portrait") {
          await h.clickPortrait();
          await snap("portrait");
        } else if (action === "dismiss") {
          await h.dismissPopup();
          await snap("dismiss");
        } else if (action.startsWith("fate:")) {
          const idx = parseInt(action.slice(5), 10);
          await h.clickFateCard(idx);
          await snap(`fate-${idx}`);
        } else if (action.startsWith("slot:")) {
          const name = action.slice(5);
          await h.clickInventorySlot(name);
          await snap(`slot-${name}`);
        } else if (action.startsWith("drag:")) {
          const parts = action.slice(5).split(",");
          await h.dragGridCellToSlot(
            parseInt(parts[0], 10),
            parseInt(parts[1], 10),
            parts[2]
          );
          await snap(`drag-${parts.join("-")}`);
        } else if (action.startsWith("hover:")) {
          const [col, row] = action.slice(6).split(",").map(Number);
          await h.hoverGridCell(col, row);
          await snap(`hover-${col}-${row}`);
        } else if (action.startsWith("wait:")) {
          const ms = parseInt(action.slice(5), 10);
          await h.sleep(ms);
        } else {
          console.error(`Unknown action: ${action}`);
        }
      }

      await h.cleanup();
    },
  },
};

async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  if (!cmd || cmd === "help" || cmd === "--help") {
    console.log("Usage: node cli.js <command> [args]\n");
    console.log("Commands:");
    for (const [name, def] of Object.entries(COMMANDS)) {
      console.log(`  ${def.usage.padEnd(50)} ${def.desc}`);
    }
    process.exit(0);
  }

  const command = COMMANDS[cmd];
  if (!command) {
    console.error(`Unknown command: ${cmd}. Run with --help for usage.`);
    process.exit(1);
  }

  try {
    await command.run(args);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    await h.cleanup();
    process.exit(1);
  }
}

main();
