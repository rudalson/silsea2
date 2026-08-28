import { COLORS, EVENTS, GAME_HEIGHT, GAME_WIDTH } from "../config/constants.js";
import { GUARD_PHASES, GUARD_RULES, isInsideGuardArc } from "../data/combatDevices.js";
import { CORE_RULES, FORMS, TRANSFORM_PRESENTATION, stepFlightGauge } from "../data/gameplay.js";

const ITEM_TO_FORM = Object.freeze({
  horn: FORMS.UNICORN,
  wings: FORMS.PEGASUS,
  alicorn: FORMS.ALICORN
});

const FORM_COLORS = Object.freeze({
  [FORMS.UNICORN]: COLORS.collect,
  [FORMS.PEGASUS]: COLORS.collectBlue,
  [FORMS.ALICORN]: COLORS.collectPink
});

const ATTACHMENT_LAYOUT = Object.freeze({
  silsea: Object.freeze({ wingsX: -7, wingsY: -61 }),
  potato89: Object.freeze({ wingsX: -5, wingsY: -57 })
});

const toRgb = (color) => [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];

export const TRANSFORM_CAMERA_EASING = Object.freeze({
  emphasize: (progress) => Math.sin((progress * Math.PI) / 2),
  restore: (progress) => (1 - Math.cos(Math.PI * progress)) / 2
});

export class TransformationManager {
  constructor(scene, player, levelLoader, difficulty = {}) {
    this.scene = scene;
    this.player = player;
    this.levelLoader = levelLoader;
    this.flightDrainMultiplier = difficulty.player?.flightDrainMultiplier ?? 1;
    this.form = FORMS.BASE;
    this.returnForm = FORMS.BASE;
    this.flightMs = CORE_RULES.flightMaxMs;
    this.alicornEndsAt = 0;
    this.warningSent = false;
    this.flightLowSent = false;
    this.lastMode = "normal";
    this.transforming = false;
    this.guardPhase = GUARD_PHASES.IDLE;
    this.guardActiveAt = 0;
    this.guardCooldownUntil = 0;
    this.guardMustRelease = false;
    this.guardEffects = new Set();
    this.visualReviewGuardMode = [GUARD_PHASES.WINDUP, GUARD_PHASES.ACTIVE].includes(
      scene.registry.get("visualReviewGuardMode")
    ) ? scene.registry.get("visualReviewGuardMode") : null;
    this.createVisuals();
  }

