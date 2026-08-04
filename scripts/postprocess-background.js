import { mkdir } from "node:fs/promises";
import { dirname, parse } from "node:path";
import sharp from "sharp";
import { colorDistance, hexToRgb, paletteHexes } from "./image-utils.js";

const [input, output, preview] = process.argv.slice(2);
if (!input || !output) {
  console.error("사용법: node scripts/postprocess-background.js <alpha-input> <final-output> [preview-output]");
  process.exit(1);
}

const WIDTH = 2048;
const HEIGHT = 720;
const SEAM_COPY = 2;
const outputName = parse(output).name.toLowerCase();
const layer = outputName.endsWith("_far") ? "far" : outputName.endsWith("_near") ? "near" : "mid";
const BRIGHTNESS_FACTORS = {
  bg_pit_far: 1.06,
  bg_pit_mid: 1.18,
  bg_pit_near: 1.35,
  bg_boss_far: 1.18,
  bg_boss_mid: 1.08,
  bg_boss_near: 1.35
};
const brightness = BRIGHTNESS_FACTORS[outputName] ?? 1;
const LUMA_RANGES = {
  bg_normal_far: [70, 85],
  bg_normal_mid: [55, 70],
  bg_normal_near: [45, 60],
  bg_pit_far: [70, 85],
  bg_pit_mid: [55, 70],
  bg_pit_near: [45, 60],
  bg_boss_far: [60, 75],
  bg_boss_mid: [45, 60],
  bg_boss_near: [40, 55]
};
const BACKGROUND_HEXES = layer === "far"
  ? ["#CDE5B9", "#4691A2", "#BFC596", "#4DABA1", "#42474E", "#183D30", "#DEB5C6", "#F5DF4F", "#3DBFE3", "#E573A0"]
  : layer === "near"
    ? ["#4ECCA0", "#183D30", "#5D4326", "#42474E", "#4DABA1", "#4691A2", "#BFC596", "#957242", "#9598A2"]
    : ["#CDE5B9", "#4691A2", "#BFC596", "#4DABA1", "#4ECCA0", "#183D30", "#5D4326", "#42474E", "#957242", "#9598A2"];
const BACKGROUND_PALETTE = BACKGROUND_HEXES.map((hex) => ({ hex, rgb: hexToRgb(hex) }));

const nearestBackgroundColor = (rgb) => BACKGROUND_PALETTE.reduce(
  (best, candidate) => {
    const distance = colorDistance(rgb, candidate.rgb);
    return distance < best.distance ? { ...candidate, distance } : best;
  },
  { ...BACKGROUND_PALETTE[0], distance: Infinity }
);

const findFirstVisibleY = (data, width, height) => {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 8) return y;
    }
  }
  return height;
};

const fitNearToBottom = async (data, width, height, minimumY) => {
  const firstVisibleY = findFirstVisibleY(data, width, height);
  if (firstVisibleY >= minimumY) return data;
  const contentHeight = height - firstVisibleY;
  const targetHeight = height - minimumY;
  const content = await sharp(data, { raw: { width, height, channels: 4 } })
    .extract({ left: 0, top: firstVisibleY, width, height: contentHeight })
    .resize(width, targetHeight, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .raw()
    .toBuffer();
  const normalized = Buffer.alloc(width * height * 4);
  content.copy(normalized, minimumY * width * 4);
  return normalized;
};

const makeSeamless = (data, width, height) => {
  const source = Buffer.from(data);
  for (let offset = 0; offset < SEAM_COPY; offset += 1) {
    const leftX = offset;
    const rightX = width - 1 - offset;
    for (let y = 0; y < height; y += 1) {
      const leftIndex = (y * width + leftX) * 4;
      const rightIndex = (y * width + rightX) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        data[rightIndex + channel] = source[leftIndex + channel];
      }
    }
  }
};

