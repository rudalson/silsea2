import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PALETTE } from "../data/palette.js";
import { colorDistance, hexToRgb } from "./image-utils.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceRoot = join(root, "assets", "_source", "s6");
const outputRoot = join(root, "assets", "decorations");
const referenceRoot = join(root, "references");
const ALPHA_CUTOFF = 96;

const specs = Object.freeze([
  {
    key: "decor_grass",
    source: "decor_grass_generated_v1.png",
    width: 192,
    height: 128,
    maxWidth: 184,
    maxHeight: 104,
    palette: [PALETTE.environmentNear[0], PALETTE.environmentMid[0], PALETTE.environmentNear[1], PALETTE.outline]
  },
  {
    key: "decor_flower",
    source: "decor_flower_generated_v1.png",
    width: 128,
    height: 128,
    maxWidth: 120,
    maxHeight: 120,
    palette: [PALETTE.base[1], PALETTE.base[2], PALETTE.environmentNeutral[2], PALETTE.environmentNear[0], PALETTE.environmentNear[1], PALETTE.outline]
  },
  {
    key: "decor_rock",
    source: "decor_rock_generated_v1.png",
    width: 160,
    height: 128,
    maxWidth: 152,
    maxHeight: 104,
    palette: [PALETTE.environmentNeutral[1], PALETTE.shadow[0], PALETTE.environmentNeutral[0], PALETTE.outline]
  },
  {
    key: "decor_sign",
    source: "decor_sign_generated_v1.png",
    width: 160,
    height: 192,
    maxWidth: 124,
    maxHeight: 180,
    palette: [PALETTE.environmentNeutral[2], PALETTE.environmentNear[2], PALETTE.shadow[2], PALETTE.outline]
  }
]);

const compilePalette = (hexes) => [...new Set(hexes)].map((hex) => ({ hex, rgb: hexToRgb(hex) }));

const nearest = (rgb, palette) => palette.reduce((best, candidate) => {
  const distance = colorDistance(rgb, candidate.rgb);
  return distance < best.distance ? { ...candidate, distance } : best;
}, { ...palette[0], distance: Infinity }).rgb;

const findOpaqueBounds = (data, info) => {
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * 4 + 3];
      if (alpha === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) throw new Error("투명 추출 뒤 전경이 없습니다.");
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
};

const quantizeAndHardenAlpha = (data, palette) => {
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < ALPHA_CUTOFF) {
      data[index] = 0;
      data[index + 1] = 0;
      data[index + 2] = 0;
      data[index + 3] = 0;
      continue;
    }
    const rgb = nearest([data[index], data[index + 1], data[index + 2]], palette);
    data[index] = rgb[0];
    data[index + 1] = rgb[1];
    data[index + 2] = rgb[2];
    data[index + 3] = 255;
  }
};

const buildAsset = async (spec) => {
  const input = join(sourceRoot, spec.source);
  const palette = compilePalette(spec.palette);
  const source = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  quantizeAndHardenAlpha(source.data, palette);
  const bounds = findOpaqueBounds(source.data, source.info);
  const trimmed = await sharp(source.data, { raw: source.info })
    .extract(bounds)
    .resize(spec.maxWidth, spec.maxHeight, { fit: "inside", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  const trimmedInfo = await sharp(trimmed).metadata();
  const canvas = await sharp({
    create: { width: spec.width, height: spec.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{
      input: trimmed,
      left: Math.round((spec.width - trimmedInfo.width) / 2),
      top: spec.height - trimmedInfo.height - 4
    }])
    .raw()
    .toBuffer({ resolveWithObject: true });
  quantizeAndHardenAlpha(canvas.data, palette);
  const finalBounds = findOpaqueBounds(canvas.data, canvas.info);
  const output = join(outputRoot, `${spec.key}.png`);
  await mkdir(dirname(output), { recursive: true });
  await sharp(canvas.data, { raw: canvas.info }).png({ compressionLevel: 9 }).toFile(output);
  return { ...spec, output, bounds: finalBounds };
};

const results = [];
for (const spec of specs) results.push(await buildAsset(spec));

const slotWidth = 256;
const sheetWidth = slotWidth * results.length;
const sheetHeight = 256;
const background = { r: 241, g: 246, b: 250, alpha: 1 };
const composites = [];
for (let index = 0; index < results.length; index += 1) {
  const result = results[index];
  const preview = await sharp(result.output)
    .resize({ width: 176, height: 184, fit: "inside" })
    .png()
    .toBuffer();
  const metadata = await sharp(preview).metadata();
  composites.push({
    input: preview,
    left: index * slotWidth + Math.round((slotWidth - metadata.width) / 2),
    top: sheetHeight - metadata.height - 28
  });
}
await mkdir(referenceRoot, { recursive: true });
await sharp({ create: { width: sheetWidth, height: sheetHeight, channels: 4, background } })
  .composite(composites)
  .png({ compressionLevel: 9 })
  .toFile(join(referenceRoot, "s6-decor-final-contact-sheet.png"));

for (const result of results) {
  console.log(`${result.key}: ${result.width}x${result.height}, opaque ${result.bounds.width}x${result.bounds.height}`);
}
