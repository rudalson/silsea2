import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import level from "../src/data/levels/level-07.js";
import { canHitMerongKing, getTongueBounds, getTongueTrapPhase, MERONG_KING_PHASES, overlapsTongue } from "../src/data/tongueMechanics.js";
import { assertLevelShape, normalizeLevelDefinition } from "../src/data/schema/levelSchema.js";
import { getLevel, getNextLevel, LEVELS } from "../src/data/levels/index.js";
import { getBossDefinition } from "../src/data/bossDefinitions.js";
import { getBossPhasePattern } from "../src/data/bossPatterns.js";
import { getEnemyAnimationSpec, getEnemySequenceNames } from "../src/data/enemyAnimations.js";
import { ENEMY_TYPES, isGroundPatrolEnemy } from "../src/data/enemies.js";
import { ScoreManager } from "../src/systems/ScoreManager.js";
import { createRuntimeLevel } from "../src/systems/DifficultyManager.js";
import { findLayoutIssues } from "./lib/level-layout.js";
import { ProgressManager } from "../src/systems/ProgressManager.js";
import { EventEmitter } from "node:events";
import { TongueTrapManager } from "../src/systems/TongueTrapManager.js";
import { MerongKingBehavior } from "../src/systems/bosses/MerongKingBehavior.js";

function presentationScene(art) {
  const objects = [], texts = [];
  const display = (x = 0, y = 0) => {
    const data = {}, object = { x, y, active: true, visible: true, scaleX: 1, scaleY: 1,
      setPosition(x, y) { Object.assign(this, { x, y }); return this; },
      setVisible(value) { this.visible = value; return this; },
      setActive(value) { this.active = value; return this; },
      setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; },
      setFlipX(value) { this.flipX = value; return this; },
      setData(key, value) { typeof key === "object" ? Object.assign(data, key) : data[key] = value; return this; },
      getData: key => data[key], play(key) { this.animation = key; return this; }, destroy() { this.active = false; } };
    for (const key of ["setOrigin", "setDepth", "setStrokeStyle", "setAlpha", "fillStyle", "fillEllipse", "fillCircle",
      "lineStyle", "strokeEllipse", "strokeCircle", "lineBetween", "fillRoundedRect", "strokeRoundedRect", "clear"]) object[key] = () => object;
    object.scene = scene; objects.push(object); return object;
  };
  const scene = { events: new EventEmitter(), textures: { exists: () => art }, anims: { exists: () => true },
    add: { sprite: display, ellipse: display, circle: display, star: display, graphics: display,
      text: (...args) => { texts.push(args[2]); return display(args[0], args[1]); } } };
  return { scene, objects, texts, display };
}

// Mirroring must move the attack mouth, never the sentry's body. Anticipation
// uses the existing cheek pose and stays harmless until the actual tongue.
for (const art of [false, true]) for (const authoredDirection of [-1, 1]) for (const y of [470, 554]) {
  const f = presentationScene(art), config = { id: "sentry", x: 1000, y, direction: authoredDirection,
    reach: 256, warningMs: 1200, activeMs: 650, restMs: 2000, triggerDistance: 400, practice: false };
  const original = JSON.stringify(config), player = { x: 800, body: { enable: true } }, hits = [];
  const place = x => { player.x = x; Object.assign(player.body, { left: x - 20, right: x + 20, top: y - 20, bottom: y + 20 }); };
  const manager = new TongueTrapManager(f.scene, player, { environment: { tongueTraps: [config] } }, { takeDamage: (...args) => hits.push(args) });
  const entry = manager.entries[0], bodyX = entry.x;
  place(bodyX - 150); manager.update(0);
  assert.equal(entry.phase, "warning"); assert.equal(entry.direction, -1);
  assert.equal(entry.tongue.visual.visible, false); assert.equal(entry.tongue.bounds, null);
  assert.deepEqual(f.texts, [], "문구·점프 지시·공격 범위 안내판 생성 없음");
  const locked = { ...entry.attack }; place(bodyX + 150); manager.update(200);
  assert.deepEqual(entry.attack, locked, "준비 동작 시작 후 방향 고정"); assert.equal(hits.length, 0);
  if (art) { assert.equal(entry.sprite.x, bodyX); assert.equal(entry.sprite.flipX, true); assert.ok(entry.sprite.scaleX > 0.76); }
  else assert.ok(entry.fallback.eye.x < bodyX);
  manager.update(config.warningMs - 200 + 160);
  assert.equal(entry.phase, "attack"); assert.equal(entry.direction, -1); assert.equal(hits.length, 0, "반대쪽 플레이어는 공격받지 않음");
  assert.equal(entry.tongue.bounds.x + entry.tongue.bounds.width, bodyX - 40 * 0.76, "왼쪽 입과 실제 혀 시작점 일치");
  place(bodyX - 150); manager.update(1); assert.equal(hits.length, 1, "왼쪽 실제 혀 피해");
  place(bodyX + 150); manager.update(config.activeMs - 160);
  assert.equal(entry.phase, "rest"); assert.equal(entry.direction, 1); assert.equal(entry.attack, null);
  if (art) { assert.equal(entry.sprite.x, bodyX); assert.equal(entry.sprite.flipX, false); assert.equal(entry.sprite.scaleX, 0.76); }
  else assert.ok(entry.fallback.eye.x > bodyX);
  manager.update(config.restMs); assert.equal(entry.phase, "warning"); assert.equal(entry.direction, 1);
  assert.equal(entry.tongue.visual.visible, false); assert.equal(entry.attack.x, bodyX + 40 * 0.76);
  place(bodyX - 150); manager.update(config.warningMs + 160);
  assert.equal(entry.direction, 1); assert.equal(hits.length, 1, "다음 오른쪽 공격도 준비 후 추적하지 않음");
  assert.equal(entry.tongue.bounds.x, bodyX + 40 * 0.76, "오른쪽 입과 실제 혀 시작점 일치");
  place(bodyX + 150); manager.update(1); assert.equal(hits.length, 2, "오른쪽 실제 혀 피해");
  config.practice = true; manager.update(1); assert.equal(hits.length, 2, "연습 문지기는 양방향 모두 무피해"); config.practice = false;
  manager.reset(); assert.equal(entry.phase, "idle"); assert.equal(entry.attack, null); assert.equal(entry.tongue.active, false);
  assert.equal(JSON.stringify(config), original, "레벨 원본 설정 보존");
  manager.destroy(); assert.ok(f.objects.every(object => !object.active)); assert.equal(f.scene.events.listenerCount("player:respawned"), 0);
}

