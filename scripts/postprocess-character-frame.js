import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, join, parse } from "node:path";
import sharp from "sharp";
import { nearestPaletteColor } from "./image-utils.js";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("사용법: node scripts/postprocess-character-frame.js <chroma-input> <final-output>");
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

const quantize = async (buffer) => {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) continue;
    const rgb = nearestPaletteColor([data[index], data[index + 1], data[index + 2]]).rgb;
    data[index] = rgb[0];
    data[index + 1] = rgb[1];
    data[index + 2] = rgb[2];
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
};

const firstPass = await quantize(alphaPath);
const trimmed = await sharp(firstPass).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
const metadata = await sharp(trimmed).metadata();
const outputName = parse(output).base.toLowerCase();
const silseaFrame = outputName.startsWith("silsea_");
const potatoFrame = outputName.startsWith("potato89_");
const frameScale = {
  "dark_cloud_idle_01.png": 0.98,
  "dark_cloud_idle_02.png": 0.96,
  "dark_cloud_idle_03.png": 0.98,
  "dark_cloud_charge_00.png": 0.93,
  "dark_cloud_charge_01.png": 0.86,
  "dark_cloud_charge_02.png": 0.79,
  "dark_cloud_charge_03.png": 0.73,
  "dark_cloud_attack_00.png": 0.82,
  "dark_cloud_attack_02.png": 0.92,
  "dark_cloud_defeated_00.png": 0.92,
  "dark_cloud_defeated_01.png": 0.84,
  "dark_cloud_defeated_02.png": 0.74,
  "dark_cloud_defeated_03.png": 0.64,
  "potato_king_defeated_05.png": 0.95,
  "potato_king_defeated_06.png": 0.88,
  "potato_king_defeated_07.png": 0.80
}[outputName] ?? 1;
const scale = Math.min(96 / metadata.height, 112 / metadata.width) * frameScale;
const width = silseaFrame ? 112 : potatoFrame ? 98 : Math.max(1, Math.round(metadata.width * scale));
const height = silseaFrame ? 93 : potatoFrame ? 96 : Math.max(1, Math.round(metadata.height * scale));
const resized = await sharp(trimmed).resize(width, height, { fit: "fill" }).png().toBuffer();
const normalized = await sharp({
  create: { width: 128, height: 128, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
}).composite([{ input: resized, left: Math.round((128 - width) / 2), top: 128 - 16 - height }]).png().toBuffer();
const final = await quantize(normalized);

await mkdir(dirname(output), { recursive: true });
await sharp(final).png().toFile(output);
console.log(`${parse(output).base}: ${width}x${height}, baseline 16px`);
