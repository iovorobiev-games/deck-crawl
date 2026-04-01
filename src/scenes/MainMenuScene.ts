import Phaser from "phaser";



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

  constructor() {
    super({ key: "MainMenuScene" });
  }

  create(): void {
    this.buildTitle();
    this.buildEnterButton();
    this.scheduleGlitch();
  }

  /* ------------------------------------------------------------------ */
  /*  Title                                                              */
  /* ------------------------------------------------------------------ */

  private buildTitle(): void {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: TITLE_SIZE,
      fontFamily: TITLE_FONT,
      color: TITLE_COLOR,
    };

    // Chromatic-aberration layers
    this.redText = this.add
      .text(GAME_W / 2 - CHROMA_OFFSET, TITLE_Y, "TOMB OF FATE", {
        ...style,
        color: "#ff0000",
      })
      .setOrigin(0.5)
      .setAlpha(CHROMA_ALPHA)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.cyanText = this.add
      .text(GAME_W / 2 + CHROMA_OFFSET, TITLE_Y, "TOMB OF FATE", {
        ...style,
        color: "#00ffff",
      })
      .setOrigin(0.5)
      .setAlpha(CHROMA_ALPHA)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Main text on top
    this.mainText = this.add
      .text(GAME_W / 2, TITLE_Y, "TOMB OF FATE", style)
      .setOrigin(0.5);
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
      .setOrigin(0.5);

    // Underscore line
    const bounds = enterText.getBounds();
    const line = this.add.graphics();
    line.lineStyle(2, 0xeede89);
    line.lineBetween(bounds.left, bounds.bottom + 4, bounds.right, bounds.bottom + 4);

    // Slow blink
    this.tweens.add({
      targets: [enterText, line],
      alpha: 0.2,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Make clickable
    enterText.setInteractive({ useHandCursor: true });
    enterText.on("pointerdown", () => {
      const hasPlayed = localStorage.getItem(LS_KEY) === "true";
      localStorage.setItem(LS_KEY, "true");
      this.scene.start("GameScene", { skipTutorial: hasPlayed });
    });
  }
}
