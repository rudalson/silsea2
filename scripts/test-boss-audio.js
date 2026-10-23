import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { BOSS_SFX_KEYS, BOSS_SFX_PROFILES, BOSS_WEAKNESS_SFX_KEYS, getBossStateSfx } from "../src/data/bossAudio.js";
import { playBossStateSfx } from "../src/systems/bosses/bossAudio.js";
import { AudioManager } from "../src/systems/AudioManager.js";
import { MerongKingBehavior } from "../src/systems/bosses/MerongKingBehavior.js";
import { TapeKingBehavior } from "../src/systems/bosses/TapeKingBehavior.js";
import { MusicKingBehavior } from "../src/systems/bosses/MusicKingBehavior.js";
import { HoleKingBehavior } from "../src/systems/bosses/HoleKingBehavior.js";
import { CloudKingBehavior } from "../src/systems/bosses/CloudKingBehavior.js";
import { BOSS_SFX_RECIPES } from "./lib/boss-sfx.js";
import { generateSfx, renderSfxWav } from "./generate-audio.js";

const manifest = JSON.parse(readFileSync("assets/manifest.json", "utf8"));
assert.deepEqual(Object.keys(BOSS_SFX_RECIPES), BOSS_SFX_KEYS);
assert.equal(new Set(BOSS_SFX_KEYS).size, 12);
assert.equal(BOSS_WEAKNESS_SFX_KEYS.length, 5);
assert.throws(() => generateSfx([BOSS_SFX_KEYS[0], "sfx_unknown"]), /알 수 없는 SFX/);
assert.throws(() => renderSfxWav("sfx_unknown"), /알 수 없는 SFX/);
const hashes = new Set();
for (const key of BOSS_SFX_KEYS) {
  const entry = manifest.assets.find(asset => asset.key === key);
  assert.equal(entry?.type, "audio");
  assert.equal(entry.url, `/assets/audio/sfx/${key}.wav`);
  const wav = readFileSync(`.${entry.url}`);
  assert.deepEqual(wav, renderSfxWav(key), `${key}: 배포 WAV와 결정적 생성 결과 일치`);
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.toString("ascii", 8, 12), "WAVE");
  assert.equal(wav.readUInt32LE(4) + 8, wav.length);
  assert.equal(wav.readUInt16LE(20), 1); assert.equal(wav.readUInt16LE(22), 1);
  assert.equal(wav.readUInt32LE(24), 22050); assert.equal(wav.readUInt16LE(34), 16);
  assert.equal(wav.readUInt32LE(40) + 44, wav.length);
  const count = (wav.length - 44) / 2, duration = count / 22050;
  assert.ok(duration >= 0.25 && duration <= 0.61, `${key}: 짧은 단발 효과음`);
  let energy = 0, peak = 0, dc = 0;
  for (let index = 0; index < count; index++) {
    const value = wav.readInt16LE(44 + index * 2) / 32768;
    energy += value * value; dc += value; peak = Math.max(peak, Math.abs(value));
  }
  const rms = Math.sqrt(energy / count);
  assert.ok(rms > 0.06 && rms < 0.3 && peak < 0.75, `${key}: 과도한 음량·무음·클리핑 방지`);
  assert.ok(Math.abs(dc / count) < 0.004, `${key}: DC 편향`);
  assert.equal(wav.readInt16LE(44), 0);
  assert.ok(Math.abs(wav.readInt16LE(wav.length - 2)) < 40, `${key}: 끝단 페이드`);
  hashes.add(createHash("sha256").update(wav).digest("hex"));
  console.log(`${key}: ${duration.toFixed(2)}s, RMS ${rms.toFixed(3)}, peak ${peak.toFixed(3)}`);
}
assert.equal(hashes.size, 12, "서로 다른 12개 파형");
// Refactoring the CLI must not change the existing seeded synthesis.
for (const entry of manifest.assets.filter(asset => asset.type === "audio" && asset.url.endsWith(".wav") && !BOSS_SFX_KEYS.includes(asset.key))) {
  assert.deepEqual(renderSfxWav(entry.key), readFileSync(`.${entry.url}`), `${entry.key}: 기존 효과음 재현`);
}

