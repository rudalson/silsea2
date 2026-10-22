// /scripts/merong-runtime.html?visualReview=level-07&debug=1&mute=1
// All attacks and stomps run through the real Phaser update/overlap loop.
import { game } from "../src/main.js";
import { EVENTS } from "../src/config/constants.js";
import { getLevel, LEVELS } from "../src/data/levels/index.js";
import { progressManager } from "../src/systems/ProgressManager.js";

const output = document.querySelector("#results"), button = document.querySelector("#run");
const neutral = { moveX: 0, moveY: 0, jumpDown: false, jumpPressed: false, jumpReleased: false, specialDown: false };
const frame = () => new Promise((resolve) => game.events.once("step", resolve));
const frames = async (count) => { for (let index = 0; index < count; index++) await frame(); };
const until = async (check, label, limitMs = 18000) => {
  const start = performance.now();
  while (performance.now() - start < limitMs) { if (check()) return; await frame(); }
  throw new Error(`Timeout: ${label}`);
};
const log = (text) => { output.textContent += text + "\n"; };
const assert = (condition, text) => { if (!condition) throw new Error(text); log(`PASS ${text}`); };

async function run(scene) {
  button.disabled = true;
  output.textContent = "메롱 왕국 실제 입력·충돌 완주 검사\n";
  const savedProgress = { data: progressManager.data, memory: progressManager.memory, storage: progressManager.storage };
  const storageBefore = localStorage.getItem("silsea:progress:v1");
  const temporary = new Map();
  progressManager.data = structuredClone(savedProgress.data);
  progressManager.memory = structuredClone(savedProgress.memory);
  progressManager.storage = { getItem: (key) => temporary.get(key) ?? null, setItem: (key, value) => temporary.set(key, value) };
  const sample = scene.inputManager.sample;
  const controller = { ...neutral };
  const sections = new Set(), attacks = new Set(), trapPhases = new Set();
  let falls = 0;
  const onFall = () => falls++;
  const monitor = () => {
    sections.add(scene.currentSectionId);
    for (const entry of scene.tongueTraps?.entries ?? []) trapPhases.add(entry.phase);
    const behavior = scene.bossController?.behavior;
    if (behavior?.state === "attack") attacks.add(`${scene.levelLoader.boss.getData("phase")}:${behavior.attackIndex}`);
  };
  scene.events.on(EVENTS.PLAYER_FELL, onFall);
  scene.events.on("postupdate", monitor);
  const place = (x, y = 574) => {
    Object.assign(controller, neutral);
    scene.player.body.reset(x, y); scene.player.setVelocity(0, 0);
    scene.player.controlLockedUntil = 0; scene.player.bufferedJumpUntil = Number.NEGATIVE_INFINITY;
  };
  const onGround = () => scene.player.body.velocity.y >= 0
    && (scene.player.body.blocked.down || scene.player.body.touching.down);
  try {
    progressManager.data["level-06"] = { cleared: false, bestScore: 0, achieved: [] };
    assert(!progressManager.isUnlocked(getLevel("level-07"), LEVELS), "6번 클리어 전 7번 잠금");
    progressManager.complete("level-06", 100, []);
    assert(progressManager.isUnlocked(getLevel("level-07"), LEVELS), "6번 클리어로 메롱 왕국 해금");
    assert(scene.bossController.behavior.state === "dormant" && !scene.levelLoader.boss.body.enable, "궁전에 들어가기 전 보스 대기");
    assert(!scene.levelLoader.gate, "보스 처치 전 출구 생성 안 됨");
    let previousJump = false;
    const started = scene.time.now;
    scene.inputManager.sample = () => {
      const player = scene.player, grounded = onGround();
      const flying = ["pegasus", "alicorn"].includes(scene.transformationManager.form);
      const pit = scene.level.hazards.some((hazard) => hazard.type === "pit"
        && hazard.xStart - player.body.right < 40 && hazard.xEnd + 48 > player.x && hazard.xEnd > player.body.left);
      const enemy = scene.levelLoader.enemies.some((entry) => entry.active && entry.body.enable
        && entry.x > player.x && entry.x - player.x < 145 && Math.abs(entry.y - player.y) < 60);
      const waitingForTongue = !flying && scene.tongueTraps.entries.some((entry) => !entry.config.practice
        && entry.config.y > 520 && entry.config.x > player.body.left
        && entry.config.x - player.body.right < 124 && entry.phase !== "rest");
      const wantsJump = flying ? player.y > 400 : grounded ? (pit || enemy) : previousJump && player.body.velocity.y < 0;
      const jump = grounded && previousJump ? false : wantsJump;
      const input = { ...neutral, moveX: waitingForTongue ? 0 : 1, moveY: flying && player.y < 320 ? 1 : 0,
        jumpDown: jump, jumpPressed: jump && !previousJump, jumpReleased: !jump && previousJump };
      previousJump = jump;
      button.textContent = `완주 진행 ${Math.round(player.x)} / 10700`;
      return input;
    };
    await until(() => scene.player.x >= 10688, "궁전 전까지 완주", 100000);
    scene.inputManager.sample = () => controller;
    place(10688);
    scene.transformationManager.cancelPresentation();
    scene.transformationManager.setForm("base");
    assert(sections.size >= 5 && scene.checkpointManager.current.id === "cp_merong_boss", "시작부터 다섯 필드 구간과 보스 전 회복 지점 통과");
    assert(trapPhases.has("warning") && trapPhases.has("attack") && trapPhases.has("rest"), "필드 혀의 예고·공격·휴식 실제 실행");
    assert(falls === 0, "기본 점프와 획득한 비행으로 두 낭떠러지 통과");
    log(`ROUTE ${((scene.time.now - started) / 1000).toFixed(1)}초 · 별 ${scene.objectiveManager.context.starCount}`);
    const oldBehavior = scene.bossController.behavior;
    assert(await scene.levelHotReload.reload(), "신규 코스 데이터 재로드");
    assert(oldBehavior.tongue.visual.active === false, "재로드 시 이전 보스 공격 표시 정리");
    const boss = scene.levelLoader.boss, behavior = scene.bossController.behavior;
    place(boss.x - 760);
    await until(() => behavior.state === "warning", "보스 첫 예고");
    const warningElapsed = behavior.elapsedMs;
    scene.scene.pause();
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert(behavior.elapsedMs === warningElapsed, "일시정지 중 보스 예고 시간 보존");
    scene.scene.resume();
    scene.healthManager.grantInvulnerability(1500);
    place(boss.x, boss.body.top + 12);
    scene.player.setVelocityY(240);
    await frames(4);
    assert(boss.getData("hp") === 3, "예고 중 머리를 밟아도 보스 피해 없음");
    place(boss.x - 760);

    const stomp = async () => {
      await until(() => behavior.state === "vulnerable", "공격 후 약점 열림");
      const hp = boss.getData("hp");
      controller.moveX = 1;
      await until(() => scene.player.x >= boss.x - 224, "약점에 접근", 4000);
      await until(onGround, "점프 전 접지", 1000);
      controller.jumpDown = controller.jumpPressed = true;
      await frames(1); controller.jumpPressed = false;
      await until(() => boss.getData("hp") < hp, "기본 점프 머리 밟기", 2200);
      Object.assign(controller, neutral);
      await frames(3);
      assert(boss.getData("hp") === hp - 1, `실제 점프 유효 타격 HP ${hp} → ${hp - 1}, 중복 감소 없음`);
    };
    await stomp();
    scene.healthManager.handleFall();
    await until(() => !scene.checkpointManager.respawning && scene.player.body.enable, "보스 재도전 복귀");
    assert(boss.getData("hp") === 3 && boss.getData("phase") === 1 && behavior.state === "dormant", "보스 실패 복귀 시 HP·단계·공격 초기화");
    place(boss.x - 760);
    for (let phase = 1; phase <= 3; phase++) {
      await stomp();
      if (phase < 3) place(boss.x - 760);
    }
    assert(attacks.has("2:1") && attacks.has("3:2"), "2단계 높낮이·3단계 세 번 공격 실행");
    assert(!behavior.tongue.active && scene.tongueTraps.finished, "처치 후 보스·필드 혀 공격 정리");
    assert(!scene.objectiveManager.areRequiredComplete(), "처치만으로 클리어되지 않음");
    await until(() => scene.levelLoader.gate?.lifecycle?.phase === "active", "실제 게이트 활성");
    place(scene.level.exit.x);
    await until(() => game.scene.isActive("ClearScene"), "게이트 직접 진입 후 클리어");
    assert(progressManager.get("level-07").cleared && temporary.get("silsea:progress:v1")?.includes("level-07"), "7번 클리어 기록 저장");
    assert(localStorage.getItem("silsea:progress:v1") === storageBefore, "검증용 임시 저장으로 사용자 기존 기록 보존");
    button.textContent = "검증 완료";
    log("COMPLETE — 필드 완주·세 단계 실제 밟기·복귀·재로드·게이트·저장 확인");
  } catch (error) {
    button.textContent = "검증 실패";
    log(`FAIL ${error.stack ?? error}`);
    log(`STATE ${JSON.stringify({ x: scene.player.x, y: scene.player.y, hp: scene.levelLoader.boss?.getData("hp"),
      boss: scene.bossController?.behavior?.state, velocity: scene.player.body?.velocity, attacks: [...attacks] })}`);
    scene.scene.resume();
  } finally {
    scene.events.off(EVENTS.PLAYER_FELL, onFall); scene.events.off("postupdate", monitor);
    scene.inputManager.sample = sample;
    Object.assign(progressManager, savedProgress);
  }
}

const ready = setInterval(() => {
  const scene = game?.scene?.getScene("GameScene");
  if (!scene?.player?.active) return;
  clearInterval(ready);
  if (scene.level.id !== "level-07" || !scene.levelHotReload) {
    output.textContent = "?visualReview=level-07&debug=1&mute=1로 열어 주세요."; return;
  }
  button.disabled = false; button.textContent = "메롱 왕국 검증 실행";
  output.textContent = "완주·보스·기록 검사. 기존 저장은 검증 중에도 변경하지 않습니다.\n";
  button.addEventListener("click", () => run(scene), { once: true });
}, 100);
