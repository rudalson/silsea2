import Phaser from "phaser";
import { COLORS } from "../../config/constants.js";
import { getBossPhasePattern } from "../../data/bossPatterns.js";
import { CORE_RULES } from "../../data/gameplay.js";
import { EnemyAnimationManager } from "../EnemyAnimationManager.js";
import { ObjectPool } from "../ObjectPool.js";

const PROJECTILE_STYLES = Object.freeze({
  ground: Object.freeze({
    textureKey: "boss_projectile_ground",
    width: 84,
    height: 60,
    hitWidth: 74,
    hitHeight: 24,
    bodyColor: COLORS.ground,
    accentColor: COLORS.danger,
    trailColor: COLORS.dangerAlt,
    rotationSpeed: 0.055,
    angle: 0
  }),
  sky: Object.freeze({
    textureKey: "boss_projectile_sky",
    width: 66,
    height: 64,
    hitWidth: 52,
    hitHeight: 28,
    bodyColor: COLORS.collectBlue,
    accentColor: COLORS.white,
    trailColor: COLORS.collect,
    rotationSpeed: 0.08,
    angle: 10
  }),
  rainbow: Object.freeze({
    textureKey: "boss_projectile_rainbow",
    width: 78,
    height: 58,
    hitWidth: 64,
    hitHeight: 22,
    bodyColor: COLORS.collectPink,
    accentColor: COLORS.collect,
    trailColor: COLORS.collectBlue,
    rotationSpeed: 0.045,
    angle: -8
  })
});

const resolveDirection = (direction, toward) => {
  if (direction === "left") return -1;
  if (direction === "right") return 1;
  if (direction === "away") return -toward;
  return toward;
};

export class PotatoKingBehavior {
  constructor(context) {
    Object.assign(this, context);
    this.boss = this.levelLoader.boss;
    this.state = "idle";
    this.stateUntil = this.scene.time.now + 900;
    this.interactions = [];
    this.volleyTimers = [];
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
    this.createProjectileTextures();
    this.projectilePool = this.createProjectilePool();
  }

  createProjectilePool() {
    return new ObjectPool({
      maxSize: 16,
      create: () => {
        const projectile = this.scene.physics.add.image(0, 0, PROJECTILE_STYLES.ground.textureKey)
          .setDepth(6)
          .setVisible(false);
        projectile.trail = this.scene.add.graphics().setDepth(5).setVisible(false);
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
        const style = PROJECTILE_STYLES[data.style] ?? PROJECTILE_STYLES.ground;
        projectile.expiresAt = data.expiresAt;
        projectile.projectileStyle = data.style ?? "ground";
        projectile.travelDirection = Math.sign(data.velocityX);
        projectile
          .setTexture(style.textureKey)
          .setScale(1)
          .setPosition(data.x, data.y)
          .setDisplaySize(style.width, style.height)
          .setAngle(style.angle * projectile.travelDirection)
          .setVisible(true)
          .setActive(true);
        projectile.body.enable = true;
        projectile.body.reset(data.x, data.y);
        projectile.body.setSize(style.hitWidth, style.hitHeight, true);
        projectile.body.setVelocity(data.velocityX, 0);
        projectile.trail.setVisible(true);
        this.drawProjectileTrail(projectile, this.scene.time.now);
      },
      deactivate: (projectile) => {
        projectile.setVisible(false).setActive(false).setScale(1).setAngle(0);
        projectile.trail.clear().setVisible(false);
        projectile.body.enable = false;
        projectile.body.stop();
      },
      destroy: (projectile) => {
        projectile.trail.destroy();
        projectile.destroy();
      }
    });
  }

  createProjectileTextures() {
    const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
    for (const style of Object.values(PROJECTILE_STYLES)) {
      if (this.scene.textures.exists(style.textureKey)) continue;
      graphics.clear();
      graphics.fillStyle(style.trailColor, 0.24).fillCircle(48, 48, 42);
      graphics.fillStyle(COLORS.outline, 1).fillEllipse(48, 53, 72, 58);
      graphics.fillStyle(style.bodyColor, 1).fillEllipse(48, 50, 64, 50);
      graphics.fillStyle(style.accentColor, 0.92).fillEllipse(48, 61, 47, 17);
      graphics.fillStyle(COLORS.outline, 1).fillCircle(38, 45, 5).fillCircle(58, 45, 5);
      graphics.fillStyle(COLORS.white, 1).fillCircle(39, 43, 1.8).fillCircle(59, 43, 1.8);
      graphics.fillStyle(COLORS.outline, 1).fillEllipse(48, 57, 12, 7);
      graphics.fillStyle(style.accentColor, 1).fillTriangle(45, 27, 49, 10, 53, 27);
      graphics.fillStyle(COLORS.collect, 1).fillCircle(48, 17, 4);
      graphics.generateTexture(style.textureKey, 96, 96);
    }
    graphics.destroy();
  }