const quantize = (data) => {
  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    if (alpha <= 8) {
      data[index] = 0;
      data[index + 1] = 0;
      data[index + 2] = 0;
      data[index + 3] = 0;
      continue;
    }
    const rgb = nearestBackgroundColor([data[index], data[index + 1], data[index + 2]]).rgb;
    data[index] = rgb[0];
    data[index + 1] = rgb[1];
    data[index + 2] = rgb[2];
    if (alpha >= 247) data[index + 3] = 255;
  }
};

const resized = await sharp(input)
  .ensureAlpha()
  .median(5)
  .blur(0.7)
  .modulate({ brightness })
  .resize(WIDTH, HEIGHT, { fit: "fill", kernel: sharp.kernel.lanczos3 })
  .raw()
  .toBuffer({ resolveWithObject: true });

const minimumNearY = outputName.includes("_boss_") ? Math.round(HEIGHT * 0.8) : Math.round(HEIGHT * 0.75);
const normalizedData = layer === "near"
  ? await fitNearToBottom(resized.data, WIDTH, HEIGHT, minimumNearY)
  : resized.data;

makeSeamless(normalizedData, WIDTH, HEIGHT);
quantize(normalizedData);

await mkdir(dirname(output), { recursive: true });
await sharp(normalizedData, { raw: { width: WIDTH, height: HEIGHT, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(output);

if (preview) {
  await mkdir(dirname(preview), { recursive: true });
  await sharp(output)
    .flatten({ background: "#CDE5B9" })
    .resize(1024, 360)
    .png({ compressionLevel: 9, palette: true })
    .toFile(preview);
}

const { data, info } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const colors = new Set();
let visible = 0;
let transparent = 0;
let lumaTotal = 0;
let seamDelta = 0;
let firstVisibleY = info.height;
for (let y = 0; y < info.height; y += 1) {
  const leftIndex = y * info.width * 4;
  const rightIndex = (y * info.width + info.width - 1) * 4;
  for (let channel = 0; channel < 4; channel += 1) {
    seamDelta = Math.max(seamDelta, Math.abs(data[leftIndex + channel] - data[rightIndex + channel]));
  }
}
for (let index = 0; index < data.length; index += 4) {
  if (data[index + 3] === 0) {
    transparent += 1;
    continue;
  }
  visible += 1;
  firstVisibleY = Math.min(firstVisibleY, Math.floor(index / 4 / info.width));
  colors.add(`#${data[index].toString(16).padStart(2, "0")}${data[index + 1].toString(16).padStart(2, "0")}${data[index + 2].toString(16).padStart(2, "0")}`.toUpperCase());
  lumaTotal += (0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]) / 255;
}

const outsidePalette = [...colors].filter((color) => !paletteHexes.includes(color));
if (outsidePalette.length > 0) throw new Error(`팔레트 밖 색상: ${outsidePalette.join(", ")}`);
if (seamDelta !== 0) throw new Error(`좌우 seam 픽셀 차이: ${seamDelta}`);

const meanLuma = (lumaTotal / visible) * 100;
console.log(`${parse(output).base}: ${info.width}x${info.height}, RGBA, ${colors.size} colors`);
console.log(`visible=${visible}, transparent=${transparent}, mean-luma=${meanLuma.toFixed(1)}%, seam-delta=${seamDelta}, first-visible-y=${firstVisibleY}`);

const lumaRange = LUMA_RANGES[outputName];
if (lumaRange && (meanLuma < lumaRange[0] || meanLuma > lumaRange[1])) {
  throw new Error(`명도 범위 위반: ${meanLuma.toFixed(1)}%, expected ${lumaRange[0]}-${lumaRange[1]}%`);
}

if (layer === "near") {
  if (firstVisibleY < minimumNearY - 4) {
    throw new Error(`near 레이어 상단 여백 부족: first-visible-y=${firstVisibleY}, minimum=${minimumNearY - 4}`);
  }
}
