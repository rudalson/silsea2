import { access } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { colorDistance, paletteRgb } from "./image-utils.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const sequenceAssets = (character, sequence, count) => Array.from({ length: count }, (_, index) => {
  const frame = `${character}_${sequence}_${String(index).padStart(2, "0")}.png`;
  return { name: frame, path: join(root, "assets", "characters", character, sequence, frame) };
});
const assets = [
  { name: "silsea_anchor.png", path: join(root, "assets", "_anchor", "silsea_anchor.png") },
  { name: "potato89_anchor.png", path: join(root, "assets", "_anchor", "potato89_anchor.png") },
  ...sequenceAssets("silsea", "run", 8),
  ...sequenceAssets("potato89", "roll", 8),
  ...sequenceAssets("silsea", "idle", 4),
  ...sequenceAssets("potato89", "idle", 4),
  ...sequenceAssets("silsea", "jump_up", 2),
  ...sequenceAssets("silsea", "fall", 2),
  ...sequenceAssets("potato89", "jump_up", 2),
  ...sequenceAssets("potato89", "fall", 2),
  ...sequenceAssets("silsea", "land", 2),
  ...sequenceAssets("silsea", "hurt", 2),
  ...sequenceAssets("potato89", "land", 2),
  ...sequenceAssets("potato89", "hurt", 2)
];
const errors = [];

for (const asset of assets) {
  const { name, path } = asset;
  try {
    await access(path);
  } catch {
    errors.push(`${name}: 파일 없음`);
    continue;
  }
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== 128 || info.height !== 128 || info.channels !== 4) errors.push(`${name}: 128x128 RGBA가 아님`);
  const cornerAlpha = [3, (info.width - 1) * 4 + 3, (info.width * (info.height - 1)) * 4 + 3, (info.width * info.height - 1) * 4 + 3];
  if (cornerAlpha.some((index) => data[index] > 8)) errors.push(`${name}: 모서리가 투명하지 않음`);
  let opaque = 0;
  let outside = 0;
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 16) continue;
    opaque += 1;
    const pixel = index / 4;
    const x = pixel % info.width;
    const y = Math.floor(pixel / info.width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    const rgb = [data[index], data[index + 1], data[index + 2]];
    if (Math.min(...paletteRgb.map((entry) => colorDistance(rgb, entry.rgb))) > 8) outside += 1;
  }
  if (!opaque) errors.push(`${name}: 불투명 픽셀이 없음`);
  if (opaque && outside / opaque > 0.05) errors.push(`${name}: 팔레트 외 픽셀 5% 초과`);
  if (opaque) {
    const subjectHeight = maxY - minY + 1;
    const baseline = info.height - (maxY + 1);
    if (subjectHeight < 91 || subjectHeight > 101) errors.push(`${name}: 캐릭터 높이 ${subjectHeight}px (96px ±5% 아님)`);
    if (Math.abs(baseline - 16) > 2) errors.push(`${name}: 발 기준선 ${baseline}px (16px ±2 아님)`);
    if (minX < 8 || info.width - maxX - 1 < 8) errors.push(`${name}: 좌우 여백 8px 미만`);
  }
}

if (errors.length) {
  console.error(`캐릭터 에셋 검증 실패 (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`캐릭터 에셋 ${assets.length}개 검증 통과: 128x128 RGBA, 높이 96px ±5%, 기준선 16px ±2, 좌우 여백 8px, 팔레트 잠금`);
