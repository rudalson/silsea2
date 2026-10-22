import { game } from "../src/main.js";
import { EVENTS } from "../src/config/constants.js";
import { getLevel, LEVELS } from "../src/data/levels/index.js";
import { progressManager } from "../src/systems/ProgressManager.js";

const output = document.querySelector("#results"), button = document.querySelector("#run");
const neutral = { moveX: 0, moveY: 0, jumpDown: false, jumpPressed: false, jumpReleased: false, specialDown: false };
const frame = () => new Promise((resolve) => game.events.once("step", resolve));
const frames = async (count) => { for (let index = 0; index < count; index++) await frame(); };
const until = async (check, label, limitMs = 22000) => {
  const start = performance.now();
  while (performance.now() - start < limitMs) { if (check()) return; await frame(); }
  throw new Error(`Timeout: ${label}`);
};
const log = (text) => { output.textContent += text + "\n"; };
const assert = (condition, text) => { if (!condition) throw new Error(text); log(`PASS ${text}`); };

async function run(scene) {
  button.disabled = true; output.textContent = "피아노 나라 실제 입력·충돌 완주 검사\n";
  const savedProgress = { data: progressManager.data, memory: progressManager.memory, storage: progressManager.storage };
  const storageBefore = localStorage.getItem("silsea:progress:v1"), temporary = new Map();
  progressManager.data = structuredClone(savedProgress.data); progressManager.memory = structuredClone(savedProgress.memory);
  progressManager.storage = { getItem: (key) => temporary.get(key) ?? null, setItem: (key, value) => temporary.set(key, value) };
  const sample = scene.inputManager.sample, controller = { ...neutral }, sections = new Set(), attacks = new Set();
  let falls = 0, guards = 0, fieldHits = 0, bossRestHits = 0;
  const onFall = () => falls++, onGuard = () => guards++;
  const onHit = ({ type }) => { if (type === "rhythm") fieldHits++; if (type === "music_rest") bossRestHits++; };
  const monitor = () => {
    sections.add(scene.currentSectionId);
    const behavior = scene.bossController?.behavior;
    if (behavior?.state === "attack") attacks.add(`${scene.levelLoader.boss.getData("phase")}:${behavior.noteIndex}`);
  };
  scene.events.on(EVENTS.PLAYER_FELL, onFall); scene.events.on(EVENTS.PLAYER_HIT, onHit);
  scene.events.on(EVENTS.PROJECTILE_GUARDED, onGuard); scene.events.on("postupdate", monitor);
  const place = (x, y = 574) => {
    Object.assign(controller, neutral); scene.player.body.reset(x, y); scene.player.setVelocity(0, 0);
    scene.player.controlLockedUntil = 0; scene.player.bufferedJumpUntil = Number.NEGATIVE_INFINITY;
  };
  const onGround = () => scene.player.body.velocity.y >= 0 && (scene.player.body.blocked.down || scene.player.body.touching.down);
  try {
    scene.inputManager.sample = () => controller;
    progressManager.data["level-08"] = { cleared: false, bestScore: 0, achieved: [] };
    assert(!progressManager.isUnlocked(getLevel("level-09"), LEVELS), "8번 클리어 전 9번 잠금");
    progressManager.complete("level-08", 100, []); assert(progressManager.isUnlocked(getLevel("level-09"), LEVELS), "8번 클리어로 피아노 나라 해금");
    assert(scene.bossController.behavior.state === "dormant" && !scene.levelLoader.gate, "무대 진입 전 보스 대기·게이트 없음");
    const first = scene.courseMechanics.rhythms[0];
    scene.transformationManager.setForm("pegasus", false); scene.transformationManager.restoreFlight();
    place(first.config.xEnd - 80, 360); controller.moveX = 1; controller.jumpDown = true;
    const flyingAt = scene.time.now; await until(() => scene.time.now - flyingAt >= 600, "공중 정지 문 접근");
    assert(first.state.phase === "waiting" && scene.player.body.right <= first.gate.body.left + 1, "공중에서는 정지 신호 시작 안 됨·닫힌 문 비행 우회 차단");
    scene.transformationManager.setForm("base", false); place(first.config.xStart + 100);
    await until(() => first.state.phase === "stop", "연습 정지 신호");
    const beforePractice = scene.healthManager.hp; controller.moveX = 1;
    await until(() => first.state.phase === "retry", "연습 이동 실패"); Object.assign(controller, neutral);
    assert(scene.healthManager.hp === beforePractice && first.state.failures === 1, "첫 연습 실패는 피해 없이 한 번 재안내");
    await until(() => first.state.phase === "stop", "연습 정지 재시도");
    const elapsed = first.state.elapsedMs; scene.scene.pause(); await new Promise((resolve) => setTimeout(resolve, 300));
    assert(first.state.elapsedMs === elapsed && first.gate.body.enable, "일시정지 중 카운트·닫힌 문 보존"); scene.scene.resume();
    const stopAt = scene.time.now; await until(() => first.state.phase === "success", "연습 5초 완료", 8000);
    assert(scene.time.now - stopAt >= 4900 && !first.gate.body.enable, "5초 정지 뒤 실제 문 열림");
    scene.healthManager.handleFall(); await until(() => !scene.checkpointManager.respawning && scene.player.body.enable, "정지 성공 후 부활");
    assert(first.state.phase === "success" && !first.gate.body.enable, "부활 뒤 완료한 정지 문 보존");
    place(128); falls = 0;
    let previousJump = false, failedMain = false;
    const started = scene.time.now;
    scene.inputManager.sample = () => {
      const player = scene.player, grounded = onGround(), flying = ["pegasus", "alicorn"].includes(scene.transformationManager.form);
      const rest = scene.courseMechanics.rhythms.find((entry) => entry.state.phase !== "success"
        && player.x >= entry.config.xStart - 48 && player.x <= entry.config.xEnd + 24);
      if (rest) {
        if (!rest.config.practice && rest.state.phase === "stop" && !failedMain) {
          failedMain = true; previousJump = false; return { ...neutral, moveX: 1 };
        }
        previousJump = false;
        return { ...neutral, moveX: player.x < rest.config.xStart + 100 ? 1 : 0 };
      }
      const pit = scene.level.hazards.some((hazard) => hazard.type === "pit" && hazard.xStart - player.body.right < 40
        && hazard.xEnd + 48 > player.x && hazard.xEnd > player.body.left);
      const enemy = scene.levelLoader.enemies.some((entry) => entry.active && entry.body.enable
        && entry.x > player.x && entry.x - player.x < 145 && Math.abs(entry.y - player.y) < 60);
      const wantsJump = flying ? player.y > 400 : grounded ? (pit || enemy) : previousJump && player.body.velocity.y < 0;
      const jump = grounded && previousJump ? false : wantsJump;
      const input = { ...neutral, moveX: 1, moveY: flying && player.y < 320 ? 1 : 0,
        jumpDown: jump, jumpPressed: jump && !previousJump, jumpReleased: !jump && previousJump };
      previousJump = jump; button.textContent = `완주 진행 ${Math.round(player.x)} / 14700`; return input;
    };
    await until(() => scene.player.x >= 14768, "무대 전까지 실제 완주", 130000);
    scene.inputManager.sample = () => controller; place(14768);
    scene.transformationManager.cancelPresentation(); scene.transformationManager.setForm("base", false);
    assert(sections.size >= 5 && scene.checkpointManager.current.id === "cp_music_boss", "다섯 필드 구간·회복 지점 통과");
    assert(falls === 0 && fieldHits === 1, "두 낭떠러지 무추락·본 구간 정지 위반 피해 1회");
    assert(scene.courseMechanics.rhythms.every(({ state, gate }) => state.phase === "success" && !gate.body.enable), "세 정지 문 모두 성공·충돌 해제");
    log(`ROUTE ${((scene.time.now - started) / 1000).toFixed(1)}초 · 별 ${scene.objectiveManager.context.starCount}`);
    const oldBehavior = scene.bossController.behavior;
    assert(await scene.levelHotReload.reload(), "레벨 데이터 재로드");
    assert(!oldBehavior.visual.active && scene.courseMechanics.rhythms.every(({ state, gate }) => state.phase === "success" && !gate.body.enable), "재로드 시 이전 공격 정리·완료 문 보존");
    const boss = scene.levelLoader.boss, behavior = scene.bossController.behavior;
    place(boss.x - 832); await until(() => behavior.state === "warning", "음표 예고");
    scene.healthManager.grantInvulnerability(1500); place(boss.x, boss.body.top + 12); scene.player.setVelocityY(240);
    await frames(4); assert(boss.getData("hp") === 3, "약점 외 머리 타격 거부");
    place(boss.x - 320); scene.player.setFlipX(false); scene.transformationManager.setForm("pegasus", false);
    scene.transformationManager.restoreFlight(); const hpBeforeGuard = scene.healthManager.hp; controller.specialDown = true;
    await until(() => guards > 0, "실제 음표 날개 방어", 7000);
    assert(scene.healthManager.hp === hpBeforeGuard, "날개 음표 방어 시 HP 보존");
    scene.transformationManager.setForm("base", false); place(boss.x - 832);
    const stomp = async () => {
      await until(() => behavior.state === "vulnerable", "연주·정지 성공 후 약점", 28000);
      assert(behavior.notes.length === 0, "약점 시간에 남은 공격 음표 없음");
      const hp = boss.getData("hp"); controller.moveX = 1;
      await until(() => scene.player.x >= boss.x - 224, "머리 접근", 4000); await until(onGround, "점프 접지", 1000);
      controller.jumpDown = controller.jumpPressed = true; await frames(1); controller.jumpPressed = false;
      await until(() => boss.getData("hp") < hp, "기본 점프 머리 밟기", 2200); Object.assign(controller, neutral); await frames(3);
      assert(boss.getData("hp") === hp - 1, `실제 점프 HP ${hp} → ${hp - 1}, 중복 감소 없음`);
    };
    await stomp(); place(boss.x - 832);
    await until(() => behavior.state === "rhythm" && behavior.rest.phase === "stop", "보스 5초 정지 시작");
    assert(behavior.notes.length === 0, "보스 정지 중 공격 음표 정리");
    controller.moveX = 1; await until(() => behavior.rest?.phase === "retry", "보스 정지 위반"); Object.assign(controller, neutral);
    assert(bossRestHits === 1 && boss.getData("hp") === 2, "보스 정지 위반은 HP 피해 1회·약점 거부");
    await until(() => behavior.rest?.phase === "stop", "보스 정지 재시도");
    const pausedRest = behavior.rest.elapsedMs; scene.scene.pause(); await new Promise((resolve) => setTimeout(resolve, 300));
    assert(behavior.rest.elapsedMs === pausedRest && behavior.notes.length === 0, "보스 정지 중 일시정지 보존"); scene.scene.resume();
    scene.healthManager.handleFall(); await until(() => !scene.checkpointManager.respawning && scene.player.body.enable, "보스 중 복귀");
    assert(boss.getData("hp") === 3 && boss.getData("phase") === 1 && behavior.state === "dormant" && !behavior.rest, "복귀 시 보스 HP·단계·정지 초기화");
    place(boss.x - 832);
    for (let phase = 1; phase <= 3; phase++) { await stomp(); if (phase < 3) place(boss.x - 832); }
    assert(attacks.has("3:2") && behavior.defeated && behavior.notes.length === 0 && scene.courseMechanics.finished, "3단계 높낮이 음표·5초 정지·처치 정리");
    assert(!scene.objectiveManager.areRequiredComplete(), "보스 처치 후 실제 게이트 진입 필요");
    await until(() => scene.levelLoader.gate?.lifecycle?.phase === "active", "게이트 활성");
    place(scene.level.exit.x); await until(() => game.scene.isActive("ClearScene"), "게이트 진입 후 클리어");
    assert(progressManager.get("level-09").cleared && temporary.get("silsea:progress:v1")?.includes("level-09"), "9번 클리어 임시 저장");
    assert(localStorage.getItem("silsea:progress:v1") === storageBefore, "사용자 기존 진행 기록 보존");
    button.textContent = "검증 완료"; log("COMPLETE — 정지 문·실패·5초·완주·세 단계·복귀·재로드·게이트·저장 확인");
  } catch (error) {
    button.textContent = "검증 실패"; log(`FAIL ${error.stack ?? error}`);
    log(`STATE ${JSON.stringify({ x: scene.player.x, y: scene.player.y, hp: scene.levelLoader.boss?.getData("hp"), boss: scene.bossController?.behavior?.state,
      rest: scene.bossController?.behavior?.rest, gates: scene.courseMechanics?.getSnapshot().rhythms, velocity: scene.player.body?.velocity, attacks: [...attacks] })}`);
    scene.scene.resume();
  } finally {
    scene.events.off(EVENTS.PLAYER_FELL, onFall); scene.events.off(EVENTS.PLAYER_HIT, onHit);
    scene.events.off(EVENTS.PROJECTILE_GUARDED, onGuard); scene.events.off("postupdate", monitor);
    scene.inputManager.sample = sample; Object.assign(progressManager, savedProgress);
  }
}
const ready = setInterval(() => {
  const scene = game?.scene?.getScene("GameScene"); if (!scene?.player?.active) return; clearInterval(ready);
  if (scene.level.id !== "level-09" || !scene.levelHotReload) { output.textContent = "?visualReview=level-09&debug=1&mute=1로 열어 주세요."; return; }
  button.disabled = false; button.textContent = "피아노 나라 검증 실행";
  output.textContent = "정지 문·실제 완주·대왕·진행 검사. 사용자 저장은 변경하지 않습니다.\n";
  button.addEventListener("click", () => run(scene), { once: true });
}, 100);
