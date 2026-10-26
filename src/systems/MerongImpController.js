import { COLORS, EVENTS } from "../config/constants.js";
import { createMerongPrank, findMerongPrankHit, MERONG_IMP_RULES as RULES, sampleMerongPrank } from "../data/merongImpAttack.js";
import { EnemyAnimationManager } from "./EnemyAnimationManager.js";

export class MerongImpController {
  constructor(scene, player, loader, health, transformation, easy = false) {
    Object.assign(this, { scene, player, loader, health, transformation, easy });
    this.entries = new Map(); this.paused = false;
    for (const enemy of loader.enemies.filter(enemy => enemy.getData("type") === "merong_imp")) {
      this.entries.set(enemy, { visual: scene.add.graphics().setDepth(7), elapsedMs: 0, plan: null, attacks: 0 });
    }
    this.onRespawn = () => { for (const enemy of this.entries.keys()) this.cancel(enemy); };
    scene.events.on(EVENTS.PLAYER_RESPAWNED, this.onRespawn);
  }

  visible(enemy) {
    const view = this.scene.cameras.main.worldView;
    return enemy.x >= view.left + 32 && enemy.x <= view.right - 32 && enemy.y >= view.top && enemy.y <= view.bottom;
  }

  groundSpan(enemy) {
    const floors = this.loader.terrainObjects.filter(tile => Math.abs(tile.y - enemy.body.bottom) <= 14).sort((a, b) => a.x - b.x);
    let left = enemy.x, right = enemy.x;
    for (const tile of floors) {
      if (tile.x <= left && tile.x + tile.width >= left) left = tile.x;
      if (tile.x <= right && tile.x + tile.width >= right) right = tile.x + tile.width;
    }
    // Revisit leftward joins because the sorted pass may have reached this slab
    // only after an earlier contiguous slab had already been considered.
    for (let index = floors.length - 1; index >= 0; index--) {
      const tile = floors[index]; if (tile.x <= left && tile.x + tile.width >= left) left = tile.x;
    }
    return { left, right };
  }

  enter(enemy, state, role) {
    this.entries.get(enemy).elapsedMs = 0; enemy.setData("state", state); enemy.body.setVelocityX(0);
    EnemyAnimationManager.play(enemy, role, false);
  }

  cancel(enemy, now = this.scene.time.now) {
    const entry = this.entries.get(enemy); if (!entry) return;
    entry.visual.clear(); entry.plan = null; entry.elapsedMs = 0; enemy.body?.setVelocityX(0);
    enemy.setData({ state: "idle", attackReadyAt: now + 450 });
    if (enemy.body?.enable) EnemyAnimationManager.play(enemy, "idle");
  }

  recover(enemy, now) {
    const entry = this.entries.get(enemy); entry.visual.clear(); entry.plan = null;
    enemy.setData("attackReadyAt", now + RULES.recoverMs + RULES.cooldownMs);
    this.enter(enemy, "recover", "recover");
  }

