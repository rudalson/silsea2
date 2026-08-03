import Phaser from "phaser";
import { COLORS, EVENTS, SCENE_KEYS } from "../config/constants.js";
import { getCharacter, cloneTuning } from "../data/characters.js";
import { getLevel } from "../data/levels/index.js";
import { assertLevelShape } from "../data/schema/levelSchema.js";
import { Player } from "../entities/Player.js";
import { AudioManager } from "../systems/AudioManager.js";
import { CheckpointManager } from "../systems/CheckpointManager.js";
import { DebugPanel } from "../systems/DebugPanel.js";
import { InputManager } from "../systems/InputManager.js";
import { LevelLoader } from "../systems/LevelLoader.js";
import { ObjectiveManager } from "../systems/ObjectiveManager.js";
import { progressManager } from "../systems/ProgressManager.js";
import { ScoreManager } from "../systems/ScoreManager.js";

export class GameScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.GAME);
  }

  init(data) {
    this.levelId = data.levelId ?? this.registry.get("levelId");
    this.interactions = [];
    this.elapsed = 0;
    this.lookAhead = 0;
    this.isCompleting = false;
    this.currentSectionId = null;
  }

  create() {
    this.level = getLevel(this.levelId);
    assertLevelShape(this.level);
    this.character = getCharacter(this.registry.get("characterId"));
    this.tuning = cloneTuning(this.character);
    this.inputManager = new InputManager(this);
    this.audioManager = new AudioManager(this);
    this.scoreManager = new ScoreManager();
    this.objectiveManager = new ObjectiveManager(this, this.level.objectives);
    this.checkpointManager = new CheckpointManager(this, this.level.player.spawn);
    this.levelLoader = new LevelLoader(this, this.level, this.objectiveManager).build();
    this.player = new Player(
      this,
      this.level.player.spawn.x,
      this.level.player.spawn.y - 2,
      this.character,
      this.tuning
    );

    this.bindWorldInteractions();
    this.configureCamera();
    this.scene.stop(SCENE_KEYS.UI);
    this.scene.launch(SCENE_KEYS.UI, { gameSceneKey: SCENE_KEYS.GAME });

    if (this.registry.get("debugEnabled")) {
      this.debugPanel = new DebugPanel(this, {
        tuning: this.tuning,
        level: this.level,
        objectives: this.objectiveManager,
        onWarp: (sectionId) => this.warpToSection(sectionId),
        onReload: () => this.rebuildLevel()
      });
    }

    this.updateAccessibleStatus(`${this.level.name} 시작. ${this.character.name} 선택됨.`);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
  }

  update(time, delta) {
    if (!this.player?.active || this.isCompleting) return;
    const input = this.inputManager.sample();
    if (input.debugPressed) this.debugPanel?.toggle();
    this.player.updateControls(input, time, delta);
    this.elapsed += delta / 1000;
    this.objectiveManager.update(this.elapsed);
    this.scoreManager.update(delta);

    if (this.player.y > this.level.world.height + 140) {
      this.updateAccessibleStatus("낭떠러지에서 마지막 안전 지점으로 돌아갑니다.");
      this.checkpointManager.respawn(this.player);
    }

    this.updateCamera(delta);
    this.debugPanel?.update(this.player, this.game.loop.actualFps, this.elapsed);
  }

  configureCamera() {
    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.level.world.width, this.level.world.height);
    camera.setDeadzone(320, 220);
    camera.startFollow(this.player, true, 0.12, 0.1);
    camera.setFollowOffset(0, 28);
  }

  updateCamera(delta) {
    const section = this.levelLoader.getSectionAt(this.player.x);
    if (section?.id !== this.currentSectionId) {
      this.currentSectionId = section?.id ?? null;
      this.events.emit(EVENTS.DEBUG_UPDATED, { section: this.currentSectionId });
    }

    if (section?.type === "boss" && section.lockCamera) {
      this.cameras.main.setBounds(section.xStart, 0, section.xEnd - section.xStart, this.level.world.height);
    } else {
      this.cameras.main.setBounds(0, 0, this.level.world.width, this.level.world.height);
    }

    const cue = this.level.cameraCues?.find((candidate) => this.player.x >= candidate.xStart && this.player.x <= candidate.xEnd);
    const speedDirection = Math.abs(this.player.body.velocity.x) > 35 ? Math.sign(this.player.body.velocity.x) : 0;
    const distance = section?.type === "boss" ? 0 : cue?.lookAhead ?? 150;
    const target = -speedDirection * distance;
    this.lookAhead = Phaser.Math.Linear(this.lookAhead, target, Math.min(1, delta / 220));
    this.cameras.main.setFollowOffset(this.lookAhead, 28);
  }

  bindWorldInteractions() {
    this.clearInteractions();
    this.interactions.push(this.physics.add.collider(this.player, this.levelLoader.terrainBodies));

    for (const checkpoint of this.levelLoader.checkpointZones) {
      const overlap = this.physics.add.overlap(this.player, checkpoint.zone, () => {
        if (!this.checkpointManager.activate(checkpoint.data)) return;
        checkpoint.visuals[1].setFillStyle(COLORS.collect);
        this.tweens.add({ targets: checkpoint.visuals, scale: 1.16, duration: 110, yoyo: true });
        this.updateAccessibleStatus(`${checkpoint.data.id} 체크포인트 도착.`);
      });
      this.interactions.push(overlap);
    }

    if (this.levelLoader.boss) {
      const bossOverlap = this.physics.add.overlap(this.player, this.levelLoader.boss, () => this.handleBossOverlap());
      this.interactions.push(bossOverlap);
    }

    if (this.levelLoader.gate) this.bindGate(this.levelLoader.gate);
    this.events.on(EVENTS.BOSS_DEFEATED, this.handleBossDefeated, this);
  }

  bindGate(gate) {
    const overlap = this.physics.add.overlap(this.player, gate.zone, () => this.handleGateEntered());
    this.interactions.push(overlap);
  }

  handleBossOverlap() {
    const boss = this.levelLoader.boss;
    if (!boss?.active) return;
    const fallingOntoHead = this.player.body.velocity.y > 120 && this.player.body.bottom <= boss.body.top + 54;
    if (fallingOntoHead) {
      const didHit = this.levelLoader.hitBoss(this.player);
      if (didHit && this.levelLoader.gate && !this.gateBound) {
        this.gateBound = true;
        this.bindGate(this.levelLoader.gate);
      }
    } else {
      const direction = this.player.x < boss.x ? -1 : 1;
      this.player.setVelocityX(direction * 260);
      this.player.setVelocityY(-240);
    }
  }

  handleBossDefeated() {
    if (this.levelLoader.gate && !this.gateBound) {
      this.gateBound = true;
      this.bindGate(this.levelLoader.gate);
    }
    this.cameras.main.shake(120, 0.003);
    this.updateAccessibleStatus("임시 보스를 격파했습니다. 오른쪽 무지개 게이트로 이동하세요.");
  }

  handleGateEntered() {
    if (this.isCompleting) return;
    this.objectiveManager.markGateEntered();
    if (!this.objectiveManager.areRequiredComplete()) return;
    this.isCompleting = true;
    this.player.setVelocity(0, 0);
    this.player.body.enable = false;
    this.cameras.main.flash(260, 245, 223, 79);
    const achieved = this.objectiveManager
      .getSnapshot()
      .filter((objective) => !objective.required && objective.complete)
      .map((objective) => objective.type);
    const score = this.scoreManager.score;
    progressManager.complete(this.level.id, score, achieved);
    this.updateAccessibleStatus(`${this.level.name} 클리어.`);

    this.time.delayedCall(320, () => {
      this.scene.stop(SCENE_KEYS.UI);
      this.scene.start(SCENE_KEYS.CLEAR, {
        levelId: this.level.id,
        characterId: this.character.id,
        elapsed: this.elapsed,
        score,
        achieved
      });
    });
  }

  warpToSection(sectionId) {
    const section = this.levelLoader.getSection(sectionId);
    if (!section) return;
    const x = Math.min(section.xEnd - 96, section.xStart + 160);
    const y = this.levelLoader.findSafeY(x);
    this.player.setPosition(x, y - 2).setVelocity(0, 0);
    this.cameras.main.centerOn(x, y - 180);
  }

  rebuildLevel() {
    const position = { x: this.player.x, y: this.player.y };
    this.clearInteractions();
    this.events.off(EVENTS.BOSS_DEFEATED, this.handleBossDefeated, this);
    this.levelLoader.destroy();
    this.levelLoader = new LevelLoader(this, this.level, this.objectiveManager).build();
    this.player.setPosition(position.x, Math.min(position.y, this.levelLoader.findSafeY(position.x) - 2));
    this.gateBound = false;
    this.bindWorldInteractions();
    this.events.emit(EVENTS.LEVEL_RELOADED, this.level.id);
  }

  clearInteractions() {
    for (const interaction of this.interactions) interaction?.destroy();
    this.interactions.length = 0;
  }

  updateAccessibleStatus(message) {
    const status = document.querySelector("#game-status");
    if (status) status.textContent = message;
  }

  shutdown() {
    this.clearInteractions();
    this.events.off(EVENTS.BOSS_DEFEATED, this.handleBossDefeated, this);
    this.debugPanel?.destroy();
    this.debugPanel = null;
    this.inputManager?.destroy();
    this.audioManager?.destroy();
    this.levelLoader?.destroy();
  }
}
