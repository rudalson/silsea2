import assert from "node:assert/strict";
import level01 from "../src/data/levels/level-01.js";
import level02 from "../src/data/levels/level-02.js";
import level03 from "../src/data/levels/level-03.js";
import level04 from "../src/data/levels/level-04.js";
import p1EnvironmentTest from "../src/data/levels/p1-environment-test.js";
import { POTATO_KING_PHASES, getBossPhasePattern } from "../src/data/bossPatterns.js";
import {
  getCharacterAnimationSpec,
  getCharacterAssetKeys,
  getCharacterSequenceKey
} from "../src/data/characterAnimations.js";
import {
  getEnemyAnimationSpec,
  getEnemyAssetKeys
} from "../src/data/enemyAnimations.js";
import {
  CORE_RULES,
  FORMS,
  TRANSFORM_PRESENTATION,
  getMagpieStealAmount,
  getRespawnScoreLoss,
  stepFlightGauge
} from "../src/data/gameplay.js";
import {
  getCameraLookAheadTarget,
  getNormalizedProgress,
  hasReachedProgressTrigger,
  normalizeLevelDefinition,
  assertLevelShape
} from "../src/data/schema/levelSchema.js";
import {
  getMistZoneAt,
  getWaterContact,
  getWaveIntervalMs,
  isInsideShelter,
  resolveMistProfile,
  stepBreathRatio
} from "../src/data/environment.js";
import { ObjectPool } from "../src/systems/ObjectPool.js";
import { BreathManager } from "../src/systems/BreathManager.js";
import {
  PLAYTEST_STORAGE_KEY,
  PLAYTEST_SCHEMA_VERSION,
  PlaytestManager,
  analyzePlaytestSessions,
  sanitizeTesterId
} from "../src/systems/PlaytestManager.js";
import { PARTICLE_EFFECTS, PARTICLE_LIMITS } from "../src/data/particleEffects.js";
import {
  ALICORN_LAYER_KEY,
  AudioManager,
  BGM_CROSSFADE_MS,
  STAR_PITCH_RATES
} from "../src/systems/AudioManager.js";
import { CAMERA_SHAKE_PROFILES, CameraEffectsManager } from "../src/systems/CameraEffectsManager.js";
import { createRuntimeLevel, getDifficultySettings } from "../src/systems/DifficultyManager.js";
import { HealthManager } from "../src/systems/HealthManager.js";
import { EnvironmentMechanicsManager } from "../src/systems/EnvironmentMechanicsManager.js";
import { ProgressManager } from "../src/systems/ProgressManager.js";
import { ScoreManager } from "../src/systems/ScoreManager.js";
import { SeededRandom } from "../src/systems/SeededRandom.js";
import { TRANSFORM_CAMERA_EASING, TransformationManager } from "../src/systems/TransformationManager.js";
import { getUpdraftVelocity } from "../src/systems/TerrainMechanicsManager.js";
import { moveTowards } from "../src/utils/math.js";
import { PALETTE } from "../data/palette.js";

const colorChannels = (hex) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};
const colorLuma = (hex) => {
  const [red, green, blue] = colorChannels(hex);
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
};

assert.equal(CORE_RULES.invulnerableMs, 2000);
assert.ok(CORE_RULES.hurtLockMs <= 250);
assert.equal(CORE_RULES.flightMaxMs, 10000);
assert.equal(CORE_RULES.flightRecoveryMs, 3000);
assert.equal(CORE_RULES.alicornDurationMs, 12000);
assert.equal(CORE_RULES.alicornWarningMs, 3000);
assert.ok(CORE_RULES.bossTelegraphMs >= 700 && CORE_RULES.bossTelegraphMs <= 1000);
for (const cue of Object.values(TRANSFORM_PRESENTATION)) {
  assert.ok(cue.emphasisMs >= 100 && cue.emphasisMs <= 180);
  assert.ok(cue.holdMs > 0 && cue.holdMs <= cue.emphasisMs);
}
assert.equal(TRANSFORM_PRESENTATION[FORMS.ALICORN].emphasisMs, 180);
assert.equal(TRANSFORM_CAMERA_EASING.emphasize(0), 0);
assert.equal(TRANSFORM_CAMERA_EASING.emphasize(1), 1);
assert.equal(TRANSFORM_CAMERA_EASING.restore(0), 0);
assert.equal(TRANSFORM_CAMERA_EASING.restore(1), 1);
assert.equal(typeof TRANSFORM_CAMERA_EASING.emphasize, "function");
assert.equal(typeof TRANSFORM_CAMERA_EASING.restore, "function");
const transformationTeardown = Object.create(TransformationManager.prototype);
transformationTeardown.scene = { cameras: {} };
transformationTeardown.savedCameraZoom = 1;
transformationTeardown.transforming = false;
assert.doesNotThrow(
  () => transformationTeardown.cancelPresentation(),
  "장면 종료 중 카메라가 먼저 제거되어도 변신 연출 정리가 실패하면 안 됨"
);
assert.ok(PALETTE.environmentSky.every((hex) => colorLuma(hex) > 0.78));
assert.ok(PALETTE.environmentFar.every((hex) => colorLuma(hex) > 0.82));
for (const hex of PALETTE.environmentMid) {
  const [red, green, blue] = colorChannels(hex);
  assert.ok(green > blue && red / green >= 0.5, `${hex} 환경 중경색에 청록 편향이 있음`);
}
assert.ok(colorLuma(PALETTE.environmentNear[2]) > colorLuma(PALETTE.bgNear[2]));
assert.equal(PARTICLE_EFFECTS.landing.count, 4);
assert.ok(PARTICLE_EFFECTS.magnet.intervalMs >= 32);
assert.ok(PARTICLE_EFFECTS.magnet.lateralOffset > 0);
assert.ok(PARTICLE_EFFECTS.transform.lifespan.max <= 400);
assert.ok(PARTICLE_LIMITS.landing >= PARTICLE_EFFECTS.landing.count * 2);
assert.ok(PARTICLE_LIMITS.magnet > 0);
assert.ok(PARTICLE_LIMITS.transformPerForm >= TRANSFORM_PRESENTATION[FORMS.ALICORN].burstCount * 2);
assert.ok(PARTICLE_LIMITS.pulses > 0);
assert.equal(getCharacterSequenceKey("silsea", "move"), "silsea_run");
assert.equal(getCharacterSequenceKey("potato89", "move"), "potato89_roll");
assert.equal(getCharacterAnimationSpec("silsea", "jump", "unicorn").textureKey, "silsea_unicorn_jump_up");
assert.equal(getCharacterAnimationSpec("potato89", "move", "unicorn").textureKey, "potato89_unicorn_roll");
assert.equal(getCharacterAnimationSpec("silsea", "transform_unicorn", "unicorn").textureKey, "silsea_transform_unicorn");
assert.notEqual(
  getCharacterAnimationSpec("silsea", "jump", "unicorn").key,
  getCharacterAnimationSpec("silsea", "jump").key
);
assert.equal(getCharacterAssetKeys("silsea").length, 19);
assert.equal(getCharacterAssetKeys("potato89").length, 21);
for (const characterId of ["silsea", "potato89"]) {
  for (const sequence of ["idle", "move", "jump", "fall", "land", "hurt", "transform_unicorn", "transform_pegasus", "transform_alicorn", "fly", "victory"]) {
    const spec = getCharacterAnimationSpec(characterId, sequence);
    assert.ok(spec, `${characterId} ${sequence} 애니메이션 명세가 필요함`);
    assert.equal(spec.durationMs, spec.durations.reduce((total, duration) => total + duration, 0));
  }
  assert.ok(getCharacterAnimationSpec(characterId, "transform_unicorn").durations.at(-1) >= 300);
}
assert.deepEqual(getCharacterAnimationSpec("silsea", "land").durations, [80, 120]);
assert.equal(getEnemyAssetKeys("raw_potato").length, 3);
assert.equal(getEnemyAssetKeys("spike_pumpkin").length, 3);
assert.equal(getEnemyAssetKeys("dark_cloud").length, 4);
assert.equal(getEnemyAssetKeys("magpie").length, 5);
assert.equal(getEnemyAssetKeys("potato_king").length, 7);
for (const enemyType of ["raw_potato", "spike_pumpkin", "dark_cloud", "magpie", "potato_king"]) {
  assert.ok(getEnemyAnimationSpec(enemyType, "idle"));
  assert.ok(getEnemyAnimationSpec(enemyType, "defeated"));
}
assert.equal(getEnemyAnimationSpec("dark_cloud", "warning").durationMs, 700);
assert.ok(getEnemyAnimationSpec("potato_king", "defeated").durationMs >= 1000);

