import Phaser from "phaser";

export class Player extends Phaser.Events.EventEmitter {
  hp: number;
  maxHp: number;
  gold: number;

  constructor(maxHp = 20) {
    super();
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.gold = 0;
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
}
