import { game } from "../src/main.js";
import { EVENTS } from "../src/config/constants.js";
import { progressManager } from "../src/systems/ProgressManager.js";

const output = document.querySelector("#results"), button = document.querySelector("#run");
const neutral = { moveX: 0, moveY: 0, jumpDown: false, jumpPressed: false, jumpReleased: false, specialDown: false };
const frame = () => new Promise(resolve => game.events.once("step", resolve));
const frames = async count => { for (let index = 0; index < count; index++) await frame(); };
const until = async (check, label, ms = 32000) => {
  const start = performance.now();
  while (performance.now() - start < ms) { if (check()) return; await frame(); }
  throw Error(`Timeout: ${label}`);
};
const log = text => output.textContent += `${text}\n`;
const assert = (value, label) => { if (!value) throw Error(label); log(`PASS ${label}`); };

async function run(scene) {
  button.disabled = true; output.textContent = `${scene.level.name} · 실제 타격 → 사망/추락 → 재도전\n`;
  const sample = scene.inputManager.sample, input = { ...neutral }, boss = scene.levelLoader.boss, b = scene.bossController.behavior;
  const saved = { data: progressManager.data, memory: progressManager.memory, storage: progressManager.storage };
  const stored = localStorage.getItem("silsea:progress:v1"), temporary = new Map();
  progressManager.data = structuredClone(saved.data); progressManager.memory = structuredClone(saved.memory);
  progressManager.storage = { getItem: key => temporary.get(key) ?? null, setItem: (key, value) => temporary.set(key, value) };
  let respawns = 0, hits = 0, defeats = 0;
  const onRespawn = () => respawns++, onHit = () => hits++, onDefeat = () => defeats++;
  scene.events.on(EVENTS.PLAYER_RESPAWNED, onRespawn); scene.events.on(EVENTS.BOSS_HIT, onHit); scene.events.on(EVENTS.BOSS_DEFEATED, onDefeat);
  const place = (x, y = 574) => {
    Object.assign(input, neutral); scene.player.body.reset(x, y); scene.player.setVelocity(0, 0);
    scene.player.controlLockedUntil = 0; scene.player.bufferedJumpUntil = -Infinity;
  };
  const grounded = () => scene.player.body.velocity.y >= 0 && (scene.player.body.blocked.down || scene.player.body.touching.down);
  const clean = () => !b.tongue?.active && ["shots", "patches", "notes", "drops", "columns", "targets"].every(key => !b[key]?.length)
    && !b.pending && !b.rest && !b.getMovementVelocityX?.()
    && (scene.courseMechanics?.getSnapshot().transientStickyCount ?? 0) === 0
    && (b.holes ?? []).every(hole => hole.platform.body.enable);
  const respawn = async (lethal, hp, phase) => {
    const count = respawns; Object.assign(input, neutral);
    scene.healthManager.invulnerableUntil = -Infinity;
    if (lethal) {
      scene.healthManager.hp = 1;
      assert(scene.healthManager.takeDamage(boss.x, { type: "boss_respawn_test" }), "마지막 플레이어 HP에 실제 피해 적용");
    } else scene.healthManager.handleFall();
    await until(() => respawns === count + 1 && !scene.checkpointManager.respawning && scene.player.body.enable, "체크포인트 부활", 4000);
    assert(boss.getData("hp") === hp && boss.getData("phase") === phase, `${lethal ? "사망" : "추락"} 후 보스 HP ${hp}·${phase}단계 유지`);
    if (hp > 0) assert(b.state === "dormant" && !boss.body.enable && clean(), "재진입 전 남은 공격·감속·구멍·정지·바람 정리");
    else assert(!boss.active && b.defeated && scene.levelLoader.gate, "처치한 보스 재생성 없음·게이트 보존");
    scene.healthManager.restoreFull(); scene.healthManager.grantInvulnerability(120000);
  };
  const stomp = async hp => {
    place(b.section.xStart + 120);
    await until(() => b.state === "vulnerable", "실제 공격 패턴 뒤 약점 열림");
    place(boss.x - 224); await until(grounded, "기본 점프 접지", 1000);
    input.moveX = 1; input.jumpDown = input.jumpPressed = true;
    await frames(1); input.jumpPressed = false;
    await until(() => boss.getData("hp") === hp - 1, "실제 점프로 보스 타격", 2200);
    Object.assign(input, neutral); await frames(3);
    assert(hits === 4 - hp && boss.getData("hp") === hp - 1, `실제 점프 HP ${hp} → ${hp - 1}·중복 타격 없음`);
  };
  try {
    scene.inputManager.sample = () => input;
    scene.transformationManager.cancelPresentation(); scene.transformationManager.setForm("base", false);
    const checkpoint = scene.level.checkpoints.at(-1); scene.checkpointManager.activate(checkpoint);
    assert(checkpoint.x < b.section.xStart, "보스 구역 밖 체크포인트에서 재도전");
    scene.healthManager.grantInvulnerability(120000);
    await stomp(3); await respawn(true, 2, 2);
    await stomp(2); await respawn(false, 1, 3);
    await stomp(1); assert(defeats === 1, "누적 세 번 타격으로 보스 처치 1회");
    await respawn(true, 0, 3);
    assert(hits === 3 && defeats === 1, "부활로 점수·처치 이벤트 중복 없음");
    assert(localStorage.getItem("silsea:progress:v1") === stored, "사용자 기존 기록 보존");
    button.textContent = "검증 완료"; log("COMPLETE — 실제 타격·사망·추락·남은 체력/단계·공격 정리·처치 유지");
    scene.scene.pause();
  } catch (error) {
    button.textContent = "검증 실패"; log(`FAIL ${error.stack ?? error}`);
    log(`STATE ${JSON.stringify({ hp: boss.getData("hp"), phase: boss.getData("phase"), state: b.state, x: scene.player.x, y: scene.player.y, respawns, hits, defeats })}`);
  } finally {
    scene.events.off(EVENTS.PLAYER_RESPAWNED, onRespawn); scene.events.off(EVENTS.BOSS_HIT, onHit); scene.events.off(EVENTS.BOSS_DEFEATED, onDefeat);
    scene.inputManager.sample = sample; Object.assign(progressManager, saved);
  }
}

const ready = setInterval(() => {
  const scene = game?.scene?.getScene("GameScene");
  if (!scene?.player?.active) return; clearInterval(ready);
  if (!/^level-(07|08|09|10|11)$/.test(scene.level.id) || !scene.levelHotReload) {
    output.textContent = "?visualReview=level-07(08~11도 가능)&debug=1&mute=1로 열어 주세요."; return;
  }
  button.disabled = false; button.textContent = "보스 체력 보존 검증 실행";
  output.textContent = "실제 점프 타격 후 사망·추락·재도전·처치 유지 검사";
  button.addEventListener("click", () => run(scene), { once: true });
}, 100);
