import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import level from "../src/data/levels/level-07.js";
import rainbow from "../src/data/levels/level-01.js";
import { createRuntimeLevel } from "../src/systems/DifficultyManager.js";

const specification = JSON.parse(await readFile("assets/_source/merong-environment/prompts.json", "utf8"));
const far = await readFile("assets/backgrounds/bg_merong_far.png");
assert.equal(createHash("sha256").update(far).digest("hex").toUpperCase(), specification.preserved.far, "사용자가 유지하라고 한 큰 배경 원본 보존");
assert.equal(specification.prompts.length, 6, "여섯 환경 원화의 정확한 생성 프롬프트 보존");
for (const mood of ["normal", "boss"]) {
  assert.equal(level.assets.backgrounds[mood].far, "bg_merong_far");
  for (const layer of ["mid", "near"]) {
    assert.equal(level.assets.backgrounds[mood][layer], `bg_merong_${layer}`);
    assert.notEqual(level.assets.backgrounds[mood][layer], rainbow.assets.backgrounds.normal[layer]);
    const { data, info } = await sharp(`assets/backgrounds/bg_merong_${layer}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, 2048); assert.equal(info.height, 720);
    let clear = 0, centerClear = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * 4 + 3];
      if (alpha < 16) clear++;
      if (x >= 850 && x < 1200 && y < 360 && alpha < 16) centerClear++;
    }
    assert.ok(clear / (info.width * info.height) > 0.25, `${layer} 실제 투명 배경`);
    assert.ok(centerClear / (350 * 360) > 0.9, `${layer} 큰 배경이 보이는 중앙 시야 확보`);
  }
}
assert.equal(level.assets.tileset, "merong_tileset"); assert.notEqual(level.assets.tileset, rainbow.assets.tileset);
assert.equal(level.assets.objects.checkpoint, "decor_merong_lantern"); assert.equal(level.checkpointPresentation.height, 144);
const atlas = JSON.parse(await readFile("assets/tiles/merong_tileset.json", "utf8"));
assert.equal(Object.keys(atlas.frames).length, 16); assert.equal(atlas.meta.fullColor, true);
assert.equal(atlas.meta.extrude, 2); assert.equal(atlas.meta.tileSize, 64);
for (const [key, width, height] of [["planter", 192, 160], ["lantern", 96, 176], ["palace", 384, 448]]) {
  const { data, info } = await sharp(`assets/decorations/decor_merong_${key}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, width); assert.equal(info.height, height);
  assert.equal(data[3], 0); assert.equal(data[(width * height - 1) * 4 + 3], 0);
  if (key === "palace") assert.equal(data[(Math.floor(height / 2) * width + Math.floor(width / 2)) * 4 + 3], 0, "궁전 아치 안쪽까지 투명");
}
const manifest = JSON.parse(await readFile("assets/manifest.json", "utf8"));
for (const key of ["bg_merong_mid", "bg_merong_near", "merong_tileset", ...Object.values(level.assets.decorations)]) {
  assert.ok(manifest.assets.some(asset => asset.key === key), `${key} 로컬 에셋 등록`);
}
assert.ok(level.decorations.length >= 15);
assert.ok(level.decorations.every(decoration => ["planter", "lantern"].includes(decoration.asset) && decoration.depth < 0), "전용 소품은 플레이어와 적 뒤에 표시");
assert.equal(createRuntimeLevel(level, true).decorations.length, level.decorations.length, "양 난이도 전용 환경 유지");
console.log("메롱 환경 검사 통과: 큰 배경 원본 보존·무지개 언덕 에셋 분리·중경/근경 알파와 중앙 시야·전용 타일/체크포인트/궁전/다리·양 난이도 배치");
