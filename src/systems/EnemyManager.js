import Phaser from "phaser";
import { COLORS } from "../config/constants.js";
import { ARCHER_RULES } from "../data/combatDevices.js";
import { SCORE_VALUES } from "../data/gameplay.js";
import { getProgressionSign, hasReachedProgressTrigger } from "../data/schema/levelSchema.js";
import { EnemyAnimationManager } from "./EnemyAnimationManager.js";
import { ObjectPool } from "./ObjectPool.js";

export class EnemyManager {
  constructor(scene, player, levelLoader, healthManager, transformationManager, scoreManager, difficulty = {}) {
    this.scene = scene;
    this.player = player;
    this.levelLoader = levelLoader;
    this.healthManager = healthManager;
    this.transformationManager = transformationManager;
    this.scoreManager = scoreManager;
    this.level = levelLoader.level;
    this.projectileDifficulty = difficulty.environment?.projectiles ?? {};
    this.progressionSign = getProgressionSign(this.level);
    this.paused = false;
    this.pausedAt = 0;
    this.interactions = [];
    this.lightningPool = this.createLightningPool();
    this.recoveryPool = this.createRecoveryPool();
    this.arrowPool = this.createArrowPool();
    this.bindInteractions();
  }

  bindInteractions() {
    for (const enemy of this.levelLoader.enemies) {
      if (enemy.getData("type") === "raw_potato") {
        this.interactions.push(this.scene.physics.add.collider(enemy, this.levelLoader.terrainBodies));
        enemy.body.setVelocityX(-70);
      }
      this.interactions.push(
        this.scene.physics.add.overlap(this.player, enemy, () => this.handleEnemyContact(enemy))
      );
    }
    for (const hazard of this.levelLoader.hazards) {
      this.interactions.push(
        this.scene.physics.add.overlap(this.player, hazard, () => this.handleHazardContact(hazard))
      );
    }
  }

  createLightningPool() {
    return new ObjectPool({
      maxSize: 6,
      create: () => {
        const visual = this.scene.add.image(0, 0, "fx_lightning")
          .setOrigin(0.5, 1)
          .setDepth(10)
          .setVisible(false);
        const impactGlow = this.scene.add.ellipse(0, 0, 72, 22, COLORS.collect, 0.2)
          .setStrokeStyle(4, COLORS.collect, 0.9)
          .setDepth(9)
          .setVisible(false);
        const impactRing = this.scene.add.ellipse(0, 0, 38, 12, COLORS.white, 0.95)
          .setStrokeStyle(4, COLORS.dangerAlt, 0.95)
          .setDepth(11)
          .setVisible(false);
        const hitbox = this.scene.add.zone(0, 0, 46, 420).setVisible(false);
        this.scene.physics.add.existing(hitbox);
        hitbox.body.setAllowGravity(false);
        hitbox.body.setImmovable(true);
        hitbox.body.enable = false;
        const beam = { visual, impactGlow, impactRing, hitbox, expiresAt: 0, startedAt: 0, visualHeight: 0 };
        this.interactions.push(this.scene.physics.add.overlap(this.player, hitbox, () => {
          if (!beam.poolActive || !this.isOnScreen(beam.hitbox)) return;
          this.healthManager.takeDamage(beam.hitbox.x);
        }));
        return beam;
      },
      activate: (beam, data) => {
        beam.expiresAt = data.expiresAt;
        beam.startedAt = this.scene.time.now;
        beam.visualHeight = Phaser.Math.Clamp(data.visualHeight ?? 460, 360, 600);
        const impactY = data.targetY + 10;
        beam.visual
          .setPosition(data.x, impactY)
          .setDisplaySize(Math.round(beam.visualHeight * 0.67), beam.visualHeight)
          .setVisible(true)
          .setActive(true)
          .setAlpha(1);
        beam.impactGlow.setPosition(data.x, impactY).setVisible(true).setActive(true).setScale(0.55).setAlpha(0.9);
        beam.impactRing.setPosition(data.x, impactY).setVisible(true).setActive(true).setScale(0.3).setAlpha(1);
        const hitboxHeight = beam.visualHeight - 42;
        beam.hitbox.setPosition(data.x, impactY - beam.visualHeight / 2).setSize(46, hitboxHeight).setActive(true);
        beam.hitbox.body.setSize(46, hitboxHeight);
        beam.hitbox.body.enable = true;
        beam.hitbox.body.reset(beam.hitbox.x, beam.hitbox.y);
      },
      deactivate: (beam) => {
        beam.visual.setVisible(false).setActive(false);
        beam.impactGlow.setVisible(false).setActive(false);
        beam.impactRing.setVisible(false).setActive(false);
        beam.hitbox.setActive(false);
        beam.hitbox.body.enable = false;
      },
      destroy: (beam) => {
        beam.visual.destroy();
        beam.impactGlow.destroy();
        beam.impactRing.destroy();
        beam.hitbox.destroy();
      }
    });
  }

