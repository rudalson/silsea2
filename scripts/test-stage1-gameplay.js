import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import level from "../src/data/levels/level-01.js";
import { CHARACTER_LIST } from "../src/data/characters.js";
import { CORE_RULES, FORMS } from "../src/data/gameplay.js";
import { expandLevelItems, getItemTrigger, getCheckpointTrigger } from "../src/data/levelInteractions.js";
import { assertLevelShape } from "../src/data/schema/levelSchema.js";
import { TransformationManager } from "../src/systems/TransformationManager.js";
import { CheckpointManager } from "../src/systems/CheckpointManager.js";
import { createRuntimeLevel } from "../src/systems/DifficultyManager.js";
import { findLayoutIssues } from "./lib/level-layout.js";

const map = JSON.parse(await readFile(new URL("../assets/levels/level-01/tilemap.json", import.meta.url)));
const terrain = map.layers.find(({ name }) => name === "terrain").objects;
for (const easy of [false, true]) {
  assert.deepEqual(findLayoutIssues(createRuntimeLevel(level, easy), terrain), [], `stage 1 layout (easy=${easy})`);
}
// Regression fixtures reproduce both the enclosed hazard and the buried recovery star.
const oldTerrain = terrain.map((t) => t.name === "orchard_step_3" ? { ...t, height: 48 } : t);
const broken = structuredClone(level);
broken.hazards.push({ id: "enclosed", type: "spike_pumpkin", x: 6080, y: 576 });
broken.items.push({ id: "buried", type: "star", x: 13887, y: 347 });
broken.enemies.push({ id: "hidden_patrol", type: "raw_potato", x: 6208, y: 576, patrol: 176 });
const brokenIssues = findLayoutIssues(broken, oldTerrain).join("\n");
for (const id of ["enclosed", "buried", "hidden_patrol"]) assert.ok(brokenIssues.includes(id), id);

const intersects = (trigger, x, feet, physics) => x + physics.bodyWidth / 2 > trigger.x - trigger.width / 2
  && x - physics.bodyWidth / 2 < trigger.x + trigger.width / 2
  && feet > trigger.y - trigger.height / 2
  && feet - physics.bodyHeight < trigger.y + trigger.height / 2;
const expanded = expandLevelItems(level.items);
for (const { physics, id } of CHARACTER_LIST) {
  for (const item of expanded.filter(({ type }) => ["horn", "wings", "alicorn"].includes(type))) {
    for (const feet of [576, 440, 200, physics.bodyHeight]) {
      assert.ok(intersects(getItemTrigger(item), item.x, feet, physics), `${id} must collect ${item.id} at ${feet}`);
    }
  }
  for (const cp of level.checkpoints) {
    for (const feet of [576, 336, physics.bodyHeight]) {
      assert.ok(intersects(getCheckpointTrigger(cp), cp.x, feet, physics), `${id} must save ${cp.id} at ${feet}`);
    }
  }
}
const invalid = structuredClone(level);
invalid.items[0].activationTop = 0;
assert.throws(() => assertLevelShape(invalid), /변신 아이템/);
invalid.items[0].activationTop = -1;
assert.throws(() => assertLevelShape(invalid), /activationTop/);
assert.deepEqual(getCheckpointTrigger({ x: 100, y: 576 }), { x: 100, y: 528, width: 64, height: 112 });
assert.deepEqual(getItemTrigger({ x: 100, y: 532 }), { x: 100, y: 532, width: 48, height: 48 });

