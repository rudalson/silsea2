import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PALETTE } from "../data/palette.js";
import { colorDistance, hexToRgb } from "./image-utils.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceRoot = join(root, "assets", "_source", "tsunami", "final");
const backgroundRoot = join(root, "assets", "backgrounds");
const environmentRoot = join(root, "assets", "environment");
const effectRoot = join(root, "assets", "effects");
const referenceRoot = join(root, "references");
const WIDTH = 2048;
const HEIGHT = 720;
const SEAM_COLUMNS = 2;
const WAVE_FRAME_WIDTH = 256;
const WAVE_FRAME_HEIGHT = 512;
const WAVE_FRAMES = 8;

const palettes = Object.freeze({
  far: [PALETTE.environmentSky[1], ...PALETTE.highlight, PALETTE.environmentNeutral[1], PALETTE.bgMid[0], PALETTE.bgFar[1], PALETTE.environmentNight[2], PALETTE.outline],
  mid: [PALETTE.environmentFar[0], PALETTE.environmentNeutral[2], PALETTE.shadow[2], PALETTE.environmentNeutral[1], PALETTE.bgFar[1], PALETTE.environmentMid[0], PALETTE.environmentNear[1], PALETTE.bgFar[0], PALETTE.outline, ...PALETTE.highlight],
  near: [PALETTE.environmentNeutral[0], PALETTE.outline, PALETTE.environmentNear[2], PALETTE.environmentMid[0], PALETTE.environmentNear[1], PALETTE.bgFar[1], PALETTE.bgFar[0], ...PALETTE.highlight],
  props: [PALETTE.environmentFar[0], PALETTE.environmentNeutral[2], PALETTE.shadow[2], PALETTE.bgFar[1], PALETTE.environmentNeutral[1], PALETTE.environmentNeutral[0], PALETTE.outline, PALETTE.highlight[0], PALETTE.bgFar[0]],
  effects: [PALETTE.collect[1], PALETTE.bgFar[1], PALETTE.highlight[0], PALETTE.highlight[1], PALETTE.outline, ...PALETTE.danger]
});

const compiledPalettes = Object.fromEntries(Object.entries(palettes).map(([key, colors]) => [
  key,
  [...new Set(colors)].map((hex) => ({ hex, rgb: hexToRgb(hex) }))
]));

const nearest = (rgb, palette) => palette.reduce((best, candidate) => {
  const distance = colorDistance(rgb, candidate.rgb);
  return distance < best.distance ? { ...candidate, distance } : best;
}, { ...palette[0], distance: Infinity }).rgb;