  update(enemy, now, delta) {
    if (this.paused || !enemy.active || !enemy.body?.enable) return;
    const entry = this.entries.get(enemy), state = enemy.getData("state");
    if (!this.player.body?.enable) { this.cancel(enemy, now); return; }
    if (["telegraph", "attack"].includes(state) && !this.visible(enemy)) { this.recover(enemy, now); return; }
    if (["telegraph", "attack", "recover"].includes(state)) entry.elapsedMs += Math.max(0, delta);
    if (state === "telegraph") {
      if (entry.elapsedMs >= RULES.warningMs * (this.easy ? 1.4 : 1)) {
        this.enter(enemy, "attack", "attack"); entry.attacks++;
        this.scene.audioManager?.playSfx("sfx_merong_tongue", { volume: 0.25, randomizeRate: false });
      }
      return;
    }
    if (state === "attack") {
      const hit = findMerongPrankHit(entry.plan, entry.elapsedMs - delta, entry.elapsedMs, this.player.body);
      if (hit) {
        if (this.transformation.canGuardProjectile(hit.x, hit.y)) this.transformation.registerGuardImpact(hit.x, hit.y);
        else this.health.takeDamage(hit.x, { type: "merong_prank" });
        // One balloon, including its burst, can resolve only one hit or guard.
        this.recover(enemy, now); return;
      }
      this.draw(entry);
      if (entry.elapsedMs >= entry.plan.durationMs) this.recover(enemy, now);
      return;
    }
    if (state === "recover") {
      if (entry.elapsedMs < RULES.recoverMs) return;
      enemy.setData("state", "idle");
    }
    const distance = this.player.x - enemy.x, span = this.groundSpan(enemy);
    if (this.visible(enemy) && now >= (enemy.getData("attackReadyAt") ?? 0) && Math.abs(distance) >= 85
      && Math.abs(distance) <= RULES.range && Math.abs(this.player.y - enemy.y) < 110 && span.left < span.right) {
      const direction = distance < 0 ? -1 : 1;
      entry.plan = createMerongPrank({ x: enemy.x, floorY: enemy.body.bottom, direction, groundLimit: direction < 0 ? span.left : span.right }, this.easy);
      enemy.setFlipX(direction < 0); this.enter(enemy, "telegraph", "warning");
      this.scene.updateAccessibleStatus?.("메롱 꼬마가 볼을 부풀려요. 튀는 풍선과 터질 때 나오는 짧은 혀를 점프로 피하거나 날개로 막아요.");
      return;
    }
    let direction = enemy.getData("patrolDirection") ?? -1;
    const spawn = enemy.getData("spawnX"), patrol = enemy.getData("patrol") ?? 96;
    if (enemy.x <= spawn - patrol) direction = 1;
    if (enemy.x >= spawn + patrol) direction = -1;
    if (enemy.x + direction * (enemy.body.width / 2 + 18) < span.left || enemy.x + direction * (enemy.body.width / 2 + 18) > span.right) direction *= -1;
    enemy.setData("patrolDirection", direction); enemy.setFlipX(direction < 0);
    const safe = patrol > 0 && enemy.x + direction * (enemy.body.width / 2 + 18) >= span.left && enemy.x + direction * (enemy.body.width / 2 + 18) <= span.right;
    enemy.body.setVelocityX(safe ? direction * RULES.walkSpeed * (this.easy ? 0.8 : 1) : 0);
    EnemyAnimationManager.play(enemy, safe ? "move" : "idle");
  }

  draw(entry) {
    const g = entry.visual.clear();
    for (const hazard of sampleMerongPrank(entry.plan, entry.elapsedMs)) {
      if (hazard.shape === "balloon") {
        const { x, y, width } = hazard;
        g.lineStyle(2, COLORS.dangerAlt).lineBetween(x, y + width / 2, x - entry.plan.direction * 8, y + width / 2 + 8);
        g.fillStyle(COLORS.collectPink, 0.95).fillCircle(x, y, width / 2);
        g.lineStyle(2, COLORS.outline).strokeCircle(x, y, width / 2);
        g.fillStyle(COLORS.white, 0.9).fillEllipse(x - 6, y - 7, 8, 5);
        const facing = entry.plan.direction;
        g.fillStyle(COLORS.outline).fillCircle(x + facing * 3, y - 3, 2).fillCircle(x + facing * 10, y - 3, 2);
        g.lineStyle(2, COLORS.dangerAlt).lineBetween(x + facing * 3, y + 5, x + facing * 10, y + 5);
      } else {
        g.fillStyle(COLORS.collectPink).fillRoundedRect(hazard.x - hazard.width / 2, hazard.y - 9, hazard.width, 18, 8);
        g.lineStyle(2, COLORS.dangerAlt).strokeRoundedRect(hazard.x - hazard.width / 2, hazard.y - 9, hazard.width, 18, 8);
        const direction = entry.plan.direction, start = entry.plan.popX, tip = start + direction * (hazard.width - 9);
        if (hazard.width > 24) {
          g.lineStyle(2, COLORS.white, 0.65).lineBetween(start + direction * 4, hazard.y - 4, start + direction * hazard.width * 0.35, hazard.y - 4);
          g.lineStyle(2, COLORS.dangerAlt).beginPath();
          g.arc(tip, hazard.y, 4, direction < 0 ? -Math.PI / 2 : Math.PI / 2, direction < 0 ? Math.PI : -Math.PI / 2, direction > 0);
          g.strokePath();
        }
        // Burst fragments stay at the balloon's mouth while the curled tongue snaps.
        for (const offset of [-1, 1]) g.lineStyle(2, COLORS.collectPink).lineBetween(entry.plan.popX + offset * 8, hazard.y - 17, entry.plan.popX + offset * 14, hazard.y - 24);
      }
    }
  }

  setPaused(paused) { this.paused = paused; }
  getSnapshot() { return [...this.entries].map(([enemy, entry]) => ({ state: enemy.getData("state"), attacks: entry.attacks,
    elapsedMs: entry.elapsedMs, hazards: entry.plan && enemy.getData("state") === "attack" ? sampleMerongPrank(entry.plan, entry.elapsedMs) : [] })); }
  destroy() {
    this.scene.events.off(EVENTS.PLAYER_RESPAWNED, this.onRespawn);
    for (const entry of this.entries.values()) entry.visual.destroy(); this.entries.clear();
  }
}
