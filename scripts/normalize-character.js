import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import sharp from "sharp";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("사용법: node scripts/normalize-character.js <input> <output>");
  process.exit(1);
}

const trimmed = await sharp(input).ensureAlpha().trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
const metadata = await sharp(trimmed).metadata();
const scale = Math.min(96 / metadata.height, 112 / metadata.width);
const width = Math.max(1, Math.round(metadata.width * scale));
const height = Math.max(1, Math.round(metadata.height * scale));
const resized = await sharp(trimmed).resize(width, height, { fit: "fill" }).png().toBuffer();
const left = Math.round((128 - width) / 2);
const top = 128 - 16 - height;

await mkdir(dirname(output), { recursive: true });
await sharp({ create: { width: 128, height: 128, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: resized, left, top }])
  .png()
  .toFile(output);
console.log(`캐릭터 정규화 완료: ${output} (${width}x${height}, baseline 16px)`);
