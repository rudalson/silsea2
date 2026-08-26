import { COLORS, CSS_COLORS, EVENTS, GAME_HEIGHT, GAME_WIDTH } from "../config/constants.js";
import { GAME_FONT_FAMILY } from "../config/font.js";
import {
  WAVE_STATES,
  getMistZoneAt,
  getWaveIntervalMs,
  isInsideShelter,
  resolveMistProfile
} from "../data/environment.js";
import { FORMS } from "../data/gameplay.js";
import { SeededRandom } from "./SeededRandom.js";

const WAVE_WIDTH = 196;

export class EnvironmentMechanicsManager {
  constructor(scene, player, level, healthManager, transformationManager) {
    this.scene = scene;
    this.player = player;
    this.level = level;
    this.healthManager = healthManager;
    this.transformationManager = transformationManager;
    this.config = level.environment ?? {};
    this.waterZones = this.config.waterZones ?? [];
    this.breathPoints = this.config.breathPoints ?? [];
    this.tsunami = this.config.tsunami ?? null;
    this.mist = this.config.mist ?? null;
    this.currentMistDensity = 0;
    this.currentVisibilityRadius = this.mist?.defaultVisibilityRadius ?? 520;
    this.activeMistZoneId = null;
    this.created = [];
    this.mistTweens = [];
    this.waveState = WAVE_STATES.IDLE;
    this.waveId = 0;
    this.waveVisual = null;
    this.waveEndsAt = 0;
    this.waveStartsAt = 0;
    const requestedReviewWaveMode = scene.registry.get("visualReviewWaveMode");
    this.visualReviewWaveMode = ["paused", "warning", "active", "hit"].includes(requestedReviewWaveMode)
      ? requestedReviewWaveMode
      : null;
    this.visualReviewWaveInitialized = false;
    this.nextWaveAt = this.tsunami
      ? this.visualReviewWaveMode
        ? Number.POSITIVE_INFINITY
        : scene.time.now + Math.max(0, this.tsunami.firstWarning ?? 6) * 1000
      : Number.POSITIVE_INFINITY;
    this.random = new SeededRandom(level.order * 7919 + 17);
    this.lastHitWaveId = 0;
    this.lastShelteredAt = Number.NEGATIVE_INFINITY;
    this.createWaterVisuals();
    this.createShelterVisuals();
    this.createMistVisuals();
    this.onRespawn = () => this.resetAfterRespawn();
    this.scene.events.on(EVENTS.PLAYER_RESPAWNED, this.onRespawn);
  }

  createWaterVisuals() {
    for (const zone of this.waterZones) {
      const width = zone.xEnd - zone.xStart;
      const height = zone.bottomY - zone.surfaceY;
      const water = this.track(this.scene.add.rectangle(
        zone.xStart + width / 2,
        zone.surfaceY + height / 2,
        width,
        height,
        COLORS.collectBlue,
        this.getEffectAlpha(0.22)
      ));
      water.setDepth(7);
      const surface = this.track(this.scene.add.rectangle(
        zone.xStart + width / 2,
        zone.surfaceY,
        width,
        8,
        COLORS.white,
        this.getEffectAlpha(0.72)
      ));
      surface.setDepth(8);
      if (this.scene.registry.get("debugEnabled") || this.scene.registry.get("forceAssetFallback")) {
        const label = this.track(this.scene.add.text(zone.xStart + 20, zone.surfaceY + 18, `수면 · ${zone.id}`, {
          fontFamily: GAME_FONT_FAMILY,
          fontSize: "16px",
          fontStyle: "700",
          color: CSS_COLORS.white,
          backgroundColor: CSS_COLORS.panelSoft,
          padding: { x: 8, y: 4 }
        }));
        label.setDepth(9);
      }
    }

    const showBreathPoints = this.level.visualTheme === "submerged-graybox"
      || this.scene.registry.get("debugEnabled")
      || this.scene.registry.get("forceAssetFallback");
    if (!showBreathPoints) return;
    for (const point of this.breathPoints) {
      const zone = this.waterZones.find(({ id }) => id === point.zoneId);
      if (!zone) continue;
      const surfaceY = zone.surfaceY;
      const marker = this.track(this.scene.add.triangle(
        point.x,
        surfaceY - 34,
        0,
        20,
        14,
        0,
        28,
        20,
        COLORS.collect,
        0.94
      ));
      marker.setStrokeStyle(3, COLORS.outline, 0.92).setDepth(9);
      const bubbleA = this.track(this.scene.add.circle(point.x + 22, surfaceY + 22, 7, COLORS.white, 0.76));
      const bubbleB = this.track(this.scene.add.circle(point.x + 34, surfaceY + 43, 4, COLORS.white, 0.66));
      bubbleA.setStrokeStyle(2, COLORS.collectBlue, 0.85).setDepth(9);
      bubbleB.setStrokeStyle(2, COLORS.collectBlue, 0.85).setDepth(9);
      const label = this.track(this.scene.add.text(point.x, surfaceY - 62, point.label ?? "숨", {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "15px",
        fontStyle: "800",
        color: CSS_COLORS.white,
        backgroundColor: CSS_COLORS.panelSoft,
        padding: { x: 7, y: 3 }
      }));
      label.setOrigin(0.5).setDepth(9);
    }
  }

