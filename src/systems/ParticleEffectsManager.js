import { COLORS } from "../config/constants.js";
import { FORMS } from "../data/gameplay.js";
import { PARTICLE_EFFECTS, PARTICLE_LIMITS } from "../data/particleEffects.js";

const TEXTURE_KEYS = Object.freeze({
  dust: "runtime-fx-dust",
  sparkle: "runtime-fx-sparkle"
});

const FORM_COLORS = Object.freeze({
  [FORMS.UNICORN]: COLORS.collect,
  [FORMS.PEGASUS]: COLORS.collectBlue,
  [FORMS.ALICORN]: COLORS.collectPink
});

const createStarPoints = (centerX, centerY, innerRadius, outerRadius, pointCount = 4) => {
  const points = [];
  for (let index = 0; index < pointCount * 2; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (Math.PI * index) / pointCount;
    points.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    });
  }
  return points;
};

export class ParticleEffectsManager {
  constructor(scene) {
    this.scene = scene;
    this.magnetStates = new Map();
    this.pulses = new Set();
    this.createRuntimeTextures();
    this.createEmitters();
  }

  createRuntimeTextures() {
    if (!this.scene.textures.exists(TEXTURE_KEYS.dust)) {
      const graphics = this.scene.make.graphics({ add: false });
      graphics.fillStyle(COLORS.soft, 1);
      graphics.lineStyle(2, COLORS.outline, 0.72);
      graphics.fillRoundedRect(2, 3, 12, 8, 4);
      graphics.strokeRoundedRect(2, 3, 12, 8, 4);
      graphics.generateTexture(TEXTURE_KEYS.dust, 16, 14);
      graphics.destroy();
    }

    if (!this.scene.textures.exists(TEXTURE_KEYS.sparkle)) {
      const graphics = this.scene.make.graphics({ add: false });
      const points = createStarPoints(10, 10, 2.4, 8, 4);
      graphics.lineStyle(3, COLORS.white, 1);
      graphics.strokePoints(points, true, true);
      graphics.generateTexture(TEXTURE_KEYS.sparkle, 20, 20);
      graphics.destroy();
    }
  }

