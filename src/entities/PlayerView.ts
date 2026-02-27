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
    const portrait = this.scene.add.image(0, 0, "player_portrait");
    this.add(portrait);

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
    this.powerText.setColor("#ffff44");
  }

  restorePower(player: Player, equipPowerBonus = 0): void {
    this.updateStats(player, equipPowerBonus);
  }

  showTempAgility(value: number): void {
    this.agilityText.setText(`\u25C6${value}`);
    this.agilityText.setColor("#ffff44");
  }

  restoreAgility(player: Player): void {
    this.agilityText.setText(`\u25C6${player.agility}`);
    this.agilityText.setColor("#44dd88");
  }
}
