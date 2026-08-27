import Phaser from "phaser";
import { AssetManager } from "../systems/AssetManager.js";
import { CharacterAnimationManager } from "../systems/CharacterAnimationManager.js";
import { PlayerStateMachine } from "../systems/PlayerStateMachine.js";
import { FORMS } from "../data/gameplay.js";
import { moveTowards } from "../utils/math.js";

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, character, tuning) {
    const idle = CharacterAnimationManager.getSpec(character, "idle");
    const usesCharacterArt = Boolean(idle && scene.textures.exists(idle.textureKey));
    const texture = usesCharacterArt ? idle.textureKey : AssetManager.ensurePlayerTexture(scene, character);
    super(scene, x, y, texture);
    this.character = character;
    this.tuning = tuning;
    this.usesCharacterArt = usesCharacterArt;
    this.stateMachine = new PlayerStateMachine();
    this.lastGroundedAt = -Infinity;
    this.bufferedJumpUntil = -Infinity;
    this.wasGrounded = false;
    this.airborneLandingSpeed = 0;
    this.fallCuePlayed = false;
    this.lastAbilityMode = "normal";
    this.animationLockedUntil = 0;
    this.feedbackTween = null;
    this.visualVariant = "base";
    this.currentVisualSequence = "idle";

    scene.add.existing(this);
    scene.physics.add.existing(this);
    if (this.usesCharacterArt) {
      CharacterAnimationManager.register(scene, character);
      this.setOrigin(0.5, 112 / 128);
      this.setDisplaySize(128, 128);
      this.body.setSize(character.physics.bodyWidth, character.physics.bodyHeight, false);
      this.body.setOffset((128 - character.physics.bodyWidth) / 2, 112 - character.physics.bodyHeight);
      this.playCharacterAnimation("idle", { force: true });
    } else {
      this.setOrigin(0.5, 1);
      this.setDisplaySize(character.physics.displayWidth, character.physics.displayHeight);
      this.body.setSize(character.physics.bodyWidth, character.physics.bodyHeight, true);
    }
    this.baseScaleX = this.scaleX;
    this.baseScaleY = this.scaleY;
    // 월드 경계로 시작 지점의 왼쪽 밖 이동을 막는다. 낭떠러지 추락은
    // GameScene이 월드 하단 경계에 닿기 전에 감지해 체크포인트로 되돌린다.
    this.setCollideWorldBounds(true);
    this.setDepth(10);
  }

  updateControls(input, now, delta, ability = { mode: "normal", moveY: 0 }) {
    if (!this.body.enable) return;
    if (now < (this.controlLockedUntil ?? 0)) return;
    const swimming = ability.mode === "swim";
    const grounded = !swimming && (this.body.blocked.down || this.body.touching.down);
    if (swimming) {
      this.airborneLandingSpeed = 0;
      this.bufferedJumpUntil = -Infinity;
    }
    if (!grounded) this.airborneLandingSpeed = Math.max(this.airborneLandingSpeed, Math.max(0, this.body.velocity.y));
    if (grounded) this.lastGroundedAt = now;
    if (input.jumpPressed && !swimming) this.bufferedJumpUntil = now + this.tuning.jumpBuffer;

    const acceleration = swimming
      ? this.tuning.airAcceleration
      : grounded ? this.tuning.acceleration : this.tuning.airAcceleration;
    const speedMultiplier = swimming ? ability.horizontalSpeedMultiplier ?? 0.75 : 1;
    const targetVelocity = input.moveX * this.tuning.maxSpeed * speedMultiplier;
    const rate = input.moveX === 0 ? this.tuning.deceleration : acceleration;
    const nextVelocity = moveTowards(this.body.velocity.x, targetVelocity, (rate * delta) / 1000);
    this.setVelocityX(nextVelocity);

    if (Math.abs(input.moveX) > 0.05) this.setFlipX(input.moveX < 0);

    const canUseCoyote = now - this.lastGroundedAt <= this.tuning.coyoteTime;
    if (now <= this.bufferedJumpUntil && (grounded || canUseCoyote)) {
      this.performJump();
      this.bufferedJumpUntil = -Infinity;
      this.lastGroundedAt = -Infinity;
    }

    if (!swimming && input.jumpReleased && this.body.velocity.y < 0) {
      this.setVelocityY(this.body.velocity.y * this.tuning.jumpCutMultiplier);
    }

    if (swimming) {
      this.body.setGravityY(this.tuning.gravity * (ability.gravityMultiplier ?? 0.35));
      if (ability.stroke) this.setVelocityY(ability.strokeVelocity ?? -230);
      const maxFallSpeed = ability.maxFallSpeed ?? 260;
      if (this.body.velocity.y > maxFallSpeed) this.setVelocityY(maxFallSpeed);
    } else if (ability.mode === "fly") {
      this.body.setGravityY(0);
      const targetY = ability.moveY ? ability.moveY * 280 : -90;
      this.setVelocityY(moveTowards(this.body.velocity.y, targetY, (920 * delta) / 1000));
    } else if (ability.mode === "glide") {
      this.body.setGravityY(this.tuning.gravity * 0.18);
      if (this.body.velocity.y > 260) this.setVelocityY(260);
    } else {
      const gravityMultiplier = this.body.velocity.y > 0 ? this.tuning.fallGravityMultiplier : 1;
      this.body.setGravityY(this.tuning.gravity * gravityMultiplier);
      if (this.body.velocity.y > this.tuning.maxFallSpeed) this.setVelocityY(this.tuning.maxFallSpeed);
    }

    if (ability.mode !== this.lastAbilityMode) {
      if (ability.mode === "fly") this.scene.audioManager?.playLoop("sfx_fly_loop", { volume: 0.46 });
      if (this.lastAbilityMode === "fly") this.scene.audioManager?.stopLoop("sfx_fly_loop");
      if (ability.mode === "glide") this.scene.audioManager?.playSfx("sfx_glide");
      this.lastAbilityMode = ability.mode;
    }

    if (!grounded && this.body.velocity.y >= this.tuning.maxFallSpeed * 0.55 && !this.fallCuePlayed) {
      this.fallCuePlayed = true;
      this.scene.audioManager?.playSfx("sfx_fall_start", { volume: 0.7 });
    }
    if (grounded) this.fallCuePlayed = false;

    this.stateMachine.updateFromBody(this.body);
    if (grounded && !this.wasGrounded) {
      this.playLandingFeedback(this.airborneLandingSpeed);
      this.airborneLandingSpeed = 0;
    }
    this.updateCharacterAnimation(ability, now);
    this.wasGrounded = grounded;
  }

  performJump() {
    this.setVelocityY(this.tuning.jumpVelocity);
    this.playCharacterAnimation("jump");
    this.scene.audioManager?.playSfx("sfx_jump");
    this.playScaleFeedback(0.9, 1.15, 80, () => {
      this.scene.tweens.add({
        targets: this,
        scaleX: this.baseScaleX,
        scaleY: this.baseScaleY,
        duration: 110,
        ease: "Sine.Out"
      });
    });
  }

  playLandingFeedback(impactSpeed = 0) {
    this.playCharacterAnimation("land", { lockMs: 200 });
    this.scene.audioManager?.playSfx("sfx_land", { volume: 0.78 });
    this.playScaleFeedback(1.2, 0.8, 80, () => {
      this.scene.tweens.add({
        targets: this,
        scaleX: this.baseScaleX,
        scaleY: this.baseScaleY,
        duration: 120,
        ease: "Sine.Out"
      });
    });

    this.scene.particleEffects?.emitLanding(this.x, this.y - 4, impactSpeed);
  }

  playScaleFeedback(scaleX, scaleY, duration, onComplete) {
    this.feedbackTween?.stop();
    this.feedbackTween = this.scene.tweens.add({
      targets: this,
      scaleX: this.baseScaleX * scaleX,
      scaleY: this.baseScaleY * scaleY,
      duration,
      ease: "Sine.Out",
      onComplete
    });
  }

  updateCharacterAnimation(ability, now) {
    if (!this.usesCharacterArt || now < this.animationLockedUntil) return;
    if (ability.mode === "swim") {
      this.playCharacterAnimation("swim");
      return;
    }
    if (ability.mode === "fly") {
      this.playCharacterAnimation("fly");
      return;
    }
    if (this.stateMachine.state === "rising") {
      this.playCharacterAnimation("jump");
      return;
    }
    if (this.stateMachine.state === "falling") {
      this.playCharacterAnimation("fall");
      return;
    }
    this.playCharacterAnimation(Math.abs(this.body.velocity.x) > 28 ? "move" : "idle");
  }

  playCharacterAnimation(sequence, { force = false, lockMs = 0 } = {}) {
    if (!this.usesCharacterArt) return null;
    const now = this.scene.time.now;
    if (!force && now < this.animationLockedUntil) return null;
    const spec = CharacterAnimationManager.play(this, this.character, sequence, true, this.visualVariant);
    if (!spec) return null;
    this.currentVisualSequence = sequence;
    if (lockMs > 0) this.animationLockedUntil = Math.max(this.animationLockedUntil, now + lockMs);
    return spec;
  }

  playTransformAnimation(form) {
    const sequence = `transform_${form}`;
    const spec = CharacterAnimationManager.getSpec(this.character, sequence);
    if (!spec) return 0;
    this.playCharacterAnimation(sequence, { force: true, lockMs: spec.durationMs });
    return spec.durationMs;
  }

  playHurtAnimation() {
    const spec = CharacterAnimationManager.getSpec(this.character, "hurt");
    if (!spec) return 0;
    this.playCharacterAnimation("hurt", { force: true, lockMs: spec.durationMs });
    return spec.durationMs;
  }

  playVictoryAnimation() {
    this.animationLockedUntil = Infinity;
    return this.playCharacterAnimation("victory", { force: true });
  }

  setVisualForm(form) {
    const nextVariant = form === FORMS.UNICORN || form === FORMS.ALICORN ? "unicorn" : "base";
    if (nextVariant === this.visualVariant) return;
    this.visualVariant = nextVariant;
    if (!this.currentVisualSequence.startsWith("transform_")) {
      this.playCharacterAnimation(this.currentVisualSequence, { force: true });
    }
  }
}
