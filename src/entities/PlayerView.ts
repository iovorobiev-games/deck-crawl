import Phaser from "phaser";
import { Player } from "../systems/Player";

const PLAYER_W = 168;
const PLAYER_H = 198;
const CORNER_R = 14;
const STACK_BG = 0x2a2a4e;
const STACK_BORDER = 0x4444aa;

export class PlayerView extends Phaser.GameObjects.Container {
  private hpText!: Phaser.GameObjects.Text;
  private powerText!: Phaser.GameObjects.Text;
  private agilityText!: Phaser.GameObjects.Text;
  private powerGroup!: Phaser.GameObjects.Container;
  private hpGroup!: Phaser.GameObjects.Container;
  private agilityGroup!: Phaser.GameObjects.Container;
  private fateDeckGfx!: Phaser.GameObjects.Graphics;
  private portraitSprite!: Phaser.GameObjects.Image;
  private highlightTween: Phaser.Tweens.Tween | null = null;
  private healPreviewText: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.createFateDeckStack();
    this.createPortrait();

    this.setSize(PLAYER_W, PLAYER_H);
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, PLAYER_W, PLAYER_H),
      Phaser.Geom.Rectangle.Contains
    );

    scene.add.existing(this);
    this.setDepth(1000);
  }

  private createFateDeckStack(): void {
    this.fateDeckGfx = this.scene.add.graphics();
    // Draw 2 offset card backs behind the portrait
    for (let i = 0; i < 2; i++) {
      const ox = (2 - i) * 4;
      const oy = (2 - i) * 4;
      this.fateDeckGfx.fillStyle(STACK_BG, 1);
      this.fateDeckGfx.fillRoundedRect(
        -PLAYER_W / 2 + ox,
        -PLAYER_H / 2 + oy,
        PLAYER_W,
        PLAYER_H,
        CORNER_R
      );
      this.fateDeckGfx.lineStyle(1, STACK_BORDER, 0.8);
      this.fateDeckGfx.strokeRoundedRect(
        -PLAYER_W / 2 + ox,
        -PLAYER_H / 2 + oy,
        PLAYER_W,
        PLAYER_H,
        CORNER_R
      );
    }
    this.add(this.fateDeckGfx);
  }

  private createPortrait(): void {
    // Player portrait sprite (202x243, used at native size)
    this.portraitSprite = this.scene.add.image(0, 0, "player_portrait");
    this.add(this.portraitSprite);

    // Portrait is 202x243 — corners at (±101, -122)
    // Each stat is a sub-container holding the icon + text, so moving the
    // container repositions both together.
    const cornerY = -105;
    const textOffsetY = 0; // text offset below icon center

    // Power — top-left corner
    this.powerGroup = this.scene.add.container(-95, cornerY);
    this.powerGroup.add(this.scene.add.image(0, 0, "icon_power"));
    this.powerText = this.scene.add
      .text(4, -4, "", {
        fontSize: "48px",
        fontFamily: "monospace",
        color: "#240a0e",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0.5);
    this.powerGroup.add(this.powerText);
    this.add(this.powerGroup);

    // HP — top center
    this.hpGroup = this.scene.add.container(0, cornerY + 16);
    this.hpGroup.add(this.scene.add.image(0, 0, "icon_hp"));
    this.hpText = this.scene.add
      .text(0, -4, "", {
        fontSize: "32px",
        fontFamily: "monospace",
        color: "#f6d4b1",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0.5);
    this.hpGroup.add(this.hpText);
    this.add(this.hpGroup);

    // Agility — top-right corner
    this.agilityGroup = this.scene.add.container(112, cornerY-8);
    this.agilityGroup.add(this.scene.add.image(0, 0, "icon_agility"));
    this.agilityText = this.scene.add
      .text(-20, 2, "", {
        fontSize: "48px",
        fontFamily: "monospace",
        color: "#240a0e",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0.5);
    this.agilityGroup.add(this.agilityText);
    this.add(this.agilityGroup);
  }

  updateStats(player: Player, equipPowerBonus = 0): void {
    this.hpText.setText(`${player.hp}`);
    const totalPower = player.power + equipPowerBonus;
    this.powerText.setText(`${totalPower}`);
    this.agilityText.setText(`${player.agility}`);
  }

  slideFateDeckUp(scene: Phaser.Scene): void {
    scene.tweens.add({
      targets: this.fateDeckGfx,
      y: this.fateDeckGfx.y - 40,
      duration: 300,
      ease: "Power2",
    });
  }

  slideFateDeckDown(scene: Phaser.Scene): void {
    scene.tweens.add({
      targets: this.fateDeckGfx,
      y: 0,
      duration: 300,
      ease: "Power2",
    });
  }

  getFateDeckWorldPos(): { x: number; y: number } {
    const worldMatrix = this.getWorldTransformMatrix();
    return {
      x: worldMatrix.tx,
      y: worldMatrix.ty - 40,
    };
  }

  showTempPower(value: number): void {
    this.powerText.setText(`\u2694${value}`);
  }

  restorePower(player: Player, equipPowerBonus = 0): void {
    this.updateStats(player, equipPowerBonus);
  }

  showTempAgility(value: number): void {
    this.agilityText.setText(`\u25C6${value}`);
  }

  restoreAgility(player: Player): void {
    this.agilityText.setText(`\u25C6${player.agility}`);
  }

  showDropHighlight(amount: number): void {
    if (this.highlightTween) return; // already showing

    this.portraitSprite.setTint(0x44ff66);
    this.highlightTween = this.scene.tweens.add({
      targets: this.portraitSprite,
      alpha: { from: 1, to: 0.6 },
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.healPreviewText = this.scene.add
      .text(0, -PLAYER_H / 2 - 20, `+${amount} HP`, {
        fontSize: "28px",
        fontFamily: "monospace",
        color: "#44ff66",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 1);
    this.add(this.healPreviewText);
  }

  hideDropHighlight(): void {
    if (this.highlightTween) {
      this.highlightTween.stop();
      this.highlightTween = null;
    }
    this.portraitSprite.clearTint();
    this.portraitSprite.setAlpha(1);

    if (this.healPreviewText) {
      this.healPreviewText.destroy();
      this.healPreviewText = null;
    }
  }

  isPointOver(worldX: number, worldY: number): boolean {
    const dx = worldX - this.x;
    const dy = worldY - this.y;
    return Math.abs(dx) <= PLAYER_W / 2 && Math.abs(dy) <= PLAYER_H / 2;
  }
}
