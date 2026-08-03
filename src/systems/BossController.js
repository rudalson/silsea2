import Phaser from "phaser";
import { COLORS, EVENTS } from "../config/constants.js";
import { CORE_RULES } from "../data/gameplay.js";
import { ObjectPool } from "./ObjectPool.js";
import { SeededRandom } from "./SeededRandom.js";

export class BossController {
  constructor(scene, player, levelLoader, healthManager, transformationManager, scoreManager, seed = 8901) {
    this.scene = scene;
    this.player = player;
    this.levelLoader = levelLoader;
    this.healthManager = healthManager;
    this.transformationManager = transformationManager;
    this.scoreManager = scoreManager;
    this.boss = levelLoader.boss;
    this.random = new SeededRandom(seed);
    this.state = "idle";
    this.stateUntil = scene.time.now + 900;
    this.interactions = [];
    this.defeated = false;
    if (!this.boss) return;

    this.baseY = this.boss.y;
    this.telegraphShadow = this.scene.add.ellipse(this.boss.x, this.baseY - 4, 250, 28, COLORS.danger, 0.12)
      .setDepth(2)
      .setVisible(false);
    this.weakness = this.scene.add.star(this.boss.x, this.baseY - 154, 5, 10, 23, COLORS.collect)
      .setStrokeStyle(4, COLORS.outline)
      .setDepth(8)
      .setVisible(false);
    this.projectilePool = this.createProjectilePool();
    this.onBossHit = ({ hp }) => this.handleBossHit(hp);
    this.onBossDefeated = () => this.handleDefeated();
    this.scene.events.on(EVENTS.BOSS_HIT, this.onBossHit);
    this.scene.events.on(EVENTS.BOSS_DEFEATED, this.onBossDefeated);
  }

  createProjectilePool() {
    return new ObjectPool({
      maxSize: 16,
      create: () => {
        const projectile = this.scene.add.rectangle(0, 0, 72, 24, COLORS.dangerAlt, 0.92)
          .setStrokeStyle(4, COLORS.outline)
          .setDepth(6)
          .setVisible(false);
        this.scene.physics.add.existing(projectile);
        projectile.body.setAllowGravity(false);
        projectile.body.enable = false;
        this.interactions.push(this.scene.physics.add.overlap(this.player, projectile, () => {
          if (!projectile.poolActive || !this.isOnScreen(projectile)) return;
          this.healthManager.takeDamage(projectile.x);
          this.projectilePool.release(projectile);
        }));
        return projectile;
      },
      activate: (projectile, data) => {
        projectile.expiresAt = data.expiresAt;
        projectile.setPosition(data.x, data.y).setVisible(true).setActive(true);
        projectile.body.enable = true;
        projectile.body.reset(data.x, data.y);
        projectile.body.setVelocity(data.velocityX, 0);
      },
      deactivate: (projectile) => {
        projectile.setVisible(false).setActive(false);
        projectile.body.enable = false;
        projectile.body.stop();
      },
      destroy: (projectile) => projectile.destroy()
    });
  }

  update(now) {
    if (!this.boss?.active || this.defeated) return;
    this.weakness.setPosition(this.boss.x, this.boss.y - 154).setRotation(this.weakness.rotation + 0.03);
    this.telegraphShadow.setPosition(this.boss.x, this.baseY - 4);

    const section = this.boss.getData("section");
    const inArena = this.player.x >= section.xStart && this.player.x < section.xEnd;
    if (!inArena || !this.isOnScreen(this.boss)) {
      this.cancelAttack();
      return;
    }

    if (this.state === "idle" && now >= this.stateUntil) this.beginTelegraph(now);
    else if (this.state === "telegraph" && now >= this.stateUntil) this.executeAttack(now);
    else if (this.state === "vulnerable" && now >= this.stateUntil) this.closeWeakness(now);

    this.projectilePool.forEachActive((projectile) => {
      if (now >= projectile.expiresAt || !this.isOnScreen(projectile, 96)) this.projectilePool.release(projectile);
    });
  }

