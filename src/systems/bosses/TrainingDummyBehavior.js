import { COLORS } from "../../config/constants.js";

export class TrainingDummyBehavior {
  constructor(context) {
    Object.assign(this, context);
    this.boss = this.levelLoader.boss;
    this.defeated = false;
    if (!this.boss) return;
    this.weakness = this.scene.add.star(this.boss.x, this.boss.y - 154, 5, 10, 23, COLORS.collect)
      .setStrokeStyle(4, COLORS.outline)
      .setDepth(8)
      .setVisible(false);
    this.openTimer = this.scene.time.delayedCall(500, () => this.openWeakness());
  }

  openWeakness() {
    this.openTimer = null;
    if (!this.boss?.active || this.defeated) return;
    this.boss.setData("vulnerable", true);
    this.weakness.setVisible(true);
  }

  update() {
    if (!this.boss?.active || this.defeated) return;
    this.weakness
      .setPosition(this.boss.x, this.boss.y - 154)
      .setRotation(this.weakness.rotation + 0.03);
  }

  onPlayerContact({ fallingOntoHead, attemptHit, damagePlayer }) {
    if (!fallingOntoHead) {
      damagePlayer();
      return { didHit: false };
    }
    const didHit = attemptHit();
    if (!didHit) damagePlayer();
    return { didHit };
  }

  onBossHit({ hp }) {
    this.scoreManager.defeat("boss_hit", this.transformationManager.scoreMultiplier);
    this.boss?.setData("vulnerable", false);
    this.weakness?.setVisible(false);
    this.openTimer?.remove(false);
    this.openTimer = null;
    if (hp > 0) this.openTimer = this.scene.time.delayedCall(700, () => this.openWeakness());
  }

  onBossDefeated() {
    this.defeated = true;
    this.boss?.setData("vulnerable", false);
    this.weakness?.setVisible(false);
    this.openTimer?.remove(false);
    this.openTimer = null;
    this.scene.tweens.killTweensOf(this.boss);
    this.defeatTimer = this.scene.time.delayedCall(300, () => {
      this.defeatTimer = null;
      this.boss?.setActive(false);
    });
  }

  getPoolSnapshot() {
    return {};
  }

  destroy() {
    this.openTimer?.remove(false);
    this.defeatTimer?.remove(false);
    this.scene.tweens.killTweensOf(this.boss);
    this.weakness?.destroy();
  }
}
