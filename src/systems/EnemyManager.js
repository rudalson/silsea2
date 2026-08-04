import Phaser from "phaser";
import { COLORS } from "../config/constants.js";
import { SCORE_VALUES } from "../data/gameplay.js";
import { ObjectPool } from "./ObjectPool.js";

export class EnemyManager {
  constructor(scene, player, levelLoader, healthManager, transformationManager, scoreManager) {
    this.scene = scene;
    this.player = player;
    this.levelLoader = levelLoader;
    this.healthManager = healthManager;
    this.transformationManager = transformationManager;
    this.scoreManager = scoreManager;
    this.interactions = [];
    this.lightningPool = this.createLightningPool();
    this.recoveryPool = this.createRecoveryPool();
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
        const beam = this.scene.add.rectangle(0, 0, 42, 460, COLORS.collectBlue, 0.78)
          .setStrokeStyle(5, COLORS.dangerAlt)
          .setDepth(7)
          .setVisible(false);
        this.scene.physics.add.existing(beam);
        beam.body.setAllowGravity(false);
        beam.body.setImmovable(true);
        beam.body.enable = false;
        this.interactions.push(this.scene.physics.add.overlap(this.player, beam, () => {
          if (!beam.poolActive || !this.isOnScreen(beam)) return;
          this.healthManager.takeDamage(beam.x);
        }));
        return beam;
      },
      activate: (beam, data) => {
        beam.expiresAt = data.expiresAt;
        beam.setPosition(data.x, data.y).setVisible(true).setActive(true).setAlpha(0.8);
        beam.body.enable = true;
        beam.body.reset(data.x, data.y);
      },
      deactivate: (beam) => {
        beam.setVisible(false).setActive(false);
        beam.body.enable = false;
      },
      destroy: (beam) => beam.destroy()
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

  update(now, delta) {
    for (const enemy of this.levelLoader.enemies) {
      if (!enemy.active || !enemy.body?.enable) continue;
      const type = enemy.getData("type");
      if (type === "raw_potato") this.updateRawPotato(enemy);
      if (type === "dark_cloud") this.updateDarkCloud(enemy, now);
      if (type === "magpie") this.updateMagpie(enemy, now, delta);
      const label = enemy.getData("label");
      label?.setPosition(enemy.x, enemy.y - 48);
    }

    this.lightningPool.forEachActive((beam) => {
      beam.setAlpha(0.55 + Math.sin(now / 45) * 0.25);
      if (now >= beam.expiresAt || !this.isOnScreen(beam)) this.lightningPool.release(beam);
    });
    this.recoveryPool.forEachActive((entry) => {
      entry.visual.setRotation(entry.visual.rotation + delta * 0.004);
      if (now >= entry.expiresAt) this.recoveryPool.release(entry);
    });
  }

  updateRawPotato(enemy) {
    const spawnX = enemy.getData("spawnX");
    const patrol = enemy.getData("patrol") ?? 160;
    if (enemy.x <= spawnX - patrol) enemy.body.setVelocityX(72);
    if (enemy.x >= spawnX + patrol) enemy.body.setVelocityX(-72);
    enemy.setRotation(enemy.rotation + enemy.body.velocity.x * 0.0008);
  }

  updateDarkCloud(enemy, now) {
    if (!this.isOnScreen(enemy)) {
      this.cancelTelegraph(enemy);
      return;
    }
    const state = enemy.getData("state");
    const triggerX = enemy.getData("triggerX") ?? enemy.x - 320;
    if (state === "idle" && this.player.x >= triggerX && Math.abs(this.player.x - enemy.x) < 720) {
      const targetX = this.player.x;
      const targetY = this.levelLoader.findSafeY(targetX);
      enemy.setData({ state: "telegraph", stateUntil: now + 700, targetX, targetY });
      enemy.setTintFill(COLORS.collectBlue);
      this.scene.audioManager?.playSfx("sfx_cloud_charge", { randomizeRate: false });
      this.showTargetMarker(enemy, targetX, targetY - 5, COLORS.dangerAlt);
    } else if (state === "telegraph") {
      enemy.setScale(1 + Math.sin(now / 55) * 0.08);
      if (now >= enemy.getData("stateUntil")) {
        this.lightningPool.acquire({
          x: enemy.getData("targetX"),
          y: enemy.getData("targetY") - 230,
          expiresAt: now + 170
        });
        this.scene.audioManager?.playSfx("sfx_lightning", { randomizeRate: false });
        enemy.clearTint().setScale(1);
        enemy.getData("targetMarker")?.setVisible(false);
        enemy.setData({ state: "cooldown", stateUntil: now + 1500 });
      }
    } else if (state === "cooldown" && now >= enemy.getData("stateUntil")) {
      enemy.setData("state", "idle");
    }
  }