  createShelterVisuals() {
    const effectKeys = this.level.assets.effects ?? {};
    const forceFallback = this.scene.registry.get("forceAssetFallback");
    const finalArt = this.level.visualTheme === "tsunami-village" && !forceFallback;
    const showDebug = this.scene.registry.get("debugEnabled") || forceFallback || !finalArt;

    for (const shelter of this.tsunami?.shelters ?? []) {
      const width = shelter.xEnd - shelter.xStart;
      const height = shelter.yBottom - shelter.yTop;
      const centerX = shelter.xStart + width / 2;
      if (shelter.type === "house") {
        const houseKey = shelter.asset ? effectKeys[shelter.asset] : null;
        if (finalArt && houseKey && this.scene.textures?.exists?.(houseKey)) {
          const house = this.track(this.scene.add.image(centerX, shelter.yBottom + 4, houseKey));
          house.setOrigin(0.5, 1).setDisplaySize(width * 1.22, height + 104).setDepth(5);
        } else {
          const roof = this.track(this.scene.add.triangle(
            centerX,
            shelter.yTop - 24,
            -width * 0.56,
            48,
            0,
            0,
            width * 0.56,
            48,
            COLORS.dangerAlt,
            0.76
          ));
          roof.setStrokeStyle(5, COLORS.outline, 0.92).setDepth(5);
          const leftPillar = this.track(this.scene.add.rectangle(shelter.xStart + 14, shelter.yTop + height / 2, 28, height, COLORS.outline, 0.72));
          const rightPillar = this.track(this.scene.add.rectangle(shelter.xEnd - 14, shelter.yTop + height / 2, 28, height, COLORS.outline, 0.72));
          leftPillar.setDepth(5);
          rightPillar.setDepth(5);
        }
      } else if (shelter.type === "hill") {
        const hillKey = shelter.asset ? effectKeys[shelter.asset] : null;
        if (finalArt && hillKey && this.scene.textures?.exists?.(hillKey)) {
          const hill = this.track(this.scene.add.image(centerX, shelter.yBottom + 3, hillKey));
          hill.setOrigin(0.5, 1).setDisplaySize(width * 1.28, height * 1.05).setDepth(5);
        } else {
          const hill = this.track(this.scene.add.ellipse(centerX, shelter.yBottom - height * 0.28, width * 1.08, height * 1.05, COLORS.grass, 0.72));
          hill.setStrokeStyle(5, COLORS.outline, 0.82).setDepth(5);
        }
      } else if (shelter.type === "high") {
        const highPlatform = this.track(this.scene.add.rectangle(centerX, shelter.yBottom, width, 24, COLORS.ground, 0.9));
        highPlatform.setStrokeStyle(5, COLORS.collect, 0.92).setDepth(5);
        for (let index = -1; showDebug && index <= 1; index += 1) {
          const chevron = this.track(this.scene.add.triangle(
            centerX + index * 46,
            shelter.yTop + 34,
            0,
            24,
            18,
            0,
            36,
            24,
            COLORS.collect,
            0.88
          ));
          chevron.setStrokeStyle(2, COLORS.white, 0.88).setDepth(6);
        }
      }
      if (showDebug) {
        const body = this.track(this.scene.add.rectangle(
          centerX,
          shelter.yTop + height / 2,
          width,
          height,
          COLORS.near,
          0.34
        ));
        body.setStrokeStyle(5, COLORS.collect, 0.9).setDepth(6);
        const label = this.track(this.scene.add.text(
          centerX,
          shelter.yTop + 20,
          shelter.label ?? "안전지대",
          {
            fontFamily: GAME_FONT_FAMILY,
            fontSize: "15px",
            fontStyle: "700",
            color: CSS_COLORS.white,
            backgroundColor: CSS_COLORS.panelSoft,
            padding: { x: 7, y: 4 }
          }
        ));
        label.setOrigin(0.5).setDepth(7);
      }
    }

    if (!this.tsunami) return;
    const warningKey = effectKeys.tsunamiWarning;
    if (finalArt && warningKey && this.scene.textures?.exists?.(warningKey)) {
      const warningArt = this.track(this.scene.add.image(GAME_WIDTH - 70, GAME_HEIGHT / 2, warningKey));
      warningArt.setScrollFactor(0).setDisplaySize(112, 112).setDepth(25).setVisible(false);
      if (this.tsunami.direction !== "left") warningArt.setFlipX(true);
      this.waveWarningVisuals = [warningArt];
    } else {
      const warningGlow = this.track(this.scene.add.circle(GAME_WIDTH - 70, GAME_HEIGHT / 2, 46, COLORS.danger, 0.42));
      const warningArrow = this.track(this.scene.add.triangle(
        GAME_WIDTH - 70,
        GAME_HEIGHT / 2,
        48,
        0,
        0,
        26,
        48,
        52,
        COLORS.white,
        0.96
      ));
      warningGlow.setScrollFactor(0).setDepth(24).setVisible(false);
      warningArrow.setScrollFactor(0).setDepth(25).setVisible(false).setStrokeStyle(4, COLORS.collectBlue, 0.94);
      if (this.tsunami.direction !== "left") warningArrow.setAngle(180);
      this.waveWarningVisuals = [warningGlow, warningArrow];
    }
    this.waveWarningTween = this.scene.tweens.add({
      targets: this.waveWarningVisuals,
      scale: { from: 0.88, to: 1.16 },
      alpha: { from: 0.55, to: 1 },
      duration: 320,
      yoyo: true,
      repeat: -1,
      paused: true
    });
  }

