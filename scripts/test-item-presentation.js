import assert from "node:assert/strict";
import {
  ITEM_EFFECT_LIMITS,
  TRANSFORMATION_ITEM_TYPES,
  applyItemReviewMode,
  getItemPresentation,
  getItemReviewMode,
  isItemEffectVisible,
  isTransformationItem
} from "../src/data/itemPresentation.js";
import { PARTICLE_EFFECTS, PARTICLE_LIMITS } from "../src/data/particleEffects.js";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

assert.deepEqual(TRANSFORMATION_ITEM_TYPES, ["horn", "wings", "alicorn"]);
assert.equal(isTransformationItem("horn"), true);
assert.equal(isTransformationItem("star"), false);

const phases = TRANSFORMATION_ITEM_TYPES.map((type) => getItemPresentation(type).phaseMs);
assert.equal(new Set(phases).size, 3, "세 아이템의 반짝임 위상은 달라야 한다");
for (const type of TRANSFORMATION_ITEM_TYPES) {
  const normal = getItemPresentation(type, "normal");
  const reduced = getItemPresentation(type, "reduced");
  assert.ok(reduced.twinkleCount < normal.twinkleCount);
  assert.ok(reduced.intervalMultiplier > normal.intervalMultiplier);
}
assert.equal(PARTICLE_LIMITS.itemGlitterPerType, ITEM_EFFECT_LIMITS.maxParticlesPerType);
assert.ok(PARTICLE_EFFECTS.itemGlitter.speedY.min > 0, "글리터는 아래 방향으로 출발해야 한다");
assert.ok(PARTICLE_EFFECTS.itemGlitter.gravityY > 0, "글리터는 아래로 가속되어야 한다");

const view = { x: 100, y: 100, width: 400, height: 300 };
assert.equal(isItemEffectVisible({ active: true, x: 250, y: 200 }, view), true);
assert.equal(isItemEffectVisible({ active: true, x: 900, y: 200 }, view), false);
assert.equal(isItemEffectVisible({ active: false, x: 250, y: 200 }, view), false);

assert.equal(getItemReviewMode("?itemReview=1"), "all");
assert.equal(getItemReviewMode("?itemReview=all"), "all");
assert.equal(getItemReviewMode("?itemReview=no"), null);

const sourceLevel = {
  id: "review-test",
  progression: { direction: "right" },
  world: { width: 1600 },
  player: { spawn: { x: 128, y: 576 } },
  items: [
    { id: "keep-star", type: "star", x: 200, y: 400 },
    { id: "old-horn", type: "horn", x: 1000, y: 400 }
  ]
};
const reviewed = applyItemReviewMode(sourceLevel, "all");
assert.equal(sourceLevel.items.length, 2, "검수 모드는 원본을 변경하지 않아야 한다");
assert.equal(reviewed.items.filter(({ type }) => isTransformationItem(type)).length, 3);
assert.deepEqual(reviewed.items.filter(({ type }) => isTransformationItem(type)).map(({ type }) => type), TRANSFORMATION_ITEM_TYPES);
assert.equal(reviewed.items.some(({ id }) => id === "keep-star"), false, "검수 화면에는 세 변신 아이템만 둔다");

const gameSceneSource = await readFile(fileURLToPath(new URL("../src/scenes/GameScene.js", import.meta.url)), "utf8");
assert.match(
  gameSceneSource,
  /transformationManager\.collect\(collectible\.type, this\.time\.now\)/,
  "세 변신 아이템은 기존 즉시 변신 진입점을 유지해야 한다"
);

console.log("Transformation item presentation tests passed.");