// Use the real state transitions; stub only rendering and the scene clock.
const manager = (retainAbilities = true) => {
  const m = Object.create(TransformationManager.prototype);
  Object.assign(m, {
    retainAbilities, unlockedAbilities: new Set(), form: FORMS.BASE, returnForm: FORMS.BASE,
    flightMs: CORE_RULES.flightMaxMs, guardPhase: "idle", guardCooldownUntil: 0,
    scene: { time: { now: 0 }, events: { emit() {} } },
    player: { body: { blocked: { down: true }, touching: { down: false } } },
    rainbowOverlay: { setVisible() {} }, syncFormVisuals() {}, playTransformPresentation() {}
  });
  return m;
};
const m = manager();
m.collect("horn", 0);
assert.equal(m.magnetRadius, 176);
m.collect("wings", 100);
assert.equal(m.form, FORMS.PEGASUS);
assert.equal(m.magnetRadius, 176, "flight retains the learned magnet");
m.collect("horn", 200);
assert.equal(m.form, FORMS.PEGASUS, "backtracking cannot remove flight");
m.collect("alicorn", 300);
assert.equal(m.magnetRadius, 292);
assert.equal(m.invulnerable, true);
assert.equal(m.scoreMultiplier, 2);
const endsAt = m.alicornEndsAt;
m.collect("wings", 400);
assert.equal(m.form, FORMS.ALICORN);
assert.equal(m.alicornEndsAt, endsAt, "a normal pickup cannot extend or end fever");
const restored = manager();
restored.restoreSnapshot(m.getSnapshot(500), 1500);
assert.equal(restored.alicornEndsAt - 1500, endsAt - 500);
restored.endAlicornSafely();
assert.equal(restored.form, FORMS.PEGASUS);
assert.equal(restored.magnetRadius, 176, "reload + fever expiry retains learned abilities");
assert.equal(restored.invulnerable, false);
assert.equal(restored.scoreMultiplier, 1);
const reversed = manager();
reversed.collect("wings", 0);
assert.equal(reversed.magnetRadius, 0, "wings alone do not grant a never-collected horn");
reversed.collect("alicorn", 1);
reversed.collect("horn", 2);
reversed.endAlicornSafely();
assert.equal(reversed.form, FORMS.PEGASUS);
assert.equal(reversed.magnetRadius, 176);
const legacy = manager(false);
legacy.collect("horn", 0);
legacy.collect("wings", 100);
assert.equal(legacy.magnetRadius, 0, "other stages retain their existing form rules");

for (const direction of ["right", "left"]) {
  const sign = direction === "right" ? 1 : -1;
  const cp = new CheckpointManager({ level: { progression: { direction } }, events: { emit() {} } }, { x: 1000, y: 576 });
  assert.equal(cp.activate({ id: "later", x: 1000 + sign * 300, y: 576 }), true);
  assert.equal(cp.activate({ id: "skipped", x: 1000 + sign * 100, y: 576 }), false);
  assert.equal(cp.activate({ id: "later", x: 1000 + sign * 300, y: 576 }), false);
  const player = { body: { enable: true }, setVelocity() {}, setAlpha() {}, setPosition(x, y) { this.x = x; this.y = y; } };
  cp.scene.time = { delayedCall(_ms, fn) { fn(); } };
  cp.scene.tweens = { add({ onComplete }) { onComplete(); } };
  cp.respawn(player);
  assert.equal(player.x, 1000 + sign * 300);
  assert.equal(player.body.enable, true);
}

// The long pit has a walk/jump fallback; flight offers the faster, higher star route.
const pit = level.hazards.find(({ id }) => id === "pit_long");
const bridge = terrain.filter((t) => t.x >= pit.xStart && t.x < pit.xEnd).sort((a, b) => a.x - b.x);
let edge = pit.xStart;
let floor = 576;
for (const platform of bridge) {
  assert.ok(platform.x - edge <= 96, "bridge gaps stay within a normal jump");
  assert.ok(Math.abs(platform.y - floor) <= 64, "bridge steps remain readable");
  edge = platform.x + platform.width;
  floor = platform.y;
}
assert.ok(pit.xEnd - edge <= 96);
const firstWind = level.terrainMechanics.updrafts[0];
const firstCloud = level.enemies.find(({ id }) => id === "e_cloud_ravine");
assert.ok(firstCloud.triggerX >= firstWind.x + firstWind.width + 160);
const feverStars = expanded.filter((i) => i.type === "star" && i.x >= 11520 && i.x < 13312).length;
assert.ok(feverStars >= 24, "fever has sustained collection rewards");
assert.ok(level.enemies.filter((e) => e.type === "raw_potato" && e.x >= 11808).length >= 3);
console.log(`Stage 1 gameplay checks passed: ${expanded.filter((i) => i.type === "star").length} stars, ${feverStars} fever stars; 3 characters, both difficulties, progression and respawn.`);