  createMistVisuals() {
    if (!this.mist) return;

    const effectKeys = this.level.assets.effects ?? {};
    const forceFallback = this.scene.registry.get("forceAssetFallback");

    this.fogOverlay = this.track(
      this.scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.soft, 1)
    );
    this.fogOverlay.setOrigin(0).setScrollFactor(0).setDepth(18).setAlpha(0);
    this.mistMaskGraphics = this.track(this.scene.add.graphics().setScrollFactor(0));
    this.mistMaskGraphics.setAlpha(0);
    this.mistMask = this.mistMaskGraphics.createGeometryMask();
    this.mistMask.invertAlpha = true;
    this.fogOverlay.setMask(this.mistMask);

    this.mistBankVisuals = [];
    if (!forceFallback && effectKeys.mistBank && this.scene.textures.exists(effectKeys.mistBank)) {
      for (let index = 0; index < 4; index += 1) {
        const bank = this.track(this.scene.add.image(index * 420 - 80, GAME_HEIGHT + 8, effectKeys.mistBank));
        bank
          .setOrigin(0, 1)
          .setScrollFactor(0)
          .setDisplaySize(500, 168)
          .setDepth(17)
          .setAlpha(0);
        this.mistBankVisuals.push(bank);
        this.mistTweens.push(this.scene.tweens.add({
          targets: bank,
          x: bank.x + 38,
          duration: 3600 + index * 320,
          yoyo: true,
          repeat: -1,
          ease: "Sine.InOut"
        }));
      }
    }

    this.mistClearVisual = null;
    if (!forceFallback && effectKeys.mistClear && this.scene.textures.exists(effectKeys.mistClear)) {
      this.mistClearVisual = this.track(this.scene.add.image(0, 0, effectKeys.mistClear));
      this.mistClearVisual.setScrollFactor(0).setDepth(19).setBlendMode("ADD").setAlpha(0);
    }

