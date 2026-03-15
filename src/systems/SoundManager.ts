import Phaser from "phaser";

/** All sound keys used in the game. */
export const SOUND_KEYS = {
  // Combat
  swordAttack1: "sword_attack_1",
  swordAttack2: "sword_attack_2",
  swordAttack3: "sword_attack_3",
  swordImpactHit: "sword_impact_hit",

  // Bow
  bowAttack1: "bow_attack_1",
  bowAttack2: "bow_attack_2",
  bowBlocked: "bow_blocked",
  bowImpactHit: "bow_impact_hit",

  // Magic
  fireball: "fireball",
  fireBolt: "fire_bolt",

  // Chest / Trap
  chestOpen: "chest_open",
  squelching1: "squelching_1",
  squelching2: "squelching_2",

  // Movement
  stoneWalk1: "stone_walk_1",
  stoneWalk2: "stone_walk_2",
  stoneWalk3: "stone_walk_3",
  stoneWalk4: "stone_walk_4",
  stoneWalk5: "stone_walk_5",

  // Cards
  cardDraw1: "card_draw_1",
  cardDraw2: "card_draw_2",
  cardDraw3: "card_draw_3",

  // Loot
  coinsGather: "coins_gather",
  keysJingling: "keys_jingling",

  // Scrolls
  vibraphoneMystery: "vibraphone_mystery",
} as const;

/** Grouped sound keys for random selection. */
export const SOUND_GROUPS = {
  swordAttack: [SOUND_KEYS.swordAttack1, SOUND_KEYS.swordAttack2, SOUND_KEYS.swordAttack3],
  bowAttack: [SOUND_KEYS.bowAttack1, SOUND_KEYS.bowAttack2],
  squelching: [SOUND_KEYS.squelching1, SOUND_KEYS.squelching2],
  stoneWalk: [SOUND_KEYS.stoneWalk1, SOUND_KEYS.stoneWalk2, SOUND_KEYS.stoneWalk3, SOUND_KEYS.stoneWalk4, SOUND_KEYS.stoneWalk5],
  cardDraw: [SOUND_KEYS.cardDraw1, SOUND_KEYS.cardDraw2, SOUND_KEYS.cardDraw3],
} as const;

/** Mapping from sound keys to file paths for preloading. */
export const SOUND_FILES: Record<string, string> = {
  [SOUND_KEYS.swordAttack1]: "sounds/Sword Attack 1.wav",
  [SOUND_KEYS.swordAttack2]: "sounds/Sword Attack 2.wav",
  [SOUND_KEYS.swordAttack3]: "sounds/Sword Attack 3.wav",
  [SOUND_KEYS.swordImpactHit]: "sounds/Sword Impact Hit 2.wav",
  [SOUND_KEYS.bowAttack1]: "sounds/Bow Attack 1.wav",
  [SOUND_KEYS.bowAttack2]: "sounds/Bow Attack 2.wav",
  [SOUND_KEYS.bowBlocked]: "sounds/Bow Blocked 3.wav",
  [SOUND_KEYS.bowImpactHit]: "sounds/Bow Impact Hit 2.wav",
  [SOUND_KEYS.fireball]: "sounds/Fireball 3.wav",
  [SOUND_KEYS.fireBolt]: "sounds/Fireball 1.wav",
  [SOUND_KEYS.chestOpen]: "sounds/Chest Open 1.wav",
  [SOUND_KEYS.squelching1]: "sounds/squelching_1.wav",
  [SOUND_KEYS.squelching2]: "sounds/squelching_2.wav",
  [SOUND_KEYS.stoneWalk1]: "sounds/Stone Walk 1.wav",
  [SOUND_KEYS.stoneWalk2]: "sounds/Stone Walk 2.wav",
  [SOUND_KEYS.stoneWalk3]: "sounds/Stone Walk 3.wav",
  [SOUND_KEYS.stoneWalk4]: "sounds/Stone Walk 4.wav",
  [SOUND_KEYS.stoneWalk5]: "sounds/Stone Walk 5.wav",
  [SOUND_KEYS.cardDraw1]: "sounds/card_draw_1.wav",
  [SOUND_KEYS.cardDraw2]: "sounds/card_draw_2.wav",
  [SOUND_KEYS.cardDraw3]: "sounds/card_draw_3.wav",
  [SOUND_KEYS.coinsGather]: "sounds/coins_gather_quick.wav",
  [SOUND_KEYS.keysJingling]: "sounds/keys_jingling.wav",
  [SOUND_KEYS.vibraphoneMystery]: "sounds/vibraphone_mystery.wav",
};

export class SoundManager {
  private scene: Phaser.Scene;
  static volume = 0.5;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Preload all game sounds. Call in BootScene.preload(). */
  static preload(scene: Phaser.Scene): void {
    for (const [key, path] of Object.entries(SOUND_FILES)) {
      scene.load.audio(key, path);
    }
  }

  /** Play a single sound. */
  play(key: string): void {
    this.scene.sound.play(key, { volume: SoundManager.volume });
  }

  /** Play a random sound from the given keys. */
  playRandom(keys: readonly string[]): void {
    const key = keys[Math.floor(Math.random() * keys.length)];
    this.play(key);
  }

  /** Play N random picks from pool sequentially with given interval (ms). */
  playRandomSequential(pool: readonly string[], count: number, intervalMs: number): void {
    for (let i = 0; i < count; i++) {
      const key = pool[Math.floor(Math.random() * pool.length)];
      this.scene.time.delayedCall(i * intervalMs, () => this.play(key));
    }
  }
}
