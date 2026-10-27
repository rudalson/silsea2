import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { LEVELS } from "../src/data/levels/index.js";
import { STAGE_COLLECTIBLES, getCollectibleGoalText, getStageCollectible } from "../src/data/stageCollectibles.js";
import { createRuntimeLevel } from "../src/systems/DifficultyManager.js";
import { expandLevelItems, getItemTrigger } from "../src/data/levelInteractions.js";
import { getObjectiveCelebrations, getObjectiveDetail } from "../src/data/objectivePresentation.js";
import { getResultStickerLayout } from "../src/data/resultStickers.js";
import { createCollectibleFallback } from "../src/systems/CollectibleVisuals.js";
import { ObjectiveManager } from "../src/systems/ObjectiveManager.js";
import { ScoreManager } from "../src/systems/ScoreManager.js";

const manifest = JSON.parse(await readFile(new URL("../assets/manifest.json", import.meta.url), "utf8"));
assert.equal(new Set(STAGE_COLLECTIBLES.map(theme => theme.shape)).size, 5, "다섯 코스의 서로 다른 실루엣");
const hashes = new Set();
for (const level of LEVELS) for (const easy of [false, true]) {
  const runtime = createRuntimeLevel(level, easy), theme = getStageCollectible(runtime);
  const newer = Number(level.id.slice(-2)) >= 7;
  assert.equal(theme.themed, newer, `${level.id}: 메롱 이전에는 기존 별 유지`);
  if (!newer) { assert.equal(theme.key, "item_star"); continue; }
  const expected = STAGE_COLLECTIBLES[Number(level.id.slice(-2)) - 7];
  assert.equal(theme, expected);
  const expanded = expandLevelItems(runtime.items), items = expanded.filter(item => item.type === "star");
  assert.ok(items.length > 70 && items.every(item => getItemTrigger(item).width === 48), "기존 호 배치·수집 판정 유지");
  const target = runtime.objectives.optional.find(goal => goal.type === "collect_stars");
  const objective = new ObjectiveManager(null, runtime.objectives), score = new ScoreManager();
  for (let index = 0; index < target.count; index++) { objective.addStars(1); score.collect("star"); }
  assert.equal(objective.getSnapshot().find(goal => goal.type === "collect_stars").complete, true);
  assert.equal(objective.context.starCount, target.count);
  assert.equal(getCollectibleGoalText(runtime, target.count), `${theme.name} ${target.count}/${target.count}`);
  assert.equal(getObjectiveDetail(target, runtime), `${theme.name} ${target.count}개 모으기`);
  const card = getObjectiveCelebrations(runtime, ["collect_stars"]).cards[0];
  assert.equal(card.title, `${theme.name} 수집가`); assert.equal(card.textureKey, theme.key);
  const sticker = getResultStickerLayout(["collect_stars"], runtime).find(item => item.key === "collect_stars");
  assert.equal(sticker.textureKey, theme.key); assert.equal(sticker.label, card.title);
  assert.equal(getObjectiveDetail(target), `별 ${target.count}개 모으기`, "기존 결과 API 호환");
}
for (const theme of STAGE_COLLECTIBLES) {
  const entry = manifest.assets.find(item => item.key === theme.key);
  assert.equal(entry?.type, "image");
  const png = await readFile(new URL(`..${entry.url}`, import.meta.url));
  hashes.add(png.toString("base64"));
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 128); assert.equal(info.height, 128);
  let minX = 128, minY = 128, maxX = -1, maxY = -1, opaque = 0;
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) if (data[(y * 128 + x) * 4 + 3] >= 16) {
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); opaque++;
  }
  assert.ok(minX >= 24 && minY >= 24 && maxX < 104 && maxY < 104, `${theme.key} 투명 여백·잘림 방지`);
  assert.ok(maxX - minX >= 40 && maxY - minY >= 40 && opaque > 1000, `${theme.key} 작은 화면 실루엣 유지`);
  if (theme.shape === "ring") assert.equal(data[(64 * 128 + 64) * 4 + 3], 0, "고리 중앙은 실제 투명 구멍");
  const commands = [];
  const graphic = new Proxy({}, { get(_target, key) { return (...args) => { commands.push([key, ...args]); return graphic; }; } });
  assert.equal(createCollectibleFallback({ add: { graphics: () => graphic } }, theme, 100, 200), graphic);
  assert.ok(commands.some(([command]) => ["fillPoints", "fillCircle", "strokeCircle"].includes(command)), `${theme.key} 원화 누락 시에도 테마 도형 렌더링`);
}
assert.equal(hashes.size, 5, "색만 바꾼 공용 이미지가 아닌 전용 원화");
assert.equal(getStageCollectible().name, "별");
console.log("스테이지 수집물: 5종 실루엣·RGBA·고리 투명 구멍·양 난이도·기존 코스 유지·수집 목표/결과/스티커·fallback 통과");