  drawProjectileTrail(projectile, now) {
    const style = PROJECTILE_STYLES[projectile.projectileStyle] ?? PROJECTILE_STYLES.ground;
    const direction = projectile.travelDirection || 1;
    const trail = projectile.trail;
    trail.clear();
    for (let index = 0; index < 4; index += 1) {
      const distance = 24 + index * 13;
      const wobble = Math.sin(now / 65 + index * 1.8) * (index + 1) * 2;
      const size = Math.max(5, 14 - index * 2.4);
      trail.fillStyle(style.trailColor, 0.48 - index * 0.09);
      trail.fillEllipse(projectile.x - direction * distance, projectile.y + wobble, size * 1.7, size);
    }
    trail.fillStyle(COLORS.white, 0.76).fillCircle(projectile.x + direction * 25, projectile.y - 8, 3);
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
      const style = PROJECTILE_STYLES[projectile.projectileStyle] ?? PROJECTILE_STYLES.ground;
      projectile.setRotation(projectile.rotation + style.rotationSpeed * projectile.travelDirection);
      if (projectile.projectileStyle === "rainbow") {
        projectile.setScale(1, 0.9 + Math.sin(now / 55) * 0.16);
      }
      this.drawProjectileTrail(projectile, now);
      if (now >= projectile.expiresAt || !this.isOnScreen(projectile, 96)) this.projectilePool.release(projectile);
    });
  }

  beginTelegraph(now) {
    const phase = this.boss.getData("phase");
    const pattern = getBossPhasePattern(this.boss.getData("key"), phase);
    const telegraphMs = Math.round(
      (CORE_RULES.bossTelegraphMs + pattern.telegraphOffsetMs) * this.telegraphMultiplier
    );
    this.state = "telegraph";
    this.stateUntil = now + telegraphMs;
    this.boss.setData("vulnerable", false);
    this.boss.setTintFill(COLORS.danger);
    EnemyAnimationManager.play(this.boss, "jump", false);
    this.animationTimer?.remove(false);
    this.animationTimer = this.scene.time.delayedCall(Math.floor(telegraphMs * 0.46), () => {
      if (this.state === "telegraph") EnemyAnimationManager.play(this.boss, "fall", false);
      this.animationTimer = null;
    });
    this.scene.audioManager?.playSfx("sfx_boss_warning", { randomizeRate: false });
    this.telegraphShadow.setVisible(true).setAlpha(0.2);
    this.scene.tweens.add({
      targets: this.boss,
      y: this.baseY - pattern.jumpHeight,
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
    const pattern = getBossPhasePattern(this.boss.getData("key"), phase);

    this.boss.clearTint().setY(this.baseY);
    this.boss.setData("patternId", pattern.id);
    this.telegraphShadow.setVisible(false).setScale(1).setAlpha(0.2);
    const landAnimation = EnemyAnimationManager.play(this.boss, "land", false);
    this.animationTimer?.remove(false);
    if (landAnimation) {
      this.animationTimer = this.scene.time.delayedCall(landAnimation.durationMs, () => {
        if (this.state === "vulnerable") EnemyAnimationManager.play(this.boss, "attack", false);
        this.animationTimer = null;
      });
    }
    this.scene.audioManager?.playSfx("sfx_boss_land", { randomizeRate: false });
    this.scene.cameraEffects?.shake(phase === 1 ? "bossLandLight" : "bossLand");
    this.clearVolleyTimers();
    for (const volley of pattern.volleys) this.scheduleVolley(pattern, volley);

    this.state = "vulnerable";
    this.stateUntil = now + pattern.vulnerabilityMs;
    this.boss.setData("vulnerable", true);
    this.weakness.setVisible(true);
  }

  scheduleVolley(pattern, volley) {
    if (volley.delayMs <= 0) {
      this.spawnVolley(pattern, volley);
      return;
    }
    let timer = null;
    timer = this.scene.time.delayedCall(volley.delayMs, () => {
      this.volleyTimers = this.volleyTimers.filter((entry) => entry !== timer);
      if (this.state === "vulnerable" && this.boss?.active && !this.defeated) {
        this.spawnVolley(pattern, volley);
      }
    });
    this.volleyTimers.push(timer);
  }

  spawnVolley(pattern, volley) {
    const toward = this.player.x < this.boss.x ? -1 : 1;
    const launchTime = this.scene.time.now;
    const shots = volley.shuffleShots && this.random.next() < 0.5
      ? [...volley.shots].reverse()
      : volley.shots;
    shots.forEach((shot, index) => {
      const direction = resolveDirection(shot.direction, toward);
      this.projectilePool.acquire({
        x: this.boss.x + direction * (86 + index * 14),
        y: this.baseY - shot.laneOffset,
        velocityX: direction * pattern.projectileSpeed * (shot.speedMultiplier ?? 1),
        style: shot.style,
        expiresAt: launchTime + 4200
      });
    });
  }

  closeWeakness(now) {
    const phase = this.boss.getData("phase");
    const pattern = getBossPhasePattern(this.boss.getData("key"), phase);
    this.clearVolleyTimers();
    this.boss.setData("vulnerable", false);
    this.weakness.setVisible(false);
    this.state = "idle";
    this.stateUntil = now + pattern.recoveryMs;
    EnemyAnimationManager.play(this.boss, "idle");
  }

  handleBossHit(hp) {
    this.scoreManager.defeat("boss_hit", this.transformationManager.scoreMultiplier);
    this.boss?.setData("vulnerable", false);
    this.weakness?.setVisible(false);
    this.projectilePool?.releaseAll();
    this.clearVolleyTimers();
    this.animationTimer?.remove(false);
    this.animationTimer = null;
    EnemyAnimationManager.play(this.boss, "hurt", false);
    if (hp > 0) {
      this.state = "idle";
      this.stateUntil = this.scene.time.now + 850;
    }
  }

  onBossHit({ hp }) {
    this.handleBossHit(hp);
  }

  onBossDefeated() {
    this.handleDefeated();
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

  handleDefeated() {
    this.defeated = true;
    this.state = "defeated";
    this.projectilePool?.releaseAll();
    this.clearVolleyTimers();
    this.animationTimer?.remove(false);
    this.animationTimer = null;
    this.telegraphShadow?.setVisible(false);
    this.weakness?.setVisible(false);
    this.scene.tweens.killTweensOf(this.boss);
    const defeated = EnemyAnimationManager.play(this.boss, "defeated", false);
    if (defeated) {
      this.defeatTimer = this.scene.time.delayedCall(defeated.durationMs, () => {
        this.defeatTimer = null;
        this.boss?.setActive(false);
      });
    }
  }

  cancelAttack() {
    if (this.state !== "telegraph") return;
    this.scene.tweens.killTweensOf(this.boss);
    this.scene.tweens.killTweensOf(this.telegraphShadow);
    this.boss.clearTint().setY(this.baseY).setData("vulnerable", false);
    this.telegraphShadow.setVisible(false).setScale(1);
    this.state = "idle";
    this.stateUntil = this.scene.time.now + 500;
    EnemyAnimationManager.play(this.boss, "idle");
  }

  clearVolleyTimers() {
    for (const timer of this.volleyTimers) timer?.remove(false);
    this.volleyTimers.length = 0;
  }

  isOnScreen(object, margin = 0) {
    const source = this.scene.cameras.main.worldView;
    const view = new Phaser.Geom.Rectangle(source.x, source.y, source.width, source.height);
    Phaser.Geom.Rectangle.Inflate(view, margin, margin);
    return Phaser.Geom.Rectangle.Contains(view, object.x, object.y);
  }

  getPoolSnapshot() {
    return {
      bossProjectile: this.projectilePool?.getSnapshot() ?? null
    };
  }

  destroy() {
    if (!this.boss) return;
    this.animationTimer?.remove(false);
    this.clearVolleyTimers();
    this.scene.tweens.killTweensOf(this.boss);
    for (const interaction of this.interactions) interaction?.destroy();
    this.interactions.length = 0;
    this.defeatTimer?.remove(false);
    this.projectilePool?.destroy();
    this.telegraphShadow?.destroy();
    this.weakness?.destroy();
  }
}
