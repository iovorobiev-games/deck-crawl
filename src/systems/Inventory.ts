import Phaser from "phaser";
import { CardData, EquipSlot } from "../entities/CardData";

export interface SlotDef {
  name: string;
  label: string;
  accepted: EquipSlot[];
  icon: string;
}

export const SLOT_DEFS: SlotDef[] = [
  { name: "weapon1", label: "Weapon", accepted: ["weapon", "backpack"], icon: "\u2694" },
  { name: "weapon2", label: "Weapon", accepted: ["weapon", "backpack"], icon: "\u2694" },
  { name: "head", label: "Head", accepted: ["head"], icon: "\u2666" },
  { name: "armour", label: "Armour", accepted: ["armour"], icon: "\u2666" },
  { name: "backpack1", label: "Pack", accepted: ["weapon", "armour", "head", "backpack"], icon: "\u25A1" },
  { name: "backpack2", label: "Pack", accepted: ["weapon", "armour", "head", "backpack"], icon: "\u25A1" },
];

export class Inventory extends Phaser.Events.EventEmitter {
  private slots: Map<string, CardData | null> = new Map();

  constructor() {
    super();
    for (const def of SLOT_DEFS) {
      this.slots.set(def.name, null);
    }
  }

  canEquip(slotName: string, card: CardData): boolean {
    const def = SLOT_DEFS.find((d) => d.name === slotName);
    if (!def) return false;
    if (!card.slot) return false;
    return def.accepted.includes(card.slot);
  }

  equip(slotName: string, card: CardData): CardData | null {
    if (!this.canEquip(slotName, card)) return null;
    const previous = this.slots.get(slotName) ?? null;
    this.slots.set(slotName, card);
    this.emit("slotChanged", slotName, card, previous);
    this.emit("statsChanged");
    return previous;
  }

  unequip(slotName: string): CardData | null {
    const item = this.slots.get(slotName) ?? null;
    if (!item) return null;
    this.slots.set(slotName, null);
    this.emit("slotChanged", slotName, null, item);
    this.emit("statsChanged");
    return item;
  }

  getItem(slotName: string): CardData | null {
    return this.slots.get(slotName) ?? null;
  }

  canSwap(slotA: string, slotB: string): boolean {
    const itemA = this.slots.get(slotA);
    const itemB = this.slots.get(slotB);
    if (!itemA || !itemB) return false;
    const defA = SLOT_DEFS.find((d) => d.name === slotA);
    const defB = SLOT_DEFS.find((d) => d.name === slotB);
    if (!defA || !defB) return false;
    if (!itemA.slot || !itemB.slot) return false;
    return defB.accepted.includes(itemA.slot) && defA.accepted.includes(itemB.slot);
  }

  swap(slotA: string, slotB: string): boolean {
    if (!this.canSwap(slotA, slotB)) return false;
    const itemA = this.slots.get(slotA)!;
    const itemB = this.slots.get(slotB)!;
    this.slots.set(slotA, itemB);
    this.slots.set(slotB, itemA);
    this.emit("slotChanged", slotA, itemB, itemA);
    this.emit("slotChanged", slotB, itemA, itemB);
    this.emit("statsChanged");
    return true;
  }

  get powerBonus(): number {
    let total = 0;
    for (const def of SLOT_DEFS) {
      if (def.name.startsWith("backpack")) continue;
      const item = this.slots.get(def.name);
      if (item && item.slot === "weapon") total += item.value;
    }
    return total;
  }

  get agilityBonus(): number {
    let total = 0;
    for (const def of SLOT_DEFS) {
      if (def.name.startsWith("backpack")) continue;
      const item = this.slots.get(def.name);
      if (item) total += (item.agilityBonus ?? 0);
    }
    return total;
  }

  get maxHpBonus(): number {
    let total = 0;
    for (const def of SLOT_DEFS) {
      if (def.name.startsWith("backpack")) continue;
      const item = this.slots.get(def.name);
      if (item) total += (item.maxHpBonus ?? 0);
    }
    return total;
  }
}