assert.equal(stepFlightGauge(10000, 1000, { flying: true }), 9000);
assert.equal(stepFlightGauge(10000, 1000, { flying: true, drainMultiplier: 0.65 }), 9350);
assert.equal(stepFlightGauge(0, 3000, { grounded: true }), 10000);
assert.equal(stepFlightGauge(120, 16, { checkpoint: true }), 10000);
assert.equal(getMagpieStealAmount(99), 9);
assert.equal(getMagpieStealAmount(10000), 100);
assert.equal(getRespawnScoreLoss(10000), 75);
assert.equal(moveTowards(0, 100, 30), 30);
assert.equal(moveTowards(100, 0, 30), 70);
assert.equal(moveTowards(95, 100, 30), 100);
assert.equal(getUpdraftVelocity(120, 420, 1000, 120), 0);
assert.equal(getUpdraftVelocity(0, 420, 1000, 1000), -420);
assert.equal(getUpdraftVelocity(-620, 420, 1000, 120), -620, "상승기류가 더 빠른 기존 상승 속도를 늦추면 안 됨");

assert.equal(assertLevelShape(level01), true);
assert.equal(assertLevelShape(level03), true);
assert.equal(assertLevelShape(level04), true);
assert.equal(assertLevelShape(p1EnvironmentTest), true);
const normalizedLevel01 = normalizeLevelDefinition(level01);
assert.equal(normalizedLevel01.progression.direction, "right");
assert.deepEqual(normalizedLevel01.exit, { x: level01.world.width - 180, enterFrom: "right" });
assert.deepEqual(normalizedLevel01.environment, {});
assert.equal(level01.progression, undefined, "version 1 원본 레벨은 정규화 중 변경되면 안 됨");
assert.equal(hasReachedProgressTrigger(300, 256, normalizedLevel01), true);
assert.equal(hasReachedProgressTrigger(300, 256, p1EnvironmentTest), false);
assert.equal(hasReachedProgressTrigger(240, 256, p1EnvironmentTest), true);
assert.equal(getNormalizedProgress(360, 128, normalizedLevel01), 232);
assert.equal(getNormalizedProgress(3600, 3904, p1EnvironmentTest), 304);
assert.equal(getCameraLookAheadTarget(180, 150), -150);
assert.equal(getCameraLookAheadTarget(-180, 150), 150);
assert.equal(getCameraLookAheadTarget(35, 150), 0);
assert.equal(level04.order, 4);
assert.equal(level04.progression.direction, "left");
assert.ok(level04.player.spawn.x > level04.exit.x);
assert.equal(level04.environment.tsunami.direction, "left");
assert.equal(level04.environment.tsunami.damage, 1);
assert.equal(level04.environment.tsunami.firstWarning, 6);
assert.equal(level04.environment.tsunami.telegraph, 1.5);
assert.deepEqual(level04.environment.tsunami.interval, { min: 9, max: 12 });
assert.equal(level04.environment.tsunami.speedMultiplier, 1.15);
assert.equal(level04.environment.tsunami.duration, 2.5);
assert.equal(level04.environment.tsunami.shelterGrace, 0.25);
assert.equal(level04.environment.tsunami.respawnGrace, 3);
assert.equal(level04.environment.tsunami.flightClearanceY, 270);
assert.equal(level04.environment.tsunami.pauseEnemiesDuringWave, true);
assert.equal(level04.visualTheme, "tsunami-village");
assert.equal(level04.assets.tileset, "village_tileset");
assert.equal(level04.assets.preview, "stage_preview_tsunami");
assert.deepEqual(level04.assets.backgrounds.normal, { far: "bg_tsunami_far", mid: "bg_tsunami_mid", near: "bg_tsunami_near" });
assert.deepEqual(level04.assets.effects, {
  tsunamiWave: "fx_tsunami_wave",
  tsunamiWarning: "fx_tsunami_warning",
  shelterHouseOpen: "shelter_house_open",
  shelterHouseWeathered: "shelter_house_weathered",
  shelterHill: "shelter_hill"
});
assert.equal(level04.assets.bgm.field, "bgm_tsunami");
assert.deepEqual(
  [...new Set(level04.environment.tsunami.shelters.map(({ type }) => type))].sort(),
  ["high", "hill", "house"]
);
assert.equal(isInsideShelter({ x: 7344, y: 520 }, level04.environment.tsunami.shelters), true);
assert.equal(isInsideShelter({ x: 7000, y: 520 }, level04.environment.tsunami.shelters), false);

