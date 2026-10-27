import { COLORS, EVENTS } from "../config/constants.js";
import { THEMED_ENEMIES, createThemedAttack, findThemedAttackHits, getThemedRainColumns, isThemedEnemy, sampleThemedAttack } from "../data/themedEnemies.js";
import { EnemyAnimationManager } from "./EnemyAnimationManager.js";

export class ThemedEnemyController {
  constructor(scene, player, levelLoader, healthManager, transformationManager, easy = false) {
    Object.assign(this, { scene, player, levelLoader, healthManager, transformationManager, easy });
    this.entries = new Map(); this.paused = false;
    for (const enemy of levelLoader.enemies.filter(enemy => isThemedEnemy(enemy.getData("type")))) {
      this.entries.set(enemy, { visual: scene.add.graphics().setDepth(7), elapsedMs: 0, plan: null, resolved: new Set(), attacks: 0 });
    }
    this.onRespawn = () => { for (const enemy of this.entries.keys()) this.cancel(enemy, this.scene.time.now); };
    scene.events.on(EVENTS.PLAYER_RESPAWNED, this.onRespawn);
  }

  visible(enemy) {
    const view = this.scene.cameras.main.worldView;
    return enemy.x >= view.left + 32 && enemy.x <= view.right - 32 && enemy.y >= view.top && enemy.y <= view.bottom;
  }

  groundAhead(enemy, direction, distance = 18) {
    const x = enemy.x + direction * (enemy.body.width / 2 + distance);
    return this.levelLoader.terrainObjects.some(t => Math.abs(t.y - enemy.body.bottom) <= 14 && t.x <= x && t.x + t.width >= x);
  }

  enter(enemy, state, sequence) {
    const entry = this.entries.get(enemy);
    entry.elapsedMs = 0; enemy.setData("state", state); enemy.body.setVelocityX(0);
    EnemyAnimationManager.play(enemy, sequence, false);
  }

  cancel(enemy, now = this.scene.time.now) {
    const entry = this.entries.get(enemy);
    if (!entry) return;
    entry.visual.clear(); entry.plan = null; entry.resolved.clear(); entry.elapsedMs = 0;
    enemy.body?.setVelocityX(0);
    enemy.setData({ state: "idle", attackReadyAt: now + 450 });
    if (enemy.body?.enable) EnemyAnimationManager.play(enemy, "idle");
  }

  recover(enemy, now) {
    const entry = this.entries.get(enemy), rules = THEMED_ENEMIES[enemy.getData("type")];
    entry.visual.clear(); entry.plan = null;
    enemy.setData("attackReadyAt", now + rules.recoverMs + rules.cooldownMs);
    this.enter(enemy, "recover", "recover");
  }

  update(enemy, now, delta) {
    if (this.paused || !enemy.active || !enemy.body?.enable) return;
    const entry = this.entries.get(enemy), rules = THEMED_ENEMIES[enemy.getData("type")];
    // A five-second music rest must never demand a simultaneous dodge.
    if (!this.player.body?.enable || this.scene.courseMechanics?.rhythms?.some(({ state }) => state.phase === "stop")) {
      this.cancel(enemy, now); return;
    }
    const state = enemy.getData("state");
    if (["telegraph", "attack"].includes(state) && !this.visible(enemy)) { this.recover(enemy, now); return; }
    if (["telegraph", "attack", "recover"].includes(state)) entry.elapsedMs += Math.max(0, delta);
    if (state === "telegraph") {
      this.draw(entry, true);
      if (entry.elapsedMs >= rules.warningMs * (this.easy ? 1.35 : 1)) {
        this.enter(enemy, "attack", "attack"); entry.attacks++;
        this.scene.audioManager?.playSfx(rules.sfx, { volume: 0.35, randomizeRate: false });
      }
      return;
    }
    if (state === "attack") {
      for (const hazard of findThemedAttackHits(entry.plan, entry.elapsedMs - delta, entry.elapsedMs, this.player.body, entry.resolved)) {
        entry.resolved.add(hazard.id);
        if (hazard.guardable && this.transformationManager.canGuardProjectile(hazard.x, hazard.y)) {
          this.transformationManager.registerGuardImpact(hazard.x, hazard.y);
        } else this.healthManager.takeDamage(rules.kind === "sneeze_gust" ? entry.plan.x : hazard.x, { type: rules.kind });
      }
      this.draw(entry);
      if (entry.elapsedMs >= entry.plan.durationMs) this.recover(enemy, now);
      return;
    }
    if (state === "recover") {
      if (entry.elapsedMs < rules.recoverMs) return;
      enemy.setData("state", "idle");
    }
    const distance = this.player.x - enemy.x;
    if (this.visible(enemy) && now >= (enemy.getData("attackReadyAt") ?? 0)
      && Math.abs(distance) >= 75 && Math.abs(distance) <= rules.range && Math.abs(this.player.y - enemy.y) < 110) {
      const direction = distance < 0 ? -1 : 1;
      const supported = x => this.levelLoader.terrainObjects.some(t => Math.abs(t.y - enemy.body.bottom) <= 14 && t.x <= x - 36 && t.x + t.width >= x + 36);
      const targetX = rules.kind === "dirt_spout" ? [this.player.x, enemy.x + direction * 96, enemy.x].find(supported) : this.player.x;
      if (targetX === undefined) return;
      entry.plan = createThemedAttack(enemy.getData("type"), { x: enemy.x, floorY: enemy.body.bottom, direction, targetX }, this.easy);
      entry.resolved.clear(); enemy.setFlipX?.(direction < 0);
      this.enter(enemy, "telegraph", "warning"); this.draw(entry, true);
      this.scene.updateAccessibleStatus?.(rules.hint);
      this.scene.audioManager?.playSfx("sfx_boss_warning", { volume: 0.2, randomizeRate: false });
      return;
    }
    let direction = enemy.getData("patrolDirection") ?? -1;
    const patrol = enemy.getData("patrol") ?? 80, spawn = enemy.getData("spawnX");
    if (enemy.x <= spawn - patrol + 2) direction = 1;
    if (enemy.x >= spawn + patrol - 2) direction = -1;
    if (!this.groundAhead(enemy, direction) || enemy.body.blocked[direction < 0 ? "left" : "right"]) direction *= -1;
    const moving = patrol > 0 && this.groundAhead(enemy, direction);
    enemy.setData("patrolDirection", direction); enemy.setFlipX?.(direction < 0);
    enemy.body.setVelocityX(moving ? direction * rules.walkSpeed * (this.easy ? 0.8 : 1) : 0);
    EnemyAnimationManager.play(enemy, moving ? "move" : "idle");
  }

