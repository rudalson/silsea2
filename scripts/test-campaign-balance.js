import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { LEVELS } from "../src/data/levels/index.js";
import { buildCampaignExtension, CAMPAIGN_PLAN } from "../src/data/levels/campaignExpansion.js";
import { expandLevelItems } from "../src/data/levelInteractions.js";
import { createRuntimeLevel } from "../src/systems/DifficultyManager.js";
import { findLayoutIssues } from "./lib/level-layout.js";

let previousWidth = LEVELS[0].world.width;
let previousStars = expandLevelItems(LEVELS[0].items).filter(({ type }) => type === "star").length;
for (const level of LEVELS.filter(({ id }) => CAMPAIGN_PLAN[id])) {
  const map = JSON.parse(await readFile(new URL(level.assets.tilemap), "utf8"));
  const terrain = map.layers.find(({ name }) => name === "terrain").objects;
  assert.equal(map.width * map.tilewidth, level.world.width);
  assert.ok(level.world.width > previousWidth, `${level.id}: distance progression`);
  const stars = expandLevelItems(level.items).filter(({ type }) => type === "star");
  assert.ok(stars.length > previousStars, `${level.id}: reward progression`);
  assert.ok(stars.length / level.world.width * 1024 >= 12, "reward density must not collapse as maps grow");
  const goal = level.objectives.optional.find(({ type }) => type === "collect_stars").count;
  assert.ok(goal >= stars.length * 0.5 && goal <= stars.length * 0.7, "main path plus some exploration can satisfy the star goal");
  assert.equal(level.progression.retainAbilities, true);
  for (const easy of [false, true]) {
    const runtime = createRuntimeLevel(level, easy);
    assert.deepEqual(findLayoutIssues(runtime, terrain), [], `${level.id} safe layout, easy=${easy}`);
    assert.ok(runtime.enemies.length <= level.enemies.length);
  }
  const extension = buildCampaignExtension(level.id);
  for (const expected of extension.terrain) {
    const actual = terrain.find(({ name }) => name === expected.name);
    for (const key of ["x", "y", "width", "height", "type"]) assert.equal(actual?.[key], expected[key], `${expected.name}.${key}: map drift`);
  }
  for (const section of extension.sections) {
    assert.ok(stars.filter(({ x }) => x >= section.xStart && x < section.xEnd).length >= 40);
  }
  // Stage 5 remains a breathing/navigation challenge; no fever bypass of oxygen.
  if (level.order === 5) {
    assert.ok(!level.items.some(({ type }) => type === "alicorn"));
    for (const zone of extension.waterZones) {
      const air = [zone.xStart, ...extension.breathPoints.filter((p) => p.zoneId === zone.id).map(({ x }) => x), zone.xEnd].sort((a, b) => a - b);
      for (let i = 1; i < air.length; i++) {
        // 270px/s swimming, with at least 5 seconds reserved for ascent/recovery.
        assert.ok((air[i] - air[i - 1]) / 270 <= 7, `${zone.id}: unsafe breathing gap`);
      }
    }
  }
  if (level.order === 4) {
    const shelters = extension.shelters.slice().sort((a, b) => a.xStart - b.xStart);
    for (let i = 1; i < shelters.length; i++) assert.ok(shelters[i].xStart - shelters[i - 1].xEnd <= 900);
  }
  previousWidth = level.world.width;
  previousStars = stars.length;
  console.log(`${level.id}: ${level.world.width}px, ${stars.length} stars, ${level.enemies.length} enemies — both difficulties passed`);
}
