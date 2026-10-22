import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assertCourseTerrainSafety, createRhythmState, getStickySpeedMultiplier, getTimedHolePhase, stepRhythm
} from "../src/data/courseMechanics.js";
import course from "../src/data/levels/new-course-test.js";
import { ALL_LEVELS, DEVELOPMENT_LEVELS, LEVELS } from "../src/data/levels/index.js";
import { assertLevelShape } from "../src/data/schema/levelSchema.js";
import { createRuntimeLevel } from "../src/systems/DifficultyManager.js";
import { prepareHotReloadLevel } from "../src/systems/LevelHotReload.js";

assertLevelShape(course);
assert.ok(DEVELOPMENT_LEVELS.includes(course) && ALL_LEVELS.includes(course) && !LEVELS.includes(course));
assert.equal(course.developmentOnly, true);
const zone = course.terrainMechanics.stickyZones[0];
const body = { enable: true, left: 560, right: 604, bottom: 576 };
assert.equal(getStickySpeedMultiplier(body, [zone], true), 0.6);
assert.equal(getStickySpeedMultiplier(body, [zone], false), 1, "jumping must escape ground friction");
assert.equal(getStickySpeedMultiplier({ ...body, bottom: 480 }, [zone], true), 1);
assert.equal(getStickySpeedMultiplier({ ...body, enable: false }, [zone], true), 1, "respawn must not retain friction");
assert.equal(getStickySpeedMultiplier({ ...body, left: 1000, right: 1044 }, [zone], true), 1);
assert.equal(getStickySpeedMultiplier(body, [zone, { ...zone, speedMultiplier: 0.8 }], true), 0.6, "overlap uses strongest effect once");

const config = course.environment.rhythmZones[0];
const input = { deltaMs: 0, inside: true, grounded: true, moving: false };
const step = (state, deltaMs, extra = {}) => stepRhythm(state, { ...input, deltaMs, ...extra }, config);
let state = step(createRhythmState(), 16, { grounded: false });
assert.equal(state.phase, "waiting", "no stop challenge starts in midair");
state = step(state, 16);
assert.equal(state.phase, "warning");
assert.equal(step(state, 1500, { inside: false }).phase, "waiting");
state = step(state, config.warningMs);
assert.equal(state.phase, "stop");
assert.equal(step(state, 4999).phase, "stop");
const paused = step(state, 60000, { paused: true, moving: true });
assert.equal(paused, state, "paused time and inputs never consume or fail a wait");
state = step(state, 4999);
assert.equal(step(state, 1).phase, "success", "wait requires the full 5000ms");
assert.equal(step(step(state, 1), 16, { moving: true }).phase, "success");
const failed = step(state, 1, { moving: true });
assert.equal(failed.phase, "retry");
assert.equal(failed.failures, 1);
assert.equal(step(failed, 20, { moving: true }).failures, 1, "failure cannot cause repeated damage every frame");
assert.equal(step(failed, config.retryMs).phase, "warning");
assert.equal(step(failed, config.retryMs, { inside: false }).phase, "waiting");

const hole = course.terrainMechanics.timedHoles[0];
assert.equal(getTimedHolePhase(null, hole), "closed");
assert.equal(getTimedHolePhase(0, hole), "warning");
assert.equal(getTimedHolePhase(hole.warningMs - 1, hole), "warning");
assert.equal(getTimedHolePhase(hole.warningMs, hole), "open");
assert.equal(getTimedHolePhase(hole.warningMs + hole.openMs, hole), "closed");
assert.equal(getTimedHolePhase(hole.warningMs + hole.openMs + hole.closedMs, hole), "warning");

const original = JSON.stringify(course);
const easy = createRuntimeLevel(course, true);
assert.equal(easy.terrainMechanics.stickyZones[0].speedMultiplier, 0.8);
assert.equal(easy.terrainMechanics.timedHoles[0].warningMs, 2100);
assert.equal(easy.environment.rhythmZones[0].stopMs, 5000);
assert.equal(JSON.stringify(course), original, "easy mode must preserve source data");
assert.equal(prepareHotReloadLevel(course, { expectedId: course.id, currentLevel: course, easyMode: true }).level.terrainMechanics.stickyZones[0].speedMultiplier, 0.8);

const rejects = (change, pattern) => {
  const invalid = structuredClone(course);
  change(invalid);
  assert.throws(() => assertLevelShape(invalid), pattern);
};
rejects((level) => { level.terrainMechanics.stickyZones = {}; }, /stickyZones/);
rejects((level) => { level.terrainMechanics.stickyZones[0].speedMultiplier = 0; }, /speedMultiplier/);
rejects((level) => { level.terrainMechanics.timedHoles[0].warningMs = Number.NaN; }, /warningMs/);
rejects((level) => { level.terrainMechanics.timedHoles[1].x = hole.x + 128; }, /안전 발판/);
rejects((level) => { level.environment.rhythmZones[0].id = zone.id; }, /중복/);
rejects((level) => { level.environment.rhythmZones[0].stopMs = 0; }, /stopMs/);
rejects((level) => { level.enemies.push({ id: "unsafe", x: 1700, patrol: 80 }); }, /위험 장치/);
rejects((level) => { level.difficulty.easyMode.terrainMechanics.stickySpeedFloor = 2; }, /stickySpeedFloor/);

const map = JSON.parse(readFileSync(new URL(course.assets.tilemap), "utf8"));
const terrain = map.layers[0].objects;
assertCourseTerrainSafety(course, terrain);
assert.throws(() => assertCourseTerrainSafety(course, [...terrain, { ...hole, height: 192 }]), /고정 충돌/);
assert.throws(() => assertCourseTerrainSafety(course, terrain.filter((floor) => floor.x !== 3584)), /안전 발판/);
assert.throws(() => assertCourseTerrainSafety(course, terrain.map((floor) => ({ ...floor, y: floor.y + 8 }))), /안전 발판/);
for (const gap of course.terrainMechanics.timedHoles) {
  assert.ok(!terrain.some((floor) => floor.x < gap.x + gap.width && floor.x + floor.width > gap.x), "an open hole must actually remove support");
}
console.log("새 코스 장치 검사 통과: 감속·공중 해제·5초 정지·실패 재도전·일시정지·개폐 경계·쉬운 모드·스키마·바닥 일치");