  createRecoveryPool() {
    return new ObjectPool({
      maxSize: 9,
      create: () => {
        const visual = this.scene.add.star(0, 0, 5, 7, 15, COLORS.collectPink)
          .setStrokeStyle(3, COLORS.outline)
          .setDepth(8)
          .setVisible(false);
        const zone = this.scene.add.zone(0, 0, 42, 42).setVisible(false);
        this.scene.physics.add.existing(zone);
        zone.body.setAllowGravity(false);
        zone.body.enable = false;
        const entry = { visual, zone, amount: 0, expiresAt: 0, poolActive: false };
        this.interactions.push(this.scene.physics.add.overlap(this.player, zone, () => {
          if (!entry.poolActive) return;
          this.scoreManager.recover(entry.amount);
          this.scene.audioManager?.playSfx("sfx_percent_small", { volume: 0.7 });
          this.recoveryPool.release(entry);
        }));
        return entry;
      },
      activate: (entry, data) => {
        entry.amount = data.amount;
        entry.expiresAt = data.expiresAt;
        entry.visual.setPosition(data.x, data.y).setVisible(true).setActive(true);
        entry.zone.setPosition(data.x, data.y).setActive(true);
        entry.zone.body.enable = true;
        entry.zone.body.reset(data.x, data.y);
      },
      deactivate: (entry) => {
        entry.visual.setVisible(false).setActive(false);
        entry.zone.setActive(false);
        entry.zone.body.enable = false;
      },
      destroy: (entry) => {
        entry.visual.destroy();
        entry.zone.destroy();
      }
    });
  }

  createArrowPool() {
    return new ObjectPool({
      maxSize: this.projectileDifficulty.maxActive ?? ARCHER_RULES.maxActive,
      create: () => {
        const usesArt = this.scene.textures.exists("projectile_arrow");
        const arrow = usesArt
          ? this.scene.add.image(0, 0, "projectile_arrow").setDisplaySize(56, 28)
          : this.scene.add.triangle(0, 0, -20, -7, 20, 0, -20, 7, COLORS.collect, 0.98)
            .setStrokeStyle(3, COLORS.outline, 0.96);
        arrow.setDepth(11).setVisible(false);
        this.scene.physics.add.existing(arrow);
        arrow.body.setAllowGravity(false);
        arrow.body.enable = false;
        arrow.setDataEnabled();
        arrow.setData({ guardable: true, projectileType: "arrow", usesArt });
        this.interactions.push(this.scene.physics.add.overlap(this.player, arrow, () => {
          if (!arrow.poolActive || !this.isOnScreen(arrow, 80)) return;
          if (arrow.getData("guardable") && this.transformationManager.canGuardProjectile(arrow.x, arrow.y)) {
            this.transformationManager.registerGuardImpact(arrow.x, arrow.y);
            this.arrowPool.release(arrow);
            return;
          }
          this.healthManager.takeDamage(arrow.x);
          this.arrowPool.release(arrow);
        }));
        return arrow;
      },
      activate: (arrow, data) => {
        arrow.expiresAt = data.expiresAt;
        arrow.setPosition(data.x, data.y).setRotation(data.angle).setVisible(true).setActive(true);
        arrow.body.enable = true;
        arrow.body.reset(data.x, data.y);
        arrow.body.setSize(34, 12, true);
        arrow.body.setVelocity(data.velocityX, data.velocityY);
      },
      deactivate: (arrow) => {
        arrow.setVisible(false).setActive(false).setRotation(0);
        arrow.body.enable = false;
        arrow.body.stop();
      },
      destroy: (arrow) => arrow.destroy()
    });
  }

