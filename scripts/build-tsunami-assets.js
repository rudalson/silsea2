import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { buildTsunamiBackgroundLayer } from "./build-tsunami-backgrounds.js";
import { buildStorybookStagePreview } from "./build-storybook-stage-previews.js";
import { PALETTE } from "../data/palette.js";
import { colorDistance, hexToRgb } from "./image-utils.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceRoot = join(root, "assets", "_source", "tsunami", "final");
const environmentRoot = join(root, "assets", "environment");
const effectRoot = join(root, "assets", "effects");
const referenceRoot = join(root, "references");
const WAVE_FRAME_WIDTH = 384;
const WAVE_FRAME_HEIGHT = 512;
const WAVE_FRAMES = 8;
const WAVE_SOURCE = join(sourceRoot, "tsunami_wave_v2_cutout.png");

const palettes = Object.freeze({
  props: [PALETTE.environmentFar[0], PALETTE.environmentNeutral[2], PALETTE.shadow[2], PALETTE.bgFar[1], PALETTE.environmentNeutral[1], PALETTE.environmentNeutral[0], PALETTE.outline, PALETTE.highlight[0], PALETTE.bgFar[0]],
  effects: [PALETTE.collect[1], PALETTE.bgFar[1], PALETTE.highlight[0], PALETTE.highlight[1], PALETTE.outline, ...PALETTE.danger],
  wave: [PALETTE.collect[1], PALETTE.environmentSky[0], PALETTE.bgFar[1], PALETTE.bgMid[1], PALETTE.environmentNear[1], PALETTE.highlight[0], PALETTE.environmentFar[0], PALETTE.outline]
});

const compiledPalettes = Object.fromEntries(Object.entries(palettes).map(([key, colors]) => [
  key,
  [...new Set(colors)].map((hex) => ({ hex, rgb: hexToRgb(hex) }))
]));

const nearest = (rgb, palette) => palette.reduce((best, candidate) => {
  const distance = colorDistance(rgb, candidate.rgb);
  return distance < best.distance ? { ...candidate, distance } : best;
}, { ...palette[0], distance: Infinity }).rgb;

const quantize = (data, paletteKey, preserveAlpha = false) => {
  const palette = compiledPalettes[paletteKey];
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 48) {
      data.fill(0, index, index + 4);
      continue;
    }
    const rgb = nearest([data[index], data[index + 1], data[index + 2]], palette);
    data[index] = rgb[0];
    data[index + 1] = rgb[1];
    data[index + 2] = rgb[2];
    if (!preserveAlpha) data[index + 3] = 255;
  }
};

const loadTransparentSource = async (input) => {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 48) {
      data.fill(0, index, index + 4);
      continue;
    }
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const minimum = Math.min(red, green, blue);
    const maximum = Math.max(red, green, blue);
    if (minimum >= 226 && maximum - minimum <= 24) data.fill(0, index, index + 4);
  }
  return { data, info };
};

const buildShelter = async (sourceName, outputName, width = 448, height = 336) => {
  const source = await loadTransparentSource(join(sourceRoot, sourceName));
  const trimmed = await sharp(source.data, { raw: source.info })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 })
    .png()
    .toBuffer();
  const { data, info } = await sharp(trimmed)
    .resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  quantize(data, "props");
  const output = join(environmentRoot, outputName);
  await mkdir(dirname(output), { recursive: true });
  await sharp(data, { raw: info }).png({ compressionLevel: 9 }).toFile(output);
  return output;
};

