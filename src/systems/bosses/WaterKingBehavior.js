import Phaser from "phaser";
import { COLORS, CSS_COLORS } from "../../config/constants.js";
import { canHitWaterKing, chooseWaterPool, getBossPhasePattern } from "../../data/bossPatterns.js";
import { EnemyAnimationManager } from "../EnemyAnimationManager.js";
import { ObjectPool } from "../ObjectPool.js";

const PROJECTILE_TEXTURE_KEY = "boss_projectile_water";
const BODY_CENTER_OFFSET_Y = 62;
const EFFECTS = Object.freeze({
  ripple: { texture: "fx_water_king_ripple", frames: 6, duration: 620, repeat: -1 },
  projectile: { texture: "fx_water_king_projectile", frames: 4, duration: 360, repeat: -1 },
  splash: { texture: "fx_water_king_splash", frames: 6, duration: 540, repeat: 0 },
  dizzy: { texture: "fx_water_king_dizzy", frames: 4, duration: 560, repeat: -1 }
});

export class WaterKingBehavior {
  constructor(context) {
    Object.assign(this, context);
    this.boss = this.levelLoader.boss;
    this.state = "pool_hidden";
    this.stateUntil = Number.POSITIVE_INFINITY;
    this.currentPool = null;
    this.previousPoolId = null;
    this.projectileInteractions = [];
    this.defeated = false;
    if (!this.boss) return;

    const section = this.boss.getData("section");
    this.pools = section.boss.bossPools ?? [];
    if (this.pools.length < 3) throw new Error("물대왕은 보스 전용 웅덩이가 3개 이상 필요합니다.");
    if (this.pools.some((pool) => (
      !pool.id
      || !Number.isFinite(pool.x)
      || !Number.isFinite(pool.y)
      || pool.x < section.xStart + 96
      || pool.x > section.xEnd - 96
    ))) throw new Error("물대왕 보스 웅덩이가 arena 범위 밖에 있습니다.");

    this.boss.getData("label")?.setVisible(false);
    this.usesArt = Boolean(this.boss.getData("usesArt"));
    this.boss.setAlpha(0).setDepth(8);
    this.poolVisuals = this.pools.map((pool) => ({
      pool,
      water: this.scene.add.ellipse(pool.x, pool.y - 5, pool.width, pool.height, COLORS.collectBlue, 0.3)
        .setStrokeStyle(5, COLORS.outline, 0.9).setDepth(3),
      shine: this.scene.add.ellipse(pool.x, pool.y - 11, pool.width * 0.72, pool.height * 0.38, COLORS.white, 0.15)
        .setStrokeStyle(3, COLORS.white, 0.65).setDepth(4)
    }));

    const dropTop = this.scene.add.triangle(0, -120, -30, 36, 0, -28, 30, 36, COLORS.collectBlue)
      .setStrokeStyle(6, COLORS.outline, 1);
    const dropBody = this.scene.add.ellipse(0, -58, 128, 118, COLORS.collectBlue, 1)
      .setStrokeStyle(6, COLORS.outline, 1);
    const highlight = this.scene.add.ellipse(-28, -82, 22, 38, COLORS.white, 0.78);
    const eyeLeft = this.scene.add.circle(-22, -60, 8, COLORS.outline);
    const eyeRight = this.scene.add.circle(22, -60, 8, COLORS.outline);
    const mouth = this.scene.add.arc(0, -34, 18, 10, 170, 10, false, COLORS.white)
      .setStrokeStyle(3, COLORS.outline, 1);
    this.bodyVisual = this.scene.add.container(this.boss.x, this.boss.y, [
      dropTop, dropBody, highlight, eyeLeft, eyeRight, mouth
    ]).setDepth(8).setVisible(false);

    this.warningRing = this.scene.add.ellipse(0, 0, 220, 76, COLORS.collect, 0.08)
      .setStrokeStyle(8, COLORS.collect, 0.9).setDepth(7).setVisible(false);
    this.bubbles = [0, 1, 2].map((index) => this.scene.add.circle(
      0,
      0,
      9 + index * 4,
      index === 1 ? COLORS.white : COLORS.collectBlue,
      0.72
    ).setStrokeStyle(3, COLORS.outline, 0.8).setDepth(7).setVisible(false));
    this.dizzyStars = [0, 1, 2].map(() => this.scene.add.star(0, 0, 5, 6, 14, COLORS.collect)
      .setStrokeStyle(3, COLORS.outline).setDepth(10).setVisible(false));
    this.countdown = this.scene.add.text(0, 0, "", {
      fontFamily: "Jua, sans-serif",
      fontSize: "22px",
      color: CSS_COLORS.white,
      backgroundColor: CSS_COLORS.panel,
      padding: { x: 9, y: 5 }
    }).setOrigin(0.5).setDepth(11).setVisible(false);

    this.createArtEffects();
    if (!this.usesArt) this.createProjectileTexture();
    this.projectilePool = this.createProjectilePool();

    this.beginHidden(this.scene.time.now);
    this.applyVisualReviewState(this.scene.registry.get("visualReviewWaterState"));
  }