  beginTelegraph(now) {
    const phase = this.boss.getData("phase");
    const telegraphMs = CORE_RULES.bossTelegraphMs + (phase === 1 ? 100 : 0);
    this.state = "telegraph";
    this.stateUntil = now + telegraphMs;
    this.boss.setData("vulnerable", false);
    this.boss.setTintFill(COLORS.danger);
    this.telegraphShadow.setVisible(true).setAlpha(0.2);
    this.scene.tweens.add({
      targets: this.boss,
      y: this.baseY - (phase === 1 ? 92 : 68),
      duration: Math.floor(telegraphMs * 0.46),
      yoyo: true,
      ease: "Sine.InOut"
    });
    this.scene.tweens.add({
      targets: this.telegraphShadow,
      scaleX: 1.35,
      alpha: 0.62,
      duration: telegraphMs,
      ease: "Sine.In"
    });
  }

  executeAttack(now) {
    const phase = this.boss.getData("phase");
    const toward = this.player.x < this.boss.x ? -1 : 1;
    const speed = 285 + phase * 55;
    const patterns = phase === 1
      ? [[toward]]
      : phase === 2
        ? [[toward, -toward]]
        : [[-1, 1, toward], [toward, -toward, toward]];
    const directions = this.random.pick(patterns);

    this.boss.clearTint().setY(this.baseY);
    this.telegraphShadow.setVisible(false).setScale(1).setAlpha(0.2);
    this.scene.cameras.main.shake(phase === 1 ? 90 : 130, phase === 1 ? 0.002 : 0.003);
    directions.forEach((direction, index) => {
      this.projectilePool.acquire({
        x: this.boss.x + direction * (86 + index * 18),
        y: this.baseY - 18 - (phase === 3 && index === 2 ? 50 : 0),
        velocityX: direction * speed,
        expiresAt: now + 4200
      });
    });

    this.state = "vulnerable";
    this.stateUntil = now + (phase === 1 ? 1650 : phase === 2 ? 1350 : 1150);
    this.boss.setData("vulnerable", true);
    this.weakness.setVisible(true);
  }

  closeWeakness(now) {
    this.boss.setData("vulnerable", false);
    this.weakness.setVisible(false);
    this.state = "idle";
    this.stateUntil = now + 700;
  }

  handleBossHit(hp) {
    this.scoreManager.defeat("boss_hit", this.transformationManager.scoreMultiplier);
    this.boss?.setData("vulnerable", false);
    this.weakness?.setVisible(false);
    this.projectilePool?.releaseAll();
    if (hp > 0) {
      this.state = "idle";
      this.stateUntil = this.scene.time.now + 850;
    }
  }

  handleDefeated() {
    this.defeated = true;
    this.state = "defeated";
    this.projectilePool?.releaseAll();
    this.telegraphShadow?.setVisible(false);
    this.weakness?.setVisible(false);
    this.scene.tweens.killTweensOf(this.boss);
  }

  cancelAttack() {
    if (this.state !== "telegraph") return;
    this.scene.tweens.killTweensOf(this.boss);
    this.scene.tweens.killTweensOf(this.telegraphShadow);
    this.boss.clearTint().setY(this.baseY).setData("vulnerable", false);
    this.telegraphShadow.setVisible(false).setScale(1);
    this.state = "idle";
    this.stateUntil = this.scene.time.now + 500;
  }

  isOnScreen(object, margin = 0) {
    const source = this.scene.cameras.main.worldView;
    const view = new Phaser.Geom.Rectangle(source.x, source.y, source.width, source.height);
    Phaser.Geom.Rectangle.Inflate(view, margin, margin);
    return Phaser.Geom.Rectangle.Contains(view, object.x, object.y);
  }

  destroy() {
    if (!this.boss) return;
    this.scene.events.off(EVENTS.BOSS_HIT, this.onBossHit);
    this.scene.events.off(EVENTS.BOSS_DEFEATED, this.onBossDefeated);
    this.scene.tweens.killTweensOf(this.boss);
    for (const interaction of this.interactions) interaction?.destroy();
    this.interactions.length = 0;
    this.projectilePool.destroy();
    this.telegraphShadow.destroy();
    this.weakness.destroy();
  }
}
