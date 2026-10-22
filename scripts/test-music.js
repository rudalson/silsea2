import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EventEmitter } from "node:events";
import sharp from "sharp";
import level from "../src/data/levels/level-09.js";
import { assertLevelShape } from "../src/data/schema/levelSchema.js";
import { createRhythmState, stepRhythm, assertCourseTerrainSafety } from "../src/data/courseMechanics.js";
import { advanceMusicNote, canHitMusicKing, isMusicRestSafe, musicNoteHits, MUSIC_KING_PHASES, MUSIC_REST_CONFIG } from "../src/data/musicMechanics.js";
import { getLevel, getNextLevel, LEVELS } from "../src/data/levels/index.js";
import { getBossDefinition } from "../src/data/bossDefinitions.js";
import { getBossPhasePattern } from "../src/data/bossPatterns.js";
import { getEnemyAnimationSpec } from "../src/data/enemyAnimations.js";
import { createRuntimeLevel } from "../src/systems/DifficultyManager.js";
import { CourseMechanicsManager } from "../src/systems/CourseMechanicsManager.js";
import { rhythmInputMoving } from "../src/systems/RhythmSignal.js";
import { ProgressManager } from "../src/systems/ProgressManager.js";
import { findLayoutIssues } from "./lib/level-layout.js";

assertLevelShape(level); assert.equal(getLevel("level-09"), level); assert.equal(getNextLevel("level-08"), level);
assert.equal(getNextLevel(LEVELS.at(-1).id), null);
const definition = getBossDefinition("music_king");
assert.deepEqual(level.sections.at(-1).boss.phases, definition.phaseIds);
for (const phase of [1, 2, 3]) assert.equal(getBossPhasePattern("music_king", phase), MUSIC_KING_PHASES[phase]);
assert.equal(MUSIC_KING_PHASES[1].restRequired, false); assert.equal(MUSIC_KING_PHASES[2].restRequired, true);
assert.deepEqual(MUSIC_KING_PHASES[3].lanes, [32, 108, 32]); assert.equal(MUSIC_REST_CONFIG.stopMs, 5000);
for (const state of ["dormant", "intro", "warning", "attack", "between", "rhythm", "hurt", "recovery", "defeated"]) assert.equal(canHitMusicKing(state, true), false);
assert.equal(canHitMusicKing("vulnerable", true), true); assert.equal(canHitMusicKing("vulnerable", false), false);
const section = level.sections.at(-1), bossX = section.boss.spawn.x;
const safeBody = { enable: true, center: { x: bossX - 400 }, bottom: 576 };
assert.equal(isMusicRestSafe(safeBody, bossX, section, 576), true);
assert.equal(isMusicRestSafe({ ...safeBody, center: { x: bossX - 100 } }, bossX, section, 576), false);
assert.equal(isMusicRestSafe({ ...safeBody, bottom: 400 }, bossX, section, 576), false);
assert.equal(rhythmInputMoving({ moveX: 0.19 }, 0.2), false); assert.equal(rhythmInputMoving({ moveX: 0.21 }, 0.2), true);
assert.equal(rhythmInputMoving({ jumpPressed: true }, 0.2), true);
const input = { deltaMs: 0, inside: true, grounded: true, moving: false };
let rest = stepRhythm(createRhythmState(), { ...input, grounded: false }, MUSIC_REST_CONFIG); assert.equal(rest.phase, "waiting");
rest = stepRhythm(rest, input, MUSIC_REST_CONFIG); assert.equal(rest.phase, "warning");
rest = stepRhythm(rest, { ...input, deltaMs: 1500 }, MUSIC_REST_CONFIG); assert.equal(rest.phase, "stop");
assert.equal(stepRhythm(rest, { ...input, deltaMs: 60000, paused: true }, MUSIC_REST_CONFIG), rest);
rest = stepRhythm(rest, { ...input, deltaMs: 4999 }, MUSIC_REST_CONFIG); assert.equal(rest.phase, "stop");
assert.equal(stepRhythm(rest, { ...input, deltaMs: 1 }, MUSIC_REST_CONFIG).phase, "success");
const failed = stepRhythm(rest, { ...input, moving: true }, MUSIC_REST_CONFIG); assert.equal(failed.failures, 1);
assert.equal(stepRhythm(failed, { ...input, deltaMs: 100, moving: true }, MUSIC_REST_CONFIG).failures, 1);
const note = { x: 1000, previousX: 1000, y: 544, velocityX: -300, elapsedMs: 0, lifetimeMs: 2200, active: true };
assert.equal(musicNoteHits(advanceMusicNote(note, 1000), { enable: true, left: 820, right: 864, top: 518, bottom: 576 }), true);
assert.equal(musicNoteHits(note, { enable: false }), false); assert.equal(advanceMusicNote(note, 2200).active, false);

