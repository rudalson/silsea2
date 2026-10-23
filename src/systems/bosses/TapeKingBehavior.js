import { COLORS, EVENTS } from "../../config/constants.js";
import { advanceTapeProjectile, canHitTapeKing, planTapePatches, tapeProjectileHits, TAPE_KING_PHASES } from "../../data/tapeMechanics.js";
import { EnemyAnimationManager } from "../EnemyAnimationManager.js";
import { playBossStateSfx } from "./bossAudio.js";

export class TapeKingBehavior {
  constructor(context) {
    Object.assign(this, context);
    this.boss = this.levelLoader.boss;
    this.section = this.boss.getData("section");
    this.state = "dormant";
    this.elapsedMs = 0;
    this.stepIndex = 0;
    this.shots = [];
    this.patches = [];
    this.defeated = false;
    this.visual = this.scene.add.graphics().setDepth(7);
    this.weakness = this.scene.add.star(this.boss.x, this.boss.body.top - 24, 5, 9, 21, COLORS.collect)
      .setStrokeStyle(3, COLORS.outline).setDepth(8).setVisible(false);
    this.fallback = this.boss.getData("usesArt") ? null : this.createFallback();
    this.boss.setVisible(false);
    this.boss.body.enable = false;
    this.boss.getData("label")?.setVisible(false);
    this.onRespawn = () => this.resetAfterRespawn();
    this.scene.events.on(EVENTS.PLAYER_RESPAWNED, this.onRespawn);
  }

  createFallback() {
    const x = this.boss.x, y = this.boss.y;
    const visual = this.scene.add.graphics().setDepth(4).setVisible(false);
    visual.fillStyle(COLORS.collectBlue).fillRoundedRect(x - 70, y - 90, 140, 68, 16);
    visual.lineStyle(4, COLORS.outline).strokeRoundedRect(x - 70, y - 90, 140, 68, 16);
    visual.fillStyle(COLORS.collect).fillCircle(x - 28, y - 76, 36);
    visual.lineStyle(4, COLORS.outline).strokeCircle(x - 28, y - 76, 36);
    visual.fillStyle(COLORS.white).fillCircle(x - 28, y - 76, 14);
    visual.lineStyle(6, COLORS.outline).lineBetween(x - 38, y - 22, x - 38, y).lineBetween(x + 40, y - 22, x + 40, y);
    visual.fillStyle(COLORS.outline).fillCircle(x + 19, y - 67, 4).fillCircle(x + 41, y - 67, 4);
    return visual;
  }

  get pattern() { return TAPE_KING_PHASES[this.boss.getData("phase")]; }
  get step() { return this.pattern.steps[this.stepIndex]; }

  enter(state, durationMs, animation) {
    playBossStateSfx(this.scene, "tape_king", state, this.step?.type);
    this.state = state; this.elapsedMs = 0; this.durationMs = durationMs;
    this.boss.setData({ bossState: state, vulnerable: state === "vulnerable" });
    this.weakness.setVisible(state === "vulnerable");
    if (animation && this.boss.getData("usesArt")) EnemyAnimationManager.play(this.boss, animation, false);
  }

  beginWarning() {
    const direction = this.player.x < this.boss.x ? -1 : 1;
    this.boss.setFlipX(direction < 0);
    this.pending = this.step.type === "patch"
      ? { type: "patch", zones: planTapePatches({ playerX: this.player.x, bossX: this.boss.x,
          section: this.section, floorY: this.boss.y, count: this.easyMode ? 1 : this.step.count,
          speedMultiplier: this.easyMode ? 0.8 : 0.6 }) }
      : { type: "shot", x: this.boss.x + direction * 65, y: this.boss.y - this.step.laneOffset, direction };
    this.enter("warning", this.pattern.warningMs * this.telegraphMultiplier, "warning");
    this.scene.audioManager?.playSfx("sfx_boss_warning", { randomizeRate: false });
    this.scene.updateAccessibleStatus?.(this.step.type === "patch" ? "테이프 대왕: 표시된 바닥에 테이프를 붙여요. 점프로 빠져나가세요."
      : this.step.laneOffset < 60 ? "테이프 대왕: 낮은 조각 예고. 점프하거나 날개로 막으세요." : "테이프 대왕: 높은 조각 예고. 바닥에서 기다리세요.");
  }

  launch() {
    if (this.pending.type === "patch") {
      this.patches = this.pending.zones.map((zone) => ({ ...zone, remainingMs: this.pattern.patchLifetimeMs }));
      this.publishPatches();
    } else {
      const { x, y, direction } = this.pending;
      this.shots.push({ x, previousX: x, y, velocityX: direction * this.pattern.projectileSpeed * (this.easyMode ? 0.8 : 1),
        elapsedMs: 0, lifetimeMs: this.pattern.projectileMs, active: true });
    }
    this.pending = null;
    this.enter("attack", this.step.type === "shot" ? this.pattern.projectileMs : 1700, "attack");
  }

  publishPatches() {
    this.scene.courseMechanics?.setTransientStickyZones(this, this.patches);
  }

  updateAttacks(delta) {
    this.shots = this.shots.map((shot) => advanceTapeProjectile(shot, delta)).filter((shot) => {
      if (!shot.active) return false;
      if (tapeProjectileHits(shot, this.player.body)) {
        if (this.transformationManager.canGuardProjectile(shot.x, shot.y)) this.transformationManager.registerGuardImpact(shot.x, shot.y);
        else this.healthManager.takeDamage(shot.x, { type: "tape_piece" });
        return false;
      }
      return shot.x > this.section.xStart && shot.x < this.section.xEnd;
    });
    this.patches = this.patches.map((zone) => ({ ...zone, remainingMs: zone.remainingMs - delta })).filter(({ remainingMs }) => remainingMs > 0);
    this.publishPatches();
  }

