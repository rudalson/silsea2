import { EVENTS } from "../../src/config/constants.js";
import { MERONG_IMP_RULES as RULES } from "../../src/data/merongImpAttack.js";

export async function verifyMerongImpAttack(scene, { assert, frames, until, place, controller: input }) {
  const manager = scene.enemyManager.merongImpController, enemy = scene.levelLoader.enemies[0];
  const entry = manager.entries.get(enemy), fallback = !enemy.getData("usesArt");
  let hits = 0, guards = 0, jumpObserver;
  const hit = ({ type }) => { if (type === "merong_prank") hits++; };
  const impact = scene.transformationManager.registerGuardImpact;
  scene.events.on(EVENTS.PLAYER_HIT, hit);
  scene.transformationManager.registerGuardImpact = function (...args) { guards++; return impact.apply(this, args); };
  const prepare = async (direction, distance = 210) => {
    scene.transformationManager.cancelPresentation(); scene.transformationManager.setForm("base", false);
    scene.healthManager.restoreFull(); scene.healthManager.invulnerableUntil = 0;
    manager.cancel(enemy); manager.setPaused(true);
    enemy.body.reset(enemy.getData("spawnX"), enemy.getData("spawnY"));
    place(enemy.x + direction * distance); await frames(45);
    manager.setPaused(false); enemy.setData("attackReadyAt", 0);
    await until(() => enemy.getData("state") === "telegraph", "꼬마 볼 부풀리기");
  };
  try {
    for (const direction of [-1, 1]) {
      await prepare(direction);
      assert(fallback || enemy.anims.currentAnim.key === "enemy:merong_imp:warning", "꼬마 볼 부풀리기 원화 적용");
      assert(enemy.flipX === (direction < 0) && entry.visual.commandBuffer.length === 0, "주인공 방향 준비·범위 표시 없음");
      const plan = structuredClone(entry.plan), count = hits;
      place(enemy.x - direction * 210); await frames(5);
      assert(entry.plan.direction === direction && enemy.flipX === (direction < 0), "꼬마 준비 후 공격 방향 고정");
      const elapsed = entry.elapsedMs;
      scene.scene.pause(); await new Promise(resolve => setTimeout(resolve, 150));
      assert(entry.elapsedMs === elapsed, "정지 중 풍선 준비 시간 보존"); scene.scene.resume();
      await until(() => enemy.getData("state") === "attack" && entry.elapsedMs > 200, "실제 풍선 발사");
      assert(hits === count && (fallback || enemy.anims.currentAnim.key === "enemy:merong_imp:attack"), "반대편은 안전·풍선 불기 원화 적용");
      place(plan.x + direction * plan.travel * 0.65);
      await until(() => hits === count + 1, "몸통과 떨어진 풍선 실제 피해", 2000);
      assert(entry.plan === null && enemy.getData("state") === "recover", "한 번 맞으면 풍선·혀 정리 및 회복 표정");
      await frames(18); assert(hits === count + 1, "풍선 한 발의 중복 피해 없음");
    }
    await prepare(1, 420);
    const pop = entry.plan.popX, reach = entry.plan.reach, beforeTongue = hits;
    place(pop + reach * 0.78);
    await until(() => hits === beforeTongue + 1, "풍선이 닿지 않는 곳에서 터진 혀 피해", 4000);
    assert(hits === beforeTongue + 1, "터지는 혀 실제 충돌 확인");

    await prepare(-1);
    scene.transformationManager.setForm("pegasus", false); scene.transformationManager.restoreFlight();
    scene.transformationManager.guardCooldownUntil = 0; scene.transformationManager.guardMustRelease = false;
    scene.player.setFlipX(false); input.specialDown = true;
    const beforeGuard = hits;
    await until(() => guards > 0, "날개 방어 입력으로 풍선 차단", 4000);
    assert(hits === beforeGuard && entry.plan === null, "날개 방어 시 풍선·터지는 혀 모두 차단");
    input.specialDown = false;

    await prepare(-1);
    const beforeJump = hits;
    // Jump as the balloon approaches. Jumping at launch lands in its second hop;
    // easy mode has a slower balloon, so the reaction happens later as well.
    await until(() => enemy.getData("state") === "attack" && entry.elapsedMs >= (manager.easy ? 650 : 330), "가까워진 풍선을 보고 점프할 타이밍");
    const jumpTrace = [];
    jumpObserver = () => { if (jumpTrace.length < 100) jumpTrace.push({ ms: Math.round(entry.elapsedMs), y: Math.round(scene.player.y),
      vy: Math.round(scene.player.body.velocity.y), grounded: scene.player.body.blocked.down, pressed: input.jumpPressed, hits }); };
    scene.events.on("postupdate", jumpObserver);
    input.jumpDown = input.jumpPressed = true;
    await frames(1); input.jumpPressed = false;
    await until(() => enemy.getData("state") === "recover", "기본 점프로 풍선 회피", 3000);
    scene.events.off("postupdate", jumpObserver);
    input.jumpDown = false; input.jumpReleased = true; await frames(1); input.jumpReleased = false;
    assert(hits === beforeJump, `실제 점프 입력으로 풍선과 뒤따르는 혀 회피${hits !== beforeJump ? JSON.stringify(jumpTrace) : ""}`);

    await prepare(1);
    await until(() => enemy.getData("state") === "attack" && entry.elapsedMs > 100, "취소 검사 풍선 발사");
    const x = entry.plan.x;
    scene.events.emit(EVENTS.PLAYER_RESPAWNED);
    assert(entry.plan === null && entry.visual.commandBuffer.length === 0, "부활 시 진행 중 풍선 즉시 제거");
    assert(Math.abs(enemy.x - x) < 100, "공격 중 적 본체 순간이동 없음");
  } finally {
    scene.events.off(EVENTS.PLAYER_HIT, hit);
    if (jumpObserver) scene.events.off("postupdate", jumpObserver);
    scene.transformationManager.registerGuardImpact = impact;
    manager.setPaused(false); manager.cancel(enemy);
    scene.transformationManager.cancelPresentation(); scene.transformationManager.setForm("base", false);
    scene.healthManager.restoreFull(); scene.healthManager.invulnerableUntil = 0;
    Object.assign(input, { specialDown: false, jumpDown: false, jumpPressed: false, jumpReleased: false }); place(128);
  }
}