  createArtEffects() {
    if (!this.usesArt) return;
    if (!Object.values(EFFECTS).every(({ texture }) => this.scene.textures.exists(texture))) {
      this.usesArt = false;
      return;
    }
    for (const [name, spec] of Object.entries(EFFECTS)) {
      const key = `fx:water:${name}`;
      if (!this.scene.anims.exists(key)) {
        this.scene.anims.create({
          key,
          frames: this.scene.anims.generateFrameNumbers(spec.texture, { start: 0, end: spec.frames - 1 }),
          duration: spec.duration,
          repeat: spec.repeat
        });
      }
    }
    this.rippleArt = this.scene.add.sprite(0, 0, EFFECTS.ripple.texture).setDepth(7).setVisible(false);
    this.splashArt = this.scene.add.sprite(0, 0, EFFECTS.splash.texture).setDepth(7).setVisible(false);
    this.dizzyArt = this.scene.add.sprite(0, 0, EFFECTS.dizzy.texture).setDepth(10).setVisible(false);
  }

  playAnimation(sequence, ignoreIfPlaying = true) {
    if (!this.usesArt) return null;
    return EnemyAnimationManager.play(this.boss, sequence, ignoreIfPlaying);
  }

  playEffect(sprite, name) {
    if (sprite) sprite.setVisible(true).play(`fx:water:${name}`, true);
  }

  hideArtEffects() {
    [this.rippleArt, this.splashArt, this.dizzyArt].forEach((effect) => effect?.setVisible(false));
  }

  createProjectileTexture() {
    if (this.scene.textures.exists(PROJECTILE_TEXTURE_KEY)) return;
    const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(COLORS.collectBlue, 1).fillCircle(30, 30, 25);
    graphics.lineStyle(5, COLORS.outline, 1).strokeCircle(30, 30, 25);
    graphics.fillStyle(COLORS.white, 0.85).fillEllipse(22, 18, 13, 8);
    graphics.generateTexture(PROJECTILE_TEXTURE_KEY, 60, 60);
    graphics.destroy();
  }

  createProjectilePool() {
    return new ObjectPool({
      maxSize: 12,
      create: () => {
        const texture = this.usesArt ? EFFECTS.projectile.texture : PROJECTILE_TEXTURE_KEY;
        const projectile = this.scene.physics.add.sprite(0, 0, texture)
          .setDepth(7).setVisible(false);
        projectile.body.setAllowGravity(false);
        projectile.body.enable = false;
        this.projectileInteractions.push(this.scene.physics.add.overlap(this.player, projectile, () => {
          if (!projectile.poolActive || !this.isOnScreen(projectile, 80)) return;
          this.healthManager.takeDamage(projectile.x, { type: "water_king_projectile" });
          this.projectilePool.release(projectile);
        }));
        return projectile;
      },
      activate: (projectile, data) => {
        projectile.expiresAt = data.expiresAt;
        projectile.setPosition(data.x, data.y).setVisible(true).setActive(true).setScale(1);
        projectile.body.enable = true;
        projectile.body.reset(data.x, data.y);
        projectile.body.setCircle(23, 7, 7);
        projectile.body.setVelocity(data.velocityX, data.velocityY);
        if (this.usesArt) projectile.play("fx:water:projectile", true);
      },
      deactivate: (projectile) => {
        projectile.setVisible(false).setActive(false);
        projectile.body.enable = false;
        projectile.body.stop();
      },
      destroy: (projectile) => projectile.destroy()
    });
  }

