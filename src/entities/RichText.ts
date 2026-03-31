import Phaser from "phaser";
import { FONT_CARD } from "../fonts";

// Styling constants
const CARD_NAME_COLOR = "#f0c060";
const TRIGGER_COLOR = "#88ccff";

// Reusable canvas context for text measurement
const measureCanvas = document.createElement("canvas");
const measureCtx = measureCanvas.getContext("2d")!;

type TextStyle = "normal" | "card" | "trigger";

interface Token {
  type: "text" | "icon";
  text?: string;
  style?: TextStyle;
  iconKey?: string;
}

interface WordItem {
  type: "text" | "icon";
  text?: string;
  style: TextStyle;
  iconKey?: string;
  width: number;
}

interface LayoutLine {
  items: WordItem[];
  totalWidth: number;
}

function fontString(fontSize: number, style: TextStyle): string {
  const parts: string[] = [];
  if (style === "card") parts.push("bold");
  if (style === "trigger") parts.push("italic");
  parts.push(`${fontSize}px`);
  parts.push(FONT_CARD);
  return parts.join(" ");
}

function colorFor(style: TextStyle, baseColor: string): string {
  if (style === "card") return CARD_NAME_COLOR;
  if (style === "trigger") return TRIGGER_COLOR;
  return baseColor;
}

function phaserFontStyle(style: TextStyle): string {
  if (style === "card") return "bold";
  if (style === "trigger") return "italic";
  return "";
}

function measureWord(text: string, fontSize: number, style: TextStyle): number {
  measureCtx.font = fontString(fontSize, style);
  return measureCtx.measureText(text).width;
}

function parseIcons(text: string, style: TextStyle, out: Token[]): void {
  const iconRegex = /\[hp\]|\[agi\]|\[pow\]/g;
  let lastIndex = 0;
  let match;
  while ((match = iconRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push({ type: "text", text: text.slice(lastIndex, match.index), style });
    }
    const key = match[0] === "[hp]" ? "icon_hp" : match[0] === "[agi]" ? "icon_agility" : "icon_power";
    out.push({ type: "icon", iconKey: key });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    out.push({ type: "text", text: text.slice(lastIndex), style });
  }
}

function parseTokens(input: string): Token[] {
  const tokens: Token[] = [];
  // First pass: extract [c]...[/c] and [t]...[/t] style blocks
  const styleRegex = /\[c\](.*?)\[\/c\]|\[t\](.*?)\[\/t\]/g;
  let lastIndex = 0;
  let match;

  while ((match = styleRegex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      parseIcons(input.slice(lastIndex, match.index), "normal", tokens);
    }
    if (match[1] !== undefined) {
      parseIcons(match[1], "card", tokens);
    } else if (match[2] !== undefined) {
      parseIcons(match[2], "trigger", tokens);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < input.length) {
    parseIcons(input.slice(lastIndex), "normal", tokens);
  }
  return tokens;
}

function toWords(tokens: Token[], fontSize: number, iconSize: number): WordItem[] {
  const items: WordItem[] = [];
  for (const token of tokens) {
    if (token.type === "icon") {
      items.push({ type: "icon", style: "normal", iconKey: token.iconKey, width: iconSize });
    } else {
      const words = token.text!.split(/\s+/).filter(w => w.length > 0);
      for (const w of words) {
        items.push({ type: "text", text: w, style: token.style!, width: measureWord(w, fontSize, token.style!) });
      }
    }
  }
  return items;
}

function wrapLines(words: WordItem[], maxWidth: number, spaceW: number): LayoutLine[] {
  const lines: LayoutLine[] = [];
  let cur: WordItem[] = [];
  let curW = 0;

  for (const word of words) {
    const added = cur.length > 0 ? spaceW + word.width : word.width;
    if (curW + added > maxWidth && cur.length > 0) {
      lines.push({ items: cur, totalWidth: curW });
      cur = [word];
      curW = word.width;
    } else {
      cur.push(word);
      curW += added;
    }
  }
  if (cur.length > 0) lines.push({ items: cur, totalWidth: curW });
  return lines;
}

export interface RichTextOptions {
  maxWidth: number;
  fontSize: number;
  baseColor: string;
  lineSpacing?: number;
  maxHeight?: number;
  minFontSize?: number;
}

/**
 * Create a Container of positioned Text and Image objects from a markup string.
 *
 * Markup tokens:
 * - `[c]Card Name[/c]`  — bold, golden
 * - `[t]On Self:[/t]`   — italic, blue
 * - `[hp]`              — inline HP icon
 * - `[agi]`             — inline Agility icon
 */
function layoutLines(description: string, maxWidth: number, fontSize: number): LayoutLine[] {
  const iconSize = Math.round(fontSize * 1.15);
  const spaceW = measureWord(" ", fontSize, "normal");
  const paragraphs = description.split("\n");
  const lines: LayoutLine[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (trimmed === "") {
      lines.push({ items: [], totalWidth: 0 });
      continue;
    }
    const tokens = parseTokens(trimmed);
    const words = toWords(tokens, fontSize, iconSize);
    lines.push(...wrapLines(words, maxWidth, spaceW));
  }
  return lines;
}

export function createRichDescription(
  scene: Phaser.Scene,
  description: string,
  options: RichTextOptions,
): Phaser.GameObjects.Container {
  let { maxWidth, fontSize, baseColor, lineSpacing = 4, maxHeight, minFontSize = 8 } = options;
  const container = new Phaser.GameObjects.Container(scene, 0, 0);

  // Shrink font until text fits within maxHeight
  if (maxHeight) {
    while (fontSize > minFontSize) {
      const lines = layoutLines(description, maxWidth, fontSize);
      const totalH = lines.length * (fontSize + lineSpacing);
      if (totalH <= maxHeight) break;
      fontSize--;
    }
  }

  const iconSize = Math.round(fontSize * 1.15);
  const lineHeight = fontSize + lineSpacing;
  const spaceW = measureWord(" ", fontSize, "normal");
  const allLines = layoutLines(description, maxWidth, fontSize);

  const totalHeight = allLines.length * lineHeight;
  const startY = -totalHeight / 2;

  for (let li = 0; li < allLines.length; li++) {
    const line = allLines[li];
    const y = startY + li * lineHeight + lineHeight / 2;
    let x = -line.totalWidth / 2;

    for (let i = 0; i < line.items.length; i++) {
      if (i > 0) x += spaceW;
      const item = line.items[i];

      if (item.type === "icon") {
        const icon = scene.add.image(x + item.width / 2, y, item.iconKey!);
        const tex = icon.texture.getSourceImage();
        const scale = iconSize / Math.max(tex.width, tex.height);
        icon.setScale(scale);
        container.add(icon);
      } else {
        const t = scene.add.text(x, y, item.text!, {
          fontSize: `${fontSize}px`,
          fontFamily: FONT_CARD,
          color: colorFor(item.style, baseColor),
          fontStyle: phaserFontStyle(item.style),
        }).setOrigin(0, 0.5);
        container.add(t);
      }
      x += item.width;
    }
  }

  return container;
}

/** Strip markup tags, restoring plain-text equivalents for HP / Agility icons. */
export function stripMarkup(text: string): string {
  return text
    .replace(/\[c\](.*?)\[\/c\]/g, "$1")
    .replace(/\[t\](.*?)\[\/t\]/g, "$1")
    .replace(/\[hp\]/g, "HP")
    .replace(/\[agi\]/g, "Agility")
    .replace(/\[pow\]/g, "Power");
}
