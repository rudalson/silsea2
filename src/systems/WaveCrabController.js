import { COLORS } from "../config/constants.js";
import { EnemyAnimationManager } from "./EnemyAnimationManager.js";

export const WAVE_CRAB_RULES = Object.freeze({
  walkSpeed: 38,
  rushSpeed: 145,
  warningMs: 650,
  rushMs: 620,
  rushDistance: 80,
  recoverMs: 500,
  cooldownMs: 2200,
  detectionRange: 220
});

export class WaveCrabController {
  constructor(scene, player, levelLoader, easy = false) {
    this.scene = scene;
    this.player = player;
    this.levelLoader = levelLoader;
    this.easy = easy;
  }

  hasGroundAhead(enemy, direction, distance) {
    const front = enemy.x + direction * (enemy.body.width / 2 + distance);
    return this.levelLoader.terrainObjects.some(terrain =>
      Math.abs(terrain.y - enemy.body.bottom) <= 14
      && terrain.x <= front && terrain.x + terrain.width >= front);
  }

  setPhase(enemy, state, now, duration, sequence) {
    enemy.setData({ state, stateUntil: now + duration });
    enemy.body.setVelocityX(0);
    EnemyAnimationManager.play(enemy, sequence, false);
    if (!enemy.getData("usesArt")) {
      enemy.setFillStyle?.(state === "telegraph" ? COLORS.collect : enemy.getData("fallbackColor"));
    }
  }

  recover(enemy, now) {
    this.setPhase(enemy, "recover", now, WAVE_CRAB_RULES.recoverMs, "recover");
    enemy.setData("attackReadyAt", now + WAVE_CRAB_RULES.recoverMs + WAVE_CRAB_RULES.cooldownMs);
  }

  update(enemy, now, delta) {
    if (!enemy.active || !enemy.body?.enable) return;
    const view = this.scene.cameras.main.worldView;
    const visible = enemy.x >= view.left + 32 && enemy.x <= view.right - 32
      && enemy.y >= view.top && enemy.y <= view.bottom;
    const patrol = Math.max(0, enemy.getData("patrol") ?? 96);
    const left = enemy.getData("spawnX") - patrol;
    const right = enemy.getData("spawnX") + patrol;
    const lookAhead = Math.max(10, WAVE_CRAB_RULES.rushSpeed * Math.max(0, delta) / 1000 + 6);
    const state = enemy.getData("state");

    if (state === "telegraph") {
      if (!visible) { this.recover(enemy, now); return; }
      if (now < enemy.getData("stateUntil")) return;
      enemy.setData("rushStartX", enemy.x);
      this.setPhase(enemy, "rush", now, WAVE_CRAB_RULES.rushMs, "attack");
    }
    if (enemy.getData("state") === "rush") {
      const direction = enemy.getData("rushDirection");
      const blocked = direction < 0 ? enemy.body.blocked.left : enemy.body.blocked.right;
      const atEdge = direction < 0 ? enemy.x <= left + 2 : enemy.x >= right - 2;
      if (!visible || blocked || atEdge || !this.hasGroundAhead(enemy, direction, lookAhead)
        || now >= enemy.getData("stateUntil")
        || Math.abs(enemy.x - enemy.getData("rushStartX")) >= WAVE_CRAB_RULES.rushDistance) {
        this.recover(enemy, now);
        return;
      }
      enemy.body.setVelocityX(direction * WAVE_CRAB_RULES.rushSpeed * (this.easy ? 0.75 : 1));
      return;
    }
    if (state === "recover") {
      if (now < enemy.getData("stateUntil")) return;
      enemy.setData("state", "idle");
    }

    const distance = this.player.x - enemy.x;
    if (enemy.getData("canRush") !== false && visible
      && now >= (enemy.getData("attackReadyAt") ?? 0)
      && Math.abs(distance) >= 78 && Math.abs(distance) <= WAVE_CRAB_RULES.detectionRange
      && Math.abs(this.player.y - enemy.y) <= 90) {
      const direction = distance < 0 ? -1 : 1;
      const room = direction < 0 ? enemy.x - left : right - enemy.x;
      if (room >= 32 && this.hasGroundAhead(enemy, direction, lookAhead)) {
        enemy.setData("rushDirection", direction);
        enemy.setFlipX?.(direction > 0); // Source art faces left.
        this.setPhase(enemy, "telegraph", now, WAVE_CRAB_RULES.warningMs * (this.easy ? 1.3 : 1), "warning");
        this.scene.updateAccessibleStatus?.("파도 집게게가 집게를 듭니다. 잠시 뒤 옆으로 돌진하니 점프로 피하세요.");
        return;
      }
    }

    let direction = enemy.getData("patrolDirection") ?? -1;
    if (enemy.x <= left + 2) direction = 1;
    if (enemy.x >= right - 2) direction = -1;
    if (enemy.body.blocked[direction < 0 ? "left" : "right"] || !this.hasGroundAhead(enemy, direction, lookAhead)) direction *= -1;
    const canMove = patrol > 0 && this.hasGroundAhead(enemy, direction, lookAhead)
      && !(direction < 0 ? enemy.x <= left : enemy.x >= right);
    enemy.setData("patrolDirection", direction);
    enemy.body.setVelocityX(canMove ? direction * WAVE_CRAB_RULES.walkSpeed : 0);
    enemy.setFlipX?.(direction > 0);
    EnemyAnimationManager.play(enemy, canMove ? "move" : "idle");
  }
}