const progressStorage = new Map();
const testProgress = new ProgressManager({
  getItem: (key) => progressStorage.get(key) ?? null,
  setItem: (key, value) => progressStorage.set(key, value)
});
const playableLevels = [level01, level02, level03, level04];
assert.equal(testProgress.isUnlocked(level01, playableLevels), true);
assert.equal(testProgress.isUnlocked(level02, playableLevels), false);
testProgress.complete(level01.id, 10);
assert.equal(testProgress.isUnlocked(level02, playableLevels), true);
assert.equal(testProgress.isUnlocked(level03, playableLevels), false);

assert.equal(stepBreathRatio(1, 6000, { underwater: true, depleteSeconds: 12 }), 0.5);
assert.equal(stepBreathRatio(0, 1000, { recovering: true, refillSeconds: 2 }), 0.5);
assert.equal(stepBreathRatio(0.4, 6000, { underwater: true, immune: true, depleteSeconds: 12 }), 0.4);
assert.equal(getWaveIntervalMs({ min: 9, max: 12 }, 0), 9000);
assert.equal(getWaveIntervalMs({ min: 9, max: 12 }, 1), 12000);
assert.deepEqual(
  getWaterContact({ x: 800, headY: 321 }, p1EnvironmentTest.environment.waterZones, 8),
  { zone: p1EnvironmentTest.environment.waterZones[0], underwater: true, aboveSurface: false }
);
assert.equal(getWaterContact({ x: 800, headY: 312 }, p1EnvironmentTest.environment.waterZones, 8).aboveSurface, true);
assert.equal(getWaterContact({ x: 800, headY: 316 }, p1EnvironmentTest.environment.waterZones, 8).aboveSurface, false);
assert.equal(isInsideShelter({ x: 3450, y: 520 }, p1EnvironmentTest.environment.tsunami.shelters), true);
assert.equal(isInsideShelter({ x: 3200, y: 520 }, p1EnvironmentTest.environment.tsunami.shelters), false);
const mistZones = level03.environment.mist.zones;
assert.equal(level03.visualTheme, "mist-valley");
assert.equal(level03.assets.tileset, "mist_tileset");
assert.equal(level03.assets.preview, "stage_preview_mist");
assert.deepEqual(level03.assets.backgrounds.normal, { far: "bg_mist_far", mid: "bg_mist_mid", near: "bg_mist_near" });
assert.deepEqual(level03.assets.effects, {
  mistBank: "fx_mist_bank",
  mistClear: "fx_mist_clear",
  mistBeacon: "fx_mist_beacon",
  mistBreeze: "fx_mist_breeze"
});
assert.equal(level03.assets.bgm.field, "bgm_mist");
assert.equal(getMistZoneAt(639, mistZones), null);
assert.equal(getMistZoneAt(640, mistZones).id, "mist_intro");
assert.equal(getMistZoneAt(1664, mistZones).id, "mist_practice");
assert.equal(getMistZoneAt(7168, mistZones), null);
assert.deepEqual(resolveMistProfile(mistZones[0]), { density: 0.26, visibilityRadius: 430 });
const reducedMistProfile = resolveMistProfile(mistZones[0], { reduced: true });
assert.ok(Math.abs(reducedMistProfile.density - 0.143) < 0.0001);
assert.equal(reducedMistProfile.visibilityRadius, 500);
for (const zone of mistZones) {
  const kinds = new Set(level03.environment.mist.guides
    .filter(({ x }) => x >= zone.xStart && x < zone.xEnd)
    .map(({ kind }) => kind));
  assert.deepEqual([...kinds].sort(), ["beacon", "breeze"]);
}

