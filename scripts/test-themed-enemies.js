import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { THEMED_ENEMIES, createThemedAttack, findThemedAttackHits, getThemedEnemyTypes, getThemedRainColumns, overlapsThemedHazard, sampleThemedAttack } from "../src/data/themedEnemies.js";
import { ThemedEnemyController } from "../src/systems/ThemedEnemyController.js";
import { getEnemyAnimationSpec, getEnemySequenceNames } from "../src/data/enemyAnimations.js";
import { createRuntimeLevel } from "../src/systems/DifficultyManager.js";
import { getLevel } from "../src/data/levels/index.js";
import { SCORE_VALUES } from "../src/data/gameplay.js";
import { EVENTS } from "../src/config/constants.js";

function fixture(type, easy = false) {
  const values = { type, state: "idle", spawnX: 600, patrol: 80, usesArt: true };
  const visual = new Proxy({ active: true, destroy() { this.active = false; } }, {
    get(target, key) { return key in target ? target[key] : () => visual; }
  });
  const scene = { events: new EventEmitter(), time: { now: 0 }, add: { graphics: () => visual }, anims: { exists: () => true },
    cameras: { main: { worldView: { left: 0, right: 1280, top: 0, bottom: 720 } } }, courseMechanics: { rhythms: [] } };
  const enemy = { x: 600, y: 576, active: true, scene, flipX: false,
    body: { enable: true, width: 50, bottom: 576, blocked: {}, velocity: { x: 0 }, setVelocityX(x) { this.velocity.x = x; } },
    getData: key => values[key], setData(key, value) { if (typeof key === "object") Object.assign(values, key); else values[key] = value; },
    setFlipX(value) { this.flipX = value; }, play(key) { this.animation = key; } };
  const player = { x: 450, y: 576, body: { enable: true, left: 428, right: 472, top: 518, bottom: 576 } };
  const hits = [], guards = [];
  const transformation = { guarding: false, canGuardProjectile() { return this.guarding; }, registerGuardImpact: (...args) => guards.push(args) };
  const loader = { enemies: [enemy], terrainObjects: [{ x: 0, y: 576, width: 5000 }] };
  const controller = new ThemedEnemyController(scene, player, loader, { takeDamage: (...args) => hits.push(args) }, transformation, easy);
  return { enemy, player, scene, controller, hits, guards, transformation, visual };
}

