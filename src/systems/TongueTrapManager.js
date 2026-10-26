import { COLORS, CSS_COLORS, EVENTS } from "../config/constants.js";
import { GAME_FONT_FAMILY } from "../config/font.js";
import { getTongueTrapPhase } from "../data/tongueMechanics.js";
import { TongueAttack } from "./TongueAttack.js";
import { EnemyAnimationManager } from "./EnemyAnimationManager.js";

const SENTRY_SCALE = 0.76;
const MOUTH_X = 40 * SENTRY_SCALE;
const MOUTH_Y = 29 * SENTRY_SCALE;

export class TongueTrapManager {
  constructor(scene, player, level, healthManager) {
    Object.assign(this, { scene, player, healthManager });
    this.created = [];
    EnemyAnimationManager.register(scene, "merong_sentry");
    this.entries = (level.environment?.tongueTraps ?? []).map((config) => {
      // The authored direction places the body once. Turning mirrors the mouth
      // around this fixed body, rather than moving the character across its spawn.
      const x = config.x - config.direction * MOUTH_X, y = config.y + MOUTH_Y;
      const entry = { config, x, y, direction: config.direction, ...this.createSentry(x, y, config.direction),
        tongue: new TongueAttack(scene), attack: null, elapsedMs: null, phase: "idle", practiceHit: false };
      this.facePlayer(entry);
      this.showPose(entry, "idle");
      return entry;
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

  createSentry(x, y, direction) {
    const idle = EnemyAnimationManager.getSpec("merong_sentry", "idle");
    if (this.scene.textures.exists(idle.textureKey)) {
      // Authored attack mouth: (104, 83), frame origin: (64, 112).
      const sprite = this.scene.add.sprite(x, y, idle.textureKey)
        .setOrigin(0.5, 112 / 128).setScale(SENTRY_SCALE).setFlipX(direction < 0).setDepth(4);
      sprite.setData("type", "merong_sentry");
      EnemyAnimationManager.play(sprite, "idle");
      this.created.push(sprite);
      return { sprite, fallback: null };
    }
    const face = this.scene.add.ellipse(x, y, 64, 56, COLORS.white)
      .setOrigin(0.5, 1).setStrokeStyle(4, COLORS.collectPink).setDepth(3);
    const mouth = this.scene.add.ellipse(x + direction * MOUTH_X, y - MOUTH_Y, 30, 26, COLORS.dangerAlt).setDepth(4);
    const eye = this.scene.add.circle(x + direction * 12, y - 46, 4, COLORS.outline).setDepth(4);
    this.created.push(face, mouth, eye);
    return { sprite: null, fallback: { face, mouth, eye } };
  }

  facePlayer(entry) {
    const distance = this.player.x - entry.x;
    if (Math.abs(distance) > 12) entry.direction = distance < 0 ? -1 : 1;
  }

  showPose(entry, phase) {
    const cycle = (entry.elapsedMs ?? 0) % (entry.config.warningMs + entry.config.activeMs + entry.config.restMs);
    const breath = phase === "warning" ? Math.sin(Math.min(1, cycle / entry.config.warningMs) * Math.PI / 2) : 0;
    if (entry.sprite) {
      entry.sprite.setFlipX(entry.direction < 0).setScale(SENTRY_SCALE * (1 + breath * 0.04), SENTRY_SCALE * (1 - breath * 0.04));
      EnemyAnimationManager.play(entry.sprite, phase === "rest" ? "recover" : phase);
    } else {
      const { face, mouth, eye } = entry.fallback;
      face.setScale(1 + breath * 0.06, 1 - breath * 0.05);
      mouth.setPosition(entry.x + entry.direction * MOUTH_X, entry.y - MOUTH_Y).setScale(phase === "warning" ? 0.65 : 1);
      eye.setPosition(entry.x + entry.direction * 12, entry.y - 46);
    }
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
      const distance = Math.abs(this.player.x - entry.x);
      if (distance > config.triggerDistance + config.reach) {
        entry.elapsedMs = null; entry.phase = "idle"; entry.attack = null; tongue.clear();
        this.facePlayer(entry);
        this.showPose(entry, "idle");
        continue;
      }
      if (entry.elapsedMs === null) {
        if (distance > config.triggerDistance) { this.facePlayer(entry); this.showPose(entry, "idle"); continue; }
        entry.elapsedMs = 0;
      } else entry.elapsedMs += delta;
      const phase = getTongueTrapPhase(entry.elapsedMs, config);
      if (phase !== entry.phase && phase === "warning") {
        this.facePlayer(entry);
        entry.attack = { ...config, x: entry.x + entry.direction * MOUTH_X, direction: entry.direction };
        this.scene.audioManager?.playSfx("sfx_boss_warning", { randomizeRate: false, volume: 0.35 });
        this.scene.updateAccessibleStatus?.(config.y > 520 ? "낮은 혀 예고. 점프로 피하세요." : "높은 혀 예고. 바닥에서 기다리세요.");
      }
      if (phase !== "warning" && phase !== "attack") this.facePlayer(entry);
      entry.phase = phase;
      this.showPose(entry, phase);
      if (phase === "attack" && entry.attack) {
        const cycle = entry.elapsedMs % (config.warningMs + config.activeMs + config.restMs);
        tongue.show(entry.attack, { extension: (cycle - config.warningMs) / 160 });
        if (tongue.hits(this.player.body)) {
          if (!config.practice) this.healthManager.takeDamage(entry.x, { type: "tongue" });
          else if (!entry.practiceHit) {
            entry.practiceHit = true;
            this.scene.updateAccessibleStatus?.("연습 혀에 닿았어요. 다음 예고에는 점프해 보세요.");
          }
        }
      } else tongue.clear();
      if (phase === "rest") entry.attack = null;
    }
  }

  reset() {
    for (const entry of this.entries) {
      entry.elapsedMs = null; entry.phase = "idle"; entry.practiceHit = false;
      entry.attack = null; this.facePlayer(entry);
      this.showPose(entry, "idle");
      entry.tongue.clear();
    }
  }
  finish() { this.reset(); this.finished = true; }
  getSnapshot() { return this.entries.map(({ config, phase, direction }) => ({ id: config.id, phase, direction })); }
  destroy() {
    this.scene.events.off(EVENTS.PLAYER_RESPAWNED, this.onRespawn);
    for (const entry of this.entries) entry.tongue.destroy();
    for (const object of this.created) object.destroy();
    this.entries.length = this.created.length = 0;
  }
}
