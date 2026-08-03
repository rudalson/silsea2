import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import sharp from "sharp";
import { nearestPaletteColor } from "./image-utils.js";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("사용법: node scripts/quantize-palette.js <input> <output>");
  process.exit(1);
}

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let index = 0; index < data.length; index += 4) {
  if (data[index + 3] === 0) continue;
  const nearest = nearestPaletteColor([data[index], data[index + 1], data[index + 2]]).rgb;
  data[index] = nearest[0];
  data[index + 1] = nearest[1];
  data[index + 2] = nearest[2];
}

await mkdir(dirname(output), { recursive: true });
await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(output);
console.log(`팔레트 양자화 완료: ${output}`);
