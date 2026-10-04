import { EnemyAnimationManager } from "./EnemyAnimationManager.js";
import { COLORS } from "../config/constants.js";

const RULES = Object.freeze({
  lantern_goblin: { name: "등불 도깨비", walkSpeed: 34, rushSpeed: 145, warningMs: 1100, rushMs: 620, distance: 90, cooldownMs: 2200 },
  dew_snail: { name: "이슬달팽이", walkSpeed: 20, rushSpeed: 110, warningMs: 1200, rushMs: 760, distance: 84, cooldownMs: 2600 }
});

export class MistEnemyController {
  constructor(scene, player, levelLoader, easy = false) {
    this.scene = scene;
    this.player = player;
    this.levelLoader = levelLoader;
    this.easy = easy;
  }

  hasGroundAhead(enemy, direction, distance = 10) {
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

  recover(enemy, now, rules) {
    this.setPhase(enemy, "recover", now, 680, "recover");
    enemy.setData("attackReadyAt", now + 680 + rules.cooldownMs);
  }

  update(enemy, now, delta) {
    const rules = RULES[enemy.getData("type")];
    if (!rules || !enemy.active || !enemy.body?.enable) return;
    const state = enemy.getData("state");
    const view = this.scene.cameras.main.worldView;
    const visible = enemy.x >= view.left + 32 && enemy.x <= view.right - 32
      && enemy.y >= view.top && enemy.y <= view.bottom;
    const patrol = Math.max(0, enemy.getData("patrol") ?? 80);
    const left = enemy.getData("spawnX") - patrol;
    const right = enemy.getData("spawnX") + patrol;
    const lookAhead = Math.max(10, rules.rushSpeed * Math.max(0, delta) / 1000 + 6);

    if (state === "telegraph") {
      // Leaving the screen cancels anticipation: no unseen charged attack.
      if (!visible) { this.recover(enemy, now, rules); return; }
      if (now < enemy.getData("stateUntil")) return;
      enemy.setData("rushStartX", enemy.x);
      this.setPhase(enemy, "rush", now, rules.rushMs, "attack");
    }
    if (enemy.getData("state") === "rush") {
      const direction = enemy.getData("rushDirection");
      const blocked = direction < 0 ? enemy.body.blocked.left : enemy.body.blocked.right;
      const atEdge = direction < 0 ? enemy.x <= left + 2 : enemy.x >= right - 2;
      if (!visible || blocked || atEdge || !this.hasGroundAhead(enemy, direction, lookAhead)
        || now >= enemy.getData("stateUntil")
        || Math.abs(enemy.x - enemy.getData("rushStartX")) >= rules.distance) {
        this.recover(enemy, now, rules);
        return;
      }
      enemy.body.setVelocityX(direction * rules.rushSpeed * (this.easy ? 0.75 : 1));
      return;
    }
    if (state === "recover") {
      if (now < enemy.getData("stateUntil")) return;
      enemy.setData("state", "idle");
    }

    const distance = this.player.x - enemy.x;
    if (visible && now >= (enemy.getData("attackReadyAt") ?? 0)
      && Math.abs(distance) >= 80 && Math.abs(distance) <= 230
      && Math.abs(this.player.y - enemy.y) <= 90) {
      const direction = distance < 0 ? -1 : 1;
      if (this.hasGroundAhead(enemy, direction, lookAhead)) {
        enemy.setData("rushDirection", direction);
        enemy.setFlipX?.(direction > 0); // Source art faces left.
        this.setPhase(enemy, "telegraph", now, rules.warningMs * (this.easy ? 1.3 : 1), "warning");
        this.scene.updateAccessibleStatus?.(rules.name === "등불 도깨비"
          ? "등불 도깨비의 등불이 깜빡입니다. 잠시 뒤 앞으로 달려오니 점프로 피하세요."
          : "이슬달팽이가 껍질 속으로 숨습니다. 잠시 뒤 굴러오니 점프로 피하세요.");
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
    enemy.body.setVelocityX(canMove ? direction * rules.walkSpeed : 0);
    enemy.setFlipX?.(direction > 0);
    EnemyAnimationManager.play(enemy, canMove ? "move" : "idle");
  }
}
