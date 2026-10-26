import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createMerongPrank, findMerongPrankHit, overlapsMerongPrank, sampleMerongPrank, MERONG_IMP_RULES as RULES } from "../src/data/merongImpAttack.js";
import { MerongImpController } from "../src/systems/MerongImpController.js";
import { EVENTS } from "../src/config/constants.js";
import { isGroundPatrolEnemy, isSimplePatrolEnemy } from "../src/data/enemies.js";

const plan = createMerongPrank({ x: 600, floorY: 576, direction: 1, groundLimit: 1800 });
const mirror = createMerongPrank({ x: 600, floorY: 576, direction: -1, groundLimit: -600 });
for (let ms = 0; ms < plan.durationMs; ms += 13) {
  const a = sampleMerongPrank(plan, ms), b = sampleMerongPrank(mirror, ms);
  assert.equal(a.length, b.length);
  a.forEach((hazard, index) => { assert.ok(Math.abs(hazard.x + b[index].x - 1200) < 0.001); assert.equal(hazard.y, b[index].y); });
}
assert.deepEqual(sampleMerongPrank(plan, -1), []);
assert.deepEqual(sampleMerongPrank(plan, plan.durationMs), []);
assert.equal(sampleMerongPrank(plan, plan.travelMs / 4)[0].y, 492, "첫 튀기 정점");
assert.equal(sampleMerongPrank(plan, plan.travelMs * 3 / 4)[0].y, 492, "두 번째 튀기 정점");
assert.equal(sampleMerongPrank(plan, plan.travelMs / 2)[0].y, 552, "중간에 바닥으로 돌아옴");
assert.ok(sampleMerongPrank(plan, plan.travelMs + 200)[0].width > 34, "터지기 전 몸이 부풂");
const tongueMs = plan.travelMs + RULES.inflateMs + RULES.burstMs / 2;
const tongue = sampleMerongPrank(plan, tongueMs)[0];
assert.equal(tongue.shape, "tongue"); assert.equal(tongue.width, 104);
const body = (x, bottom = 576) => ({ enable: true, left: x - 16, right: x + 16, top: bottom - 50, bottom });
assert.ok(findMerongPrankHit(plan, 0, plan.durationMs, body(780)), "충돌 프레임이 지나가도 풍선 적중");
assert.ok(findMerongPrankHit(plan, tongueMs - 12, tongueMs + 12, body(plan.popX + 80)), "풍선을 피한 위치에도 짧은 혀 적중");
assert.equal(findMerongPrankHit(plan, 0, plan.durationMs, body(780, 450)), null, "기본 점프 높이로 모든 구간 회피");
assert.equal(findMerongPrankHit(plan, 0, plan.durationMs, { enable: false }), null);
assert.equal(overlapsMerongPrank({ enable: true, left: 15, right: 30, top: 15, bottom: 30 }, { x: 0, y: 0, width: 34, shape: "balloon" }), false, "투명 모서리에 원형 피해 없음");
const edge = createMerongPrank({ x: 600, floorY: 576, direction: 1, groundLimit: 800 });
assert.ok(edge.popX + edge.reach < 800, "풍선·혀가 낭떠러지를 건너 쏘지 않음");
const easy = createMerongPrank({ x: 600, floorY: 576, direction: 1, groundLimit: 1800 }, true);
assert.ok(easy.travelMs > plan.travelMs && easy.travel < plan.travel && easy.reach < plan.reach, "쉬움은 더 느리고 짧음");
assert.ok(isGroundPatrolEnemy("merong_imp") && !isSimplePatrolEnemy("merong_imp"), "지면 충돌 유지·기존 순찰 AI와 중복 실행 없음");

