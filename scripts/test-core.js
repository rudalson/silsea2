import assert from "node:assert/strict";
import level01 from "../src/data/levels/level-01.js";
import {
  CORE_RULES,
  FORMS,
  TRANSFORM_PRESENTATION,
  getMagpieStealAmount,
  getRespawnScoreLoss,
  stepFlightGauge
} from "../src/data/gameplay.js";
import { ObjectPool } from "../src/systems/ObjectPool.js";
import { AudioManager, STAR_PITCH_RATES } from "../src/systems/AudioManager.js";
import { CAMERA_SHAKE_PROFILES, CameraEffectsManager } from "../src/systems/CameraEffectsManager.js";
import { ScoreManager } from "../src/systems/ScoreManager.js";
import { SeededRandom } from "../src/systems/SeededRandom.js";
import { moveTowards } from "../src/utils/math.js";

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

assert.equal(stepFlightGauge(10000, 1000, { flying: true }), 9000);
assert.equal(stepFlightGauge(0, 3000, { grounded: true }), 10000);
assert.equal(stepFlightGauge(120, 16, { checkpoint: true }), 10000);
assert.equal(getMagpieStealAmount(99), 9);
assert.equal(getMagpieStealAmount(10000), 100);
assert.equal(getRespawnScoreLoss(10000), 75);
assert.equal(moveTowards(0, 100, 30), 30);
assert.equal(moveTowards(100, 0, 30), 70);
assert.equal(moveTowards(95, 100, 30), 100);

const score = new ScoreManager();
assert.equal(score.collect("star"), 10);
assert.equal(score.collect("star", 2), 20);
score.score = 10000;
assert.equal(score.steal(), 100);
assert.equal(score.score, 9900);

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
assert.equal(pool.entries.length, 2);
for (let index = 0; index < 10000; index += 1) {
  const entry = pool.acquire();
  if (entry) pool.release(entry);
}
assert.equal(pool.entries.length, 2);
pool.destroy();

const audioListeners = new Map();
const audioPlays = [];
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
      return {
        key,
        config,
        isPlaying: false,
        play() {
          this.isPlaying = true;
          return true;
        },
        stop() { this.isPlaying = false; },
        destroy() {},
        setVolume(value) { this.volume = value; }
      };
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
audio.setMuted(false);
assert.equal(audioScene.sound.mute, false);
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
const boss = level01.sections.find((section) => section.type === "boss")?.boss;
assert.equal(boss?.hp, 3);
assert.equal(boss?.phases.length, 3);

console.log("Core Mechanics 테스트 통과: 변신 시간·100~180ms 연출, 화면 흔들림 상한·Off 차단, 비행 회복, 점수 손실, Seed, Object Pool, 보스 3단계, 오디오 6단계 음계·동시 재생 제한·무음 fallback");
