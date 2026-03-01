import Phaser from "phaser";

const fragShader = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform vec2 uResolution;
uniform float uScanlinesEnabled;
uniform float uCurvatureEnabled;

varying vec2 outTexCoord;

void main() {
    vec2 uv = outTexCoord;

    // Barrel distortion: warp UVs before sampling
    vec2 d = uv - 0.5;
    uv = 0.5 + d * (1.0 + mix(0.0, 0.05, uCurvatureEnabled) * dot(d, d));

    vec4 color = texture2D(uMainSampler, uv);

    // Scanlines: horizontal sin wave (lower frequency = thicker lines)
    float scan = 0.5 + 0.5 * sin(outTexCoord.y * uResolution.y * 2.0);
    color.rgb *= mix(1.0, mix(1.0, scan, 0.15), uScanlinesEnabled);

    gl_FragColor = color;
}
`;

export class CRTPostFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  scanlinesEnabled = true;
  curvatureEnabled = true;

  // Phaser instantiates PostFX as `new Pipeline(game, config)` at runtime,
  // despite the TS types declaring `(config: WebGLPipelineConfig)`.
  constructor(game: Phaser.Game) {
    super({
      game,
      name: "CRTPostFX",
      fragShader,
    } as Phaser.Types.Renderer.WebGL.WebGLPipelineConfig);
  }

  onPreRender(): void {
    if (!this.renderer) return;
    this.set2f("uResolution", this.renderer.width, this.renderer.height);
    this.set1f("uScanlinesEnabled", this.scanlinesEnabled ? 1.0 : 0.0);
    this.set1f("uCurvatureEnabled", this.curvatureEnabled ? 1.0 : 0.0);
  }
}