  getPattern() {
    return getBossPhasePattern("water_king", this.boss.getData("phase"));
  }

  getVulnerabilityMs() {
    const pattern = this.getPattern();
    return this.easyMode ? pattern.easyVulnerabilityMs : pattern.vulnerabilityMs;
  }

  setBodyEnabled(enabled) {
    if (!this.boss.body) return;
    this.boss.body.enable = enabled;
    this.boss.body.stop();
    if (enabled) this.boss.body.reset(this.boss.x, this.boss.y);
  }

  applyVisualReviewState(requestedState) {
    const states = new Set(["hidden", "warning", "emerge", "dizzy", "hit", "submerge", "defeated"]);
    if (!states.has(requestedState)) return;
    this.reviewState = requestedState;
    const mapped = {
      hidden: "pool_hidden",
      warning: "pool_warning",
      emerge: "emerge_attack",
      dizzy: "dizzy_vulnerable",
      hit: "hit",
      submerge: "submerge",
      defeated: "defeated"
    };
    this.state = mapped[requestedState];
    this.stateUntil = Number.POSITIVE_INFINITY;
    this.hideArtEffects();
    const bodyVisible = ["emerge", "dizzy", "hit", "submerge", "defeated"].includes(requestedState);
    this.bodyVisual.setVisible(!this.usesArt && bodyVisible)
      .setAlpha(requestedState === "submerge" ? 0.42 : 1)
      .setScale(requestedState === "hit" ? 1.12 : 1, requestedState === "hit" ? 0.72 : 1);
    this.boss.setAlpha(this.usesArt && bodyVisible ? 1 : 0);
    this.warningRing.setVisible(!this.usesArt && requestedState === "warning");
    this.bubbles.forEach((bubble) => bubble.setVisible(!this.usesArt && requestedState === "warning"));
    const dizzy = requestedState === "dizzy";
    this.dizzyStars.forEach((star) => star.setVisible(!this.usesArt && dizzy));
    this.countdown.setVisible(dizzy).setText(`약점 ${(this.getVulnerabilityMs() / 1000).toFixed(1)}초`);
    if (requestedState === "warning") this.playEffect(this.rippleArt, "ripple");
    if (requestedState === "emerge") {
      this.playAnimation("attack", false);
      this.playEffect(this.splashArt, "splash");
    }
    if (requestedState === "dizzy") {
      this.playAnimation("dizzy", false);
      this.playEffect(this.dizzyArt, "dizzy");
    }
    if (requestedState === "hit") this.playAnimation("hurt", false);
    if (requestedState === "submerge") this.playAnimation("submerge", false);
    if (requestedState === "defeated") this.playAnimation("defeated", false);
    this.setBodyEnabled(dizzy || requestedState === "emerge");
    if (requestedState === "emerge") {
      this.spawnProjectiles(this.getPattern());
      let reviewIndex = 0;
      this.projectilePool.forEachActive((projectile) => {
        const direction = Math.sign(this.player.x - this.boss.x) || 1;
        const x = this.boss.x + direction * (150 + reviewIndex * 74);
        const y = this.boss.y - 105 - reviewIndex * 34;
        projectile.expiresAt = Number.POSITIVE_INFINITY;
        projectile.setPosition(x, y);
        projectile.body.reset(x, y);
        projectile.body.stop();
        reviewIndex += 1;
      });
    }
    this.boss.setData({
      vulnerable: dizzy,
      bossState: this.state,
      visualReviewState: requestedState,
      poolId: this.currentPool?.id
    });
    this.updateVisuals(this.scene.time.now);
  }