const createEnvironmentDisplayObject = (type, x = 0, y = 0) => ({
  type,
  x,
  y,
  depth: 0,
  active: true,
  setDepth(value) { this.depth = value; return this; },
  setStrokeStyle() { return this; },
  setOrigin() { return this; },
  setAlpha() { return this; },
  setScrollFactor() { return this; },
  setVisible(value) { this.visible = value; return this; },
  setScale() { return this; },
  setAngle() { return this; },
  destroy() { this.active = false; }
});
const createEnvironmentScene = () => ({
  time: { now: 0 },
  registry: { get: () => false },
  add: {
    rectangle: (x, y) => createEnvironmentDisplayObject("Rectangle", x, y),
    ellipse: (x, y) => createEnvironmentDisplayObject("Ellipse", x, y),
    circle: (x, y) => createEnvironmentDisplayObject("Circle", x, y),
    triangle: (x, y) => createEnvironmentDisplayObject("Triangle", x, y),
    text: (x, y) => createEnvironmentDisplayObject("Text", x, y)
  },
  tweens: {
    add: () => ({ restart() {}, pause() {}, stop() {} })
  },
  cameras: { main: { worldView: { left: 1920, right: 3200 } } },
  events: { on() {}, off() {}, emit() {} },
  audioManager: { playSfx() {} },
  updateAccessibleStatus() {}
});
const environmentSceneA = createEnvironmentScene();
const environmentPlayerA = {
  x: 3200,
  y: 520,
  tuning: { maxSpeed: 360 },
  body: { width: 44, center: { y: 500 }, bottom: 550 }
};
let waveDamageCount = 0;
const environmentManagerA = new EnvironmentMechanicsManager(
  environmentSceneA,
  environmentPlayerA,
  p1EnvironmentTest,
  { takeDamage: () => { waveDamageCount += 1; return true; } },
  { form: FORMS.BASE }
);
const updateEnvironment = (manager, scene, now, delta = 0) => {
  scene.time.now = now;
  manager.update(now, delta);
};
updateEnvironment(environmentManagerA, environmentSceneA, 5999);
assert.equal(environmentManagerA.waveState, "idle");
updateEnvironment(environmentManagerA, environmentSceneA, 6000);
assert.equal(environmentManagerA.waveState, "warning");
assert.equal(environmentManagerA.pausesEnemies, false, "파도 예고 중에는 적이 움직여야 함");
const seededNextWaveAt = environmentManagerA.nextWaveAt;
updateEnvironment(environmentManagerA, environmentSceneA, 7499);
assert.equal(environmentManagerA.waveState, "warning");
updateEnvironment(environmentManagerA, environmentSceneA, 7500);
assert.equal(environmentManagerA.waveState, "active");
assert.equal(environmentManagerA.pausesEnemies, true, "파도 통과 중에는 적을 정지해야 함");
updateEnvironment(environmentManagerA, environmentSceneA, 7700, 200);
updateEnvironment(environmentManagerA, environmentSceneA, 7710);
assert.equal(waveDamageCount, 1, "같은 파도는 플레이어에게 한 번만 피해를 줘야 함");
updateEnvironment(environmentManagerA, environmentSceneA, 10000);
assert.equal(environmentManagerA.waveState, "idle");
assert.equal(environmentManagerA.pausesEnemies, false, "파도 종료 뒤에는 적 정지를 해제해야 함");

const environmentSceneB = createEnvironmentScene();
const environmentManagerB = new EnvironmentMechanicsManager(
  environmentSceneB,
  { ...environmentPlayerA, body: { ...environmentPlayerA.body, center: { ...environmentPlayerA.body.center } } },
  p1EnvironmentTest,
  { takeDamage: () => true },
  { form: FORMS.BASE }
);
updateEnvironment(environmentManagerB, environmentSceneB, 6000);
assert.equal(environmentManagerB.nextWaveAt, seededNextWaveAt, "같은 레벨 Seed는 같은 다음 파도 시점을 만들어야 함");
environmentManagerB.player.body.bottom = 260;
assert.equal(environmentManagerB.isPlayerSafe(6000), false, "기본형은 파도보다 높아도 자동 면역이면 안 됨");
environmentManagerB.transformationManager.form = FORMS.PEGASUS;
assert.equal(environmentManagerB.isPlayerSafe(6000), true, "페가수스는 승인 높이 위에서 파도를 피해야 함");
environmentManagerB.transformationManager.form = FORMS.ALICORN;
assert.equal(environmentManagerB.isPlayerSafe(6000), true, "알리콘은 승인 높이 위에서 파도를 피해야 함");
environmentManagerA.destroy();
environmentManagerB.destroy();

const easyEnvironmentLevel = createRuntimeLevel(p1EnvironmentTest, true);
const easyEnvironmentSettings = getDifficultySettings(p1EnvironmentTest, true);
assert.ok(Math.abs(easyEnvironmentLevel.environment.tsunami.firstWarning - 8) < 0.001);
assert.ok(Math.abs(easyEnvironmentLevel.environment.tsunami.telegraph - 2.2) < 0.001);
assert.ok(Math.abs(easyEnvironmentLevel.environment.tsunami.speedMultiplier - 1.05) < 0.001);
assert.ok(Math.abs(easyEnvironmentLevel.environment.tsunami.duration - 3) < 0.001);
assert.ok(Math.abs(easyEnvironmentLevel.environment.tsunami.shelterGrace - 0.4) < 0.001);
assert.ok(Math.abs(easyEnvironmentLevel.environment.tsunami.respawnGrace - 4.5) < 0.001);
assert.ok(Math.abs(easyEnvironmentLevel.environment.breath.depleteSeconds - 17) < 0.001);
assert.ok(Math.abs(easyEnvironmentLevel.environment.breath.refillSeconds - 1.5) < 0.001);
assert.ok(Math.abs(easyEnvironmentLevel.environment.breath.damageInterval - 3.5) < 0.001);
assert.ok(Math.abs(easyEnvironmentLevel.environment.breath.warningRatio - 0.35) < 0.001);
assert.ok(Math.abs(easyEnvironmentLevel.environment.breath.underwaterPhysics.horizontalSpeedMultiplier - 0.8) < 0.001);
assert.ok(Math.abs(easyEnvironmentLevel.environment.breath.underwaterPhysics.strokeVelocity + 240) < 0.001);
assert.ok(Math.abs(easyEnvironmentLevel.environment.breath.underwaterPhysics.strokeCooldown - 0.3) < 0.001);
assert.equal(easyEnvironmentSettings.environment.tsunami.intervalMultiplier, 1.4);
const easyTsunamiLevel = createRuntimeLevel(level04, true);
assert.ok(Math.abs(easyTsunamiLevel.environment.tsunami.firstWarning - 8) < 0.001);
assert.ok(Math.abs(easyTsunamiLevel.environment.tsunami.telegraph - 2.2) < 0.001);
assert.ok(Math.abs(easyTsunamiLevel.environment.tsunami.interval.min - 12.6) < 0.001);
assert.ok(Math.abs(easyTsunamiLevel.environment.tsunami.interval.max - 16.8) < 0.001);
assert.ok(Math.abs(easyTsunamiLevel.environment.tsunami.speedMultiplier - 1.05) < 0.001);
assert.ok(Math.abs(easyTsunamiLevel.environment.tsunami.duration - 3) < 0.001);
assert.ok(Math.abs(easyTsunamiLevel.environment.tsunami.shelterGrace - 0.4) < 0.001);
assert.ok(Math.abs(easyTsunamiLevel.environment.tsunami.respawnGrace - 4.5) < 0.001);
const easyMistLevel = createRuntimeLevel(level03, true);
assert.ok(Math.abs(easyMistLevel.environment.mist.zones[3].density - 0.5084) < 0.0001);
assert.ok(Math.abs(easyMistLevel.environment.mist.zones[3].visibilityRadius - 322) < 0.001);