for (const [type, rules] of Object.entries(THEMED_ENEMIES)) {
  const input = { x: 600, floorY: 576, direction: -1, targetX: 450 };
  const plan = createThemedAttack(type, input), mirror = createThemedAttack(type, { ...input, direction: 1, targetX: 750 });
  assert.ok(rules.warningMs >= 1000 && rules.cooldownMs >= 2000, `${type} 읽을 수 있는 예고와 재공격 간격`);
  assert.ok(SCORE_VALUES[type] > 0);
  for (let time = 0; time < plan.durationMs; time += 83) {
    const hazards = sampleThemedAttack(plan, time), mirrored = sampleThemedAttack(mirror, time);
    assert.equal(hazards.length, mirrored.length);
    hazards.forEach((hazard, i) => {
      assert.ok(Math.abs(hazard.x + mirrored[i].x - 1200) < 0.001, `${type} 방향 대칭`);
      assert.equal(hazard.y, mirrored[i].y);
      assert.ok(Number.isFinite(hazard.x) && Number.isFinite(hazard.y));
    });
  }
  assert.deepEqual(sampleThemedAttack(plan, -1), []);
  assert.deepEqual(sampleThemedAttack(plan, plan.durationMs), []);
  assert.deepEqual(findThemedAttackHits(plan, 0, plan.durationMs, { enable: false }), []);
  const jump = { enable: true, left: 300, right: 700, top: 388, bottom: 450 };
  if (rules.kind !== "umbrella_rain") assert.deepEqual(findThemedAttackHits(plan, 0, plan.durationMs, jump), [], `${type} 기본 점프로 낮은 공격 회피`);

  const f = fixture(type), entry = f.controller.entries.get(f.enemy);
  f.controller.update(f.enemy, 0, 16);
  assert.equal(f.enemy.getData("state"), "telegraph"); assert.equal(f.enemy.body.velocity.x, 0);
  const locked = structuredClone(entry.plan);
  f.player.x = 750;
  f.controller.update(f.enemy, rules.warningMs - 1, rules.warningMs - 1);
  assert.deepEqual(entry.plan, locked, `${type} 예고 후 추적·방향 변경 없음`);
  assert.equal(f.enemy.getData("state"), "telegraph");
  f.controller.setPaused(true); const elapsed = entry.elapsedMs;
  f.controller.update(f.enemy, 10000, 9000); assert.equal(entry.elapsedMs, elapsed, `${type} 환경 정지 시간 보존`);
  f.controller.setPaused(false); f.controller.update(f.enemy, rules.warningMs, 1);
  assert.equal(f.enemy.getData("state"), "attack");
  const target = sampleThemedAttack(entry.plan, 300)[0];
  Object.assign(f.player.body, { left: target.x - 16, right: target.x + 16, top: target.y - 16, bottom: target.y + 16 });
  f.controller.update(f.enemy, rules.warningMs + 300, 300);
  assert.ok(f.hits.length >= 1, `${type} 실제 공격 피해 연결`);
  const hitCount = f.hits.length;
  f.controller.update(f.enemy, rules.warningMs + 301, 1);
  assert.equal(f.hits.length, hitCount, `${type} 같은 공격 오브젝트 중복 타격 차단`);
  f.controller.cancel(f.enemy, 2000); assert.equal(entry.plan, null);
  f.enemy.setData("attackReadyAt", 0); f.player.x = 450;
  f.controller.update(f.enemy, 3000, 16); assert.equal(f.enemy.getData("state"), "telegraph");
  f.scene.cameras.main.worldView.left = 1000;
  f.controller.update(f.enemy, 5000, 2000);
  assert.equal(f.enemy.getData("state"), "recover"); assert.equal(entry.plan, null, `${type} 화면 밖 예고 취소`);
  f.scene.events.emit(EVENTS.PLAYER_RESPAWNED); assert.equal(entry.plan, null);
  f.controller.destroy(); assert.equal(f.visual.active, false); assert.equal(f.scene.events.listenerCount(EVENTS.PLAYER_RESPAWNED), 0);

  const rhythm = fixture(type); rhythm.scene.courseMechanics.rhythms.push({ state: { phase: "stop" } });
  rhythm.controller.update(rhythm.enemy, 0, 16);
  assert.equal(rhythm.controller.entries.get(rhythm.enemy).plan, null, `${type} 5초 정지 신호 중 공격 금지`);
  rhythm.controller.destroy();
  const easy = fixture(type, true); easy.controller.update(easy.enemy, 0, 16);
  easy.controller.update(easy.enemy, rules.warningMs, rules.warningMs);
  assert.equal(easy.enemy.getData("state"), "telegraph", `${type} 쉬움 예고 연장`); easy.controller.destroy();
}

const notes = createThemedAttack("piano_imp", { x: 600, floorY: 576, direction: -1, targetX: 450 });
assert.equal(sampleThemedAttack(notes, 400).length, 2);
assert.equal(sampleThemedAttack({ ...notes, easy: true }, 400).length, 1);
assert.notEqual(sampleThemedAttack(notes, 100)[0].y, sampleThemedAttack(notes, 500)[0].y, "음표 두 번 튀는 궤적");
const guard = fixture("piano_imp"); guard.transformation.guarding = true;
guard.controller.update(guard.enemy, 0, 16); guard.controller.update(guard.enemy, 1050, 1050);
const guardTarget = sampleThemedAttack(guard.controller.entries.get(guard.enemy).plan, 300)[0];
Object.assign(guard.player.body, { left: guardTarget.x - 16, right: guardTarget.x + 16, top: guardTarget.y - 16, bottom: guardTarget.y + 16 });
guard.controller.update(guard.enemy, 1350, 300);
assert.ok(guard.guards.length > 0 && guard.hits.length === 0, "음표 날개 방어·HP 피해 없음"); guard.controller.destroy();
const pendulum = createThemedAttack("metronome_owl", { x: 600, floorY: 576, direction: 1, targetX: 750 });
assert.ok(sampleThemedAttack(pendulum, 550)[0].x > sampleThemedAttack(pendulum, 100)[0].x, "추가 바깥으로 이동");
assert.ok(sampleThemedAttack(pendulum, 1000)[0].x < sampleThemedAttack(pendulum, 550)[0].x, "추가 돌아옴");