  draw(entry, warning = false) {
    const g = entry.visual.clear(), plan = entry.plan;
    if (!plan) return;
    if (warning) {
      g.lineStyle(2, plan.color, 0.85);
      if (plan.kind === "umbrella_rain") {
        for (const x of getThemedRainColumns(plan)) {
          g.strokeEllipse(x, plan.floorY - 3, 36, 12);
          g.lineBetween(x, plan.floorY - 220, x, plan.floorY - 14);
        }
        return;
      }
      if (plan.kind === "dirt_spout") {
        g.strokeEllipse(plan.targetX, plan.floorY - 3, plan.easy ? 60 : 76, 16);
        g.lineBetween(plan.targetX, plan.floorY - 12, plan.targetX, plan.floorY - (plan.easy ? 64 : 84));
        return;
      }
      for (let time = 0; time < plan.durationMs; time += 120) {
        for (const h of sampleThemedAttack(plan, time)) g.strokeEllipse(h.x, h.y, h.width, h.height);
      }
      return;
    }
    for (const h of sampleThemedAttack(plan, entry.elapsedMs)) {
      if (entry.resolved.has(h.id)) continue;
      if (h.shape === "gust") {
        g.fillStyle(plan.color, 0.7).fillEllipse(h.x, h.y, h.width, h.height);
        g.lineStyle(3, COLORS.outline).strokeEllipse(h.x, h.y, h.width, h.height);
        g.lineStyle(2, COLORS.white).strokeEllipse(h.x, h.y, h.width * 0.6, h.height * 0.6);
        continue;
      }
      if (h.shape === "spout") {
        g.fillStyle(plan.color, 1).fillRoundedRect(h.x - h.width / 2, h.y - h.height / 2, h.width, h.height, 8);
        g.lineStyle(2, COLORS.outline).strokeRoundedRect(h.x - h.width / 2, h.y - h.height / 2, h.width, h.height, 8);
        continue;
      }
      if (h.shape === "ring") {
        g.lineStyle(h.width / 2 - h.innerRadius, plan.color).strokeCircle(h.x, h.y, (h.width / 2 + h.innerRadius) / 2);
        g.lineStyle(2, COLORS.outline).strokeCircle(h.x, h.y, h.width / 2).strokeCircle(h.x, h.y, h.innerRadius);
        continue;
      }
      if (h.shape === "pendulum") g.lineStyle(4, COLORS.collect).lineBetween(plan.x, plan.floorY - 65, h.x, h.y);
      g.fillStyle(plan.color, 1).fillEllipse(h.x, h.y, h.width, h.height);
      g.lineStyle(2, COLORS.outline).strokeEllipse(h.x, h.y, h.width, h.height);
      if (h.shape === "note") g.lineStyle(4, plan.color).lineBetween(h.x + 10, h.y, h.x + 10, h.y - 23)
        .lineBetween(h.x + 10, h.y - 23, h.x + 21, h.y - 17);
    }
  }

  setPaused(paused) { this.paused = paused; }
  getSnapshot() { return [...this.entries].map(([enemy, entry]) => ({ type: enemy.getData("type"), state: enemy.getData("state"),
    elapsedMs: entry.elapsedMs, attacks: entry.attacks, hazards: entry.plan ? sampleThemedAttack(entry.plan, entry.elapsedMs).filter(h => !entry.resolved.has(h.id)) : [] })); }
  destroy() {
    this.scene.events.off(EVENTS.PLAYER_RESPAWNED, this.onRespawn);
    for (const entry of this.entries.values()) entry.visual.destroy();
    this.entries.clear();
  }
}
