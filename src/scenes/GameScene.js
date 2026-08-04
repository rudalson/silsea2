import Phaser from "phaser";
import { COLORS, EVENTS, SCENE_KEYS } from "../config/constants.js";
import { getCharacter, cloneTuning } from "../data/characters.js";
import { getLevel } from "../data/levels/index.js";
import { assertLevelShape } from "../data/schema/levelSchema.js";
import { Player } from "../entities/Player.js";
import { AudioManager } from "../systems/AudioManager.js";
import { BossController } from "../systems/BossController.js";
import { CameraEffectsManager } from "../systems/CameraEffectsManager.js";
import { CheckpointManager } from "../systems/CheckpointManager.js";
import { DebugPanel } from "../systems/DebugPanel.js";
import { EnemyManager } from "../systems/EnemyManager.js";
import { HealthManager } from "../systems/HealthManager.js";
import { InputManager } from "../systems/InputManager.js";
import { LevelLoader } from "../systems/LevelLoader.js";
import { ObjectiveManager } from "../systems/ObjectiveManager.js";
import { ParticleEffectsManager } from "../systems/ParticleEffectsManager.js";
import { progressManager } from "../systems/ProgressManager.js";
import { ScoreManager } from "../systems/ScoreManager.js";
import { TransformationManager } from "../systems/TransformationManager.js";
import { moveTowards } from "../utils/math.js";

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
    this.cameraEffects = new CameraEffectsManager(this);
    this.scoreManager = new ScoreManager({
      onComboChanged: (snapshot) => this.events.emit(EVENTS.COMBO_CHANGED, snapshot)
    });
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
    this.particleEffects = new ParticleEffectsManager(this);
    this.createGameplayManagers();

    this.bindWorldInteractions();
    this.configureCamera();
    this.audioManager.playBgm(this.level.assets.bgm.field);
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
    this.lastInput = input;
    if (input.debugPressed) this.debugPanel?.toggle();
    const ability = this.transformationManager.prepareMovement(input, delta);
    this.player.updateControls(input, time, delta, ability);
    this.transformationManager.update(time);
    this.healthManager.update(time);
    this.enemyManager.update(time, delta);
    this.bossController?.update(time, delta);
    this.updateMagnet(delta);
    this.elapsed += delta / 1000;
    this.objectiveManager.update(this.elapsed);
    this.scoreManager.update(delta);

    if (this.player.y > this.level.world.height + 140 && !this.checkpointManager.respawning) {
      this.updateAccessibleStatus("낭떠러지에서 마지막 안전 지점으로 돌아갑니다.");
      this.events.emit(EVENTS.PLAYER_FELL);
      this.healthManager.handleFall();
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
      this.levelLoader.setBackgroundMood(section?.mood);
      if (section?.type === "boss" && this.level.assets.bgm.boss) {
        this.audioManager.playSfx("sfx_boss_appear", { randomizeRate: false });
        this.audioManager.playBgm(this.level.assets.bgm.boss);
      } else if (this.level.assets.bgm.field) {
        this.audioManager.playBgm(this.level.assets.bgm.field);
      }
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
        this.transformationManager.restoreFlight();
        const fallbackFlag = checkpoint.visuals.at(-1);
        if (fallbackFlag?.setFillStyle) fallbackFlag.setFillStyle(COLORS.collect);
        for (const visual of checkpoint.visuals) visual.setAlpha(1);
        this.tweens.add({ targets: checkpoint.visuals, scale: 1.16, duration: 110, yoyo: true });
        this.updateAccessibleStatus(`${checkpoint.data.id} 체크포인트 도착.`);
      });
      this.interactions.push(overlap);
    }

    for (const collectible of this.levelLoader.collectibles) {
      const overlap = this.physics.add.overlap(this.player, collectible.zone, () => this.collectItem(collectible));
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
      if (!didHit) this.healthManager.takeDamage(boss.x);
    } else {
      this.healthManager.takeDamage(boss.x);
    }
  }

  handleBossDefeated() {
    if (this.levelLoader.gate && !this.gateBound) {
      this.gateBound = true;
      this.bindGate(this.levelLoader.gate);
    }
    this.cameraEffects.shake("bossDefeat");
    this.audioManager.playSfx("sfx_gate_spawn", { randomizeRate: false });
    this.updateAccessibleStatus("감자 대왕을 격파했습니다. 오른쪽 무지개 게이트로 이동하세요.");
  }

  createGameplayManagers() {
    this.transformationManager = new TransformationManager(this, this.player, this.levelLoader);
    this.healthManager = new HealthManager(
      this,
      this.player,
      this.checkpointManager,
      this.scoreManager,
      this.objectiveManager,
      this.transformationManager
    );
    this.enemyManager = new EnemyManager(
      this,
      this.player,
      this.levelLoader,
      this.healthManager,
      this.transformationManager,
      this.scoreManager
    );
    this.bossController = this.levelLoader.boss
      ? new BossController(
          this,
          this.player,
          this.levelLoader,
          this.healthManager,
          this.transformationManager,
          this.scoreManager,
          this.level.order * 8901
        )
      : null;
  }

  collectItem(collectible) {
    if (!collectible?.active) return;
    collectible.active = false;
    collectible.zone.body.enable = false;
    this.particleEffects.clearMagnetTrail(collectible.id);
    const multiplier = this.transformationManager.scoreMultiplier;

    if (collectible.type === "star") {
      this.objectiveManager.addStars(1);
      this.scoreManager.collect("star", multiplier);
    } else if (collectible.type === "percent_small" || collectible.type === "percent_large") {
      this.scoreManager.collect(collectible.type, multiplier);
    } else {
      this.transformationManager.collect(collectible.type, this.time.now);
    }

    this.events.emit(EVENTS.ITEM_COLLECTED, { type: collectible.type });
    for (const visual of collectible.visuals) {
      this.tweens.add({
        targets: visual,
        x: this.player.x,
        y: this.player.y - 58,
        alpha: 0,
        scale: 1.5,
        duration: 150,
        onComplete: () => visual.destroy()
      });
    }
  }

  updateMagnet(delta) {
    const radius = this.transformationManager.magnetRadius;
    if (!radius) return;
    for (const collectible of this.levelLoader.collectibles) {
      if (!collectible.active || collectible.type !== "star") continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y - 45, collectible.x, collectible.y);
      if (distance > radius) continue;
      collectible.magnetizing = true;
      const previous = { x: collectible.x, y: collectible.y };
      const speed = (680 * delta) / 1000;
      collectible.x = moveTowards(collectible.x, this.player.x, speed);
      collectible.y = moveTowards(collectible.y, this.player.y - 45, speed);
      for (const visual of collectible.visuals) visual.setPosition(collectible.x, collectible.y);
      this.particleEffects.emitMagnetTrail(
        collectible.id,
        previous,
        { x: collectible.x, y: collectible.y },
        this.time.now
      );
      if (distance <= 38) this.collectItem(collectible);
    }
  }

  handleGateEntered() {
    if (this.isCompleting) return;
    this.objectiveManager.markGateEntered();
    if (!this.objectiveManager.areRequiredComplete()) return;
    this.isCompleting = true;
    this.events.emit(EVENTS.GATE_ENTERED, { levelId: this.level.id });
    this.audioManager.stopLoop("sfx_fly_loop");
    this.audioManager.playSfx("sfx_clear", { randomizeRate: false });
    this.player.setVelocity(0, 0);
    this.player.body.enable = false;
    this.player.playVictoryAnimation?.();
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
    this.destroyGameplayManagers();
    this.particleEffects.reset();
    this.levelLoader.destroy();
    this.levelLoader = new LevelLoader(this, this.level, this.objectiveManager).build();
    this.player.setPosition(position.x, Math.min(position.y, this.levelLoader.findSafeY(position.x) - 2));
    this.createGameplayManagers();
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

  destroyGameplayManagers() {
    this.bossController?.destroy();
    this.bossController = null;
    this.enemyManager?.destroy();
    this.enemyManager = null;
    this.transformationManager?.destroy();
    this.transformationManager = null;
    this.healthManager = null;
  }

  shutdown() {
    this.clearInteractions();
    this.events.off(EVENTS.BOSS_DEFEATED, this.handleBossDefeated, this);
    this.debugPanel?.destroy();
    this.debugPanel = null;
    this.inputManager?.destroy();
    this.audioManager?.destroy();
    this.cameraEffects?.destroy();
    this.destroyGameplayManagers();
    this.particleEffects?.destroy();
    this.particleEffects = null;
    this.levelLoader?.destroy();
  }
}