  createVisuals() {
    this.wings = this.scene.add.image(0, 0, "item_wings")
      .setDisplaySize(128, 73)
      .setDepth(9)
      .setVisible(false);
    this.guardVisual = this.scene.add.graphics().setDepth(12).setVisible(false);
    this.rainbowOverlay = this.scene.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      COLORS.collectPink,
      0.1
    ).setScrollFactor(0).setDepth(30).setVisible(false);
  }

  collect(itemType, now) {
    const nextForm = ITEM_TO_FORM[itemType];
    if (!nextForm) return false;
    if (nextForm === FORMS.ALICORN) {
      this.returnForm = this.form === FORMS.ALICORN ? this.returnForm : this.form;
      this.alicornEndsAt = now + CORE_RULES.alicornDurationMs;
      this.warningSent = false;
    }
    this.setForm(nextForm, true);
    return true;
  }

  setForm(form, emphasize = false) {
    if (form !== FORMS.PEGASUS && form !== FORMS.ALICORN) this.stopGuard(this.scene.time.now, false);
    this.form = form;
    this.formVisualTimer?.remove(false);
    this.formVisualTimer = null;
    this.rainbowOverlay.setVisible(form === FORMS.ALICORN);
    const animationMs = emphasize ? this.player.playTransformAnimation?.(form) ?? 0 : 0;
    if (animationMs > 0) {
      this.wings.setVisible(false);
      this.formVisualTimer = this.scene.time.delayedCall(animationMs, () => {
        this.syncFormVisuals();
        this.formVisualTimer = null;
      });
    } else {
      this.syncFormVisuals();
    }
    if (emphasize) this.playTransformPresentation(form);
    this.scene.events.emit(EVENTS.FORM_CHANGED, { form, flightMs: this.flightMs, emphasize });
  }

  syncFormVisuals() {
    const hasWings = this.form === FORMS.PEGASUS || this.form === FORMS.ALICORN;
    this.player.setVisualForm?.(this.form);
    this.wings.setVisible(hasWings);
  }

  playTransformPresentation(form) {
    const cue = TRANSFORM_PRESENTATION[form];
    if (!cue) return;
    this.transformReleaseTimer?.remove(false);
    this.cameraResetTimer?.remove(false);

    if (!this.transforming) {
      this.transforming = true;
      this.savedTransformMotion = {
        x: this.player.body.velocity.x,
        y: this.player.body.velocity.y,
        moves: this.player.body.moves
      };
      this.savedCameraZoom = this.scene.cameras.main.zoom;
    }

    this.player.body.moves = false;
    this.player.setVelocity(0, 0);
    this.player.controlLockedUntil = Math.max(this.player.controlLockedUntil ?? 0, this.scene.time.now + cue.holdMs);
    this.player.setTintFill(FORM_COLORS[form]);

    const camera = this.scene.cameras.main;
    const [red, green, blue] = toRgb(FORM_COLORS[form]);
    camera.flash(cue.emphasisMs, red, green, blue);
    camera.zoomTo(
      cue.zoom,
      Math.floor(cue.emphasisMs * 0.45),
      TRANSFORM_CAMERA_EASING.emphasize,
      true
    );
    this.cameraResetTimer = this.scene.time.delayedCall(Math.floor(cue.emphasisMs * 0.5), () => {
      camera.zoomTo(
        this.savedCameraZoom ?? 1,
        Math.ceil(cue.emphasisMs * 0.5),
        TRANSFORM_CAMERA_EASING.restore,
        true
      );
      this.cameraResetTimer = null;
    });
    this.scene.particleEffects?.emitTransform(form, this.player.x, this.player.y - 52, cue);

    this.transformReleaseTimer = this.scene.time.delayedCall(cue.holdMs, () => {
      this.finishTransformPresentation();
    });
  }

  finishTransformPresentation() {
    if (!this.transforming) return;
    const motion = this.savedTransformMotion;
    if (this.player?.body) {
      this.player.body.moves = motion?.moves ?? true;
      if (this.player.body.enable) this.player.setVelocity(motion?.x ?? 0, motion?.y ?? 0);
    }
    this.player?.clearTint();
    this.transforming = false;
    this.savedTransformMotion = null;
    this.transformReleaseTimer = null;
  }

  cancelPresentation() {
    this.transformReleaseTimer?.remove(false);
    this.transformReleaseTimer = null;
    this.cameraResetTimer?.remove(false);
    this.cameraResetTimer = null;
    const camera = this.scene?.cameras?.main;
    if (camera && this.savedCameraZoom !== undefined) camera.setZoom(this.savedCameraZoom);
    camera?.flashEffect?.reset?.();
    this.finishTransformPresentation();
  }

  prepareMovement(input, delta, { underwater = false } = {}) {
    const now = this.scene.time.now;
    const grounded = this.player.body.blocked.down || this.player.body.touching.down;
    const canFly = this.form === FORMS.PEGASUS || this.form === FORMS.ALICORN;
    if (this.visualReviewGuardMode && canFly && !underwater) {
      this.guardPhase = this.visualReviewGuardMode;
      this.guardActiveAt = now;
      this.lastMode = "guard";
      return {
        mode: this.lastMode,
        moveY: input.moveY,
        horizontalSpeedMultiplier: GUARD_RULES.moveSpeedMultiplier
      };
    }
    const guardHeld = canFly && !underwater && input.specialDown;
    if (!input.specialDown) this.guardMustRelease = false;
    const hasGuardEnergy = this.form === FORMS.ALICORN || this.flightMs > 0;
    if (guardHeld && hasGuardEnergy && !this.guardMustRelease && this.guardPhase === GUARD_PHASES.IDLE && now >= this.guardCooldownUntil) {
      this.guardPhase = GUARD_PHASES.WINDUP;
      this.guardActiveAt = now + GUARD_RULES.windupMs;
      this.emitGuardChanged();
    }
    if ((!guardHeld || this.guardMustRelease) && this.guardPhase !== GUARD_PHASES.IDLE) this.stopGuard(now);
    if (this.guardPhase === GUARD_PHASES.WINDUP && now >= this.guardActiveAt) {
      this.guardPhase = GUARD_PHASES.ACTIVE;
      this.emitGuardChanged();
    }
    const guarding = this.guardPhase !== GUARD_PHASES.IDLE;
    const wantsFlight = canFly && !underwater && !grounded && input.jumpDown && !guarding;

    if (this.form === FORMS.PEGASUS && guarding) {
      this.flightMs = stepFlightGauge(this.flightMs, delta, {
        flying: true,
        drainMultiplier: GUARD_RULES.drainMultiplier * this.flightDrainMultiplier
      });
      if (this.flightMs <= 0) {
        this.guardMustRelease = true;
        this.stopGuard(now);
      }
    } else if (this.form === FORMS.PEGASUS && !underwater) {
      this.flightMs = stepFlightGauge(this.flightMs, delta, {
        grounded,
        flying: wantsFlight && this.flightMs > 0,
        drainMultiplier: this.flightDrainMultiplier
      });
      if (!this.flightLowSent && this.flightMs > 0 && this.flightMs <= CORE_RULES.flightMaxMs * 0.2) {
        this.flightLowSent = true;
        this.scene.audioManager?.playSfx("sfx_flight_low", { randomizeRate: false });
      }
      if (grounded && this.flightMs > CORE_RULES.flightMaxMs * 0.25) this.flightLowSent = false;
    } else if (grounded && !underwater) {
      this.flightMs = stepFlightGauge(this.flightMs, delta, { grounded: true });
    }

    if (this.guardPhase !== GUARD_PHASES.IDLE) this.lastMode = "guard";
    else if (this.form === FORMS.ALICORN && wantsFlight) this.lastMode = "fly";
    else if (this.form === FORMS.PEGASUS && wantsFlight && this.flightMs > 0) this.lastMode = "fly";
    else if (this.form === FORMS.PEGASUS && !grounded && this.flightMs <= 0) this.lastMode = "glide";
    else this.lastMode = "normal";

    return {
      mode: this.lastMode,
      moveY: input.moveY,
      horizontalSpeedMultiplier: this.lastMode === "guard" ? GUARD_RULES.moveSpeedMultiplier : 1
    };
  }

  stopGuard(now = this.scene.time.now, applyCooldown = true) {
    if (this.guardPhase === GUARD_PHASES.IDLE) return;
    this.guardPhase = GUARD_PHASES.IDLE;
    this.guardActiveAt = 0;
    if (applyCooldown) this.guardCooldownUntil = Math.max(this.guardCooldownUntil, now + GUARD_RULES.cooldownMs);
    this.emitGuardChanged();
  }

  emitGuardChanged() {
    this.scene.events.emit(EVENTS.GUARD_CHANGED, {
      phase: this.guardPhase,
      active: this.guardPhase === GUARD_PHASES.ACTIVE,
      flightMs: this.flightMs
    });
  }

  canGuardProjectile(projectileX, projectileY) {
    if (this.guardPhase !== GUARD_PHASES.ACTIVE) return false;
    return isInsideGuardArc({
      playerX: this.player.x,
      playerY: this.player.y - 42,
      facing: this.player.flipX ? -1 : 1,
      projectileX,
      projectileY
    });
  }

  registerGuardImpact(x, y) {
    const sparkle = this.scene.add.star(x, y, 5, 4, 13, COLORS.collect, 0.96)
      .setStrokeStyle(3, COLORS.white, 0.94)
      .setDepth(14);
    this.guardEffects.add(sparkle);
    this.scene.tweens.add({
      targets: sparkle,
      scale: 1.8,
      alpha: 0,
      angle: 54,
      duration: 180,
      onComplete: () => {
        this.guardEffects.delete(sparkle);
        sparkle.destroy();
      }
    });
    this.scene.audioManager?.playSfx("sfx_projectile_guard", { randomizeRate: false });
    this.scene.events.emit(EVENTS.PROJECTILE_GUARDED, { x, y });
    this.scene.updateAccessibleStatus?.("날개로 투사체를 막았습니다.");
  }

  update(now) {
    if (this.form === FORMS.ALICORN) {
      const remaining = Math.max(0, this.alicornEndsAt - now);
      if (!this.warningSent && remaining <= CORE_RULES.alicornWarningMs) {
        this.warningSent = true;
        this.scene.events.emit(EVENTS.FORM_WARNING, { form: this.form, remaining });
      }
      if (remaining <= 0) this.endAlicornSafely();
    }
    this.updateVisualPositions(now);
  }

  updateVisualPositions(now) {
    const direction = this.player.flipX ? -1 : 1;
    const layout = ATTACHMENT_LAYOUT[this.player.character.id] ?? ATTACHMENT_LAYOUT.silsea;
    this.wings.setPosition(this.player.x + direction * layout.wingsX, this.player.y + layout.wingsY);
    if (!this.formVisualTimer) {
      const animationKey = this.player.anims.currentAnim?.key ?? "";
      const hasWings = this.form === FORMS.PEGASUS || this.form === FORMS.ALICORN;
      const integratedWings = animationKey.endsWith(":fly")
        || animationKey.endsWith(":unicorn:fly")
        || animationKey.endsWith(":transform_pegasus")
        || animationKey.endsWith(":transform_alicorn");
      this.wings.setVisible(hasWings && !integratedWings);
    }
    if (this.rainbowOverlay.visible) this.rainbowOverlay.setAlpha(0.07 + Math.sin(now / 120) * 0.025);
    this.drawGuardVisual(now, direction);
  }

  drawGuardVisual(now, direction) {
    this.guardVisual.clear();
    if (this.guardPhase === GUARD_PHASES.IDLE) {
      this.guardVisual.setVisible(false);
      return;
    }
    const active = this.guardPhase === GUARD_PHASES.ACTIVE;
    const centerX = this.player.x + direction * 28;
    const centerY = this.player.y - 43;
    const start = direction > 0 ? -1.2 : Math.PI - 1.2;
    const end = direction > 0 ? 1.2 : Math.PI + 1.2;
    const pulse = active ? 0.78 + Math.sin(now / 70) * 0.16 : 0.38;
    this.guardVisual
      .setVisible(true)
      .lineStyle(active ? 8 : 5, active ? COLORS.collectBlue : COLORS.white, pulse)
      .beginPath()
      .arc(centerX, centerY, 52, start, end, false)
      .strokePath();
    this.guardVisual.lineStyle(3, COLORS.collect, active ? 0.82 : 0.38);
    for (const offset of [-18, 0, 18]) {
      this.guardVisual.beginPath();
      this.guardVisual.moveTo(centerX + direction * 8, centerY + offset * 0.55);
      this.guardVisual.lineTo(centerX + direction * 43, centerY + offset);
      this.guardVisual.strokePath();
    }
  }

  endAlicornSafely() {
    const grounded = this.player.body.blocked.down || this.player.body.touching.down;
    if (!grounded) {
      const safe = this.levelLoader.findNearestSafePoint(this.player.x);
      this.player.setPosition(safe.x, safe.y - 2).setVelocity(0, 0);
    }
    this.alicornEndsAt = 0;
    this.setForm(this.returnForm, false);
  }

  restoreFlight() {
    this.flightMs = CORE_RULES.flightMaxMs;
    this.flightLowSent = false;
  }

  get magnetRadius() {
    if (this.form === FORMS.ALICORN) return CORE_RULES.alicornMagnetRadius;
    if (this.form === FORMS.UNICORN) return CORE_RULES.magnetRadius;
    return 0;
  }

  get scoreMultiplier() {
    return this.form === FORMS.ALICORN ? 2 : 1;
  }

  get invulnerable() {
    return this.transforming || this.form === FORMS.ALICORN;
  }

  get canBreakObstacles() {
    return this.form === FORMS.UNICORN || this.form === FORMS.ALICORN;
  }

  get canDestroyEnemies() {
    return this.form === FORMS.ALICORN;
  }

  getSnapshot(now) {
    return {
      form: this.form,
      flightMs: this.flightMs,
      flightMaxMs: CORE_RULES.flightMaxMs,
      guardPhase: this.guardPhase,
      guardActive: this.guardPhase === GUARD_PHASES.ACTIVE,
      guardCooldownRemainingMs: Math.max(0, this.guardCooldownUntil - now),
      alicornRemainingMs: this.form === FORMS.ALICORN ? Math.max(0, this.alicornEndsAt - now) : 0
    };
  }

  destroy() {
    this.formVisualTimer?.remove(false);
    this.cancelPresentation();
    for (const effect of this.guardEffects) effect.destroy();
    this.guardEffects.clear();
    this.wings.destroy();
    this.guardVisual.destroy();
    this.rainbowOverlay.destroy();
  }
}