  update(now) {
    if (!this.boss?.active || this.defeated) return;
    this.updateVisuals(now);
    this.projectilePool.forEachActive((projectile) => {
      projectile.setRotation(projectile.rotation + 0.08);
      if (!this.reviewState && (now >= projectile.expiresAt || !this.isOnScreen(projectile, 120))) {
        this.projectilePool.release(projectile);
      }
    });

    const section = this.boss.getData("section");
    const inArena = this.player.x >= section.xStart && this.player.x < section.xEnd;
    if (!inArena || !this.isOnScreen(this.boss, 180)) return;

    if (this.state === "pool_hidden" && now >= this.stateUntil) this.beginWarning(now);
    else if (this.state === "pool_warning" && now >= this.stateUntil) this.beginEmergeAttack(now);
    else if (this.state === "emerge_attack" && now >= this.stateUntil) this.beginDizzy(now);
    else if (this.state === "dizzy_vulnerable" && now >= this.stateUntil) this.beginSubmerge(now);
    else if (this.state === "hit" && now >= this.stateUntil) this.beginSubmerge(now);
    else if (this.state === "submerge" && now >= this.stateUntil) this.beginHidden(now);
  }

  updateVisuals(now) {
    if (!this.currentPool) return;
    this.bodyVisual.setPosition(this.boss.x, this.boss.y);
    this.rippleArt?.setPosition(this.currentPool.x, this.currentPool.y - 28);
    this.splashArt?.setPosition(this.currentPool.x, this.currentPool.y - 80);
    this.dizzyArt?.setPosition(this.boss.x, this.boss.y - 154);
    const selected = ["pool_warning", "emerge_attack", "dizzy_vulnerable", "hit", "submerge"].includes(this.state);
    for (const { pool, water, shine } of this.poolVisuals) {
      const active = selected && pool.id === this.currentPool.id;
      const pulse = active ? Math.sin(now / 85) * 0.06 : 0;
      water.setAlpha(active ? 0.52 : 0.25).setScale(1 + pulse, 1 - pulse * 0.35);
      shine.setAlpha(active ? 0.68 : 0.28);
    }
    this.warningRing.setPosition(this.currentPool.x, this.currentPool.y - 10)
      .setScale(0.82 + Math.sin(now / 75) * 0.08);
    this.bubbles.forEach((bubble, index) => {
      bubble.setPosition(
        this.currentPool.x - 48 + index * 48,
        this.currentPool.y - 28 - ((now / 5 + index * 34) % 72)
      );
    });

    const dizzy = this.state === "dizzy_vulnerable";
    this.dizzyStars.forEach((star, index) => {
      const angle = now / 360 + index * (Math.PI * 2 / 3);
      star.setPosition(this.boss.x + Math.cos(angle) * 76, this.boss.y - 150 + Math.sin(angle) * 18)
        .setRotation(-angle);
    });
    if (dizzy && Number.isFinite(this.stateUntil)) {
      this.countdown.setText(`약점 ${Math.max(0, (this.stateUntil - now) / 1000).toFixed(1)}초`);
    }
    this.countdown.setPosition(this.boss.x, this.boss.y - 198);
  }

  beginHidden(now) {
    this.previousPoolId = this.currentPool?.id ?? this.previousPoolId;
    this.currentPool = chooseWaterPool(
      this.pools,
      this.random.next(),
      this.previousPoolId,
      this.player.x,
      280
    );
    this.boss.setPosition(this.currentPool.x, this.currentPool.y).setAlpha(0);
    this.state = "pool_hidden";
    this.stateUntil = now + this.getPattern().hiddenMs;
    this.setBodyEnabled(false);
    this.bodyVisual.setVisible(false).setAlpha(1).setScale(1);
    this.attackTimer?.remove(false);
    this.attackTimer = null;
    this.hideArtEffects();
    this.warningRing.setVisible(false);
    this.bubbles.forEach((bubble) => bubble.setVisible(false));
    this.dizzyStars.forEach((star) => star.setVisible(false));
    this.countdown.setVisible(false);
    this.boss.setData({
      vulnerable: false,
      bossState: this.state,
      poolId: this.currentPool.id
    });
  }