const bossPhaseShotCounts = Object.values(POTATO_KING_PHASES).map((phase) => (
  phase.volleys.reduce((total, volley) => total + volley.shots.length, 0)
));
assert.deepEqual(bossPhaseShotCounts, [1, 3, 5]);
for (const [phaseNumber, phase] of Object.entries(POTATO_KING_PHASES)) {
  const delays = phase.volleys.map(({ delayMs }) => delayMs);
  assert.deepEqual(delays, [...delays].sort((left, right) => left - right));
  assert.ok(phase.vulnerabilityMs >= Math.max(...delays) + 900, `보스 ${phaseNumber}페이즈 반격 시간이 부족함`);
  assert.equal(getBossPhasePattern("potato_king", Number(phaseNumber)), phase);
}

const score = new ScoreManager();
assert.equal(score.collect("star"), 10);
assert.equal(score.collect("star", 2), 20);
score.score = 10000;
assert.equal(score.steal(), 100);
assert.equal(score.score, 9900);
assert.equal(score.loseOnRespawn(0), 0);
assert.equal(score.score, 9900);

const easySettings = getDifficultySettings(level01, true);
const easyLevel = createRuntimeLevel(level01, true);
assert.equal(easySettings.player.extraHp, 2);
assert.equal(easySettings.player.flightDrainMultiplier, 0.65);
assert.equal(easySettings.boss.telegraphMultiplier, 1.35);
assert.equal(easySettings.pitScoreLoss, 0);
assert.ok(easyLevel.checkpoints.some(({ id }) => id === "cp_easy"));
for (const platform of level01.terrainMechanics.movingPlatforms) {
  const easyPlatform = easyLevel.terrainMechanics.movingPlatforms.find(({ id }) => id === platform.id);
  assert.equal(easyPlatform.speed, platform.speed * 0.72);
  assert.notEqual(easyPlatform, platform, "쉬운 모드 이동 발판은 원본 객체를 변경하면 안 됨");
}
for (const platform of level01.terrainMechanics.crumblePlatforms) {
  const easyPlatform = easyLevel.terrainMechanics.crumblePlatforms.find(({ id }) => id === platform.id);
  assert.equal(easyPlatform.crumbleDelayMs, Math.round(platform.crumbleDelayMs * 1.5));
  assert.notEqual(easyPlatform, platform, "쉬운 모드 무너지는 발판은 원본 객체를 변경하면 안 됨");
}
for (const enemyId of ["e_cloud_storm_01", "e_magpie_storm_01"]) {
  assert.ok(!easyLevel.enemies.some(({ id }) => id === enemyId));
  assert.ok(level01.enemies.some(({ id }) => id === enemyId), "원본 레벨 데이터는 변경되면 안 됨");
}

const stormCloud = level01.enemies.find(({ id }) => id === "e_cloud_storm_01");
const stormMagpie = level01.enemies.find(({ id }) => id === "e_magpie_storm_01");
const cloudAttackStartMs = stormCloud.activationDelayMs + stormCloud.telegraphMs;
const magpieAttackStartMs = stormMagpie.activationDelayMs + stormMagpie.telegraphMs;
assert.ok(magpieAttackStartMs - cloudAttackStartMs >= 400, "폭풍 구간 공격 예고가 충분히 엇갈려야 함");
assert.ok(stormMagpie.triggerX > stormCloud.triggerX, "먹구름을 먼저 소개한 뒤 까치가 진입해야 함");
assert.ok(stormCloud.telegraphMs >= 900, "폭풍 구간 먹구름은 어린이가 반응할 예고 시간을 제공해야 함");
assert.ok(stormMagpie.telegraphMs >= 800, "폭풍 구간 까치는 어린이가 반응할 예고 시간을 제공해야 함");

const stormPit = level01.hazards.find(({ id }) => id === "pit_long");
const stormUpdraft = level01.terrainMechanics.updrafts.find(({ id }) => id === "updraft_combo");
const stormMovingCloud = level01.terrainMechanics.movingPlatforms.find(({ id }) => id === "moving_cloud_combo");
const stormCrumble = level01.terrainMechanics.crumblePlatforms.find(({ id }) => id === "crumble_combo");
assert.ok(stormUpdraft.x <= stormPit.xStart, "상승기류가 긴 구덩이 진입부를 덮어야 함");
assert.ok(stormUpdraft.x + stormUpdraft.width >= stormPit.xEnd, "상승기류가 긴 구덩이 착지부까지 이어져야 함");
assert.ok(stormMovingCloud.width >= 176 && stormMovingCloud.speed <= 70, "이동 발판은 충분한 착지 폭과 예측 가능한 속도를 가져야 함");
assert.ok(stormCrumble.width >= 176 && stormCrumble.crumbleDelayMs >= 950, "붕괴 발판은 착지 후 다음 행동 시간을 보장해야 함");
assert.ok(level01.checkpoints.some(({ id, x }) => id === "cp_storm_landing" && x >= stormPit.xEnd), "긴 구덩이 통과 직후 안전 체크포인트가 필요함");

