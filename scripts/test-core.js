import assert from "node:assert/strict";
import level01 from "../src/data/levels/level-01.js";
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
import { ObjectPool } from "../src/systems/ObjectPool.js";
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
import { ScoreManager } from "../src/systems/ScoreManager.js";
import { SeededRandom } from "../src/systems/SeededRandom.js";
import { TRANSFORM_CAMERA_EASING } from "../src/systems/TransformationManager.js";
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
assert.equal(getCharacterAssetKeys("silsea").length, 11);
assert.equal(getCharacterAssetKeys("potato89").length, 12);
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

console.log("Core Mechanics 테스트 통과: 실제 캐릭터 23개·적 22개 시트 매핑과 frame duration, 밝은 환경 팔레트 명도·청록 편향 차단, 변신 시간·100~180ms 연출, 화면 흔들림 상한·Off 차단, 비행 회복, 점수 손실, 쉬운 모드 지형 장치 완화, Seed, Object Pool, 보스 3단계, BGM 크로스페이드·알리콘 레이어, 오디오 6단계 음계·동시 재생 제한·무음 fallback");
