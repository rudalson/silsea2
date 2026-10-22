import { COLORS } from "../config/constants.js";
import { EnemyAnimationManager } from "./EnemyAnimationManager.js";

export const WAVE_CRAB_RULES = Object.freeze({
  walkSpeed: 44,
  rushSpeed: 145,
  warningMs: 650,
  rushMs: 500,
  rushDistance: 56,
  followupWarningMs: 360,
  followupRushSpeed: 180,
  followupRushMs: 420,
  followupDistance: 52,
  followupRange: 170,
  recoverMs: 500,
  cooldownMs: 2500,
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
      enemy.setFillStyle?.(["telegraph", "reaim"].includes(state) ? COLORS.collect : enemy.getData("fallbackColor"));
    }
  }

  recover(enemy, now) {
    this.setPhase(enemy, "recover", now, WAVE_CRAB_RULES.recoverMs, "recover");
    enemy.setData({ rushLeg: 0, attackReadyAt: now + WAVE_CRAB_RULES.recoverMs + WAVE_CRAB_RULES.cooldownMs });
  }

  beginFollowup(enemy, now, left, right, lookAhead) {
    if (this.easy) return false;
    const distance = this.player.x - enemy.x;
    if (Math.abs(distance) < 55 || Math.abs(distance) > WAVE_CRAB_RULES.followupRange
      || Math.abs(this.player.y - enemy.y) > 90) return false;
    const direction = distance < 0 ? -1 : 1;
    const room = direction < 0 ? enemy.x - left : right - enemy.x;
    if (room < 32 || !this.hasGroundAhead(enemy, direction, lookAhead)) return false;
    enemy.setData({ rushDirection: direction, rushLeg: 2 });
    enemy.setFlipX?.(direction > 0);
    this.setPhase(enemy, "reaim", now, WAVE_CRAB_RULES.followupWarningMs, "warning");
    this.scene.updateAccessibleStatus?.("파도 집게게가 방향을 바꿔 집게를 다시 듭니다. 짧은 두 번째 돌진을 피하세요.");
    return true;
  }

  update(enemy, now, delta) {
    if (!enemy.active || !enemy.body?.enable) return;
    const view = this.scene.cameras.main.worldView;
    const visible = enemy.x >= view.left + 32 && enemy.x <= view.right - 32
      && enemy.y >= view.top && enemy.y <= view.bottom;
    const patrol = Math.max(0, enemy.getData("patrol") ?? 96);
    const left = enemy.getData("spawnX") - patrol;
    const right = enemy.getData("spawnX") + patrol;
    const lookAhead = Math.max(10, WAVE_CRAB_RULES.followupRushSpeed * Math.max(0, delta) / 1000 + 6);
    const state = enemy.getData("state");

    if (state === "telegraph" || state === "reaim") {
      if (!visible) { this.recover(enemy, now); return; }
      if (now < enemy.getData("stateUntil")) return;
      const direction = enemy.getData("rushDirection");
      const room = direction < 0 ? enemy.x - left : right - enemy.x;
      if (room < 32 || !this.hasGroundAhead(enemy, direction, lookAhead)) {
        this.recover(enemy, now);
        return;
      }
      const leg = state === "reaim" ? 2 : 1;
      enemy.setData({ rushStartX: enemy.x, rushLeg: leg });
      this.setPhase(enemy, "rush", now, leg === 2 ? WAVE_CRAB_RULES.followupRushMs : WAVE_CRAB_RULES.rushMs, "attack");
    }
    if (enemy.getData("state") === "rush") {
      const direction = enemy.getData("rushDirection");
      const leg = enemy.getData("rushLeg") ?? 1;
      const blocked = direction < 0 ? enemy.body.blocked.left : enemy.body.blocked.right;
      const atEdge = direction < 0 ? enemy.x <= left + 2 : enemy.x >= right - 2;
      const groundAhead = this.hasGroundAhead(enemy, direction, lookAhead);
      const distanceLimit = leg === 2 ? WAVE_CRAB_RULES.followupDistance : WAVE_CRAB_RULES.rushDistance;
      if (!visible || blocked || atEdge || !groundAhead
        || now >= enemy.getData("stateUntil")
        || Math.abs(enemy.x - enemy.getData("rushStartX")) >= distanceLimit) {
        if (leg === 1 && visible && !blocked && !atEdge && groundAhead
          && this.beginFollowup(enemy, now, left, right, lookAhead)) return;
        this.recover(enemy, now);
        return;
      }
      const speed = leg === 2 ? WAVE_CRAB_RULES.followupRushSpeed : WAVE_CRAB_RULES.rushSpeed;
      enemy.body.setVelocityX(direction * speed * (this.easy ? 0.75 : 1));
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