for (const art of [false, true]) {
  const f = presentationScene(art), boss = f.display(1800, 576);
  boss.body = { top: 470, enable: true }; boss.setData({ key: "merong_king", usesArt: art, phase: 1, section: { xStart: 0, xEnd: 2400 } });
  const player = { x: 1000, body: { enable: true, left: 980, right: 1020, top: 518, bottom: 576 } };
  const b = new MerongKingBehavior({ scene: f.scene, player, levelLoader: { boss }, healthManager: { takeDamage() {} },
    telegraphMultiplier: 1, vulnerabilityMultiplier: 1 });
  b.update(0, 16); assert.equal(boss.flipX, false, "대왕의 원화는 왼쪽이 기본 방향");
  player.x = 2100; b.update(0, 100); assert.equal(boss.flipX, true, "대왕도 대기 중 주인공 쪽으로 회전");
  b.update(0, 900); assert.equal(b.state, "warning"); assert.equal(b.tongue.visual.visible, false);
  player.x = 1000; b.update(0, 200); assert.equal(boss.flipX, true); assert.equal(b.attack.direction, 1);
  b.update(0, 1000); b.update(0, 160); assert.equal(b.state, "attack"); assert.ok(b.tongue.bounds.x > boss.x);
  b.update(0, 600); b.update(0, 16); assert.equal(boss.flipX, false, "공격 후 다시 주인공 위치를 바라봄");
  b.destroy();
}

