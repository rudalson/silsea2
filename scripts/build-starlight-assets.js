import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PALETTE } from "../data/palette.js";
import { colorDistance, hexToRgb } from "./image-utils.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceRoot = join(root, "assets", "_source", "starlight");
const backgroundRoot = join(root, "assets", "backgrounds");
const decorationRoot = join(root, "assets", "decorations");
const referenceRoot = join(root, "references");
const WIDTH = 2048;
const HEIGHT = 720;
const SEAM_COLUMNS = 2;

const layerPalettes = Object.freeze({
  far: [PALETTE.environmentNight[0], PALETTE.environmentNight[2], PALETTE.environmentFar[0], PALETTE.collect[0], PALETTE.collect[1], PALETTE.environmentNeutral[0]],
  mid: [PALETTE.environmentNight[1], PALETTE.environmentNight[2], PALETTE.environmentNear[1], PALETTE.environmentNeutral[0]],
  near: [PALETTE.environmentNear[1], PALETTE.environmentNight[1], PALETTE.environmentNight[2], PALETTE.environmentNeutral[0], PALETTE.environmentFar[1], PALETTE.collect[0]],
  decor: [
    ...PALETTE.environmentNight,
    PALETTE.environmentNear[1],
    PALETTE.environmentNeutral[0],
    PALETTE.environmentNeutral[2],
    ...PALETTE.environmentFar,
    ...PALETTE.collect
  ]
});

const compiledPalettes = Object.fromEntries(Object.entries(layerPalettes).map(([key, colors]) => [
  key,
  [...new Set(colors)].map((hex) => ({ hex, rgb: hexToRgb(hex) }))
]));

const nearest = (rgb, palette) => palette.reduce((best, candidate) => {
  const distance = colorDistance(rgb, candidate.rgb);
  return distance < best.distance ? { ...candidate, distance } : best;
}, { ...palette[0], distance: Infinity }).rgb;

const removeGeneratedCheckerboard = async (input) => {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let index = 0; index < data.length; index += 4) {
    const rgb = [data[index], data[index + 1], data[index + 2]];
    const minimum = Math.min(...rgb);
    const chroma = Math.max(...rgb) - minimum;
    if (minimum >= 218 && chroma <= 20) {
      data[index] = 0;
      data[index + 1] = 0;
      data[index + 2] = 0;
      data[index + 3] = 0;
    }
  }
  return { data, info };
};