  update(now, delta) {
    if (this.paused) return;
    for (const enemy of this.levelLoader.enemies) {
      if (!enemy.active || !enemy.body?.enable) continue;
      const type = enemy.getData("type");
      if (type === "raw_potato") this.updateRawPotato(enemy);
      if (type === "dark_cloud") this.updateDarkCloud(enemy, now);
      if (type === "magpie") this.updateMagpie(enemy, now, delta);
      if (type === "potato_archer") this.updatePotatoArcher(enemy, now);
      const label = enemy.getData("label");
      label?.setPosition(enemy.x, enemy.y - 48);
    }

    this.lightningPool.forEachActive((beam) => {
      const progress = Phaser.Math.Clamp((now - beam.startedAt) / Math.max(1, beam.expiresAt - beam.startedAt), 0, 1);
      beam.visual.setAlpha(0.82 + Math.sin(now / 24) * 0.18 - progress * 0.24);
      beam.impactGlow.setScale(0.55 + progress * 2.05).setAlpha((1 - progress) * 0.9);
      beam.impactRing.setScale(0.3 + progress * 1.35).setAlpha((1 - progress) * 0.98);
      if (now >= beam.expiresAt || !this.isOnScreen(beam.hitbox)) this.lightningPool.release(beam);
    });
    this.recoveryPool.forEachActive((entry) => {
      entry.visual.setRotation(entry.visual.rotation + delta * 0.004);
      if (now >= entry.expiresAt) this.recoveryPool.release(entry);
    });
    this.arrowPool.forEachActive((arrow) => {
      if (now >= arrow.expiresAt || !this.isOnScreen(arrow, 96)) this.arrowPool.release(arrow);
    });
  }

  updatePotatoArcher(enemy, now) {
    if (!this.isOnScreen(enemy, 80)) {
      this.cancelArcherTelegraph(enemy);
      return;
    }
    const state = enemy.getData("state");
    const triggerX = enemy.getData("triggerX") ?? enemy.x - this.progressionSign * 420;
    if (state === "idle" && hasReachedProgressTrigger(this.player.x, triggerX, this.level)) {
      const activationDelayMs = enemy.getData("activationDelayMs") ?? 0;
      if (activationDelayMs > 0) enemy.setData({ state: "waiting", stateUntil: now + activationDelayMs });
      else this.beginArcherTelegraph(enemy, now);
      return;
    }
    if (state === "waiting" && now >= enemy.getData("stateUntil")) {
      this.beginArcherTelegraph(enemy, now);
      return;
    }
    if (state === "telegraph") {
      const remaining = Math.max(0, enemy.getData("stateUntil") - now);
      const ratio = remaining / Math.max(1, enemy.getData("resolvedTelegraphMs"));
      enemy.setScale(1 + (1 - ratio) * 0.1);
      enemy.getData("aimLine")?.setAlpha(0.35 + Math.sin(now / 55) * 0.2);
      if (now >= enemy.getData("stateUntil")) this.fireArcherArrow(enemy, now);
      return;
    }
    if (state === "cooldown" && now >= enemy.getData("stateUntil")) {
      enemy.setData("state", "idle");
      EnemyAnimationManager.play(enemy, "idle");
    }
  }

