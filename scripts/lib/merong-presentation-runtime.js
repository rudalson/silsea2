import { EVENTS } from "../../src/config/constants.js";

// Capture a real anticipation frame, without changing AI timings or geometry.
export async function showMerongSentryPreview(scene, direction) {
  const entry = scene.tongueTraps.entries.find(({ config }) => !config.practice && config.y > 520);
  const input = { moveX: 0, moveY: 0, jumpDown: false, jumpPressed: false, jumpReleased: false, specialDown: false };
  scene.inputManager.sample = () => input;
  scene.transformationManager.cancelPresentation(); scene.transformationManager.setForm("base", false);
  scene.player.body.reset(entry.x + direction * 150, 574); scene.player.setVelocity(0, 0);
  scene.player.setFlipX(direction > 0);
  scene.tongueTraps.reset();
  scene.cameras.main.stopFollow(); scene.cameras.main.setZoom(1.5).centerOn(entry.x + direction * 75, 420);
  scene.scene.get("UIScene").scene.setVisible(false);
  document.querySelector("#checks").hidden = true;
  await new Promise(resolve => {
    const inspect = () => {
      if (entry.phase !== "warning" || entry.elapsedMs < 650) return;
      scene.events.off("postupdate", inspect); scene.scene.pause(); resolve();
    };
    scene.events.on("postupdate", inspect);
  });
  document.title = `메롱 문지기 · ${direction < 0 ? "왼쪽" : "오른쪽"} 주인공 바라보기`;
}

export async function verifyMerongPresentation(scene, { assert, frames, until, place }) {
  const manager = scene.tongueTraps, entry = manager.entries.find(({ config }) => !config.practice && config.y > 520);
  const bodyX = entry.x, fallback = !entry.sprite;
  const facing = direction => fallback
    ? Math.sign(entry.fallback.eye.x - bodyX) === direction
    : entry.sprite.flipX === (direction < 0) && entry.sprite.x === bodyX;
  const noPanels = () => !scene.children.list.some(object => typeof object.text === "string"
    && /혀 공격 예고|연습 · 곧 혀|↑ 점프!|지금 지나가요/.test(object.text));
  let tongueHits = 0;
  const trace = [];
  const monitor = () => {
    if (trace.at(-1)?.phase === entry.phase) return;
    trace.push({ phase: entry.phase, ms: entry.elapsedMs, x: scene.player.x, y: scene.player.y,
      direction: entry.direction, width: entry.tongue.bounds?.width, transforming: scene.transformationManager.transforming });
  };
  const onHit = ({ type }) => { if (type === "tongue") tongueHits++; };
  scene.events.on(EVENTS.PLAYER_HIT, onHit);
  scene.events.on("postupdate", monitor);
  try {
    scene.transformationManager.cancelPresentation(); scene.transformationManager.setForm("base", false);
    scene.healthManager.restoreFull(); manager.reset();
    for (const direction of [-1, 1]) {
      place(bodyX + direction * 150);
      await until(() => entry.phase === "warning" && entry.direction === direction, "주인공 쪽 준비 동작");
      const plan = { ...entry.attack };
      await frames(8);
      assert(facing(direction) && noPanels() && !entry.tongue.visual.visible && entry.tongue.bounds === null,
        `${direction < 0 ? "왼쪽" : "오른쪽"} 볼 부풀리기·제자리 회전·문구/범위 표시 없음`);
      place(bodyX - direction * 150); await frames(4);
      assert(entry.direction === direction && entry.attack.x === plan.x && facing(direction), "준비 동작 뒤 반대쪽으로 가도 공격 방향 고정");
      const before = tongueHits;
      await until(() => entry.phase === "attack" && entry.tongue.bounds?.width >= 180, "실제 혀 전개");
      const bounds = entry.tongue.bounds;
      assert((direction < 0 ? Math.abs(bounds.x + bounds.width - plan.x) : Math.abs(bounds.x - plan.x)) < 0.1
        && tongueHits === before, "바라본 쪽 입에서만 실제 혀 전개·반대쪽 무피해");
      place(bodyX + direction * 140);
      await until(() => tongueHits === before + 1, "실제 혀 피해", 1000);
      assert(scene.healthManager.hp < scene.healthManager.maxHp, "보이는 혀와 실제 피해 판정 일치");
      scene.healthManager.restoreFull(); place(bodyX - direction * 150);
      await until(() => entry.phase === "rest" && facing(-direction), "공격 후 주인공 쪽으로 다시 회전");
      assert(!entry.tongue.active && !entry.tongue.visual.visible && noPanels(), "휴식 때 혀 회수·회복 표정·안내판 없음");
    }
    manager.reset(); assert(!entry.tongue.active && !entry.attack, "부활·재로드에 사용할 정리 동작 유지");
  } catch (error) {
    throw new Error(`${error.message}; sentry trace ${JSON.stringify(trace.slice(-16))}`);
  } finally {
    scene.events.off(EVENTS.PLAYER_HIT, onHit);
    scene.events.off("postupdate", monitor);
    scene.healthManager.restoreFull(); manager.reset(); place(128);
  }
}
