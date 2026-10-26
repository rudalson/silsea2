import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EventEmitter } from "node:events";
import sharp from "sharp";
import level from "../src/data/levels/level-08.js";
import { assertCourseTerrainSafety, getStickySpeedMultiplier } from "../src/data/courseMechanics.js";
import { advanceTapeProjectile, canHitTapeKing, planTapePatches, tapeProjectileHits, TAPE_KING_PHASES } from "../src/data/tapeMechanics.js";
import { assertLevelShape } from "../src/data/schema/levelSchema.js";
import { getLevel, getNextLevel, LEVELS } from "../src/data/levels/index.js";
import { getBossDefinition } from "../src/data/bossDefinitions.js";
import { getBossPhasePattern } from "../src/data/bossPatterns.js";
import { getEnemyAnimationSpec, getEnemySequenceNames } from "../src/data/enemyAnimations.js";
import { ENEMY_DEFINITIONS, isGroundPatrolEnemy, isSimplePatrolEnemy } from "../src/data/enemies.js";
import { ScoreManager } from "../src/systems/ScoreManager.js";
import { createRuntimeLevel } from "../src/systems/DifficultyManager.js";
import { CourseMechanicsManager } from "../src/systems/CourseMechanicsManager.js";
import { ProgressManager } from "../src/systems/ProgressManager.js";
import { findLayoutIssues } from "./lib/level-layout.js";

assertLevelShape(level);
assert.equal(getLevel("level-08"), level);
assert.equal(getNextLevel("level-07"), level);
assert.equal(getNextLevel(LEVELS.at(-1).id), null);
const section = level.sections.at(-1), definition = getBossDefinition("tape_king");
assert.deepEqual(section.boss.phases, definition.phaseIds);
assert.equal(definition.defaultHp, 3);
for (const phase of [1, 2, 3]) assert.equal(getBossPhasePattern("tape_king", phase), TAPE_KING_PHASES[phase]);
assert.deepEqual(TAPE_KING_PHASES[3].steps.map(({ type }) => type), ["patch", "shot", "shot"]);
for (const state of ["dormant", "intro", "warning", "attack", "between", "hurt", "recovery", "defeated"]) {
  assert.equal(canHitTapeKing(state, true), false);
}
assert.equal(canHitTapeKing("vulnerable", true), true);
assert.equal(canHitTapeKing("vulnerable", false), false);

for (const playerX of [section.xStart, 12936, 13200, 13696, 14180, section.xEnd]) {
  const zones = planTapePatches({ playerX, bossX: 13696, section, floorY: 576, count: 2 });
  for (const zone of zones) {
    assert.ok(zone.x >= section.xStart + 80 && zone.x + zone.width <= section.xEnd - 80);
    assert.ok(zone.x + zone.width <= 13696 - 320 || zone.x >= 13696 + 320, "head approach must remain clear");
  }
  if (zones.length > 1) assert.ok(Math.abs(zones[0].x - zones[1].x) >= zones[0].width + 80);
}
assert.equal(planTapePatches({ playerX: 12936, bossX: 13696, section, floorY: 576, count: 2 }).length, 2);
const shot = { x: 1000, previousX: 1000, y: 544, velocityX: -300, elapsedMs: 0, lifetimeMs: 2300, active: true };
const body = { enable: true, left: 820, right: 864, top: 518, bottom: 576 };
const moved = advanceTapeProjectile(shot, 1000);
assert.equal(moved.x, 700);
assert.equal(tapeProjectileHits(moved, body), true, "swept collision must catch skipped positions");
assert.equal(tapeProjectileHits(moved, { ...body, top: 350, bottom: 410 }), false);
assert.equal(tapeProjectileHits(moved, { ...body, enable: false }), false);
assert.equal(advanceTapeProjectile(shot, 2300).active, false);
assert.equal(advanceTapeProjectile(shot, 0).x, 1000, "paused simulation delta cannot move attacks");