  drawAttacks() {
    const visual = this.visual.clear();
    for (const zone of this.patches) {
      visual.fillStyle(COLORS.collect, 0.95).fillRoundedRect(zone.x, zone.y, zone.width, zone.height, 4);
      visual.lineStyle(3, COLORS.outline).strokeRoundedRect(zone.x, zone.y, zone.width, zone.height, 4);
      visual.lineStyle(2, COLORS.white);
      for (let x = zone.x + 12; x < zone.x + zone.width - 8; x += 32) visual.lineBetween(x, zone.y + 10, x + 8, zone.y + 2);
    }
    for (const shot of this.shots) {
      visual.fillStyle(COLORS.collect).fillRoundedRect(shot.x - 24, shot.y - 10, 48, 20, 4);
      visual.lineStyle(3, COLORS.outline).strokeRoundedRect(shot.x - 24, shot.y - 10, 48, 20, 4);
      visual.lineStyle(3, COLORS.white).lineBetween(shot.x - 12, shot.y + 6, shot.x - 2, shot.y - 6);
    }
    if (this.state !== "warning" || !this.pending) return;
    visual.lineStyle(4, COLORS.dangerAlt);
    if (this.pending.type === "patch") {
      for (const zone of this.pending.zones) {
        visual.fillStyle(COLORS.collectPink, 0.25).fillRect(zone.x, zone.y - 12, zone.width, 24);
        visual.strokeRect(zone.x, zone.y - 12, zone.width, 24);
        visual.lineBetween(zone.x + zone.width / 2, zone.y - 58, zone.x + zone.width / 2, zone.y - 30);
        visual.strokeCircle(zone.x + zone.width / 2, zone.y - 22, 3);
      }
    } else {
      const { x, y, direction } = this.pending;
      const reach = Math.min(760, direction < 0 ? x - this.section.xStart : this.section.xEnd - x);
      visual.fillStyle(COLORS.collect, 0.18).fillRect(direction < 0 ? x - reach : x, y - 10, reach, 20);
      visual.lineBetween(x, y, x + direction * reach, y);
      visual.lineBetween(x + direction * reach, y, x + direction * (reach - 24), y - 14);
      visual.lineBetween(x + direction * reach, y, x + direction * (reach - 24), y + 14);
    }
  }

  update(_now, delta) {
    if (this.defeated || !this.boss?.active || !this.player.body?.enable) return;
    if (this.player.x < this.section.xStart || this.player.x > this.section.xEnd) {
      if (this.state !== "dormant") this.sleep();
      return;
    }
    if (this.state === "dormant") {
      this.boss.setVisible(!this.fallback); this.boss.body.enable = true; this.fallback?.setVisible(true);
      this.enter("intro", 1000, "idle");
      this.scene.updateAccessibleStatus?.("테이프 작업장! 공격이 끝나 절단부에 걸렸을 때 빛나는 머리를 밟으세요.");
      return;
    }
    this.elapsedMs += delta;
    this.updateAttacks(delta);
    this.weakness.setPosition(this.boss.x, this.boss.body.top - 24);
    if (this.elapsedMs >= this.durationMs) {
      switch (this.state) {
        case "intro": case "hurt": case "recovery": this.stepIndex = 0; this.beginWarning(); break;
        case "warning": this.launch(); break;
        case "attack":
          this.stepIndex++;
          if (this.stepIndex < this.pattern.steps.length) this.enter("between", 450, "idle");
          else {
            this.clearAttacks();
            this.enter("vulnerable", this.pattern.vulnerabilityMs * this.vulnerabilityMultiplier, "vulnerable");
            this.scene.updateAccessibleStatus?.("테이프가 절단부에 걸렸어요! 바닥이 풀렸으니 빛나는 머리를 밟으세요.");
          }
          break;
        case "between": this.beginWarning(); break;
        case "vulnerable": this.enter("recovery", 800, "idle"); break;
      }
    }
    this.drawAttacks();
  }

  onPlayerContact({ fallingOntoHead, attemptHit, damagePlayer }) {
    const didHit = canHitTapeKing(this.state, fallingOntoHead) && attemptHit();
    if (!didHit) damagePlayer();
    return { didHit: Boolean(didHit) };
  }
  onBossHit({ hp }) {
    this.scoreManager.defeat("boss_hit", this.transformationManager.scoreMultiplier);
    this.clearAttacks();
    if (hp > 0) this.enter("hurt", 900, "hurt");
  }
  clearAttacks() {
    this.shots = []; this.patches = []; this.pending = null;
    this.scene.courseMechanics?.clearTransientStickyZones(this);
    this.visual.clear();
  }
  onBossDefeated() {
    this.defeated = true; this.clearAttacks(); this.enter("defeated", 0, "defeated");
    this.boss.setActive(false); this.fallback?.setAlpha(0.55);
  }
  sleep() {
    this.clearAttacks(); this.enter("dormant", 0);
    this.boss.setVisible(false); this.boss.body.enable = false; this.fallback?.setVisible(false);
  }
  resetAfterRespawn() {
    if (this.defeated) return;
    this.boss.setData({ hp: this.boss.getData("maxHp"), phase: 1 }); this.sleep();
  }
  getPoolSnapshot() { return {}; }
  destroy() {
    this.scene.events.off(EVENTS.PLAYER_RESPAWNED, this.onRespawn);
    this.clearAttacks(); this.visual.destroy(); this.weakness.destroy(); this.fallback?.destroy();
  }
}