const quantize = (data, paletteKey) => {
  const palette = compiledPalettes[paletteKey];
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 64) {
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

const makeSeamless = (data, width, height) => {
  const source = Buffer.from(data);
  for (let offset = 0; offset < SEAM_COLUMNS; offset += 1) {
    const rightX = width - 1 - offset;
    for (let y = 0; y < height; y += 1) {
      const sourceIndex = (y * width + offset) * 4;
      const targetIndex = (y * width + rightX) * 4;
      source.copy(data, targetIndex, sourceIndex, sourceIndex + 4);
    }
  }
};

const buildBackgroundLayer = async (name, paletteKey, transparent) => {
  const input = join(sourceRoot, `${name}_generated.png`);
  let pipeline;
  if (transparent) {
    const matte = await removeGeneratedCheckerboard(input);
    pipeline = sharp(matte.data, { raw: matte.info });
  } else {
    pipeline = sharp(input).ensureAlpha();
  }
  const { data, info } = await pipeline
    .resize(WIDTH, HEIGHT, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (paletteKey === "near") {
    for (let y = 0; y < 470; y += 1) data.fill(0, y * WIDTH * 4, (y + 1) * WIDTH * 4);
  }
  quantize(data, paletteKey);
  makeSeamless(data, info.width, info.height);
  const output = join(backgroundRoot, `${name}.png`);
  await mkdir(dirname(output), { recursive: true });
  await sharp(data, { raw: info }).png({ compressionLevel: 9 }).toFile(output);
  return output;
};

const normalizeDecoration = async (sheet, rectangle, outputName, width, height) => {
  let minimumX = rectangle.width;
  let minimumY = rectangle.height;
  let maximumX = -1;
  let maximumY = -1;
  for (let y = 0; y < rectangle.height; y += 1) {
    for (let x = 0; x < rectangle.width; x += 1) {
      const sourceX = rectangle.left + x;
      const sourceY = rectangle.top + y;
      const alpha = sheet.data[(sourceY * sheet.info.width + sourceX) * 4 + 3];
      if (alpha < 12) continue;
      minimumX = Math.min(minimumX, x);
      minimumY = Math.min(minimumY, y);
      maximumX = Math.max(maximumX, x);
      maximumY = Math.max(maximumY, y);
    }
  }
  if (maximumX < minimumX || maximumY < minimumY) throw new Error(`${outputName}: 투명 추출 뒤 전경이 없음`);
  const tight = {
    left: rectangle.left + minimumX,
    top: rectangle.top + minimumY,
    width: maximumX - minimumX + 1,
    height: maximumY - minimumY + 1
  };
  const content = await sharp(sheet.data, { raw: sheet.info })
    .extract(tight)
    .resize(width - 24, height - 24, { fit: "inside", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  const contentInfo = await sharp(content).metadata();
  const extracted = await sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{
      input: content,
      left: Math.round((width - contentInfo.width) / 2),
      top: Math.round((height - contentInfo.height) / 2)
    }])
    .raw()
    .toBuffer({ resolveWithObject: true });
  quantize(extracted.data, "decor");
  const output = join(decorationRoot, `${outputName}.png`);
  await mkdir(dirname(output), { recursive: true });
  await sharp(extracted.data, { raw: extracted.info }).png({ compressionLevel: 9 }).toFile(output);
  return output;
};

const buildDecorations = async () => {
  const source = join(sourceRoot, "starlight_decor_generated.png");
  const sheet = await removeGeneratedCheckerboard(source);
  const halfWidth = Math.floor(sheet.info.width / 2);
  const rightWidth = sheet.info.width - halfWidth;
  const topHeight = Math.round(sheet.info.height * 0.65);
  const bottomTop = Math.round(sheet.info.height * 0.6);
  const bottomHeight = sheet.info.height - bottomTop;
  return Promise.all([
    normalizeDecoration(sheet, { left: 0, top: 0, width: halfWidth, height: topHeight }, "decor_star_tree", 640, 640),
    normalizeDecoration(sheet, { left: halfWidth, top: 0, width: rightWidth, height: topHeight }, "decor_moon_branch", 384, 256),
    normalizeDecoration(sheet, { left: 0, top: bottomTop, width: halfWidth, height: bottomHeight }, "decor_firefly", 192, 160),
    normalizeDecoration(sheet, { left: halfWidth, top: bottomTop, width: rightWidth, height: bottomHeight }, "decor_star_flower", 256, 192)
  ]);
};

await mkdir(referenceRoot, { recursive: true });
const far = await buildBackgroundLayer("bg_starlight_far", "far", false);
const mid = await buildBackgroundLayer("bg_starlight_mid", "mid", true);
const near = await buildBackgroundLayer("bg_starlight_near", "near", true);
const [starTree, moonBranch, firefly, starFlower] = await buildDecorations();

const backgroundComposite = await sharp(far)
  .composite([{ input: mid }, { input: near }])
  .png()
  .toBuffer();

await sharp(backgroundComposite)
  .resize(1024, 360)
  .png({ compressionLevel: 9 })
  .toFile(join(referenceRoot, "background-starlight-preview.png"));

const stageBase = await sharp(backgroundComposite).resize(1280, 720).png().toBuffer();
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const treePreview = await sharp(starTree).resize({ width: 390, height: 500, fit: "contain", background: transparent }).png().toBuffer();
const branchPreview = await sharp(moonBranch).resize({ width: 260, height: 180, fit: "contain", background: transparent }).png().toBuffer();
const flowerPreview = await sharp(starFlower).resize({ width: 170, height: 128, fit: "contain", background: transparent }).png().toBuffer();
const flyPreview = await sharp(firefly).resize({ width: 150, height: 125, fit: "contain", background: transparent }).png().toBuffer();
await sharp(stageBase)
  .composite([
    { input: treePreview, left: 785, top: 160 },
    { input: branchPreview, left: 130, top: 445 },
    { input: flowerPreview, left: 1060, top: 532 },
    { input: flyPreview, left: 620, top: 285 }
  ])
  .png({ compressionLevel: 9 })
  .toFile(join(backgroundRoot, "stage_preview_starlight.png"));

console.log("별빛 숲 최종 시각 에셋 생성: 배경 3, 장식 4, 미리보기 2");
