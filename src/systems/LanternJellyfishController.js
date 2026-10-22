import { COLORS } from "../config/constants.js";

const RULES = Object.freeze({
  triggerX: 280,
  triggerY: 132,
  warningMs: 720,
  rushMs: 460,
  recoverMs: 680,
  cooldownMs: 2100,
  rushDistance: 170,
  baseScale: 0.82
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (start, end, progress) => start + (end - start) * progress;

export class LanternJellyfishController {
  constructor(scene, player, level) {
    this.scene = scene;
    this.player = player;
    this.waterZones = new Map((level.environment?.waterZones ?? []).map((zone) => [zone.id, zone]));
  }

  update(enemy, now) {
    const anchorX = enemy.getData("spawnX");
    const anchorY = enemy.getData("spawnY");
    const zone = this.waterZones.get(enemy.getData("waterZoneId"));
    if (!zone) return;
    const view = this.scene.cameras.main.worldView;
    const onScreen = enemy.x >= view.left - 96 && enemy.x <= view.right + 96
      && enemy.y >= view.top - 96 && enemy.y <= view.bottom + 96;
    if (!onScreen) {
      if (enemy.getData("state") !== "idle") {
        enemy.setData("state", "idle");
        this.clearWarning(enemy);
        this.place(enemy, anchorX, anchorY);
      }
      return;
    }

    const state = enemy.getData("state");
    if (state === "idle") {
      this.place(enemy, anchorX + Math.sin(now * 0.0015 + anchorX) * 16,
        anchorY + Math.sin(now * 0.003 + anchorX) * 12);
      if (now < (enemy.getData("attackReadyAt") ?? 0)
        || Math.abs(this.player.x - enemy.x) > RULES.triggerX
        || Math.abs(this.player.y - enemy.y) > RULES.triggerY) return;
      const direction = this.player.x >= enemy.x ? 1 : -1;
      enemy.setData({
        state: "warning",
        stateUntil: now + RULES.warningMs,
        warningX: enemy.x,
        warningY: enemy.y,
        rushDirection: direction
      });
      enemy.setFlipX?.(direction > 0);
      return;
    }

    if (state === "warning") {
      const remaining = enemy.getData("stateUntil") - now;
      if (remaining <= 0) {
        const startX = enemy.getData("warningX");
        const startY = enemy.getData("warningY");
        const direction = enemy.getData("rushDirection");
        enemy.setData({
          state: "rush",
          stateUntil: now + RULES.rushMs,
          rushStartX: startX,
          rushStartY: startY,
          rushTargetX: clamp(startX + direction * RULES.rushDistance,
            Math.max(zone.xStart + 80, anchorX - 190), Math.min(zone.xEnd - 80, anchorX + 190)),
          rushTargetY: clamp(this.player.y, Math.max(zone.surfaceY + 184, anchorY - 36),
            Math.min(zone.bottomY - 80, anchorY + 36))
        });
        this.clearWarning(enemy);
        this.scene.audioManager?.playSfx("sfx_water_attack", { volume: 0.3 });
        return;
      }
      const elapsed = RULES.warningMs - remaining;
      const lit = Math.floor(elapsed / 180) % 2 === 0;
      if (enemy.getData("usesArt")) {
        if (lit) enemy.setTint?.(COLORS.collect);
        else enemy.clearTint?.();
      } else enemy.setFillStyle?.(lit ? COLORS.collect : enemy.getData("fallbackColor"));
      enemy.setScale?.(RULES.baseScale + (lit ? 0.06 : 0));
      this.place(enemy, enemy.getData("warningX"), enemy.getData("warningY") + Math.sin(elapsed * 0.03) * 3);
      return;
    }

    if (state === "rush") {
      const remaining = enemy.getData("stateUntil") - now;
      if (remaining <= 0) {
        enemy.setData({
          state: "recover",
          stateUntil: now + RULES.recoverMs,
          recoverStartX: enemy.getData("rushTargetX"),
          recoverStartY: enemy.getData("rushTargetY")
        });
        return;
      }
      const progress = clamp(1 - remaining / RULES.rushMs, 0, 1);
      enemy.setScale?.(RULES.baseScale + 0.05);
      this.place(enemy, lerp(enemy.getData("rushStartX"), enemy.getData("rushTargetX"), progress),
        lerp(enemy.getData("rushStartY"), enemy.getData("rushTargetY"), progress));
      return;
    }

    if (state === "recover") {
      const remaining = enemy.getData("stateUntil") - now;
      if (remaining <= 0) {
        enemy.setData({ state: "idle", attackReadyAt: now + RULES.cooldownMs });
        enemy.setScale?.(RULES.baseScale);
        this.place(enemy, anchorX, anchorY);
        return;
      }
      const progress = clamp(1 - remaining / RULES.recoverMs, 0, 1);
      const eased = progress * (2 - progress);
      enemy.setScale?.(RULES.baseScale);
      this.place(enemy, lerp(enemy.getData("recoverStartX"), anchorX, eased),
        lerp(enemy.getData("recoverStartY"), anchorY, eased));
    }
  }

  place(enemy, x, y) {
    enemy.body.reset(x, y);
  }

  clearWarning(enemy) {
    if (enemy.getData("usesArt")) enemy.clearTint?.();
    else enemy.setFillStyle?.(enemy.getData("fallbackColor"));
    enemy.setScale?.(RULES.baseScale);
  }
}
