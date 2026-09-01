import Phaser from "phaser";
import { COLORS, EVENTS, GAME_HEIGHT, SCENE_KEYS } from "../config/constants.js";
import { getCharacter, cloneTuning } from "../data/characters.js";
import { getLevel } from "../data/levels/index.js";
import {
  assertLevelShape,
  getCameraLookAheadTarget,
  getProgressionSign,
  normalizeLevelDefinition
} from "../data/schema/levelSchema.js";
import { Player } from "../entities/Player.js";
import { AudioManager } from "../systems/AudioManager.js";
import { BreathManager } from "../systems/BreathManager.js";
import { BossController } from "../systems/BossController.js";
import { CameraEffectsManager } from "../systems/CameraEffectsManager.js";
import { CheckpointManager } from "../systems/CheckpointManager.js";
import { DebugPanel } from "../systems/DebugPanel.js";
import { createRuntimeLevel, getDifficultySettings } from "../systems/DifficultyManager.js";
import { EnemyManager } from "../systems/EnemyManager.js";
import { EnvironmentMechanicsManager } from "../systems/EnvironmentMechanicsManager.js";
import { HealthManager } from "../systems/HealthManager.js";
import { InputManager } from "../systems/InputManager.js";
import { LevelLoader } from "../systems/LevelLoader.js";
import { ObjectiveManager } from "../systems/ObjectiveManager.js";
import { ParticleEffectsManager } from "../systems/ParticleEffectsManager.js";
import { PlaytestManager } from "../systems/PlaytestManager.js";
import { progressManager } from "../systems/ProgressManager.js";
import { ScoreManager } from "../systems/ScoreManager.js";
import { TerrainMechanicsManager } from "../systems/TerrainMechanicsManager.js";
import { TransformationManager } from "../systems/TransformationManager.js";
import { moveTowards } from "../utils/math.js";

const BOSS_CLEAR_DELAY_MS = 1500;