function fixture(easyMode = false) {
  const values = { type: "merong_imp", state: "idle", spawnX: 600, patrol: 80 };
  const visual = new Proxy({ active: true, commands: 0, clear() { this.commands = 0; return this; }, destroy() { this.active = false; } }, {
    get(target, key) { return key in target ? target[key] : () => { target.commands++; return visual; }; }
  });
  const scene = { events: new EventEmitter(), time: { now: 0 }, add: { graphics: () => visual }, anims: { exists: () => true },
    cameras: { main: { worldView: { left: 0, right: 1280, top: 0, bottom: 720 } } } };
  const enemy = { x: 600, y: 576, active: true, scene, body: { enable: true, width: 48, bottom: 576, velocity: { x: 0 }, setVelocityX(x) { this.velocity.x = x; } },
    getData: key => values[key], setData(key, value) { if (typeof key === "object") Object.assign(values, key); else values[key] = value; },
    setFlipX(value) { this.flipX = value; }, play(key) { this.animation = key; } };
  const player = { x: 800, y: 576, body: body(800) }, hits = [], guards = [];
  const transformation = { guarding: false, canGuardProjectile() { return this.guarding; }, registerGuardImpact: (...args) => guards.push(args) };
  const loader = { enemies: [enemy], terrainObjects: [{ x: 0, y: 576, width: 400 }, { x: 400, y: 576, width: 800 }, { x: 1400, y: 576, width: 400 }] };
  const controller = new MerongImpController(scene, player, loader, { takeDamage: (...args) => hits.push(args) }, transformation, easyMode);
  return { scene, enemy, player, hits, guards, transformation, visual, controller, entry: controller.entries.get(enemy) };
}
for (const guarded of [false, true]) {
  const f = fixture(); f.transformation.guarding = guarded;
  assert.deepEqual(f.controller.groundSpan(f.enemy), { left: 0, right: 1200 }, "연결된 지형만 확장·구멍에서 멈춤");
  f.controller.update(f.enemy, 0, 16);
  assert.equal(f.enemy.getData("state"), "telegraph"); assert.equal(f.enemy.animation, "enemy:merong_imp:warning");
  assert.equal(f.visual.commands, 1, "준비 중에는 깊이 설정 외 공격 범위/선 그리기 없음");
  const locked = structuredClone(f.entry.plan);
  f.player.x = 400; f.controller.update(f.enemy, 500, 500);
  assert.deepEqual(f.entry.plan, locked); assert.equal(f.enemy.flipX, false, "준비 후 방향 고정");
  f.controller.setPaused(true); f.controller.update(f.enemy, 9500, 9000);
  assert.equal(f.entry.elapsedMs, 500); f.controller.setPaused(false);
  f.controller.update(f.enemy, RULES.warningMs, RULES.warningMs - 500);
  assert.equal(f.enemy.getData("state"), "attack");
  f.player.body = body(780); f.controller.update(f.enemy, RULES.warningMs + 900, 900);
  assert.equal(f.hits.length, guarded ? 0 : 1); assert.equal(f.guards.length, guarded ? 1 : 0);
  if (!guarded) assert.equal(f.hits[0][1].type, "merong_prank");
  assert.equal(f.entry.plan, null, "방어·피격 뒤 풍선과 터짐 모두 정리");
  f.controller.update(f.enemy, 2500, 500); assert.equal(f.hits.length + f.guards.length, 1, "동일 풍선 중복 피해 없음");
  f.controller.cancel(f.enemy); f.enemy.setData("attackReadyAt", 0); f.controller.update(f.enemy, 5000, 16);
  assert.equal(f.enemy.flipX, true, "다음 공격은 현재 주인공 방향");
  f.scene.cameras.main.worldView.left = 1000; f.controller.update(f.enemy, 6000, 1000);
  assert.equal(f.enemy.getData("state"), "recover"); assert.equal(f.entry.plan, null, "화면 밖 공격 취소");
  f.scene.events.emit(EVENTS.PLAYER_RESPAWNED); assert.equal(f.enemy.getData("state"), "idle");
  f.controller.destroy(); assert.equal(f.visual.active, false); assert.equal(f.scene.events.listenerCount(EVENTS.PLAYER_RESPAWNED), 0);
}
const slower = fixture(true); slower.controller.update(slower.enemy, 0, 16); slower.controller.update(slower.enemy, 1100, 1100);
assert.equal(slower.enemy.getData("state"), "telegraph", "쉬움 준비 동작 연장"); slower.controller.destroy();
const patrol = fixture(); patrol.player.x = 0;
patrol.enemy.x = 519; patrol.controller.update(patrol.enemy, 0, 16); assert.ok(patrol.enemy.body.velocity.x > 0);
patrol.enemy.x = 681; patrol.player.x = 1200; patrol.controller.update(patrol.enemy, 16, 16); assert.ok(patrol.enemy.body.velocity.x < 0);
patrol.enemy.x = 1190; patrol.enemy.setData({ patrol: 1000, patrolDirection: 1 }); patrol.player.x = -100;
patrol.controller.update(patrol.enemy, 32, 16); assert.ok(patrol.enemy.body.velocity.x < 0, "낭떠러지 전 회전"); patrol.controller.destroy();
console.log("메롱 꼬마 풍선: 두 번 튀기·부풀기·혀 터짐·좌우·점프·날개 방어·단일 피해·낭떠러지·정지/부활/정리 통과");