const manifest = JSON.parse(await readFile(new URL("../assets/manifest.json", import.meta.url), "utf8"));
for (const type of Object.keys(THEMED_ENEMIES)) for (const role of getEnemySequenceNames(type)) {
  const spec = getEnemyAnimationSpec(type, role), asset = manifest.assets.find(({ key }) => key === spec.textureKey);
  assert.equal(asset?.frames, spec.durations.length);
  const { data, info } = await sharp(fileURLToPath(new URL(`..${asset.url}`, import.meta.url))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 128 * asset.frames); assert.equal(info.height, 128);
  for (let frame = 0; frame < asset.frames; frame++) {
    let minX = 128, maxX = -1, maxY = -1, clear = 0;
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const alpha = data[(y * info.width + frame * 128 + x) * 4 + 3];
      if (alpha === 0) clear++; if (alpha < 16) continue;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    assert.ok(clear > 6000 && minX >= 8 && maxX < 120 && maxY >= 110 && maxY <= 112, `${type}/${role} 실제 투명 배경·여백·발 기준선`);
  }
}
for (const [stage, levelId] of Object.entries({ music: "level-09", hole: "level-10", cloud: "level-11" })) {
  const level = getLevel(levelId), types = getThemedEnemyTypes(stage);
  assert.deepEqual(level.enemies.map(({ type }) => type), types);
  assert.equal(createRuntimeLevel(level, true).enemies.length, 1, `${stage} 쉬움 두 번째 적 제거`);
}
const ringPlan = createThemedAttack("ring_golem", { x: 600, floorY: 576, direction: 1, targetX: 750 });
const ring = sampleThemedAttack(ringPlan, 900)[0];
assert.equal(overlapsThemedHazard({ enable: true, left: ring.x - 2, right: ring.x + 2, top: ring.y - 2, bottom: ring.y + 2 }, ring), false, "돌고리의 빈 중심에는 피해 없음");
assert.ok(sampleThemedAttack(ringPlan, 900)[0].x > sampleThemedAttack(ringPlan, 1700)[0].x, "돌고리 복귀 궤적");
const mole = createThemedAttack("burrow_mole", { x: 600, floorY: 576, direction: -1, targetX: 450 });
assert.equal(sampleThemedAttack(mole, 500)[0].x, 450, "흙기둥은 미리 고정한 지점에서 분출");
assert.ok(sampleThemedAttack({ ...mole, easy: true }, 500)[0].height < sampleThemedAttack(mole, 500)[0].height, "쉬움 흙기둥 높이 감소");
const gust = createThemedAttack("cloud_sheep", { x: 600, floorY: 576, direction: -1, targetX: 450 });
assert.ok(sampleThemedAttack(gust, 1500)[0].width > sampleThemedAttack(gust, 200)[0].width, "돌풍이 진행하면서 커짐");
assert.ok(sampleThemedAttack({ ...gust, easy: true }, 1500)[0].width < sampleThemedAttack(gust, 1500)[0].width, "쉬움 돌풍 크기 감소");
const rain = createThemedAttack("umbrella_duck", { x: 600, floorY: 576, direction: -1, targetX: 450 });
assert.equal(getThemedRainColumns(rain).length, 3); assert.equal(getThemedRainColumns({ ...rain, easy: true }).length, 1);
assert.equal(sampleThemedAttack(rain, 100).length, 1); assert.equal(sampleThemedAttack(rain, 700).length, 3);
const between = { enable: true, left: 464, right: 508, top: 518, bottom: 576 };
assert.deepEqual(findThemedAttackHits(rain, 0, rain.durationMs, between), [], "폭 44px 플레이어가 비줄기 사이에서 회피");
console.log(`캐릭터 고유 공격 ${Object.keys(THEMED_ENEMIES).length}종 검사 통과: 잠긴 예고·궤적·점프 회피·피해·중복 방지·정지·취소·RGBA·배치`);