const healthEvents = [];
const restHealth = new HealthManager(
  { time: { now: 0 }, events: { emit: (event, payload) => healthEvents.push({ event, payload }) } },
  { character: { physics: { maxHp: 3 } } },
  {},
  {},
  {},
  { invulnerable: false },
  { player: { extraHp: 0 } }
);
restHealth.hp = 1;
assert.equal(restHealth.restoreFull(), true);
assert.equal(restHealth.hp, 3);
assert.deepEqual(healthEvents.at(-1), { event: "player:hp-changed", payload: { hp: 3, maxHp: 3 } });
assert.equal(restHealth.restoreFull(), false);

const environmentHealthEvents = [];
let environmentDamageCount = 0;
const environmentPlayer = {
  active: true,
  character: { physics: { maxHp: 3 } },
  setTintFill() {},
  clearTint() {},
  setVelocity() {
    throw new Error("환경 피해는 넉백을 적용하면 안 됨");
  }
};
const environmentScene = {
  time: { now: 0, delayedCall: (delay, callback) => ({ delay, callback }) },
  events: { emit: (event, payload) => environmentHealthEvents.push({ event, payload }) }
};
const environmentHealth = new HealthManager(
  environmentScene,
  environmentPlayer,
  { respawn() {} },
  { loseOnRespawn() {} },
  { recordDamage: () => { environmentDamageCount += 1; } },
  { invulnerable: false },
  { player: { extraHp: 0 } }
);
assert.equal(environmentHealth.takeEnvironmentDamage({ type: "breath" }), true);
assert.equal(environmentHealth.hp, 2);
assert.equal(environmentDamageCount, 1);
assert.equal(environmentPlayer.controlLockedUntil, undefined);
assert.equal(environmentHealth.takeEnvironmentDamage({ type: "breath" }), false, "환경 피해도 피격 무적을 존중해야 함");
assert.equal(environmentHealthEvents.at(-2).payload.environment, true);

const breathListeners = new Map();
const breathDamageTimes = [];
const breathScene = {
  time: { now: 0 },
  events: {
    on(event, handler) { breathListeners.set(event, handler); },
    off(event) { breathListeners.delete(event); },
    emit() {}
  },
  audioManager: { playSfx() {} },
  updateAccessibleStatus() {}
};
const breathPlayer = { x: 800, y: 420, displayHeight: 96, body: { top: 360 } };
const breath = new BreathManager(
  breathScene,
  breathPlayer,
  { waterZones: p1EnvironmentTest.environment.waterZones },
  { takeEnvironmentDamage: () => { breathDamageTimes.push(breathScene.time.now); return true; } },
  { form: FORMS.BASE },
  p1EnvironmentTest.environment.breath
);
breath.update(0, 12000);
assert.equal(breath.getSnapshot().ratio, 0);
breathScene.time.now = 2499;
breath.update(2499, 0);
assert.deepEqual(breathDamageTimes, []);
breathScene.time.now = 2500;
breath.update(2500, 0);
assert.deepEqual(breathDamageTimes, [2500]);
breathPlayer.body.top = 300;
breathScene.time.now = 3500;
breath.update(3500, 1000);
assert.equal(breath.getSnapshot().ratio, 0.5);
breath.restoreFull();
assert.equal(breath.getSnapshot().ratio, 1);
breath.destroy();

assert.equal(sanitizeTesterId(" 어린이 01 "), "어린이-01");
const playtestAnalysis = analyzePlaytestSessions([
  {
    testerId: "child-01",
    levelId: "level-01",
    mode: "normal",
    completed: true,
    durationSeconds: 420,
    events: [{ type: "hit", sectionId: "storm_path" }]
  },
  {
    testerId: "child-02",
    levelId: "level-01",
    mode: "easy",
    completed: true,
    durationSeconds: 360,
    events: [{ type: "fall", sectionId: "storm_path" }]
  },
  {
    testerId: "child-03",
    levelId: "level-01",
    mode: "normal",
    completed: true,
    durationSeconds: 480,
    events: []
  }
], "level-01");
assert.equal(playtestAnalysis.readyForTuning, true);
assert.equal(playtestAnalysis.durationCoverageComplete, true);
assert.equal(playtestAnalysis.durationPass, true);
assert.deepEqual(playtestAnalysis.adjustmentCandidates, [{
  sectionId: "storm_path",
  hits: 1,
  falls: 1,
  stalls: 0,
  affectedTesters: 2,
  needsAdjustment: true
}]);

const playtestListeners = new Map();
const playtestStorage = new Map();
const playtestScene = {
  events: {
    on(event, handler) {
      const handlers = playtestListeners.get(event) ?? [];
      handlers.push(handler);
      playtestListeners.set(event, handlers);
    },
    off(event, handler) {
      playtestListeners.set(event, (playtestListeners.get(event) ?? []).filter((entry) => entry !== handler));
    },
    emit(event, payload) {
      for (const handler of playtestListeners.get(event) ?? []) handler(payload);
    }
  }
};
const playtestPlayer = { x: 128, y: 576 };
const playtestManager = new PlaytestManager(playtestScene, playtestPlayer, {
  enabled: true,
  testerId: "Child 04",
  characterId: "silsea",
  level: level01,
  storage: {
    getItem: (key) => playtestStorage.get(key) ?? null,
    setItem: (key, value) => playtestStorage.set(key, value)
  },
  now: () => 1000
});
playtestManager.update(0, playtestPlayer);
playtestScene.events.emit("player:hit", { hp: 2 });
playtestManager.update(21, playtestPlayer);
playtestScene.events.emit("player:fell");
playtestPlayer.x = 320;
playtestManager.update(22, playtestPlayer);
const playtestBundle = playtestManager.complete({ elapsedSeconds: 420, score: 1234, achieved: ["collect_stars"] });
assert.equal(playtestBundle.currentSession.testerId, "child-04");
assert.equal(playtestBundle.currentSession.schemaVersion, PLAYTEST_SCHEMA_VERSION);
assert.equal(playtestBundle.currentSession.metrics.hits, 1);
assert.equal(playtestBundle.currentSession.metrics.falls, 1);
assert.ok(playtestBundle.currentSession.metrics.stalls >= 1);
assert.equal(playtestBundle.currentSession.completed, true);
assert.equal(playtestBundle.sessions.length, 1);
playtestManager.destroy();
const visualReviewManager = new PlaytestManager(playtestScene, playtestPlayer, {
  enabled: true,
  testerId: "visual-review",
  characterId: "silsea",
  level: level01,
  persistIncomplete: false,
  storage: {
    getItem: (key) => playtestStorage.get(key) ?? null,
    setItem: (key, value) => playtestStorage.set(key, value)
  },
  now: () => 2000
});
visualReviewManager.update(6, playtestPlayer);
visualReviewManager.destroy();
assert.equal(JSON.parse(playtestStorage.get(PLAYTEST_STORAGE_KEY)).length, 1, "visualReview 기록은 실제 테스트 세션에 섞이면 안 됨");

