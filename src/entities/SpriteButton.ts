import Phaser from "phaser";

const DEFAULT_TOP_OFFSET = 8;
const DEFAULT_SLICE_INSET = 18;

export interface SpriteButtonConfig {
  topOffset?: number;
  sliceInset?: number;
  fontSize?: string;
  fontFamily?: string;
  fontColor?: string;
  fontStyle?: string;
}

export class SpriteButton extends Phaser.GameObjects.Container {
  private bottomSlice: Phaser.GameObjects.NineSlice;
  private topSlice: Phaser.GameObjects.NineSlice;
  private label: Phaser.GameObjects.Text;
  private topRestY: number;
  private topPressedY: number;
  private _enabled = true;
  private _pressed = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    config?: SpriteButtonConfig
  ) {
    super(scene, x, y);

    const topOffset = config?.topOffset ?? DEFAULT_TOP_OFFSET;
    const inset = config?.sliceInset ?? DEFAULT_SLICE_INSET;
    const fontSize = config?.fontSize ?? "28px";
    const fontFamily = config?.fontFamily ?? "monospace";
    const fontColor = config?.fontColor ?? "#6b4f42";
    const fontStyle = config?.fontStyle ?? "bold";

    this.topPressedY = topOffset / 2;
    this.topRestY = -topOffset / 2;

    this.bottomSlice = scene.add.nineslice(
      0, this.topPressedY,
      "button_bottom", undefined,
      width, height,
      inset, inset, inset, inset
    );

    this.topSlice = scene.add.nineslice(
      0, this.topRestY,
      "button_top", undefined,
      width, height,
      inset, inset, inset, inset
    );

    this.label = scene.add.text(0, this.topRestY, text, {
      fontSize,
      fontFamily,
      color: fontColor,
      fontStyle,
    }).setOrigin(0.5);

    this.add([this.bottomSlice, this.topSlice, this.label]);

    const totalH = height + topOffset;
    this.setSize(width, totalH);
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, totalH),
      Phaser.Geom.Rectangle.Contains
    );

    this.on("pointerdown", this.onPress, this);
    this.on("pointerup", this.onRelease, this);
    this.on("pointerout", this.onRelease, this);

    scene.add.existing(this);
  }

  private onPress(): void {
    if (!this._enabled || this._pressed) return;
    this._pressed = true;
    this.topSlice.setY(this.topPressedY);
    this.label.setY(this.topPressedY);
  }

  private onRelease(): void {
    if (!this._pressed) return;
    this._pressed = false;
    this.topSlice.setY(this.topRestY);
    this.label.setY(this.topRestY);
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    if (enabled) {
      this.bottomSlice.clearTint();
      this.topSlice.clearTint();
    } else {
      this.bottomSlice.setTint(0x888888);
      this.topSlice.setTint(0x888888);
      if (this._pressed) this.onRelease();
    }
  }

  setText(text: string): void {
    this.label.setText(text);
  }

  setTextColor(color: string): void {
    this.label.setColor(color);
  }

  get enabled(): boolean {
    return this._enabled;
  }
}
