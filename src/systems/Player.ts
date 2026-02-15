import Phaser from "phaser";

export class Player extends Phaser.Events.EventEmitter {
  hp: number;
  maxHp: number;
  gold: number;
  power: number;
  agility: number;
  fateDeck: number[];

  constructor(maxHp = 10) {
    super();
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.gold = 0;
    this.power = 1;
    this.agility = 1;
    this.fateDeck = [2, 1, 0, 0, -1, -2];
  }

  get fateDeckCards(): number[] {
    return this.fateDeck;
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    this.emit("hpChanged", this.hp, this.maxHp);
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.emit("hpChanged", this.hp, this.maxHp);
  }

  addGold(amount: number): void {
    this.gold += amount;
    this.emit("goldChanged", this.gold);
  }

  drawFateCard(): number {
    return this.fateDeck.splice(0, 1)[0];
  }

  shuffleFateCardBack(modifier: number): void {
    this.fateDeck.push(modifier);
    for (let i = this.fateDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.fateDeck[i], this.fateDeck[j]] = [this.fateDeck[j], this.fateDeck[i]];
    }
  }
}
