import { BOSS_SFX_KEYS, getBossStateSfx } from "../../src/data/bossAudio.js";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// This audit observes real AI entries and AudioManager playback. It never
// advances the boss state or changes hit rules to make a sound test pass.
export function auditBossAudio(scene, { silent, assert, faults }) {
  const audio = scene.audioManager, behavior = scene.bossController.behavior, key = scene.levelLoader.boss.getData("key");
  const requests = [], played = new Set(), expectedKeys = new Set();
  const originalPlay = audio.playSfx, originalEnter = behavior.enter;
  let entries = 0, insideEntry = false, stopRequests = 0;
  const observedPlay = function (cue, config) {
    const result = originalPlay.call(this, cue, config);
    if (BOSS_SFX_KEYS.includes(cue)) {
      requests.push(cue); if (result) played.add(cue);
      if (!insideEntry) faults.add("보스 상태 진입 밖에서 효과음 중복 요청");
      if (behavior.state === "rhythm" && behavior.rest?.phase === "stop") stopRequests++;
      if (silent ? result !== null : !result) faults.add(`효과음 재생/무음 불일치: ${cue}`);
      if (config?.randomizeRate !== false) faults.add(`효과음 피치 변동: ${cue}`);
    }
    return result;
  };
  const observedEnter = function (state, ...args) {
    const variant = key === "tape_king" ? this.step?.type : this.action;
    const cue = key === "music_king" && state === "vulnerable" && this.rest?.phase === "success"
      ? null : getBossStateSfx(key, state, variant);
    const start = requests.length;
    insideEntry = true;
    try { return originalEnter.call(this, state, ...args); }
    finally {
      insideEntry = false; entries++;
      const actual = requests.slice(start);
      if (JSON.stringify(actual) !== JSON.stringify(cue ? [cue] : [])) faults.add(`${key} ${state}: 효과음 진입 횟수 ${actual}`);
      if (cue) expectedKeys.add(cue);
    }
  };
  audio.playSfx = observedPlay; behavior.enter = observedEnter;
  return {
    get count() { return requests.length; },
    check() {
      assert(entries > 8 && expectedKeys.size >= 2 && faults.size === 0, `${key}: 실제 AI 진입별 효과음 1회 (${requests.length}회·${expectedKeys.size}종)`);
      assert(stopRequests === 0, "5초 정지 중 추가 보스 효과음 없음");
      assert(silent ? played.size === 0 : played.size === expectedKeys.size, silent ? "무음/누락 효과음 재생 0회" : "공격·약점 효과음 실제 재생");
    },
    restore() { if (audio.playSfx === observedPlay) audio.playSfx = originalPlay; if (behavior.enter === observedEnter) behavior.enter = originalEnter; }
  };
}

export async function probeBossAudio(scene, { fallback, assert, until }) {
  const audio = scene.audioManager;
  if (fallback) {
    assert(BOSS_SFX_KEYS.every(key => !audio.has(key)), "12 효과음 누락 fallback");
    return;
  }
  const context = scene.sound.context, analyser = context.createAnalyser();
  scene.sound.masterVolumeNode.connect(analyser);
  const rms = () => {
    const values = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(values);
    return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
  };
  scene.scene.pause(); audio.setBgmVolume(0); audio.setMuted(false);
  try {
    for (const key of BOSS_SFX_KEYS) {
      const decoded = scene.cache.audio.get(key);
      assert(decoded?.duration > 0.25 && decoded.duration < 0.61, `${key}: 실제 WAV 디코딩`);
      await delay(700);
      await until(() => rms() < 0.0001, "효과음 이전 출력 정리");
      assert(audio.playSfx(key, { randomizeRate: false, volume: 0.5 }), `${key}: AudioManager 재생`);
      await until(() => rms() > 0.0002, `${key}: Web Audio 출력`);
      assert(rms() > 0.0002, `${key}: 배경음 없는 실제 출력 신호`);
    }
    audio.setMuted(true); await delay(750);
    assert(rms() < 0.0001 && audio.playSfx(BOSS_SFX_KEYS[0]) === null, "음소거에서 실제 출력·새 재생 없음");
  } finally {
    scene.sound.masterVolumeNode.disconnect(analyser); analyser.disconnect(); scene.scene.resume();
  }
}
