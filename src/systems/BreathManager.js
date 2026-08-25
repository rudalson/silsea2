import { EVENTS } from "../config/constants.js";
import { getWaterContact, stepBreathRatio } from "../data/environment.js";
import { FORMS } from "../data/gameplay.js";

const DEFAULT_PHYSICS = Object.freeze({
  gravityMultiplier: 0.35,
  maxFallSpeed: 260,
  horizontalSpeedMultiplier: 0.75,
  strokeVelocity: -230,
  strokeCooldown: 0.35
});

export class BreathManager {
  constructor(scene, player, environmentManager, healthManager, transformationManager, config = {}) {
    this.scene = scene;
    this.player = player;
    this.environmentManager = environmentManager;
    this.healthManager = healthManager;
    this.transformationManager = transformationManager;
    this.config = {
      depleteSeconds: config.depleteSeconds ?? 12,
      refillSeconds: config.refillSeconds ?? 2,
      damageInterval: config.damageInterval ?? 2.5,
      warningRatio: config.warningRatio ?? 0.3,
      surfaceMargin: config.surfaceMargin ?? 8,
      underwaterPhysics: { ...DEFAULT_PHYSICS, ...(config.underwaterPhysics ?? {}) }
    };
    this.ratio = 1;
    this.contact = { zone: null, underwater: false, aboveSurface: true };
    this.recovering = false;
    this.nextDamageAt = Number.POSITIVE_INFINITY;
    this.nextStrokeAt = 0;
    this.lowWarningSent = false;
    this.zeroStartedAt = null;
    this.onRespawn = () => this.restoreFull();
    this.scene.events.on(EVENTS.PLAYER_RESPAWNED, this.onRespawn);
    this.refreshWaterState();
    this.emitSnapshot();
  }

  refreshWaterState() {
    const previousZoneId = this.contact.zone?.id ?? null;
    const previousUnderwater = this.contact.underwater;
    const headY = this.player.body?.top ?? this.player.y - (this.player.displayHeight ?? 96);
    this.contact = getWaterContact(
      { x: this.player.x, headY },
      this.environmentManager.waterZones,
      this.config.surfaceMargin
    );
    this.recovering = !this.contact.underwater && (this.contact.aboveSurface || !this.contact.zone) && this.ratio < 1;
    const zoneId = this.contact.zone?.id ?? null;
    if (zoneId !== previousZoneId || this.contact.underwater !== previousUnderwater) {
      this.scene.events.emit(EVENTS.WATER_STATE_CHANGED, {
        zoneId,
        underwater: this.contact.underwater,
        aboveSurface: this.contact.aboveSurface
      });
      this.scene.audioManager?.playSfx(
        this.contact.underwater ? "sfx_splash_enter" : "sfx_splash_exit",
        { randomizeRate: false }
      );
    }
    return this.contact;
  }

  prepareMovement(input, now) {
    this.refreshWaterState();
    if (!this.contact.underwater) return null;
    const cooldownMs = Math.max(50, this.config.underwaterPhysics.strokeCooldown * 1000);
    const stroke = Boolean(input.jumpPressed && now >= this.nextStrokeAt);
    if (stroke) this.nextStrokeAt = now + cooldownMs;
    return {
      mode: "swim",
      moveY: input.moveY,
      stroke,
      ...this.config.underwaterPhysics
    };
  }

  update(now, delta) {
    const previousRatio = this.ratio;
    const previousUnderwater = this.contact.underwater;
    this.refreshWaterState();
    const immune = this.transformationManager.form === FORMS.ALICORN;
    this.ratio = stepBreathRatio(this.ratio, delta, {
      underwater: this.contact.underwater,
      recovering: this.recovering,
      immune,
      depleteSeconds: this.config.depleteSeconds,
      refillSeconds: this.config.refillSeconds
    });

    if (this.contact.underwater && !immune && this.ratio <= this.config.warningRatio && !this.lowWarningSent) {
      this.lowWarningSent = true;
      this.scene.audioManager?.playSfx("sfx_breath_low", { randomizeRate: false });
      this.scene.updateAccessibleStatus?.("숨이 얼마 남지 않았습니다. 물 표면 위로 올라가세요.");
    }

    if (this.ratio <= 0 && this.contact.underwater && !immune) {
      if (this.zeroStartedAt === null) {
        this.zeroStartedAt = now;
        this.nextDamageAt = now + this.config.damageInterval * 1000;
      }
      if (now >= this.nextDamageAt) {
        this.healthManager.takeEnvironmentDamage({ type: "breath" });
        this.nextDamageAt = now + this.config.damageInterval * 1000;
      }
    } else {
      this.zeroStartedAt = null;
      this.nextDamageAt = Number.POSITIVE_INFINITY;
    }

    if (this.recovering && previousRatio < 1 && this.ratio > previousRatio && !previousUnderwater) {
      if (!this.refillCuePlayed) {
        this.refillCuePlayed = true;
        this.scene.audioManager?.playSfx("sfx_breath_refill", { randomizeRate: false });
      }
    } else if (this.contact.underwater) {
      this.refillCuePlayed = false;
    }

    if (this.ratio >= 1) {
      this.lowWarningSent = false;
      this.refillCuePlayed = false;
    }
    if (this.ratio !== previousRatio || this.contact.underwater !== previousUnderwater) this.emitSnapshot();
  }

  restoreFull() {
    this.ratio = 1;
    this.lowWarningSent = false;
    this.refillCuePlayed = false;
    this.zeroStartedAt = null;
    this.nextDamageAt = Number.POSITIVE_INFINITY;
    this.emitSnapshot();
  }

  emitSnapshot() {
    this.scene.events.emit(EVENTS.BREATH_CHANGED, this.getSnapshot());
  }

  getSnapshot() {
    return {
      ratio: this.ratio,
      underwater: this.contact.underwater,
      recovering: this.recovering,
      zoneId: this.contact.zone?.id ?? null,
      warning: this.ratio <= this.config.warningRatio,
      depleted: this.ratio <= 0,
      nextDamageSeconds: Number.isFinite(this.nextDamageAt)
        ? Math.max(0, (this.nextDamageAt - this.scene.time.now) / 1000)
        : null
    };
  }

  destroy() {
    this.scene.events.off(EVENTS.PLAYER_RESPAWNED, this.onRespawn);
  }
}