const reverseStorage = new Map();
const reversePlayer = { x: p1EnvironmentTest.player.spawn.x, y: p1EnvironmentTest.player.spawn.y };
const reversePlaytest = new PlaytestManager(playtestScene, reversePlayer, {
  enabled: true,
  testerId: "reverse-test",
  characterId: "silsea",
  level: p1EnvironmentTest,
  storage: {
    getItem: (key) => reverseStorage.get(key) ?? null,
    setItem: (key, value) => reverseStorage.set(key, value)
  },
  now: () => 3000
});
reversePlaytest.update(0, reversePlayer);
reversePlayer.x -= 240;
reversePlaytest.update(1, reversePlayer);
const reverseBundle = reversePlaytest.complete({ elapsedSeconds: 2, score: 0, achieved: [] });
assert.equal(reverseBundle.currentSession.progressionDirection, "left");
assert.equal(reverseBundle.currentSession.metrics.maxProgress, 240);
assert.equal(reverseBundle.currentSession.metrics.maxProgressX, p1EnvironmentTest.player.spawn.x);
reversePlaytest.destroy();

const comboEvents = [];
const comboScore = new ScoreManager({ onComboChanged: (snapshot) => comboEvents.push({ ...snapshot }) });
comboScore.collect("star");
assert.equal(comboEvents.at(-1).combo, 1);
comboScore.update(CORE_RULES.comboWindowMs + 1);
assert.equal(comboEvents.at(-1).combo, 0, "콤보 시간 종료 시 초기화 이벤트가 발생해야 함");

const first = new SeededRandom(8901);
const second = new SeededRandom(8901);
assert.deepEqual(
  Array.from({ length: 12 }, () => first.next()),
  Array.from({ length: 12 }, () => second.next())
);

let created = 0;
const pool = new ObjectPool({
  maxSize: 2,
  create: () => ({ id: ++created }),
  activate: () => {},
  deactivate: () => {},
  destroy: () => {}
});
const pooledA = pool.acquire();
const pooledB = pool.acquire();
assert.ok(pooledA && pooledB);
assert.equal(pool.acquire(), null);
pool.release(pooledA);
assert.equal(pool.acquire(), pooledA);
pool.releaseAll();
assert.equal(pool.entries.length, 2);
for (let index = 0; index < 10000; index += 1) {
  const entry = pool.acquire();
  if (entry) pool.release(entry);
}
assert.deepEqual(pool.getSnapshot(), {
  maxSize: 2,
  size: 2,
  activeCount: 0,
  inactiveCount: 2,
  createdCount: 2,
  acquireCount: 10003,
  releaseCount: 10003,
  rejectedCount: 1,
  peakActiveCount: 2,
  destroyed: false
});
pool.destroy();
assert.equal(pool.getSnapshot().destroyed, true);
assert.equal(pool.getSnapshot().size, 0);
assert.equal(pool.acquire(), null, "폐기된 풀은 새 엔트리를 만들면 안 됨");