  beginArcherTelegraph(enemy, now) {
    const targetX = this.player.body?.center?.x ?? this.player.x;
    const targetY = this.player.body?.center?.y ?? this.player.y - 30;
    const telegraphMs = (enemy.getData("telegraphMs") ?? ARCHER_RULES.telegraphMs)
      * (this.projectileDifficulty.telegraphMultiplier ?? 1);
    enemy.setData({
      state: "telegraph",
      stateUntil: now + telegraphMs,
      resolvedTelegraphMs: telegraphMs,
      targetX,
      targetY
    });
    this.applyTelegraphColor(enemy, COLORS.collect);
    EnemyAnimationManager.play(enemy, "warning");
    const aimLine = enemy.getData("aimLine") ?? this.scene.add.graphics().setDepth(10);
    aimLine
      .clear()
      .lineStyle(4, COLORS.collect, 0.55)
      .beginPath()
      .moveTo(enemy.x, enemy.y - 36)
      .lineTo(targetX, targetY)
      .strokePath();
    enemy.setData("aimLine", aimLine);
    this.scene.updateAccessibleStatus?.("궁수가 화살을 조준합니다. 날개로 막거나 점프로 피하세요.");
  }

  fireArcherArrow(enemy, now) {
    const originX = enemy.x - this.progressionSign * 28;
    const originY = enemy.y - 42;
    const angle = Phaser.Math.Angle.Between(originX, originY, enemy.getData("targetX"), enemy.getData("targetY"));
    const speed = (enemy.getData("arrowSpeed") ?? ARCHER_RULES.arrowSpeed)
      * (this.projectileDifficulty.speedMultiplier ?? 1);
    this.arrowPool.acquire({
      x: originX,
      y: originY,
      angle,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      expiresAt: now + ARCHER_RULES.arrowLifetimeMs
    });
    enemy.getData("aimLine")?.clear().setAlpha(1);
    this.clearTelegraphColor(enemy);
    enemy.setScale(1);
    EnemyAnimationManager.play(enemy, "attack", false);
    if (enemy.getData("oneShot")) {
      enemy.setData("state", "spent");
      return;
    }
    const cooldownMs = (enemy.getData("cooldownMs") ?? ARCHER_RULES.cooldownMs)
      * (this.projectileDifficulty.cooldownMultiplier ?? 1);
    enemy.setData({ state: "cooldown", stateUntil: now + cooldownMs });
  }

  cancelArcherTelegraph(enemy) {
    if (!["telegraph", "waiting"].includes(enemy.getData("state"))) return;
    this.clearTelegraphColor(enemy);
    enemy.setScale(1);
    enemy.getData("aimLine")?.clear().setAlpha(1);
    enemy.setData("state", "idle");
    EnemyAnimationManager.play(enemy, "idle");
  }

  updateRawPotato(enemy) {
    const spawnX = enemy.getData("spawnX");
    const patrol = enemy.getData("patrol") ?? 160;
    if (enemy.x <= spawnX - patrol) enemy.body.setVelocityX(72);
    if (enemy.x >= spawnX + patrol) enemy.body.setVelocityX(-72);
    if (enemy.getData("usesArt")) EnemyAnimationManager.play(enemy, "move");
    else enemy.setRotation(enemy.rotation + enemy.body.velocity.x * 0.0008);
  }

  updateDarkCloud(enemy, now) {
    if (!this.isOnScreen(enemy)) {
      this.cancelTelegraph(enemy);
      return;
    }
    const state = enemy.getData("state");
    const triggerX = enemy.getData("triggerX") ?? enemy.x - this.progressionSign * 320;
    if (state === "idle" && hasReachedProgressTrigger(this.player.x, triggerX, this.level) && Math.abs(this.player.x - enemy.x) < 720) {
      const activationDelayMs = enemy.getData("activationDelayMs") ?? 0;
      if (activationDelayMs > 0) enemy.setData({ state: "waiting", stateUntil: now + activationDelayMs });
      else this.beginDarkCloudTelegraph(enemy, now);
    } else if (state === "waiting" && now >= enemy.getData("stateUntil")) {
      this.beginDarkCloudTelegraph(enemy, now);
    } else if (state === "telegraph") {
      enemy.setScale(1 + Math.sin(now / 55) * 0.08);
      const marker = enemy.getData("targetMarker");
      marker?.setScale(0.9 + Math.sin(now / 55) * 0.16).setAlpha(0.76 + Math.sin(now / 42) * 0.2);
      if (now >= enemy.getData("stateUntil")) {
        const targetY = enemy.getData("targetY");
        this.lightningPool.acquire({
          x: enemy.getData("targetX"),
          targetY,
          visualHeight: targetY - enemy.y + 46,
          expiresAt: now + 170
        });
        this.scene.audioManager?.playSfx("sfx_lightning", { randomizeRate: false });
        this.scene.particleEffects?.emitLightningImpact(enemy.getData("targetX"), targetY + 8);
        this.scene.cameras.main.flash(105, 255, 243, 153);
        this.scene.cameraEffects?.shake("lightning");
        EnemyAnimationManager.play(enemy, "attack", false);
        this.clearTelegraphColor(enemy);
        enemy.setScale(1);
        enemy.getData("targetMarker")?.setVisible(false).setScale(1).setAlpha(1);
        enemy.setData({ state: "cooldown", stateUntil: now + (enemy.getData("cooldownMs") ?? 1500) });
      }
    } else if (state === "cooldown" && now >= enemy.getData("stateUntil")) {
      enemy.setData("state", "idle");
      EnemyAnimationManager.play(enemy, "idle");
    }
  }

