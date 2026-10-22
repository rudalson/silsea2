import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import level05 from "../src/data/levels/level-05.js";
import { expandLevelItems } from "../src/data/levelInteractions.js";
import { BreathManager } from "../src/systems/BreathManager.js";

const pearls = expandLevelItems(level05.items).filter(({ type }) => type === "breath_pearl");
assert.equal(pearls.length, 14);
const map = JSON.parse(await readFile(new URL(level05.assets.tilemap), "utf8"));
const terrain = map.layers.find(({ name }) => name === "terrain").objects;
for (const zone of level05.environment.waterZones) {
  const placed = pearls.filter(({ x }) => x >= zone.xStart && x <= zone.xEnd);
  assert.equal(placed.length, 2, `${zone.id} needs two breath pearls`);
  assert.ok(Math.abs(placed[0].x - placed[1].x) >= 400, `${zone.id} pearls are too close together`);
  for (const pearl of placed) {
    assert.ok(pearl.y > zone.surfaceY + 100 && pearl.y < zone.bottomY - 50);
    for (const point of level05.environment.breathPoints.filter(({ zoneId }) => zoneId === zone.id)) {
      assert.ok(Math.abs(pearl.x - point.x) >= 160, `${pearl.id} is too close to ${point.id}`);
    }
    for (const enemy of level05.enemies.filter(({ waterZoneId }) => waterZoneId === zone.id)) {
      assert.ok(Math.abs(pearl.x - enemy.x) >= 80 || Math.abs(pearl.y - enemy.y) >= 90,
        `${pearl.id} overlaps ${enemy.id}`);
    }
    const box = { left: pearl.x - 24, right: pearl.x + 24, top: pearl.y - 24, bottom: pearl.y + 24 };
    for (const solid of terrain) {
      assert.ok(!(box.left < solid.x + solid.width && box.right > solid.x
        && box.top < solid.y + solid.height && box.bottom > solid.y), `${pearl.id} overlaps ${solid.name}`);
    }
  }
}

const sounds = [];
const events = [];
const scene = {
  time: { now: 0 },
  events: { on() {}, off() {}, emit(key, payload) { events.push({ key, payload }); } },
  audioManager: { playSfx(key) { sounds.push(key); } }
};
const player = { x: 500, y: 600, body: { top: 510, bottom: 600, height: 90 } };
const environment = { waterZones: [{ id: "test_water", xStart: 0, xEnd: 1000, surfaceY: 320, bottomY: 704 }] };
const manager = new BreathManager(scene, player, environment, { takeEnvironmentDamage() {} }, { form: "base" }, { depleteSeconds: 12 });
manager.update(6000, 6000);
assert.equal(manager.getSnapshot().ratio, 0.5);
assert.equal(manager.collectBreathPearl(), true);
assert.equal(manager.getSnapshot().maxSeconds, 16);
assert.equal(manager.getSnapshot().capacityBonusSeconds, 4);
assert.equal(manager.getSnapshot().ratio, 1);
manager.update(10000, 4000);
assert.equal(manager.getSnapshot().ratio, 0.75);
assert.equal(manager.collectBreathPearl(), true);
assert.equal(manager.getSnapshot().maxSeconds, 16, "later pearls refill without stacking capacity");
assert.equal(manager.getSnapshot().ratio, 1);
assert.equal(sounds.filter((key) => key === "sfx_breath_refill").length, 2);

const saved = manager.getSnapshot();
const restored = new BreathManager(scene, player, environment, { takeEnvironmentDamage() {} }, { form: "base" }, { depleteSeconds: 12 });
restored.restoreSnapshot(saved);
assert.equal(restored.getSnapshot().maxSeconds, 16);
assert.equal(restored.getSnapshot().ratio, 1);
assert.ok(events.some(({ payload }) => payload?.capacityBonusSeconds === 4));
manager.destroy();
restored.destroy();

console.log("Stage 5 breath pearl placement, capacity, refill, and restore passed");