const audioListeners = new Map();
const audioPlays = [];
const audioAdds = [];
const registryValues = new Map();
const audioEvents = {
  on(event, handler) {
    const handlers = audioListeners.get(event) ?? [];
    handlers.push(handler);
    audioListeners.set(event, handlers);
  },
  off(event, handler) {
    audioListeners.set(event, (audioListeners.get(event) ?? []).filter((entry) => entry !== handler));
  },
  emit(event, payload) {
    for (const handler of audioListeners.get(event) ?? []) handler(payload);
  }
};
const audioScene = {
  cache: { audio: { exists: (key) => key !== "missing" } },
  events: audioEvents,
  game: { loop: { frame: 12 } },
  time: { now: 1200 },
  registry: {
    get: (key) => registryValues.get(key),
    set: (key, value) => registryValues.set(key, value)
  },
  sound: {
    mute: false,
    play(key, config) {
      audioPlays.push({ key, config });
      return true;
    },
    add(key, config) {
      const sound = {
        key,
        config,
        isPlaying: false,
        destroyed: false,
        play() {
          this.isPlaying = true;
          return true;
        },
        stop() { this.isPlaying = false; },
        destroy() { this.destroyed = true; },
        setVolume(value) { this.volume = value; }
      };
      audioAdds.push(sound);
      return sound;
    }
  }
};
const audio = new AudioManager(audioScene, { random: () => 0.5 });
assert.equal(audio.playSfx("sfx_star"), true);
assert.equal(audio.playSfx("sfx_star"), true);
assert.equal(audio.playSfx("sfx_star"), null, "동일 프레임 세 번째 SFX는 제한되어야 함");
assert.equal(audio.playSfx("missing"), null, "누락 오디오는 무음 fallback이어야 함");
audioEvents.emit("checkpoint:activated", {});
assert.equal(audioPlays.at(-1).key, "sfx_checkpoint");
const bgm = audio.playBgm("bgm_field");
assert.equal(bgm.key, "bgm_field");
const bossBgm = audio.transitionBgm("bgm_boss");
assert.equal(BGM_CROSSFADE_MS, 480);
assert.equal(audio.getSnapshot().currentBgmKey, "bgm_boss");
assert.equal(bgm.destroyed, true, "크로스페이드가 끝나면 이전 BGM을 해제해야 함");
assert.equal(bossBgm.volume, 0.46);
audioEvents.emit("player:form-changed", { form: "alicorn", emphasize: true });
assert.deepEqual(audio.getSnapshot().activeBgmLayers, [ALICORN_LAYER_KEY]);
const alicornLayer = audioAdds.find((sound) => sound.key === ALICORN_LAYER_KEY);
assert.ok(alicornLayer?.isPlaying, "알리콘 진입 시 피버 레이어가 재생되어야 함");
audio.setBgmVolume(0.5);
assert.equal(bossBgm.volume, 0.5);
assert.equal(alicornLayer.volume, 0.26);
audioEvents.emit("player:form-warning", { remaining: 3000 });
assert.deepEqual(audio.getSnapshot().activeBgmLayers, []);
assert.equal(alicornLayer.destroyed, true, "알리콘 종료 예고부터 레이어를 페이드 아웃해야 함");
audio.resetStarSequence();
const starStart = audioPlays.length;
for (let index = 0; index < 7; index += 1) {
  audioScene.game.loop.frame += 1;
  audio.playStar();
}
const starRates = audioPlays.slice(starStart).map((entry) => entry.config.rate);
assert.deepEqual(starRates.slice(0, 6), [...STAR_PITCH_RATES]);
assert.equal(starRates[6], STAR_PITCH_RATES[5], "여섯 번째 이후 별 음정은 최고 단계로 유지해야 함");
audioEvents.emit("score:combo-changed", { combo: 0 });
assert.equal(audio.getSnapshot().starStep, 0);
audioScene.game.loop.frame += 1;
audioEvents.emit("item:collected", { type: "star" });
assert.equal(audioPlays.at(-1).config.rate, STAR_PITCH_RATES[0]);
audio.setMuted(true);
assert.equal(audioScene.sound.mute, true);
assert.equal(audio.playSfx("sfx_jump"), null);
audioEvents.emit("player:form-changed", { form: "alicorn", emphasize: true });
assert.deepEqual(audio.getSnapshot().activeBgmLayers, [], "음소거 중에는 레이어를 새로 재생하지 않아야 함");
audio.setMuted(false);
assert.equal(audioScene.sound.mute, false);
assert.deepEqual(audio.getSnapshot().activeBgmLayers, [ALICORN_LAYER_KEY], "음소거 해제 시 필요한 레이어를 복원해야 함");
audioEvents.emit("player:form-changed", { form: "base", emphasize: false });
assert.deepEqual(audio.getSnapshot().activeBgmLayers, []);
audio.destroy();

for (const profile of Object.values(CAMERA_SHAKE_PROFILES)) {
  assert.ok(profile.duration <= 180);
  assert.ok(profile.intensity <= 0.003);
}
const cameraRegistry = new Map();
const shakeCalls = [];
let shakeReset = 0;
const cameraScene = {
  registry: {
    get: (key) => cameraRegistry.get(key),
    set: (key, value) => cameraRegistry.set(key, value)
  },
  cameras: {
    main: {
      shake: (duration, intensity) => shakeCalls.push({ duration, intensity }),
      shakeEffect: { reset: () => { shakeReset += 1; } }
    }
  }
};
const cameraEffects = new CameraEffectsManager(cameraScene);
assert.equal(cameraEffects.shake("bossLand", { duration: 999, intensity: 1 }), true);
assert.deepEqual(shakeCalls.at(-1), { duration: 180, intensity: 0.003 });
assert.equal(cameraEffects.setEnabled(false), false);
assert.equal(shakeReset, 1);
assert.equal(cameraEffects.shake("bossLand"), false);
assert.equal(shakeCalls.length, 1, "화면 흔들림 Off에서는 camera.shake를 호출하지 않아야 함");
assert.equal(cameraRegistry.get("screenShakeEnabled"), false);
cameraEffects.destroy();

const starCount = level01.items.reduce((total, item) => {
  if (item.type === "star") return total + 1;
  if (item.type === "star_arc") return total + item.count;
  return total;
}, 0);
assert.ok(starCount >= 50, `level-01 별 수 부족: ${starCount}`);
assert.equal(level01.enemies.find((enemy) => enemy.type === "raw_potato")?.x, 1344);
assert.equal(level01.items.find((item) => item.type === "horn")?.x, 1792);
assert.equal(level01.items.find((item) => item.id === "magnet_arc")?.x, 2240);
assert.ok(Math.min(...level01.hazards.filter((hazard) => hazard.type === "pit").map((hazard) => hazard.xStart)) > 4096);
assert.equal(level01.terrainMechanics.movingPlatforms.length, 2);
assert.equal(level01.terrainMechanics.updrafts.length, 2);
assert.equal(level01.terrainMechanics.crumblePlatforms.length, 2);
assert.equal(
  new Set(Object.values(level01.terrainMechanics).flat().map(({ id }) => id)).size,
  6,
  "지형 장치 id는 중복되면 안 됨"
);
const boss = level01.sections.find((section) => section.type === "boss")?.boss;
assert.equal(boss?.hp, 3);
assert.equal(boss?.phases.length, 3);
assert.deepEqual(boss?.phases, Object.values(POTATO_KING_PHASES).map(({ id }) => id));
assert.equal(level01.checkpoints.find(({ id }) => id === "cp5")?.restoresHealth, true);

console.log("Core Mechanics 테스트 통과: Schema v1/v2 정규화, 좌·우 진행 판정, 쓰나미 간격, 수면·숨 계산과 환경 피해, 안개 영역·시야 반경·약하게/쉬운 모드 완화, 역방향 플레이테스트 계측, 실제 캐릭터 23개·적 22개 시트 매핑, 변신·비행·점수·Seed·Object Pool·보스 3단계·오디오 fallback");