const makeDisplay = () => ({ body: null, setOrigin() { return this; }, setDepth() { return this; }, setText() { return this; },
  setColor() { return this; }, setStrokeStyle() { return this; }, setVisible(value) { this.visible = value; return this; }, destroy() {} });
const fake = { events: new EventEmitter(), add: { rectangle: makeDisplay, text: makeDisplay },
  physics: { add: { existing(object) { object.body = { enable: true }; }, collider() { return { destroy() {} }; } } } };
const config = level.environment.rhythmZones[0], player = { bufferedJumpUntil: 10,
  x: config.xStart + 100, body: { enable: true, bottom: 576, velocity: { y: 0 }, blocked: { down: true }, touching: {} } };
const manager = new CourseMechanicsManager(fake, player, { environment: { rhythmZones: [config] } }, {});
const entry = manager.rhythms[0]; assert.equal(entry.gate.body.enable, true);
manager.update({}, 16); manager.update({}, 1500); assert.equal(player.bufferedJumpUntil, -Infinity);
manager.update({}, 4999); assert.equal(entry.gate.body.enable, true);
manager.update({}, 1); assert.equal(entry.gate.body.enable, false);
manager.reset({ preserveRequiredSuccess: true }); assert.equal(entry.state.phase, "success");
manager.reset(); assert.equal(entry.gate.body.enable, true); manager.restoreCompletedRhythms([config.id]); assert.equal(entry.gate.body.enable, false);
manager.finish(); assert.equal(entry.gate.body.enable, false); manager.destroy();
const original = JSON.stringify(level), easy = createRuntimeLevel(level, true);
assert.equal(easy.environment.rhythmZones[0].warningMs, 2100); assert.equal(easy.environment.rhythmZones[0].stopMs, 5000);
assert.equal(JSON.stringify(level), original);
const terrain = JSON.parse(readFileSync(new URL(level.assets.tilemap), "utf8")).layers[0].objects;
for (const candidate of [level, easy]) { assert.deepEqual(findLayoutIssues(candidate, terrain), []); assertCourseTerrainSafety(candidate, terrain); }
const bad = structuredClone(level); bad.environment.rhythmZones[0].requireSuccess = "yes"; assert.throws(() => assertLevelShape(bad), /requireSuccess/);
const badEasy = structuredClone(level); badEasy.difficulty.easyMode.environment.rhythmWarningMultiplier = 0.5; assert.throws(() => assertLevelShape(badEasy), /rhythmWarningMultiplier/);
const progress = new ProgressManager(null); progress.data = {}; assert.equal(progress.isUnlocked(level, LEVELS), false);
progress.complete("level-08", 200, []); assert.equal(progress.isUnlocked(level, LEVELS), true);
progress.complete("level-09", 400, []); assert.equal(progress.get("level-08").bestScore, 200);
for (const role of definition.animationRoles) {
  const spec = getEnemyAnimationSpec("music_king", role);
  const { data, info } = await sharp(readFileSync(new URL(`../assets/enemies/music_king/${spec.textureKey}.png`, import.meta.url))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 128); assert.equal(info.height, 128); assert.equal(spec.durations.length, 1);
  let transparent = 0, bottom = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] < 16) transparent++; else bottom = Math.max(bottom, Math.floor(i / 4 / 128));
  assert.ok(transparent > 8000 && bottom >= 110 && bottom <= 112, role);
}
const wavs = ["warning", "stop", "go"].map((cue) => readFileSync(new URL(`../assets/audio/sfx/sfx_rhythm_${cue}.wav`, import.meta.url)));
for (const wav of wavs) { assert.equal(wav.toString("ascii", 0, 4), "RIFF"); assert.ok(wav.length > 10000); }
assert.ok(!wavs[0].equals(wavs[1]) && !wavs[1].equals(wavs[2]));
console.log("피아노 나라 검사 통과: 9번 해금·정확한 5초·정지 문·실패 1회·공중 대기·부활/재로드 성공 보존·3단계·신호음·RGBA");
