import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import level from "../src/data/levels/level-07.js";
import { canHitMerongKing, getTongueBounds, getTongueTrapPhase, MERONG_KING_PHASES, overlapsTongue } from "../src/data/tongueMechanics.js";
import { assertLevelShape, normalizeLevelDefinition } from "../src/data/schema/levelSchema.js";
import { getLevel, getNextLevel, LEVELS } from "../src/data/levels/index.js";
import { getBossDefinition } from "../src/data/bossDefinitions.js";
import { getBossPhasePattern } from "../src/data/bossPatterns.js";
import { getEnemyAnimationSpec } from "../src/data/enemyAnimations.js";
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
console.log("메롱 왕국 검사 통과: 혀 범위·예고 경계·3단계 약점·6번 해금·기록 호환·양 난이도 배치·6포즈 RGBA");
