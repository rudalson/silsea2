import { COLORS } from "../config/constants.js";
import { EnemyAnimationManager } from "./EnemyAnimationManager.js";

export const CORAL_URCHIN_RULES = Object.freeze({
  detectionRange: 400,
  minimumRange: 88,
  verticalRange: 180,
  warningMs: 750,
  cooldownMs: 2700,
  shotSpeed: 310,
  shotLifetimeMs: 1800,
  maxActiveShots: 6,
  muzzleOffsetX: 28,
  muzzleOffsetY: 32
});

export class CoralUrchinController {
  constructor(scene, player, projectileDifficulty = {}, fireShot = () => {}) {
    this.scene = scene;
    this.player = player;
    this.projectileDifficulty = projectileDifficulty;
    this.fireShot = fireShot;
  }

  isVisible(hazard) {
    const view = this.scene.cameras.main.worldView;
    return hazard.x >= view.left - 32 && hazard.x <= view.right + 32
      && hazard.y >= view.top && hazard.y <= view.bottom;
  }

  update(hazard, now) {
    if (!hazard.active || !hazard.body?.enable) return;
    const state = hazard.getData("state") ?? "idle";
    if (state === "telegraph") {
      if (!this.isVisible(hazard)) {
        this.cancel(hazard);
        return;
      }
      if (now < hazard.getData("stateUntil")) {
        hazard.getData("aimLine")?.setAlpha(0.6 + Math.sin(now / 70) * 0.2);
        return;
      }
      this.fire(hazard, now);
      return;
    }
    if (state === "cooldown") {
      if (now < hazard.getData("stateUntil")) return;
      hazard.setData("state", "idle");
    }
    if (!this.isVisible(hazard) || now < (hazard.getData("attackReadyAt") ?? 0)) return;
    const targetX = this.player.body?.center?.x ?? this.player.x;
    const targetY = this.player.body?.center?.y ?? this.player.y - 30;
    const distanceX = targetX - hazard.x;
    const distanceY = targetY - (hazard.y - CORAL_URCHIN_RULES.muzzleOffsetY);
    if (Math.abs(distanceX) < CORAL_URCHIN_RULES.minimumRange
      || Math.abs(distanceX) > CORAL_URCHIN_RULES.detectionRange
      || Math.abs(distanceY) > CORAL_URCHIN_RULES.verticalRange) return;
    this.beginTelegraph(hazard, now, targetX, targetY);
  }

  beginTelegraph(hazard, now, targetX, targetY) {
    const direction = targetX < hazard.x ? -1 : 1;
    const originX = hazard.x + direction * CORAL_URCHIN_RULES.muzzleOffsetX;
    const originY = hazard.y - CORAL_URCHIN_RULES.muzzleOffsetY;
    const warningMs = CORAL_URCHIN_RULES.warningMs
      * (this.projectileDifficulty.telegraphMultiplier ?? 1);
    hazard.setData({ state: "telegraph", stateUntil: now + warningMs, targetX, targetY, direction });
    hazard.setFlipX?.(direction > 0);
    EnemyAnimationManager.play(hazard, "warning", false);
    const aimLine = hazard.getData("aimLine") ?? this.scene.add.graphics().setDepth(9);
    aimLine.clear().lineStyle(3, COLORS.collectBlue, 0.76)
      .beginPath().moveTo(originX, originY).lineTo(targetX, targetY).strokePath()
      .setVisible(true).setAlpha(1);
    hazard.setData("aimLine", aimLine);
    this.scene.updateAccessibleStatus?.("산호 성게가 물총을 조준합니다. 조준선을 보고 피하거나 날개로 막으세요.");
  }

  fire(hazard, now) {
    const direction = hazard.getData("direction");
    const originX = hazard.x + direction * CORAL_URCHIN_RULES.muzzleOffsetX;
    const originY = hazard.y - CORAL_URCHIN_RULES.muzzleOffsetY;
    const dx = hazard.getData("targetX") - originX;
    const dy = hazard.getData("targetY") - originY;
    const angle = Math.atan2(dy, dx);
    const speed = CORAL_URCHIN_RULES.shotSpeed
      * (this.projectileDifficulty.speedMultiplier ?? 1);
    this.fireShot({
      x: originX,
      y: originY,
      angle,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      expiresAt: now + CORAL_URCHIN_RULES.shotLifetimeMs
    }, hazard);
    hazard.getData("aimLine")?.clear().setVisible(false);
    EnemyAnimationManager.play(hazard, "idle", false);
    const cooldownMs = CORAL_URCHIN_RULES.cooldownMs
      * (this.projectileDifficulty.cooldownMultiplier ?? 1);
    hazard.setData({ state: "cooldown", stateUntil: now + cooldownMs });
  }

  cancel(hazard) {
    hazard.getData("aimLine")?.clear().setVisible(false);
    if (hazard.getData("state") === "telegraph") {
      hazard.setData("state", "idle");
      EnemyAnimationManager.play(hazard, "idle", false);
    }
  }
}
