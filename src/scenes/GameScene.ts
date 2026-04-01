import Phaser from "phaser";
import { Card, CARD_W, CARD_H } from "../entities/Card";
import { PlayerView } from "../entities/PlayerView";
import { FateDeckPopup } from "../entities/FateDeckPopup";
import { GameOverScreen } from "../entities/GameOverScreen";
import { InventoryView } from "../entities/InventoryView";
import { Deck } from "../systems/Deck";
import { Grid } from "../systems/Grid";
import { Player } from "../systems/Player";
import { Inventory, SLOT_DEFS } from "../systems/Inventory";
import { CardType, CardData } from "../entities/CardData";
import { dungeonConfig, DungeonLevel } from "../data/dungeonConfig";
import { getCard } from "../data/cardRegistry";
import { getAbility, AbilityTrigger, CardAbility } from "../data/abilityRegistry";
import { WinScreen } from "../entities/WinScreen";
import { CRTPostFX } from "../pipelines/CRTPostFX";
import { VignettePostFX } from "../pipelines/VignettePostFX";
import { getVfx, VfxTarget } from "../effects/vfxRegistry";
import { SoundManager, SOUND_KEYS, SOUND_GROUPS } from "../systems/SoundManager";
import { stripMarkup } from "../entities/RichText";
import { SpriteButton } from "../entities/SpriteButton";
import { FONT_TUTORIAL, FONT_UI } from "../fonts";

const GAME_W = 1920;
const GAME_H = 1080;
const TREASURE_OFFSET_Y = 32;