const quantize = (data, paletteKey) => {
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

const buildBackgroundLayer = async (name, paletteKey, transparent, clearAbove = null) => {
  const input = join(sourceRoot, `${name}_generated.png`);
  const source = transparent
    ? await loadTransparentSource(input)
    : await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = await sharp(source.data, { raw: source.info })
    .resize(WIDTH, HEIGHT, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (clearAbove !== null) data.fill(0, 0, Math.max(0, clearAbove) * WIDTH * 4);
  quantize(data, paletteKey);
  makeSeamless(data, info.width, info.height);
  const output = join(backgroundRoot, `${name}.png`);
  await mkdir(dirname(output), { recursive: true });
  await sharp(data, { raw: info }).png({ compressionLevel: 9 }).toFile(output);
  return output;
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

const waveFrameSvg = (frame) => {
  const phase = frame / WAVE_FRAMES * Math.PI * 2;
  const crestY = 86 + Math.round(Math.sin(phase) * 8);
  const curlX = 54 + Math.round(Math.cos(phase) * 7);
  const foamShift = Math.round(Math.sin(phase + Math.PI / 3) * 9);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WAVE_FRAME_WIDTH}" height="${WAVE_FRAME_HEIGHT}" viewBox="0 0 ${WAVE_FRAME_WIDTH} ${WAVE_FRAME_HEIGHT}">
    <path d="M256 0V512H64C83 474 82 431 69 392C57 355 63 316 84 284C100 259 105 225 92 197C79 169 68 139 77 112C88 76 120 49 159 50C128 65 111 91 116 119C121 148 153 158 176 143C198 129 206 101 193 80C178 55 144 44 116 52C91 59 70 75 ${curlX} ${crestY}C42 ${crestY + 18} 34 ${crestY + 43} 42 ${crestY + 64}C20 ${crestY + 42} 14 ${crestY + 13} 26 ${crestY - 10}C40 ${crestY - 37} 66 ${crestY - 58} 98 ${crestY - 65}C151 ${crestY - 78} 207 ${crestY - 53} 230 ${crestY - 4}C245 ${crestY + 30} 246 ${crestY + 78} 256 ${crestY + 111}Z" fill="${PALETTE.collect[1]}" stroke="${PALETTE.outline}" stroke-width="8" stroke-linejoin="round"/>
    <path d="M29 ${crestY - 10}C48 ${crestY - 42} 82 ${crestY - 66} 118 ${crestY - 65}C151 ${crestY - 65} 184 ${crestY - 49} 202 ${crestY - 21}C174 ${crestY - 37} 145 ${crestY - 37} 122 ${crestY - 24}C101 ${crestY - 13} 88 ${crestY + 9} 90 ${crestY + 32}C75 ${crestY + 10} 50 ${crestY + 4} 29 ${crestY - 10}Z" fill="${PALETTE.highlight[0]}" stroke="${PALETTE.outline}" stroke-width="5"/>
    <path d="M89 214C121 198 158 205 188 188M76 304C112 286 151 296 194 274M71 398C110 380 157 388 204 365" fill="none" stroke="${PALETTE.bgFar[1]}" stroke-width="12" stroke-linecap="round"/>
    <g fill="${PALETTE.highlight[0]}" stroke="${PALETTE.outline}" stroke-width="3">
      <circle cx="${56 + foamShift}" cy="${crestY + 11}" r="13"/><circle cx="${85 + foamShift}" cy="${crestY - 9}" r="10"/><circle cx="${118 + foamShift}" cy="${crestY - 24}" r="8"/>
      <circle cx="${45 - foamShift}" cy="${crestY + 69}" r="8"/><circle cx="${72 - foamShift}" cy="${crestY + 87}" r="6"/>
    </g>
  </svg>`;
};

const buildWaveSheet = async () => {
  const frames = await Promise.all(Array.from({ length: WAVE_FRAMES }, async (_, frame) => (
    sharp(Buffer.from(waveFrameSvg(frame))).png().toBuffer()
  )));
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
const far = await buildBackgroundLayer("bg_tsunami_far", "far", false);
const mid = await buildBackgroundLayer("bg_tsunami_mid", "mid", true);
const near = await buildBackgroundLayer("bg_tsunami_near", "near", true, 552);
const [houseOpen, houseWeathered, shelterHill, wave, warning] = await Promise.all([
  buildShelter("shelter_house_open_generated.png", "shelter_house_open.png"),
  buildShelter("shelter_house_weathered_generated.png", "shelter_house_weathered.png"),
  buildShelter("shelter_hill_generated.png", "shelter_hill.png", 512, 256),
  buildWaveSheet(),
  buildWarning()
]);

const composite = await sharp(far).composite([{ input: mid }, { input: near }]).png().toBuffer();
await sharp(composite).resize(1024, 360).png({ compressionLevel: 9 }).toFile(join(referenceRoot, "background-tsunami-preview.png"));

const waveFrame = await sharp(wave).extract({ left: 0, top: 0, width: WAVE_FRAME_WIDTH, height: WAVE_FRAME_HEIGHT }).resize(214, 430).png().toBuffer();
const cardHouse = await sharp(houseOpen).resize(300, 225, { fit: "contain" }).png().toBuffer();
await sharp(composite).resize(1280, 720).composite([
  { input: cardHouse, left: 700, top: 350 },
  { input: waveFrame, left: 1066, top: 188 }
]).png({ compressionLevel: 9 }).toFile(join(backgroundRoot, "stage_preview_tsunami.png"));

const effectBackground = await sharp({
  create: { width: 1024, height: 384, channels: 4, background: PALETTE.environmentSky[1] }
}).png().toBuffer();
const previewAssets = await Promise.all([
  sharp(houseOpen).resize(265, 199, { fit: "contain" }).png().toBuffer(),
  sharp(houseWeathered).resize(265, 199, { fit: "contain" }).png().toBuffer(),
  sharp(shelterHill).resize(420, 210, { fit: "contain" }).png().toBuffer(),
  sharp(waveFrame).resize(150, 300, { fit: "contain" }).png().toBuffer(),
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