  updateMagpie(enemy, now) {
    if (!this.isOnScreen(enemy) && enemy.getData("state") !== "dive") {
      this.cancelTelegraph(enemy);
      return;
    }
    const state = enemy.getData("state");
    const triggerX = enemy.getData("triggerX") ?? enemy.x - 360;
    if (state === "idle" && this.player.x >= triggerX && Math.abs(this.player.x - enemy.x) < 760) {
      const targetX = this.player.x;
      const targetY = this.levelLoader.findSafeY(targetX) - 28;
      enemy.setData({ state: "telegraph", stateUntil: now + 650, targetX, targetY });
      enemy.setTintFill(COLORS.danger);
      this.scene.audioManager?.playSfx("sfx_magpie_warning", { randomizeRate: false });
      this.showTargetMarker(enemy, targetX, targetY + 24, COLORS.danger);
    } else if (state === "telegraph") {
      enemy.x += Math.sin(now / 35) * 1.8;
      if (now >= enemy.getData("stateUntil")) {
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, enemy.getData("targetX"), enemy.getData("targetY"));
        enemy.body.setVelocity(Math.cos(angle) * 620, Math.sin(angle) * 620);
        enemy.setData({ state: "dive", stateUntil: now + 620, activeAttack: true });
        enemy.clearTint();
      }
    } else if (state === "dive" && now >= enemy.getData("stateUntil")) {
      enemy.body.setVelocity(0, 0);
      enemy.setRotation(0.35);
      enemy.setData({ state: "stunned", stateUntil: now + 1100, activeAttack: false });
    } else if (state === "stunned" && now >= enemy.getData("stateUntil")) {
      enemy.setPosition(enemy.getData("spawnX"), enemy.getData("spawnY")).setRotation(0);
      enemy.getData("targetMarker")?.setVisible(false);
      enemy.setData({ state: "cooldown", stateUntil: now + 1300 });
    } else if (state === "cooldown" && now >= enemy.getData("stateUntil")) {
      enemy.setData("state", "idle");
    }
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
        enemy.setData({ state: "stunned", stateUntil: this.scene.time.now + 1100, activeAttack: false });
        enemy.body.setVelocity(0, 0);
      }
      return;
    }

    if (type === "raw_potato") this.healthManager.takeDamage(enemy.x);
  }

  handleHazardContact(hazard) {
    if (!hazard.active || hazard.getData("destroyed")) return;
    if (this.transformationManager.canBreakObstacles) {
      hazard.setData("destroyed", true);
      hazard.disableBody?.(true, true);
      hazard.body.enable = false;
      hazard.setVisible(false).setActive(false);
      this.scoreManager.defeat("spike_pumpkin", this.transformationManager.scoreMultiplier);
      this.scene.audioManager?.playSfx("sfx_enemy_defeat");
      return;
    }
    this.healthManager.takeDamage(hazard.x);
  }

  defeatEnemy(enemy, type) {
    enemy.getData("targetMarker")?.setVisible(false);
    enemy.getData("label")?.setVisible(false);
    enemy.disableBody?.(true, true);
    enemy.body.enable = false;
    enemy.setVisible(false).setActive(false);
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
      marker = this.scene.add.ellipse(x, y, 92, 18, color, 0.48).setDepth(2);
      enemy.setData("targetMarker", marker);
    }
    marker.setPosition(x, y).setFillStyle(color, 0.48).setVisible(true);
  }

  cancelTelegraph(enemy) {
    if (enemy.getData("state") !== "telegraph") return;
    enemy.clearTint().setScale(1);
    enemy.getData("targetMarker")?.setVisible(false);
    enemy.setData("state", "idle");
  }

  isOnScreen(object) {
    const view = this.scene.cameras.main.worldView;
    return Phaser.Geom.Rectangle.Contains(view, object.x, object.y);
  }

  destroy() {
    for (const interaction of this.interactions) interaction?.destroy();
    this.interactions.length = 0;
    for (const enemy of this.levelLoader.enemies) enemy.getData("targetMarker")?.destroy();
    this.lightningPool.destroy();
    this.recoveryPool.destroy();
  }
}
