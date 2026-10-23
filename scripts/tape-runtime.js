// /scripts/tape-runtime.html?visualReview=level-08&debug=1&mute=1
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
  button.disabled = true; output.textContent = "테이프 도시 실제 입력·충돌 완주 검사\n";
  const savedProgress = { data: progressManager.data, memory: progressManager.memory, storage: progressManager.storage };
  const storageBefore = localStorage.getItem("silsea:progress:v1"), temporary = new Map();
  progressManager.data = structuredClone(savedProgress.data); progressManager.memory = structuredClone(savedProgress.memory);
  progressManager.storage = { getItem: (key) => temporary.get(key) ?? null, setItem: (key, value) => temporary.set(key, value) };
  const sample = scene.inputManager.sample, controller = { ...neutral }, sections = new Set(), attacks = new Set();
  let falls = 0, maxPatches = 0, guards = 0;
  const onFall = () => falls++;
  const onGuard = () => guards++;
  const monitor = () => {
    sections.add(scene.currentSectionId);
    const behavior = scene.bossController?.behavior;
    if (behavior?.state === "attack") attacks.add(`${scene.levelLoader.boss.getData("phase")}:${behavior.stepIndex}`);
    maxPatches = Math.max(maxPatches, behavior?.patches.length ?? 0);
  };
  scene.events.on(EVENTS.PLAYER_FELL, onFall); scene.events.on("postupdate", monitor);
  scene.events.on(EVENTS.PROJECTILE_GUARDED, onGuard);
  const place = (x, y = 574) => {
    Object.assign(controller, neutral); scene.player.body.reset(x, y); scene.player.setVelocity(0, 0);
    scene.player.controlLockedUntil = 0; scene.player.bufferedJumpUntil = Number.NEGATIVE_INFINITY;
  };
  const onGround = () => scene.player.body.velocity.y >= 0 && (scene.player.body.blocked.down || scene.player.body.touching.down);
  try {
    scene.inputManager.sample = () => controller;
    progressManager.data["level-07"] = { cleared: false, bestScore: 0, achieved: [] };
    assert(!progressManager.isUnlocked(getLevel("level-08"), LEVELS), "7번 클리어 전 8번 잠금");
    progressManager.complete("level-07", 100, []);
    assert(progressManager.isUnlocked(getLevel("level-08"), LEVELS), "7번 클리어로 테이프 도시 해금");
    assert(scene.bossController.behavior.state === "dormant" && !scene.levelLoader.boss.body.enable, "작업장 진입 전 보스 대기");
    assert(!scene.levelLoader.gate, "처치 전 게이트 없음");
    const fallback = scene.registry.get("forceAssetFallback");
    assert(scene.levelLoader.enemies.every(enemy => ["tape_rollbug", "tape_boxling"].includes(enemy.getData("type"))
      && (fallback || enemy.getData("usesArt"))), "감자 대신 테이프 도시 전용 적 원화 연결");
    const expectedSpeed = scene.registry.get("easyMode") ? 0.8 : 0.6;
    place(1600); await until(onGround, "테이프 연습 접지");
    controller.moveX = 1;
    const groundedAt = scene.time.now;
    await until(() => scene.time.now - groundedAt > 300, "감속 실제 이동");
    assert(scene.courseMechanics.horizontalSpeedMultiplier === expectedSpeed && Math.abs(scene.player.body.velocity.x) < 330,
      `지상 테이프 속도 ${expectedSpeed}배`);
    controller.jumpDown = controller.jumpPressed = true; await frames(4); controller.jumpPressed = false;
    assert(scene.player.body.velocity.y < 0 && scene.courseMechanics.horizontalSpeedMultiplier === 1, "점프 상승 즉시 감속 해제");
    place(1600); await until(onGround, "비행 연습 접지");
    scene.transformationManager.setForm("pegasus", false); controller.jumpDown = controller.jumpPressed = true;
    await frames(4); controller.jumpPressed = false;
    assert(scene.courseMechanics.horizontalSpeedMultiplier === 1, "비행 중 테이프 감속 없음");
    scene.transformationManager.cancelPresentation(); scene.transformationManager.setForm("base", false); place(128);
    let previousJump = false;
    const started = scene.time.now;
    scene.inputManager.sample = () => {
      const player = scene.player, grounded = onGround();
      const flying = ["pegasus", "alicorn"].includes(scene.transformationManager.form);
      const pit = scene.level.hazards.some((hazard) => hazard.type === "pit"
        && hazard.xStart - player.body.right < 40 && hazard.xEnd + 48 > player.x && hazard.xEnd > player.body.left);
      const sticky = scene.level.terrainMechanics.stickyZones.some((zone) => zone.x - player.body.right < 48
        && zone.x + zone.width > player.body.left && Math.abs(player.body.bottom - zone.y) < 8);
      const enemy = scene.levelLoader.enemies.some((entry) => entry.active && entry.body.enable
        && entry.x > player.x && entry.x - player.x < 145 && Math.abs(entry.y - player.y) < 60);
      const wantsJump = flying ? player.y > 400 : grounded ? (pit || enemy || sticky) : previousJump && player.body.velocity.y < 0;
      const jump = grounded && previousJump ? false : wantsJump;
      const input = { ...neutral, moveX: 1, moveY: flying && player.y < 320 ? 1 : 0,
        jumpDown: jump, jumpPressed: jump && !previousJump, jumpReleased: !jump && previousJump };
      previousJump = jump; button.textContent = `완주 진행 ${Math.round(player.x)} / 12700`; return input;
    };
    await until(() => scene.player.x >= 12720, "작업장 전까지 완주", 100000);
    scene.inputManager.sample = () => controller; place(12720);
    scene.transformationManager.cancelPresentation(); scene.transformationManager.setForm("base", false);
    assert(sections.size >= 5 && scene.checkpointManager.current.id === "cp_tape_boss", "다섯 필드 구간과 보스 전 회복 지점 통과");
    assert(falls === 0, "점프·비행으로 테이프와 두 낭떠러지 통과");
    log(`ROUTE ${((scene.time.now - started) / 1000).toFixed(1)}초 · 별 ${scene.objectiveManager.context.starCount}`);
    const oldBehavior = scene.bossController.behavior;
    assert(await scene.levelHotReload.reload(), "신규 코스 데이터 재로드");
    assert(!oldBehavior.visual.active && scene.courseMechanics.getSnapshot().transientStickyCount === 0, "재로드 시 공격 표시·감속 소유권 정리");
    for (const enemy of scene.levelLoader.enemies) {
      const type = enemy.getData("type");
      place(enemy.x - 180);
      enemy.body.reset(enemy.getData("spawnX") - enemy.getData("patrol") - 1, 576);
      await frames(2);
      assert(enemy.body.velocity.x > 0 && (fallback || !enemy.flipX), `${type} 오른쪽 순찰·원화 방향`);
      enemy.body.reset(enemy.getData("spawnX") + enemy.getData("patrol") + 1, 576);
      await frames(2);
      assert(enemy.body.velocity.x < 0 && (fallback || enemy.flipX), `${type} 왼쪽 순찰·원화 반전`);
      assert(fallback || enemy.anims.currentAnim?.key === `enemy:${type}:move`, `${type} 보행 애니메이션`);
      scene.healthManager.restoreFull(); scene.healthManager.invulnerableUntil = 0;
      const hpBeforeContact = scene.healthManager.hp;
      place(enemy.x, 574);
      await until(() => scene.healthManager.hp < hpBeforeContact, `${type} 실제 접촉`, 1500);
      assert(scene.healthManager.hp === hpBeforeContact - 1, `${type} 접촉 피해 1`);
      scene.scoreManager.resetCombo();
      const scoreBeforeStomp = scene.scoreManager.score;
      place(enemy.x, enemy.body.top - 1); scene.player.setVelocityY(240);
      await until(() => !enemy.body.enable, `${type} 실제 밟기`, 1500);
      assert(scene.scoreManager.score === scoreBeforeStomp + 40, `${type} 밟기 처치 40점`);
      assert(fallback || enemy.anims.currentAnim?.key === `enemy:${type}:defeated`, `${type} 패배 애니메이션`);
      await until(() => !enemy.active, `${type} 패배 포즈 종료`, 1500);
      assert(scene.scoreManager.score === scoreBeforeStomp + 40, `${type} 처치 중복 점수 없음`);
    }
    scene.healthManager.restoreFull();
    const boss = scene.levelLoader.boss, behavior = scene.bossController.behavior;
    place(boss.x - 880);
    await until(() => behavior.state === "warning", "보스 첫 예고");
    const pausedAt = behavior.elapsedMs;
    scene.scene.pause(); await new Promise((resolve) => setTimeout(resolve, 300));
    assert(behavior.elapsedMs === pausedAt, "일시정지 중 공격 시간 보존"); scene.scene.resume();
    scene.healthManager.grantInvulnerability(1500); place(boss.x, boss.body.top + 12); scene.player.setVelocityY(240);
    await frames(4); assert(boss.getData("hp") === 3, "약점 외 머리 밟기 피해 거부");
    place(boss.x - 320); scene.player.setFlipX(false);
    scene.transformationManager.setForm("pegasus", false); scene.transformationManager.restoreFlight();
    const hpBeforeGuard = scene.healthManager.hp; controller.specialDown = true;
    await until(() => guards > 0, "실제 테이프 조각 날개 방어", 7000);
    assert(scene.healthManager.hp === hpBeforeGuard, "날개로 테이프 조각 방어 시 HP 보존");
    scene.transformationManager.setForm("base", false); place(boss.x - 880);
    const stomp = async () => {
      await until(() => behavior.state === "vulnerable", "테이프가 걸려 약점 열림");
      assert(behavior.shots.length === 0 && behavior.patches.length === 0
        && scene.courseMechanics.getSnapshot().transientStickyCount === 0, "약점 시간의 조각·바닥 감속 정리");
      const hp = boss.getData("hp"); controller.moveX = 1;
      await until(() => scene.player.x >= boss.x - 224, "머리 약점 접근", 4000);
      await until(onGround, "기본 점프 접지", 1000);
      controller.jumpDown = controller.jumpPressed = true; await frames(1); controller.jumpPressed = false;
      await until(() => boss.getData("hp") < hp, "기본 점프 머리 밟기", 2200);
      Object.assign(controller, neutral); await frames(3);
      assert(boss.getData("hp") === hp - 1, `실제 점프 HP ${hp} → ${hp - 1}, 중복 피해 없음`);
    };
    await stomp();
    place(boss.x - 880);
    await until(() => behavior.patches.length > 0, "2단계 실제 바닥 테이프 설치");
    const patch = behavior.patches[0]; place(patch.x + patch.width / 2); await until(onGround, "보스 테이프 접지"); await frames(2);
    assert(scene.courseMechanics.horizontalSpeedMultiplier === expectedSpeed, "보스가 붙인 테이프도 동일 감속");
    controller.jumpDown = controller.jumpPressed = true; await frames(4); controller.jumpPressed = false;
    assert(scene.courseMechanics.horizontalSpeedMultiplier === 1, "보스 바닥 테이프도 점프로 탈출");
    scene.healthManager.handleFall();
    await until(() => !scene.checkpointManager.respawning && scene.player.body.enable, "보스 실패 복귀");
    assert(boss.getData("hp") === 3 && boss.getData("phase") === 1 && behavior.state === "dormant"
      && scene.courseMechanics.getSnapshot().transientStickyCount === 0 && behavior.patches.length === 0, "복귀 시 HP·단계·테이프 감속 초기화");
    place(boss.x - 880);
    for (let phase = 1; phase <= 3; phase++) { await stomp(); if (phase < 3) place(boss.x - 880); }
    assert(attacks.has("2:0") && attacks.has("3:2") && maxPatches === (scene.registry.get("easyMode") ? 1 : 2), "바닥 설치와 3단계 조합·쉬운 모드 수량 실행");
    assert(behavior.shots.length === 0 && behavior.patches.length === 0 && scene.courseMechanics.finished, "처치 후 공격·감속 정리");
    assert(!scene.objectiveManager.areRequiredComplete(), "처치 후 직접 게이트 진입 필요");
    await until(() => scene.levelLoader.gate?.lifecycle?.phase === "active", "실제 게이트 활성");
    place(scene.level.exit.x); await until(() => game.scene.isActive("ClearScene"), "게이트 진입 후 클리어");
    assert(progressManager.get("level-08").cleared && temporary.get("silsea:progress:v1")?.includes("level-08"), "8번 클리어 임시 저장");
    assert(localStorage.getItem("silsea:progress:v1") === storageBefore, "사용자 기존 진행 기록 보존");
    button.textContent = "검증 완료"; log("COMPLETE — 감속·필드 완주·3단계 실제 점프·복귀·재로드·게이트·저장 확인");
  } catch (error) {
    button.textContent = "검증 실패"; log(`FAIL ${error.stack ?? error}`);
    log(`STATE ${JSON.stringify({ x: scene.player.x, y: scene.player.y, hp: scene.levelLoader.boss?.getData("hp"),
      boss: scene.bossController?.behavior?.state, velocity: scene.player.body?.velocity, attacks: [...attacks] })}`);
    scene.scene.resume();
  } finally {
    scene.events.off(EVENTS.PLAYER_FELL, onFall); scene.events.off("postupdate", monitor);
    scene.events.off(EVENTS.PROJECTILE_GUARDED, onGuard);
    scene.inputManager.sample = sample; Object.assign(progressManager, savedProgress);
  }
}

const ready = setInterval(() => {
  const scene = game?.scene?.getScene("GameScene");
  if (!scene?.player?.active) return; clearInterval(ready);
  if (scene.level.id !== "level-08" || !scene.levelHotReload) { output.textContent = "?visualReview=level-08&debug=1&mute=1로 열어 주세요."; return; }
  button.disabled = false; button.textContent = "테이프 도시 검증 실행";
  output.textContent = "실제 완주·보스·진행 검사. 검증 중에는 사용자 저장을 변경하지 않습니다.\n";
  button.addEventListener("click", () => run(scene), { once: true });
}, 100);