const TUTORIAL_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: "32px",
  fontFamily: FONT_TUTORIAL,
  color: "#ccbbaa",
  align: "center",
  wordWrap: { width: 1200 },
};

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private deck!: Deck;
  private grid!: Grid;
  private deckText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text; // hidden, kept for alpha toggling
  private exploreBtn!: SpriteButton;
  private deckGroup!: Phaser.GameObjects.Container;
  private deckVisual: Phaser.GameObjects.Image[] = [];
  private playerView!: PlayerView;
  private fateDeckSprite!: Phaser.GameObjects.Image;
  private fateDeckStackCards: Phaser.GameObjects.Image[] = [];
  private activeFateCard: Phaser.GameObjects.Container | null = null;
  private fateDeckPopup: FateDeckPopup | null = null;
  private isResolving = false;
  private combatMonster: Card | null = null;
  private combatOverlay: Phaser.GameObjects.Rectangle | null = null;
  private fightBtn: Phaser.GameObjects.Container | null = null;
  private gridBgGraphics: Phaser.GameObjects.Image[] = [];
  private inventory!: Inventory;
  private inventoryView!: InventoryView;
  private dragCard: Card | null = null;
  private dragStartPos: { x: number; y: number } | null = null;
  private dragOrigGridPos: { col: number; row: number } | null = null;
  private isDragging = false;
  private guardedByMonster: Map<Card, Card> = new Map();
  private crackingChest: Card | null = null;
  private chestOverlay: Phaser.GameObjects.Rectangle | null = null;
  private crackBtn: Phaser.GameObjects.Container | null = null;
  private disarmingTrap: Card | null = null;
  private trapOverlay: Phaser.GameObjects.Rectangle | null = null;
  private disarmBtn: Phaser.GameObjects.Container | null = null;
  private exchangerCard: Card | null = null;
  private exchangerOverlay: Phaser.GameObjects.Rectangle | null = null;
  private exchangerBtn: Phaser.GameObjects.Container | null = null;
  private chestLoot: Map<Card, { lootData: CardData; cardBack: Phaser.GameObjects.Container }> = new Map();
  private currentLevelIndex = 0;
  private dungeonLevels!: DungeonLevel[];
  private currentLevelKey: CardData | null = null;
  private levelIndicator!: Phaser.GameObjects.Text;
  private levelFlavorText!: Phaser.GameObjects.Text;
  private backgroundImage!: Phaser.GameObjects.Image;
  private discardedCardIds: Set<string> = new Set();
  private poisonedWeapons: { slotName: string; amount: number }[] = [];
  private dragTargetMonster: Card | null = null;
  private hoverPreviewCard: Card | null = null;
  private vignetteFX!: VignettePostFX;
  private lastUsedScrollId: string | null = null;
  private sfx!: SoundManager;
  private playerPanelBg!: Phaser.GameObjects.Image;
  private tutorialOverlay: Phaser.GameObjects.Rectangle | null = null;
  private tutorialCursor: Phaser.GameObjects.Container | null = null;
  private tutorialAwaitingExplore = false;
  private tutorialText: Phaser.GameObjects.Container | null = null;
  private tutorialHighlight: Phaser.GameObjects.RenderTexture | null = null;
  private tutorialCursorToken = 0;
  private skipTutorial = false;

  constructor() {
    super({ key: "GameScene" });
  }

  init(data: { skipTutorial?: boolean }): void {
    this.skipTutorial = data?.skipTutorial ?? false;
  }

  create(): void {
    this.sfx = new SoundManager(this);

    this.backgroundImage = this.add.image(GAME_W / 2, GAME_H / 2, "background")
      .setScale(1.05);

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      const offsetX = -((pointer.x / GAME_W) - 0.5) * 30;
      const offsetY = -((pointer.y / GAME_H) - 0.5) * 15;
      this.backgroundImage.x = GAME_W / 2 + offsetX;
      this.backgroundImage.y = GAME_H / 2 + offsetY;
    });

    this.player = new Player(6);

    this.dungeonLevels = dungeonConfig.levels;
    this.currentLevelIndex = this.skipTutorial ? this.tutorialLevelCount : 0;
    const firstLevel = this.dungeonLevels[this.currentLevelIndex];
    const gridCols = firstLevel.gridSize?.cols ?? 4;
    const gridRows = firstLevel.gridSize?.rows ?? 3;
    this.grid = new Grid(GAME_W, GAME_H, gridCols, gridRows);
    this.initLevel(this.currentLevelIndex);
    this.tintBackground();

    this.inventory = new Inventory();

    this.deckGroup = this.add.container(350, 0);
    this.createHUD();
    this.createGridBackground();
    this.createDeckVisual();
    this.createExploreButton();
    this.createLevelIndicator();
    this.playerPanelBg = this.add.image(GAME_W / 2, 910, "player_panel_bg");
    this.createPlayerView();
    this.inventoryView = new InventoryView(this, this.inventory);
    this.setupSlotDiscard();

    this.inventory.on("statsChanged", () => this.updatePlayerStats());

    this.player.on("hpChanged", () => this.updatePlayerStats());
    this.player.on("goldChanged", () => this.updateHUD());

    const renderer = this.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
    renderer.pipelines.addPostPipeline("CRTPostFX", CRTPostFX);
    renderer.pipelines.addPostPipeline("VignettePostFX", VignettePostFX);
    this.cameras.main.setPostPipeline(CRTPostFX);
    this.cameras.main.setPostPipeline(VignettePostFX);
    this.vignetteFX = this.cameras.main.getPostPipeline(
      VignettePostFX
    ) as VignettePostFX;
    this.vignetteFX.setLevel(Math.max(0, this.gameplayLevelIndex));

    if (this.currentLevel.isTutorial) {
      this.runTutorialIntro();
    } else {
      this.drawAndPlaceCards(3);
    }
  }

  private createHUD(): void {
    this.deckText = this.add.text(0, 320, "", {
      fontSize: "28px",
      fontFamily: FONT_UI,
      color: "#aaaacc",
    }).setOrigin(0.5, 0);
    this.deckGroup.add(this.deckText);

    this.goldText = this.add.text(0, 460, "", {
      fontSize: "28px",
      fontFamily: FONT_UI,
      color: "#ddaa22",
    }).setOrigin(0.5, 0).setVisible(false);
    this.deckGroup.add(this.goldText);

    this.updateHUD();
  }

  private updateHUD(): void {
    this.deckText.setText(`Dungeon Deck: ${this.deck.remaining} cards`);
    this.goldText.setText(`Gold: ${this.player.gold}`);
    this.playerView?.updateGold(this.player.gold);
  }

  private createGridBackground(): void {
    this.gridBgGraphics = [];
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const pos = this.grid.worldPos(c, r);
        const img = this.add.image(pos.x, pos.y, "grid_item");
        img.setDisplaySize(CARD_W, CARD_H);
        this.gridBgGraphics.push(img);
      }
    }
  }

  /** Rebuild grid and grid background when level changes grid dimensions. */
  private rebuildGrid(cols: number, rows: number): void {
    this.gridBgGraphics.forEach(img => img.destroy());
    this.gridBgGraphics = [];
    this.grid = new Grid(GAME_W, GAME_H, cols, rows);
    this.createGridBackground();
  }

  private createDeckVisual(): void {
    this.deckVisual = [];
    this.updateDeckVisual();
  }

  private updateDeckVisual(): void {
    this.deckVisual.forEach(img => img.destroy());
    this.deckVisual = [];
    if (this.deck.isEmpty) return;

    // Stacked card backs — vertical only, top card drawn last (highest depth)
    const layers = Math.min(3, Math.ceil(this.deck.remaining / 5));
    for (let i = 0; i < layers; i++) {
      const offsetY = (layers - 1 - i) * 4;
      const img = this.add.image(0, 200 + offsetY, "card_back");
      this.deckGroup.add(img);
      this.deckVisual.push(img);
    }
  }

  private createExploreButton(): void {
    this.exploreBtn = new SpriteButton(this, 0, 398, 200, 56, "EXPLORE");
    this.deckGroup.add(this.exploreBtn);
    this.exploreBtn.on("pointerdown", () => this.onExplore());
  }

  private createPlayerView(): void {
    this.playerView = new PlayerView(this, 867.5, 910);
    this.playerView.updateStats(this.player);
    this.playerView.updateGold(this.player.gold);

    // Fate deck stack between portrait and armour slot
    this.fateDeckStackCards = [];
    for (let i = 2; i >= 1; i--) {
      const stackCard = this.add.image(1073.5, 914 + i * 4, "fate_card");
      stackCard.setDepth(498 + (2 - i));
      this.fateDeckStackCards.push(stackCard);
    }
    this.fateDeckSprite = this.add.image(1073.5, 914, "fate_card");
    this.fateDeckSprite.setDepth(500);
    this.fateDeckSprite.setInteractive();
    this.fateDeckSprite.on("pointerdown", () => {
      if (this.fateDeckPopup) return;
      this.fateDeckPopup = new FateDeckPopup(
        this,
        GAME_W / 2,
        700,
        this.player.fateDeckCards
      );
      this.fateDeckPopup.once("destroy", () => {
        this.fateDeckPopup = null;
      });
    });
  }

  private static readonly FATE_DECK_Y = 914;

  private peekFateCard(): void {
    if (this.activeFateCard) return;
    const deckPos = this.getFateDeckWorldPos();
    const card = this.add.container(deckPos.x, deckPos.y);
    card.setDepth(501);
    card.add(this.add.image(0, 0, "fate_card"));
    this.activeFateCard = card;

    this.tweens.add({
      targets: card,
      y: deckPos.y - 30,
      duration: 300,
      ease: "Power2",
    });
  }

  private getFateDeckWorldPos(): { x: number; y: number } {
    return { x: this.fateDeckSprite.x, y: this.fateDeckSprite.y };
  }

  /**
   * Animate drawing a fate card: slide up from deck, flip face-up, hold, slide back.
   * Calls onComplete with the drawn modifier once the card is back on the deck.
   */
  private animateFateCardDraw(onComplete: (modifier: number) => void): void {
    const modifier = this.player.drawFateCard();
    const deckPos = this.getFateDeckWorldPos();

    // Reuse the peeked card or create a new one
    let card: Phaser.GameObjects.Container;
    let cardImg: Phaser.GameObjects.Image;
    if (this.activeFateCard) {
      card = this.activeFateCard;
      cardImg = card.getAt(0) as Phaser.GameObjects.Image;
    } else {
      card = this.add.container(deckPos.x, deckPos.y);
      cardImg = this.add.image(0, 0, "fate_card");
      card.add(cardImg);
    }

    // 1. Slide up from deck
    this.tweens.add({
      targets: card,
      y: deckPos.y - 140,
      duration: 400,
      ease: "Power2",
      onComplete: () => {
        card.setDepth(9000);

        // 2. Flip face up (scaleX squeeze → swap texture → expand)
        this.tweens.add({
          targets: card,
          scaleX: 0,
          duration: 150,
          ease: "Sine.easeIn",
          onComplete: () => {
            cardImg.setTexture("fate_card_face");
            const modLabel = modifier > 0 ? `+${modifier}` : `${modifier}`;
            const modText = this.add
              .text(0, 4, modLabel, {
                fontSize: "72px",
                fontFamily: FONT_UI,
                color: "#f6d4b1",
                fontStyle: "bold",
              })
              .setOrigin(0.5);
            card.add(modText);

            this.tweens.add({
              targets: card,
              scaleX: 1,
              duration: 150,
              ease: "Sine.easeOut",
              onComplete: () => {
                // Hold to show modifier
                this.time.delayedCall(500, () => {
                  // 3. Slide back onto deck
                  this.tweens.add({
                    targets: card,
                    y: deckPos.y,
                    duration: 300,
                    ease: "Power2",
                    onComplete: () => {
                      this.activeFateCard = card;
                      onComplete(modifier);
                    },
                  });
                });
              },
            });
          },
        });
      },
    });
  }

  /**
   * After resolution: flip the active fate card face-down, shuffle the deck.
   * Safe to call even when no active fate card exists.
   */
  private animateFateCardResolve(): void {
    const card = this.activeFateCard;

    if (!card) {
      return;
    }

    // 5. Flip face down
    this.tweens.add({
      targets: card,
      scaleX: 0,
      duration: 150,
      ease: "Sine.easeIn",
      onComplete: () => {
        card.removeAll(true);
        card.add(this.add.image(0, 0, "fate_card"));

        this.tweens.add({
          targets: card,
          scaleX: 1,
          duration: 150,
          ease: "Sine.easeOut",
          onComplete: () => {
            card.destroy();
            this.activeFateCard = null;

            // 6. Riffle shuffle
            this.animateDeckShuffle(() => {});
          },
        });
      },
    });
  }

  private animateDeckShuffle(onComplete: () => void): void {
    const allCards = [...this.fateDeckStackCards, this.fateDeckSprite];
    const origX = this.fateDeckSprite.x;
    // Split deck: even-indexed cards go left, odd go right
    const leftGroup = allCards.filter((_, i) => i % 2 === 0);
    const rightGroup = allCards.filter((_, i) => i % 2 !== 0);
    const spread = 20;
    let iteration = 0;
    const totalIterations = 3;

    // Store original positions and depths to restore after shuffle
    const origState = allCards.map(c => ({ card: c, y: c.y, depth: c.depth }));

    const doShuffle = () => {
      if (iteration >= totalIterations) {
        // Restore original x, y, and depth for each card
        origState.forEach(s => { s.card.x = origX; s.card.y = s.y; s.card.setDepth(s.depth); });
        onComplete();
        return;
      }
      // Swap depth order each iteration for visual interleaving
      const baseDepth = 498;
      allCards.forEach((c, i) => c.setDepth(baseDepth + ((i + iteration) % allCards.length)));

      // Split apart
      this.tweens.add({ targets: leftGroup, x: origX - spread, duration: 80, ease: "Sine.easeOut" });
      this.tweens.add({
        targets: rightGroup, x: origX + spread, duration: 80, ease: "Sine.easeOut",
        onComplete: () => {
          // Merge back
          this.tweens.add({ targets: leftGroup, x: origX, duration: 80, ease: "Sine.easeIn" });
          this.tweens.add({
            targets: rightGroup, x: origX, duration: 80, ease: "Sine.easeIn",
            onComplete: () => { iteration++; doShuffle(); },
          });
        },
      });
    };
    doShuffle();
  }

  // ── Tutorial intro ──────────────────────────────────────────────

  /** Create a text label with the tutorial banner background behind it. */
  private createTutorialText(
    x: number, y: number, message: string,
    style: Phaser.Types.GameObjects.Text.TextStyle, depth: number
  ): Phaser.GameObjects.Container {
    const pad = 16;
    const container = this.add.container(x, y).setDepth(depth).setAlpha(0);
    const bg = this.add.image(0, 0, "tutorial_text_bg");
    const text = this.add.text(0, 0, message, style).setOrigin(0.5);
    bg.setDisplaySize(text.width + pad * 2, text.height + pad * 2);
    container.add([bg, text]);
    return container;
  }

  private runTutorialIntro(): void {
    // Hide all gameplay UI initially
    this.deckGroup.setVisible(false);
    this.gridBgGraphics.forEach(img => img.setVisible(false));
    this.playerPanelBg.setVisible(false);
    this.playerView.setVisible(false);
    this.inventoryView.setVisible(false);
    this.fateDeckSprite.setVisible(false);
    this.fateDeckStackCards.forEach(c => c.setVisible(false));
    this.disableExploreButton();

    // Black overlay covering everything
    this.tutorialOverlay = this.add.rectangle(
      GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000
    ).setDepth(10000);

    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      ...TUTORIAL_TEXT_STYLE,
      fontSize: "36px",
    };

    // Step 1: "The Horrors lie in the Tomb of Fate" fades in (no banner)
    const text1 = this.add.text(
      GAME_W / 2, GAME_H / 2, "The Horrors lie in the Tomb of Fate", textStyle
    ).setOrigin(0.5).setAlpha(0).setDepth(10001);

    this.tweens.add({
      targets: text1, alpha: 1, duration: 2000, ease: "Sine.easeIn",
      onComplete: () => {
        // Step 2: Hold 2s, then fade out
        this.time.delayedCall(2000, () => {
          this.tweens.add({
            targets: text1, alpha: 0, duration: 500,
            onComplete: () => {
              text1.destroy();
              this.tutorialIntroPhase2(textStyle);
            },
          });
        });
      },
    });
  }

  private tutorialIntroPhase2(textStyle: Phaser.Types.GameObjects.Text.TextStyle): void {
    // Step 3: Second text appears and background fades in behind it
    const text2 = this.createTutorialText(
      GAME_W / 2, GAME_H / 2,
      "The Brave Hero is searching for it\nto calm the Horrors down",
      textStyle, 10001
    );
    this.tutorialText = text2;

    // Fade out overlay to reveal the background
    if (this.tutorialOverlay) {
      this.tweens.add({
        targets: this.tutorialOverlay, alpha: 0, duration: 1500,
        onComplete: () => {
          this.tutorialOverlay?.destroy();
          this.tutorialOverlay = null;
        },
      });
    }

    this.tweens.add({
      targets: text2, alpha: 1, duration: 1000, ease: "Sine.easeIn",
      onComplete: () => {
        // Delay 0.5s → Steps sound → Delay 0.5s → Player panel slides up
        this.time.delayedCall(500, () => {
          this.sfx.playRandom(SOUND_GROUPS.stoneWalk);

          this.time.delayedCall(500, () => {
            this.tutorialSlidePlayerPanel(() => {
              // Delay 1s → text slides down between grid and panel
              this.time.delayedCall(1000, () => {
                this.tweens.add({
                  targets: text2, y: 688, duration: 800, ease: "Power2",
                  onComplete: () => {
                    this.tutorialRevealDeckAndGrid();
                  },
                });
              });
            });
          });
        });
      },
    });
  }

  private tutorialSlidePlayerPanel(onComplete: () => void): void {
    // Position panel elements below screen, make visible, slide up
    const slideOffset = GAME_H + 200;
    const targetY = 910;
    const fateTargetY = GameScene.FATE_DECK_Y;

    this.playerPanelBg.setY(slideOffset).setVisible(true);
    this.playerView.setY(slideOffset).setVisible(true);
    this.fateDeckSprite.setY(slideOffset).setVisible(true);
    this.fateDeckStackCards.forEach(c => c.setY(slideOffset).setVisible(true));
    // InventoryView is at y=0 with children at absolute positions;
    // offset it so the slots start off-screen, then slide back to y=0.
    this.inventoryView.setY(slideOffset).setVisible(true);

    this.tweens.add({
      targets: this.playerPanelBg,
      y: targetY, duration: 600, ease: "Power2",
    });
    this.tweens.add({
      targets: this.playerView,
      y: targetY, duration: 600, ease: "Power2",
    });
    this.tweens.add({
      targets: this.inventoryView,
      y: 0, duration: 600, ease: "Power2",
    });
    this.tweens.add({
      targets: this.fateDeckSprite,
      y: fateTargetY, duration: 600, ease: "Power2",
    });
    this.fateDeckStackCards.forEach((c, i) => {
      this.tweens.add({
        targets: c,
        y: fateTargetY + (i + 1) * 4, duration: 600, ease: "Power2",
      });
    });

    this.time.delayedCall(650, onComplete);
  }

  private tutorialRevealDeckAndGrid(): void {
    // Deck group slides in from the left
    this.deckGroup.setX(-200).setVisible(true);
    this.tweens.add({
      targets: this.deckGroup, x: 350, duration: 600, ease: "Power2",
      onComplete: () => {
        // Grid items pop up with scale animation
        this.gridBgGraphics.forEach((img, i) => {
          img.setScale(0).setVisible(true);
          this.tweens.add({
            targets: img,
            scale: 1, duration: 300, ease: "Back.easeOut",
            delay: i * 100,
          });
        });

        // After grid animation, show cursor hint on explore button
        const gridAnimDuration = this.gridBgGraphics.length * 100 + 300;
        this.time.delayedCall(gridAnimDuration, () => {
          this.enableExploreButton();
          this.showTutorialCursor();
          this.tutorialAwaitingExplore = true;
        });
      },
    });
  }

  private showTutorialCursor(): void {
    this.hideTutorialCursor();
    const token = this.tutorialCursorToken;
    const alive = () => token === this.tutorialCursorToken;

    const btnWorldX = this.deckGroup.x + this.exploreBtn.x;
    const btnWorldY = this.deckGroup.y + this.exploreBtn.y;
    const startX = GAME_W / 2 - 80;
    const startY = 688 - 20;
    const endX = btnWorldX;
    const endY = btnWorldY + 20;

    const pointer = this.add.image(startX, startY, "pointer_1")
      .setDepth(9999).setScale(0.8);
    const ripple = this.add.graphics().setDepth(9998);

    this.tutorialCursor = this.add.container(0, 0).setDepth(9999);
    this.tutorialCursor.add([ripple, pointer]);

    const playLoop = () => {
      if (!alive()) return;
      pointer.setPosition(startX, startY);
      pointer.setTexture("pointer_1");
      pointer.setAlpha(1);
      ripple.clear();

      this.tweens.add({
        targets: pointer, x: endX, y: endY, duration: 800, ease: "Power2",
        onComplete: () => {
          if (!alive()) return;
          pointer.setTexture("pointer_2");

          let radius = 0;
          this.time.addEvent({
            delay: 16, repeat: 30,
            callback: () => { if (!alive()) return; radius += 2; ripple.clear(); ripple.lineStyle(2, 0xffffff, 1 - radius / 60); ripple.strokeCircle(endX, endY, radius); },
          });
          this.time.delayedCall(600, () => { if (!alive()) return; ripple.clear(); pointer.setAlpha(0); this.time.delayedCall(400, playLoop); });
        },
      });
    };
    playLoop();
  }

  /** Animate a pointer from offset to a target position, looping with click effect. */
  private showTutorialPointerTo(targetX: number, targetY: number): void {
    this.hideTutorialCursor();
    const token = this.tutorialCursorToken;
    const alive = () => token === this.tutorialCursorToken;

    const startX = targetX - 80;
    const startY = targetY - 80;

    const pointer = this.add.image(startX, startY, "pointer_1")
      .setDepth(9999).setScale(0.8);
    const ripple = this.add.graphics().setDepth(9998);

    this.tutorialCursor = this.add.container(0, 0).setDepth(9999);
    this.tutorialCursor.add([ripple, pointer]);

    const playLoop = () => {
      if (!alive()) return;
      pointer.setPosition(startX, startY);
      pointer.setTexture("pointer_1");
      pointer.setAlpha(1);
      ripple.clear();

      this.tweens.add({
        targets: pointer, x: targetX, y: targetY, duration: 800, ease: "Power2",
        onComplete: () => {
          if (!alive()) return;
          pointer.setTexture("pointer_2");

          let radius = 0;
          this.time.addEvent({
            delay: 16, repeat: 30,
            callback: () => { if (!alive()) return; radius += 2; ripple.clear(); ripple.lineStyle(2, 0xffffff, 1 - radius / 60); ripple.strokeCircle(targetX, targetY, radius); },
          });
          this.time.delayedCall(600, () => { if (!alive()) return; ripple.clear(); pointer.setAlpha(0); this.time.delayedCall(400, playLoop); });
        },
      });
    };
    playLoop();
  }

  /** Animate a drag gesture: move to source, click, drag to target, release. Loops. */
  private showTutorialDragCursor(fromX: number, fromY: number, toX: number, toY: number): void {
    this.hideTutorialCursor();
    const token = this.tutorialCursorToken;
    const alive = () => token === this.tutorialCursorToken;

    const startX = fromX - 60;
    const startY = fromY - 60;

    const pointer = this.add.image(startX, startY, "pointer_1")
      .setDepth(9999).setScale(0.8);
    const ripple = this.add.graphics().setDepth(9998);

    this.tutorialCursor = this.add.container(0, 0).setDepth(9999);
    this.tutorialCursor.add([ripple, pointer]);

    const playLoop = () => {
      if (!alive()) return;
      pointer.setPosition(startX, startY);
      pointer.setTexture("pointer_1");
      pointer.setAlpha(1);
      ripple.clear();

      this.tweens.add({
        targets: pointer, x: fromX, y: fromY, duration: 600, ease: "Power2",
        onComplete: () => {
          if (!alive()) return;
          pointer.setTexture("pointer_2");

          let radius = 0;
          this.time.addEvent({
            delay: 16, repeat: 20,
            callback: () => { if (!alive()) return; radius += 2; ripple.clear(); ripple.lineStyle(2, 0xffffff, 1 - radius / 40); ripple.strokeCircle(fromX, fromY, radius); },
          });

          this.time.delayedCall(400, () => {
            if (!alive()) return;
            ripple.clear();
            this.tweens.add({
              targets: pointer, x: toX, y: toY, duration: 800, ease: "Power2",
              onComplete: () => {
                if (!alive()) return;
                pointer.setTexture("pointer_1");
                this.time.delayedCall(400, () => { if (!alive()) return; pointer.setAlpha(0); this.time.delayedCall(400, playLoop); });
              },
            });
          });
        },
      });
    };
    playLoop();
  }

  private hideTutorialCursor(): void {
    this.tutorialCursorToken++;
    if (this.tutorialCursor) {
      const cursor = this.tutorialCursor;
      this.tutorialCursor = null;
      cursor.each((child: Phaser.GameObjects.GameObject) => {
        this.tweens.killTweensOf(child);
      });
      cursor.destroy(true);
    }
  }

  private showTutorialNarrative(
    messages: (
      | string
      | { text: string; autoDelay?: number; persistent?: boolean; onShow?: () => void; onHide?: () => void }
      | { before: string; highlight: string; shake?: boolean; persistent?: boolean; onShow?: () => void; onHide?: () => void }
    )[],
    onComplete?: () => void
  ): void {
    const style = TUTORIAL_TEXT_STYLE;

    let index = 0;
    const showNext = () => {
      if (index >= messages.length) {
        onComplete?.();
        return;
      }

      const msg = messages[index];
      index++;

      let textContainer: Phaser.GameObjects.Container;
      let autoDelay = 0;
      let persistent = false;
      let onShow: (() => void) | undefined;
      let onHide: (() => void) | undefined;

      if (typeof msg === "string") {
        textContainer = this.createTutorialText(GAME_W / 2, 688, msg, style, 10001);
      } else if ("before" in msg) {
        textContainer = this.createTutorialTextRich(GAME_W / 2, 688, msg, style, 10001);
        onShow = msg.onShow; onHide = msg.onHide;
        if ("persistent" in msg) persistent = !!msg.persistent;
      } else {
        textContainer = this.createTutorialText(GAME_W / 2, 688, msg.text, style, 10001);
        if ("autoDelay" in msg && msg.autoDelay) autoDelay = msg.autoDelay;
        if ("persistent" in msg) persistent = !!msg.persistent;
        if ("onShow" in msg) onShow = msg.onShow;
        if ("onHide" in msg) onHide = msg.onHide;
      }

      let faded = false;
      const fadeOut = () => {
        if (faded) return;
        faded = true;
        onHide?.();
        this.tweens.add({
          targets: textContainer, alpha: 0, duration: 400,
          onComplete: () => {
            textContainer.destroy();
            showNext();
          },
        });
      };

      this.tweens.add({
        targets: textContainer, alpha: 1, duration: 800, ease: "Sine.easeIn",
        onComplete: () => {
          onShow?.();
          if (persistent) {
            // Store for later manual destruction
            this.tutorialText = textContainer;
            return;
          }
          if (autoDelay > 0) {
            const timer = this.time.delayedCall(autoDelay, fadeOut);
            // Also allow click to dismiss auto-delay messages
            this.time.delayedCall(500, () => {
              const advance = () => {
                this.input.off("pointerdown", advance);
                if (timer) timer.remove();
                fadeOut();
              };
              this.input.on("pointerdown", advance);
            });
          } else {
            this.time.delayedCall(500, () => {
              const advance = () => {
                this.input.off("pointerdown", advance);
                fadeOut();
              };
              this.input.on("pointerdown", advance);
            });
          }
        },
      });
    };
    showNext();
  }

  /** Tutorial text with a highlighted/shaking portion on the last line. */
  private createTutorialTextRich(
    x: number, y: number,
    msg: { before: string; highlight: string; shake?: boolean },
    style: Phaser.Types.GameObjects.Text.TextStyle,
    depth: number
  ): Phaser.GameObjects.Container {
    const pad = 16;
    const container = this.add.container(x, y).setDepth(depth).setAlpha(0);

    const fullMessage = msg.before + msg.highlight;
    const lines = fullMessage.split("\n");
    const lastLine = lines[lines.length - 1];
    const prefix = lastLine.substring(0, lastLine.indexOf(msg.highlight));

    // Measure line dimensions
    const lineMeasures = lines.map(l => {
      const m = this.add.text(0, 0, l, style).setVisible(false);
      const w = m.width; const h = m.height;
      m.destroy();
      return { w, h };
    });
    const lineH = lineMeasures[0].h;
    const totalH = lineH * lines.length;
    const maxW = Math.max(...lineMeasures.map(m => m.w));

    const prefixMeasure = this.add.text(0, 0, prefix, style).setVisible(false);
    const prefixW = prefixMeasure.width;
    prefixMeasure.destroy();

    const lastLineW = lineMeasures[lines.length - 1].w;
    const lastLineY = ((lines.length - 1) - (lines.length - 1) / 2) * lineH;

    // Render lines before the last as a single centered text block
    const elements: Phaser.GameObjects.GameObject[] = [];
    if (lines.length > 1) {
      const upperLines = lines.slice(0, -1).join("\n");
      const upperText = this.add.text(0, -lastLineY / 2, upperLines, style).setOrigin(0.5);
      elements.push(upperText);
    }

    // Render the prefix of the last line (no overlap with highlight)
    if (prefix.length > 0) {
      const prefixText = this.add.text(-lastLineW / 2, lastLineY, prefix, style).setOrigin(0, 0.5);
      elements.push(prefixText);
    }

    // Highlight characters — individually positioned for shake effect
    const highlightStyle = { ...style, color: "#ee4444", fontStyle: "bold" };
    const charTexts: Phaser.GameObjects.Text[] = [];
    let curX = prefixW;
    for (let i = 0; i < msg.highlight.length; i++) {
      const cm = this.add.text(0, 0, msg.highlight[i], style).setVisible(false);
      const cw = cm.width;
      cm.destroy();
      const ch = this.add.text(curX + cw / 2 - lastLineW / 2, lastLineY, msg.highlight[i], highlightStyle)
        .setOrigin(0.5);
      charTexts.push(ch);
      curX += cw;
    }

    const bg = this.add.image(0, 0, "tutorial_text_bg");
    bg.setDisplaySize(maxW + pad * 2, totalH + pad * 2);

    container.add([bg, ...elements, ...charTexts]);

    if (msg.shake) {
      const amp = 1.5;
      const charData = charTexts.map(ch => ({
        ch,
        baseX: ch.x,
        baseY: ch.y,
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        speedX: 3 + Math.random() * 4,
        speedY: 2 + Math.random() * 3,
      }));
      this.time.addEvent({
        delay: 16,
        loop: true,
        callback: () => {
          const now = this.time.now / 1000;
          for (const d of charData) {
            if (!d.ch.active) return;
            d.ch.x = d.baseX + Math.sin(now * d.speedX + d.phaseX) * amp;
            d.ch.y = d.baseY + Math.cos(now * d.speedY + d.phaseY) * amp;
          }
        },
      });
    }

    return container;
  }

  private onCardsPlaced(): void {
    if (!this.currentLevel.isTutorial) return;

    // Tutorial level 0: after first explore, show combat narrative
    if (this.currentLevelIndex === 0 && this.deck.isEmpty) {
      const zombieCard = this.grid.getOccupiedCards().find(
        c => c.cardData.type === CardType.Monster
      );

      this.isResolving = true;

      // Show first text immediately, below the grid
      const style = TUTORIAL_TEXT_STYLE;
      const gridBottomY = this.grid.worldPos(0, this.grid.rows - 1).y + CARD_H / 2;
      const firstText = this.createTutorialText(
        GAME_W / 2, gridBottomY + 60,
        "The Formidable Zombie is Guarding the Entrance.", style, 10001
      );
      this.tweens.add({ targets: firstText, alpha: 1, duration: 800, ease: "Sine.easeIn" });

      // After 2s, fade first text and show the rest at the normal position
      this.time.delayedCall(2800, () => {
        this.tweens.add({
          targets: firstText, alpha: 0, duration: 400,
          onComplete: () => {
            firstText.destroy();
            this.showTutorialNarrative([
              {
                text: "The Hero's power is less than the Zombie's.\nBut our Hero is tougher.",
                autoDelay: 5000,
                onShow: () => this.showTutorialHighlight(zombieCard ?? null),
                onHide: () => this.hideTutorialHighlight(),
              },
              {
                before: "Defeat the zombie. Take the key.\nEnter ",
                highlight: "The Tomb of Fate",
                shake: true,
                persistent: true,
                onShow: () => {
                  this.isResolving = false;
                  if (zombieCard) this.showTutorialPointerTo(zombieCard.x, zombieCard.y);
                },
              },
            ]);
          },
        });
      });
    }

    // Tutorial level 1: after first explore, show agility/lock narrative
    if (this.currentLevelIndex === 1 && this.deck.remaining === 3) {
      this.time.delayedCall(600, () => {
        this.isResolving = true;

        // Find chest and trap cards for lock icon cutouts
        const chestCard = this.grid.getOccupiedCards().find(
          c => c.cardData.type === CardType.Chest
        );
        const trapCard = this.grid.getOccupiedCards().find(
          c => c.cardData.type === CardType.Trap
        );

        // Show overlay with cutouts for lock/agility icons
        this.showTutorialHighlightAgility(chestCard ?? null, trapCard ?? null);

        this.showTutorialNarrative([
          {
            text: "Hero uses agility to break locks\nand disarm traps",
            autoDelay: 5000,
            onHide: () => this.hideTutorialHighlight(),
          },
          {
            text: "Or the Hero can take the lockpick\nfrom the scrawny skeleton",
            onHide: () => { this.isResolving = false; },
          },
        ]);
      });
    }
  }

  /** Dark overlay with rectangular cutouts to spotlight specific areas. */
  private showTutorialHighlight(zombieCard: Card | null): void {
    this.showTutorialOverlay([
      // Player power stat: PlayerView at (867.5, 910), powerGroup at (-95, -105)
      { x: 867.5 - 95 - (117 + 16) / 2, y: 910 - 105 - (89 + 16) / 2, w: 117 + 16, h: 89 + 16 },
      // Zombie card power icon: bottom-left of card
      ...(zombieCard ? [{
        x: zombieCard.x + (-CARD_W / 2 + 15) - 28,
        y: zombieCard.y + (CARD_H / 2 - 12) - 28, w: 56, h: 56,
      }] : []),
    ]);
  }

  /** Dark overlay with cutouts for lock icons on chest/trap and player agility. */
  private showTutorialHighlightAgility(chestCard: Card | null, trapCard: Card | null): void {
    const lockCards = [chestCard, trapCard].filter(Boolean) as Card[];
    this.showTutorialOverlay([
      // Player agility stat: PlayerView at (867.5, 910), agilityGroup at (112, -113)
      { x: 867.5 + 112 - (117 + 16) / 2, y: 910 - 113 - (89 + 16) / 2, w: 117 + 16, h: 89 + 16 },
      // Lock icons on chest and trap cards: bottom-right at (CARD_W/2 - 9, CARD_H/2 - 16)
      ...lockCards.map(card => ({
        x: card.x + (CARD_W / 2 - 9) - 28,
        y: card.y + (CARD_H / 2 - 16) - 28, w: 56, h: 56,
      })),
    ]);
  }

  /** Create a dark overlay with rectangular cutouts. Blocks all game input. */
  private showTutorialOverlay(cutouts: { x: number; y: number; w: number; h: number }[]): void {
    this.hideTutorialHighlight();
    const rt = this.add.renderTexture(0, 0, GAME_W, GAME_H)
      .setOrigin(0).setDepth(9999);
    rt.fill(0x000000, 0.6);

    for (const c of cutouts) {
      const rect = this.add.rectangle(0, 0, c.w, c.h, 0xffffff).setOrigin(0).setVisible(false);
      rt.erase(rect, c.x, c.y);
      rect.destroy();
    }

    // Make overlay interactive to block clicks from reaching game objects below
    rt.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_W, GAME_H), Phaser.Geom.Rectangle.Contains);

    this.tutorialHighlight = rt;
  }

  private hideTutorialHighlight(): void {
    if (this.tutorialHighlight) {
      this.tutorialHighlight.destroy();
      this.tutorialHighlight = null;
    }
  }

  private tutorialCombatSequence(monsterCard: Card): void {
    // Disable fight button during tutorial sequence
    if (this.fightBtn) this.fightBtn.disableInteractive();

    // Show overlay with cutout for player portrait+stats and fate deck
    const rt = this.add.renderTexture(0, 0, GAME_W, GAME_H)
      .setOrigin(0).setDepth(9999);
    rt.fill(0x000000, 0.6);
    rt.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_W, GAME_H), Phaser.Geom.Rectangle.Contains);

    // One big cutout covering player portrait + stats + fate deck
    // Portrait at (867.5, 910), fate deck at (1073.5, 914)
    const cutX = 867.5 - 180;
    const cutY = 910 - 145;
    const cutW = (1073.5 + 100) - cutX;
    const cutH = 290;
    const cutRect = this.add.rectangle(0, 0, cutW, cutH, 0xffffff).setOrigin(0).setVisible(false);
    rt.erase(cutRect, cutX, cutY);
    cutRect.destroy();

    const style = TUTORIAL_TEXT_STYLE;

    // Text 1: "Fate has always something to say..."
    const text1 = this.createTutorialText(
      GAME_W / 2, 688,
      "Fate always has something to say.\nLet's see what it has for you this time",
      style, 10001
    );
    this.tweens.add({
      targets: text1, alpha: 1, duration: 800, ease: "Sine.easeIn",
    });

    // After 2s, rig the fate deck to +1 and draw the fate card
    this.time.delayedCall(3800, () => {
      // Fade out text1
      this.tweens.add({
        targets: text1, alpha: 0, duration: 400,
        onComplete: () => text1.destroy(),
      });

      // Rig fate deck: move +1 to front
      const idx = this.player.fateDeck.indexOf(1);
      if (idx > 0) {
        this.player.fateDeck.splice(idx, 1);
        this.player.fateDeck.unshift(1);
      }

      // Animate fate card draw
      this.animateFateCardDraw((modifier) => {
        // Show modified power immediately on the player panel
        const modifiedPower = Math.max(0, this.player.power + this.inventory.powerBonus + modifier + this.getPassivePowerModifier());
        this.playerView.showTempPower(modifiedPower);

        // Text 2
        const text2 = this.createTutorialText(
          GAME_W / 2, 688,
          "Seems Fate is on your side.\nYou got +1 to Power!",
          style, 10001
        );
        this.tweens.add({
          targets: text2, alpha: 1, duration: 800, ease: "Sine.easeIn",
          onComplete: () => {
            let dismissed = false;
            const dismiss = () => {
              if (dismissed) return;
              dismissed = true;
              this.input.off("pointerdown", dismiss);
              // Fade overlay and text
              this.tweens.add({
                targets: [text2, rt], alpha: 0, duration: 400,
                onComplete: () => {
                  text2.destroy();
                  rt.destroy();
                  // Continue with normal combat from the drawn modifier
                  this.continueCombatAfterFateDraw(monsterCard, modifier);
                },
              });
            };
            const timer = this.time.delayedCall(7000, dismiss);
            this.time.delayedCall(500, () => {
              const clickDismiss = () => {
                this.input.off("pointerdown", clickDismiss);
                if (timer) timer.remove();
                dismiss();
              };
              this.input.on("pointerdown", clickDismiss);
            });
          },
        });
      });
    });
  }

  /** Resume combat after the fate card has already been drawn (skip the draw step). */
  private continueCombatAfterFateDraw(monsterCard: Card, modifier: number): void {
    this.resolveCombatHit(monsterCard, modifier);
  }

  // ── End tutorial intro ─────────────────────────────────────────

  private initLevel(levelIndex: number): void {
    const level = this.dungeonLevels[levelIndex];
    this.deck = Deck.fromDungeonLevel(level, levelIndex, this.gameplayLevelIndex);
    this.deck.onShuffle = () => this.sfx.play(SOUND_KEYS.cardDraw3);
    this.currentLevelKey = getCard(level.key);
  }

  /** Number of tutorial levels at the start of dungeonLevels. */
  private get tutorialLevelCount(): number {
    let count = 0;
    for (const l of this.dungeonLevels) {
      if (l.isTutorial) count++;
      else break;
    }
    return count;
  }

  /** Current level index offset to skip tutorial levels (for display / tint). */
  private get gameplayLevelIndex(): number {
    return this.currentLevelIndex - this.tutorialLevelCount;
  }

  private get currentLevel(): DungeonLevel {
    return this.dungeonLevels[this.currentLevelIndex];
  }

  /** Darken the background image based on current dungeon level. */
  private tintBackground(): void {
    // Per-level brightness: 1.0 = full bright, lower = darker
    const LEVEL_TINT = [1.0, 0.78, 0.55];
    const idx = Math.max(0, this.gameplayLevelIndex);
    const brightness = LEVEL_TINT[Math.min(idx, LEVEL_TINT.length - 1)];
    const channel = Math.round(brightness * 255);
    const tint = (channel << 16) | (channel << 8) | channel;
    this.backgroundImage.setTint(tint);
  }

  private createLevelIndicator(): void {
    this.levelIndicator = this.add.text(0, 20, "", {
      fontSize: "22px",
      fontFamily: FONT_UI,
      color: "#ddaa22",
      fontStyle: "bold",
    }).setOrigin(0.5, 0);
    this.deckGroup.add(this.levelIndicator);

    this.levelFlavorText = this.add.text(0, 48, "", {
      fontSize: "16px",
      fontFamily: FONT_UI,
      color: "#8888aa",
      fontStyle: "italic",
    }).setOrigin(0.5, 0);
    this.deckGroup.add(this.levelFlavorText);

    this.updateLevelIndicator();
  }

  private updateLevelIndicator(): void {
    const level = this.currentLevel;
    if (level.isTutorial) {
      this.levelIndicator.setText(level.name);
      this.levelFlavorText.setText(level.flavorText);
    } else {
      this.levelIndicator.setText(`Level ${this.gameplayLevelIndex + 1}: ${level.name}`);
      this.levelFlavorText.setText(level.flavorText);
    }
  }

  private updatePlayerStats(): void {
    const newMaxHp = 6 + this.inventory.maxHpBonus;
    if (newMaxHp !== this.player.maxHp) {
      const diff = newMaxHp - this.player.maxHp;
      this.player.maxHp = newMaxHp;
      if (diff > 0) {
        // MaxHP increased — heal the difference
        this.player.heal(diff);
      } else {
        // MaxHP decreased — subtract the lost bonus HP (minimum 1)
        const lost = -diff;
        this.player.hp = Math.max(1, this.player.hp - lost);
        if (this.player.hp > this.player.maxHp) {
          this.player.hp = this.player.maxHp;
        }
        this.player.emit("hpChanged", this.player.hp, this.player.maxHp);
      }
    }
    this.playerView.updateStats(this.player, this.inventory.powerBonus, this.getPassiveAgilityModifier() + this.inventory.agilityBonus, this.getPassivePowerModifier());
    this.updateMonsterBuffIndicators();
    this.refreshWeaponSlotBonuses();
    this.refreshBowShotDisplays();
  }

  private getPassivePowerModifier(): number {
    let total = 0;
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const card = this.grid.getCardAt(c, r);
        if (card?.cardData.abilities) {
          for (const ab of card.cardData.abilities) {
            const def = getAbility(ab.abilityId);
            if (def.trigger === "passive" && def.effect === "modifyPower") {
              total += Number(ab.params.amount ?? 0);
            }
          }
        }
      }
    }
    for (const slotDef of SLOT_DEFS) {
      if (slotDef.name.startsWith("backpack")) continue;
      const item = this.inventory.getItem(slotDef.name);
      if (item?.abilities) {
        for (const ab of item.abilities) {
          const def = getAbility(ab.abilityId);
          if (def.trigger === "passive" && def.effect === "modifyPower") {
            total += Number(ab.params.amount ?? 0);
          }
        }
      }
    }
    // Check for melee weapon boost from equipped items (e.g., Warrior Helm doubles weapon power)
    if (this.hasEquippedPassive("boostMeleeWeaponPower")) {
      for (const slotName of ["weapon1", "weapon2"]) {
        const weapon = this.inventory.getItem(slotName);
        if (!weapon || weapon.isKey || weapon.tag === "bow") continue;
        // Check if it's a pure shield (has absorbDamage ability and value is 0)
        const hasArmour = weapon.abilities?.some(a => getAbility(a.abilityId).effect === "absorbDamage") ?? false;
        if (hasArmour && weapon.value === 0) continue;
        total += weapon.value;
      }
    }
    return total;
  }

  private getPassiveAgilityModifier(): number {
    let total = 0;
    // Scan grid cards
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const card = this.grid.getCardAt(c, r);
        if (card?.cardData.abilities) {
          for (const ab of card.cardData.abilities) {
            const def = getAbility(ab.abilityId);
            if (def.trigger === "passive" && def.effect === "modifyAgility") {
              total += Number(ab.params.amount ?? 0);
            }
          }
        }
      }
    }
    // Scan inventory slots
    for (const slotDef of SLOT_DEFS) {
      if (slotDef.name.startsWith("backpack")) continue;
      const item = this.inventory.getItem(slotDef.name);
      if (item?.abilities) {
        for (const ab of item.abilities) {
          const def = getAbility(ab.abilityId);
          if (def.trigger === "passive" && def.effect === "modifyAgility") {
            total += Number(ab.params.amount ?? 0);
          }
        }
      }
    }
    return total;
  }

  private getEquippedPassiveAmount(effect: string): number {
    let total = 0;
    for (const slotDef of SLOT_DEFS) {
      if (slotDef.name.startsWith("backpack")) continue;
      const item = this.inventory.getItem(slotDef.name);
      if (!item?.abilities) continue;
      for (const ab of item.abilities) {
        const def = getAbility(ab.abilityId);
        if (def.trigger === "passive" && def.effect === effect) {
          total += (ab.params.amount as number) || 0;
        }
      }
    }
    return total;
  }

  private hasEquippedPassive(effect: string): boolean {
    for (const slotDef of SLOT_DEFS) {
      if (slotDef.name.startsWith("backpack")) continue;
      const item = this.inventory.getItem(slotDef.name);
      if (!item?.abilities) continue;
      for (const ab of item.abilities) {
        const def = getAbility(ab.abilityId);
        if (def.trigger === "passive" && def.effect === effect) return true;
      }
    }
    return false;
  }

  /** Refresh weapon inventory slots to show melee boost from Warrior Helm. */
  private refreshWeaponSlotBonuses(): void {
    const hasMeleeBoost = this.hasEquippedPassive("boostMeleeWeaponPower");
    for (const slotName of ["weapon1", "weapon2"]) {
      const weapon = this.inventory.getItem(slotName);
      if (!weapon || weapon.isKey || weapon.tag === "bow") {
        this.inventoryView.refreshSlot(slotName, 0);
        continue;
      }
      const hasArmour = weapon.abilities?.some(a => getAbility(a.abilityId).effect === "absorbDamage") ?? false;
      if (hasArmour && weapon.value === 0) {
        this.inventoryView.refreshSlot(slotName, 0);
        continue;
      }
      this.inventoryView.refreshSlot(slotName, hasMeleeBoost ? weapon.value : 0);
    }
  }

  /** Apply poison to an equipped weapon: increase its power and mark it poisoned until combat ends. */
  private applyPoisonToWeapon(slotName: string, amount: number): void {
    const weapon = this.inventory.getItem(slotName);
    if (!weapon) return;
    weapon.value += amount;
    weapon.poisoned = true;
    this.poisonedWeapons.push({ slotName, amount });
    this.updatePlayerStats();
  }

  /** Revert all active poison effects after combat. */
  private revertPoison(): void {
    for (const { slotName, amount } of this.poisonedWeapons) {
      const weapon = this.inventory.getItem(slotName);
      if (weapon && weapon.poisoned) {
        weapon.value = Math.max(0, weapon.value - amount);
        weapon.poisoned = false;
      }
    }
    this.poisonedWeapons = [];
    this.updatePlayerStats();
  }

  /** Update power display on all bow shot cards on the grid to reflect equipped bonuses. */
  private refreshBowShotDisplays(): void {
    const bowBonus = this.getEquippedPassiveAmount("boostBowDamage");
    let agilityBonus = 0;
    if (this.hasEquippedPassive("addAgilityToBowDamage")) {
      agilityBonus = this.player.agility + this.getPassiveAgilityModifier() + this.inventory.agilityBonus;
    }
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const card = this.grid.getCardAt(c, r);
        if (!card?.cardData.abilities) continue;
        const bowAbility = card.cardData.abilities.find(a => getAbility(a.abilityId).effect === "reduceRandomEnemyPower");
        if (bowAbility) {
          const base = bowAbility.params.amount as number;
          card.setPowerDisplay(base + bowBonus + agilityBonus);
        }
      }
    }
  }

  /** Apply equipped bow bonuses to a single card's power display if it's a bow shot. */
  private applyLevelScaling(card: CardData): void {
    const powerBonus = this.currentLevelIndex * 2;
    if (powerBonus > 0 && card.type === CardType.Monster) {
      card.value += powerBonus;
    }
  }

  private applyBowShotBonus(card: Card): void {
    const bowAbility = card.cardData.abilities?.find(a => getAbility(a.abilityId).effect === "reduceRandomEnemyPower");
    if (!bowAbility) return;
    const base = bowAbility.params.amount as number;
    const bonus = this.getEquippedPassiveAmount("boostBowDamage");
    let agilityBonus = 0;
    if (this.hasEquippedPassive("addAgilityToBowDamage")) {
      agilityBonus = this.player.agility + this.getPassiveAgilityModifier() + this.inventory.agilityBonus;
    }
    card.setPowerDisplay(base + bonus + agilityBonus);
  }

  private getMonsterPowerBuff(): number {
    let total = 0;
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const card = this.grid.getCardAt(c, r);
        if (card?.cardData.abilities) {
          for (const ab of card.cardData.abilities) {
            const def = getAbility(ab.abilityId);
            if (def.trigger === "passive" && def.effect === "modifyMonsterPower") {
              total += Number(ab.params.amount ?? 0);
            }
          }
        }
      }
    }
    return total;
  }

  private updateMonsterBuffIndicators(): void {
    const buff = this.getMonsterPowerBuff();
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const card = this.grid.getCardAt(c, r);
        if (card && card.cardData.type === CardType.Monster) {
          card.setBuffIndicator(buff);
        }
      }
    }
  }

  private onExplore(): void {
    if (this.deck.isEmpty || this.isResolving || this.hasTrapOnGrid()) return;

    if (this.tutorialAwaitingExplore) {
      this.tutorialAwaitingExplore = false;
      this.hideTutorialCursor();
      if (this.tutorialText) {
        this.tutorialText.destroy();
        this.tutorialText = null;
      }
    }

    const onExploreAbilities = this.collectOnExploreAbilities();
    if (onExploreAbilities.length === 0) {
      this.drawAndPlaceCards(3);
      return;
    }

    this.isResolving = true;
    this.executeOnExploreAbilities(onExploreAbilities, () => {
      this.isResolving = false;
      if (this.player.hp <= 0) {
        this.showGameOver();
        return;
      }
      this.drawAndPlaceCards(3);
    });
  }

  private drawAndPlaceCards(count: number): void {
    const emptySlots = this.grid.getEmptySlots();
    if (emptySlots.length === 0) return;

    const drawCount = Math.min(count, this.deck.remaining, emptySlots.length);
    if (drawCount === 0) return;
    const drawn = this.deck.draw(drawCount);

    // Shuffle empty slots for random placement
    for (let i = emptySlots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [emptySlots[i], emptySlots[j]] = [emptySlots[j], emptySlots[i]];
    }

    // Pre-plan: determine which monsters claim existing loot or generate new loot
    const claimedSet = new Set<Card>();
    interface PlacementPlan {
      cardData: CardData;
      slot?: { col: number; row: number };
      existingLoot?: Card;       // existing grid loot to claim
      generatedLoot?: CardData;  // new loot to generate
    }
    const plans: PlacementPlan[] = [];

    let slotIndex = 0;
    for (let i = 0; i < drawn.length; i++) {
      const cardData = drawn[i];

      // Event cards don't go on the grid
      if (cardData.type === CardType.Event) {
        plans.push({ cardData });
        continue;
      }

      if (slotIndex >= emptySlots.length) continue;
      const slot = emptySlots[slotIndex++];
      const plan: PlacementPlan = { cardData, slot };

      if (cardData.type === CardType.Monster) {
        const level = this.dungeonLevels[this.currentLevelIndex];
        const keyReady = cardData.isBoss && cardData.id === level.boss && this.currentLevelKey
          && (!level.keyCondition || this.discardedCardIds.has(level.keyCondition));
        if (keyReady) {
          plan.generatedLoot = this.currentLevelKey!;
          this.currentLevelKey = null;
        } else {
          const existing = this.findUnguardedLootOnGrid(claimedSet);
          if (existing) {
            claimedSet.add(existing);
            plan.existingLoot = existing;
            // Monster takes over the loot's grid slot
            const lootCell = this.grid.findCard(existing);
            if (lootCell) {
              plan.slot = { col: lootCell.col, row: lootCell.row };
            }
          } else {
            const loot = this.deck.drawLoot();
            if (loot) plan.generatedLoot = loot;
          }
        }
      }

      plans.push(plan);
    }

    this.updateHUD();
    this.updateDeckVisual();

    // Process cards sequentially (events get presented, grid cards get placed)
    this.processCardQueue(plans, 0);
  }

  private processCardQueue(plans: { cardData: CardData; slot?: { col: number; row: number }; existingLoot?: Card; generatedLoot?: CardData }[], index: number): void {
    if (index >= plans.length) {
      this.updatePlayerStats();
      this.updateDeckVisual();
      this.updateExploreButtonState();
      this.onCardsPlaced();
      return;
    }

    // Abort if player died from a previous event
    if (this.player.hp <= 0) {
      this.showGameOver();
      return;
    }

    const plan = plans[index];

    if (plan.cardData.type === CardType.Event) {
      this.presentEventCard(plan.cardData, () => {
        this.processCardQueue(plans, index + 1);
      });
    } else {
      this.placeGridCard(plan as { cardData: CardData; slot: { col: number; row: number }; existingLoot?: Card; generatedLoot?: CardData });
      this.time.delayedCall(150, () => {
        this.processCardQueue(plans, index + 1);
      });
    }
  }

  private placeGridCard(plan: { cardData: CardData; slot: { col: number; row: number }; existingLoot?: Card; generatedLoot?: CardData }): void {
    this.sfx.playRandom(SOUND_GROUPS.cardDraw);

    // Boss with key must occupy a genuinely empty cell — re-pick if slot was taken
    if (plan.cardData.isBoss && plan.generatedLoot && this.grid.getCardAt(plan.slot.col, plan.slot.row)) {
      const fresh = this.grid.getEmptySlots();
      if (fresh.length > 0) plan.slot = fresh[0];
    }

    const pos = this.grid.worldPos(plan.slot.col, plan.slot.row);
    const deckX = 350;
    const deckY = 200;

    if (plan.cardData.type === CardType.Monster) {
      let lootCard: Card | null = null;

      if (plan.existingLoot) {
        lootCard = plan.existingLoot;
        const lootCell = this.grid.findCard(lootCard);
        if (lootCell) this.grid.removeCard(lootCell.col, lootCell.row);
        lootCard.setPosition(pos.x, pos.y - TREASURE_OFFSET_Y);
        lootCard.setDepth(5);
      } else if (plan.generatedLoot) {
        lootCard = new Card(this, pos.x, pos.y - TREASURE_OFFSET_Y, plan.generatedLoot);
        lootCard.setDepth(5);
        lootCard.reveal();
      }

      const monsterCard = new Card(this, pos.x, pos.y, plan.cardData);
      monsterCard.setDepth(10);
      this.grid.placeCard(plan.slot.col, plan.slot.row, monsterCard);
      const selfCount = this.gridCountCard(plan.cardData.id);
      monsterCard.dealFrom(deckX, deckY, () => {
        this.executeOnRevealAbilities(monsterCard, plan.cardData, undefined, selfCount);
      });

      if (lootCard) {
        monsterCard.guardedLoot = lootCard;
        this.guardedByMonster.set(lootCard, monsterCard);
        this.setupGuardedLootInteraction(lootCard, monsterCard);
      }
      this.setupCardInteraction(monsterCard);
    } else if (plan.cardData.type === CardType.Chest) {
      const lootData = this.deck.drawLootForChest();

      const chestCard = new Card(this, pos.x, pos.y, plan.cardData);
      chestCard.setDepth(10);
      this.grid.placeCard(plan.slot.col, plan.slot.row, chestCard);
      chestCard.dealFrom(deckX, deckY);

      if (lootData) {
        const cardBack = this.createCardBack(pos.x, pos.y - TREASURE_OFFSET_Y+24);
        cardBack.setDepth(5);
        this.chestLoot.set(chestCard, { lootData, cardBack });
      }
      this.setupCardInteraction(chestCard);
    } else if (plan.cardData.type === CardType.Door) {
      const doorCard = new Card(this, pos.x, pos.y, plan.cardData);
      this.grid.placeCard(plan.slot.col, plan.slot.row, doorCard);
      doorCard.dealFrom(deckX, deckY);
      this.setupDoorInteraction(doorCard);
    } else {
      const card = new Card(this, pos.x, pos.y, plan.cardData);
      this.applyBowShotBonus(card);
      this.grid.placeCard(plan.slot.col, plan.slot.row, card);
      const selfCount = this.gridCountCard(plan.cardData.id);
      card.dealFrom(deckX, deckY, () => {
        this.executeOnRevealAbilities(card, plan.cardData, undefined, selfCount);
      });
      this.setupCardInteraction(card);
      if (plan.cardData.type === CardType.Trap) {
        this.updateExploreButtonState();
      }
    }
  }

  private presentEventCard(cardData: CardData, onComplete: () => void): void {
    this.sfx.playRandom(SOUND_GROUPS.cardDraw);
    this.isResolving = true;

    // Dark overlay — starts fully transparent
    const overlay = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0);
    overlay.setDepth(900);

    // Create card at the dungeon deck position
    const card = new Card(this, 350, 200, cardData);
    this.applyBowShotBonus(card);
    card.setDepth(910);

    // Phase 1: Card travels from deck to center while background darkens
    this.tweens.add({
      targets: card,
      x: GAME_W / 2,
      y: GAME_H / 2,
      duration: 500,
      ease: "Power2",
    });
    this.tweens.add({
      targets: overlay,
      alpha: 0.6,
      duration: 500,
      ease: "Power2",
      onComplete: () => {
        // Phase 2: Card scales up at center
        this.tweens.add({
          targets: card,
          scaleX: 1.8,
          scaleY: 1.8,
          duration: 400,
          ease: "Back.easeOut",
          onComplete: () => {
            // Hold for readability, then execute abilities
            this.time.delayedCall(1500, () => {
              this.executeOnRevealAbilities(card, cardData, () => {
                // Fire onResolve abilities before visual resolve
                const resolveAbilities = this.collectAbilities("onResolve", cardData);
                this.executeOnResolveAbilities(card, resolveAbilities, () => {
                  // Resolve card (shrink & destroy)
                  card.resolve(() => {
                    overlay.destroy();
                    this.isResolving = false;
                    if (this.player.hp <= 0) {
                      this.showGameOver();
                      return;
                    }
                    onComplete();
                  });
                });
              });
            });
          },
        });
      },
    });
  }

  private executeOnRevealAbilities(card: Card, cardData: CardData, onComplete?: () => void, gridSelfCount?: number): void {
    if (!cardData.abilities) {
      onComplete?.();
      return;
    }

    const revealAbilities = cardData.abilities.filter((a) => {
      const def = getAbility(a.abilityId);
      return def.trigger === "onReveal";
    });

    if (revealAbilities.length === 0) {
      onComplete?.();
      return;
    }

    // Process abilities sequentially
    const processNext = (idx: number) => {
      if (idx >= revealAbilities.length) {
        onComplete?.();
        return;
      }
      const ability = revealAbilities[idx];
      const def = getAbility(ability.abilityId);
      switch (def.effect) {
        case "damagePlayer":
          this.playDamagePlayerEffect(card, ability.params.amount as number, () => processNext(idx + 1));
          break;
        case "shuffleIntoDeck": {
          const cardId = ability.params.cardId as string;
          const count = ability.params.count as number;
          this.playSummonToDeckAnimation(card, cardId, count, () => processNext(idx + 1));
          break;
        }
        case "shuffleIntoDeckIfAbsent": {
          const cardId = ability.params.cardId as string;
          const count = ability.params.count as number;
          if (this.deck.hasCard(cardId) || this.gridHasCard(cardId)) {
            processNext(idx + 1);
          } else {
            this.playSummonToDeckAnimation(card, cardId, count, () => processNext(idx + 1));
          }
          break;
        }
        case "shuffleIntoDeckOnGridCount": {
          const cardId = ability.params.cardId as string;
          const count = ability.params.count as number;
          const requiredOtherCount = ability.params.requiredOtherCount as number;
          const othersOnGrid = (gridSelfCount ?? this.gridCountCard(cardData.id)) - 1;
          if (othersOnGrid === requiredOtherCount && !this.deck.hasCard(cardId) && !this.gridHasCard(cardId)) {
            // Add to deck immediately to prevent duplicate summons from simultaneous reveals
            // Suppress sound here — animation will play it at the right time
            const cardsToInsert = [];
            for (let i = 0; i < count; i++) {
              const c = getCard(cardId);
              this.applyLevelScaling(c);
              cardsToInsert.push(c);
            }
            const saved = this.deck.onShuffle;
            this.deck.onShuffle = null;
            this.deck.mergeCards(cardsToInsert);
            this.deck.onShuffle = saved;
            this.playSummonToDeckAnimation(card, cardId, count, () => processNext(idx + 1));
          } else {
            processNext(idx + 1);
          }
          break;
        }
        case "reduceWeaponPower": {
          const amount = ability.params.amount as number;
          // Bug 7: Find which weapon slot will be affected and play hit animation
          const targetSlot = this.findFirstWeaponSlot();
          if (targetSlot) {
            this.playHitOnSlotAnimation(
              card,
              targetSlot,
              () => {
                this.reduceEquippedWeaponPower(amount);
                processNext(idx + 1);
              },
            );
          } else {
            this.reduceEquippedWeaponPower(amount);
            processNext(idx + 1);
          }
          break;
        }
        case "removeFromDeck": {
          const removeCardId = ability.params.cardId as string;
          this.playRemoveFromDeckAnimation(removeCardId, () => processNext(idx + 1));
          break;
        }
        case "addFateModifier": {
          this.sfx.play(SOUND_KEYS.holySpell06);
          const mod = ability.params.modifier as number;
          this.playFlyToFateDeckAnimation({ x: card.x, y: card.y }, mod, () => processNext(idx + 1));
          break;
        }
        case "reduceRandomEnemyPower": {
          let bowDamage = ability.params.amount as number;
          // Apply bow passive bonuses from equipped items
          bowDamage += this.getEquippedPassiveAmount("boostBowDamage");
          if (this.hasEquippedPassive("addAgilityToBowDamage")) {
            bowDamage += this.player.agility + this.getPassiveAgilityModifier() + this.inventory.agilityBonus;
          }
          card.setPowerDisplay(bowDamage);
          const canRecycle = this.hasEquippedPassive("recycleBowShots");
          // Find all monsters on the grid
          const monsters: Card[] = [];
          for (let r = 0; r < this.grid.rows; r++) {
            for (let c = 0; c < this.grid.cols; c++) {
              const gc = this.grid.getCardAt(c, r);
              if (gc && gc.cardData.type === CardType.Monster) {
                monsters.push(gc);
              }
            }
          }
          if (monsters.length > 0) {
            // Bow shot hits enemy
            this.sfx.play(SOUND_KEYS.bowImpactHit);
            const target = monsters[Math.floor(Math.random() * monsters.length)];
            this.playHitOnTargetAnimation(card, target, () => {
              const newValue = Math.max(0, target.cardData.value - bowDamage);
              target.updateValue(newValue);
              if (newValue <= 0) {
                this.killMonster(target, () => processNext(idx + 1));
              } else {
                // Target survived — recycle bow shot if passive equipped
                if (canRecycle) {
                  this.deck.mergeCards([getCard(card.cardData.id)]);
                  this.updateDeckVisual();
                }
                processNext(idx + 1);
              }
            });
          } else {
            // Bow shot misses — no targets
            this.sfx.play(SOUND_KEYS.bowBlocked);
            // No monsters on grid — recycle bow shot if passive equipped
            if (canRecycle) {
              this.deck.mergeCards([getCard(card.cardData.id)]);
              this.updateDeckVisual();
            }
            processNext(idx + 1);
          }
          break;
        }
        default:
          processNext(idx + 1);
          break;
      }
    };
    processNext(0);
  }

  private playDamagePlayerEffect(source: Phaser.GameObjects.Container, amount: number, onComplete: () => void): void {
    const sourceOrigX = source.x;
    const sourceOrigY = source.y;
    const attackX = sourceOrigX + (this.playerView.x - sourceOrigX) * 0.6;
    const attackY = sourceOrigY + (this.playerView.y - sourceOrigY) * 0.6;

    this.tweens.add({
      targets: source,
      x: attackX,
      y: attackY,
      duration: 250,
      ease: "Power2",
      onComplete: () => {
        // Enemy hits player — sword impact sound
        this.sfx.play(SOUND_KEYS.swordImpactHit);
        this.applyDamageWithArmour(amount, () => {
          // Return source to original position
          this.tweens.add({
            targets: source,
            x: sourceOrigX,
            y: sourceOrigY,
            duration: 250,
            ease: "Power2",
            onComplete: () => {
              onComplete();
            },
          });
        });
      },
    });
  }

  private findUnguardedLootOnGrid(alreadyClaimed: Set<Card>): Card | null {
    const keyCards: Card[] = [];
    const nonKeyCards: Card[] = [];
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const card = this.grid.getCardAt(c, r);
        if (
          card &&
          (card.cardData.type === CardType.Treasure ||
            card.cardData.type === CardType.Potion ||
            card.cardData.type === CardType.Scroll) &&
          !this.guardedByMonster.has(card) &&
          !alreadyClaimed.has(card)
        ) {
          if (card.cardData.isKey) {
            keyCards.push(card);
          } else {
            nonKeyCards.push(card);
          }
        }
      }
    }
    return keyCards[0] ?? nonKeyCards[0] ?? null;
  }

  private setupGuardedLootInteraction(lootCard: Card, monsterCard: Card): void {
    // Hover reveals full card by raising depth above monster (no movement = no twitching)
    lootCard.on("pointerover", () => {
      if (this.isResolving) return;
      lootCard.setDepth(15);
    });
    lootCard.on("pointerout", () => {
      lootCard.setDepth(5);
    });
  }

  private freeGuardedLoot(lootCard: Card, cellPos: { col: number; row: number }): void {
    this.guardedByMonster.delete(lootCard);
    lootCard.removeAllListeners();
    lootCard.setAlpha(1);
    lootCard.setDepth(0);
    lootCard.restoreFullHitArea();
    const pos = this.grid.worldPos(cellPos.col, cellPos.row);
    lootCard.setPosition(pos.x, pos.y);
    this.grid.placeCard(cellPos.col, cellPos.row, lootCard);
    this.setupCardInteraction(lootCard);
  }

  private isEquippable(card: Card): boolean {
    return (
      (card.cardData.type === CardType.Treasure ||
        card.cardData.type === CardType.Potion) &&
      !!card.cardData.slot
    );
  }

  private isGoldPile(card: Card): boolean {
    return card.cardData.type === CardType.Treasure &&
      card.cardData.slot === "backpack" &&
      !card.cardData.abilities?.length;
  }

  private hasDragAbility(card: Card): boolean {
    return this.hasAnyDragAbility(card);
  }

  private isDraggable(card: Card): boolean {
    return this.isEquippable(card) || this.hasDragAbility(card);
  }

  private getLinkedCardId(card: Card): string | null {
    if (!card.cardData.abilities) return null;
    for (const ab of card.cardData.abilities) {
      const cardId = ab.params.cardId;
      if (typeof cardId === "string") return cardId;
    }
    return null;
  }

  private showHoverPreview(card: Card): void {
    this.hideHoverPreview();
    const linkedId = this.getLinkedCardId(card);
    if (!linkedId) return;
    const previewData = getCard(linkedId);
    const previewX = card.x + CARD_W + 12;
    const showRight = previewX + CARD_W / 2 <= GAME_W;
    const x = showRight ? previewX : card.x - CARD_W - 12;
    const preview = new Card(this, x, card.y, previewData);
    preview.setAlpha(0.9);
    preview.setDepth(50);
    preview.disableInteractive();
    this.hoverPreviewCard = preview;
  }

  private hideHoverPreview(): void {
    if (this.hoverPreviewCard) {
      this.hoverPreviewCard.destroy();
      this.hoverPreviewCard = null;
    }
  }

  private setupCardInteraction(card: Card): void {
    card.on("pointerover", () => {
      if (!this.isResolving && !this.isDragging) {
        card.setHighlight(true);
        this.showHoverPreview(card);
      }
    });
    card.on("pointerout", () => {
      card.setHighlight(false);
      this.hideHoverPreview();
    });
    card.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.isResolving) return;
      if (this.guardedByMonster.has(card)) return;
      if (this.isDraggable(card)) {
        this.dragStartPos = { x: pointer.x, y: pointer.y };
        this.dragCard = card;

        // Use scene-level listeners for drag detection (card pointermove
        // only fires while pointer is over the card's hit area)
        const onMoveDetect = (p: Phaser.Input.Pointer) => {
          if (!this.dragStartPos || this.isDragging) return;
          const dx = p.x - this.dragStartPos.x;
          const dy = p.y - this.dragStartPos.y;
          if (Math.sqrt(dx * dx + dy * dy) > 16) {
            this.input.off("pointermove", onMoveDetect);
            this.input.off("pointerup", onUpDetect);
            this.beginDrag(card);
          }
        };
        const onUpDetect = () => {
          this.input.off("pointermove", onMoveDetect);
          this.input.off("pointerup", onUpDetect);
          if (this.dragCard === card && !this.isDragging) {
            this.dragCard = null;
            this.dragStartPos = null;
            this.resolveCard(card);
          }
        };
        this.input.on("pointermove", onMoveDetect);
        this.input.on("pointerup", onUpDetect);
      } else {
        this.resolveCard(card);
      }
    });
  }

  private toWorldCoords(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    return { x: pointer.x, y: pointer.y };
  }

  private beginDrag(card: Card): void {
    this.hideTutorialCursor();
    this.isDragging = true;
    this.isResolving = true;
    card.setHighlight(false);
    this.hideHoverPreview();

    const cell = this.grid.findCard(card);
    if (cell) {
      this.dragOrigGridPos = { col: cell.col, row: cell.row };
      this.grid.removeCard(cell.col, cell.row);
    }

    card.setDepth(6000);
    card.setScale(0.85);

    // Show slot highlights immediately (only for empty compatible slots)
    for (const def of SLOT_DEFS) {
      const canDrop = this.inventory.canEquip(def.name, card.cardData) && !this.inventory.getItem(def.name);
      this.inventoryView.setSlotHighlight(def.name, canDrop ? "valid" : "invalid");
    }

    // Note: ability-target highlights (monsters, traps, etc.) are NOT shown
    // for grid drags — items must be equipped first to use abilities.

    const onMove = (pointer: Phaser.Input.Pointer) => {
      const world = this.toWorldCoords(pointer);
      card.setPosition(world.x, world.y);

      // Update slot highlights — bright when hovered, dim otherwise
      const hit = this.inventoryView.getSlotAtPoint(world.x, world.y);
      for (const def of SLOT_DEFS) {
        const canDrop = this.inventory.canEquip(def.name, card.cardData) && !this.inventory.getItem(def.name);
        if (hit === def.name) {
          this.inventoryView.setSlotHighlight(def.name, canDrop ? "valid" : "invalid");
        } else {
          this.inventoryView.setSlotHighlight(def.name, canDrop ? "valid_dim" : "invalid_dim");
        }
      }

      // Highlight door card if dragging a key
      if (card.cardData.isKey) {
        const doorCard = this.findDoorOnGrid();
        if (doorCard) {
          const dx = world.x - doorCard.x;
          const dy = world.y - doorCard.y;
          if (Math.abs(dx) < CARD_W / 2 && Math.abs(dy) < CARD_H / 2) {
            doorCard.setHighlight(true);
          } else {
            doorCard.setHighlight(false);
          }
        }
      }

      // Highlight portrait when dragging a gold pile over it
      if (this.isGoldPile(card)) {
        if (this.playerView.isPointOver(world.x, world.y)) {
          this.playerView.showDropHighlight(stripMarkup(card.cardData.description));
        } else {
          this.playerView.hideDropHighlight();
        }
      }

      // Ability-target highlights (portrait, traps, monsters, chests, weapons, tags)
      // are NOT shown for grid drags — items must be equipped to use abilities.
    };

    const onUp = (pointer: Phaser.Input.Pointer) => {
      this.input.off("pointermove", onMove);
      this.input.off("pointerup", onUp);

      const world = this.toWorldCoords(pointer);

      // Clear all grid card highlights
      this.clearGridHighlights();

      // Gold piles can be collected by dragging onto the player portrait
      if (this.isGoldPile(card) && this.playerView.isPointOver(world.x, world.y)) {
        this.playerView.hideDropHighlight();
        this.inventoryView.clearAllHighlights();
        this.sfx.play(SOUND_KEYS.coinsGather);
        this.player.addGold(card.cardData.value);
        card.disableInteractive();
        card.resolve(() => { this.finishDrag(); });
        return;
      }

      // Items cannot use abilities from the grid — must be equipped first.
      // If dropped on a valid ability target, show feedback and snap back.
      if (this.hasAnyDragAbility(card)) {
        const hitAbilityTarget =
          (this.collectAbilities("dragOnPlayerPortrait", card.cardData).length > 0 &&
            this.playerView.isPointOver(world.x, world.y)) ||
          (this.collectAbilities("dragOnTrap", card.cardData).length > 0 &&
            !!this.findTrapAtPoint(world.x, world.y)) ||
          (this.collectAbilities("dragOnMonster", card.cardData).length > 0 &&
            !!this.findMonsterAtPoint(world.x, world.y)) ||
          (this.collectAbilities("dragOnWeapon", card.cardData).length > 0 &&
            !!this.findWeaponSlotAtPoint(world.x, world.y)) ||
          (this.collectAbilities("dragOnChest", card.cardData).length > 0 &&
            !!this.findChestAtPoint(world.x, world.y)) ||
          this.collectAbilities("dragOnTag", card.cardData).some((ab) =>
            !!this.findTagSlotAtPoint(world.x, world.y, ab.params.tag as string));

        if (hitAbilityTarget) {
          this.playerView.hideDropHighlight();
          this.inventoryView.clearAllHighlights();
          this.showEquipFirstFeedback(card.x, card.y);
          this.snapBackToGrid(card);
          return;
        }
      }

      this.playerView.hideDropHighlight();

      // Check if key dropped on door
      if (card.cardData.isKey) {
        const doorCard = this.findDoorOnGrid();
        if (doorCard) {
          const dx = world.x - doorCard.x;
          const dy = world.y - doorCard.y;
          if (Math.abs(dx) < CARD_W / 2 && Math.abs(dy) < CARD_H / 2) {
            doorCard.setHighlight(false);
            this.inventoryView.clearAllHighlights();
            card.resolve(() => {
              this.finishDrag();
              this.openDoor(doorCard);
            });
            return;
          }
          doorCard.setHighlight(false);
        }
      }

      const slotName = this.inventoryView.getSlotAtPoint(world.x, world.y);

      // Gold piles auto-collect when dropped on inventory slots
      if (slotName && this.isGoldPile(card) && this.inventory.canEquip(slotName, card.cardData) && !this.inventory.getItem(slotName)) {
        this.inventoryView.clearAllHighlights();
        this.sfx.play(SOUND_KEYS.coinsGather);
        this.player.addGold(card.cardData.value);
        card.disableInteractive();
        card.resolve(() => { this.finishDrag(); });
        return;
      }

      if (slotName && this.inventory.canEquip(slotName, card.cardData) && !this.inventory.getItem(slotName)) {
        // Key collected — play jingling sound
        if (card.cardData.isKey) {
          this.sfx.play(SOUND_KEYS.keysJingling);
        }
        // Equip item (only into empty slots — no displacement allowed)
        this.inventory.equip(slotName, card.cardData);
        // Fire onEquip for the newly equipped card (skip for backpack slots)
        const equipAbilities = slotName.startsWith("backpack") ? [] : this.collectAbilities("onEquip", card.cardData);
        const slotPos = this.inventoryView.getSlotWorldPos(slotName);
        const cardPos = slotPos ?? { x: card.x, y: card.y };
        card.disableInteractive();
        card.resolve(() => {});
        this.fireAbilities(equipAbilities, () => {
          this.finishDrag();
        }, cardPos);
      } else {
        // Snap back to grid
        this.snapBackToGrid(card);
      }

      this.inventoryView.clearAllHighlights();
    };

    this.input.on("pointermove", onMove);
    this.input.on("pointerup", onUp);
  }

  private clearGridHighlights(): void {
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const gc = this.grid.getCardAt(c, r);
        if (gc) {
          gc.setHighlight(false);
          gc.setDropTargetHighlight(false);
        }
      }
    }
  }

  private snapBackToGrid(card: Card): void {
    if (!this.dragOrigGridPos) {
      this.finishDrag();
      return;
    }
    const pos = this.grid.worldPos(this.dragOrigGridPos.col, this.dragOrigGridPos.row);
    this.tweens.add({
      targets: card,
      x: pos.x,
      y: pos.y,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: "Power2",
      onComplete: () => {
        if (this.dragOrigGridPos) {
          this.grid.placeCard(this.dragOrigGridPos.col, this.dragOrigGridPos.row, card);
        }
        card.setDepth(0);
        this.finishDrag();
      },
    });
  }

  private showEquipFirstFeedback(x: number, y: number): void {
    const txt = this.add.text(x, y - 40, "Equip first!", {
      fontFamily: FONT_UI,
      fontSize: "28px",
      color: "#ffcc00",
      stroke: "#000000",
      strokeThickness: 4,
    });
    txt.setOrigin(0.5);
    txt.setDepth(7000);
    this.tweens.add({
      targets: txt,
      y: y - 100,
      alpha: 0,
      duration: 1200,
      ease: "Power2",
      onComplete: () => txt.destroy(),
    });
  }

  private finishDrag(): void {
    this.dragCard = null;
    this.dragStartPos = null;
    this.dragOrigGridPos = null;
    this.isDragging = false;
    this.isResolving = false;
  }

  private executeAbility(card: Card): void {
    const ability = card.cardData.abilities?.find((a) => {
      const aDef = getAbility(a.abilityId);
      return aDef.trigger === "dragOnPlayerPortrait";
    });
    if (!ability) return;

    const scrollId = card.cardData.tag === "scroll" ? card.cardData.id : null;
    const recycleAfterUse = () => {
      if (scrollId && this.hasScrollRecycle()) {
        this.deck.mergeCards([getCard(scrollId)]);
        this.updateDeckVisual();
      }
    };

    const def = getAbility(ability.abilityId);
    switch (def.effect) {
      case "healPlayer":
        this.sfx.play(SOUND_KEYS.potion);
        this.player.heal(ability.params.amount as number);
        break;
      case "removeDarkEvent":
        this.sfx.play(SOUND_KEYS.holySpell04);
        card.disableInteractive();
        card.resolve(() => {
          this.playRemoveMisfortuneAnimation(() => {
            recycleAfterUse();
            this.finishDrag();
          });
        });
        return; // async — handled above
    }

    card.disableInteractive();
    card.resolve(() => {
      recycleAfterUse();
      this.finishDrag();
    });
  }

  /** Collect abilities matching a trigger from a card's ability list. */
  private collectAbilities(
    trigger: AbilityTrigger,
    cardData: CardData,
  ): CardAbility[] {
    if (!cardData.abilities) return [];
    // onEquip abilities fire only once per card
    if (trigger === "onEquip" && cardData.equipTriggered) return [];
    const results = cardData.abilities.filter((a) => getAbility(a.abilityId).trigger === trigger);
    if (trigger === "onEquip" && results.length > 0) {
      cardData.equipTriggered = true;
    }
    return results;
  }

  /** Collect abilities matching a trigger from all equipped inventory items. */
  private collectEquippedAbilities(trigger: AbilityTrigger): CardAbility[] {
    const results: CardAbility[] = [];
    for (const slotDef of SLOT_DEFS) {
      if (slotDef.name.startsWith("backpack")) continue;
      const item = this.inventory.getItem(slotDef.name);
      if (!item?.abilities) continue;
      for (const ab of item.abilities) {
        if (getAbility(ab.abilityId).trigger === trigger) {
          results.push(ab);
        }
      }
    }
    return results;
  }

  /** Execute a list of abilities sequentially, calling onComplete when done. */
  private fireAbilities(
    abilities: CardAbility[],
    onComplete: () => void,
    sourcePos?: { x: number; y: number },
  ): void {
    if (abilities.length === 0) {
      onComplete();
      return;
    }

    const [current, ...rest] = abilities;
    const def = getAbility(current.abilityId);

    switch (def.effect) {
      case "healPlayer":
        this.sfx.play(SOUND_KEYS.potion);
        this.player.heal(current.params.amount as number);
        break;
      case "damagePlayer":
        this.player.takeDamage(current.params.amount as number);
        break;
      case "shuffleIntoDeck": {
        const cardId = current.params.cardId as string;
        const count = current.params.count as number;
        // Bow adds arrows to deck
        if (cardId === "bow_shot" || cardId === "strong_bow_shot") {
          this.sfx.playRandom(SOUND_GROUPS.bowAttack);
        }
        const origin = sourcePos ?? { x: GAME_W / 2, y: GAME_H / 2 };
        this.playSummonToDeckAnimation(origin, cardId, count, () => {
          this.fireAbilities(rest, onComplete, sourcePos);
        });
        return; // async — don't fall through to chain below
      }
      case "triggerBowAbility": {
        // Find equipped bow and fire its onEquip abilities
        for (const slotName of ["weapon1", "weapon2"]) {
          const item = this.inventory.getItem(slotName);
          if (item?.tag === "bow" && item.abilities) {
            const bowEquipAbilities = item.abilities.filter(a => getAbility(a.abilityId).trigger === "onEquip");
            if (bowEquipAbilities.length > 0) {
              this.fireAbilities(bowEquipAbilities, () => {
                this.fireAbilities(rest, onComplete, sourcePos);
              }, sourcePos);
              return;
            }
          }
        }
        break;
      }
      case "removeFromDeck": {
        const cardId = current.params.cardId as string;
        this.playRemoveFromDeckAnimation(cardId, () => {
          this.fireAbilities(rest, onComplete, sourcePos);
        });
        return; // async
      }
      case "addFateModifier": {
        this.sfx.play(SOUND_KEYS.holySpell06);
        const modifier = current.params.modifier as number;
        const origin = sourcePos ?? { x: GAME_W / 2, y: GAME_H / 2 };
        this.playFlyToFateDeckAnimation(origin, modifier, () => {
          this.fireAbilities(rest, onComplete, sourcePos);
        });
        return; // async
      }
      case "buffMonsterType": {
        const monsterId = current.params.monsterId as string;
        const amount = current.params.amount as number;
        for (let r = 0; r < this.grid.rows; r++) {
          for (let c = 0; c < this.grid.cols; c++) {
            const gc = this.grid.getCardAt(c, r);
            if (gc && gc.cardData.id === monsterId) {
              gc.updateValue(gc.cardData.value + amount);
            }
          }
        }
        this.deck.buffCardById(monsterId, amount);
        break;
      }
    }

    // Chain to next ability
    this.fireAbilities(rest, onComplete, sourcePos);
  }

  private fireDragOnMonsterAbilities(abilities: CardAbility[], target: Card, onComplete: () => void): void {
    if (abilities.length === 0) {
      onComplete();
      return;
    }
    const [current, ...rest] = abilities;
    const def = getAbility(current.abilityId);

    // Collect VFX targets based on effect type, then play VFX before applying the effect
    const vfxId = current.params.vfx as string | undefined;
    const vfx = vfxId ? getVfx(vfxId) : undefined;

    const applyEffect = () => {
      switch (def.effect) {
        case "reduceTargetMonsterPower": {
          let amount = current.params.amount as number;
          if (this.lastUsedScrollId) {
            amount += this.getScrollDamageBonus();
          }
          const newValue = Math.max(0, target.cardData.value - amount);
          target.updateValue(newValue);
          if (newValue <= 0) {
            this.killMonster(target, () => {
              this.fireDragOnMonsterAbilities(rest, target, onComplete);
            });
          } else {
            this.fireDragOnMonsterAbilities(rest, target, onComplete);
          }
          break;
        }
        case "reduceAdjacentMonsterPower": {
          let amount = current.params.amount as number;
          if (this.lastUsedScrollId) {
            amount += this.getScrollDamageBonus();
          }
          // Reduce target
          const newValue = Math.max(0, target.cardData.value - amount);
          target.updateValue(newValue);
          // Reduce adjacent monsters
          const adjacent = this.getAdjacentCards(target);
          for (const adj of adjacent) {
            if (adj.cardData.type === CardType.Monster) {
              const adjNewValue = Math.max(0, adj.cardData.value - amount);
              adj.updateValue(adjNewValue);
            }
          }
          // Clean up dead monsters (target first, then adjacent)
          const deadMonsters: Card[] = [];
          if (newValue <= 0) deadMonsters.push(target);
          for (const adj of adjacent) {
            if (adj.cardData.type === CardType.Monster && adj.cardData.value <= 0) {
              deadMonsters.push(adj);
            }
          }
          this.resolveDeadMonsters(deadMonsters, () => {
            this.fireDragOnMonsterAbilities(rest, target, onComplete);
          });
          break;
        }
        default:
          this.fireDragOnMonsterAbilities(rest, target, onComplete);
          break;
      }
    };

    if (vfx) {
      // Build target list based on effect type
      const vfxTargets: VfxTarget[] = [{ x: target.x, y: target.y, gameObject: target }];
      if (def.effect === "reduceAdjacentMonsterPower") {
        for (const adj of this.getAdjacentCards(target)) {
          if (adj.cardData.type === CardType.Monster) {
            vfxTargets.push({ x: adj.x, y: adj.y, gameObject: adj });
          }
        }
      }
      const source = { x: this.playerView.x, y: this.playerView.y };
      // Play magic sounds when VFX starts, not when effect resolves
      if (def.effect === "reduceTargetMonsterPower") {
        this.sfx.play(SOUND_KEYS.fireBolt);
      } else if (def.effect === "reduceAdjacentMonsterPower") {
        this.sfx.play(SOUND_KEYS.fireball);
      }
      vfx(this, source, vfxTargets, applyEffect);
    } else {
      // No VFX — play sound immediately before applying effect
      if (def.effect === "reduceTargetMonsterPower") {
        this.sfx.play(SOUND_KEYS.fireBolt);
      } else if (def.effect === "reduceAdjacentMonsterPower") {
        this.sfx.play(SOUND_KEYS.fireball);
      }
      applyEffect();
    }
  }

  private getScrollDamageBonus(): number {
    let total = 0;
    for (const slotDef of SLOT_DEFS) {
      if (slotDef.name.startsWith("backpack")) continue;
      const item = this.inventory.getItem(slotDef.name);
      if (!item?.abilities) continue;
      for (const ab of item.abilities) {
        const aDef = getAbility(ab.abilityId);
        if (aDef.trigger === "passive" && aDef.effect === "boostScrollDamage") {
          total += (ab.params.amount as number) || 0;
        }
      }
    }
    return total;
  }

  private hasScrollRecycle(): boolean {
    for (const slotDef of SLOT_DEFS) {
      if (slotDef.name.startsWith("backpack")) continue;
      const item = this.inventory.getItem(slotDef.name);
      if (!item?.abilities) continue;
      for (const ab of item.abilities) {
        const aDef = getAbility(ab.abilityId);
        if (aDef.trigger === "passive" && aDef.effect === "recycleScrolls") return true;
      }
    }
    return false;
  }

  /** Centralised monster-death handler.  Every monster removal MUST go
   *  through this so that death abilities, guarded-loot and the resolve
   *  animation are always executed in the same order. */
  private killMonster(monsterCard: Card, onComplete?: () => void): void {
    const cell = this.grid.findCard(monsterCard);
    const cellPos = cell ? { col: cell.col, row: cell.row } : null;
    if (cell) this.grid.removeCard(cell.col, cell.row);

    this.handleMonsterDeathAbilities(monsterCard);

    // Free guarded loot at the monster's former cell so it never moves
    const guardedLoot = monsterCard.guardedLoot;
    if (guardedLoot) {
      if (cellPos) {
        this.freeGuardedLoot(guardedLoot, cellPos);
      } else {
        guardedLoot.destroy();
        this.guardedByMonster.delete(guardedLoot);
      }
      monsterCard.guardedLoot = null;
    }

    monsterCard.resolve(() => {
      onComplete?.();
    });
  }

  private resolveDeadMonsters(monsters: Card[], onComplete: () => void): void {
    if (monsters.length === 0) {
      onComplete();
      return;
    }
    const [current, ...rest] = monsters;
    this.killMonster(current, () => {
      this.resolveDeadMonsters(rest, onComplete);
    });
  }

  private static readonly DRAG_TRIGGERS: AbilityTrigger[] = [
    "dragOnPlayerPortrait",
    "dragOnTrap",
    "dragOnWeapon",
    "dragOnMonster",
    "dragOnChest",
    "dragOnTag",
  ];

  /** Check if a card has any drag-type ability. */
  private hasAnyDragAbility(card: Card): boolean {
    if (!card.cardData.abilities) return false;
    return card.cardData.abilities.some((a) => {
      const def = getAbility(a.abilityId);
      return GameScene.DRAG_TRIGGERS.includes(def.trigger);
    });
  }

  /** Find a trap card at the given world coordinates on the grid. */
  private findTrapAtPoint(x: number, y: number): Card | null {
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard && gridCard.cardData.type === CardType.Trap) {
          if (Math.abs(x - gridCard.x) < CARD_W / 2 && Math.abs(y - gridCard.y) < CARD_H / 2) {
            return gridCard;
          }
        }
      }
    }
    return null;
  }

  /** Find a monster card at the given world coordinates on the grid. */
  private findMonsterAtPoint(x: number, y: number): Card | null {
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard && gridCard.cardData.type === CardType.Monster) {
          if (Math.abs(x - gridCard.x) < CARD_W / 2 && Math.abs(y - gridCard.y) < CARD_H / 2) {
            return gridCard;
          }
        }
      }
    }
    return null;
  }

  /** Find a chest card at the given world coordinates on the grid. */
  private findChestAtPoint(x: number, y: number): Card | null {
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard && gridCard.cardData.type === CardType.Chest) {
          if (Math.abs(x - gridCard.x) < CARD_W / 2 && Math.abs(y - gridCard.y) < CARD_H / 2) {
            return gridCard;
          }
        }
      }
    }
    return null;
  }

  /** Find any card at the given world coordinates on the grid. */
  private findGridCardAtPoint(x: number, y: number): Card | null {
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard) {
          if (Math.abs(x - gridCard.x) < CARD_W / 2 && Math.abs(y - gridCard.y) < CARD_H / 2) {
            return gridCard;
          }
        }
      }
    }
    return null;
  }

  /** Get all cards adjacent (up/down/left/right) to the given card on the grid. */
  private getAdjacentCards(card: Card): Card[] {
    const cell = this.grid.findCard(card);
    if (!cell) return [];
    const adjacent: Card[] = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dc, dr] of dirs) {
      const nc = cell.col + dc;
      const nr = cell.row + dr;
      if (nc >= 0 && nc < this.grid.cols && nr >= 0 && nr < this.grid.rows) {
        const adjCard = this.grid.getCardAt(nc, nr);
        if (adjCard) adjacent.push(adjCard);
      }
    }
    return adjacent;
  }

  /** Find an equipped weapon slot at the given world coordinates. */
  private findWeaponSlotAtPoint(x: number, y: number): string | null {
    const slotName = this.inventoryView.getSlotAtPoint(x, y);
    if (!slotName) return null;
    const slotDef = SLOT_DEFS.find((s) => s.name === slotName);
    if (!slotDef || !slotDef.accepted.includes("weapon")) return null;
    if (!this.inventory.getItem(slotName)) return null;
    return slotName;
  }

  /** Find an equipped (non-backpack) inventory slot whose item has the given tag. */
  private findTagSlotAtPoint(x: number, y: number, tag: string): string | null {
    const slotName = this.inventoryView.getSlotAtPoint(x, y);
    if (!slotName || slotName.startsWith("backpack")) return null;
    const item = this.inventory.getItem(slotName);
    if (!item || item.tag !== tag) return null;
    return slotName;
  }

  private gridHasCard(id: string): boolean {
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const card = this.grid.getCardAt(c, r);
        if (card && card.cardData.id === id) return true;
      }
    }
    return false;
  }

  private gridCountCard(id: string): number {
    let count = 0;
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const card = this.grid.getCardAt(c, r);
        if (card && card.cardData.id === id) count++;
      }
    }
    return count;
  }

  private reduceEquippedWeaponPower(amount: number): void {
    const w1 = this.inventory.getItem("weapon1");
    const w2 = this.inventory.getItem("weapon2");
    const w1Valid = w1 && w1.slot === "weapon" && !w1.isKey;
    const w2Valid = w2 && w2.slot === "weapon" && !w2.isKey;
    let targetSlot: string | null = null;
    if (w1Valid && w2Valid) {
      targetSlot = w2!.value > w1!.value ? "weapon2" : "weapon1";
    } else if (w1Valid) {
      targetSlot = "weapon1";
    } else if (w2Valid) {
      targetSlot = "weapon2";
    }
    if (targetSlot) {
      const item = this.inventory.getItem(targetSlot)!;
      item.value = Math.max(0, item.value - amount);
      this.inventoryView.refreshSlot(targetSlot);
      this.inventory.emit("statsChanged");
    }
  }

  /** Find the first equipped non-key weapon slot name, or null. */
  private findFirstWeaponSlot(): string | null {
    for (const slotName of ["weapon1", "weapon2"]) {
      const item = this.inventory.getItem(slotName);
      if (item && item.slot === "weapon" && !item.isKey) {
        return slotName;
      }
    }
    return null;
  }

  private collectOnExploreAbilities(): Array<{ card: Card; ability: CardAbility }> {
    const results: Array<{ card: Card; ability: CardAbility }> = [];
    for (const card of this.grid.getOccupiedCards()) {
      if (!card.cardData.abilities) continue;
      for (const ability of card.cardData.abilities) {
        const def = getAbility(ability.abilityId);
        if (def.trigger === "onExplore") {
          results.push({ card, ability });
        }
      }
    }
    return results;
  }

  private executeOnExploreAbilities(
    abilities: Array<{ card: Card; ability: CardAbility }>,
    onComplete: () => void,
  ): void {
    if (abilities.length === 0) {
      onComplete();
      return;
    }

    const [current, ...rest] = abilities;
    const def = getAbility(current.ability.abilityId);

    switch (def.effect) {
      case "shuffleIntoDeck": {
        const cardId = current.ability.params.cardId as string;
        const count = current.ability.params.count as number;
        this.playSummonToDeckAnimation(current.card, cardId, count, () => {
          this.executeOnExploreAbilities(rest, onComplete);
        });
        break;
      }
      case "damagePlayer":
        this.playDamagePlayerEffect(current.card, current.ability.params.amount as number, () => {
          this.executeOnExploreAbilities(rest, onComplete);
        });
        break;
      case "removeFromDeck": {
        const removeId = current.ability.params.cardId as string;
        this.playRemoveFromDeckAnimation(removeId, () => {
          this.executeOnExploreAbilities(rest, onComplete);
        });
        break;
      }
      case "addFateModifier": {
        this.sfx.play(SOUND_KEYS.holySpell06);
        const mod = current.ability.params.modifier as number;
        this.playFlyToFateDeckAnimation({ x: current.card.x, y: current.card.y }, mod, () => {
          this.executeOnExploreAbilities(rest, onComplete);
        });
        break;
      }
      default:
        this.executeOnExploreAbilities(rest, onComplete);
        break;
    }
  }

  private playSummonToDeckAnimation(
    sourcePos: { x: number; y: number },
    cardId: string,
    count: number,
    onComplete: () => void,
  ): void {
    const centerX = GAME_W / 2;
    const centerY = GAME_H / 2;
    const cardScale = 1.4;
    const scaledW = CARD_W * cardScale;
    const spacing = scaledW + 24;
    const totalWidth = count * scaledW + (count - 1) * 24;
    const startX = centerX - totalWidth / 2 + scaledW / 2;

    // Dark overlay behind the cards
    const overlay = this.add.graphics();
    overlay.setDepth(499);
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, GAME_W, GAME_H);

    // Smoke particles burst from producer card
    const emitter = this.add.particles(sourcePos.x, sourcePos.y, "particle_circle", {
      speed: { min: 30, max: 80 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.6, end: 0 },
      tint: 0x886699,
      lifespan: 600,
      quantity: 12,
      emitting: false,
    });
    emitter.setDepth(501);
    emitter.explode(12);
    this.time.delayedCall(800, () => emitter.destroy());

    // Create temp cards at the producer card's position (small scale)
    const tempCards: Card[] = [];
    const cardDatas: CardData[] = [];

    for (let i = 0; i < count; i++) {
      const data = getCard(cardId);
      this.applyLevelScaling(data);
      cardDatas.push(data);
      const card = new Card(this, sourcePos.x, sourcePos.y, data);
      this.applyBowShotBonus(card);
      card.setScale(0.3);
      card.setDepth(6000);
      card.disableInteractive();
      card.reveal();
      tempCards.push(card);
    }

    // Fly cards from producer to screen center while scaling up
    let arrivedAtCenter = 0;
    tempCards.forEach((card, i) => {
      const targetX = startX + i * spacing;
      this.tweens.add({
        targets: card,
        x: targetX,
        y: centerY,
        scaleX: cardScale,
        scaleY: cardScale,
        duration: 400,
        delay: i * 80,
        ease: "Power2",
        onComplete: () => {
          arrivedAtCenter++;
          if (arrivedAtCenter === tempCards.length) {
            // Hold at center for ~1.5s, then fly to deck
            this.time.delayedCall(1500, () => {
              this.flySummonedCardsToDeck(tempCards, cardDatas, overlay, onComplete);
            });
          }
        },
      });
    });
  }

  private flySummonedCardsToDeck(
    tempCards: Card[],
    cardDatas: CardData[],
    overlay: Phaser.GameObjects.Graphics,
    onComplete: () => void,
  ): void {
    const deckWorldX = 350;
    const deckWorldY = 200;
    let completed = 0;

    // Play shuffle sound at the start of the fly animation
    this.sfx.play(SOUND_KEYS.cardDraw3);

    // Fade out overlay alongside card flight
    this.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: 500,
      onComplete: () => overlay.destroy(),
    });

    tempCards.forEach((card, i) => {
      this.tweens.add({
        targets: card,
        x: deckWorldX,
        y: deckWorldY,
        scaleX: 1,
        scaleY: 1,
        duration: 500,
        delay: i * 100,
        ease: "Power2",
        onUpdate: () => {
          // Once card is near the deck, drop it behind
          const dx = Math.abs(card.x - deckWorldX);
          const dy = Math.abs(card.y - deckWorldY);
          if (dx < CARD_W && dy < CARD_H) {
            card.setDepth(-1);
          }
        },
        onComplete: () => {
          card.destroy();
          completed++;
          if (completed === tempCards.length) {
            // Sound already played at animation start — suppress duplicate
            const saved = this.deck.onShuffle;
            this.deck.onShuffle = null;
            this.deck.mergeCards(cardDatas);
            this.deck.onShuffle = saved;
            this.updateDeckVisual();
            this.updateHUD();
            onComplete();
          }
        },
      });
    });
  }

  /**
   * Bug 4: Generic animation for when an ability removes a card from the dungeon deck.
   * A temporary card slides out from the deck area, pauses so the player can see it,
   * then fades away.
   */
  private playRemoveFromDeckAnimation(
    cardId: string,
    onComplete: () => void,
  ): void {
    const removed = this.deck.removeCardById(cardId);
    if (!removed) {
      onComplete();
      return;
    }

    this.updateDeckVisual();
    this.updateHUD();

    const deckWorldX = 350;
    const deckWorldY = 200;

    // Create a temp card at the deck position
    const tempCard = new Card(this, deckWorldX, deckWorldY, removed);
    tempCard.setDepth(500);
    tempCard.setScale(0.5);
    tempCard.setAlpha(0);
    tempCard.disableInteractive();

    // Slide card out from deck to the right
    const targetX = deckWorldX + 200;
    const targetY = deckWorldY;

    this.tweens.add({
      targets: tempCard,
      x: targetX,
      y: targetY,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 1,
      duration: 400,
      ease: "Back.easeOut",
      onComplete: () => {
        // Hold for ~1 second so the player can see the removed card
        this.time.delayedCall(1000, () => {
          // Fade and shrink away
          this.tweens.add({
            targets: tempCard,
            alpha: 0,
            scaleX: 0,
            scaleY: 0,
            duration: 400,
            ease: "Power2",
            onComplete: () => {
              tempCard.destroy();
              onComplete();
            },
          });
        });
      },
    });
  }

  /**
   * Remove the first misfortune-tagged card from the deck and animate it appearing
   * near the deck then dissolving.
   */
  private playRemoveMisfortuneAnimation(onComplete: () => void): void {
    const removed = this.deck.removeFirstByTag("misfortune");
    if (!removed) {
      onComplete();
      return;
    }

    this.updateDeckVisual();
    this.updateHUD();

    const deckWorldX = 350;
    const deckWorldY = 200;

    // Create a temp card at the deck position
    const tempCard = new Card(this, deckWorldX, deckWorldY, removed);
    tempCard.setDepth(500);
    tempCard.setScale(0.5);
    tempCard.setAlpha(0);
    tempCard.disableInteractive();

    // Slide card out from deck to the right
    const targetX = deckWorldX + 200;

    this.tweens.add({
      targets: tempCard,
      x: targetX,
      y: deckWorldY,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 1,
      duration: 400,
      ease: "Back.easeOut",
      onComplete: () => {
        // Hold briefly so the player can see the removed misfortune
        this.time.delayedCall(1000, () => {
          // Fade and shrink away
          this.tweens.add({
            targets: tempCard,
            alpha: 0,
            scaleX: 0,
            scaleY: 0,
            duration: 400,
            ease: "Power2",
            onComplete: () => {
              tempCard.destroy();
              onComplete();
            },
          });
        });
      },
    });
  }

  /**
   * Dim everything except the given cards — same as enterCombatMode dimming.
   */
  private dimNonParticipants(except: Phaser.GameObjects.Container[]): void {
    const exceptSet = new Set(except);
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard && !exceptSet.has(gridCard)) {
          gridCard.setAlpha(0.3);
          if (gridCard.guardedLoot) {
            gridCard.guardedLoot.setAlpha(0.3);
            gridCard.guardedLoot.disableInteractive();
          }
          const chestLootInfo = this.chestLoot.get(gridCard);
          if (chestLootInfo) chestLootInfo.cardBack.setAlpha(0.3);
        }
      }
    }
    this.gridBgGraphics.forEach(img => img.setAlpha(0.3));
    this.deckVisual.forEach(img => img.setAlpha(0.3));
    this.deckText.setAlpha(0.3);
    this.goldText.setAlpha(0.3);
    this.exploreBtn.setAlpha(0.3);
    this.levelIndicator.setAlpha(0.3);
    this.levelFlavorText.setAlpha(0.3);
  }

  /**
   * Restore everything after dimNonParticipants.
   */
  private undimAll(): void {
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard) {
          gridCard.setAlpha(1);
          if (gridCard.guardedLoot) {
            gridCard.guardedLoot.setAlpha(1);
            gridCard.guardedLoot.setDepth(5);
            gridCard.guardedLoot.setInteractive();
          }
          const chestLootInfo = this.chestLoot.get(gridCard);
          if (chestLootInfo) chestLootInfo.cardBack.setAlpha(1);
        }
      }
    }
    this.gridBgGraphics.forEach(img => img.setAlpha(1));
    this.deckVisual.forEach(img => img.setAlpha(1));
    this.deckText.setAlpha(1);
    this.goldText.setAlpha(1);
    this.exploreBtn.setAlpha(1);
    this.levelIndicator.setAlpha(1);
    this.levelFlavorText.setAlpha(1);
  }

  /**
   * Bug 7: Full combat-style attack animation — dim, scale down, lunge, shake, return, undim.
   */
  private playHitOnTargetAnimation(
    source: Phaser.GameObjects.Container,
    target: Phaser.GameObjects.Container,
    onComplete: () => void,
  ): void {
    // Step 1: Dim everything except source and target
    this.dimNonParticipants([source, target]);
    source.setDepth(4500);
    target.setDepth(4500);

    // Step 2: Scale source down to 1.0 if enlarged (event cards are 1.8x)
    const sourceOrigScaleX = source.scaleX;
    const sourceOrigScaleY = source.scaleY;
    const needsScaleDown = sourceOrigScaleX > 1.05 || sourceOrigScaleY > 1.05;

    const doLunge = () => {
      const sourceOrigX = source.x;
      const sourceOrigY = source.y;
      const attackX = sourceOrigX + (target.x - sourceOrigX) * 0.6;
      const attackY = sourceOrigY + (target.y - sourceOrigY) * 0.6;

      // Step 3: Lunge source toward target
      this.tweens.add({
        targets: source,
        x: attackX,
        y: attackY,
        duration: 250,
        ease: "Power2",
        onComplete: () => {
          // Step 4: Shake target on hit
          const origTargetX = target.x;
          this.tweens.add({
            targets: target,
            x: origTargetX + 10,
            duration: 50,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
              target.x = origTargetX;
              // Step 5: Return source
              this.tweens.add({
                targets: source,
                x: sourceOrigX,
                y: sourceOrigY,
                duration: 250,
                ease: "Power2",
                onComplete: () => {
                  // Step 6: Restore scale if we changed it
                  if (needsScaleDown) {
                    this.tweens.add({
                      targets: source,
                      scaleX: sourceOrigScaleX,
                      scaleY: sourceOrigScaleY,
                      duration: 300,
                      ease: "Power2",
                      onComplete: () => {
                        this.undimAll();
                        source.setDepth(910);
                        target.setDepth(10);
                        onComplete();
                      },
                    });
                  } else {
                    this.undimAll();
                    source.setDepth(10);
                    target.setDepth(10);
                    onComplete();
                  }
                },
              });
            },
          });
        },
      });
    };

    if (needsScaleDown) {
      this.tweens.add({
        targets: source,
        scaleX: 1,
        scaleY: 1,
        duration: 300,
        ease: "Power2",
        onComplete: doLunge,
      });
    } else {
      doLunge();
    }
  }

  /**
   * Bug 7: Full combat-style attack animation toward an inventory slot.
   */
  private playHitOnSlotAnimation(
    source: Phaser.GameObjects.Container,
    slotName: string,
    onComplete: () => void,
  ): void {
    const slotPos = this.inventoryView.getSlotWorldPos(slotName);
    if (!slotPos) {
      onComplete();
      return;
    }

    // Step 1: Dim everything except source
    this.dimNonParticipants([source]);
    source.setDepth(4500);

    // Step 2: Scale source down to 1.0 if enlarged
    const sourceOrigScaleX = source.scaleX;
    const sourceOrigScaleY = source.scaleY;
    const needsScaleDown = sourceOrigScaleX > 1.05 || sourceOrigScaleY > 1.05;

    const doLunge = () => {
      const sourceOrigX = source.x;
      const sourceOrigY = source.y;
      const attackX = sourceOrigX + (slotPos.x - sourceOrigX) * 0.6;
      const attackY = sourceOrigY + (slotPos.y - sourceOrigY) * 0.6;

      // Step 3: Lunge source toward slot
      this.tweens.add({
        targets: source,
        x: attackX,
        y: attackY,
        duration: 250,
        ease: "Power2",
        onComplete: () => {
          // Step 4: Return source
          this.tweens.add({
            targets: source,
            x: sourceOrigX,
            y: sourceOrigY,
            duration: 250,
            ease: "Power2",
            onComplete: () => {
              // Step 5: Restore scale if we changed it
              if (needsScaleDown) {
                this.tweens.add({
                  targets: source,
                  scaleX: sourceOrigScaleX,
                  scaleY: sourceOrigScaleY,
                  duration: 300,
                  ease: "Power2",
                  onComplete: () => {
                    this.undimAll();
                    source.setDepth(910);
                    onComplete();
                  },
                });
              } else {
                this.undimAll();
                source.setDepth(10);
                onComplete();
              }
            },
          });
        },
      });
    };

    if (needsScaleDown) {
      this.tweens.add({
        targets: source,
        scaleX: 1,
        scaleY: 1,
        duration: 300,
        ease: "Power2",
        onComplete: doLunge,
      });
    } else {
      doLunge();
    }
  }

  /**
   * Bug 8: Animate a card flying from its grid position to the fate deck area,
   * used when addFateModifier ability fires.
   */
  private playFlyToFateDeckAnimation(
    sourcePos: { x: number; y: number },
    modifier: number,
    onComplete: () => void,
  ): void {
    // Add the modifier to the player's fate deck
    this.player.fateDeck.push(modifier);
    // Shuffle
    for (let i = this.player.fateDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.player.fateDeck[i], this.player.fateDeck[j]] = [this.player.fateDeck[j], this.player.fateDeck[i]];
    }

    const fateDeckPos = this.getFateDeckWorldPos();
    const fateCardW = 100;
    const fateCardH = 140;

    // Create a fate card visual at the source position
    const fateCard = this.add.container(sourcePos.x, sourcePos.y);
    fateCard.setDepth(920);
    fateCard.setScale(0.8);

    const fateBg = this.add.graphics();
    fateBg.fillStyle(0x1a1a2e, 1);
    fateBg.fillRoundedRect(-fateCardW / 2, -fateCardH / 2, fateCardW, fateCardH, 12);
    fateBg.lineStyle(2, 0x4444aa, 0.8);
    fateBg.strokeRoundedRect(-fateCardW / 2, -fateCardH / 2, fateCardW, fateCardH, 12);
    fateCard.add(fateBg);

    const modLabel = modifier > 0 ? `+${modifier}` : `${modifier}`;
    const modColor = modifier > 0 ? "#44dd88" : modifier < 0 ? "#ff5555" : "#888888";
    const modText = this.add
      .text(0, 0, modLabel, {
        fontSize: "40px",
        fontFamily: FONT_UI,
        color: modColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    fateCard.add(modText);

    // Scale up briefly, then fly to fate deck
    this.tweens.add({
      targets: fateCard,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 300,
      ease: "Back.easeOut",
      onComplete: () => {
        this.time.delayedCall(400, () => {
          this.tweens.add({
            targets: fateCard,
            x: fateDeckPos.x,
            y: fateDeckPos.y,
            scaleX: 0.3,
            scaleY: 0.3,
            duration: 600,
            ease: "Power2",
            onComplete: () => {
              fateCard.destroy();
              onComplete();
            },
          });
        });
      },
    });
  }

  private setupSlotDiscard(): void {
    for (const def of SLOT_DEFS) {
      const container = this.inventoryView.getSlotContainer(def.name);
      if (!container) continue;

      container.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (this.isResolving || this.isDragging) return;
        const item = this.inventory.getItem(def.name);
        if (!item) return;

        const startPos = { x: pointer.x, y: pointer.y };
        let ghost: Phaser.GameObjects.Container | null = null;
        let dragging = false;

        const onMove = (p: Phaser.Input.Pointer) => {
          const dx = p.x - startPos.x;
          const dy = p.y - startPos.y;

          if (!dragging && Math.sqrt(dx * dx + dy * dy) > 24) {
            dragging = true;
            ghost = this.inventoryView.createDragGhost(item);
            ghost.setDepth(6000);
            this.add.existing(ghost);
            this.inventoryView.setSlotContentAlpha(def.name, 0.3);
            // Show initial slot highlights
            for (const slotDef of SLOT_DEFS) {
              const isEmpty = !this.inventory.getItem(slotDef.name);
              const canDrop = (isEmpty && this.inventory.canEquip(slotDef.name, item)) || this.inventory.canSwap(def.name, slotDef.name);
              this.inventoryView.setSlotHighlight(slotDef.name, canDrop ? "valid_dim" : "invalid_dim");
            }
            // Show red drop-target highlights on all monsters if item has dragOnMonster ability
            if (this.collectAbilities("dragOnMonster", item).length > 0) {
              for (let r = 0; r < this.grid.rows; r++) {
                for (let c = 0; c < this.grid.cols; c++) {
                  const gc = this.grid.getCardAt(c, r);
                  if (gc && gc.cardData.type === CardType.Monster) {
                    gc.setDropTargetHighlight(true);
                  }
                }
              }
            }
          }

          if (dragging && ghost) {
            const world = this.toWorldCoords(p);
            ghost.setPosition(world.x, world.y);
            // Update highlights — bright when hovered, dim otherwise
            const hit = this.inventoryView.getSlotAtPoint(world.x, world.y);
            for (const slotDef of SLOT_DEFS) {
              const isEmpty = !this.inventory.getItem(slotDef.name);
              const canDrop = (isEmpty && this.inventory.canEquip(slotDef.name, item)) || this.inventory.canSwap(def.name, slotDef.name);
              if (hit === slotDef.name) {
                this.inventoryView.setSlotHighlight(slotDef.name, canDrop ? "valid" : "invalid");
              } else {
                this.inventoryView.setSlotHighlight(slotDef.name, canDrop ? "valid_dim" : "invalid_dim");
              }
            }

            // Highlight door card if dragging a key from inventory
            if (item.isKey) {
              const doorCard = this.findDoorOnGrid();
              if (doorCard) {
                const ddx = world.x - doorCard.x;
                const ddy = world.y - doorCard.y;
                if (Math.abs(ddx) < CARD_W / 2 && Math.abs(ddy) < CARD_H / 2) {
                  doorCard.setHighlight(true);
                } else {
                  doorCard.setHighlight(false);
                }
              }
            }

            // Highlight portrait if item has dragOnPlayerPortrait ability
            if (this.collectAbilities("dragOnPlayerPortrait", item).length > 0) {
              if (this.playerView.isPointOver(world.x, world.y)) {
                this.playerView.showDropHighlight(stripMarkup(item.description));
              } else {
                this.playerView.hideDropHighlight();
              }
            }

            // Highlight trap cards if item has dragOnTrap ability
            if (this.collectAbilities("dragOnTrap", item).length > 0) {
              const trapTarget = this.findTrapAtPoint(world.x, world.y);
              for (let r = 0; r < this.grid.rows; r++) {
                for (let c = 0; c < this.grid.cols; c++) {
                  const gc = this.grid.getCardAt(c, r);
                  if (gc && gc.cardData.type === CardType.Trap) {
                    gc.setHighlight(gc === trapTarget);
                  }
                }
              }
            }

            // Highlight monster cards if item has dragOnMonster ability
            if (this.collectAbilities("dragOnMonster", item).length > 0) {
              const monsterTarget = this.findMonsterAtPoint(world.x, world.y);
              for (let r = 0; r < this.grid.rows; r++) {
                for (let c = 0; c < this.grid.cols; c++) {
                  const gc = this.grid.getCardAt(c, r);
                  if (gc && gc.cardData.type === CardType.Monster) {
                    gc.setHighlight(gc === monsterTarget);
                  }
                }
              }
            }

            // Highlight chest cards if item has dragOnChest ability
            if (this.collectAbilities("dragOnChest", item).length > 0) {
              const chestTarget = this.findChestAtPoint(world.x, world.y);
              for (let r = 0; r < this.grid.rows; r++) {
                for (let c = 0; c < this.grid.cols; c++) {
                  const gc = this.grid.getCardAt(c, r);
                  if (gc && gc.cardData.type === CardType.Chest) {
                    gc.setHighlight(gc === chestTarget);
                  }
                }
              }
            }

            // Highlight weapon slots if item has dragOnWeapon ability
            if (this.collectAbilities("dragOnWeapon", item).length > 0) {
              const weaponSlot = this.findWeaponSlotAtPoint(world.x, world.y);
              for (const slotDef of SLOT_DEFS) {
                if (slotDef.accepted.includes("weapon") && this.inventory.getItem(slotDef.name)) {
                  this.inventoryView.setSlotHighlight(
                    slotDef.name,
                    slotDef.name === weaponSlot ? "valid" : "valid_dim"
                  );
                }
              }
            }

            // Highlight equipped slots with matching tag if item has dragOnTag ability
            const invDragOnTagAbilities = this.collectAbilities("dragOnTag", item);
            if (invDragOnTagAbilities.length > 0) {
              for (const ab of invDragOnTagAbilities) {
                const requiredTag = ab.params.tag as string;
                const tagSlot = this.findTagSlotAtPoint(world.x, world.y, requiredTag);
                for (const slotDef of SLOT_DEFS) {
                  if (!slotDef.name.startsWith("backpack") && slotDef.name !== def.name) {
                    const slotItem = this.inventory.getItem(slotDef.name);
                    if (slotItem?.tag === requiredTag) {
                      this.inventoryView.setSlotHighlight(
                        slotDef.name,
                        slotDef.name === tagSlot ? "valid" : "valid_dim"
                      );
                    }
                  }
                }
              }
            }
          }
        };
        const onUp = (p: Phaser.Input.Pointer) => {
          this.input.off("pointermove", onMove);
          this.input.off("pointerup", onUp);
          if (!dragging || !ghost) return;

          const world = this.toWorldCoords(p);

          // Check if key dropped on door from inventory
          if (item.isKey) {
            const doorCard = this.findDoorOnGrid();
            if (doorCard) {
              const ddx = world.x - doorCard.x;
              const ddy = world.y - doorCard.y;
              if (Math.abs(ddx) < CARD_W / 2 && Math.abs(ddy) < CARD_H / 2) {
                doorCard.setHighlight(false);
                this.inventoryView.clearAllHighlights();
                this.inventory.unequip(def.name);
                ghost.destroy();
                this.openDoor(doorCard);
                return;
              }
              doorCard.setHighlight(false);
            }
          }

          // Clear grid card highlights
          this.clearGridHighlights();

          // Check if item with dragOnPlayerPortrait dropped on portrait
          const invPortraitAbilities = this.collectAbilities("dragOnPlayerPortrait", item);
          if (invPortraitAbilities.length > 0 && this.playerView.isPointOver(world.x, world.y)) {
            this.playerView.hideDropHighlight();
            this.inventoryView.clearAllHighlights();
            const scrollId = item.tag === "scroll" ? item.id : null;
            this.inventory.unequip(def.name);
            ghost.destroy();
            // Fire portrait abilities
            const hasAsyncAbility = invPortraitAbilities.some(ab => getAbility(ab.abilityId).effect === "removeDarkEvent");
            if (hasAsyncAbility) {
              this.sfx.play(SOUND_KEYS.holySpell04);
              this.playRemoveMisfortuneAnimation(() => {});
            } else {
              this.fireAbilities(invPortraitAbilities, () => {});
            }
            // Recycle scroll if Wizard's Hat equipped
            if (scrollId && this.hasScrollRecycle()) {
              this.deck.mergeCards([getCard(scrollId)]);
              this.updateDeckVisual();
            }
            return;
          }
          this.playerView.hideDropHighlight();

          // Check if item with dragOnTrap dropped on a trap
          const invTrapAbilities = this.collectAbilities("dragOnTrap", item);
          if (invTrapAbilities.length > 0) {
            const trapTarget = this.findTrapAtPoint(world.x, world.y);
            if (trapTarget) {
              this.inventoryView.clearAllHighlights();
              this.inventory.unequip(def.name);
              ghost.destroy();
              this.fireAbilities(invTrapAbilities, () => {});
              const trapCell = this.grid.findCard(trapTarget);
              if (trapCell) this.grid.removeCard(trapCell.col, trapCell.row);
              this.updateExploreButtonState();
              trapTarget.resolve(() => {});
              return;
            }
          }

          // Check if item with dragOnMonster dropped on a monster
          const invMonsterAbilities = this.collectAbilities("dragOnMonster", item);
          if (invMonsterAbilities.length > 0) {
            const monsterTarget = this.findMonsterAtPoint(world.x, world.y);
            if (monsterTarget) {
              this.inventoryView.clearAllHighlights();
              this.inventory.unequip(def.name);
              ghost.destroy();
              this.dragTargetMonster = monsterTarget;
              this.lastUsedScrollId = item.tag === "scroll" ? item.id : null;
              this.fireDragOnMonsterAbilities(invMonsterAbilities, monsterTarget, () => {
                this.dragTargetMonster = null;
                // Recycle scroll if Wizard's Hat equipped
                if (this.lastUsedScrollId && this.hasScrollRecycle()) {
                  this.deck.mergeCards([getCard(this.lastUsedScrollId)]);
                  this.updateDeckVisual();
                }
                this.lastUsedScrollId = null;
              });
              return;
            }
          }

          // Check if item with dragOnWeapon dropped on an equipped weapon
          const invWeaponAbilities = this.collectAbilities("dragOnWeapon", item);
          if (invWeaponAbilities.length > 0) {
            const weaponSlot = this.findWeaponSlotAtPoint(world.x, world.y);
            if (weaponSlot) {
              this.inventoryView.clearAllHighlights();
              this.inventory.unequip(def.name);
              ghost.destroy();
              this.updatePlayerStats();
              this.fireAbilities(invWeaponAbilities, () => {});
              return;
            }
          }

          // Check if item with dragOnTag dropped on an equipped item with matching tag
          const invTagAbilities = this.collectAbilities("dragOnTag", item);
          if (invTagAbilities.length > 0) {
            for (const ab of invTagAbilities) {
              const requiredTag = ab.params.tag as string;
              const tagSlot = this.findTagSlotAtPoint(world.x, world.y, requiredTag);
              if (tagSlot) {
                this.inventoryView.clearAllHighlights();
                this.inventory.unequip(def.name);
                ghost.destroy();
                // Apply poison directly to the target weapon
                const aDef = getAbility(ab.abilityId);
                if (aDef.effect === "poisonWeapon") {
                  this.applyPoisonToWeapon(tagSlot, ab.params.amount as number);
                }
                const slotOrigin = this.inventoryView.getSlotWorldPos(tagSlot);
                this.fireAbilities([ab], () => {}, slotOrigin ?? undefined);
                return;
              }
            }
          }

          // Check if item with dragOnChest dropped on a chest
          const invChestAbilities = this.collectAbilities("dragOnChest", item);
          if (invChestAbilities.length > 0) {
            const chestTarget = this.findChestAtPoint(world.x, world.y);
            if (chestTarget) {
              this.inventoryView.clearAllHighlights();
              this.inventory.unequip(def.name);
              ghost.destroy();
              // Auto-open the chest: reveal loot without agility check
              this.sfx.play(SOUND_KEYS.chestOpen);
              const chestCell = this.grid.findCard(chestTarget);
              const lootInfo = this.chestLoot.get(chestTarget);
              if (chestCell && lootInfo) {
                this.grid.removeCard(chestCell.col, chestCell.row);
                chestTarget.resolve(() => {});
                // Reveal the loot card
                lootInfo.cardBack.destroy();
                const lootCard = new Card(this, lootInfo.cardBack.x, lootInfo.cardBack.y + TREASURE_OFFSET_Y, lootInfo.lootData);
                this.grid.placeCard(chestCell.col, chestCell.row, lootCard);
                lootCard.reveal();
                this.setupCardInteraction(lootCard);
                this.chestLoot.delete(chestTarget);
              } else if (chestCell) {
                this.grid.removeCard(chestCell.col, chestCell.row);
                chestTarget.resolve(() => {});
              }
              return;
            }
          }

          const overSlot = this.inventoryView.getSlotAtPoint(world.x, world.y);

          this.inventoryView.clearAllHighlights();

          if (overSlot === def.name) {
            // Dropped back on same slot — cancel
            ghost.destroy();
            this.inventoryView.setSlotContentAlpha(def.name, 1);
          } else if (overSlot && this.inventory.canEquip(overSlot, item) && !this.inventory.getItem(overSlot)) {
            // Dropped on a compatible empty slot — move item
            ghost.destroy();
            this.inventoryView.setSlotContentAlpha(def.name, 1);
            const displaced = this.inventory.unequip(def.name);
            this.inventory.equip(overSlot, item);
            // Fire onEquip for the moved item in its new slot (skip for backpack slots)
            const equipAbilities = overSlot.startsWith("backpack") ? [] : this.collectAbilities("onEquip", item);
            const slotOrigin = this.inventoryView.getSlotWorldPos(overSlot);
            this.fireAbilities(equipAbilities, () => {}, slotOrigin ?? undefined);
          } else if (overSlot && this.inventory.canSwap(def.name, overSlot)) {
            // Before swapping, check if either item has a dragOnTag ability matching the other's tag
            const otherItem = this.inventory.getItem(overSlot)!;
            // Check if dragged item targets the other item's tag (skip if target is in backpack)
            if (otherItem.tag && !overSlot.startsWith("backpack")) {
              const draggedTagAbilities = this.collectAbilities("dragOnTag", item);
              const matchingAb = draggedTagAbilities.find(ab => ab.params.tag === otherItem.tag);
              if (matchingAb) {
                ghost.destroy();
                this.inventoryView.setSlotContentAlpha(def.name, 1);
                this.inventory.unequip(def.name);
                // Apply poison directly to the target weapon
                const mDef = getAbility(matchingAb.abilityId);
                if (mDef.effect === "poisonWeapon") {
                  this.applyPoisonToWeapon(overSlot, matchingAb.params.amount as number);
                }
                // Move target item to the freed source slot if compatible
                if (this.inventory.canEquip(def.name, otherItem)) {
                  this.inventory.unequip(overSlot);
                  this.inventory.equip(def.name, otherItem);
                }
                const slotOrigin = this.inventoryView.getSlotWorldPos(def.name);
                this.fireAbilities([matchingAb], () => {}, slotOrigin ?? undefined);
                return;
              }
            }
            // Check if other item targets the dragged item's tag (skip if target is in backpack)
            if (item.tag && !def.name.startsWith("backpack")) {
              const otherTagAbilities = this.collectAbilities("dragOnTag", otherItem);
              const matchingAb = otherTagAbilities.find(ab => ab.params.tag === item.tag);
              if (matchingAb) {
                ghost.destroy();
                this.inventoryView.setSlotContentAlpha(def.name, 1);
                // Apply poison directly to the target weapon
                const mDef = getAbility(matchingAb.abilityId);
                if (mDef.effect === "poisonWeapon") {
                  this.applyPoisonToWeapon(def.name, matchingAb.params.amount as number);
                }
                this.inventory.unequip(overSlot);
                const slotOrigin = this.inventoryView.getSlotWorldPos(def.name);
                this.fireAbilities([matchingAb], () => {}, slotOrigin ?? undefined);
                return;
              }
            }
            // Dropped on an occupied compatible slot — swap items
            ghost.destroy();
            this.inventoryView.setSlotContentAlpha(def.name, 1);
            this.inventory.swap(def.name, overSlot);
            // Fire onEquip for items landing in non-backpack (hand) slots
            const draggedEquipAbilities = overSlot.startsWith("backpack") ? [] : this.collectAbilities("onEquip", item);
            const otherEquipAbilities = def.name.startsWith("backpack") ? [] : this.collectAbilities("onEquip", otherItem);
            const allEquipAbilities = [...draggedEquipAbilities, ...otherEquipAbilities];
            if (allEquipAbilities.length > 0) {
              const slotOrigin = this.inventoryView.getSlotWorldPos(overSlot);
              this.fireAbilities(allEquipAbilities, () => {}, slotOrigin ?? undefined);
            }
          } else if (item.isKey || overSlot || this.findGridCardAtPoint(world.x, world.y) || this.playerView.isPointOver(world.x, world.y)) {
            // Snap back: key cards, incompatible slot, grid card, or portrait
            ghost.destroy();
            this.inventoryView.setSlotContentAlpha(def.name, 1);
          } else {
            // Dropped on empty space — discard
            this.discardedCardIds.add(item.id);
            const discardAbilities = this.collectAbilities("onDiscard", item);
            const discardSlotPos = this.inventoryView.getSlotWorldPos(def.name);
            this.fireAbilities(discardAbilities, () => {}, discardSlotPos ?? undefined);
            // Recycle scroll if Wizard's Hat equipped
            if (item.tag === "scroll" && discardAbilities.length > 0 && this.hasScrollRecycle()) {
              this.deck.mergeCards([getCard(item.id)]);
              this.updateDeckVisual();
            }
            this.inventory.unequip(def.name);
            ghost.destroy();
            this.inventoryView.playDissolveAt(this, world.x, world.y, item);
          }
        };
        this.input.on("pointermove", onMove);
        this.input.on("pointerup", onUp);
      });
    }
  }

  private resolveCard(card: Card): void {
    const cell = this.grid.findCard(card);
    if (!cell) return;

    // Potions are drag-only, not clickable
    if (card.cardData.type === CardType.Potion) return;

    // Cards with only onDiscard abilities shouldn't resolve on click
    if (card.cardData.abilities?.length) {
      const hasOnlyDiscardAbilities = card.cardData.abilities.every(
        a => getAbility(a.abilityId).trigger === "onDiscard"
      );
      if (hasOnlyDiscardAbilities) return;
    }

    if (card.cardData.type === CardType.Monster) {
      this.hideTutorialCursor();
      if (this.tutorialText) {
        this.tutorialText.destroy();
        this.tutorialText = null;
      }
      this.enterCombatMode(card);
      return;
    }

    if (card.cardData.type === CardType.Chest) {
      this.enterChestMode(card);
      return;
    }

    if (card.cardData.type === CardType.Trap) {
      this.enterTrapMode(card);
      return;
    }

    if (card.cardData.type === CardType.Door) {
      // Shake the door card as a hint that a key is needed
      this.tweens.add({
        targets: card,
        x: card.x + 6,
        duration: 50,
        yoyo: true,
        repeat: 2,
      });
      return;
    }

    if (card.cardData.exchangePrice) {
      this.enterExchangerMode(card);
      return;
    }
  }

  private executeOnResolveAbilities(
    card: Card,
    abilities: CardAbility[],
    onComplete: () => void,
  ): void {
    if (abilities.length === 0) {
      onComplete();
      return;
    }

    const [current, ...rest] = abilities;
    const def = getAbility(current.abilityId);

    switch (def.effect) {
      case "shuffleIntoDeck": {
        const cardId = current.params.cardId as string;
        const count = current.params.count as number;
        this.playSummonToDeckAnimation(card, cardId, count, () => {
          this.executeOnResolveAbilities(card, rest, onComplete);
        });
        break;
      }
      case "damagePlayer": {
        const amount = current.params.amount as number;
        const next = () => this.executeOnResolveAbilities(card, rest, onComplete);
        if (current.params.ignoresArmor) {
          this.player.takeDamage(amount);
          this.tweens.add({
            targets: this.playerView,
            alpha: 0.3,
            duration: 80,
            yoyo: true,
            repeat: 2,
            onComplete: () => next(),
          });
        } else {
          this.applyDamageWithArmour(amount, next);
        }
        break;
      }
      case "removeDarkEvent": {
        this.sfx.play(SOUND_KEYS.holySpell04);
        // Remove first card with tag "misfortune" from deck
        this.deck.removeFirstByTag("misfortune");
        this.executeOnResolveAbilities(card, rest, onComplete);
        break;
      }
      case "removeFromDeck": {
        const cardId = current.params.cardId as string;
        this.playRemoveFromDeckAnimation(cardId, () => {
          this.executeOnResolveAbilities(card, rest, onComplete);
        });
        break;
      }
      case "addFateModifier": {
        this.sfx.play(SOUND_KEYS.holySpell06);
        const modifier = current.params.modifier as number;
        this.playFlyToFateDeckAnimation({ x: card.x, y: card.y }, modifier, () => {
          this.executeOnResolveAbilities(card, rest, onComplete);
        });
        break;
      }
      case "buffMonsterType": {
        const monsterId = current.params.monsterId as string;
        const amount = current.params.amount as number;
        // Buff monsters on grid
        for (let r = 0; r < this.grid.rows; r++) {
          for (let c = 0; c < this.grid.cols; c++) {
            const gc = this.grid.getCardAt(c, r);
            if (gc && gc.cardData.id === monsterId) {
              gc.updateValue(gc.cardData.value + amount);
            }
          }
        }
        // Buff monsters in deck
        this.deck.buffCardById(monsterId, amount);
        this.executeOnResolveAbilities(card, rest, onComplete);
        break;
      }
      default:
        this.executeOnResolveAbilities(card, rest, onComplete);
        break;
    }
  }

  private executeOnTrapTriggeredAbilities(
    trapCard: Card,
    abilities: CardAbility[],
    onComplete: () => void,
  ): void {
    if (abilities.length === 0) {
      onComplete();
      return;
    }

    const [current, ...rest] = abilities;
    const def = getAbility(current.abilityId);

    switch (def.effect) {
      case "shuffleIntoDeck": {
        const cardId = current.params.cardId as string;
        const count = current.params.count as number;
        this.playSummonToDeckAnimation(trapCard, cardId, count, () => {
          this.executeOnTrapTriggeredAbilities(trapCard, rest, onComplete);
        });
        break;
      }
      case "removeFromDeck": {
        const cardId = current.params.cardId as string;
        this.playRemoveFromDeckAnimation(cardId, () => {
          this.executeOnTrapTriggeredAbilities(trapCard, rest, onComplete);
        });
        break;
      }
      case "addFateModifier": {
        this.sfx.play(SOUND_KEYS.holySpell06);
        const modifier = current.params.modifier as number;
        this.playFlyToFateDeckAnimation({ x: trapCard.x, y: trapCard.y }, modifier, () => {
          this.executeOnTrapTriggeredAbilities(trapCard, rest, onComplete);
        });
        break;
      }
      default:
        this.executeOnTrapTriggeredAbilities(trapCard, rest, onComplete);
        break;
    }
  }

  private enterCombatMode(card: Card): void {
    this.isResolving = true;
    this.combatMonster = card;

    // Dim other grid cards
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard && gridCard !== card) {
          gridCard.setAlpha(0.3);
          // Also dim guarded loot on non-combat monsters
          if (gridCard.guardedLoot) {
            gridCard.guardedLoot.setAlpha(0.3);
            gridCard.guardedLoot.disableInteractive();
          }
          const chestLootInfo = this.chestLoot.get(gridCard);
          if (chestLootInfo) chestLootInfo.cardBack.setAlpha(0.3);
        }
      }
    }

    // Dim the combat monster's own guarded loot
    if (card.guardedLoot) {
      card.guardedLoot.setAlpha(0.3);
      card.guardedLoot.setDepth(3);
      card.guardedLoot.disableInteractive();
    }

    // Dim grid background, deck visual, HUD, explore button, level indicator
    this.gridBgGraphics.forEach(img => img.setAlpha(0.3));
    this.deckVisual.forEach(img => img.setAlpha(0.3));
    this.deckText.setAlpha(0.3);
    this.goldText.setAlpha(0.3);
    this.exploreBtn.setAlpha(0.3);
    this.levelIndicator.setAlpha(0.3);
    this.levelFlavorText.setAlpha(0.3);

    // Bring monster to top
    card.setDepth(4500);

    // Create clickable overlay behind fight button (to cancel combat)
    this.combatOverlay = this.add.rectangle(
      GAME_W / 2,
      GAME_H / 2,
      GAME_W,
      GAME_H,
      0x000000,
      0.01
    );
    this.combatOverlay.setDepth(4000);
    this.combatOverlay.setInteractive();
    this.combatOverlay.on("pointerdown", () => this.exitCombatMode());

    // Create FIGHT button below the monster card
    const btnW = 160;
    const btnH = 60;
    this.fightBtn = this.add.container(card.x, card.y + CARD_H / 2 + 48);
    this.fightBtn.setDepth(5000);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xcc3333, 1);
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    btnBg.lineStyle(4, 0xff5555, 0.8);
    btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    this.fightBtn.add(btnBg);

    const btnText = this.add
      .text(0, 0, "FIGHT", {
        fontSize: "32px",
        fontFamily: FONT_UI,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.fightBtn.add(btnText);

    this.fightBtn.setSize(btnW, btnH);
    this.fightBtn.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, btnW, btnH),
      Phaser.Geom.Rectangle.Contains
    );

    this.fightBtn.on("pointerover", () => {
      btnBg.clear();
      btnBg.fillStyle(0xee4444, 1);
      btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      btnBg.lineStyle(4, 0xff5555, 0.8);
      btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    });

    this.fightBtn.on("pointerout", () => {
      btnBg.clear();
      btnBg.fillStyle(0xcc3333, 1);
      btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      btnBg.lineStyle(4, 0xff5555, 0.8);
      btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    });

    this.fightBtn.on("pointerdown", () => {
      this.hideTutorialCursor();
      if (this.currentLevel.isTutorial && this.currentLevelIndex === 0) {
        this.tutorialCombatSequence(card);
      } else {
        this.executeCombat(card);
      }
    });

    // Slide fate deck up
    this.peekFateCard();

    // Tutorial: show pointer on fight button
    if (this.currentLevel.isTutorial && this.currentLevelIndex === 0) {
      this.time.delayedCall(300, () => {
        this.showTutorialPointerTo(card.x, card.y + CARD_H / 2 + 48);
      });
    }
  }

  private exitCombatMode(): void {
    // Remove overlay and fight button
    if (this.combatOverlay) {
      this.combatOverlay.destroy();
      this.combatOverlay = null;
    }
    if (this.fightBtn) {
      this.fightBtn.destroy();
      this.fightBtn = null;
    }

    // Restore all grid card alphas, guarded loot, and chest loot
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard) {
          gridCard.setAlpha(1);
          if (gridCard.guardedLoot) {
            gridCard.guardedLoot.setAlpha(1);
            gridCard.guardedLoot.setDepth(5);
            gridCard.guardedLoot.setInteractive();
          }
          const chestLootInfo = this.chestLoot.get(gridCard);
          if (chestLootInfo) chestLootInfo.cardBack.setAlpha(1);
        }
      }
    }

    // Restore HUD alphas
    this.gridBgGraphics.forEach(img => img.setAlpha(1));
    this.deckVisual.forEach(img => img.setAlpha(1));
    this.deckText.setAlpha(1);
    this.goldText.setAlpha(1);
    this.exploreBtn.setAlpha(1);
    this.levelIndicator.setAlpha(1);
    this.levelFlavorText.setAlpha(1);

    // Reset monster depth
    if (this.combatMonster) {
      this.combatMonster.setDepth(10);
      if (this.combatMonster.guardedLoot) {
        this.combatMonster.guardedLoot.setAlpha(1);
        this.combatMonster.guardedLoot.setDepth(5);
        this.combatMonster.guardedLoot.setInteractive();
      }
    }

    // Slide fate deck down
    this.animateFateCardResolve();

    this.isResolving = false;
    this.combatMonster = null;
  }

  private executeCombat(monsterCard: Card): void {
    // Disable fight button and overlay clicks during combat
    if (this.fightBtn) {
      this.fightBtn.disableInteractive();
      this.fightBtn.setDepth(500);
    }
    if (this.combatOverlay) this.combatOverlay.disableInteractive();

    this.animateFateCardDraw((modifier) => {
      this.resolveCombatHit(monsterCard, modifier);
    });
  }

  private resolveCombatHit(monsterCard: Card, modifier: number): void {
    const modifiedPower = Math.max(0, this.player.power + this.inventory.powerBonus + modifier + this.getPassivePowerModifier());
    this.playerView.showTempPower(modifiedPower);

    this.time.delayedCall(100, () => {
      const origX = this.playerView.x;
      const origY = this.playerView.y;
      const attackX = origX + (monsterCard.x - origX) * 0.6;
      const attackY = origY + (monsterCard.y - origY) * 0.6;

      this.tweens.add({
        targets: this.playerView,
        x: attackX,
        y: attackY,
        duration: 250,
        ease: "Power2",
        onComplete: () => {
          this.sfx.playRandom(SOUND_GROUPS.swordAttack);
          const newMonsterValue = Math.max(0, monsterCard.cardData.value - modifiedPower);
          monsterCard.updateValue(newMonsterValue);

          this.tweens.add({
            targets: monsterCard,
            x: monsterCard.x + 10,
            duration: 50,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
              this.tweens.add({
                targets: this.playerView,
                x: origX,
                y: origY,
                duration: 250,
                ease: "Power2",
                onComplete: () => {
                  if (newMonsterValue > 0) {
                    this.monsterCounterattack(monsterCard, modifier);
                  } else {
                    this.combatCleanup(monsterCard, modifier);
                  }
                },
              });
            },
          });
        },
      });
    });
  }

  private monsterCounterattack(
    monsterCard: Card,
    fateModifier: number
  ): void {
    // Tutorial: show narrative before counterattack
    if (this.currentLevel.isTutorial && this.currentLevelIndex === 0) {
      this.showTutorialNarrative([
        { text: "But that was still not enough.\nNow the Zombie strikes back!", autoDelay: 5000 },
      ], () => {
        this.doMonsterCounterattack(monsterCard, fateModifier);
      });
      return;
    }
    this.doMonsterCounterattack(monsterCard, fateModifier);
  }

  private doMonsterCounterattack(
    monsterCard: Card,
    fateModifier: number
  ): void {
    // Fire onCounterAttack abilities from equipped items before damage
    const counterAbilities = this.collectEquippedAbilities("onCounterAttack");
    this.fireAbilities(counterAbilities, () => {
      // Calculate bonus counter damage from monster's own abilities
      let bonusDamage = 0;
      const monsterCounterAbilities = this.collectAbilities("onCounterAttack", monsterCard.cardData);
      for (const ab of monsterCounterAbilities) {
        const def = getAbility(ab.abilityId);
        if (def.effect === "bonusCounterDamage") {
          bonusDamage += ab.params.amount as number;
        }
      }
      const damage = monsterCard.cardData.value + this.getMonsterPowerBuff() + bonusDamage;
      this.playDamagePlayerEffect(monsterCard, damage, () => {
        this.combatCleanup(monsterCard, fateModifier);
      });
    });
  }

  private applyDamageWithArmour(amount: number, onComplete: () => void): void {
    const armourPriority = ["weapon1", "weapon2", "head", "armour"];

    // Collect armour items in priority order
    const armourItems: { slotName: string; ability: { abilityId: string; params: Record<string, number | string> }; item: CardData }[] = [];
    for (const slotName of armourPriority) {
      const item = this.inventory.getItem(slotName);
      if (!item) continue;
      const ability = item.abilities?.find(a => a.abilityId === "armour");
      if (ability) {
        armourItems.push({ slotName, ability, item });
      }
    }

    // If no armour, go straight to HP damage
    if (armourItems.length === 0 || amount <= 0) {
      if (amount > 0) {
        this.player.takeDamage(amount);
        this.tweens.add({
          targets: this.playerView,
          alpha: 0.3,
          duration: 80,
          yoyo: true,
          repeat: 2,
          onComplete: () => onComplete(),
        });
      } else {
        onComplete();
      }
      return;
    }

    let remainingDamage = amount;
    let index = 0;

    const processNext = () => {
      if (index >= armourItems.length || remainingDamage <= 0) {
        // All armour processed, apply remaining damage to HP
        if (remainingDamage > 0) {
          this.player.takeDamage(remainingDamage);
          this.tweens.add({
            targets: this.playerView,
            alpha: 0.3,
            duration: 80,
            yoyo: true,
            repeat: 2,
            onComplete: () => onComplete(),
          });
        } else {
          onComplete();
        }
        return;
      }

      const { slotName, ability, item } = armourItems[index];
      index++;

      const armourValue = ability.params.amount as number;
      const absorbed = Math.min(armourValue, remainingDamage);
      const newArmour = armourValue - remainingDamage;
      remainingDamage = Math.max(0, remainingDamage - armourValue);

      const slotPos = this.inventoryView.getSlotWorldPos(slotName);
      if (!slotPos) {
        processNext();
        return;
      }

      // Floating absorbed damage text
      const floatText = this.add.text(slotPos.x, slotPos.y, `-${absorbed}`, {
        fontSize: "28px",
        fontFamily: FONT_UI,
        color: "#ff4444",
        fontStyle: "bold",
      }).setOrigin(0.5).setDepth(9000);

      this.tweens.add({
        targets: floatText,
        y: slotPos.y - 60,
        alpha: 0,
        duration: 600,
        ease: "Power2",
        onComplete: () => floatText.destroy(),
      });

      // Red flash on slot
      const slotContainer = this.inventoryView.getSlotContainer(slotName);
      if (slotContainer) {
        const flashRect = this.add.graphics();
        flashRect.fillStyle(0xff0000, 0.4);
        flashRect.fillRoundedRect(-78, -93, 157, 186, 12);
        slotContainer.add(flashRect);

        this.tweens.add({
          targets: flashRect,
          alpha: 0,
          duration: 80,
          yoyo: true,
          repeat: 2,
          onComplete: () => {
            flashRect.destroy();

            if (newArmour <= 0) {
              // Item destroyed
              this.inventory.unequip(slotName);
              this.inventoryView.playDissolveAt(this, slotPos.x, slotPos.y, item);
              this.time.delayedCall(200, () => processNext());
            } else {
              // Item survives - update armour value
              ability.params.amount = newArmour;
              this.inventoryView.refreshSlot(slotName);
              processNext();
            }
          },
        });
      } else {
        if (newArmour <= 0) {
          this.inventory.unequip(slotName);
          this.time.delayedCall(200, () => processNext());
        } else {
          ability.params.amount = newArmour;
          this.inventoryView.refreshSlot(slotName);
          processNext();
        }
      }
    };

    processNext();
  }

  /** Handle onMonsterDeath abilities: equipped abilities, self-reshuffle, conditional return, key shuffle. */
  private handleMonsterDeathAbilities(monsterCard: Card): void {
    // Fire onMonsterDeath abilities from equipped items (e.g. vampiric heal)
    const equipDeathAbilities = this.collectEquippedAbilities("onMonsterDeath");
    this.fireAbilities(equipDeathAbilities, () => {});

    const deathAbilities = this.collectAbilities("onMonsterDeath", monsterCard.cardData);
    const hasSelfReshuffle = deathAbilities.some(a => getAbility(a.abilityId).effect === "shuffleSelfIntoDeck");

    if (hasSelfReshuffle) {
      const freshCopy = getCard(monsterCard.cardData.id);
      this.applyLevelScaling(freshCopy);
      this.deck.mergeCards([freshCopy]);
      this.updateDeckVisual();
      this.updateHUD();
    }

    const conditionalReturn = deathAbilities.filter(a => getAbility(a.abilityId).effect === "returnSelfConditional");
    for (const ab of conditionalReturn) {
      const requiredDiscardId = ab.params.requiredDiscardId as string;
      const conditionMet = this.discardedCardIds.has(requiredDiscardId);
      if (!conditionMet) {
        const freshCopy = getCard(monsterCard.cardData.id);
        if (monsterCard.cardData.isBoss) freshCopy.isBoss = true;
        const returnTag = ab.params.returnTag as string | undefined;
        if (returnTag) freshCopy.tag = returnTag;
        this.applyLevelScaling(freshCopy);
        this.deck.mergeCards([freshCopy]);
        this.updateDeckVisual();
        this.updateHUD();
      } else if (monsterCard.cardData.isBoss && this.currentLevelKey) {
        const keyId = this.currentLevelKey.id;
        this.currentLevelKey = null;
        this.playSummonToDeckAnimation({ x: monsterCard.x, y: monsterCard.y }, keyId, 1, () => {});
      }
    }
  }

  private combatCleanup(monsterCard: Card, fateModifier: number): void {
    // Remove overlay and fight button
    if (this.combatOverlay) {
      this.combatOverlay.destroy();
      this.combatOverlay = null;
    }
    if (this.fightBtn) {
      this.fightBtn.destroy();
      this.fightBtn = null;
    }

    this.updatePlayerStats();

    this.killMonster(monsterCard, () => {
      // Shuffle fate card back
      this.player.shuffleFateCardBack(fateModifier);

      // Restore alphas for all grid cards, guarded loot, and chest loot
      for (let r = 0; r < this.grid.rows; r++) {
        for (let c = 0; c < this.grid.cols; c++) {
          const gridCard = this.grid.getCardAt(c, r);
          if (gridCard) {
            gridCard.setAlpha(1);
            if (gridCard.guardedLoot) {
              gridCard.guardedLoot.setAlpha(1);
              gridCard.guardedLoot.setDepth(5);
              gridCard.guardedLoot.setInteractive();
            }
            const chestLootInfo = this.chestLoot.get(gridCard);
            if (chestLootInfo) chestLootInfo.cardBack.setAlpha(1);
          }
        }
      }
      this.gridBgGraphics.forEach(img => img.setAlpha(1));
      this.deckVisual.forEach(img => img.setAlpha(1));
      this.deckText.setAlpha(1);
      this.goldText.setAlpha(1);
      this.exploreBtn.setAlpha(1);
      this.levelIndicator.setAlpha(1);
      this.levelFlavorText.setAlpha(1);

      // Slide fate deck down and restore power display
      this.animateFateCardResolve();
      this.playerView.restorePower(this.player, this.inventory.powerBonus, this.getPassiveAgilityModifier() + this.inventory.agilityBonus, this.getPassivePowerModifier());

      this.revertPoison();
      this.isResolving = false;
      this.combatMonster = null;

      // Check game over
      if (this.player.hp <= 0) {
        this.showGameOver();
        return;
      }

      // Tutorial: hint to open the door
      if (this.currentLevel.isTutorial && this.currentLevelIndex === 0) {
        this.time.delayedCall(600, () => {
          // Start drag cursor immediately alongside the text
          const keyCard = this.grid.getOccupiedCards().find(c => c.cardData.isKey);
          const doorCard = this.grid.getOccupiedCards().find(c => c.cardData.type === CardType.Door);
          if (keyCard && doorCard) {
            this.showTutorialDragCursor(keyCard.x, keyCard.y, doorCard.x, doorCard.y);
          }
          this.showTutorialNarrative([
            { text: "Good. Now open the gates with the key.", persistent: true },
          ]);
        });
      }
    });
  }

  private enterChestMode(card: Card): void {
    this.isResolving = true;
    this.crackingChest = card;

    // Dim other grid cards
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard && gridCard !== card) {
          gridCard.setAlpha(0.3);
          if (gridCard.guardedLoot) {
            gridCard.guardedLoot.setAlpha(0.3);
            gridCard.guardedLoot.disableInteractive();
          }
          const chestLootInfo = this.chestLoot.get(gridCard);
          if (chestLootInfo) chestLootInfo.cardBack.setAlpha(0.3);
        }
      }
    }

    // Dim the chest's own loot card back
    const ownLoot = this.chestLoot.get(card);
    if (ownLoot) ownLoot.cardBack.setAlpha(0.3);

    // Dim grid background, deck visual, HUD, explore button, level indicator
    this.gridBgGraphics.forEach(img => img.setAlpha(0.3));
    this.deckVisual.forEach(img => img.setAlpha(0.3));
    this.deckText.setAlpha(0.3);
    this.goldText.setAlpha(0.3);
    this.exploreBtn.setAlpha(0.3);
    this.levelIndicator.setAlpha(0.3);
    this.levelFlavorText.setAlpha(0.3);

    // Bring chest to top
    card.setDepth(4500);

    // Create clickable overlay behind crack button (to cancel)
    this.chestOverlay = this.add.rectangle(
      GAME_W / 2,
      GAME_H / 2,
      GAME_W,
      GAME_H,
      0x000000,
      0.01
    );
    this.chestOverlay.setDepth(4000);
    this.chestOverlay.setInteractive();
    this.chestOverlay.on("pointerdown", () => this.exitChestMode());

    // Create CRACK button below chest
    const btnW = 160;
    const btnH = 60;
    this.crackBtn = this.add.container(card.x, card.y + CARD_H / 2 + 48);
    this.crackBtn.setDepth(5000);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x88664d, 1);
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    btnBg.lineStyle(4, 0xaa8866, 0.8);
    btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    this.crackBtn.add(btnBg);

    const btnText = this.add
      .text(0, 0, "CRACK", {
        fontSize: "32px",
        fontFamily: FONT_UI,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.crackBtn.add(btnText);

    this.crackBtn.setSize(btnW, btnH);
    this.crackBtn.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, btnW, btnH),
      Phaser.Geom.Rectangle.Contains
    );

    this.crackBtn.on("pointerover", () => {
      btnBg.clear();
      btnBg.fillStyle(0xaa8866, 1);
      btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      btnBg.lineStyle(4, 0xaa8866, 0.8);
      btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    });

    this.crackBtn.on("pointerout", () => {
      btnBg.clear();
      btnBg.fillStyle(0x88664d, 1);
      btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      btnBg.lineStyle(4, 0xaa8866, 0.8);
      btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    });

    this.crackBtn.on("pointerdown", () => {
      this.executeCrack(card);
    });

    // Slide fate deck up
    this.peekFateCard();
  }

  private exitChestMode(): void {
    if (this.chestOverlay) {
      this.chestOverlay.destroy();
      this.chestOverlay = null;
    }
    if (this.crackBtn) {
      this.crackBtn.destroy();
      this.crackBtn = null;
    }

    // Restore all grid card alphas, guarded loot, and chest loot
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard) {
          gridCard.setAlpha(1);
          if (gridCard.guardedLoot) {
            gridCard.guardedLoot.setAlpha(1);
            gridCard.guardedLoot.setDepth(5);
            gridCard.guardedLoot.setInteractive();
          }
          const chestLootInfo = this.chestLoot.get(gridCard);
          if (chestLootInfo) chestLootInfo.cardBack.setAlpha(1);
        }
      }
    }

    // Restore HUD alphas
    this.gridBgGraphics.forEach(img => img.setAlpha(1));
    this.deckVisual.forEach(img => img.setAlpha(1));
    this.deckText.setAlpha(1);
    this.goldText.setAlpha(1);
    this.exploreBtn.setAlpha(1);
    this.levelIndicator.setAlpha(1);
    this.levelFlavorText.setAlpha(1);

    // Reset chest depth
    if (this.crackingChest) {
      this.crackingChest.setDepth(10);
    }

    // Slide fate deck down
    this.animateFateCardResolve();

    this.isResolving = false;
    this.crackingChest = null;
  }

  private executeCrack(chestCard: Card): void {
    if (this.crackBtn) {
      this.crackBtn.disableInteractive();
      this.crackBtn.setDepth(500);
    }
    if (this.chestOverlay) this.chestOverlay.disableInteractive();

    this.animateFateCardDraw((modifier) => {
      const modifiedAgility = Math.max(0, this.player.agility + this.inventory.agilityBonus + modifier + this.getPassiveAgilityModifier());
      this.playerView.showTempAgility(modifiedAgility);

      this.time.delayedCall(300, () => {
        const lockDifficulty = chestCard.cardData.lockDifficulty ?? 0;
        const success = modifiedAgility >= lockDifficulty;

        if (success) {
          this.sfx.play(SOUND_KEYS.chestOpen);
          this.chestCleanup(chestCard, modifier);
        } else {
          this.sfx.playRandom(SOUND_GROUPS.squelching);
          const trapDamage = chestCard.cardData.trapDamage ?? 0;
          if (trapDamage > 0) {
            this.applyDamageWithArmour(trapDamage, () => {
              this.chestCleanup(chestCard, modifier);
            });
          } else {
            this.chestCleanup(chestCard, modifier);
          }
        }
      });
    });
  }

  private chestCleanup(chestCard: Card, fateModifier: number): void {
    if (this.chestOverlay) {
      this.chestOverlay.destroy();
      this.chestOverlay = null;
    }
    if (this.crackBtn) {
      this.crackBtn.destroy();
      this.crackBtn = null;
    }

    const lootInfo = this.chestLoot.get(chestCard);
    const cell = this.grid.findCard(chestCard);
    const cellPos = cell ? { col: cell.col, row: cell.row } : null;

    if (cell) this.grid.removeCard(cell.col, cell.row);
    this.updatePlayerStats();
    this.chestLoot.delete(chestCard);

    chestCard.resolve(() => {
      this.player.shuffleFateCardBack(fateModifier);

      // Restore alphas
      for (let r = 0; r < this.grid.rows; r++) {
        for (let c = 0; c < this.grid.cols; c++) {
          const gridCard = this.grid.getCardAt(c, r);
          if (gridCard) {
            gridCard.setAlpha(1);
            if (gridCard.guardedLoot) {
              gridCard.guardedLoot.setAlpha(1);
              gridCard.guardedLoot.setDepth(5);
              gridCard.guardedLoot.setInteractive();
            }
            const chestLootInfo = this.chestLoot.get(gridCard);
            if (chestLootInfo) chestLootInfo.cardBack.setAlpha(1);
          }
        }
      }
      this.gridBgGraphics.forEach(img => img.setAlpha(1));
      this.deckVisual.forEach(img => img.setAlpha(1));
      this.deckText.setAlpha(1);
      this.goldText.setAlpha(1);
      this.exploreBtn.setAlpha(1);
      this.levelIndicator.setAlpha(1);
      this.levelFlavorText.setAlpha(1);

      this.animateFateCardResolve();
      this.playerView.restoreAgility(this.player);

      // Reveal loot card
      if (lootInfo && cellPos) {
        lootInfo.cardBack.destroy();
        const targetPos = this.grid.worldPos(cellPos.col, cellPos.row);
        const lootCard = new Card(this, targetPos.x, targetPos.y, lootInfo.lootData);
        lootCard.setScale(0, 1);
        this.grid.placeCard(cellPos.col, cellPos.row, lootCard);

        this.tweens.add({
          targets: lootCard,
          scaleX: 1,
          duration: 300,
          ease: "Back.easeOut",
          onComplete: () => {
            this.setupCardInteraction(lootCard);
            this.isResolving = false;
            this.crackingChest = null;
            this.disarmingTrap = null;
            this.updateExploreButtonState();
          },
        });
      } else {
        this.isResolving = false;
        this.crackingChest = null;
        this.disarmingTrap = null;
        this.updateExploreButtonState();
      }

      if (this.player.hp <= 0) {
        this.showGameOver();
      }
    });
  }

  private enterTrapMode(card: Card): void {
    this.isResolving = true;
    this.disarmingTrap = card;

    // Dim other grid cards
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard && gridCard !== card) {
          gridCard.setAlpha(0.3);
          if (gridCard.guardedLoot) {
            gridCard.guardedLoot.setAlpha(0.3);
            gridCard.guardedLoot.disableInteractive();
          }
          const chestLootInfo = this.chestLoot.get(gridCard);
          if (chestLootInfo) chestLootInfo.cardBack.setAlpha(0.3);
        }
      }
    }

    // Dim grid background, deck visual, HUD, explore button, level indicator
    this.gridBgGraphics.forEach(img => img.setAlpha(0.3));
    this.deckVisual.forEach(img => img.setAlpha(0.3));
    this.deckText.setAlpha(0.3);
    this.goldText.setAlpha(0.3);
    this.exploreBtn.setAlpha(0.3);
    this.levelIndicator.setAlpha(0.3);
    this.levelFlavorText.setAlpha(0.3);

    // Bring trap to top
    card.setDepth(4500);

    // Create clickable overlay behind disarm button (to cancel)
    this.trapOverlay = this.add.rectangle(
      GAME_W / 2,
      GAME_H / 2,
      GAME_W,
      GAME_H,
      0x000000,
      0.01
    );
    this.trapOverlay.setDepth(4000);
    this.trapOverlay.setInteractive();
    this.trapOverlay.on("pointerdown", () => this.exitTrapMode());

    // Create DISARM button below trap
    const btnW = 160;
    const btnH = 60;
    this.disarmBtn = this.add.container(card.x, card.y + CARD_H / 2 + 48);
    this.disarmBtn.setDepth(5000);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xdd8833, 1);
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    btnBg.lineStyle(4, 0xee9944, 0.8);
    btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    this.disarmBtn.add(btnBg);

    const btnText = this.add
      .text(0, 0, "DISARM", {
        fontSize: "32px",
        fontFamily: FONT_UI,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.disarmBtn.add(btnText);

    this.disarmBtn.setSize(btnW, btnH);
    this.disarmBtn.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, btnW, btnH),
      Phaser.Geom.Rectangle.Contains
    );

    this.disarmBtn.on("pointerover", () => {
      btnBg.clear();
      btnBg.fillStyle(0xee9944, 1);
      btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      btnBg.lineStyle(4, 0xee9944, 0.8);
      btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    });

    this.disarmBtn.on("pointerout", () => {
      btnBg.clear();
      btnBg.fillStyle(0xdd8833, 1);
      btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      btnBg.lineStyle(4, 0xee9944, 0.8);
      btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    });

    this.disarmBtn.on("pointerdown", () => {
      this.executeDisarm(card);
    });

    // Slide fate deck up
    this.peekFateCard();
  }

  private exitTrapMode(): void {
    if (this.trapOverlay) {
      this.trapOverlay.destroy();
      this.trapOverlay = null;
    }
    if (this.disarmBtn) {
      this.disarmBtn.destroy();
      this.disarmBtn = null;
    }

    // Restore all grid card alphas, guarded loot, and chest loot
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard) {
          gridCard.setAlpha(1);
          if (gridCard.guardedLoot) {
            gridCard.guardedLoot.setAlpha(1);
            gridCard.guardedLoot.setDepth(5);
            gridCard.guardedLoot.setInteractive();
          }
          const chestLootInfo = this.chestLoot.get(gridCard);
          if (chestLootInfo) chestLootInfo.cardBack.setAlpha(1);
        }
      }
    }

    // Restore HUD alphas
    this.gridBgGraphics.forEach(img => img.setAlpha(1));
    this.deckVisual.forEach(img => img.setAlpha(1));
    this.deckText.setAlpha(1);
    this.goldText.setAlpha(1);
    this.exploreBtn.setAlpha(1);
    this.levelIndicator.setAlpha(1);
    this.levelFlavorText.setAlpha(1);

    // Reset trap depth
    if (this.disarmingTrap) {
      this.disarmingTrap.setDepth(10);
    }

    // Slide fate deck down
    this.animateFateCardResolve();

    this.isResolving = false;
    this.disarmingTrap = null;
  }

  private executeDisarm(trapCard: Card): void {
    if (this.disarmBtn) {
      this.disarmBtn.disableInteractive();
      this.disarmBtn.setDepth(500);
    }
    if (this.trapOverlay) this.trapOverlay.disableInteractive();

    this.animateFateCardDraw((modifier) => {
      const modifiedAgility = Math.max(0, this.player.agility + this.inventory.agilityBonus + modifier + this.getPassiveAgilityModifier());
      this.playerView.showTempAgility(modifiedAgility);

      this.time.delayedCall(300, () => {
        const lockDifficulty = trapCard.cardData.lockDifficulty ?? 0;
        const success = modifiedAgility >= lockDifficulty;

        if (success) {
          this.sfx.play(SOUND_KEYS.clickUnlock);
          this.trapCleanup(trapCard, modifier);
        } else {
          this.sfx.playRandom(SOUND_GROUPS.squelching);
          const trapDamage = trapCard.cardData.trapDamage ?? 0;
          const afterDamage = () => {
            const trigAbilities = this.collectAbilities("onTrapTriggered", trapCard.cardData);
            this.executeOnTrapTriggeredAbilities(trapCard, trigAbilities, () => {
              this.trapCleanup(trapCard, modifier);
            });
          };
          if (trapDamage > 0) {
            this.applyDamageWithArmour(trapDamage, afterDamage);
          } else {
            afterDamage();
          }
        }
      });
    });
  }

  private trapCleanup(trapCard: Card, fateModifier: number): void {
    if (this.trapOverlay) {
      this.trapOverlay.destroy();
      this.trapOverlay = null;
    }
    if (this.disarmBtn) {
      this.disarmBtn.destroy();
      this.disarmBtn = null;
    }

    const cell = this.grid.findCard(trapCard);
    if (cell) this.grid.removeCard(cell.col, cell.row);
    this.updatePlayerStats();

    trapCard.resolve(() => {
      this.player.shuffleFateCardBack(fateModifier);

      // Restore alphas
      for (let r = 0; r < this.grid.rows; r++) {
        for (let c = 0; c < this.grid.cols; c++) {
          const gridCard = this.grid.getCardAt(c, r);
          if (gridCard) {
            gridCard.setAlpha(1);
            if (gridCard.guardedLoot) {
              gridCard.guardedLoot.setAlpha(1);
              gridCard.guardedLoot.setDepth(5);
              gridCard.guardedLoot.setInteractive();
            }
            const chestLootInfo = this.chestLoot.get(gridCard);
            if (chestLootInfo) chestLootInfo.cardBack.setAlpha(1);
          }
        }
      }
      this.gridBgGraphics.forEach(img => img.setAlpha(1));
      this.deckVisual.forEach(img => img.setAlpha(1));
      this.deckText.setAlpha(1);
      this.goldText.setAlpha(1);
      this.exploreBtn.setAlpha(1);
      this.levelIndicator.setAlpha(1);
      this.levelFlavorText.setAlpha(1);

      this.animateFateCardResolve();
      this.playerView.restoreAgility(this.player);

      this.isResolving = false;
      this.disarmingTrap = null;
      this.updateExploreButtonState();

      if (this.player.hp <= 0) {
        this.showGameOver();
      }
    });
  }

  private enterExchangerMode(card: Card): void {
    this.isResolving = true;
    this.exchangerCard = card;

    // Dim other grid cards
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard && gridCard !== card) {
          gridCard.setAlpha(0.3);
          if (gridCard.guardedLoot) {
            gridCard.guardedLoot.setAlpha(0.3);
            gridCard.guardedLoot.disableInteractive();
          }
          const chestLootInfo = this.chestLoot.get(gridCard);
          if (chestLootInfo) chestLootInfo.cardBack.setAlpha(0.3);
        }
      }
    }

    // Dim grid background, deck visual, HUD, explore button, level indicator
    this.gridBgGraphics.forEach(img => img.setAlpha(0.3));
    this.deckVisual.forEach(img => img.setAlpha(0.3));
    this.deckText.setAlpha(0.3);
    this.exploreBtn.setAlpha(0.3);
    this.levelIndicator.setAlpha(0.3);
    this.levelFlavorText.setAlpha(0.3);

    // Bring card to top
    card.setDepth(4500);

    // Create clickable overlay behind button (to cancel)
    this.exchangerOverlay = this.add.rectangle(
      GAME_W / 2,
      GAME_H / 2,
      GAME_W,
      GAME_H,
      0x000000,
      0.01
    );
    this.exchangerOverlay.setDepth(4000);
    this.exchangerOverlay.setInteractive();
    this.exchangerOverlay.on("pointerdown", () => this.exitExchangerMode());

    // Create OFFER button below exchanger card
    const btnW = 160;
    const btnH = 60;
    this.exchangerBtn = this.add.container(card.x, card.y + CARD_H / 2 + 48);
    this.exchangerBtn.setDepth(5000);

    const price = card.cardData.exchangePrice!;
    const canAfford = price.resource === "gold"
      ? this.player.gold >= price.amount
      : this.player.hp > price.amount;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xddaa22, 1);
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    btnBg.lineStyle(4, 0xffcc44, 0.8);
    btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    this.exchangerBtn.add(btnBg);

    const btnText = this.add
      .text(0, 0, "OFFER", {
        fontSize: "32px",
        fontFamily: FONT_UI,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.exchangerBtn.add(btnText);

    if (canAfford) {
      this.exchangerBtn.setSize(btnW, btnH);
      this.exchangerBtn.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, btnW, btnH),
        Phaser.Geom.Rectangle.Contains
      );

      this.exchangerBtn.on("pointerover", () => {
        btnBg.clear();
        btnBg.fillStyle(0xeebb33, 1);
        btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
        btnBg.lineStyle(4, 0xffcc44, 0.8);
        btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      });

      this.exchangerBtn.on("pointerout", () => {
        btnBg.clear();
        btnBg.fillStyle(0xddaa22, 1);
        btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
        btnBg.lineStyle(4, 0xffcc44, 0.8);
        btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      });

      this.exchangerBtn.on("pointerdown", () => {
        this.executeExchange(card);
      });
    } else {
      this.exchangerBtn.setAlpha(0.5);
    }
  }

  private exitExchangerMode(): void {
    if (this.exchangerOverlay) {
      this.exchangerOverlay.destroy();
      this.exchangerOverlay = null;
    }
    if (this.exchangerBtn) {
      this.exchangerBtn.destroy();
      this.exchangerBtn = null;
    }

    // Restore all grid card alphas, guarded loot, and chest loot
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const gridCard = this.grid.getCardAt(c, r);
        if (gridCard) {
          gridCard.setAlpha(1);
          if (gridCard.guardedLoot) {
            gridCard.guardedLoot.setAlpha(1);
            gridCard.guardedLoot.setDepth(5);
            gridCard.guardedLoot.setInteractive();
          }
          const chestLootInfo = this.chestLoot.get(gridCard);
          if (chestLootInfo) chestLootInfo.cardBack.setAlpha(1);
        }
      }
    }

    // Restore HUD alphas
    this.gridBgGraphics.forEach(img => img.setAlpha(1));
    this.deckVisual.forEach(img => img.setAlpha(1));
    this.deckText.setAlpha(1);
    this.exploreBtn.setAlpha(1);
    this.levelIndicator.setAlpha(1);
    this.levelFlavorText.setAlpha(1);

    // Reset card depth
    if (this.exchangerCard) {
      this.exchangerCard.setDepth(10);
    }

    this.isResolving = false;
    this.exchangerCard = null;
    this.updateExploreButtonState();
  }

  private executeExchange(card: Card): void {
    if (this.exchangerBtn) {
      this.exchangerBtn.disableInteractive();
      this.exchangerBtn.setDepth(500);
    }
    if (this.exchangerOverlay) this.exchangerOverlay.disableInteractive();

    const price = card.cardData.exchangePrice!;
    const reward = card.cardData.exchangeReward!;

    // Pay the price
    if (price.resource === "gold") {
      this.player.addGold(-price.amount);
    } else {
      this.player.takeDamage(price.amount);
    }

    // Apply reward
    if (reward.type === "fate") {
      this.player.fateDeck.push(reward.modifier);
      // Shuffle the fate deck
      for (let i = this.player.fateDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.player.fateDeck[i], this.player.fateDeck[j]] = [this.player.fateDeck[j], this.player.fateDeck[i]];
      }

      // Animate a fate card visual flying from the exchanger card into the fate deck
      const fateDeckPos = this.getFateDeckWorldPos();
      const fateCardW = 100;
      const fateCardH = 140;
      const fateCard = this.add.container(card.x, card.y);
      fateCard.setDepth(9000);
      fateCard.setScale(0.5);

      const fateBg = this.add.graphics();
      fateBg.fillStyle(0x1a1a2e, 1);
      fateBg.fillRoundedRect(-fateCardW / 2, -fateCardH / 2, fateCardW, fateCardH, 12);
      fateBg.lineStyle(2, 0x4444aa, 0.8);
      fateBg.strokeRoundedRect(-fateCardW / 2, -fateCardH / 2, fateCardW, fateCardH, 12);
      fateCard.add(fateBg);

      const modLabel = reward.modifier > 0 ? `+${reward.modifier}` : `${reward.modifier}`;
      const modColor = reward.modifier > 0 ? "#44dd88" : reward.modifier < 0 ? "#ff5555" : "#888888";
      const modText = this.add
        .text(0, 0, modLabel, {
          fontSize: "40px",
          fontFamily: FONT_UI,
          color: modColor,
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      fateCard.add(modText);

      this.tweens.add({
        targets: fateCard,
        x: fateDeckPos.x,
        y: fateDeckPos.y,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 600,
        ease: "Power2",
        onComplete: () => {
          fateCard.destroy();
          this.exchangerCleanup(card);
        },
      });
    } else {
      // Treasure reward — replace exchanger card with treasure card in the same cell
      const rewardCardData = getCard(reward.cardId);
      const cell = this.grid.findCard(card);
      const cellPos = cell ? { col: cell.col, row: cell.row } : null;

      if (cell) this.grid.removeCard(cell.col, cell.row);

      // Destroy overlay and button before card resolves
      if (this.exchangerOverlay) {
        this.exchangerOverlay.destroy();
        this.exchangerOverlay = null;
      }
      if (this.exchangerBtn) {
        this.exchangerBtn.destroy();
        this.exchangerBtn = null;
      }

      card.resolve(() => {
        // Restore alphas
        for (let r = 0; r < this.grid.rows; r++) {
          for (let c = 0; c < this.grid.cols; c++) {
            const gridCard = this.grid.getCardAt(c, r);
            if (gridCard) {
              gridCard.setAlpha(1);
              if (gridCard.guardedLoot) {
                gridCard.guardedLoot.setAlpha(1);
                gridCard.guardedLoot.setDepth(5);
                gridCard.guardedLoot.setInteractive();
              }
              const chestLootInfo = this.chestLoot.get(gridCard);
              if (chestLootInfo) chestLootInfo.cardBack.setAlpha(1);
            }
          }
        }
        this.gridBgGraphics.forEach(img => img.setAlpha(1));
        this.deckVisual.forEach(img => img.setAlpha(1));
        this.deckText.setAlpha(1);
        this.exploreBtn.setAlpha(1);
        this.levelIndicator.setAlpha(1);
        this.levelFlavorText.setAlpha(1);

        if (cellPos) {
          const targetPos = this.grid.worldPos(cellPos.col, cellPos.row);
          const lootCard = new Card(this, targetPos.x, targetPos.y, rewardCardData);
          lootCard.setScale(0, 1);
          this.grid.placeCard(cellPos.col, cellPos.row, lootCard);

          this.tweens.add({
            targets: lootCard,
            scaleX: 1,
            duration: 300,
            ease: "Back.easeOut",
            onComplete: () => {
              this.setupCardInteraction(lootCard);
              this.isResolving = false;
              this.exchangerCard = null;
              this.updateExploreButtonState();
            },
          });
        } else {
          this.isResolving = false;
          this.exchangerCard = null;
          this.updateExploreButtonState();
        }

        if (this.player.hp <= 0) {
          this.showGameOver();
        }
      });
      return;
    }
  }

  private exchangerCleanup(card: Card): void {
    if (this.exchangerOverlay) {
      this.exchangerOverlay.destroy();
      this.exchangerOverlay = null;
    }
    if (this.exchangerBtn) {
      this.exchangerBtn.destroy();
      this.exchangerBtn = null;
    }

    const cell = this.grid.findCard(card);
    if (cell) this.grid.removeCard(cell.col, cell.row);

    card.resolve(() => {
      // Restore alphas
      for (let r = 0; r < this.grid.rows; r++) {
        for (let c = 0; c < this.grid.cols; c++) {
          const gridCard = this.grid.getCardAt(c, r);
          if (gridCard) {
            gridCard.setAlpha(1);
            if (gridCard.guardedLoot) {
              gridCard.guardedLoot.setAlpha(1);
              gridCard.guardedLoot.setDepth(5);
              gridCard.guardedLoot.setInteractive();
            }
            const chestLootInfo = this.chestLoot.get(gridCard);
            if (chestLootInfo) chestLootInfo.cardBack.setAlpha(1);
          }
        }
      }
      this.gridBgGraphics.forEach(img => img.setAlpha(1));
      this.deckVisual.forEach(img => img.setAlpha(1));
      this.deckText.setAlpha(1);
      this.exploreBtn.setAlpha(1);
      this.levelIndicator.setAlpha(1);
      this.levelFlavorText.setAlpha(1);

      this.isResolving = false;
      this.exchangerCard = null;
      this.updateExploreButtonState();

      if (this.player.hp <= 0) {
        this.showGameOver();
      }
    });
  }

  private hasTrapOnGrid(): boolean {
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const card = this.grid.getCardAt(c, r);
        if (card && card.cardData.type === CardType.Trap) {
          return true;
        }
      }
    }
    return false;
  }

  private isExploreBlocked(): boolean {
    return this.deck.isEmpty || this.hasTrapOnGrid();
  }

  private updateExploreButtonState(): void {
    if (this.isExploreBlocked()) {
      this.disableExploreButton();
    } else {
      this.enableExploreButton();
    }
  }

  private createCardBack(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const img = this.add.image(0, 0, "card_back");
    container.add(img);
    return container;
  }

  private setupDoorInteraction(doorCard: Card): void {
    doorCard.on("pointerover", () => {
      if (!this.isResolving && !this.isDragging) doorCard.setHighlight(true);
    });
    doorCard.on("pointerout", () => {
      doorCard.setHighlight(false);
    });
    doorCard.on("pointerdown", () => {
      if (this.isResolving) return;
      // Shake the door as a hint that a key is needed
      this.tweens.add({
        targets: doorCard,
        x: doorCard.x + 6,
        duration: 50,
        yoyo: true,
        repeat: 2,
      });
    });
  }

  private findDoorOnGrid(): Card | null {
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const card = this.grid.getCardAt(c, r);
        if (card && card.cardData.type === CardType.Door) {
          return card;
        }
      }
    }
    return null;
  }

  private openDoor(doorCard: Card): void {
    this.hideTutorialCursor();
    if (this.tutorialText) { this.tutorialText.destroy(); this.tutorialText = null; }
    this.isResolving = true;
    doorCard.markDoorOpened();

    this.time.delayedCall(600, () => {
      // Level transition — 4 sequential footstep sounds
      this.sfx.playRandomSequential(SOUND_GROUPS.stoneWalk, 4, 300);

      // Clear all grid cards except the door
      this.clearGrid(() => {
        if (this.currentLevelIndex >= this.dungeonLevels.length - 1) {
          // Remove door before showing win screen
          const cell = this.grid.findCard(doorCard);
          if (cell) this.grid.removeCard(cell.col, cell.row);
          doorCard.destroy();
          this.showWinScreen();
          return;
        }

        this.currentLevelIndex++;
        this.vignetteFX.setLevel(Math.max(0, this.gameplayLevelIndex));
        this.tintBackground();
        const nextLevel = this.dungeonLevels[this.currentLevelIndex];

        // Rebuild grid if dimensions changed
        const newCols = nextLevel.gridSize?.cols ?? 4;
        const newRows = nextLevel.gridSize?.rows ?? 3;
        if (newCols !== this.grid.cols || newRows !== this.grid.rows) {
          this.rebuildGrid(newCols, newRows);
        }

        // Animate card-back sprites from door to deck, then remove door
        this.animateCardsToDeck(doorCard.x, doorCard.y, () => {
          // Build next level's deck
          const tempDeck = Deck.fromDungeonLevel(nextLevel, this.currentLevelIndex, this.gameplayLevelIndex);
          if (nextLevel.orderedCards) {
            // Ordered levels replace the deck to preserve card sequence
            tempDeck.onShuffle = this.deck.onShuffle;
            this.deck = tempDeck;
          } else {
            const newCards = tempDeck.draw(tempDeck.remaining);
            this.deck.mergeCards(newCards);
            this.deck.replaceLoot(tempDeck.drainLoot());
          }

          this.currentLevelKey = getCard(nextLevel.key);

          // Update HUD
          this.updateHUD();
          this.updateDeckVisual();
          this.updateLevelIndicator();

          // Now remove the door with a resolve animation
          const cell = this.grid.findCard(doorCard);
          if (cell) this.grid.removeCard(cell.col, cell.row);
          doorCard.resolve(() => {
            // Re-enable explore button
            this.enableExploreButton();

            this.isResolving = false;
            this.drawAndPlaceCards(3);
          });
        });
      }, doorCard);
    });
  }

  private animateCardsToDeck(
    fromX: number,
    fromY: number,
    onComplete: () => void
  ): void {
    const cardCount = 5;
    const staggerDelay = 100;
    const duration = 550;
    const targetX = 350;
    const targetY = 200;
    let completed = 0;

    for (let i = 0; i < cardCount; i++) {
      const cardSprite = this.add.image(fromX, fromY, "card_back");
      cardSprite.setDepth(800);

      this.time.delayedCall(i * staggerDelay, () => {
        this.tweens.add({
          targets: cardSprite,
          x: targetX,
          y: targetY,
          duration,
          ease: "Power2",
          onComplete: () => {
            cardSprite.destroy();
            completed++;
            if (completed === cardCount) {
              onComplete();
            }
          },
        });
      });
    }
  }

  private clearGrid(onComplete: () => void, skip?: Card): void {
    const cards = this.grid.getAllCards();
    const toDestroy: Phaser.GameObjects.GameObject[] = [];

    for (const card of cards) {
      if (card === skip) continue;
      toDestroy.push(card);
      if (card.guardedLoot) {
        toDestroy.push(card.guardedLoot);
      }
      const chestInfo = this.chestLoot.get(card);
      if (chestInfo) {
        toDestroy.push(chestInfo.cardBack);
      }
    }

    // Clear tracking maps
    this.guardedByMonster.clear();
    this.chestLoot.clear();

    if (toDestroy.length === 0) {
      onComplete();
      return;
    }

    let completed = 0;
    toDestroy.forEach((obj, i) => {
      this.time.delayedCall(i * 80, () => {
        this.tweens.add({
          targets: obj,
          alpha: 0,
          scaleX: 0,
          scaleY: 0,
          duration: 300,
          ease: "Power2",
          onComplete: () => {
            obj.destroy();
            completed++;
            if (completed === toDestroy.length) {
              onComplete();
            }
          },
        });
      });
    });
  }

  private showWinScreen(): void {
    new WinScreen(this, this.player, this.inventory);
  }

  private showGameOver(): void {
    new GameOverScreen(this);
  }

  private enableExploreButton(): void {
    this.exploreBtn.setEnabled(true);
    this.exploreBtn.setText("EXPLORE");
    this.exploreBtn.setTextColor("#6b4f42");
  }

  private disableExploreButton(): void {
    this.exploreBtn.setEnabled(false);
    this.exploreBtn.setText(this.hasTrapOnGrid() ? "BLOCKED" : "EMPTY");
    this.exploreBtn.setTextColor("#4a3a3e");
  }
}
