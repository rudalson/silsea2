import Phaser from "phaser";
import { COLORS, EVENTS, GAME_HEIGHT, GAME_WIDTH } from "../config/constants.js";
import { CORE_RULES, FORMS, stepFlightGauge } from "../data/gameplay.js";

const ITEM_TO_FORM = Object.freeze({
  horn: FORMS.UNICORN,
  wings: FORMS.PEGASUS,
  alicorn: FORMS.ALICORN
});

export class TransformationManager {
  constructor(scene, player, levelLoader) {
    this.scene = scene;
    this.player = player;
    this.levelLoader = levelLoader;
    this.form = FORMS.BASE;
    this.returnForm = FORMS.BASE;
    this.flightMs = CORE_RULES.flightMaxMs;
    this.alicornEndsAt = 0;
    this.warningSent = false;
    this.flightLowSent = false;
    this.lastMode = "normal";
    this.createVisuals();
  }

  createVisuals() {
    this.horn = this.scene.add.triangle(0, 0, 0, 22, 8, 0, 16, 22, COLORS.collect)
      .setStrokeStyle(3, COLORS.outline)
      .setOrigin(0.5, 1)
      .setDepth(12)
      .setVisible(false);
    this.leftWing = this.scene.add.ellipse(0, 0, 38, 20, COLORS.collectBlue, 0.9)
      .setStrokeStyle(3, COLORS.outline)
      .setDepth(9)
      .setVisible(false);
    this.rightWing = this.scene.add.ellipse(0, 0, 38, 20, COLORS.collectBlue, 0.9)
      .setStrokeStyle(3, COLORS.outline)
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
    const hasHorn = form === FORMS.UNICORN || form === FORMS.ALICORN;
    const hasWings = form === FORMS.PEGASUS || form === FORMS.ALICORN;
    this.horn.setVisible(hasHorn);
    this.leftWing.setVisible(hasWings);
    this.rightWing.setVisible(hasWings);
    this.rainbowOverlay.setVisible(form === FORMS.ALICORN);
    if (emphasize) {
      this.scene.cameras.main.flash(150, 245, 223, 79);
      this.scene.time.timeScale = 0.4;
      this.scene.time.delayedCall(70, () => {
        this.scene.time.timeScale = 1;
      });
    }
    this.scene.events.emit(EVENTS.FORM_CHANGED, { form, flightMs: this.flightMs, emphasize });
  }

  prepareMovement(input, delta) {
    const grounded = this.player.body.blocked.down || this.player.body.touching.down;
    const canFly = this.form === FORMS.PEGASUS || this.form === FORMS.ALICORN;
    const wantsFlight = canFly && !grounded && input.jumpDown;

    if (this.form === FORMS.PEGASUS) {
      this.flightMs = stepFlightGauge(this.flightMs, delta, {
        grounded,
        flying: wantsFlight && this.flightMs > 0
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
    this.horn.setPosition(this.player.x + direction * 18, this.player.y - 82).setFlipX(direction < 0);
    this.leftWing.setPosition(this.player.x - 28, this.player.y - 50).setRotation(-0.35);
    this.rightWing.setPosition(this.player.x + 28, this.player.y - 50).setRotation(0.35);
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
    return this.form === FORMS.ALICORN;
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
    this.scene.time.timeScale = 1;
    this.horn.destroy();
    this.leftWing.destroy();
    this.rightWing.destroy();
    this.rainbowOverlay.destroy();
  }
}
