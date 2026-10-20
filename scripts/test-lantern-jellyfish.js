import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import level05 from "../src/data/levels/level-05.js";
import { createRuntimeLevel } from "../src/systems/DifficultyManager.js";
import { LanternJellyfishController } from "../src/systems/LanternJellyfishController.js";

const jellyfish = level05.enemies.filter(({ type }) => type === "lantern_jellyfish");
assert.equal(jellyfish.length, 9);
const counts = level05.environment.waterZones.map((zone) => jellyfish.filter(({ waterZoneId }) => waterZoneId === zone.id).length);
assert.deepEqual(counts, [1, 1, 1, 1, 2, 1, 2]);
assert.equal(createRuntimeLevel(level05, true).enemies.filter(({ type }) => type === "lantern_jellyfish").length, 7);

const map = JSON.parse(await readFile(new URL(level05.assets.tilemap), "utf8"));
const terrain = map.layers.find(({ name }) => name === "terrain").objects;
for (const enemy of jellyfish) {
  const zone = level05.environment.waterZones.find(({ id }) => id === enemy.waterZoneId);
  assert.ok(zone && enemy.x >= zone.xStart + 192 && enemy.x <= zone.xEnd - 192);
  assert.ok(enemy.y >= zone.surfaceY + 180 && enemy.y <= zone.bottomY - 100);
  for (const point of level05.environment.breathPoints.filter(({ zoneId }) => zoneId === zone.id)) {
    assert.ok(Math.abs(enemy.x - point.x) >= 320, `${enemy.id} blocks ${point.id}`);
  }
  const body = { left: enemy.x - 38, right: enemy.x + 38, top: enemy.y - 40, bottom: enemy.y + 40 };
  for (const solid of terrain) {
    const overlap = body.left < solid.x + solid.width && body.right > solid.x
      && body.top < solid.y + solid.height && body.bottom > solid.y;
    assert.ok(!overlap, `${enemy.id} overlaps ${solid.name}`);
  }
}

const data = new Map(Object.entries({ ...jellyfish[0], spawnX: jellyfish[0].x, spawnY: jellyfish[0].y,
  state: "idle", usesArt: true }));
const enemy = {
  x: jellyfish[0].x,
  y: jellyfish[0].y,
  getData: (key) => data.get(key),
  setData(key, value) {
    if (typeof key === "object") for (const [name, entry] of Object.entries(key)) data.set(name, entry);
    else data.set(key, value);
  },
  setFlipX(value) { this.flipX = value; },
  setTint(value) { this.tint = value; },
  clearTint() { this.tint = null; },
  setScale(value) { this.scale = value; },
  body: { reset(x, y) { enemy.x = x; enemy.y = y; } }
};
const scene = { cameras: { main: { worldView: { left: 1000, right: 2000, top: 0, bottom: 768 } } } };
const player = { x: enemy.x + 180, y: enemy.y };
const controller = new LanternJellyfishController(scene, player, level05);
controller.update(enemy, 100);
assert.equal(enemy.getData("state"), "warning");
assert.equal(enemy.flipX, true);
controller.update(enemy, 280);
assert.equal(enemy.getData("state"), "warning");
controller.update(enemy, 820);
assert.equal(enemy.getData("state"), "rush");
const startX = enemy.x;
controller.update(enemy, 1050);
assert.ok(enemy.x > startX && enemy.x < enemy.getData("rushTargetX"));
controller.update(enemy, 1280);
assert.equal(enemy.getData("state"), "recover");
controller.update(enemy, 1620);
assert.ok(enemy.x < enemy.getData("recoverStartX"));
controller.update(enemy, 1960);
assert.equal(enemy.getData("state"), "idle");
assert.equal(enemy.x, enemy.getData("spawnX"));
assert.equal(enemy.tint, null);

console.log("Stage 5 lantern jellyfish placement, clearances, and warning/rush/recovery passed");