  beginWarning(now) {
    const pattern = this.getPattern();
    this.state = "pool_warning";
    this.stateUntil = now + Math.max(900, Math.round(pattern.warningMs * (this.telegraphMultiplier ?? 1)));
    this.boss.setData({ vulnerable: false, bossState: this.state });
    this.warningRing.setVisible(!this.usesArt);
    this.bubbles.forEach((bubble) => bubble.setVisible(!this.usesArt));
    this.playEffect(this.rippleArt, "ripple");
    this.scene.audioManager?.playSfx("sfx_water_warning", { randomizeRate: false });
    this.scene.updateAccessibleStatus?.("거품이 올라오는 웅덩이에서 물대왕이 나타납니다.");
  }

  beginEmergeAttack(now) {
    const pattern = this.getPattern();
    this.state = "emerge_attack";
    this.stateUntil = now + pattern.emergeAttackMs;
    this.boss.setData({ vulnerable: false, bossState: this.state });
    this.bodyVisual.setVisible(!this.usesArt).setAlpha(1).setScale(1);
    this.boss.setAlpha(this.usesArt ? 1 : 0);
    this.playAnimation("emerge", false);
    this.playEffect(this.splashArt, "splash");
    this.rippleArt?.setVisible(false);
    this.warningRing.setVisible(false);
    this.bubbles.forEach((bubble) => bubble.setVisible(false));
    this.setBodyEnabled(true);
    this.spawnProjectiles(pattern);
    this.scene.audioManager?.playSfx("sfx_water_emerge", { randomizeRate: false });
    this.attackTimer?.remove(false);
    this.attackTimer = this.scene.time.delayedCall(520, () => {
      this.attackTimer = null;
      if (this.state === "emerge_attack") this.playAnimation("attack", false);
    });
    this.scene.cameraEffects?.shake("bossLandLight");
    this.scene.updateAccessibleStatus?.("물대왕이 나타나 물방울을 발사합니다. 공격 뒤 어지러울 때를 기다리세요.");
  }

  spawnProjectiles(pattern) {
    const originX = this.boss.x;
    const originY = this.boss.y - BODY_CENTER_OFFSET_Y;
    const baseAngle = Math.atan2((this.player.y - 48) - originY, this.player.x - originX);
    const spreads = pattern.projectileCount === 1 ? [0]
      : pattern.projectileCount === 2 ? [-0.13, 0.13]
        : [-0.2, 0, 0.2];
    for (const spread of spreads) {
      const angle = baseAngle + spread;
      this.projectilePool.acquire({
        x: originX,
        y: originY,
        velocityX: Math.cos(angle) * pattern.projectileSpeed,
        velocityY: Math.sin(angle) * pattern.projectileSpeed,
        expiresAt: this.scene.time.now + 4200
      });
    }
    this.scene.audioManager?.playSfx("sfx_water_attack", { randomizeRate: false });
  }

  beginDizzy(now) {
    this.state = "dizzy_vulnerable";
    this.stateUntil = now + this.getVulnerabilityMs();
    this.boss.setData({ vulnerable: true, bossState: this.state });
    this.playAnimation("dizzy", false);
    this.playEffect(this.dizzyArt, "dizzy");
    this.splashArt?.setVisible(false);
    this.dizzyStars.forEach((star) => star.setVisible(!this.usesArt));
    this.countdown.setVisible(true);
    this.setBodyEnabled(true);
    this.scene.audioManager?.playSfx("sfx_water_dizzy", { randomizeRate: false });
    this.scene.updateAccessibleStatus?.("물대왕이 어지러워합니다. 카운트가 끝나기 전에 머리 위를 밟으세요.");
  }

  beginSubmerge(now) {
    const pattern = this.getPattern();
    this.state = "submerge";
    this.stateUntil = now + pattern.submergeMs;
    this.boss.setData({ vulnerable: false, bossState: this.state });
    this.setBodyEnabled(false);
    this.projectilePool.releaseAll();
    this.bodyVisual.setVisible(!this.usesArt).setAlpha(0.42).setScale(0.88, 0.56);
    this.boss.setAlpha(this.usesArt ? 1 : 0);
    this.playAnimation("submerge", false);
    this.dizzyArt?.setVisible(false);
    this.dizzyStars.forEach((star) => star.setVisible(false));
    this.countdown.setVisible(false);
    this.scene.audioManager?.playSfx("sfx_water_submerge", { randomizeRate: false });
  }

