import Phaser from "phaser";

const fragShader = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform float uTime;
uniform float uIntensity;

varying vec2 outTexCoord;

void main() {
    vec4 color = texture2D(uMainSampler, outTexCoord);

    vec2 uv = outTexCoord - 0.5;
    float dist = length(uv);

    // Organic candle-like flicker from layered sine waves
    float flicker = 1.0
        + 0.040 * sin(uTime * 2.7)
        + 0.030 * sin(uTime * 5.3 + 1.0)
        + 0.020 * sin(uTime * 11.1 + 2.5);

    // Vignette radii shrink as intensity grows (more screen covered)
    float innerRadius = mix(0.45, 0.12, uIntensity) * flicker;
    float outerRadius = mix(0.80, 0.55, uIntensity) * flicker;

    float vignette = smoothstep(innerRadius, outerRadius, dist);

    // Max darkness also scales with intensity
    float darkness = vignette * mix(0.40, 0.92, uIntensity);

    // Opacity flicker: breathing on overall darkness
    float opacityFlicker = 1.0
        + 0.06 * sin(uTime * 3.1 + 0.7)
        + 0.04 * sin(uTime * 8.9 + 1.3);
    darkness *= opacityFlicker;

    color.rgb *= 1.0 - darkness;

    gl_FragColor = color;
}
`;

/** Per-level intensity presets (0 = no vignette, 1 = maximum). */
const LEVEL_INTENSITY = [0.15, 0.25, 0.35];

export class VignettePostFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  private _intensity = LEVEL_INTENSITY[0];
  private _time = 0;

  constructor(game: Phaser.Game) {
    super({
      game,
      name: "VignettePostFX",
      fragShader,
    } as Phaser.Types.Renderer.WebGL.WebGLPipelineConfig);
  }

  /** Call this when the dungeon level changes (0-indexed). */
  setLevel(levelIndex: number): void {
    this._intensity =
      LEVEL_INTENSITY[Math.min(levelIndex, LEVEL_INTENSITY.length - 1)];
  }

  onPreRender(): void {
    // Advance internal clock (16 ms ≈ 60 fps fallback)
    const dt = this.game.loop.delta / 1000;
    this._time += dt;

    this.set1f("uTime", this._time);
    this.set1f("uIntensity", this._intensity);
  }
}
