import { BOSS_MOTION_PROFILES, identityBossPose, sampleBossPose } from "../data/bossMotion.js";

export function createBossMotionPresenter(scene, boss) {
  if (!boss?.getData("usesArt") || !Object.hasOwn(BOSS_MOTION_PROFILES, boss.getData("key"))) return null;
  return new BossMotionPresenter(scene, boss);
}

export class BossMotionPresenter {
  constructor(scene, boss) {
    this.scene = scene;
    this.boss = boss;
    this.displayList = boss.displayList;
    this.state = "dormant";
    this.elapsedMs = 0;
    this.pose = identityBossPose();
    this.destroyed = false;
    this.image = scene.add.image(boss.x, boss.y, boss.texture.key, boss.frame.name);
    this.image.name = `boss-motion-${boss.getData("key")}`;
    // Keep the source sprite in the UpdateList for pose animations, and in the
    // physics world for contacts. Only this bodyless image is rendered.
    boss.removeFromDisplayList();
    boss.addToUpdateList();
    this.update(0, null);
  }

  update(delta, behavior, { frozen = false } = {}) {
    const boss = this.boss;
    if (this.destroyed || !boss.scene) return;
    const state = boss.getData("bossState") ?? "dormant";
    if (state !== this.state) { this.state = state; this.elapsedMs = 0; }
    else if (!frozen && boss.visible) this.elapsedMs += Math.max(0, delta);
    this.pose = sampleBossPose(boss.getData("key"), state, this.elapsedMs, {
      durationMs: behavior?.durationMs,
      direction: behavior?.direction ?? (boss.flipX ? -1 : 1),
      reduced: this.scene.registry.get("screenEffectStrength") === "reduced",
      still: state === "rhythm" && behavior?.rest?.phase === "stop"
    });
    const { image, pose } = this;
    if (image.texture.key !== boss.texture.key || image.frame.name !== boss.frame.name) image.setTexture(boss.texture.key, boss.frame.name);
    image.setOrigin(boss.originX, boss.originY)
      .setPosition(boss.x + pose.offsetX, boss.y + pose.offsetY)
      .setScale(boss.scaleX * pose.scaleX, boss.scaleY * pose.scaleY)
      .setAngle(boss.angle + pose.angle)
      .setFlip(boss.flipX, boss.flipY)
      .setDepth(boss.depth)
      .setAlpha(boss.alpha * pose.alpha)
      .setVisible(boss.visible);
    if (boss.isTinted) {
      const method = boss.tintFill ? "setTintFill" : "setTint";
      image[method](boss.tintTopLeft, boss.tintTopRight, boss.tintBottomLeft, boss.tintBottomRight);
    } else image.clearTint();
  }

  getSnapshot() {
    return { state: this.state, elapsedMs: this.elapsedMs, pose: { ...this.pose }, visible: this.image.visible };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.image.destroy();
    // Hot reload can dispose the presenter before the owning level. Restore the
    // source to its original list; normal level teardown will then destroy it.
    if (this.boss.scene && this.displayList) this.boss.addToDisplayList(this.displayList);
  }
}
