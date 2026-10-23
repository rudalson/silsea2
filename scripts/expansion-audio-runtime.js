import { game } from "../src/main.js";
import { SCENE_KEYS } from "../src/config/constants.js";
import { LEVELS } from "../src/data/levels/index.js";
import { EXPANSION_BGM } from "../src/data/expansionAudio.js";

const levels = LEVELS.filter(level => Object.hasOwn(EXPANSION_BGM, level.id));
const output = document.querySelector("#results"), status = document.querySelector("#run-status"), button = document.querySelector("#run");
const frame = () => new Promise(resolve => game.events.once("step", resolve));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const until = async (check, label, timeout = 30000, clock = () => performance.now()) => {
  const start = clock(), wallStart = performance.now();
  while (clock() - start < timeout && performance.now() - wallStart < 90000) { if (check()) return; await frame(); }
  throw Error(`Timeout: ${label}`);
};
const log = message => { output.textContent += `${message}\n`; output.scrollTop = output.scrollHeight; };
const assert = (condition, message) => { if (!condition) throw Error(message); log(`PASS ${message}`); };
const storageBefore = localStorage.getItem("silsea:progress:v1");
for (const level of levels) {
  const row = document.createElement("tr"), label = document.createElement("th"); label.textContent = `${level.order}. ${level.name}`; row.append(label);
  for (const key of Object.values(EXPANSION_BGM[level.id])) {
    const cell = document.createElement("td"), player = document.createElement("audio");
    player.controls = true; player.preload = "metadata"; player.src = `../assets/audio/bgm/${key}.ogg`; player.setAttribute("aria-label", `${level.name} ${key.endsWith("_boss") ? "보스" : "필드"} 음악`);
    player.addEventListener("play", () => { game.sound.mute = true; for (const other of document.querySelectorAll("audio")) if (other !== player) other.pause(); });
    cell.append(player); row.append(cell);
  }
  document.querySelector("#tracks").append(row);
}

