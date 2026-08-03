import Phaser from "phaser";
import { COLORS } from "../config/constants.js";
import { AssetManager } from "../systems/AssetManager.js";
import { PlayerStateMachine } from "../systems/PlayerStateMachine.js";

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, character, tuning) {
    const texture = AssetManager.ensurePlayerTexture(scene, character);
    super(scene, x, y, texture);
    this.character = character;
    this.tuning = tuning;
    this.stateMachine = new PlayerStateMachine();
    this.lastGroundedAt = -Infinity;
    this.bufferedJumpUntil = -Infinity;
    this.wasGrounded = false;
    this.feedbackTween = null;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.setDisplaySize(character.physics.displayWidth, character.physics.displayHeight);
    this.body.setSize(character.physics.bodyWidth, character.physics.bodyHeight, true);
    this.setCollideWorldBounds(false);
    this.setDepth(10);
  }

  updateControls(input, now, delta, ability = { mode: "normal", moveY: 0 }) {
    if (!this.body.enable) return;
    if (now < (this.controlLockedUntil ?? 0)) return;
    const grounded = this.body.blocked.down || this.body.touching.down;
    if (grounded) this.lastGroundedAt = now;
    if (input.jumpPressed) this.bufferedJumpUntil = now + this.tuning.jumpBuffer;

    const acceleration = grounded ? this.tuning.acceleration : this.tuning.airAcceleration;
    const targetVelocity = input.moveX * this.tuning.maxSpeed;
    const rate = input.moveX === 0 ? this.tuning.deceleration : acceleration;
    const nextVelocity = Phaser.Math.MoveTowards(this.body.velocity.x, targetVelocity, (rate * delta) / 1000);
    this.setVelocityX(nextVelocity);

    if (Math.abs(input.moveX) > 0.05) this.setFlipX(input.moveX < 0);

    const canUseCoyote = now - this.lastGroundedAt <= this.tuning.coyoteTime;
    if (now <= this.bufferedJumpUntil && (grounded || canUseCoyote)) {
      this.performJump();
      this.bufferedJumpUntil = -Infinity;
      this.lastGroundedAt = -Infinity;
    }

    if (input.jumpReleased && this.body.velocity.y < 0) {
      this.setVelocityY(this.body.velocity.y * this.tuning.jumpCutMultiplier);
    }

    if (ability.mode === "fly") {
      this.body.setGravityY(0);
      const targetY = ability.moveY ? ability.moveY * 280 : -90;
      this.setVelocityY(Phaser.Math.MoveTowards(this.body.velocity.y, targetY, (920 * delta) / 1000));
    } else if (ability.mode === "glide") {
      this.body.setGravityY(this.tuning.gravity * 0.18);
      if (this.body.velocity.y > 260) this.setVelocityY(260);
    } else {
      const gravityMultiplier = this.body.velocity.y > 0 ? this.tuning.fallGravityMultiplier : 1;
      this.body.setGravityY(this.tuning.gravity * gravityMultiplier);
      if (this.body.velocity.y > this.tuning.maxFallSpeed) this.setVelocityY(this.tuning.maxFallSpeed);
    }

    this.stateMachine.updateFromBody(this.body);
    if (grounded && !this.wasGrounded) this.playLandingFeedback();
    this.wasGrounded = grounded;
  }

  performJump() {
    this.setVelocityY(this.tuning.jumpVelocity);
    this.playScaleFeedback(0.9, 1.15, 80, () => {
      this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: 110, ease: "Sine.Out" });
    });
  }

  playLandingFeedback() {
    this.playScaleFeedback(1.2, 0.8, 80, () => {
      this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: 120, ease: "Sine.Out" });
    });

    for (const direction of [-1, 1]) {
      const dust = this.scene.add.circle(this.x + direction * 18, this.y - 4, 5, COLORS.soft, 0.7).setDepth(8);
      this.scene.tweens.add({
        targets: dust,
        x: dust.x + direction * 20,
        y: dust.y - 12,
        alpha: 0,
        scale: 0.4,
        duration: 260,
        onComplete: () => dust.destroy()
      });
    }
  }

  playScaleFeedback(scaleX, scaleY, duration, onComplete) {
    this.feedbackTween?.stop();
    this.feedbackTween = this.scene.tweens.add({
      targets: this,
      scaleX,
      scaleY,
      duration,
      ease: "Sine.Out",
      onComplete
    });
  }
}
