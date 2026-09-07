import Phaser from "phaser";
import { COLORS, CSS_COLORS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../config/constants.js";
import { GAME_FONT_FAMILY } from "../config/font.js";
import { cloneTuning, getCharacter } from "../data/characters.js";
import {
  COOP_PLAYERS,
  COOP_RULES,
  canCompleteCoopGate,
  getCoopCameraTarget,
  getCoopSeparation,
  selectCoopTarget
} from "../data/coopPrototype.js";
import { FORMS } from "../data/gameplay.js";
import { getLevel } from "../data/levels/index.js";
import { assertLevelShape, normalizeLevelDefinition } from "../data/schema/levelSchema.js";
import { Player } from "../entities/Player.js";
import { AudioManager } from "../systems/AudioManager.js";
import { CoopInputManager } from "../systems/CoopInputManager.js";
import { CoopSessionManager } from "../systems/CoopSessionManager.js";
import { LevelLoader } from "../systems/LevelLoader.js";
import { ObjectiveManager } from "../systems/ObjectiveManager.js";
import { ScoreManager } from "../systems/ScoreManager.js";

const PLAYER_MARKERS = Object.freeze({
  p1: Object.freeze({ shape: "circle", color: COLORS.collectBlue }),
  p2: Object.freeze({ shape: "diamond", color: COLORS.collectPink })
});

export class CoopPrototypeScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.COOP_PROTOTYPE);
  }

  init(data) {
    this.levelId = data.levelId ?? this.registry.get("levelId") ?? "c3-coop-test";
    this.interactions = [];
    this.lastPadConnected = null;
    this.lastSnapshotAt = Number.NEGATIVE_INFINITY;
    this.separationStartedAt = null;
    this.completed = false;
    this.elapsed = 0;
  }

  create() {
    const sourceLevel = getLevel(this.levelId);
    assertLevelShape(sourceLevel);
    this.level = normalizeLevelDefinition(sourceLevel);
    this.difficulty = { enabled: false, player: {} };
    this.inputManager = new CoopInputManager(this);
    this.audioManager = new AudioManager(this);
    this.scoreManager = new ScoreManager();
    this.objectiveManager = new ObjectiveManager(this, this.level.objectives);
    const debugEnabled = this.registry.get("debugEnabled");
    this.registry.set("debugEnabled", false);
    try {
      this.levelLoader = new LevelLoader(this, this.level, this.objectiveManager).build();
    } finally {
      this.registry.set("debugEnabled", debugEnabled);
    }
    this.players = COOP_PLAYERS.map((config) => this.createPlayerSession(config));
    this.bindTerrain();
    this.sessionManager = new CoopSessionManager(
      this,
      this.players,
      this.levelLoader,
      this.objectiveManager,
      this.scoreManager,
      { onStatus: (message) => this.updateAccessibleStatus(message) }
    );
    this.sessionManager.bind(this.interactions);
    this.createPlayerMarkers();
    this.createTargetScout();
    this.createTargetPractice();
    this.createHud();
    this.configureCamera();
    this.applyReviewState();
    this.audioManager.playBgm(this.level.assets.bgm.field);
    this.updateAccessibleStatus(
      "C3 로컬 2P 회색상자 시작. P1 실세아는 키보드, P2 감자는 첫 번째 게임패드를 사용합니다."
    );
    if (this.registry.get("debugEnabled")) window.__silseaC3 = { getSnapshot: () => this.getSnapshot() };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
  }

  createPlayerSession(config) {
    const character = getCharacter(config.characterId);
    const player = new Player(
      this,
      this.level.player.spawn.x + config.spawnOffsetX,
      this.level.player.spawn.y - 2,
      character,
      cloneTuning(character)
    );
    player.setDataEnabled();
    player.setData({ coopId: config.id, coopLabel: config.label });
    const shadow = this.add.ellipse(player.x, this.level.player.spawn.y + 2, 82, 16, COLORS.near, 0.24)
      .setDepth(1);
    return {
      ...config,
      player,
      shadow,
      connected: config.id === "p1"
    };
  }

  bindTerrain() {
    for (const session of this.players) {
      this.interactions.push(this.physics.add.collider(session.player, this.levelLoader.terrainBodies));
    }
  }

  createTargetPractice() {
    this.targetDummy = this.add.circle(1940, 528, 46, COLORS.danger, 0.94)
      .setStrokeStyle(6, COLORS.outline)
      .setDepth(5);
    this.physics.add.existing(this.targetDummy, true);
    this.targetDummy.hp = 3;
    this.targetDummy.maxHp = 3;
    this.targetDummy.nextTargetAt = 0;
    this.targetDummy.lockedUntil = 0;
    this.targetDummy.lockedTargetId = null;
    this.targetDummy.hitLockedUntil = 0;
    this.targetBeam = this.add.graphics().setDepth(4);
    this.targetLabel = this.add.text(1940, 446, "공유 보스 시험기 · HP 3", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "18px",
      fontStyle: "700",
      color: CSS_COLORS.white,
      backgroundColor: CSS_COLORS.panel,
      padding: { x: 8, y: 5 }
    }).setOrigin(0.5).setDepth(6);
    for (const session of this.players) {
      this.interactions.push(this.physics.add.overlap(session.player, this.targetDummy, () => {
        this.handleTargetContact(session);
      }));
    }
  }

  createTargetScout() {
    this.targetScout = this.add.circle(1640, 536, 30, COLORS.collectPink, 0.9)
      .setStrokeStyle(5, COLORS.outline)
      .setDepth(5);
    this.physics.add.existing(this.targetScout, true);
    this.targetScout.lockedTargetId = null;
    this.targetScout.lockedUntil = 0;
    this.targetScout.nextTargetAt = 0;
    this.scoutBeam = this.add.graphics().setDepth(4);
    this.scoutLabel = this.add.text(1640, 476, "일반 적 타깃 센서", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "16px",
      fontStyle: "700",
      color: CSS_COLORS.white,
      backgroundColor: CSS_COLORS.panel,
      padding: { x: 7, y: 4 }
    }).setOrigin(0.5).setDepth(6);
    for (const session of this.players) {
      this.interactions.push(this.physics.add.overlap(session.player, this.targetScout, () => {
        this.sessionManager.takeDamage(session, this.targetScout.x, "target_scout");
      }));
    }
  }

  createPlayerMarkers() {
    for (const session of this.players) {
      const marker = PLAYER_MARKERS[session.id];
      const plate = marker.shape === "circle"
        ? this.add.circle(0, 0, 20, marker.color, 0.96)
        : this.add.rectangle(0, 0, 34, 34, marker.color, 0.96).setAngle(45);
      plate.setStrokeStyle(4, COLORS.outline).setDepth(20);
      const number = this.add.text(0, 0, String(session.index + 1), {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "22px",
        fontStyle: "700",
        color: CSS_COLORS.outline
      }).setOrigin(0.5).setDepth(21);
      session.markerPlate = plate;
      session.markerNumber = number;
    }
  }

  createHud() {
    this.add.rectangle(GAME_WIDTH / 2, 48, GAME_WIDTH - 24, 76, COLORS.near, 0.9)
      .setScrollFactor(0)
      .setStrokeStyle(3, COLORS.collect)
      .setDepth(40);
    this.p1Status = this.add.text(36, 20, "● 1  P1 실세아 · HP 3/3 · base", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "18px",
      fontStyle: "700",
      color: CSS_COLORS.collectBlue
    }).setScrollFactor(0).setDepth(41);
    this.padStatus = this.add.text(GAME_WIDTH - 36, 20, "◆ 2  P2 감자 · 게임패드 연결 대기", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "18px",
      fontStyle: "700",
      color: CSS_COLORS.collectPink
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(41);
    this.sharedHud = this.add.text(GAME_WIDTH / 2, 20, "공유 점수 0 · 별 0/5 · 시험기 HP 3", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "16px",
      fontStyle: "700",
      color: CSS_COLORS.collect
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(42);
    this.add.text(GAME_WIDTH / 2, 82, "P1 방향키/WASD + Space/Z   ·   P2 스틱/D-pad + A", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "17px",
      fontStyle: "700",
      color: CSS_COLORS.white,
      backgroundColor: CSS_COLORS.panelSoft,
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(41);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 28, "C3 개발 전용 · 진행과 해금은 저장하지 않음", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "16px",
      fontStyle: "700",
      color: CSS_COLORS.collect
    }).setOrigin(0.5).setScrollFactor(0).setDepth(41);
    this.separationWarning = this.add.text(GAME_WIDTH / 2, 132, "", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "24px",
      fontStyle: "700",
      color: CSS_COLORS.white,
      backgroundColor: CSS_COLORS.dangerMedium,
      padding: { x: 14, y: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(45).setVisible(false);
    this.completePanel = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      "둘이 함께 도착!\n저장 없이 시험 완료\n\nSpace/Z 또는 A · 다시 시험\nEsc 또는 Start · 메뉴",
      {
      align: "center",
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "38px",
      fontStyle: "700",
      color: CSS_COLORS.collect,
      backgroundColor: CSS_COLORS.panel,
      padding: { x: 30, y: 22 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(50).setVisible(false);
  }

  configureCamera() {
    this.cameras.main.setBounds(0, 0, this.level.world.width, GAME_HEIGHT);
    this.cameras.main.setScroll(0, 0);
  }

  applyReviewState() {
    const state = this.registry.get("coopReviewState");
    if (state === "spread") {
      this.players[0].player.setPosition(480, this.level.player.spawn.y - 2);
      this.players[1].player.setPosition(1120, this.level.player.spawn.y - 2);
    }
    if (state === "warning") {
      this.players[0].player.setPosition(320, this.level.player.spawn.y - 2);
      this.players[1].player.setPosition(1240, this.level.player.spawn.y - 2);
    }
    if (state === "rejoin") {
      this.players[0].player.setPosition(240, this.level.player.spawn.y - 2);
      this.players[1].player.setPosition(1440, this.level.player.spawn.y - 2);
      this.separationStartedAt = this.time.now - COOP_RULES.rejoinDelayMs;
    }
    if (state === "forms") {
      this.players[0].player.setPosition(900, this.level.player.spawn.y - 2);
      this.players[1].player.setPosition(1280, this.level.player.spawn.y - 2);
      this.players[0].transformationManager.setForm(FORMS.UNICORN, false);
      this.players[1].transformationManager.setForm(FORMS.PEGASUS, false);
    }
    if (state === "damage") {
      this.players[0].player.setPosition(1500, this.level.player.spawn.y - 2);
      this.players[1].player.setPosition(1620, this.level.player.spawn.y - 2);
      this.players[0].hp = Math.max(1, this.players[0].maxHp - 1);
    }
    if (state === "target") {
      this.players[0].player.setPosition(1500, this.level.player.spawn.y - 2);
      this.players[1].player.setPosition(2110, this.level.player.spawn.y - 2);
    }
    if (state === "gate") {
      this.targetDummy.hp = 0;
      this.disableTargetDummy();
      this.objectiveManager.markBossDefeated("coop_target_dummy");
      this.players[0].player.setPosition(this.level.exit.x - 24, this.level.exit.y - 2);
      this.players[1].player.setPosition(this.level.exit.x + 24, this.level.exit.y - 2);
    }
    for (const { player } of this.players) player.body?.updateFromGameObject?.();
  }

  update(time, delta) {
    const sampled = this.inputManager.sample();
    if (this.completed) {
      if (sampled.p1.confirmPressed || sampled.p2.confirmPressed) {
        this.scene.restart({ levelId: this.levelId });
        return;
      }
      if (sampled.p1.pausePressed || sampled.p2.pausePressed) {
        this.scene.start(SCENE_KEYS.MENU);
        return;
      }
    }
    const fixedState = this.registry.get("coopReviewState");
    const simulatedConnection = ["warning", "rejoin", "forms", "damage", "target", "gate"].includes(fixedState);
    for (const session of this.players) {
      const input = sampled[session.id];
      const connected = session.id === "p1" || input.connected || simulatedConnection;
      this.sessionManager.setConnection(session, connected, { simulated: simulatedConnection });
      this.updatePlayerVisuals(session);
    }
    this.sessionManager.update(time, delta, sampled);
    this.updatePadStatus(this.players[1].connected, simulatedConnection);
    this.updateTargetScout(time);
    this.updateTargetPractice(time);
    this.updateCoopCamera(time);
    this.updateGate();
    this.updateHud();
    this.elapsed += delta / 1000;
    this.objectiveManager.update(this.elapsed);
    if (this.registry.get("debugEnabled") && time - this.lastSnapshotAt >= 250) {
      this.lastSnapshotAt = time;
      const container = document.querySelector("#game-container");
      if (container) container.dataset.coopSnapshot = JSON.stringify(this.getSnapshot());
    }
  }

  updateTargetScout(time) {
    this.scoutBeam.clear();
    if (time >= this.targetScout.nextTargetAt) {
      const selected = selectCoopTarget(
        this.getPlayerViews(),
        { x: this.targetScout.x, y: this.targetScout.y },
        time < this.targetScout.lockedUntil ? this.targetScout.lockedTargetId : null
      );
      const previousId = this.targetScout.lockedTargetId;
      this.targetScout.lockedTargetId = selected?.id ?? null;
      this.targetScout.lockedUntil = time + 900;
      this.targetScout.nextTargetAt = time + 900;
      if (previousId && previousId !== this.targetScout.lockedTargetId) {
        const target = this.players.find(({ id }) => id === this.targetScout.lockedTargetId);
        if (target) this.updateAccessibleStatus(`일반 적 타깃이 ${target.label}으로 변경되었습니다.`);
      }
    }
    const target = this.players.find(({ id }) => id === this.targetScout.lockedTargetId);
    if (!target) return;
    this.scoutBeam
      .lineStyle(4, PLAYER_MARKERS[target.id].color, 0.6)
      .lineBetween(this.targetScout.x, this.targetScout.y, target.player.x, target.player.y - 48);
    this.scoutLabel.setText(`일반 적 센서 · ${target.id.toUpperCase()} 조준`);
  }

  updatePlayerVisuals(session) {
    const { player, shadow, markerPlate, markerNumber } = session;
    markerPlate.setPosition(player.x, player.y - 146);
    markerNumber.setPosition(player.x, player.y - 146);
    const surfaceY = this.levelLoader.findSurfaceBelow(player.x, player.y);
    if (!Number.isFinite(surfaceY)) {
      shadow.setVisible(false);
      return;
    }
    const altitude = Math.max(0, surfaceY - player.y);
    shadow
      .setVisible(altitude < 360)
      .setPosition(player.x, surfaceY + 2)
      .setScale(Math.max(0.48, 1 - altitude / 620), 1);
  }

  updatePadStatus(connected, simulated = false) {
    const state = `${connected}:${simulated}`;
    if (state === this.lastPadConnected) return;
    this.lastPadConnected = state;
    this.padConnectionLabel = simulated
      ? "고정 검수"
      : connected
        ? "게임패드 준비"
        : "게임패드 대기";
    this.updateAccessibleStatus(
      connected ? "P2 감자 게임패드가 연결되었습니다." : "P2 감자 게임패드 연결을 기다립니다. P1은 계속 움직일 수 있습니다."
    );
  }

  getPlayerViews() {
    return this.players.map((session) => ({
      id: session.id,
      x: session.player.x,
      y: session.player.y,
      active: session.player.active,
      connected: session.connected,
      respawning: session.respawning
    }));
  }

  updateCoopCamera(time) {
    const playerViews = this.getPlayerViews();
    const target = getCoopCameraTarget(
      playerViews,
      { x: this.level.player.spawn.x, y: this.level.player.spawn.y }
    );
    const separation = getCoopSeparation(playerViews, {
      direction: this.level.progression.direction,
      cameraX: target.x,
      exceededForMs: this.separationStartedAt === null ? 0 : time - this.separationStartedAt
    });
    if (separation.warning) {
      if (this.separationStartedAt === null) this.separationStartedAt = time;
      this.separationWarning
        .setText(`${this.level.progression.direction === "left" ? "→" : "←"} ${separation.trailingPlayerId?.toUpperCase()} 뒤처짐 · 함께 이동하세요`)
        .setVisible(true);
    } else {
      this.separationStartedAt = null;
      this.separationWarning.setVisible(false);
    }
    if (separation.shouldRejoin) {
      const trailing = this.players.find(({ id }) => id === separation.trailingPlayerId);
      const leader = this.players.find(({ id }) => id !== separation.trailingPlayerId && id !== undefined);
      const safe = leader ? this.levelLoader.findNearestSafePoint(leader.player.x) : null;
      if (this.sessionManager.rejoin(trailing, leader, safe)) this.separationStartedAt = null;
    }
    const maxScrollX = Math.max(0, this.level.world.width - GAME_WIDTH);
    this.cameras.main.scrollX = Phaser.Math.Clamp(target.x - GAME_WIDTH / 2, 0, maxScrollX);
  }

  updateTargetPractice(time) {
    this.targetBeam.clear();
    if (!this.targetDummy?.active) return;
    if (time >= this.targetDummy.nextTargetAt) {
      const previousId = this.targetDummy.lockedTargetId;
      const selected = selectCoopTarget(
        this.getPlayerViews(),
        { x: this.targetDummy.x, y: this.targetDummy.y },
        time < this.targetDummy.lockedUntil ? this.targetDummy.lockedTargetId : null
      );
      this.targetDummy.lockedTargetId = selected?.id ?? null;
      this.targetDummy.lockedUntil = time + 1400;
      this.targetDummy.nextTargetAt = time + 1400;
      if (previousId !== this.targetDummy.lockedTargetId) {
        const nextTarget = this.players.find(({ id }) => id === this.targetDummy.lockedTargetId);
        if (nextTarget) this.updateAccessibleStatus(`공유 보스 시험기 타깃은 ${nextTarget.label}입니다.`);
      }
    }
    const target = this.players.find(({ id }) => id === this.targetDummy.lockedTargetId);
    if (!target) return;
    this.targetBeam
      .lineStyle(6, PLAYER_MARKERS[target.id].color, 0.72)
      .lineBetween(this.targetDummy.x, this.targetDummy.y, target.player.x, target.player.y - 54);
      this.targetLabel.setText(`공유 보스 시험기 · HP ${this.targetDummy.hp} · ${target.id.toUpperCase()} 조준`);
  }

  handleTargetContact(session) {
    if (!this.targetDummy?.active) return;
    const now = this.time.now;
    const stomp = session.player.body.velocity.y > 100
      && session.player.body.bottom <= this.targetDummy.body.top + 34;
    if (stomp && now >= this.targetDummy.hitLockedUntil) {
      this.targetDummy.hitLockedUntil = now + 320;
      this.targetDummy.hp -= 1;
      session.player.setVelocityY(-460);
      this.targetDummy.setTintFill(COLORS.collect);
      this.time.delayedCall(120, () => this.targetDummy?.active && this.targetDummy.clearTint());
      this.updateAccessibleStatus(`${session.label}: 공유 보스 시험기를 공격했습니다. HP ${this.targetDummy.hp}.`);
      if (this.targetDummy.hp <= 0) {
        this.objectiveManager.markBossDefeated("coop_target_dummy");
        this.disableTargetDummy();
      }
      return;
    }
    this.sessionManager.takeDamage(session, this.targetDummy.x, "target_dummy");
  }

  disableTargetDummy() {
    this.targetDummy.setActive(false).setVisible(false);
    if (this.targetDummy.body) this.targetDummy.body.enable = false;
    this.targetLabel.setText("공유 보스 시험기 격파 · 게이트에서 합류");
    this.targetBeam.clear();
  }

  updateGate() {
    if (this.completed || this.targetDummy?.active || !this.levelLoader.gate) return;
    const gate = this.levelLoader.gate.zone;
    if (!canCompleteCoopGate(this.getPlayerViews(), {
      x: gate.x,
      y: gate.y,
      width: gate.width,
      height: gate.height
    })) return;
    this.completed = true;
    this.objectiveManager.markGateEntered();
    for (const session of this.players) session.player.setVelocity(0, 0);
    this.completePanel.setVisible(true);
    this.updateAccessibleStatus("P1 실세아와 P2 감자가 함께 게이트에 도착했습니다. 저장 없이 협동 시험을 완료했습니다.");
  }

  updateHud() {
    const snapshot = this.sessionManager.getSnapshot();
    const [p1, p2] = snapshot.players;
    this.sharedHud.setText(
      `공유 점수 ${snapshot.score} · 별 ${snapshot.stars}/5 · 시험기 HP ${Math.max(0, this.targetDummy.hp)}`
    );
    this.players[0].hudState = `HP ${p1.hp}/${p1.maxHp} · ${p1.form} · 비행 ${(p1.flightMs / 1000).toFixed(1)}s`;
    this.players[1].hudState = `HP ${p2.hp}/${p2.maxHp} · ${p2.form} · 비행 ${(p2.flightMs / 1000).toFixed(1)}s`;
    this.p1Status.setText(`● 1  P1 실세아 · ${this.players[0].hudState}`);
    this.padStatus.setText(`◆ 2  P2 감자 · ${this.players[1].hudState} · ${this.padConnectionLabel ?? "게임패드 대기"}`);
  }

  updateAccessibleStatus(message) {
    const status = document.querySelector("#game-status");
    if (status) status.textContent = message;
  }

  getSnapshot() {
    return {
      levelId: this.levelId,
      savedProgress: false,
      completed: this.completed,
      separation: getCoopSeparation(this.getPlayerViews(), {
        direction: this.level.progression.direction,
        exceededForMs: this.separationStartedAt === null ? 0 : this.time.now - this.separationStartedAt
      }),
      target: {
        hp: Math.max(0, this.targetDummy?.hp ?? 0),
        lockedTargetId: this.targetDummy?.lockedTargetId ?? null,
        normalEnemyTargetId: this.targetScout?.lockedTargetId ?? null
      },
      session: this.sessionManager?.getSnapshot?.() ?? null,
      hud: {
        p1: { text: this.p1Status?.text ?? "", visible: this.p1Status?.visible ?? false, x: this.p1Status?.x ?? null },
        p2: { text: this.padStatus?.text ?? "", visible: this.padStatus?.visible ?? false, x: this.padStatus?.x ?? null },
        shared: { text: this.sharedHud?.text ?? "", visible: this.sharedHud?.visible ?? false },
        cameraScrollX: Math.round(this.cameras.main.scrollX)
      },
      players: this.players.map((session) => ({
        id: session.id,
        characterId: session.characterId,
        connected: session.connected,
        x: Math.round(session.player.x),
        y: Math.round(session.player.y),
        active: session.player.active,
        bodyEnabled: session.player.body?.enable ?? false,
        hudState: session.hudState
      }))
    };
  }

  shutdown() {
    if (window.__silseaC3?.getSnapshot) delete window.__silseaC3;
    const container = document.querySelector("#game-container");
    if (container) delete container.dataset.coopSnapshot;
    for (const interaction of this.interactions) interaction?.destroy?.();
    this.interactions = [];
    for (const session of this.players ?? []) {
      session.shadow?.destroy();
      session.markerPlate?.destroy();
      session.markerNumber?.destroy();
      session.player?.destroy();
    }
    this.players = [];
    this.inputManager?.destroy();
    this.sessionManager?.destroy();
    this.audioManager?.destroy();
    this.targetBeam?.destroy();
    this.scoutBeam?.destroy();
    this.scoutLabel?.destroy();
    this.targetScout?.destroy();
    this.targetLabel?.destroy();
    this.targetDummy?.destroy();
    this.levelLoader?.destroy();
  }
}