export async function showMerongImpPreview(scene, role, direction = 1) {
  const manager = scene.enemyManager.merongImpController, enemy = scene.levelLoader.enemies[0], entry = manager.entries.get(enemy);
  const input = { moveX: 0, moveY: 0, jumpDown: false, jumpPressed: false, jumpReleased: false, specialDown: false };
  scene.inputManager.sample = () => input;
  scene.transformationManager.cancelPresentation(); scene.transformationManager.setForm("base", false);
  manager.cancel(enemy); manager.setPaused(true);
  enemy.body.reset(enemy.getData("spawnX"), enemy.getData("spawnY"));
  scene.player.body.reset(enemy.x + direction * (role === "burst" ? 420 : 380), 574); scene.player.setVelocity(0, 0); scene.player.setFlipX(direction > 0);
  scene.cameras.main.stopFollow(); scene.cameras.main.setZoom(1.5).centerOn(enemy.x + direction * 180, 420);
  scene.scene.get("UIScene").scene.setVisible(false); document.querySelector("#checks").hidden = true;
  await new Promise(resolve => scene.events.once("postupdate", resolve));
  manager.setPaused(false); enemy.setData("attackReadyAt", 0);
  await new Promise(resolve => {
    const inspect = () => {
      const ready = role === "warning" ? enemy.getData("state") === "telegraph" && entry.elapsedMs >= 650
        : enemy.getData("state") === "attack" && entry.elapsedMs >= (role === "burst" ? entry.plan.travelMs + RULES.inflateMs + 60 : 350);
      if (!ready) return;
      scene.events.off("postupdate", inspect); scene.scene.pause(); resolve();
    };
    scene.events.on("postupdate", inspect);
  });
  document.title = `메롱 꼬마 · ${role} · ${direction}`;
}