const buildWaveSheet = async () => {
  const source = await sharp(WAVE_SOURCE)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 2 })
    .png()
    .toBuffer();
  const motion = [
    { width: 346, height: 470, left: 19, top: 30 },
    { width: 352, height: 476, left: 16, top: 25 },
    { width: 358, height: 484, left: 13, top: 18 },
    { width: 362, height: 488, left: 11, top: 15 },
    { width: 358, height: 484, left: 13, top: 18 },
    { width: 352, height: 476, left: 16, top: 25 },
    { width: 348, height: 472, left: 18, top: 29 },
    { width: 344, height: 468, left: 20, top: 32 }
  ];
  const frames = await Promise.all(motion.map(async ({ width, height, left, top }) => {
    const resized = await sharp(source)
      .resize(width, height, { fit: "fill", kernel: sharp.kernel.lanczos3 })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    quantize(resized.data, "wave", true);
    const input = await sharp(resized.data, { raw: resized.info }).png().toBuffer();
    return sharp({
      create: {
        width: WAVE_FRAME_WIDTH,
        height: WAVE_FRAME_HEIGHT,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    }).composite([{ input, left, top }]).png().toBuffer();
  }));
  const output = join(effectRoot, "fx_tsunami_wave.png");
  await mkdir(dirname(output), { recursive: true });
  await sharp({
    create: {
      width: WAVE_FRAME_WIDTH * WAVE_FRAMES,
      height: WAVE_FRAME_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  }).composite(frames.map((input, index) => ({ input, left: index * WAVE_FRAME_WIDTH, top: 0 })))
    .png({ compressionLevel: 9 })
    .toFile(output);
  return output;
};

const warningSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <circle cx="64" cy="64" r="57" fill="${PALETTE.danger[1]}" stroke="${PALETTE.outline}" stroke-width="7"/>
  <path d="M24 64L66 31V49H104V79H66V97Z" fill="${PALETTE.highlight[0]}" stroke="${PALETTE.outline}" stroke-width="6" stroke-linejoin="round"/>
  <path d="M81 87C90 77 103 78 111 88C103 86 98 90 96 96C91 91 86 89 81 87Z" fill="${PALETTE.collect[1]}" stroke="${PALETTE.highlight[0]}" stroke-width="3"/>
</svg>`;

const buildWarning = async () => {
  const output = join(effectRoot, "fx_tsunami_warning.png");
  await sharp(Buffer.from(warningSvg)).png({ compressionLevel: 9 }).toFile(output);
  return output;
};

await Promise.all([mkdir(referenceRoot, { recursive: true }), mkdir(environmentRoot, { recursive: true })]);
const far = await buildTsunamiBackgroundLayer("bg_tsunami_far", "far");
const mid = await buildTsunamiBackgroundLayer("bg_tsunami_mid", "mid");
const near = await buildTsunamiBackgroundLayer("bg_tsunami_near", "near");
const [houseOpen, houseWeathered, shelterHill, wave, warning] = await Promise.all([
  buildShelter("shelter_house_open_generated.png", "shelter_house_open.png"),
  buildShelter("shelter_house_weathered_generated.png", "shelter_house_weathered.png"),
  buildShelter("shelter_hill_generated.png", "shelter_hill.png", 512, 256),
  buildWaveSheet(),
  buildWarning()
]);

const composite = await sharp(far).composite([{ input: mid }, { input: near }]).png().toBuffer();
await sharp(composite).resize(1024, 360).png({ compressionLevel: 9 }).toFile(join(referenceRoot, "background-tsunami-preview.png"));

const waveFrame = await sharp(wave).extract({ left: 0, top: 0, width: WAVE_FRAME_WIDTH, height: WAVE_FRAME_HEIGHT }).resize(300, 430).png().toBuffer();
await buildStorybookStagePreview("tsunami");

const effectBackground = await sharp({
  create: { width: 1024, height: 384, channels: 4, background: PALETTE.environmentSky[0] }
}).png().toBuffer();
const previewAssets = await Promise.all([
  sharp(houseOpen).resize(265, 199, { fit: "contain" }).png().toBuffer(),
  sharp(houseWeathered).resize(265, 199, { fit: "contain" }).png().toBuffer(),
  sharp(shelterHill).resize(420, 210, { fit: "contain" }).png().toBuffer(),
  sharp(waveFrame).resize(150, 300, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  }).png().toBuffer(),
  sharp(warning).resize(112, 112, { fit: "contain" }).png().toBuffer()
]);
await sharp(effectBackground).composite([
  { input: previewAssets[0], left: 10, top: 20 },
  { input: previewAssets[1], left: 278, top: 20 },
  { input: previewAssets[2], left: 54, top: 172 },
  { input: previewAssets[3], left: 674, top: 54 },
  { input: previewAssets[4], left: 862, top: 32 }
]).png({ compressionLevel: 9 }).toFile(join(referenceRoot, "tsunami-effects-preview.png"));

console.log("쓰나미 마을 최종 시각 에셋 생성: 배경 3, 집 2, 언덕 1, 파도 8프레임, 경고 1, 선택 카드 1, 검토 미리보기 2");