  beginDarkCloudTelegraph(enemy, now) {
    const targetX = this.player.x;
    const targetY = this.levelLoader.findSafeY(targetX);
    const telegraphMs = enemy.getData("telegraphMs") ?? 700;
    enemy.setData({ state: "telegraph", stateUntil: now + telegraphMs, targetX, targetY });
    this.applyTelegraphColor(enemy, COLORS.collectBlue);
    EnemyAnimationManager.play(enemy, "warning");
    this.scene.audioManager?.playSfx("sfx_cloud_charge", { randomizeRate: false });
    this.showTargetMarker(enemy, targetX, targetY - 5, COLORS.dangerAlt);
  }

  updateMagpie(enemy, now) {
    if (!this.isOnScreen(enemy) && enemy.getData("state") !== "dive") {
      this.cancelTelegraph(enemy);
      return;
    }
    const state = enemy.getData("state");
    const triggerX = enemy.getData("triggerX") ?? enemy.x - this.progressionSign * 360;
    if (state === "idle" && hasReachedProgressTrigger(this.player.x, triggerX, this.level) && Math.abs(this.player.x - enemy.x) < 760) {
      const activationDelayMs = enemy.getData("activationDelayMs") ?? 0;
      if (activationDelayMs > 0) enemy.setData({ state: "waiting", stateUntil: now + activationDelayMs });
      else this.beginMagpieTelegraph(enemy, now);
    } else if (state === "waiting" && now >= enemy.getData("stateUntil")) {
      this.beginMagpieTelegraph(enemy, now);
    } else if (state === "telegraph") {
      enemy.x += Math.sin(now / 35) * 1.8;
      if (now >= enemy.getData("stateUntil")) {
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, enemy.getData("targetX"), enemy.getData("targetY"));
        const diveSpeed = enemy.getData("diveSpeed") ?? 620;
        enemy.body.setVelocity(Math.cos(angle) * diveSpeed, Math.sin(angle) * diveSpeed);
        enemy.setData({ state: "dive", stateUntil: now + (enemy.getData("diveDurationMs") ?? 620), activeAttack: true });
        this.clearTelegraphColor(enemy);
        EnemyAnimationManager.play(enemy, "attack");
      }
    } else if (state === "dive" && now >= enemy.getData("stateUntil")) {
      enemy.body.setVelocity(0, 0);
      enemy.setRotation(0.35);
      enemy.setData({ state: "stunned", stateUntil: now + (enemy.getData("stunnedMs") ?? 1100), activeAttack: false });
      EnemyAnimationManager.play(enemy, "stunned");
    } else if (state === "stunned" && now >= enemy.getData("stateUntil")) {
      enemy.setPosition(enemy.getData("spawnX"), enemy.getData("spawnY")).setRotation(0);
      enemy.getData("targetMarker")?.setVisible(false);
      enemy.setData({ state: "cooldown", stateUntil: now + (enemy.getData("cooldownMs") ?? 1300) });
    } else if (state === "cooldown" && now >= enemy.getData("stateUntil")) {
      enemy.setData("state", "idle");
      EnemyAnimationManager.play(enemy, "idle");
    }
  }

  beginMagpieTelegraph(enemy, now) {
    const targetX = this.player.x;
    const targetY = this.levelLoader.findSafeY(targetX) - 28;
    const telegraphMs = enemy.getData("telegraphMs") ?? 650;
    enemy.setData({ state: "telegraph", stateUntil: now + telegraphMs, targetX, targetY });
    this.applyTelegraphColor(enemy, COLORS.danger);
    EnemyAnimationManager.play(enemy, "warning");
    this.scene.audioManager?.playSfx("sfx_magpie_warning", { randomizeRate: false });
    this.showTargetMarker(enemy, targetX, targetY + 24, COLORS.danger);
  }

  handleEnemyContact(enemy) {
    if (!enemy.active || !enemy.body?.enable) return;
    const type = enemy.getData("type");
    if (this.transformationManager.canDestroyEnemies) {
      this.defeatEnemy(enemy, type);
      return;
    }

    const stomp = this.player.body.velocity.y > 100 && this.player.body.bottom <= enemy.body.top + 32;
    if (stomp && type !== "dark_cloud") {
      this.player.setVelocityY(-460);
      this.defeatEnemy(enemy, type);
      return;
    }

    if (type === "magpie" && enemy.getData("activeAttack")) {
      if (this.healthManager.takeDamage(enemy.x, { steal: true })) {
        const stolen = this.scoreManager.steal();
        this.spawnRecovery(enemy.x, this.levelLoader.findSafeY(enemy.x) - 48, stolen);
        enemy.setData({
          state: "stunned",
          stateUntil: this.scene.time.now + (enemy.getData("stunnedMs") ?? 1100),
          activeAttack: false
        });
        enemy.body.setVelocity(0, 0);
      }
      return;
    }

    if (type === "raw_potato" || type === "potato_archer") this.healthManager.takeDamage(enemy.x);
  }

  handleHazardContact(hazard) {
    if (!hazard.active || hazard.getData("destroyed")) return;
    // 가시 호박은 처치용 오브젝트가 아니라, 어떤 변신 상태에서도 접촉 피해를 주는 장애물이다.
    const damaged = this.healthManager.takeDamage(hazard.x);
    if (!damaged) return;
    if (hazard.getData("usesArt")) {
      const warning = EnemyAnimationManager.play(hazard, "warning", false);
      this.scene.time.delayedCall(warning?.durationMs ?? 320, () => {
        if (hazard.active && !hazard.getData("destroyed")) EnemyAnimationManager.play(hazard, "idle");
      });
    }
    this.scene.cameraEffects?.shake("enemyDefeat");
  }

  defeatEnemy(enemy, type) {
    enemy.getData("aimLine")?.clear();
    enemy.getData("targetMarker")?.setVisible(false);
    enemy.getData("label")?.setVisible(false);
    enemy.body.enable = false;
    const defeated = enemy.getData("usesArt") ? EnemyAnimationManager.play(enemy, "defeated", false) : null;
    if (defeated) {
      this.scene.time.delayedCall(defeated.durationMs, () => enemy.setVisible(false).setActive(false));
    } else {
      enemy.setVisible(false).setActive(false);
    }
    this.scoreManager.defeat(type, this.transformationManager.scoreMultiplier);
    this.scene.audioManager?.playSfx("sfx_enemy_defeat");
    if (type === "dark_cloud" || type === "magpie") this.scene.cameraEffects?.shake("enemyDefeat");
  }

  spawnRecovery(x, y, amount) {
    if (amount <= 0) return;
    const parts = Math.min(3, amount);
    const base = Math.floor(amount / parts);
    let remainder = amount - base * parts;
    for (let index = 0; index < parts; index += 1) {
      const piece = base + (remainder-- > 0 ? 1 : 0);
      this.recoveryPool.acquire({
        x: x + (index - 1) * 44,
        y: y - (index % 2) * 28,
        amount: piece,
        expiresAt: this.scene.time.now + 6000
      });
    }
  }

  showTargetMarker(enemy, x, y, color) {
    let marker = enemy.getData("targetMarker");
    if (!marker) {
      marker = this.scene.add.ellipse(x, y, 92, 18, color, 0.36)
        .setStrokeStyle(3, COLORS.white, 0.88)
        .setDepth(2);
      enemy.setData("targetMarker", marker);
    }
    marker.setPosition(x, y).setFillStyle(color, 0.36).setVisible(true).setScale(1).setAlpha(1);
  }

  applyTelegraphColor(enemy, color) {
    if (enemy.getData("usesArt")) {
      if (enemy.getData("type") !== "potato_archer") enemy.setTintFill?.(color);
      return;
    }
    enemy.setFillStyle?.(color);
  }

  clearTelegraphColor(enemy) {
    if (enemy.getData("usesArt")) enemy.clearTint?.();
    else enemy.setFillStyle?.(enemy.getData("fallbackColor") ?? COLORS.danger);
  }

  cancelTelegraph(enemy) {
    if (!["telegraph", "waiting"].includes(enemy.getData("state"))) return;
    this.clearTelegraphColor(enemy);
    enemy.setScale(1);
    enemy.getData("targetMarker")?.setVisible(false).setScale(1).setAlpha(1);
    enemy.setData("state", "idle");
    EnemyAnimationManager.play(enemy, "idle");
  }

  isOnScreen(object, padding = 0) {
    const view = this.scene.cameras.main.worldView;
    padding = Number(padding) || 0;
    return object.x >= view.left - padding
      && object.x <= view.right + padding
      && object.y >= view.top - padding
      && object.y <= view.bottom + padding;
  }

  getPoolSnapshot() {
    return {
      lightning: this.lightningPool.getSnapshot(),
      recovery: this.recoveryPool.getSnapshot(),
      arrows: this.arrowPool.getSnapshot()
    };
  }

  setPaused(paused, now = this.scene.time.now) {
    const next = Boolean(paused);
    if (next === this.paused) return;
    this.paused = next;
    if (next) {
      this.pausedAt = now;
      for (const enemy of this.levelLoader.enemies) {
        enemy.setData("environmentPausedVelocity", { x: enemy.body?.velocity.x ?? 0, y: enemy.body?.velocity.y ?? 0 });
        enemy.body?.setVelocity(0, 0);
      }
      this.arrowPool.forEachActive((arrow) => {
        arrow.setData("environmentPausedVelocity", { x: arrow.body.velocity.x, y: arrow.body.velocity.y });
        arrow.body.stop();
      });
      return;
    }

    const pausedDuration = Math.max(0, now - this.pausedAt);
    for (const enemy of this.levelLoader.enemies) {
      const velocity = enemy.getData("environmentPausedVelocity");
      if (velocity && enemy.body?.enable) enemy.body.setVelocity(velocity.x, velocity.y);
      const stateUntil = enemy.getData("stateUntil");
      if (Number.isFinite(stateUntil) && stateUntil > 0) enemy.setData("stateUntil", stateUntil + pausedDuration);
      enemy.setData("environmentPausedVelocity", null);
    }
    this.lightningPool.forEachActive((beam) => {
      beam.startedAt += pausedDuration;
      beam.expiresAt += pausedDuration;
    });
    this.recoveryPool.forEachActive((entry) => {
      entry.expiresAt += pausedDuration;
    });
    this.arrowPool.forEachActive((arrow) => {
      const velocity = arrow.getData("environmentPausedVelocity");
      if (velocity) arrow.body.setVelocity(velocity.x, velocity.y);
      arrow.expiresAt += pausedDuration;
      arrow.setData("environmentPausedVelocity", null);
    });
    this.pausedAt = 0;
  }

  destroy() {
    for (const interaction of this.interactions) interaction?.destroy();
    this.interactions.length = 0;
    for (const enemy of this.levelLoader.enemies) {
      enemy.getData("targetMarker")?.destroy();
      enemy.getData("aimLine")?.destroy();
    }
    this.lightningPool.destroy();
    this.recoveryPool.destroy();
    this.arrowPool.destroy();
  }
}