export class GameScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.GAME);
  }

  init(data) {
    this.levelId = data.levelId ?? this.registry.get("levelId");
    if (data.easyMode !== undefined) this.registry.set("easyMode", Boolean(data.easyMode));
    this.interactions = [];
    this.elapsed = 0;
    this.lookAhead = 0;
    this.isCompleting = false;
    this.currentSectionId = null;
    this.bossClearTimer = null;
  }

  create() {
    const sourceLevel = getLevel(this.levelId);
    assertLevelShape(sourceLevel);
    const normalizedLevel = normalizeLevelDefinition(sourceLevel);
    const easyMode = Boolean(this.registry.get("easyMode"));
    this.difficulty = getDifficultySettings(normalizedLevel, easyMode);
    this.level = createRuntimeLevel(normalizedLevel, easyMode);
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
    this.playerShadow = this.add.ellipse(
      this.player.x,
      this.level.player.spawn.y + 2,
      82,
      16,
      COLORS.near,
      0.24
    ).setDepth(1);
    this.particleEffects = new ParticleEffectsManager(this);
    this.createGameplayManagers();
    this.playtestManager = new PlaytestManager(this, this.player, {
      enabled: Boolean(this.registry.get("playtestEnabled")),
      testerId: this.registry.get("playtestTesterId"),
      level: this.level,
      characterId: this.character.id,
      easyMode,
      persistIncomplete: !this.registry.get("visualReviewSectionId")
    });

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
        getEnvironmentSnapshot: () => this.environmentMechanics?.getSnapshot(),
        getBreathSnapshot: () => this.breathManager?.getSnapshot(),
        onWarp: (sectionId) => this.warpToSection(sectionId),
        onReload: () => this.rebuildLevel()
      });
    }

    const visualReviewSectionId = this.registry.get("visualReviewSectionId");
    const visualReviewOffset = this.registry.get("visualReviewOffset");
    if (visualReviewSectionId) this.warpToSection(visualReviewSectionId, visualReviewOffset ?? 160);
    const visualReviewSurface = this.registry.get("visualReviewSurface");
    if (visualReviewSectionId && visualReviewSurface === "ground") {
      this.player.setY(this.level.player.spawn.y - 2).setVelocity(0, 0);
      this.cameras.main.centerOn(this.player.x, this.player.y - 180);
    }
    if (visualReviewSectionId && visualReviewSurface === "underwater") {
      const reviewWaterZone = this.level.environment?.waterZones?.find(
        ({ xStart, xEnd }) => this.player.x >= xStart && this.player.x <= xEnd
      );
      if (reviewWaterZone) {
        const reviewDepth = Math.min(reviewWaterZone.bottomY - 96, reviewWaterZone.surfaceY + 80);
        this.player.setY(reviewDepth).setVelocity(0, 0);
        this.player.body?.setAllowGravity?.(false);
        this.cameras.main.centerOn(this.player.x, this.player.y - 120);
      }
    }
    if (visualReviewSectionId) {
      this.player.body?.updateFromGameObject?.();
      this.breathManager?.refreshWaterState();
      this.breathManager?.emitSnapshot();
    }
    const visualReviewForm = this.registry.get("visualReviewForm");
    if (visualReviewForm) {
      this.transformationManager.setForm(
        visualReviewForm,
        Boolean(this.registry.get("visualReviewPresentation"))
      );
      if (visualReviewForm === "alicorn") this.transformationManager.alicornEndsAt = Number.POSITIVE_INFINITY;
    }
    const visualReviewAnimation = this.registry.get("visualReviewAnimation");
    if (visualReviewAnimation && this.player.playCharacterAnimation(visualReviewAnimation, { force: true })) {
      this.player.animationLockedUntil = Number.POSITIVE_INFINITY;
    }
    const visualReviewZoom = this.registry.get("visualReviewZoom");
    if (visualReviewZoom) this.cameras.main.setZoom(visualReviewZoom);

    this.updateAccessibleStatus(
      `${this.level.name} 시작. ${this.character.name} 선택됨.${this.difficulty.enabled ? " 쉬운 모드." : ""}${this.registry.get("forceAssetFallback") ? " 도형·무음 fallback 모드." : ""}`
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
  }

  update(time, delta) {
    if (!this.player?.active || this.isCompleting) return;
    const input = this.inputManager.sample();
    this.lastInput = input;
    if (input.debugPressed) this.debugPanel?.toggle();
    const waterAbility = this.breathManager?.prepareMovement(input, time);
    const transformationAbility = this.transformationManager.prepareMovement(input, delta, {
      underwater: waterAbility?.mode === "swim"
    });
    const ability = waterAbility ?? transformationAbility;
    this.player.updateControls(input, time, delta, ability);
    this.updatePlayerShadow();
    this.terrainMechanics?.update(time, delta);
    this.environmentMechanics?.update(time, delta);
    this.breathManager?.update(time, delta);
    this.transformationManager.update(time);
    this.healthManager.update(time);
    this.enemyManager.setPaused(this.environmentMechanics?.pausesEnemies, time);
    this.enemyManager.update(time, delta);
    this.bossController?.update(time, delta);
    this.updateMagnet(delta);
    this.elapsed += delta / 1000;
    this.playtestManager?.update(this.elapsed, this.player);
    this.objectiveManager.update(this.elapsed);
    this.scoreManager.update(delta);

    if (this.player.y > this.level.world.height + 140 && !this.checkpointManager.respawning) {
      this.updateAccessibleStatus("낭떠러지에서 마지막 안전 지점으로 돌아갑니다.");
      this.events.emit(EVENTS.PLAYER_FELL, {
        hpLost: this.healthManager.isInvulnerable() ? 0 : 1
      });
      this.healthManager.handleFall();
    }

    this.updateCamera(delta);
    this.debugPanel?.update(this.player, this.game.loop.actualFps, this.elapsed);
  }

  configureCamera() {
    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.level.world.width, GAME_HEIGHT);
    camera.setDeadzone(320, 220);
    camera.startFollow(this.player, true, 0.12, 0.1);
    camera.setFollowOffset(0, 28);
  }

  updateCamera(delta) {
    const section = this.levelLoader.getSectionAt(this.player.x);
    if (section?.id !== this.currentSectionId) {
      this.currentSectionId = section?.id ?? null;
      this.levelLoader.setBackgroundMood(section?.mood);
      this.applyBossEnvironmentPolicy(section);
      if (section?.type === "boss" && this.level.assets.bgm.boss) {
        this.audioManager.playSfx("sfx_boss_appear", { randomizeRate: false });
        this.audioManager.transitionBgm(this.level.assets.bgm.boss);
      } else if (this.level.assets.bgm.field) {
        this.audioManager.transitionBgm(this.level.assets.bgm.field);
      }
      this.events.emit(EVENTS.DEBUG_UPDATED, { section: this.currentSectionId });
    }

    if (section?.type === "boss" && section.lockCamera) {
      this.cameras.main.setBounds(section.xStart, 0, section.xEnd - section.xStart, GAME_HEIGHT);
    } else {
      this.cameras.main.setBounds(0, 0, this.level.world.width, GAME_HEIGHT);
    }

    const cue = this.level.cameraCues?.find((candidate) => this.player.x >= candidate.xStart && this.player.x <= candidate.xEnd);
    const distance = section?.type === "boss" ? 0 : cue?.lookAhead ?? 150;
    const target = getCameraLookAheadTarget(this.player.body.velocity.x, distance);
    this.lookAhead = Phaser.Math.Linear(this.lookAhead, target, Math.min(1, delta / 220));
    this.cameras.main.setFollowOffset(this.lookAhead, 28);
  }

  applyBossEnvironmentPolicy(section) {
    const suspended = section?.type === "boss"
      ? section.boss?.environment?.suspend ?? []
      : [];
    this.environmentMechanics?.setSuspendedSystems(suspended);
    this.breathManager?.setSuspended(suspended.includes("breath"));
  }

  updatePlayerShadow() {
    if (!this.playerShadow || !this.player?.body?.enable) {
      this.playerShadow?.setVisible(false);
      return;
    }
    const surfaceY = this.levelLoader.findSurfaceBelow(this.player.x, this.player.y);
    if (!Number.isFinite(surfaceY)) {
      this.playerShadow.setVisible(false);
      return;
    }
    const altitude = Math.max(0, surfaceY - this.player.y);
    const visibility = Math.max(0, 1 - altitude / 360);
    this.playerShadow
      .setVisible(visibility > 0.05)
      .setPosition(this.player.x, surfaceY + 2)
      .setScale(Math.max(0.48, 1 - altitude / 620), 1)
      .setAlpha(0.08 + visibility * 0.2);
  }

  bindWorldInteractions() {
    this.clearInteractions();
    this.interactions.push(this.physics.add.collider(this.player, this.levelLoader.terrainBodies));

    for (const checkpoint of this.levelLoader.checkpointZones) {
      const overlap = this.physics.add.overlap(this.player, checkpoint.zone, () => {
        if (!this.checkpointManager.activate(checkpoint.data)) return;
        this.transformationManager.restoreFlight();
        if (checkpoint.data.restoresHealth) {
          this.healthManager.restoreFull();
          this.cameras.main.flash(180, 255, 243, 153);
        }
        if (checkpoint.data.restoresBreath) this.breathManager?.restoreFull();
        const fallbackFlag = checkpoint.visuals.at(-1);
        if (fallbackFlag?.setFillStyle) fallbackFlag.setFillStyle(COLORS.collect);
        for (const visual of checkpoint.visuals) visual.setAlpha(1);
        this.tweens.add({ targets: checkpoint.visuals, scale: 1.16, duration: 110, yoyo: true });
        this.updateAccessibleStatus(
          checkpoint.data.restoresHealth
            ? checkpoint.data.restoresBreath
              ? "휴식 지점 도착. 체력과 비행 에너지, 숨이 모두 회복되었습니다."
              : "휴식 지점 도착. 체력과 비행 에너지가 회복되었습니다."
            : "안전 지점이 저장되었습니다."
        );
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
    const { didHit } = this.bossController?.handlePlayerContact() ?? { didHit: false };
    if (didHit && this.levelLoader.gate && !this.gateBound) {
      this.gateBound = true;
      this.bindGate(this.levelLoader.gate);
    }
  }

  handleBossDefeated({ displayName = "보스" } = {}) {
    this.transformationManager?.cancelPresentation();
    if (this.levelLoader.gate && !this.gateBound) {
      this.gateBound = true;
      this.bindGate(this.levelLoader.gate);
    }
    this.cameraEffects.shake("bossDefeat");
    this.audioManager.playSfx("sfx_gate_spawn", { randomizeRate: false });
    this.updateAccessibleStatus(`${displayName}을(를) 격파했습니다. 잠시 후 클리어 화면으로 이동합니다.`);
    this.bossClearTimer?.remove(false);
    this.bossClearTimer = this.time.delayedCall(BOSS_CLEAR_DELAY_MS, () => {
      this.bossClearTimer = null;
      this.handleGateEntered();
    });
  }

  createGameplayManagers() {
    this.terrainMechanics = new TerrainMechanicsManager(this, this.player, this.level.terrainMechanics);
    this.transformationManager = new TransformationManager(this, this.player, this.levelLoader, this.difficulty);
    this.healthManager = new HealthManager(
      this,
      this.player,
      this.checkpointManager,
      this.scoreManager,
      this.objectiveManager,
      this.transformationManager,
      this.difficulty
    );
    this.environmentMechanics = new EnvironmentMechanicsManager(
      this,
      this.player,
      this.level,
      this.healthManager,
      this.transformationManager
    );
    this.breathManager = new BreathManager(
      this,
      this.player,
      this.environmentMechanics,
      this.healthManager,
      this.transformationManager,
      this.level.environment?.breath
    );
    this.enemyManager = new EnemyManager(
      this,
      this.player,
      this.levelLoader,
      this.healthManager,
      this.transformationManager,
      this.scoreManager,
      this.difficulty
    );
    this.bossController = this.levelLoader.boss
      ? new BossController(
          this,
          this.player,
          this.levelLoader,
          this.healthManager,
          this.transformationManager,
          this.scoreManager,
          this.level.order * 8901,
          this.difficulty
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
    const achieved = this.objectiveManager
      .getSnapshot()
      .filter((objective) => !objective.required && objective.complete)
      .map((objective) => objective.type);
    const score = this.scoreManager.score;
    this.completeProgressSafely({ score, achieved });
    const playtestBundle = this.completePlaytestSafely({ score, achieved });
    this.playStageClearPresentation();
    this.updateAccessibleStatus(`${this.level.name} 클리어.`);

    this.scene.stop(SCENE_KEYS.UI);
    this.scene.start(SCENE_KEYS.CLEAR, {
      levelId: this.level.id,
      characterId: this.character.id,
      elapsed: this.elapsed,
      score,
      achieved,
      playtestBundle
    });
  }

  completeProgressSafely({ score, achieved }) {
    try {
      return progressManager.complete(this.level.id, score, achieved);
    } catch (error) {
      console.error("[stage-clear] 진행도를 저장하지 못했지만 장면 전환은 계속합니다.", error);
      return null;
    }
  }

  completePlaytestSafely({ score, achieved }) {
    try {
      return this.playtestManager?.complete({
        elapsedSeconds: this.elapsed,
        score,
        achieved
      }) ?? null;
    } catch (error) {
      console.error("[stage-clear] 플레이테스트 기록을 저장하지 못했지만 장면 전환은 계속합니다.", error);
      return null;
    }
  }

  playStageClearPresentation() {
    try {
      // 다른 카메라 플래시나 줌 타이머가 남아 있으면 종료 중 노란 프레임에
      // 고정될 수 있으므로 클리어 플래시를 시작하기 전에 먼저 정리한다.
      this.transformationManager?.cancelPresentation();
      this.audioManager.stopLoop("sfx_fly_loop");
      this.audioManager.playSfx("sfx_clear", { randomizeRate: false });
      this.player.setVelocity(0, 0);
      this.player.body.enable = false;
      this.playerShadow?.setVisible(false);
      this.player.playVictoryAnimation?.();
      this.cameras.main.flash(260, 245, 223, 79, true);
    } catch (error) {
      this.cameras?.main?.flashEffect?.reset?.();
      console.error("[stage-clear] 클리어 연출을 생략하고 장면 전환을 계속합니다.", error);
    }
  }

  warpToSection(sectionId, offset = 160) {
    const section = this.levelLoader.getSection(sectionId);
    if (!section) return;
    const direction = getProgressionSign(this.level);
    const x = direction > 0
      ? Math.min(section.xEnd - 96, section.xStart + Math.max(0, offset))
      : Math.max(section.xStart + 96, section.xEnd - Math.max(0, offset));
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

  getPerformanceSnapshot() {
    const pools = {
      ...(this.enemyManager?.getPoolSnapshot() ?? {}),
      ...(this.bossController?.getPoolSnapshot() ?? {})
    };
    const poolValues = Object.values(pools).filter(Boolean);

    return {
      fps: this.game.loop.actualFps,
      elapsedSeconds: this.elapsed,
      pools,
      poolTotals: {
        activeCount: poolValues.reduce((total, entry) => total + entry.activeCount, 0),
        size: poolValues.reduce((total, entry) => total + entry.size, 0),
        maxSize: poolValues.reduce((total, entry) => total + entry.maxSize, 0),
        rejectedCount: poolValues.reduce((total, entry) => total + entry.rejectedCount, 0)
      },
      particles: this.particleEffects?.getSnapshot() ?? null,
      terrainMechanics: this.terrainMechanics?.getSnapshot() ?? null,
      environmentMechanics: this.environmentMechanics?.getSnapshot() ?? null,
      breath: this.breathManager?.getSnapshot() ?? null
    };
  }

  destroyGameplayManagers() {
    this.terrainMechanics?.destroy();
    this.terrainMechanics = null;
    this.breathManager?.destroy();
    this.breathManager = null;
    this.environmentMechanics?.destroy();
    this.environmentMechanics = null;
    this.bossController?.destroy();
    this.bossController = null;
    this.enemyManager?.destroy();
    this.enemyManager = null;
    this.transformationManager?.destroy();
    this.transformationManager = null;
    this.healthManager = null;
  }

  shutdown() {
    this.bossClearTimer?.remove(false);
    this.bossClearTimer = null;
    this.clearInteractions();
    this.events.off(EVENTS.BOSS_DEFEATED, this.handleBossDefeated, this);
    this.debugPanel?.destroy();
    this.debugPanel = null;
    this.inputManager?.destroy();
    this.playtestManager?.destroy();
    this.playtestManager = null;
    this.audioManager?.destroy();
    this.cameraEffects?.destroy();
    this.destroyGameplayManagers();
    this.particleEffects?.destroy();
    this.particleEffects = null;
    this.levelLoader?.destroy();
    this.playerShadow?.destroy();
    this.playerShadow = null;
  }
}
