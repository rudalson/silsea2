import { game } from "../src/main.js";
import { THEMED_ENEMIES, sampleThemedAttack } from "../src/data/themedEnemies.js";
import { EVENTS } from "../src/config/constants.js";

const output = document.querySelector("#results"), button = document.querySelector("#run");
const frame = () => new Promise(resolve => game.events.once("step", resolve));
const frames = async count => { for (let i = 0; i < count; i++) await frame(); };
const until = async (check, label, ms = 8000) => { const start = performance.now(); while (performance.now() - start < ms) { if (check()) return; await frame(); } throw new Error(`Timeout: ${label}`); };
const assert = (condition, label) => { if (!condition) throw new Error(label); output.textContent += `PASS ${label}\n`; };
const neutral = { moveX: 0, moveY: 0, jumpDown: false, jumpPressed: false, jumpReleased: false, specialDown: false };

async function run(scene) {
  button.disabled = true; output.textContent = "캐릭터 고유 공격 실제 검사\n";
  const previousSample = scene.inputManager.sample, hitKinds = [];
  const onHit = ({ type }) => hitKinds.push(type);
  scene.events.on(EVENTS.PLAYER_HIT, onHit);
  scene.inputManager.sample = () => neutral;
  const place = (x, y = 574) => {
    scene.player.body.reset(x, y); scene.player.setVelocity(0, 0); scene.player.controlLockedUntil = 0;
    scene.cameras.main.centerOn(x, y - 180);
  };
  try {
    scene.transformationManager.cancelPresentation(); scene.transformationManager.setForm("base", false);
    let manager = scene.enemyManager.themedEnemyController;
    assert(manager.entries.size > 0, "전용 캐릭터 생성");
    for (const [enemy, entry] of manager.entries) {
      const type = enemy.getData("type"), rules = THEMED_ENEMIES[type];
      assert(enemy.getData("usesArt") || scene.registry.get("forceAssetFallback"), `${type} 원화 로드`);
      enemy.body.reset(enemy.getData("spawnX"), 576); manager.cancel(enemy); enemy.setData("attackReadyAt", 0);
      place(enemy.x - 160); await until(() => enemy.getData("state") === "telegraph", `${type} 예고`);
      const locked = JSON.stringify(entry.plan);
      place(enemy.x + 160); await frames(3);
      assert(JSON.stringify(entry.plan) === locked, `${type} 예고 뒤 방향·원점 고정`);
      const pausedAt = entry.elapsedMs; scene.scene.pause(); await new Promise(resolve => setTimeout(resolve, 250));
      assert(entry.elapsedMs === pausedAt, `${type} 일시정지 시간 보존`); scene.scene.resume();
      place(enemy.x - entry.plan.direction * 300); scene.healthManager.restoreFull(); scene.healthManager.invulnerableUntil = 0;
      await until(() => enemy.getData("state") === "attack", `${type} 실제 공격`);
      const targetTime = Math.min(entry.plan.durationMs - 100, 1450);
      await until(() => entry.elapsedMs >= targetTime - 80, `${type} 공격 궤적 진행`);
      const target = sampleThemedAttack(entry.plan, targetTime)[0];
      assert(Boolean(target), `${type} 고유 공격 오브젝트`);
      const oldHits = hitKinds.length;
      place(target.x, target.y + scene.player.body.height / 2);
      await until(() => hitKinds.length > oldHits, `${type} 실제 공격 충돌`, 800);
      assert(hitKinds.at(-1) === rules.kind, `${type} 몸통 접촉과 구분되는 ${rules.kind} 피해`);
      if (rules.kind === "sneeze_gust") assert(Math.sign(scene.player.body.velocity.x) === entry.plan.direction, "돌풍 진행 방향으로 실제 밀림");
      place(enemy.x - 350); scene.healthManager.restoreFull(); scene.healthManager.grantInvulnerability(5000);
      manager.cancel(enemy); enemy.setData("attackReadyAt", 0); place(enemy.x - 150);
      await until(() => enemy.getData("state") === "telegraph", `${type} 재공격 예고`);
      scene.scoreManager.resetCombo(); const before = scene.scoreManager.score;
      place(enemy.x, enemy.body.top - 1); scene.player.setVelocityY(240);
      await until(() => !enemy.body.enable, `${type} 실제 밟기 처치`, 1500);
      assert(scene.scoreManager.score === before + 60 && entry.plan === null, `${type} 60점·예고/공격 정리`);
      await until(() => !enemy.active, `${type} 패배 포즈 종료`, 1500);
      assert(scene.scoreManager.score === before + 60, `${type} 중복 점수 없음`);
    }
    const oldVisuals = [...manager.entries.values()].map(entry => entry.visual);
    assert(await scene.levelHotReload.reload(), "레벨 재로드 성공");
    assert(manager.entries.size === 0 && oldVisuals.every(visual => !visual.active), "재로드 때 이전 공격·이벤트·표시 정리");
    manager = scene.enemyManager.themedEnemyController;
    assert(manager.entries.size === 0, "재로드 후 이미 처치한 캐릭터 진행 보존");
    button.textContent = "검증 완료"; output.textContent += "COMPLETE — 고유 공격·잠긴 예고·실제 피해·밟기·점수·일시정지·재로드\n";
  } catch (error) {
    button.textContent = "검증 실패"; output.textContent += `FAIL ${error.stack ?? error}\n`;
    const body = scene.player.body;
    output.textContent += JSON.stringify({ x: scene.player.x, y: scene.player.y, body: { left: body.left, right: body.right, top: body.top, bottom: body.bottom },
      invulnerable: scene.healthManager.invulnerableUntil, now: scene.time.now, form: scene.transformationManager.form,
      enemies: scene.enemyManager.themedEnemyController.getSnapshot() }) + "\n";
    scene.scene.resume();
  }
  finally { scene.inputManager.sample = previousSample; scene.events.off(EVENTS.PLAYER_HIT, onHit); }
}
const ready = setInterval(() => {
  const scene = game?.scene?.getScene("GameScene");
  if (!scene?.player?.active) return; clearInterval(ready);
  if (!scene.levelHotReload) { output.textContent = "?visualReview=level-09&debug=1&mute=1로 열어 주세요."; return; }
  button.disabled = false; button.textContent = "고유 공격 검증 실행";
  output.textContent = "전용 적의 실제 공격·물리 충돌·밟기 검증.\n";
  button.addEventListener("click", () => run(scene), { once: true });
}, 100);
