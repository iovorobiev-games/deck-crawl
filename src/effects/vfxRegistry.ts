import Phaser from "phaser";

export interface VfxTarget {
  x: number;
  y: number;
  gameObject?: Phaser.GameObjects.GameObject;
}

export type VfxFunction = (
  scene: Phaser.Scene,
  source: { x: number; y: number },
  targets: VfxTarget[],
  onComplete: () => void,
) => void;

/* ------------------------------------------------------------------ */
/*  Fireball VFX                                                      */
/* ------------------------------------------------------------------ */

function playFireballVfx(
  scene: Phaser.Scene,
  source: { x: number; y: number },
  targets: VfxTarget[],
  onComplete: () => void,
): void {
  if (targets.length === 0) { onComplete(); return; }

  const primaryTarget = targets[0];

  /* ---- 1. Fireball projectile (Graphics) ---- */
  const fireball = scene.add.container(source.x, source.y);
  fireball.setDepth(9999);

  // Glowing core
  const core = scene.add.graphics();
  core.fillStyle(0xffcc00, 1);
  core.fillCircle(0, 0, 18);
  fireball.add(core);

  // Outer glow
  const glow = scene.add.graphics();
  glow.fillStyle(0xff6600, 0.5);
  glow.fillCircle(0, 0, 30);
  fireball.add(glow);

  // Pulsing glow tween
  scene.tweens.add({
    targets: glow,
    scaleX: { from: 0.8, to: 1.3 },
    scaleY: { from: 0.8, to: 1.3 },
    alpha: { from: 0.6, to: 0.3 },
    duration: 80,
    yoyo: true,
    repeat: -1,
  });

  /* ---- 2. Particle trail ---- */
  const trailParticles: Phaser.GameObjects.Graphics[] = [];
  const trailTimer = scene.time.addEvent({
    delay: 20,
    loop: true,
    callback: () => {
      const p = scene.add.graphics();
      p.setDepth(9998);
      const size = 4 + Math.random() * 8;
      const color = Phaser.Math.RND.pick([0xff4400, 0xff8800, 0xffcc00, 0xff2200]);
      p.fillStyle(color, 0.8);
      p.fillCircle(0, 0, size);
      p.setPosition(
        fireball.x + (Math.random() - 0.5) * 16,
        fireball.y + (Math.random() - 0.5) * 16,
      );
      trailParticles.push(p);
      // Fade and shrink each trail particle
      scene.tweens.add({
        targets: p,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: 250 + Math.random() * 150,
        onComplete: () => {
          p.destroy();
          const idx = trailParticles.indexOf(p);
          if (idx !== -1) trailParticles.splice(idx, 1);
        },
      });
    },
  });

  /* ---- 3. Fly projectile to primary target ---- */
  const dist = Phaser.Math.Distance.Between(source.x, source.y, primaryTarget.x, primaryTarget.y);
  const flightDuration = Math.max(250, Math.min(500, dist * 0.4));

  scene.tweens.add({
    targets: fireball,
    x: primaryTarget.x,
    y: primaryTarget.y,
    duration: flightDuration,
    ease: "Sine.easeIn",
    onComplete: () => {
      // Stop trail generation
      trailTimer.destroy();

      // Destroy projectile
      fireball.destroy();

      // ---- 4. Explosion burst on ALL targets ---- */
      spawnExplosions(scene, targets, () => {
        // ---- 5. Red tint blink on impacted cards ---- */
        blinkTargets(scene, targets, () => {
          onComplete();
        });
      });

      // ---- 6. Camera shake ---- */
      scene.cameras.main.shake(200, 0.008);
    },
  });
}

/* ---- Explosion burst at each target position ---- */
function spawnExplosions(
  scene: Phaser.Scene,
  targets: VfxTarget[],
  onComplete: () => void,
): void {
  let completed = 0;
  const total = targets.length;

  for (const t of targets) {
    const particleCount = 14;
    let particlesDone = 0;

    // Central flash
    const flash = scene.add.graphics();
    flash.setDepth(9999);
    flash.fillStyle(0xffaa00, 0.9);
    flash.fillCircle(0, 0, 40);
    flash.setPosition(t.x, t.y);
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2.5,
      scaleY: 2.5,
      duration: 300,
      ease: "Power2",
      onComplete: () => flash.destroy(),
    });

    // Burst particles
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 60 + Math.random() * 80;
      const size = 3 + Math.random() * 6;
      const color = Phaser.Math.RND.pick([0xff4400, 0xff8800, 0xffcc00, 0xff2200, 0xff0000]);

      const p = scene.add.graphics();
      p.setDepth(9999);
      p.fillStyle(color, 1);
      p.fillCircle(0, 0, size);
      p.setPosition(t.x, t.y);

      scene.tweens.add({
        targets: p,
        x: t.x + Math.cos(angle) * speed,
        y: t.y + Math.sin(angle) * speed,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 300 + Math.random() * 200,
        ease: "Power2",
        onComplete: () => {
          p.destroy();
          particlesDone++;
          if (particlesDone >= particleCount) {
            completed++;
            if (completed >= total) {
              onComplete();
            }
          }
        },
      });
    }
  }
}

/* ---- Red tint blink on target game objects ---- */
function blinkTargets(
  scene: Phaser.Scene,
  targets: VfxTarget[],
  onComplete: () => void,
): void {
  const containers = targets
    .map(t => t.gameObject)
    .filter((go): go is Phaser.GameObjects.Container => go instanceof Phaser.GameObjects.Container);

  if (containers.length === 0) { onComplete(); return; }

  // Create red overlay rectangles for each container
  const overlays: Phaser.GameObjects.Graphics[] = [];
  for (const c of containers) {
    const overlay = scene.add.graphics();
    overlay.setDepth(c.depth + 1);
    overlay.fillStyle(0xff0000, 0.4);
    // Use container's size for the overlay
    const w = c.width || 171;
    const h = c.height || 202;
    overlay.fillRoundedRect(c.x - w / 2, c.y - h / 2, w, h, 8);
    overlay.setAlpha(0);
    overlays.push(overlay);
  }

  // Blink: flash on → off → on → off
  scene.tweens.add({
    targets: overlays,
    alpha: { from: 0, to: 0.5 },
    duration: 80,
    yoyo: true,
    repeat: 2,
    onComplete: () => {
      for (const o of overlays) o.destroy();
      onComplete();
    },
  });
}

/* ------------------------------------------------------------------ */
/*  VFX Registry                                                      */
/* ------------------------------------------------------------------ */

const vfxRegistry: Record<string, VfxFunction> = {
  fireball: playFireballVfx,
};

export function getVfx(id: string): VfxFunction | undefined {
  return vfxRegistry[id];
}