const source = JSON.stringify(level), easy = createRuntimeLevel(level, true);
assert.equal(JSON.stringify(level), source);
assert.equal(easy.terrainMechanics.stickyZones[0].speedMultiplier, 0.8);
assert.equal(easy.terrainMechanics.movingPlatforms[0].speed, 57.6);
assert.deepEqual(level.enemies.map(({ type }) => type), ["tape_rollbug", "tape_boxling"]);
assert.deepEqual(easy.enemies.map(({ type }) => type), ["tape_rollbug"], "쉬움에서는 두 번째 박스 꼬마 제거");
for (const type of ["raw_potato", "tape_rollbug", "tape_boxling"]) {
  assert.ok(isSimplePatrolEnemy(type) && isGroundPatrolEnemy(type), `${type} 순찰·지면 충돌 연결`);
  assert.equal(new ScoreManager().defeat(type), 40, `${type} 처치 점수 유지`);
}
assert.ok(isGroundPatrolEnemy("merong_imp") && !isSimplePatrolEnemy("merong_imp"), "메롱 꼬마 전용 풍선 AI·지면 충돌 연결");
assert.equal(new ScoreManager().defeat("merong_imp"), 40, "메롱 꼬마 처치 점수 유지");
assert.equal(isSimplePatrolEnemy("wave_crab"), false, "기존 돌진 적의 개별 동작 유지");
assert.equal(isSimplePatrolEnemy("unknown"), false);
const zone = level.terrainMechanics.stickyZones[0];
const stickyBody = { ...body, left: zone.x + 24, right: zone.x + 68, velocity: { y: 0 }, blocked: { down: true }, touching: {} };
assert.equal(getStickySpeedMultiplier(stickyBody, [zone], true), 0.6);
assert.equal(getStickySpeedMultiplier(stickyBody, [zone], false), 1);
const manager = new CourseMechanicsManager({ events: new EventEmitter() }, { body: stickyBody }, { terrainMechanics: {}, environment: {} }, {});
manager.setTransientStickyZones("boss", [zone]);
manager.setTransientStickyZones("other", [{ ...zone, speedMultiplier: 0.8 }]);
assert.equal(manager.horizontalSpeedMultiplier, 0.6);
manager.clearTransientStickyZones("boss");
assert.equal(manager.horizontalSpeedMultiplier, 0.8);
manager.reset(); assert.equal(manager.horizontalSpeedMultiplier, 1);
manager.setTransientStickyZones("boss", [zone]); manager.finish();
assert.equal(manager.horizontalSpeedMultiplier, 1);
assert.equal(manager.getSnapshot().transientStickyCount, 0);
manager.destroy();
const terrain = JSON.parse(readFileSync(new URL(level.assets.tilemap), "utf8")).layers[0].objects;
for (const candidate of [level, easy]) {
  assert.deepEqual(findLayoutIssues(candidate, terrain), []);
  assertCourseTerrainSafety(candidate, terrain);
}
const invalid = structuredClone(level); invalid.parallax.layerAlpha.near = 2;
assert.throws(() => assertLevelShape(invalid), /layerAlpha/);
const invalidHint = structuredClone(level); invalidHint.terrainMechanics.stickyZones[0].showHint = "false";
assert.throws(() => assertLevelShape(invalidHint), /showHint/);
const progress = new ProgressManager(null); progress.data = {};
assert.equal(progress.isUnlocked(level, LEVELS), false);
progress.complete("level-07", 200, []); assert.equal(progress.isUnlocked(level, LEVELS), true);
progress.complete("level-08", 400, []); assert.equal(progress.get("level-07").bestScore, 200);
for (const role of definition.animationRoles) {
  const spec = getEnemyAnimationSpec("tape_king", role);
  assert.equal(spec.durations.length, 1);
  const { data, info } = await sharp(readFileSync(new URL(`../assets/enemies/tape_king/${spec.textureKey}.png`, import.meta.url)))
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 128); assert.equal(info.height, 128);
  let minX = 128, maxX = 0, maxY = 0, transparent = 0;
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] < 16) { transparent++; continue; }
    minX = Math.min(minX, offset / 4 % 128); maxX = Math.max(maxX, offset / 4 % 128);
    maxY = Math.max(maxY, Math.floor(offset / 4 / 128));
  }
  assert.ok(transparent > 8000 && minX >= 8 && maxX < 120 && maxY >= 110 && maxY <= 112, `${role} transparent margin and baseline`);
}
const manifest = JSON.parse(readFileSync(new URL("../assets/manifest.json", import.meta.url), "utf8"));
for (const type of ["tape_rollbug", "tape_boxling"]) {
  const artBody = ENEMY_DEFINITIONS[type].artBody;
  assert.ok(artBody.width > 0 && artBody.height > 0 && artBody.scale > 0);
  for (const sequence of getEnemySequenceNames(type)) {
    const spec = getEnemyAnimationSpec(type, sequence), entry = manifest.assets.find(({ key }) => key === spec.textureKey);
    assert.equal(entry?.frames, spec.durations.length, `${type}/${sequence} 프레임·시간 매핑`);
    const { data, info } = await sharp(readFileSync(new URL(`..${entry.url}`, import.meta.url))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, 128 * entry.frames); assert.equal(info.height, 128);
    const frameArt = [];
    for (let frame = 0; frame < entry.frames; frame++) {
      let minX = 128, maxX = -1, minY = 128, maxY = -1, clear = 0;
      const pixels = [];
      for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
        const offset = (y * info.width + frame * 128 + x) * 4, alpha = data[offset + 3];
        pixels.push(data[offset], data[offset + 1], data[offset + 2], alpha);
        if (alpha === 0) clear++;
        if (alpha < 16) continue;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      frameArt.push(Buffer.from(pixels));
      assert.ok(clear > 6000, `${type}/${sequence}/${frame} 실제 투명 배경`);
      assert.ok(minX >= 8 && maxX < 120 && minY >= 8, `${type}/${sequence}/${frame} 투명 여백`);
      assert.ok(maxY >= 110 && maxY <= 112, `${type}/${sequence}/${frame} 발 기준선`);
    }
    assert.notDeepEqual(frameArt[0], frameArt[1], `${type}/${sequence} 구분되는 원화 포즈`);
  }
}
console.log("테이프 도시 검사 통과: 해금·보스·투사체·바닥 감속·양 난이도 배치·신규 적 2종 16프레임 RGBA·순찰·40점");