  onPlayerContact({ fallingOntoHead, attemptHit }) {
    if (this.reviewState) return { didHit: false };
    if (canHitWaterKing(this.state, fallingOntoHead)) return { didHit: attemptHit() };
    const direction = Math.sign(this.player.x - this.boss.x) || 1;
    this.player.setVelocity(direction * 180, -420);
    if (["emerge_attack", "dizzy_vulnerable"].includes(this.state)) this.beginSubmerge(this.scene.time.now);
    this.scene.updateAccessibleStatus?.("지금은 공격할 때가 아닙니다. 물대왕이 잠수했습니다.");
    return { didHit: false };
  }

  onBossHit({ hp }) {
    this.scoreManager.defeat("boss_hit", this.transformationManager.scoreMultiplier);
    this.boss.setData({ vulnerable: false, bossState: "hit" });
    this.state = "hit";
    this.stateUntil = this.scene.time.now + 420;
    this.setBodyEnabled(false);
    this.projectilePool.releaseAll();
    this.bodyVisual.setVisible(!this.usesArt).setAlpha(1).setScale(1.12, 0.72);
    this.boss.setAlpha(this.usesArt ? 1 : 0);
    this.playAnimation("hurt", false);
    this.dizzyArt?.setVisible(false);
    this.dizzyStars.forEach((star) => star.setVisible(false));
    this.countdown.setVisible(false);
    this.scene.audioManager?.playSfx("sfx_boss_hit", { randomizeRate: false });
    if (hp <= 0) this.stateUntil = Number.POSITIVE_INFINITY;
  }

  onBossDefeated() {
    this.defeated = true;
    this.state = "defeated";
    this.boss.setData({ vulnerable: false, bossState: this.state });
    this.setBodyEnabled(false);
    this.projectilePool.releaseAll();
    this.bodyVisual.setVisible(!this.usesArt).setAlpha(0.78).setScale(1.24, 0.42);
    this.boss.setAlpha(this.usesArt ? 1 : 0);
    this.playAnimation("defeated", false);
    this.hideArtEffects();
    this.dizzyStars.forEach((star) => star.setVisible(false));
    this.countdown.setVisible(false);
    this.scene.audioManager?.playSfx("sfx_water_defeat", { randomizeRate: false });
    this.defeatTimer = this.scene.time.delayedCall(this.usesArt ? 1400 : 650, () => {
      this.defeatTimer = null;
      this.boss?.setActive(false);
      this.bodyVisual?.setVisible(false);
      this.boss?.setAlpha(0);
    });
  }

  isOnScreen(object, margin = 0) {
    const source = this.scene.cameras.main.worldView;
    const view = new Phaser.Geom.Rectangle(source.x, source.y, source.width, source.height);
    Phaser.Geom.Rectangle.Inflate(view, margin, margin);
    return Phaser.Geom.Rectangle.Contains(view, object.x, object.y);
  }

  getPoolSnapshot() {
    return { waterProjectile: this.projectilePool?.getSnapshot() ?? null };
  }

  destroy() {
    this.attackTimer?.remove(false);
    this.defeatTimer?.remove(false);
    this.projectilePool?.destroy();
    this.projectileInteractions.forEach((interaction) => interaction?.destroy());
    this.projectileInteractions.length = 0;
    this.boss?.getData("label")?.setVisible(false);
    this.poolVisuals?.forEach(({ water, shine }) => {
      water.destroy();
      shine.destroy();
    });
    this.bodyVisual?.destroy();
    this.warningRing?.destroy();
    this.bubbles?.forEach((bubble) => bubble.destroy());
    this.dizzyStars?.forEach((star) => star.destroy());
    this.rippleArt?.destroy();
    this.splashArt?.destroy();
    this.dizzyArt?.destroy();
    this.countdown?.destroy();
  }
}
