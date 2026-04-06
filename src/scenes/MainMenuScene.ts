import Phaser from "phaser";
import { CRTPostFX } from "../pipelines/CRTPostFX";
import { SOUND_KEYS } from "../systems/SoundManager";



const GAME_W = 1920;
const GAME_H = 1080;

const TITLE_Y = GAME_H / 2 - 60;
const BUTTON_Y = (TITLE_Y + GAME_H) / 2;

const TITLE_FONT = "Antiquity Print";
const TITLE_SIZE = "120px";
const TITLE_COLOR = "#ccbbaa";

const CHROMA_ALPHA = 0.35;
const CHROMA_OFFSET = 2;

const GLITCH_INTERVAL_MIN = 2000;
const GLITCH_INTERVAL_MAX = 5000;
const GLITCH_STEP_MS = 60;

const LS_KEY = "tombOfFate_hasPlayed";

export class MainMenuScene extends Phaser.Scene {
  private redText!: Phaser.GameObjects.Text;
  private mainText!: Phaser.GameObjects.Text;
  private cyanText!: Phaser.GameObjects.Text;
  private glitchTimer!: Phaser.Time.TimerEvent;
  private tutorialChecked = false;

  constructor() {
    super({ key: "MainMenuScene" });
  }

  create(): void {
    const renderer = this.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
    renderer.pipelines.addPostPipeline("CRTPostFX", CRTPostFX);
    this.cameras.main.setPostPipeline(CRTPostFX);

    this.buildTitle();
    this.animateIntro();
  }

  /* ------------------------------------------------------------------ */
  /*  Title                                                              */
  /* ------------------------------------------------------------------ */

  private buildTitle(): void {
    const startY = -100;
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: TITLE_SIZE,
      fontFamily: TITLE_FONT,
      color: TITLE_COLOR,
    };

