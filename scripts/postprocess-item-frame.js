import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, join, parse } from "node:path";
import sharp from "sharp";
import { PALETTE } from "../data/palette.js";
import { colorDistance, hexToRgb } from "./image-utils.js";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("사용법: node scripts/postprocess-item-frame.js <chroma-input> <final-output>");
  process.exit(1);
}

const userRoot = process.env.USERPROFILE;
if (!userRoot) throw new Error("USERPROFILE을 찾을 수 없습니다.");

const python = join(userRoot, ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "python", "python.exe");
const chromaHelper = join(userRoot, ".codex", "skills", ".system", "imagegen", "scripts", "remove_chroma_key.py");
const parsed = parse(input);
const alphaPath = join(parsed.dir, `${parsed.name}_alpha.png`);

const removed = spawnSync(python, [
  chromaHelper,
  "--input", input,
  "--out", alphaPath,
  "--force",
  "--auto-key", "border",
  "--soft-matte",
  "--transparent-threshold", "12",
  "--opaque-threshold", "220",
  "--despill"
], { encoding: "utf8" });

if (removed.status !== 0) {
  process.stderr.write(removed.stderr || removed.stdout);
  process.exit(removed.status ?? 1);
}

const collectPalette = PALETTE.collect.map((hex) => ({ hex, rgb: hexToRgb(hex) }));
const nearestCollectColor = (rgb) => collectPalette.reduce(
  (best, candidate) => {
    const distance = colorDistance(rgb, candidate.rgb);
    return distance < best.distance ? { ...candidate, distance } : best;
  },
  { ...collectPalette[0], distance: Infinity }
);

const quantize = async (buffer) => {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) continue;
    const rgb = nearestCollectColor([data[index], data[index + 1], data[index + 2]]).rgb;
    data[index] = rgb[0];
    data[index + 1] = rgb[1];
    data[index + 2] = rgb[2];
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
};

const firstPass = await quantize(alphaPath);
const trimmed = await sharp(firstPass)
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();
const metadata = await sharp(trimmed).metadata();
const outputName = parse(output).base.toLowerCase();
const targetSize = outputName === "item_percent_small_anchor.png" || outputName === "item_percent_small.png"
  ? 72
  : outputName === "rainbow_gate_anchor.png" || outputName === "rainbow_gate.png"
    ? 112
    : 96;
const scale = Math.min(targetSize / metadata.width, targetSize / metadata.height);
const width = Math.max(1, Math.round(metadata.width * scale));
const height = Math.max(1, Math.round(metadata.height * scale));
const resized = await sharp(trimmed).resize(width, height, { fit: "fill" }).png().toBuffer();
const normalized = await sharp({
  create: { width: 128, height: 128, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
}).composite([{
  input: resized,
  left: Math.round((128 - width) / 2),
  top: Math.round((128 - height) / 2)
}]).png().toBuffer();

await mkdir(dirname(output), { recursive: true });
await sharp(await quantize(normalized)).png().toFile(output);
console.log(`${parse(output).base}: ${width}x${height}, 128x128 RGBA, collect 팔레트 잠금`);
