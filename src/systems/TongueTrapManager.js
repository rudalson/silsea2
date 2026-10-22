import { COLORS, CSS_COLORS, EVENTS } from "../config/constants.js";
import { GAME_FONT_FAMILY } from "../config/font.js";
import { getTongueTrapPhase } from "../data/tongueMechanics.js";
import { TongueAttack } from "./TongueAttack.js";

export class TongueTrapManager {
  constructor(scene, player, level, healthManager) {
    Object.assign(this, { scene, player, healthManager });
    this.created = [];
    this.entries = (level.environment?.tongueTraps ?? []).map((config) => {
      const face = scene.add.ellipse(config.x - config.direction * 28, config.y - 12, 64, 56, COLORS.white)
        .setStrokeStyle(4, COLORS.collectPink).setDepth(3);
      const mouth = scene.add.ellipse(config.x - config.direction * 17, config.y, 30, 26, COLORS.dangerAlt).setDepth(4);
      const eye = scene.add.circle(config.x - config.direction * 20, config.y - 24, 4, COLORS.outline).setDepth(4);
      const label = scene.add.text(config.x + config.direction * config.reach / 2, config.y - 84, "", {
        fontFamily: GAME_FONT_FAMILY, fontSize: "19px", color: CSS_COLORS.white,
        backgroundColor: CSS_COLORS.panel, padding: { x: 10, y: 7 }, align: "center"
      }).setOrigin(0.5).setDepth(8);
      this.created.push(face, mouth, eye, label);
      return { config, label, tongue: new TongueAttack(scene), elapsedMs: null, phase: "idle", practiceHit: false };
    });
    const palace = level.environment?.tongueCourse?.palace;
    if (palace) this.createPalace(palace);
    for (const bridge of level.environment?.tongueCourse?.bridges ?? []) {
      const visual = scene.add.graphics().setDepth(2);
      visual.fillStyle(COLORS.collectPink, 1).fillRoundedRect(bridge.x, bridge.y, bridge.width, bridge.height, 12);
      visual.lineStyle(3, COLORS.dangerAlt).strokeRoundedRect(bridge.x, bridge.y, bridge.width, bridge.height, 12);
      this.created.push(visual);
    }
    this.onRespawn = () => this.reset();
    scene.events.on(EVENTS.PLAYER_RESPAWNED, this.onRespawn);
    this.finished = false;
  }

  createPalace({ x, y }) {
    const visual = this.scene.add.graphics().setDepth(-1);
    visual.fillStyle(COLORS.white, 1).fillRoundedRect(x - 160, y - 330, 320, 330, 100);
    visual.lineStyle(8, COLORS.collectPink).strokeRoundedRect(x - 160, y - 330, 320, 330, 100);
    visual.fillStyle(COLORS.dangerAlt, 0.9).fillRoundedRect(x - 104, y - 220, 208, 220, 80);
    visual.fillStyle(COLORS.collectPink).fillRoundedRect(x - 94, y - 14, 188, 20, 10);
    for (const offset of [-70, 70]) visual.fillStyle(COLORS.outline).fillCircle(x + offset, y - 262, 8);
    const crown = this.scene.add.star(x, y - 366, 5, 18, 40, COLORS.collect).setStrokeStyle(4, COLORS.dangerAlt).setDepth(2);
    const label = this.scene.add.text(x, y - 430, "메롱 궁전", { fontFamily: GAME_FONT_FAMILY, fontSize: "30px",
      color: CSS_COLORS.white, backgroundColor: CSS_COLORS.panel, padding: { x: 16, y: 8 } }).setOrigin(0.5).setDepth(2);
    this.created.push(visual, crown, label);
  }

  update(delta) {
    if (this.finished || !this.player.body?.enable || this.scene.transformationManager?.transforming) return;
    for (const entry of this.entries) {
      const { config, tongue } = entry;
      if (Math.abs(this.player.x - config.x) > config.triggerDistance + config.reach) {
        entry.elapsedMs = null; entry.phase = "idle"; tongue.clear(); entry.label.setText(""); continue;
      }
      if (entry.elapsedMs === null) {
        if (Math.abs(this.player.x - config.x) > config.triggerDistance) continue;
        entry.elapsedMs = 0;
      } else entry.elapsedMs += delta;
      const phase = getTongueTrapPhase(entry.elapsedMs, config);
      if (phase !== entry.phase && phase === "warning") {
        this.scene.audioManager?.playSfx("sfx_boss_warning", { randomizeRate: false, volume: 0.35 });
        this.scene.updateAccessibleStatus?.(config.y > 520 ? "낮은 혀 예고. 점프로 피하세요." : "높은 혀 예고. 바닥에서 기다리세요.");
      }
      entry.phase = phase;
      if (phase === "warning") tongue.show(config, { warning: true });
      else if (phase === "attack") {
        const cycle = entry.elapsedMs % (config.warningMs + config.activeMs + config.restMs);
        tongue.show(config, { extension: (cycle - config.warningMs) / 160 });
        if (tongue.hits(this.player.body)) {
          if (!config.practice) this.healthManager.takeDamage(config.x, { type: "tongue" });
          else if (!entry.practiceHit) {
            entry.practiceHit = true;
            this.scene.updateAccessibleStatus?.("연습 혀에 닿았어요. 다음 예고에는 점프해 보세요.");
          }
        }
      } else tongue.clear();
      entry.label.setText(phase === "warning" ? (config.practice ? "연습 · 곧 혀가 나와요!" : "！ 혀 공격 예고")
        : phase === "attack" ? (config.y > 520 ? "↑ 점프!" : "바닥에서 기다려요") : "지금 지나가요");
    }
  }

  reset() {
    for (const entry of this.entries) {
      entry.elapsedMs = null; entry.phase = "idle"; entry.practiceHit = false;
      entry.tongue.clear(); entry.label.setText("");
    }
  }
  finish() { this.reset(); this.finished = true; }
  getSnapshot() { return this.entries.map(({ config, phase }) => ({ id: config.id, phase })); }
  destroy() {
    this.scene.events.off(EVENTS.PLAYER_RESPAWNED, this.onRespawn);
    for (const entry of this.entries) entry.tongue.destroy();
    for (const object of this.created) object.destroy();
    this.entries.length = this.created.length = 0;
  }
}