    // Chromatic-aberration layers — start off-screen
    this.redText = this.add
      .text(GAME_W / 2 - CHROMA_OFFSET, startY, "TOMB OF FATE", {
        ...style,
        color: "#ff0000",
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.cyanText = this.add
      .text(GAME_W / 2 + CHROMA_OFFSET, startY, "TOMB OF FATE", {
        ...style,
        color: "#00ffff",
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Main text on top — start off-screen
    this.mainText = this.add
      .text(GAME_W / 2, startY, "TOMB OF FATE", style)
      .setOrigin(0.5)
      .setAlpha(0);
  }

  private animateIntro(): void {
    const targets = [this.mainText, this.redText, this.cyanText];

    // Play slam sound slightly before the title lands
    this.time.delayedCall(250, () => {
      this.sound.play(SOUND_KEYS.titleImpact, { volume: 0.6 });
    });

    // Drop title from top
    this.tweens.add({
      targets,
      y: TITLE_Y,
      alpha: { getStart: (_t: unknown, _k: unknown, _v: unknown, i: number) => i === 0 ? 0 : 0, getEnd: (_t: unknown, _k: unknown, _v: unknown, i: number) => i === 0 ? 1 : CHROMA_ALPHA },
      duration: 400,
      ease: "Power2.easeIn",
      onComplete: () => {
        // Camera shake on land
        this.cameras.main.shake(300, 0.012);

        // Dust burst rising from bottom of title
        this.emitDust();

        // Start glitch loop after shake
        this.scheduleGlitch();
        this.time.delayedCall(1000, () => {
          this.buildEnterButton();
        });
      },
    });
  }

  private emitDust(): void {
    const bounds = this.mainText.getBounds();
    const emitter = this.add.particles(0, 0, "particle_square", {
      x: { min: bounds.left, max: bounds.right },
      y: bounds.bottom - bounds.height * 0.2,
      speedY: { min: -200, max: -60 },
      speedX: { min: -30, max: 30 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 0.6, end: 0 },
      tint: 0xccbbaa,
      lifespan: 1000,
      quantity: 40,
      emitting: false,
    });
    emitter.explode(40);
  }

  /* ------------------------------------------------------------------ */
  /*  Glitch effect                                                      */
  /* ------------------------------------------------------------------ */

  private scheduleGlitch(): void {
    const delay = Phaser.Math.Between(GLITCH_INTERVAL_MIN, GLITCH_INTERVAL_MAX);
    this.glitchTimer = this.time.delayedCall(delay, () => this.doGlitchBurst());
  }

  private doGlitchBurst(): void {
    const steps = Phaser.Math.Between(3, 6);

    for (let i = 0; i < steps; i++) {
      this.time.delayedCall(i * GLITCH_STEP_MS, () => {
        const dx = Phaser.Math.Between(-15, 15);
        const chromaSpread = Phaser.Math.Between(4, 12);

        this.mainText.x = GAME_W / 2 + dx;
        this.redText.x = GAME_W / 2 + dx - chromaSpread;
        this.cyanText.x = GAME_W / 2 + dx + chromaSpread;

        this.mainText.alpha = Math.random() > 0.3 ? 1 : 0.4;
        this.redText.alpha = CHROMA_ALPHA + Math.random() * 0.3;
        this.cyanText.alpha = CHROMA_ALPHA + Math.random() * 0.3;
      });
    }

    // Reset after burst
    this.time.delayedCall(steps * GLITCH_STEP_MS + 80, () => {
      this.mainText.x = GAME_W / 2;
      this.mainText.alpha = 1;
      this.redText.x = GAME_W / 2 - CHROMA_OFFSET;
      this.redText.alpha = CHROMA_ALPHA;
      this.cyanText.x = GAME_W / 2 + CHROMA_OFFSET;
      this.cyanText.alpha = CHROMA_ALPHA;

      this.scheduleGlitch();
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Enter text                                                         */
  /* ------------------------------------------------------------------ */

  private buildEnterButton(): void {
    const enterText = this.add
      .text(GAME_W / 2, BUTTON_Y, "ENTER", {
        fontSize: "48px",
        fontFamily: "Bonescript",
        color: "#eede89",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Underscore line
    const bounds = enterText.getBounds();
    const line = this.add.graphics();
    line.lineStyle(2, 0xeede89);
    line.lineBetween(bounds.left, bounds.bottom + 4, bounds.right, bounds.bottom + 4);
    line.setAlpha(0);

    const fadeTargets: Phaser.GameObjects.GameObject[] = [enterText, line];

    // Make clickable
    enterText.setInteractive({ useHandCursor: true });
    enterText.on("pointerdown", () => {
      const hasPlayed = localStorage.getItem(LS_KEY) === "true";
      localStorage.setItem(LS_KEY, "true");
      const skipTutorial = hasPlayed && !this.tutorialChecked;
      this.scene.start("GameScene", { skipTutorial });
    });

    // Tutorial toggle — only for returning players
    const hasPlayed = localStorage.getItem(LS_KEY) === "true";
    if (hasPlayed) {
      this.buildTutorialToggle(fadeTargets);
    }

    // Fade in, then start blinking
    this.tweens.add({
      targets: fadeTargets,
      alpha: 1,
      duration: 800,
      ease: "Sine.easeIn",
      onComplete: () => {
        this.tweens.add({
          targets: [enterText, line],
          alpha: 0.2,
          duration: 1500,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      },
    });
  }

  private buildTutorialToggle(fadeTargets: Phaser.GameObjects.GameObject[]): void {
    const toggleY = BUTTON_Y + 70;
    const boxSize = 24;
    const gap = 12;

    // Measure label first to compute total width
    const label = this.add
      .text(0, toggleY, "Tutorial", {
        fontSize: "28px",
        fontFamily: "Bonescript",
        color: "#ccbbaa",
      })
      .setOrigin(0, 0.5)
      .setAlpha(0);

    const totalW = boxSize + gap + label.width;
    const startX = GAME_W / 2 - totalW / 2;
    const boxCenterX = startX + boxSize / 2;

    label.setX(startX + boxSize + gap);

    // Checkbox
    const checkGfx = this.add.graphics().setAlpha(0);

    const drawBox = (checked: boolean) => {
      checkGfx.clear();
      checkGfx.lineStyle(2, 0xccbbaa);
      checkGfx.strokeRect(boxCenterX - boxSize / 2, toggleY - boxSize / 2, boxSize, boxSize);
      if (checked) {
        checkGfx.lineStyle(3, 0xeede89);
        checkGfx.lineBetween(boxCenterX - 6, toggleY, boxCenterX - 1, toggleY + 6);
        checkGfx.lineBetween(boxCenterX - 1, toggleY + 6, boxCenterX + 8, toggleY - 6);
      }
    };
    drawBox(false);

    // Hit area for the whole toggle
    const hitZone = this.add
      .zone(startX, toggleY, totalW, boxSize + 16)
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });

    hitZone.on("pointerdown", () => {
      this.tutorialChecked = !this.tutorialChecked;
      drawBox(this.tutorialChecked);
    });

    fadeTargets.push(label, checkGfx);
  }
}