    for (const zone of this.mist.zones ?? []) {
      const boundary = this.track(
        this.scene.add.rectangle(zone.xStart + 2, GAME_HEIGHT / 2, 4, GAME_HEIGHT, COLORS.white, 0.28)
      );
      boundary.setDepth(17);
      const label = this.track(this.scene.add.text(zone.xStart + 18, 128, zone.label ?? zone.id, {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "16px",
        fontStyle: "700",
        color: CSS_COLORS.white,
        backgroundColor: CSS_COLORS.panelSoft,
        padding: { x: 8, y: 5 }
      }));
      label.setDepth(20);
    }

    for (const guide of this.mist.guides ?? []) this.createMistGuide(guide);
  }

  createMistGuide(guide) {
    const y = guide.y ?? 560;
    const effectKeys = this.level.assets.effects ?? {};
    const forceFallback = this.scene.registry.get("forceAssetFallback");
    const artKey = guide.kind === "beacon" ? effectKeys.mistBeacon : effectKeys.mistBreeze;
    if (!forceFallback && artKey && this.scene.textures.exists(artKey)) {
      const art = this.track(this.scene.add.image(guide.x, y, artKey));
      if (guide.kind === "beacon") {
        art.setOrigin(0.5, 1).setDisplaySize(72, 144).setDepth(20);
        this.mistTweens.push(this.scene.tweens.add({
          targets: art,
          alpha: { from: 0.66, to: 1 },
          scaleX: { from: 0.72, to: 0.77 },
          scaleY: { from: 0.72, to: 0.77 },
          duration: 760,
          yoyo: true,
          repeat: -1,
          delay: guide.delay ?? 0
        }));
      } else {
        art.setOrigin(0.5).setDisplaySize(150, 75).setDepth(20);
        this.mistTweens.push(this.scene.tweens.add({
          targets: art,
          x: guide.x + 24,
          alpha: { from: 0.7, to: 1 },
          duration: 640,
          yoyo: true,
          repeat: -1,
          delay: guide.delay ?? 0
        }));
      }
      return;
    }

    if (guide.kind === "beacon") {
      const beam = this.track(this.scene.add.rectangle(guide.x, y - 72, 9, 116, COLORS.collect, 0.72));
      const diamond = this.track(this.scene.add.star(guide.x, y - 142, 4, 10, 25, COLORS.collect, 1));
      beam.setStrokeStyle(2, COLORS.white, 0.8).setDepth(20);
      diamond.setStrokeStyle(3, COLORS.white, 0.9).setDepth(20);
      this.mistTweens.push(this.scene.tweens.add({
        targets: [beam, diamond],
        alpha: 0.48,
        duration: 720,
        yoyo: true,
        repeat: -1,
        delay: guide.delay ?? 0
      }));
    } else {
      const arrow = this.track(
        this.scene.add.triangle(guide.x, y - 92, 0, 0, 42, 20, 0, 40, COLORS.collectBlue, 0.96)
      );
      const trail = this.track(this.scene.add.circle(guide.x - 28, y - 92, 7, COLORS.white, 0.82));
      arrow.setStrokeStyle(3, COLORS.white, 0.88).setDepth(20);
      trail.setDepth(20);
      this.mistTweens.push(this.scene.tweens.add({
        targets: [arrow, trail],
        x: "+=24",
        duration: 620,
        yoyo: true,
        repeat: -1,
        delay: guide.delay ?? 0
      }));
    }

    if (this.scene.registry.get("debugEnabled") || this.scene.registry.get("forceAssetFallback")) {
      const cueLabel = this.track(this.scene.add.text(
        guide.x,
        y - 184,
        guide.kind === "beacon" ? "빛 기둥" : "바람 화살표",
        {
          fontFamily: GAME_FONT_FAMILY,
          fontSize: "14px",
          fontStyle: "700",
          color: CSS_COLORS.white,
          backgroundColor: CSS_COLORS.panelSoft,
          padding: { x: 6, y: 4 }
        }
      ));
      cueLabel.setOrigin(0.5).setDepth(21);
    }
  }

  update(now, delta) {
    this.updateEffectStrength();
    this.updateMist(delta);
    if (!this.tsunami) return;
    this.updateShelterState(now);
    if (this.visualReviewWaveMode) {
      this.initializeVisualReviewWave(now);
      if (this.waveState === WAVE_STATES.ACTIVE) this.updateActiveWave(now, 0);
      return;
    }
    if (this.waveState === WAVE_STATES.IDLE && now >= this.nextWaveAt) this.beginWaveWarning(now);
    if (this.waveState === WAVE_STATES.WARNING && now >= this.waveStartsAt) this.activateWave(now);
    if (this.waveState === WAVE_STATES.ACTIVE) this.updateActiveWave(now, delta);
  }

  updateMist(delta) {
    if (!this.mist || !this.fogOverlay || !this.mistMaskGraphics) return;
    const zone = getMistZoneAt(this.player.x, this.mist.zones);
    const reduced = this.scene.registry.get("screenEffectStrength") === "reduced";
    const profile = resolveMistProfile(zone ?? {
      density: 0,
      visibilityRadius: this.mist.defaultVisibilityRadius
    }, {
      reduced,
      reducedDensityMultiplier: this.mist.reducedDensityMultiplier,
      reducedRadiusBonus: this.mist.reducedRadiusBonus
    });
    const blend = Math.min(1, Math.max(0, delta) / Math.max(1, this.mist.fadeMs ?? 240));
    this.currentMistDensity += (profile.density - this.currentMistDensity) * blend;
    this.currentVisibilityRadius += (profile.visibilityRadius - this.currentVisibilityRadius) * blend;
    this.fogOverlay.setAlpha(this.currentMistDensity);

    const view = this.scene.cameras.main.worldView;
    const screenX = this.player.x - view.x;
    const screenY = this.player.y - view.y - 20;
    this.mistMaskGraphics
      .clear()
      .fillStyle(COLORS.white, 1)
      .fillEllipse(
        screenX,
        screenY,
        this.currentVisibilityRadius * 2,
        this.currentVisibilityRadius * 1.18
      );
    for (const bank of this.mistBankVisuals ?? []) bank.setAlpha(this.currentMistDensity * 0.46);
    if (this.mistClearVisual) {
      this.mistClearVisual
        .setPosition(screenX, screenY)
        .setDisplaySize(this.currentVisibilityRadius * 1.9, this.currentVisibilityRadius * 1.2)
        .setAlpha(this.currentMistDensity * 0.24);
    }

    const zoneId = zone?.id ?? null;
    if (zoneId === this.activeMistZoneId) return;
    this.activeMistZoneId = zoneId;
    this.scene.events.emit(EVENTS.MIST_ZONE_CHANGED, this.getSnapshot());
    this.scene.updateAccessibleStatus?.(
      zone
        ? `${zone.label ?? "안개 구간"}입니다. 빛 기둥과 움직이는 바람 화살표를 따라가세요.`
        : "안개가 걷혔습니다."
    );
  }

  initializeVisualReviewWave(now) {
    if (this.visualReviewWaveInitialized) return;
    this.visualReviewWaveInitialized = true;
    if (this.visualReviewWaveMode === "paused") return;
    if (this.visualReviewWaveMode === "warning") {
      this.waveState = WAVE_STATES.WARNING;
      this.waveStartsAt = now + Math.max(0.1, this.tsunami.telegraph ?? 1.5) * 1000;
      for (const visual of this.waveWarningVisuals ?? []) visual.setVisible(true);
      this.waveWarningTween?.restart?.();
      return;
    }
    this.activateWave(now);
    this.waveEndsAt = Number.POSITIVE_INFINITY;
    if (this.visualReviewWaveMode === "hit") this.waveVisual.x = this.player.x;
  }

  beginWaveWarning(now) {
    this.waveState = WAVE_STATES.WARNING;
    this.waveStartsAt = now + Math.max(0.1, this.tsunami.telegraph ?? 1.5) * 1000;
    this.nextWaveAt = now + getWaveIntervalMs(this.tsunami.interval, this.random.next());
    this.scene.events.emit(EVENTS.TSUNAMI_WARNING, {
      direction: this.tsunami.direction,
      arrivesAt: this.waveStartsAt
    });
    this.scene.events.emit(EVENTS.TSUNAMI_STATE_CHANGED, this.getSnapshot());
    this.scene.audioManager?.playSfx("sfx_tsunami_warning", { randomizeRate: false });
    for (const visual of this.waveWarningVisuals ?? []) visual.setVisible(true);
    this.waveWarningTween?.restart?.();
    this.scene.updateAccessibleStatus?.(
      `쓰나미가 ${this.tsunami.direction === "left" ? "오른쪽" : "왼쪽"}에서 옵니다. 안전지대로 이동하세요.`
    );
  }

  activateWave(now) {
    this.waveState = WAVE_STATES.ACTIVE;
    this.waveId += 1;
    this.waveEndsAt = now + Math.max(0.5, this.tsunami.duration ?? 2.5) * 1000;
    for (const visual of this.waveWarningVisuals ?? []) visual.setVisible(false);
    this.waveWarningTween?.pause?.();
    const view = this.scene.cameras.main.worldView;
    const leftward = this.tsunami.direction === "left";
    const x = leftward ? view.right + WAVE_WIDTH / 2 : view.left - WAVE_WIDTH / 2;
    const effectKeys = this.level.assets.effects ?? {};
    const waveKey = effectKeys.tsunamiWave;
    const forceFallback = this.scene.registry.get("forceAssetFallback");
    if (!forceFallback && waveKey && this.scene.textures?.exists?.(waveKey)) {
      const animationKey = `${waveKey}-loop`;
      if (!this.scene.anims.exists(animationKey)) {
        this.scene.anims.create({
          key: animationKey,
          frames: this.scene.anims.generateFrameNumbers(waveKey, { start: 0, end: 7 }),
          frameRate: 9,
          repeat: -1
        });
      }
      this.waveVisual = this.track(this.scene.add.sprite(x, GAME_HEIGHT - 42, waveKey, 0));
      this.waveVisual
        .setOrigin(0.5, 1)
        .setDisplaySize(WAVE_WIDTH * 1.16, GAME_HEIGHT * 0.86)
        .setFlipX(!leftward)
        .setDepth(22)
        .play(animationKey);
    } else {
      this.waveVisual = this.track(this.scene.add.rectangle(
        x,
        GAME_HEIGHT * 0.66,
        WAVE_WIDTH,
        GAME_HEIGHT * 0.74,
        COLORS.collectBlue,
        this.getEffectAlpha(0.72)
      ));
      this.waveVisual.setStrokeStyle(8, COLORS.white, this.getEffectAlpha(0.86)).setDepth(22);
    }
    this.scene.events.emit(EVENTS.TSUNAMI_STATE_CHANGED, this.getSnapshot());
    this.scene.audioManager?.playSfx("sfx_tsunami_pass", { randomizeRate: false });
  }

  updateActiveWave(now, delta) {
    const direction = this.tsunami.direction === "left" ? -1 : 1;
    const speed = this.player.tuning.maxSpeed * Math.max(0.1, this.tsunami.speedMultiplier ?? 1.15);
    this.waveVisual.x += direction * speed * delta / 1000;
    this.waveVisual.setAlpha(this.getEffectAlpha(0.72));
    const playerHalfWidth = (this.player.body?.width ?? 44) / 2;
    const overlaps = Math.abs(this.player.x - this.waveVisual.x) <= WAVE_WIDTH / 2 + playerHalfWidth;
    if (overlaps && this.lastHitWaveId !== this.waveId && !this.isPlayerSafe(now)) {
      this.lastHitWaveId = this.waveId;
      if (this.healthManager.takeDamage(this.waveVisual.x)) {
        this.scene.audioManager?.playSfx("sfx_tsunami_hit", { randomizeRate: false });
        this.scene.updateAccessibleStatus?.("파도에 맞아 체력이 1 줄었습니다.");
      }
    }
    if (now >= this.waveEndsAt) this.finishWave();
  }

  updateShelterState(now) {
    const bodyCenterY = this.player.body?.center?.y ?? this.player.y - 29;
    if (isInsideShelter({ x: this.player.x, y: bodyCenterY }, this.tsunami.shelters ?? [])) {
      this.lastShelteredAt = now;
    }
  }

  isPlayerSafe(now) {
    const shelterGraceMs = Math.max(0, this.tsunami.shelterGrace ?? 0) * 1000;
    if (now - this.lastShelteredAt <= shelterGraceMs) return true;
    const form = this.transformationManager.form;
    const flightClearanceY = this.tsunami.flightClearanceY ?? 300;
    const aboveWave = (this.player.body?.bottom ?? this.player.y) <= flightClearanceY;
    return aboveWave && (form === FORMS.PEGASUS || form === FORMS.ALICORN);
  }

  finishWave() {
    this.waveVisual?.destroy();
    if (this.waveVisual) this.created = this.created.filter((entry) => entry !== this.waveVisual);
    this.waveVisual = null;
    this.waveState = WAVE_STATES.IDLE;
    this.waveEndsAt = 0;
    for (const visual of this.waveWarningVisuals ?? []) visual.setVisible(false);
    this.waveWarningTween?.pause?.();
    this.scene.events.emit(EVENTS.TSUNAMI_STATE_CHANGED, this.getSnapshot());
  }

  resetAfterRespawn() {
    if (!this.tsunami) return;
    if (this.waveState === WAVE_STATES.ACTIVE) this.finishWave();
    this.waveState = WAVE_STATES.IDLE;
    this.waveStartsAt = 0;
    this.nextWaveAt = this.scene.time.now + Math.max(0, this.tsunami.respawnGrace ?? 3) * 1000;
    this.lastShelteredAt = Number.NEGATIVE_INFINITY;
    for (const visual of this.waveWarningVisuals ?? []) visual.setVisible(false);
    this.waveWarningTween?.pause?.();
  }

  get pausesEnemies() {
    return Boolean(this.tsunami?.pauseEnemiesDuringWave && this.waveState === WAVE_STATES.ACTIVE);
  }

  getEffectAlpha(base) {
    return base * (this.scene.registry.get("screenEffectStrength") === "reduced" ? 0.55 : 1);
  }

  updateEffectStrength() {
    const reduced = this.scene.registry.get("screenEffectStrength") === "reduced";
    for (const object of this.created) {
      if (object === this.waveVisual) continue;
      if (object.type === "Rectangle" && object.depth === 7) object.setAlpha(reduced ? 0.12 : 0.22);
    }
  }

  getSnapshot() {
    const now = this.scene.time.now;
    const targetAt = this.waveState === WAVE_STATES.WARNING ? this.waveStartsAt : this.nextWaveAt;
    const secondsUntilWave = this.visualReviewWaveMode === "warning"
      ? Math.max(0.1, this.tsunami?.telegraph ?? 1.5)
      : this.tsunami && Number.isFinite(targetAt)
        ? Math.max(0, (targetAt - now) / 1000)
        : null;
    return {
      direction: this.level.progression?.direction ?? "right",
      waveState: this.waveState,
      waveId: this.waveId,
      secondsUntilWave,
      waterZoneCount: this.waterZones.length,
      breathPointCount: this.breathPoints.length,
      mistZone: this.activeMistZoneId ?? null,
      mistDensity: this.currentMistDensity ?? 0,
      visibilityRadius: this.currentVisibilityRadius ?? 0,
      mistGuideKinds: this.mist ? [...new Set((this.mist.guides ?? []).map(({ kind }) => kind))] : [],
      pausesEnemies: this.pausesEnemies
    };
  }

  track(object) {
    this.created.push(object);
    return object;
  }

  destroy() {
    this.scene.events.off(EVENTS.PLAYER_RESPAWNED, this.onRespawn);
    for (const tween of this.mistTweens) tween?.stop?.();
    this.mistTweens.length = 0;
    this.fogOverlay?.clearMask?.();
    this.mistMask?.destroy?.();
    for (const object of this.created) object?.destroy?.();
    this.created.length = 0;
    this.waveVisual = null;
    this.fogOverlay = null;
    this.mistMaskGraphics = null;
    this.mistMask = null;
    this.mistBankVisuals = null;
    this.mistClearVisual = null;
    this.waveWarningTween?.stop?.();
    this.waveWarningVisuals = null;
    this.waveWarningTween = null;
  }
}
