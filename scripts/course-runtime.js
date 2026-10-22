// /scripts/course-runtime.html?courseTest=1&debug=1&mute=1
// Tests the actual Phaser loop, collision bodies, respawn, reload and clear flow.
import { game } from "../src/main.js";
import { EVENTS } from "../src/config/constants.js";

const output = document.querySelector("#results");
const button = document.querySelector("#run");
const neutral = { moveX: 0, moveY: 0, jumpDown: false, jumpPressed: false, jumpReleased: false, specialDown: false };
const frame = () => new Promise((resolve) => game.events.once("step", resolve));
const frames = async (count) => { for (let index = 0; index < count; index++) await frame(); };
const until = async (check, label, limitMs = 12000) => {
  const started = performance.now();
  while (performance.now() - started < limitMs) { if (check()) return; await frame(); }
  throw new Error(`Timeout: ${label}`);
};
const log = (message) => { output.textContent += `${message}\n`; };
const assert = (value, message) => { if (!value) throw new Error(message); log(`PASS ${message}`); };

async function run(scene) {
  button.disabled = true;
  output.textContent = "실제 Phaser 물리 검증 중\n";
  const controller = { ...neutral };
  const sample = scene.inputManager.sample;
  const storageBefore = localStorage.getItem("silsea:progress:v1");
  const place = (x, y = 574) => {
    Object.assign(controller, neutral);
    scene.player.body.reset(x, y);
    scene.player.setVelocity(0, 0);
    scene.player.controlLockedUntil = 0;
  };
  scene.inputManager.sample = () => controller;
  try {
    place(240);
    controller.moveX = 0.5;
    await frames(24);
    const normalSpeed = scene.player.body.velocity.x;
    place(600);
    await frames(4);
    controller.moveX = 0.5;
    await frames(24);
    const stickySpeed = scene.player.body.velocity.x;
    const multiplier = scene.level.terrainMechanics.stickyZones[0].speedMultiplier;
    assert(Math.abs(stickySpeed - normalSpeed * multiplier) < 3, `실제 지상 감속 ${normalSpeed.toFixed(0)} → ${stickySpeed.toFixed(0)}`);
    controller.jumpPressed = controller.jumpDown = true;
    await frames(1);
    controller.jumpPressed = false;
    await frames(12);
    assert(scene.courseMechanics.horizontalSpeedMultiplier === 1 && scene.player.body.bottom < 560, "점프로 끈끈이 해제");
    place(1100);
    await frames(4);
    assert(scene.courseMechanics.horizontalSpeedMultiplier === 1, "끈끈이 이탈 후 정상 속도");

    scene.transformationManager.setForm("pegasus");
    scene.transformationManager.flightMs = 5000;
    place(700, 360);
    controller.jumpDown = true;
    await until(() => scene.transformationManager.lastMode === "fly" && scene.player.body.velocity.y < 0,
      "비행 시작", 2000);
    assert(scene.courseMechanics.horizontalSpeedMultiplier === 1, "비행 중 지상 감속 미적용");
    scene.transformationManager.setForm("base");

    place(1776);
    await until(() => scene.courseMechanics.rhythms[0].state.phase === "stop", "첫 정지 신호");
    const hp = scene.healthManager.hp;
    controller.moveX = 1;
    await frames(2);
    assert(scene.courseMechanics.rhythms[0].state.phase === "retry" && scene.healthManager.hp === hp, "정지 위반은 연습 재도전, 중복 피해 없음");
    Object.assign(controller, neutral);
    await until(() => scene.courseMechanics.rhythms[0].state.phase === "stop", "재도전 정지 신호");
    await frames(60);
    assert(scene.courseMechanics.rhythms[0].state.phase === "stop", "5초 전에 성공 처리되지 않음");
    const remainingBeforePause = scene.courseMechanics.rhythms[0].state.elapsedMs;
    scene.scene.pause();
    await new Promise((resolve) => setTimeout(resolve, 350));
    assert(scene.courseMechanics.rhythms[0].state.elapsedMs === remainingBeforePause, "일시정지 중 5초 타이머 보존");
    scene.scene.resume();
    await until(() => scene.courseMechanics.rhythms[0].state.phase === "success", "5초 정지 성공");
    assert(scene.courseMechanics.rhythms[0].label.text.includes("성공"), "정지 성공을 화면 문구로 확인");

    place(3168);
    await frames(6);
    assert(scene.checkpointManager.current.id === "cp_holes", "구멍 앞 안전 체크포인트 활성화");
    const hole = scene.courseMechanics.holes[0];
    place(3520);
    await until(() => hole.phase === "warning", "구멍 예고");
    assert(hole.platform.body.enable, "예고 중에는 충돌 바닥 유지");
    await until(() => hole.phase === "open", "구멍 열림");
    assert(!hole.platform.body.enable && hole.opening.visible, "열림 표시와 실제 충돌 해제 일치");
    await until(() => scene.checkpointManager.respawning, "구멍 추락");
    await until(() => !scene.checkpointManager.respawning, "체크포인트 복귀");
    assert(Math.abs(scene.player.x - 3168) < 3 && scene.courseMechanics.holes.every((entry) => entry.platform.body.enable), "추락 후 안전 복귀·구멍 복구");

    const old = scene.courseMechanics;
    assert(await scene.levelHotReload.reload(), "장치 코스 데이터 재로드");
    assert(old !== scene.courseMechanics && old.created.length === 0 && old.interactions.length === 0,
      "재로드 시 이전 표시·충돌·이벤트 정리");
    const currentMechanics = scene.courseMechanics;
    const currentLoader = scene.levelLoader;
    const invalid = structuredClone(scene.level);
    invalid.terrainMechanics.timedHoles[0].x = 2800;
    let rejected = false;
    try { scene.applyHotReloadLevel({ level: invalid, difficulty: scene.difficulty }); }
    catch { rejected = true; }
    assert(rejected && scene.courseMechanics === currentMechanics && scene.levelLoader === currentLoader,
      "고정 바닥과 겹치는 구멍 재로드 거부·기존 코스 보존");
    const listeners = scene.events.listenerCount(EVENTS.PLAYER_RESPAWNED);
    scene.scene.restart({ levelId: "new-course-test", easyMode: scene.difficulty.enabled });
    await frames(6);
    scene.inputManager.sample = () => controller;
    assert(scene.events.listenerCount(EVENTS.PLAYER_RESPAWNED) === listeners, "재시작 뒤 부활 이벤트 중복 없음");
    assert(scene.courseMechanics.horizontalSpeedMultiplier === 1 && scene.courseMechanics.rhythms[0].state.phase === "waiting", "재시작 후 감속·정지 상태 초기화");
    place(4896);
    await until(() => game.scene.isActive("ClearScene"), "무지개 게이트 클리어");
    assert(localStorage.getItem("silsea:progress:v1") === storageBefore, "개발 코스 클리어는 캠페인 저장을 바꾸지 않음");
    log("COMPLETE — 장치 3종·변신·일시정지·추락·재로드·재시작·게이트 확인");
    button.textContent = "검증 완료";
  } catch (error) {
    log(`FAIL ${error.stack ?? error}`);
    button.textContent = "검증 실패";
    scene.scene.resume();
  } finally {
    scene.inputManager.sample = sample;
  }
}

const ready = setInterval(() => {
  const scene = game?.scene?.getScene("GameScene");
  if (!scene?.player?.active) return;
  clearInterval(ready);
  if (scene.level.id !== "new-course-test") {
    output.textContent = "주소에 ?courseTest=1&debug=1&mute=1을 붙여 주세요.";
    return;
  }
  output.textContent = "장치 3종 실제 물리 검증 · 약 30초\n";
  button.textContent = "런타임 검증 실행";
  button.disabled = false;
  button.addEventListener("click", () => run(scene), { once: true });
}, 100);
