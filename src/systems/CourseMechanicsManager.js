import { COLORS, CSS_COLORS, EVENTS } from "../config/constants.js";
import { GAME_FONT_FAMILY } from "../config/font.js";
import {
  createRhythmState, getStickySpeedMultiplier, getTimedHolePhase, RHYTHM_PHASES, stepRhythm
} from "../data/courseMechanics.js";

const grounded = (body) => Boolean(body?.enable && body.velocity.y >= 0 && (body.blocked.down || body.touching.down));

export class CourseMechanicsManager {
  constructor(scene, player, level, healthManager) {
    this.scene = scene;
    this.player = player;
    this.healthManager = healthManager;
    this.created = [];
    this.interactions = [];
    this.stickyZones = level.terrainMechanics?.stickyZones ?? [];
    this.transientStickyZones = new Map();
    this.holes = (level.terrainMechanics?.timedHoles ?? []).map((config) => this.createHole(config));
    this.rhythms = (level.environment?.rhythmZones ?? []).map((config) => this.createRhythm(config));
    this.finished = false;
    for (const zone of this.stickyZones) this.createStickyZone(zone);
    this.onRespawn = () => this.reset();
    scene.events.on(EVENTS.PLAYER_RESPAWNED, this.onRespawn);
  }

  track(object) {
    this.created.push(object);
    return object;
  }

  label(x, y, text) {
    return this.track(this.scene.add.text(x, y, text, {
      fontFamily: GAME_FONT_FAMILY, fontSize: "23px", color: CSS_COLORS.white,
      backgroundColor: CSS_COLORS.near, padding: { x: 16, y: 10 }, align: "center"
    }).setOrigin(0.5).setDepth(8));
  }

  createStickyZone(zone) {
    if (zone.visualStyle === "tape") {
      const tape = this.track(this.scene.add.graphics().setDepth(3));
      tape.fillStyle(COLORS.collect, 0.95).fillRoundedRect(zone.x, zone.y, zone.width, zone.height, 4);
      tape.lineStyle(2, COLORS.outline).strokeRoundedRect(zone.x, zone.y, zone.width, zone.height, 4);
      tape.lineStyle(2, COLORS.white, 0.8);
      for (let x = zone.x + 12; x < zone.x + zone.width - 10; x += 32) tape.lineBetween(x, zone.y + zone.height - 2, x + 10, zone.y + 2);
      if (zone.showHint !== false) this.label(zone.x + zone.width / 2, zone.y - 120, "끈끈한 테이프\n점프로 빠져나가요");
      return;
    }
    this.track(this.scene.add.rectangle(zone.x + zone.width / 2, zone.y + zone.height / 2,
      zone.width, zone.height, COLORS.collectPink, 0.95).setDepth(3).setStrokeStyle(3, COLORS.outline));
    for (let x = zone.x + 16; x < zone.x + zone.width; x += 40) {
      this.track(this.scene.add.ellipse(x, zone.y - 2, 26, 8, COLORS.white, 0.7).setDepth(4));
    }
    this.label(zone.x + zone.width / 2, zone.y - 120, "끈끈한 바닥\n점프로 빠져나가요");
  }

  createHole(config) {
    const { x, y, width, height } = config;
    const platform = this.track(this.scene.add.rectangle(x + width / 2, y + height / 2,
      width, height, COLORS.collect, 1).setDepth(2).setStrokeStyle(3, COLORS.outline));
    this.scene.physics.add.existing(platform, true);
    this.interactions.push(this.scene.physics.add.collider(this.player, platform));
    const opening = this.track(this.scene.add.ellipse(x + width / 2, y + 6, width - 8, 22,
      COLORS.outline, 1).setDepth(3).setVisible(false));
    const label = this.label(x + width / 2, y - 130, "노란 다리\n다가가면 열려요");
    return { config, platform, opening, label, elapsedMs: null, phase: "closed" };
  }

  createRhythm(config) {
    const width = config.xEnd - config.xStart;
    this.track(this.scene.add.rectangle(config.xStart + width / 2, config.floorY + 6,
      width, 12, COLORS.collectBlue, 1).setDepth(3));
    const label = this.label(config.xStart + width / 2, config.floorY - 160,
      "건반 연습\n띵! 신호에 5초 멈춰요");
    return { config, label, state: createRhythmState(), displayed: "" };
  }

  get horizontalSpeedMultiplier() {
    const zones = [...this.stickyZones, ...[...this.transientStickyZones.values()].flat()];
    return this.finished ? 1 : getStickySpeedMultiplier(this.player.body, zones, grounded(this.player.body));
  }

  setTransientStickyZones(owner, zones) { this.transientStickyZones.set(owner, zones); }
  clearTransientStickyZones(owner) { this.transientStickyZones.delete(owner); }

  update(input, delta) {
    const body = this.player.body;
    if (this.finished || !body?.enable) return;
    // Transform presentations temporarily suspend physics; do not interpret that as a failed wait.
    if (this.scene.transformationManager?.transforming) return;
    for (const entry of this.holes) this.updateHole(entry, delta);
    for (const entry of this.rhythms) this.updateRhythm(entry, input, delta);
  }