async function run() {
  button.disabled = true; output.textContent = ""; status.textContent = "실제 GameScene 오디오 검증 중…";
  for (const player of document.querySelectorAll("audio")) player.pause();
  const saved = { muted: game.registry.get("audioMuted"), volume: game.registry.get("bgmVolume"), section: game.registry.get("visualReviewSectionId") };
  const fallback = game.registry.get("forceAssetFallback");
  let scene, analyser;
  try {
    if (!fallback) {
      await game.sound.context.resume();
      assert(game.sound.context.state === "running", "사용자 클릭 후 Web Audio 실행");
      analyser = game.sound.context.createAnalyser(); game.sound.masterVolumeNode.connect(analyser);
    }
    const signalRms = () => {
      const data = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(data);
      return Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / data.length);
    };
    for (const level of levels) {
      status.textContent = `${level.order}/10 ${level.name} — 음악 전환 검사`;
      if (!game.scene.isActive(SCENE_KEYS.GAME) || game.scene.getScene(SCENE_KEYS.GAME).level.id !== level.id) {
        const previousAudio = scene?.audioManager, previousTrack = previousAudio?.currentBgm;
        game.scene.stop(SCENE_KEYS.CLEAR); game.scene.stop(SCENE_KEYS.GAME);
        game.registry.set("levelId", level.id); game.registry.set("visualReviewSectionId", null);
        game.scene.start(SCENE_KEYS.PRELOAD, { levelId: level.id });
        await until(() => game.scene.isActive(SCENE_KEYS.GAME) && game.scene.getScene(SCENE_KEYS.GAME).level?.id === level.id && game.scene.getScene(SCENE_KEYS.GAME).player?.active, "레벨 로드");
        if (previousAudio) assert(previousAudio.scene === null && (!previousTrack || !previousTrack.isPlaying), "Scene 전환 때 이전 오디오 정리");
      }
      scene = game.scene.getScene(SCENE_KEYS.GAME);
      const audio = scene.audioManager, { field, boss } = EXPANSION_BGM[level.id];
      audio.setMuted(false); audio.setBgmVolume(0.23);
      const place = x => { scene.player.body.reset(x, 574); scene.player.setVelocity(0, 0); };
      place(level.player.spawn.x);
      await until(() => scene.currentSectionId === level.sections[0].id, "필드 진입");
      if (fallback) assert(!audio.has(field) && !audio.currentBgm, `${level.name}: 누락 음악 무음 진행`);
      else {
        assert(audio.currentBgmKey === field && audio.currentBgm.isPlaying, `${level.name}: 필드곡 재생`);
        for (const key of [field, boss]) assert(scene.cache.audio.get(key)?.duration > 28, `${key}: 실제 OGG 디코딩`);
        await until(() => signalRms() > 0.0001, "실제 오디오 출력 시작");
        assert(signalRms() > 0.0001, "실제 오디오 출력 신호 존재");
        const playing = audio.currentBgm;
        scene.scene.pause(); audio.setBgmVolume(0.17); await delay(150);
        assert(audio.currentBgm === playing && Math.abs(playing.volume - 0.17) < 0.001, "일시정지 중 볼륨 적용·중복 재생 없음"); scene.scene.resume();
        assert(audio.playSfx("sfx_rhythm_stop", { randomizeRate: false }), "정지 신호 재생");
        // Scene timers use capped frame delta; hidden tabs advance that clock
        // slower than wall time. Keep a separate 90-second safety limit.
        const sceneClock = () => scene.elapsed * 1000;
        await until(() => playing.volume < 0.17 * 0.85, "정지 신호 배경음 낮춤", 3000, sceneClock);
        assert(playing.volume < 0.17, "정지 신호 때 배경음 완만하게 낮춤");
        await until(() => Math.abs(playing.volume - 0.17) < 0.0015, "신호 뒤 배경음 복원", 3000, sceneClock);
        assert(Math.abs(playing.volume - 0.17) < 0.002, "신호 뒤 배경음 복원");
        audio.setBgmVolume(0.23);
      }
      const fieldSound = audio.currentBgm;
      place(level.sections.at(-1).xStart + 128);
      await until(() => scene.currentSectionId === level.sections.at(-1).id, "보스방 진입");
      if (!fallback) {
        await until(() => audio.currentBgmKey === boss && audio.fadingBgm.size === 0, "보스곡 크로스페이드 완료");
        assert(audio.currentBgmKey === boss && audio.currentBgm.isPlaying && !fieldSound.isPlaying && audio.fadingBgm.size === 0, "보스방 자동 편곡 전환·이전 곡 정리");
        audio.setMuted(true); await until(() => signalRms() < 0.00001, "음소거 출력 정지");
        assert(game.sound.mute && signalRms() < 0.00001, "음소거 때 실제 출력 무음");
        place(level.player.spawn.x); await until(() => scene.currentSectionId === level.sections[0].id, "음소거 중 필드 복귀");
        assert(audio.desiredBgm?.key === field && !audio.currentBgm, "음소거 중 곡 변경 기억");
        audio.setMuted(false); await until(() => audio.currentBgmKey === field && audio.currentBgm?.isPlaying, "음소거 해제 필드곡");
        assert(audio.currentBgmKey === field && audio.currentBgm.isPlaying, "음소거 해제 때 현재 필드곡 복원");
      }
      if (fallback) { place(level.player.spawn.x); await until(() => scene.currentSectionId === level.sections[0].id, "무음 필드 복귀"); }
      const oldTrack = audio.currentBgm;
      assert(await scene.levelHotReload.reload(), "현재 레벨 재로드");
      await until(() => scene.currentSectionId === level.sections[0].id, "재로드 뒤 필드 구간");
      assert(scene.audioManager === audio && (fallback ? !audio.currentBgm : audio.currentBgmKey === field && audio.currentBgm === oldTrack && oldTrack.isPlaying), "재로드 때 현재 곡을 중복 없이 유지");
      log(`DONE ${level.name}`);
    }
    assert(localStorage.getItem("silsea:progress:v1") === storageBefore, "사용자 진행 저장 보존");
    status.textContent = `검증 완료 — 5코스 ${fallback ? "무음 fallback" : "10곡 디코딩·재생·전환·볼륨·정지 신호·음소거"}·재로드`;
    button.textContent = "검증 완료"; log("COMPLETE");
  } catch (error) {
    scene?.scene.resume(); status.textContent = "검증 실패"; log(`FAIL ${error.stack ?? error}`);
    log(`STATE ${JSON.stringify({ level: scene?.level?.id, audio: scene?.audioManager?.getSnapshot(), desired: scene?.audioManager?.desiredBgm,
      volume: scene?.audioManager?.currentBgm?.volume, timerRemaining: scene?.audioManager?.bgmDuckTimer?.getRemaining(), clockPaused: scene?.time?.paused })}`);
  } finally {
    if (analyser) { game.sound.masterVolumeNode.disconnect(analyser); analyser.disconnect(); }
    const audio = scene?.audioManager; audio?.setBgmVolume(saved.volume); audio?.setMuted(saved.muted);
    game.registry.set("visualReviewSectionId", saved.section);
  }
}
const ready = setInterval(() => {
  const scene = game?.scene?.getScene(SCENE_KEYS.GAME); if (!scene?.player?.active) return; clearInterval(ready);
  if (!scene.levelHotReload) { status.textContent = "?visualReview=level-07&debug=1&mute=1로 실행해 주세요."; return; }
  button.disabled = false; button.textContent = "오디오 검증 실행 (작게 재생)"; status.textContent = "진행 저장을 바꾸지 않고 5코스를 검사합니다.";
  button.addEventListener("click", run, { once: true });
}, 100);
