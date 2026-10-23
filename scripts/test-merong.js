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
console.log("메롱 왕국 검사 통과: 혀 범위·예고 경계·보스·해금·기록·양 난이도 배치·신규 적 2종 7상태 RGBA·처치 점수");