  createEmitters() {
    const landing = PARTICLE_EFFECTS.landing;
    this.dustEmitter = this.scene.add.particles(0, 0, TEXTURE_KEYS.dust, {
      emitting: false,
      lifespan: landing.lifespan,
      speedX: landing.speedX,
      speedY: landing.speedY,
      gravityY: landing.gravityY,
      scale: { start: 1, end: 0.3 },
      alpha: { start: 0.82, end: 0 },
      rotate: { min: -25, max: 25 },
      maxParticles: PARTICLE_LIMITS.landing
    }).setDepth(8);

    const magnet = PARTICLE_EFFECTS.magnet;
    this.magnetEmitter = this.scene.add.particles(0, 0, TEXTURE_KEYS.sparkle, {
      emitting: false,
      lifespan: magnet.lifespan,
      speed: { min: 8, max: 22 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.68, end: 0.08 },
      alpha: { start: 0.9, end: 0 },
      rotate: { min: -150, max: 150 },
      tint: [COLORS.collect, COLORS.collectBlue, COLORS.white],
      maxParticles: PARTICLE_LIMITS.magnet
    }).setDepth(7);

    const lightning = PARTICLE_EFFECTS.lightning;
    this.lightningEmitter = this.scene.add.particles(0, 0, TEXTURE_KEYS.sparkle, {
      emitting: false,
      lifespan: lightning.lifespan,
      speed: lightning.speed,
      angle: { min: 196, max: 344 },
      gravityY: 330,
      scale: { start: 1.05, end: 0.08 },
      alpha: { start: 1, end: 0 },
      rotate: { min: -240, max: 240 },
      tint: [COLORS.white, COLORS.collect, COLORS.collectBlue],
      maxParticles: PARTICLE_LIMITS.lightning
    }).setDepth(14);

    const transform = PARTICLE_EFFECTS.transform;
    this.transformEmitters = new Map(Object.entries(FORM_COLORS).map(([form, color]) => {
      const emitter = this.scene.add.particles(0, 0, TEXTURE_KEYS.sparkle, {
        emitting: false,
        lifespan: transform.lifespan,
        speed: transform.speed,
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0.16 },
        alpha: { start: 1, end: 0 },
        rotate: { min: -220, max: 220 },
        tint: [color, COLORS.collect, COLORS.white],
        maxParticles: PARTICLE_LIMITS.transformPerForm
      }).setDepth(31);
      return [form, emitter];
    }));
  }

  emitLanding(x, y, impactSpeed = 0) {
    const impactLift = Math.min(8, Math.max(0, impactSpeed - 360) / 70);
    this.dustEmitter.setPosition(0, -impactLift);
    this.dustEmitter.emitParticleAt(x, y, PARTICLE_EFFECTS.landing.count);
  }

  emitMagnetTrail(id, from, to, now) {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    if (distance <= 0.5) return;

    const settings = PARTICLE_EFFECTS.magnet;
    const state = this.magnetStates.get(id) ?? { nextAt: 0, distance: 0, index: 0 };
    state.distance += distance;
    if (now < state.nextAt && state.distance < settings.distanceStep) {
      this.magnetStates.set(id, state);
      return;
    }

    const normalX = -(to.y - from.y) / distance;
    const normalY = (to.x - from.x) / distance;
    const wave = Math.sin(state.index * 1.7) * settings.lateralOffset;
    this.magnetEmitter.emitParticleAt(to.x + normalX * wave, to.y + normalY * wave, 1);
    state.nextAt = now + settings.intervalMs;
    state.distance = 0;
    state.index += 1;
    this.magnetStates.set(id, state);
  }

  clearMagnetTrail(id) {
    this.magnetStates.delete(id);
  }

  emitTransform(form, x, y, cue) {
    const emitter = this.transformEmitters.get(form);
    const color = FORM_COLORS[form];
    if (!emitter || !color || !cue) return;

    emitter.emitParticleAt(x, y, cue.burstCount);
    if (this.pulses.size >= PARTICLE_LIMITS.pulses) return;
    const pulse = this.scene.add.star(x, y, 8, 32, 42, color, 0.08)
      .setStrokeStyle(4, color, 0.95)
      .setDepth(30)
      .setScale(0.22);
    this.pulses.add(pulse);
    this.scene.tweens.add({
      targets: pulse,
      scale: 1.8,
      angle: 22,
      alpha: 0,
      duration: cue.emphasisMs + PARTICLE_EFFECTS.transform.pulseExtraMs,
      ease: "Cubic.Out",
      onComplete: () => {
        this.pulses.delete(pulse);
        pulse.destroy();
      }
    });
  }

  emitLightningImpact(x, y) {
    this.lightningEmitter.emitParticleAt(x, y, PARTICLE_EFFECTS.lightning.count);
  }

  getSnapshot() {
    const emitterSnapshot = (emitter) => ({
      activeCount: emitter?.getAliveParticleCount?.() ?? 0,
      size: emitter?.getParticleCount?.() ?? 0,
      maxSize: emitter?.maxParticles ?? 0
    });
    const emitters = {
      landing: emitterSnapshot(this.dustEmitter),
      magnet: emitterSnapshot(this.magnetEmitter),
      lightning: emitterSnapshot(this.lightningEmitter)
    };
    for (const [form, emitter] of this.transformEmitters ?? []) {
      emitters[`transform:${form}`] = emitterSnapshot(emitter);
    }
    const values = Object.values(emitters);

    return {
      magnetTrails: this.magnetStates.size,
      pulses: this.pulses.size,
      maxPulses: PARTICLE_LIMITS.pulses,
      emitters,
      totals: {
        activeCount: values.reduce((total, entry) => total + entry.activeCount, 0),
        size: values.reduce((total, entry) => total + entry.size, 0),
        maxSize: values.reduce((total, entry) => total + entry.maxSize, 0)
      }
    };
  }

  reset() {
    this.magnetStates.clear();
    this.dustEmitter?.killAll();
    this.magnetEmitter?.killAll();
    this.lightningEmitter?.killAll();
    for (const emitter of this.transformEmitters?.values() ?? []) emitter.killAll();
    for (const pulse of this.pulses) {
      this.scene.tweens.killTweensOf(pulse);
      pulse.destroy();
    }
    this.pulses.clear();
  }

  destroy() {
    this.reset();
    this.dustEmitter?.destroy();
    this.magnetEmitter?.destroy();
    this.lightningEmitter?.destroy();
    for (const emitter of this.transformEmitters?.values() ?? []) emitter.destroy();
    this.transformEmitters?.clear();
    this.scene = null;
  }
}
