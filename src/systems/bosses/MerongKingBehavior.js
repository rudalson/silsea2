import { COLORS, EVENTS } from "../../config/constants.js";
import { canHitMerongKing, MERONG_KING_PHASES } from "../../data/tongueMechanics.js";
import { EnemyAnimationManager } from "../EnemyAnimationManager.js";
import { TongueAttack } from "../TongueAttack.js";
import { playBossStateSfx } from "./bossAudio.js";

export class MerongKingBehavior {
  constructor(context) {
    Object.assign(this, context);
    this.boss = this.levelLoader.boss;
    this.section = this.boss.getData("section");
    this.state = "dormant";
    this.elapsedMs = 0;
    this.attackIndex = 0;
    this.defeated = false;
    this.tongue = new TongueAttack(this.scene);
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
    const face = this.scene.add.graphics().setDepth(4).setVisible(false);
    face.fillStyle(COLORS.collectPink).fillEllipse(x, y - 82, 156, 96);
    face.lineStyle(4, COLORS.outline).strokeEllipse(x, y - 82, 156, 96);
    face.fillStyle(COLORS.dangerAlt).fillEllipse(x, y - 72, 104, 54);
    face.fillStyle(COLORS.white).fillCircle(x - 28, y - 112, 6).fillCircle(x + 28, y - 112, 6);
    face.lineStyle(6, COLORS.outline).lineBetween(x - 24, y - 36, x - 32, y).lineBetween(x + 24, y - 36, x + 32, y);
    return face;
  }

  get pattern() { return MERONG_KING_PHASES[this.boss.getData("phase")]; }

  enter(state, durationMs, animation) {
    playBossStateSfx(this.scene, "merong_king", state);
    this.state = state;
    this.elapsedMs = 0;
    this.durationMs = durationMs;
    this.boss.setData("bossState", state);
    this.boss.setData("vulnerable", state === "vulnerable");
    this.weakness.setVisible(state === "vulnerable");
    if (animation && this.boss.getData("usesArt")) EnemyAnimationManager.play(this.boss, animation, false);
  }

  beginWarning() {
    const attack = this.pattern.attacks[this.attackIndex];
    const direction = this.player.x < this.boss.x ? -1 : 1;
    this.attack = { x: this.boss.x + direction * 42, y: this.boss.y - attack.laneOffset, direction, reach: attack.reach };
    this.boss.setFlipX(direction > 0);
    this.enter("warning", this.pattern.warningMs * this.telegraphMultiplier, "warning");
    this.tongue.show(this.attack, { warning: true });
    this.scene.audioManager?.playSfx("sfx_boss_warning", { randomizeRate: false });
    this.scene.updateAccessibleStatus?.(attack.laneOffset < 60 ? "메롱 대왕: 낮은 혀 예고. 점프하세요." : "메롱 대왕: 높은 혀 예고. 바닥에서 기다리세요.");
  }

  update(_now, delta) {
    if (this.defeated || !this.boss?.active || !this.player.body?.enable) return;
    const inside = this.player.x >= this.section.xStart && this.player.x <= this.section.xEnd;
    if (!inside) {
      if (this.state !== "dormant") this.sleep();
      return;
    }
    if (this.state === "dormant") {
      this.boss.setVisible(!this.fallback);
      this.boss.body.enable = true;
      this.fallback?.setVisible(true);
      this.enter("intro", 1000, "idle");
      this.scene.updateAccessibleStatus?.("메롱 궁전 입장! 혀를 피하고 지친 순간 머리를 밟으세요.");
      return;
    }
    this.elapsedMs += delta;
    this.weakness.setPosition(this.boss.x, this.boss.body.top - 24);
    if (this.state === "attack") {
      this.tongue.show(this.attack, { extension: this.elapsedMs / 180 });
      if (this.tongue.hits(this.player.body)) this.healthManager.takeDamage(this.boss.x, { type: "boss_tongue" });
    }
    if (this.elapsedMs < this.durationMs) return;
    switch (this.state) {
      case "intro": case "recovery": case "hurt":
        this.attackIndex = 0; this.beginWarning(); break;
      case "warning": this.enter("attack", this.pattern.activeMs, "attack"); break;
      case "attack":
        this.tongue.clear();
        this.attackIndex++;
        if (this.attackIndex < this.pattern.attacks.length) this.enter("between", this.pattern.betweenMs, "idle");
        else {
          this.enter("vulnerable", this.pattern.vulnerabilityMs * this.vulnerabilityMultiplier, "vulnerable");
          this.scene.updateAccessibleStatus?.("메롱 대왕이 지쳤어요. 빛나는 머리 약점을 밟으세요.");
        }
        break;
      case "between": this.beginWarning(); break;
      case "vulnerable": this.enter("recovery", 700, "idle"); break;
    }
  }

  onPlayerContact({ fallingOntoHead, attemptHit, damagePlayer }) {
    const didHit = canHitMerongKing(this.state, fallingOntoHead) && attemptHit();
    if (!didHit) damagePlayer();
    return { didHit: Boolean(didHit) };
  }

  onBossHit({ hp }) {
    this.scoreManager.defeat("boss_hit", this.transformationManager.scoreMultiplier);
    this.tongue.clear();
    if (hp > 0) this.enter("hurt", 900, "hurt");
  }

  onBossDefeated() {
    this.defeated = true;
    this.tongue.clear();
    this.enter("defeated", 0, "defeated");
    this.boss.setActive(false);
    this.fallback?.setAlpha(0.55);
  }

  sleep() {
    this.tongue.clear();
    this.enter("dormant", 0);
    this.boss.setVisible(false);
    this.boss.body.enable = false;
    this.fallback?.setVisible(false);
  }

  resetAfterRespawn() {
    if (this.defeated) return;
    this.boss.setData({ hp: this.boss.getData("maxHp"), phase: 1 });
    this.sleep();
  }
  getPoolSnapshot() { return {}; }
  destroy() {
    this.scene.events.off(EVENTS.PLAYER_RESPAWNED, this.onRespawn);
    this.tongue.destroy(); this.weakness.destroy(); this.fallback?.destroy();
  }
}
