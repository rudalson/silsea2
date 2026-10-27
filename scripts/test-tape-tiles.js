import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import level from "../src/data/levels/level-08.js";
import { LEVELS } from "../src/data/levels/index.js";
import { createRuntimeLevel } from "../src/systems/DifficultyManager.js";
import { TerrainMechanicsManager } from "../src/systems/TerrainMechanicsManager.js";

const specification = JSON.parse(await readFile("assets/_source/tape-tiles/prompts.json", "utf8"));
for (const [path, expected] of Object.entries(specification.preserved)) {
  assert.equal(createHash("sha256").update(await readFile(path)).digest("hex"), expected, `${path} 기존 원본 보존`);
}
assert.equal(specification.prompts.length, 2); assert.equal(level.assets.tileset, "tape_tileset");
assert.ok(LEVELS.filter(item => item.id !== level.id).every(item => item.assets.tileset !== "tape_tileset"));
for (const easy of [false, true]) assert.equal(createRuntimeLevel(level, easy).assets.tileset, "tape_tileset");
const manifest = JSON.parse(await readFile("assets/manifest.json", "utf8"));
assert.ok(manifest.assets.some(entry => entry.key === "tape_tileset" && entry.type === "atlas" && entry.frames === 16));
const atlas = JSON.parse(await readFile("assets/tiles/tape_tileset.json", "utf8"));
const { data, info } = await sharp("assets/tiles/tape_tileset.png").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
assert.equal(info.width, 272); assert.equal(info.height, 272); assert.equal(atlas.meta.fullColor, true);
assert.equal(atlas.meta.extrude, 2); assert.equal(atlas.meta.tileSize, 64); assert.equal(Object.keys(atlas.frames).length, 16);
const pixel = (name, x, y) => {
  const f = atlas.frames[name].frame, offset = ((f.y + y) * info.width + f.x + x) * 4;
  return [...data.subarray(offset, offset + 4)];
};
for (let y = 0; y < 64; y++) {
  for (const name of ["grass_top", "platform_mid"]) assert.deepEqual(pixel(name, 0, y), pixel(name, 63, y), `${name} 좌우 연결`);
  assert.deepEqual(pixel("dirt", 63, y), pixel("dirt_variant", 0, y), "종이층 변형 좌우 연결");
}
for (let x = 0; x < 64; x++) {
  assert.deepEqual(pixel("grass_top", x, 63), pixel("dirt", x, 0), "상단과 단면 세로 연결");
  assert.deepEqual(pixel("dirt", x, 63), pixel("dirt_variant", x, 0), "종이층 변형 세로 연결");
  assert.deepEqual(pixel("dirt_variant", x, 63), pixel("dirt", x, 0), "변형에서 기본 단면 연결");
}
for (const name of ["grass_top", "dirt", "dirt_variant", "platform_mid"]) for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
  assert.equal(pixel(name, x, y)[3], 255, `${name} 빈틈 없는 불투명 지형`);
}
const gold = pixel("grass_top", 32, 8), teal = pixel("grass_top", 32, 18), paper = pixel("dirt", 32, 32);
assert.ok(gold[0] > gold[2] + 40, "금빛 테이프 표면"); assert.ok(teal[1] > teal[0] + 30, "청록 장식 띠");
assert.ok(paper[0] > 170 && paper[1] > 140 && paper[0] >= paper[1] && paper[1] >= paper[2], "밝은 크림 종이층");
assert.equal(pixel("slope_up", 0, 0)[3], 0); assert.equal(pixel("slope_down", 63, 0)[3], 0);
assert.equal(pixel("grass_inner_left", 0, 0)[3], 0); assert.equal(pixel("grass_inner_right", 63, 0)[3], 0);
const manager = new TerrainMechanicsManager({ textures: { exists: key => key === "tape_tileset" } }, {}, { tileset: "tape_tileset" });
assert.equal(manager.tilesetKey, "tape_tileset", "이동 발판에 전용 타일 선택");
const fallback = new TerrainMechanicsManager({ textures: { exists: () => false } }, {}, { tileset: "tape_tileset" });
assert.equal(fallback.tilesetKey, null, "타일 미로드 시 기존 도형 fallback 유지");
console.log("테이프 도시 타일: 16프레임·좌우/상하 무봉제·불투명 바닥·금빛/청록/크림·이동 발판·양 난이도·배경/충돌/공용 타일 보존 통과");
