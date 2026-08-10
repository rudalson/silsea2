import { COLORS, EVENTS, GAME_HEIGHT, GAME_WIDTH } from "../config/constants.js";
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
  silsea: Object.freeze({ hornX: 30, hornY: -82, wingsX: -7, wingsY: -61 }),
  potato89: Object.freeze({ hornX: 18, hornY: -82, wingsX: -5, wingsY: -57 })
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
    this.createVisuals();
  }

  createVisuals() {
    this.horn = this.scene.add.image(0, 0, "item_horn")
      .setDisplaySize(18, 24)
      .setOrigin(0.5, 1)
      .setDepth(12)
      .setVisible(false);
    this.wings = this.scene.add.image(0, 0, "item_wings")
      .setDisplaySize(128, 73)
      .setDepth(9)
      .setVisible(false);
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
    this.form = form;
    this.formVisualTimer?.remove(false);
    this.formVisualTimer = null;
    this.rainbowOverlay.setVisible(form === FORMS.ALICORN);
    const animationMs = emphasize ? this.player.playTransformAnimation?.(form) ?? 0 : 0;
    if (animationMs > 0) {
      this.horn.setVisible(false);
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
    const hasHorn = this.form === FORMS.UNICORN || this.form === FORMS.ALICORN;
    const hasWings = this.form === FORMS.PEGASUS || this.form === FORMS.ALICORN;
    this.horn.setVisible(hasHorn);
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

  prepareMovement(input, delta) {
    const grounded = this.player.body.blocked.down || this.player.body.touching.down;
    const canFly = this.form === FORMS.PEGASUS || this.form === FORMS.ALICORN;
    const wantsFlight = canFly && !grounded && input.jumpDown;

    if (this.form === FORMS.PEGASUS) {
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
    } else if (grounded) {
      this.flightMs = stepFlightGauge(this.flightMs, delta, { grounded: true });
    }

    if (this.form === FORMS.ALICORN && wantsFlight) this.lastMode = "fly";
    else if (this.form === FORMS.PEGASUS && wantsFlight && this.flightMs > 0) this.lastMode = "fly";
    else if (this.form === FORMS.PEGASUS && !grounded && this.flightMs <= 0) this.lastMode = "glide";
    else this.lastMode = "normal";

    return { mode: this.lastMode, moveY: input.moveY };
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
    this.horn.setPosition(this.player.x + direction * layout.hornX, this.player.y + layout.hornY);
    this.wings.setPosition(this.player.x + direction * layout.wingsX, this.player.y + layout.wingsY);
    if (!this.formVisualTimer) {
      const animationKey = this.player.anims.currentAnim?.key ?? "";
      const hasHorn = this.form === FORMS.UNICORN || this.form === FORMS.ALICORN;
      const hasWings = this.form === FORMS.PEGASUS || this.form === FORMS.ALICORN;
      const integratedHorn = animationKey.endsWith(":transform_unicorn") || animationKey.endsWith(":transform_alicorn");
      const integratedWings = animationKey.endsWith(":fly")
        || animationKey.endsWith(":transform_pegasus")
        || animationKey.endsWith(":transform_alicorn");
      this.horn.setVisible(hasHorn && !integratedHorn);
      this.wings.setVisible(hasWings && !integratedWings);
    }
    if (this.rainbowOverlay.visible) this.rainbowOverlay.setAlpha(0.07 + Math.sin(now / 120) * 0.025);
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
      alicornRemainingMs: this.form === FORMS.ALICORN ? Math.max(0, this.alicornEndsAt - now) : 0
    };
  }

  destroy() {
    this.transformReleaseTimer?.remove(false);
    this.cameraResetTimer?.remove(false);
    this.formVisualTimer?.remove(false);
    this.finishTransformPresentation();
    if (this.savedCameraZoom !== undefined) this.scene.cameras.main.setZoom(this.savedCameraZoom);
    this.horn.destroy();
    this.wings.destroy();
    this.rainbowOverlay.destroy();
  }
}
