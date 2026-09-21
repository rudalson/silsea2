// Dev-only acceptance page. Run with:
// /scripts/stage1-runtime.html?visualReview=level-01&section=tutorial&offset=128
// Drives InputManager samples through the real Phaser update/collision loop.
import { game } from "../src/main.js";
import { EVENTS } from "../src/config/constants.js";

const output = document.querySelector("#results");
const button = document.querySelector("#run");
const log = (message) => { output.textContent += `${message}\n`; };
const assert = (value, message) => { if (!value) throw new Error(message); log(`PASS ${message}`); };
const frames = (scene, count = 2) => new Promise((resolve) => {
  const tick = () => { if (--count <= 0) { scene.events.off("postupdate", tick); resolve(); } };
  scene.events.on("postupdate", tick);
});
const neutral = { moveX: 0, moveY: 0, jumpDown: false, jumpPressed: false, jumpReleased: false, specialDown: false };

async function run(scene) {
  button.disabled = true;
  output.textContent = "실제 충돌·이동 검증 중\n";
  const originalSample = scene.inputManager.sample;
  const controller = { ...neutral };
  scene.inputManager.sample = () => controller;
  const place = (x, y) => {
    scene.player.body.reset(x, y);
    scene.player.setVelocity(0, 0);
    scene.player.controlLockedUntil = 0;
  };
  try {
    // Airborne mandatory pickups use overlaps, not collectItem() calls.
    place(1792, 200);
    await frames(scene, 24);
    assert(scene.transformationManager.form === "unicorn", "공중에서 뿔 획득");
    place(6848, 200);
    await frames(scene, 24);
    assert(scene.transformationManager.form === "pegasus" && scene.transformationManager.magnetRadius === 176,
      "날개 획득 후 자석 유지");
    place(14208, 200);
    scene.healthManager.hp = 1;
    await frames(scene, 4);
    assert(scene.checkpointManager.current.id === "cp5" && scene.healthManager.hp === scene.healthManager.maxHp,
      "공중 체크포인트 저장·완전 회복");
    scene.healthManager.handleFall();
    await frames(scene, 45);
    assert(Math.abs(scene.player.x - 14208) < 2 && scene.player.body.enable, "저장한 지상 위치로 안전 복귀");

    // Recreate the scene so the route starts without previously acquired abilities/items.
    scene.scene.restart({ levelId: "level-01", easyMode: scene.difficulty.enabled });
    await new Promise((resolve) => game.events.once("step", resolve));
    while (!scene.player?.active || !scene.inputManager || scene.inputManager.sample === originalSample) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (scene.player?.active && scene.inputManager) break;
    }
    await frames(scene, 4);
    const routeSample = scene.inputManager.sample;
    let lastJump = false;
    let done = false;
    let failure = null;
    const started = scene.time.now;
    const visits = new Set();
    const metrics = { damage: 0, respawns: 0, minimumFlightMs: 10000, forms: [] };
    scene.events.on(EVENTS.PLAYER_HIT, () => metrics.damage++);
    scene.events.on(EVENTS.PLAYER_RESPAWNED, () => metrics.respawns++);
    scene.events.on(EVENTS.FORM_CHANGED, ({ form }) => metrics.forms.push(form));
    scene.inputManager.sample = () => {
      if (done) return { ...neutral };
      const p = scene.player;
      const grounded = p.body.blocked.down || p.body.touching.down;
      const flying = ["pegasus", "alicorn"].includes(scene.transformationManager.form);
      const nextWall = scene.levelLoader.getTerrainObjects().some((t) =>
        t.x > p.x && t.x - p.body.right < 110 && t.y < p.y && t.y + t.height > p.body.top);
      const danger = scene.level.hazards.some((h) => h.type === "spike_pumpkin" && h.x > p.x && h.x - p.x < 160)
        || scene.levelLoader.enemies.some((e) => e.active && e.body.enable && e.getData("type") === "raw_potato"
          && e.x > p.x && e.x - p.x < 145 && Math.abs(e.y - p.y) < 50);
      const wantsJump = flying ? p.y > 400
        : grounded ? nextWall || danger : lastJump && p.body.velocity.y < 0;
      const jump = grounded && lastJump ? false : wantsJump;
      const input = { ...neutral, moveX: 1, moveY: flying && p.y < 330 ? 1 : 0,
        jumpDown: jump, jumpPressed: jump && !lastJump, jumpReleased: !jump && lastJump };
      lastJump = jump;
      return input;
    };
    const monitor = () => {
      visits.add(scene.currentSectionId);
      if (scene.transformationManager.form === "pegasus") {
        metrics.minimumFlightMs = Math.min(metrics.minimumFlightMs, scene.transformationManager.flightMs);
      }
      const seconds = Math.round((scene.time.now - started) / 1000);
      button.textContent = `진행 ${Math.round(scene.player.x)} / 14300 · ${seconds}초`;
      if (scene.player.x >= 14300) done = true;
      if (seconds > 95) { failure = `route timeout at x=${Math.round(scene.player.x)}`; done = true; }
    };
    scene.events.on("postupdate", monitor);
    while (!done) await frames(scene, 10);
    scene.events.off("postupdate", monitor);
    scene.inputManager.sample = routeSample;
    if (failure) throw new Error(failure);
    assert(visits.size >= 7, "시작부터 7개 필드 구간을 실제 입력으로 통과");
    assert(["unicorn", "pegasus", "alicorn"].every((form) => metrics.forms.includes(form)), "본선에서 변신 3종 획득");
    assert(scene.checkpointManager.current.id === "cp5", "본선에서 보스 전 회복 지점 활성화");
    log(`METRICS ${JSON.stringify({ ...metrics, stars: scene.objectiveManager.context.starCount,
      seconds: Math.round((scene.time.now - started) / 1000), hp: scene.healthManager.hp })}`);
    log("COMPLETE — 보스 전까지 통과. 보스 처치·사용자 체감 난이도 검증은 별도.");
    button.textContent = "검증 완료";
  } catch (error) {
    log(`FAIL ${error.stack ?? error}`);
    button.textContent = "검증 실패";
  } finally {
    // Stop input even if a route assertion fails.
    scene.inputManager.sample = () => ({ ...neutral });
  }
}

const ready = setInterval(() => {
  const scene = game?.scene?.getScene("GameScene");
  if (!scene?.player?.active) return;
  clearInterval(ready);
  output.textContent = "스테이지 1 실제 물리 검증 · 완료까지 약 1분\n";
  button.textContent = "런타임 검증 실행";
  button.disabled = false;
  button.addEventListener("click", () => run(scene), { once: true });
}, 100);