const plays = [], timers = [], present = new Set(BOSS_SFX_KEYS), registry = new Map();
const scene = {
  events: new EventEmitter(), registry: { get: key => registry.get(key), set: (key, value) => registry.set(key, value) },
  cache: { audio: { exists: key => present.has(key) } }, game: { loop: { frame: 0 } },
  time: { delayedCall(ms, fn) { const timer = { ms, fn, remove() { this.removed = true; } }; timers.push(timer); return timer; } },
  sound: { play(key, config) { plays.push({ key, config }); return true; } }
};
scene.audioManager = new AudioManager(scene);
const audio = scene.audioManager;
audio.currentBgm = { volume: 0.46, setVolume(value) { this.volume = value; } };
const classes = [MerongKingBehavior, TapeKingBehavior, MusicKingBehavior, HoleKingBehavior, CloudKingBehavior];
for (const [index, bossKey] of Object.keys(BOSS_SFX_PROFILES).entries()) {
  const data = { phase: 3 }, behavior = Object.assign(Object.create(classes[index].prototype), {
    scene, state: "dormant", stepIndex: 0, actionIndex: 0,
    boss: { getData: key => data[key], setData: (key, value) => typeof key === "string" ? data[key] = value : Object.assign(data, key) },
    weakness: { setVisible() {} }
  });
  const enter = (state, variant) => {
    if (bossKey === "tape_king") behavior.stepIndex = behavior.pattern.steps.findIndex(step => step.type === variant);
    if (bossKey === "cloud_king") behavior.actionIndex = behavior.pattern.actions.indexOf(variant);
    scene.game.loop.frame++; behavior.enter(state, 1000);
  };
  const attack = BOSS_SFX_PROFILES[bossKey].attack;
  for (const variant of typeof attack === "string" ? [undefined] : Object.keys(attack)) {
    const before = plays.length; enter("attack", variant);
    assert.equal(plays.length, before + 1, `${bossKey} ${variant}: 실제 enter 연결`);
    assert.equal(plays.at(-1).key, getBossStateSfx(bossKey, "attack", variant));
    assert.equal(plays.at(-1).config.rate, 1, "신호 음높이 고정");
  }
  enter("vulnerable"); assert.equal(plays.at(-1).key, BOSS_SFX_PROFILES[bossKey].vulnerable);
  assert.equal(timers.at(-1).ms, 460, "약점 알림은 기존 BGM duck 사용");
  assert.ok(Math.abs(audio.currentBgm.volume - 0.46 * 0.72) < 0.001, "약점 알림 때 실제 배경음 감소");
  const before = plays.length;
  for (const state of ["dormant", "intro", "warning", "between", "returning", "rhythm", "hurt", "recovery", "defeated"]) enter(state);
  assert.equal(plays.length, before, "이동·휴면·경고·정지·피격·처치에 추가 신호 없음");
  if (bossKey === "music_king") {
    behavior.rest = { phase: "success" }; enter("vulnerable");
    assert.equal(plays.length, before, "5초 성공 신호와 약점 알림 중복 방지");
  }
  audio.setMuted(true); enter("attack", typeof attack === "string" ? undefined : Object.keys(attack)[0]);
  assert.equal(plays.length, before, "음소거 중 실제 재생 없음"); audio.setMuted(false);
}
const before = plays.length;
present.clear(); scene.game.loop.frame++;
for (const bossKey of Object.keys(BOSS_SFX_PROFILES)) playBossStateSfx(scene, bossKey, "vulnerable");
assert.equal(plays.length, before, "누락 자산은 무음 fallback");
assert.equal(playBossStateSfx({}, "merong_king", "attack"), null, "오디오 없는 Scene도 진행");
assert.equal(getBossStateSfx("potato_king", "attack"), null);
assert.equal(getBossStateSfx("tape_king", "attack", "unknown"), null);
assert.equal(getBossStateSfx("music_king", "rhythm", "stop"), null);
audio.destroy(); assert.ok(timers.at(-1).removed, "Scene 종료 후 duck 타이머 정리");
console.log("N10 보스 효과음 검사 통과: 12 WAV·기존 74 SFX 재현·실제 상태 진입·고정 피치·약점 duck·정지 신호 보존·무음/누락·종료 정리");