assertLevelShape(level);
assert.equal(getLevel("level-07"), level);
assert.equal(getNextLevel("level-05"), level);
assert.equal(getNextLevel(LEVELS.at(-1).id), null);
const definition = getBossDefinition("merong_king");
assert.equal(definition.defaultHp, 3);
assert.deepEqual(level.sections.at(-1).boss.phases, definition.phaseIds);
for (const phase of [1, 2, 3]) {
  const pattern = getBossPhasePattern("merong_king", phase);
  assert.equal(pattern, MERONG_KING_PHASES[phase]);
  assert.equal(pattern.attacks.length, phase);
  assert.ok(pattern.warningMs >= 1000 && pattern.vulnerabilityMs >= 2600);
  const lanes = pattern.attacks.map(({ laneOffset }) => laneOffset);
  if (phase > 1) assert.ok(lanes.includes(22) && lanes.includes(106));
}
for (const state of ["dormant", "intro", "warning", "attack", "between", "hurt", "recovery", "defeated"]) {
  assert.equal(canHitMerongKing(state, true), false);
}
assert.equal(canHitMerongKing("vulnerable", true), true);
assert.equal(canHitMerongKing("vulnerable", false), false);
const bounds = getTongueBounds({ x: 1000, y: 554, direction: -1, reach: 540 });
assert.deepEqual(bounds, { x: 460, y: 542, width: 540, height: 24 });
assert.equal(getTongueBounds({ x: 1000, y: 554, direction: 1, reach: 540 }, 0.5).width, 270);
assert.equal(overlapsTongue({ enable: true, left: 600, right: 644, top: 518, bottom: 576 }, bounds), true);
assert.equal(overlapsTongue({ enable: true, left: 600, right: 644, top: 400, bottom: 458 }, bounds), false);
assert.equal(overlapsTongue({ enable: false, left: 600, right: 644, top: 518, bottom: 576 }, bounds), false);
const trap = level.environment.tongueTraps[0];
assert.equal(getTongueTrapPhase(null, trap), "idle");
assert.equal(getTongueTrapPhase(0, trap), "warning");
assert.equal(getTongueTrapPhase(trap.warningMs, trap), "attack");
assert.equal(getTongueTrapPhase(trap.warningMs + trap.activeMs, trap), "rest");
const before = JSON.stringify(level);
const easy = createRuntimeLevel(normalizeLevelDefinition(level), true);
assert.equal(easy.environment.tongueTraps[0].warningMs, 1680);
assert.equal(JSON.stringify(level), before);
assert.ok(level.enemies.every(({ type }) => type === "merong_imp"));
assert.ok(ENEMY_TYPES.includes("merong_imp") && isGroundPatrolEnemy("merong_imp"));
assert.equal(easy.enemies.length, 1, "쉬움에서는 두 번째 메롱 꼬마 제거");
assert.equal(new ScoreManager().defeat("merong_imp"), 40, "기존 순찰 적의 처치 점수 유지");
const bad = structuredClone(level);
bad.environment.tongueTraps[0].x = level.world.width;
assert.throws(() => assertLevelShape(bad), /world 밖/);
const badEasy = structuredClone(level);
badEasy.difficulty.easyMode.environment.tongueWarningMultiplier = -1;
assert.throws(() => assertLevelShape(badEasy), /tongueWarningMultiplier/);
const terrain = JSON.parse(readFileSync(new URL(level.assets.tilemap), "utf8")).layers[0].objects;
assert.deepEqual(findLayoutIssues(level, terrain), []);
assert.deepEqual(findLayoutIssues(easy, terrain), []);
const progress = new ProgressManager(null);
progress.data = {};
assert.equal(progress.isUnlocked(level, LEVELS), false);
progress.complete("level-05", 300, []);
assert.equal(progress.isUnlocked(level, LEVELS), true);
progress.complete("level-07", 450, ["no_damage"]);
assert.equal(progress.get("level-05").bestScore, 300);
assert.equal(progress.get("level-07").cleared, true);
for (const role of definition.animationRoles) {
  const spec = getEnemyAnimationSpec("merong_king", role);
  assert.equal(spec.durations.length, 1);
  const path = new URL(`../assets/enemies/merong_king/${spec.textureKey}.png`, import.meta.url);
  const { data, info } = await sharp(readFileSync(path)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 128); assert.equal(info.height, 128);
  let minX = 128, maxX = 0, maxY = 0;
  for (let pixel = 0; pixel < data.length; pixel += 4) if (data[pixel + 3] >= 16) {
    const x = pixel / 4 % 128, y = Math.floor(pixel / 4 / 128);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  assert.ok(minX >= 8 && maxX < 120 && maxY >= 110 && maxY <= 112, `${role} 프레임 여백·발 기준선`);
}
const manifest = JSON.parse(readFileSync(new URL("../assets/manifest.json", import.meta.url), "utf8"));
for (const type of ["merong_sentry", "merong_imp"]) {
  for (const sequence of getEnemySequenceNames(type)) {
    const spec = getEnemyAnimationSpec(type, sequence);
    const entry = manifest.assets.find(({ key }) => key === spec.textureKey);
    assert.equal(entry?.frames, spec.durations.length, `${type}/${sequence} manifest·애니메이션 일치`);
    const { data, info } = await sharp(readFileSync(new URL(`..${entry.url}`, import.meta.url))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, 128 * entry.frames); assert.equal(info.height, 128);
    for (let frame = 0; frame < entry.frames; frame++) {
      let minX = 128, maxX = -1, minY = 128, maxY = -1, clear = 0;
      for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
        const alpha = data[(y * info.width + frame * 128 + x) * 4 + 3];
        if (alpha === 0) clear++;
        if (alpha < 16) continue;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      assert.ok(clear > 6000, `${type}/${sequence}/${frame} 실제 투명 배경`);
      assert.ok(minX >= 8 && maxX < 120 && minY >= 8, `${type}/${sequence}/${frame} 잘림 없는 여백`);
      assert.ok(maxY >= 110 && maxY <= 112, `${type}/${sequence}/${frame} 발 기준선`);
    }
  }
}
console.log("메롱 왕국 검사 통과: 안내판/범위 예고 제거·표정 준비·좌우 반전/방향 고정·입 정렬/실제 피해·보스·해금·기록·양 난이도·RGBA·처치 점수");