  updateHole(entry, delta) {
    const { config } = entry;
    if (entry.elapsedMs === null) {
      if (Math.abs(this.player.x - (config.x + config.width / 2)) > config.triggerDistance) return;
      entry.elapsedMs = 0;
    } else entry.elapsedMs += delta;
    let phase = getTimedHolePhase(entry.elapsedMs, config);
    const body = this.player.body;
    const insideSlab = body.right > config.x && body.left < config.x + config.width
      && body.bottom > config.y && body.top < config.y + config.height;
    // A closing bridge must never materialize through the player.
    if (entry.phase === "open" && phase !== "open" && insideSlab) phase = "open";
    entry.phase = phase;
    entry.platform.body.enable = phase !== "open";
    entry.platform.setVisible(phase !== "open");
    entry.opening.setVisible(phase === "open");
    if (phase === "warning") {
      const reduced = this.scene.registry.get("screenEffectStrength") === "reduced";
      entry.platform.setFillStyle(COLORS.dangerAlt).setAlpha(reduced ? 1 : Math.floor(entry.elapsedMs / 300) % 2 ? 0.7 : 1);
    } else entry.platform.setFillStyle(COLORS.collect).setAlpha(1);
    const text = phase === "warning" ? "！ 곧 열려요\n점프로 건너요"
      : phase === "open" ? "○ 열림\n안전 발판으로!" : "다리 닫힘\n건너갈 수 있어요";
    entry.label.setText(text);
  }

  updateRhythm(entry, input, delta) {
    const { config } = entry;
    const body = this.player.body;
    const previous = entry.state;
    const inside = this.player.x >= config.xStart && this.player.x <= config.xEnd
      && Math.abs(body.bottom - config.floorY) <= 8;
    const moving = Math.abs(input.moveX ?? 0) > config.movementTolerance || Boolean(input.jumpDown || input.jumpPressed);
    entry.state = stepRhythm(previous, { deltaMs: delta, inside, grounded: grounded(body), moving }, config);
    const { phase } = entry.state;
    if (phase !== previous.phase) {
      if (phase === RHYTHM_PHASES.STOP) this.player.bufferedJumpUntil = Number.NEGATIVE_INFINITY;
      if (phase === RHYTHM_PHASES.RETRY && !config.practice) {
        this.healthManager.takeEnvironmentDamage({ type: "rhythm" });
      }
      if ([RHYTHM_PHASES.STOP, RHYTHM_PHASES.SUCCESS].includes(phase)) {
        this.scene.audioManager?.playSfx(phase === RHYTHM_PHASES.STOP ? "sfx_checkpoint" : "sfx_star", { randomizeRate: false });
      }
    }
    const remaining = Math.ceil(Math.max(0, config.stopMs - entry.state.elapsedMs) / 1000);
    const texts = {
      waiting: "건반 연습\n띵! 신호에 5초 멈춰요",
      warning: "♪ 곧 정지 신호!\n이동 키와 점프를 놓아요",
      stop: `■ 멈춰요  ${remaining}\n키에서 손을 떼요`,
      retry: "다시 연습해요\n다음 신호를 기다려요",
      success: "▶ 성공!\n이제 이동해요"
    };
    const text = texts[phase];
    if (entry.displayed !== text) {
      entry.displayed = text;
      entry.label.setText(text).setColor(phase === RHYTHM_PHASES.STOP ? CSS_COLORS.collect : CSS_COLORS.white);
      if (phase !== RHYTHM_PHASES.WAITING || previous.phase !== RHYTHM_PHASES.WAITING) {
        this.scene.updateAccessibleStatus?.(text.replace("\n", ". "));
      }
    }
  }

  reset() {
    this.transientStickyZones.clear();
    for (const entry of this.holes) {
      entry.elapsedMs = null;
      entry.phase = "closed";
      entry.platform.body.enable = true;
      entry.platform.setVisible(true).setAlpha(1).setFillStyle(COLORS.collect);
      entry.opening.setVisible(false);
      entry.label.setText("노란 다리\n다가가면 열려요");
    }
    for (const entry of this.rhythms) {
      entry.state = createRhythmState();
      entry.displayed = "";
      entry.label.setText("건반 연습\n띵! 신호에 5초 멈춰요").setColor(CSS_COLORS.white);
    }
  }

  finish() {
    this.reset();
    this.finished = true;
  }

  getSnapshot() {
    return {
      speedMultiplier: this.horizontalSpeedMultiplier,
      transientStickyCount: [...this.transientStickyZones.values()].reduce((count, zones) => count + zones.length, 0),
      holes: this.holes.map(({ config, phase, elapsedMs, platform }) => ({ id: config.id, phase, elapsedMs, solid: platform.body.enable })),
      rhythms: this.rhythms.map(({ config, state }) => ({ id: config.id, ...state }))
    };
  }

  destroy() {
    this.transientStickyZones.clear();
    this.scene.events.off(EVENTS.PLAYER_RESPAWNED, this.onRespawn);
    for (const interaction of this.interactions) interaction.destroy();
    for (const object of this.created) object.destroy();
    this.interactions.length = this.created.length = this.holes.length = this.rhythms.length = 0;
  }
}
