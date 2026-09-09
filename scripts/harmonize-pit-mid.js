import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PALETTE } from "../data/palette.js";
import { hexToRgb } from "./image-utils.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const input = process.argv[2] ?? join(root, "assets", "_source", "backgrounds", "bg_pit_mid_original-v1.png");
const output = process.argv[3] ?? join(root, "assets", "backgrounds", "bg_pit_mid.png");

// 협곡 고유의 실루엣과 투명도는 그대로 두고, 초원 중간 레이어와
// 가장 큰 톤 차이를 만들던 밝은 크림·민트·주황만 대응 색으로 바꾼다.
const replacements = new Map([
  [PALETTE.environmentFar[0], PALETTE.environmentFar[1]],
  [PALETTE.environmentNear[0], PALETTE.environmentMid[1]],
  [PALETTE.environmentNeutral[2], PALETTE.environmentNear[2]]
].map(([from, to]) => [hexToRgb(from).join(","), hexToRgb(to)]));

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const counts = new Map();
for (let offset = 0; offset < data.length; offset += 4) {
  if (data[offset + 3] === 0) continue;
  const key = `${data[offset]},${data[offset + 1]},${data[offset + 2]}`;
  const replacement = replacements.get(key);
  if (!replacement) continue;
  data[offset] = replacement[0];
  data[offset + 1] = replacement[1];
  data[offset + 2] = replacement[2];
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

await mkdir(dirname(output), { recursive: true });
await sharp(data, { raw: info }).png({ compressionLevel: 9 }).toFile(output);

const changed = [...counts.values()].reduce((sum, count) => sum + count, 0);
console.log(`협곡 중간 배경 톤 조화 완료: ${info.width}x${info.height}, ${changed.toLocaleString("ko-KR")}px 변경`);
