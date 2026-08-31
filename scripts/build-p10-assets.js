import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets", "_source", "p10", "p10_hula_king_color_source_v1.png");
const alphaSource = join(root, "assets", "_source", "p10", "p10_hula_king_color_source_alpha_v1.png");
const frameSize = 128;

const regions = Object.freeze({
  idle: { left: 48, top: 112, width: 300, height: 252 },
  spin: { left: 366, top: 112, width: 398, height: 252 },
  warning: {
    left: 790,
    top: 28,
    width: 330,
    height: 342,
    clear: [{ left: 270, top: 190, width: 60, height: 152 }]
  },
  throw: { left: 1190, top: 118, width: 300, height: 248 },
  vulnerable: { left: 102, top: 420, width: 528, height: 305 },
  hurt: { left: 668, top: 430, width: 250, height: 260 },
  defeated: { left: 992, top: 500, width: 414, height: 210 },
  spinEffect: { left: 42, top: 786, width: 350, height: 158 },
  lowHoop: { left: 418, top: 806, width: 286, height: 128 },
  jumpHoop: { left: 774, top: 726, width: 190, height: 228 }
});

const approvedPalette = [
  "#DEB5C6",
  "#D294AC",
  "#F4FBFD",
  "#F5DF4F",
  "#D09A4E",
  "#3DBFE3",
  "#E573A0",
  "#752B5A",
  "#42474E"
];

const toRgb = (hex) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};
const paletteRgb = approvedPalette.map(toRgb);

const distance = (left, right) => {
  const red = left[0] - right[0];
  const green = left[1] - right[1];
  const blue = left[2] - right[2];
  return red * red * 0.3 + green * green * 0.59 + blue * blue * 0.11;
};

const quantizeBuffer = async (buffer) => {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] === 0) continue;
    const current = [data[offset], data[offset + 1], data[offset + 2]];
    const nearest = paletteRgb.reduce(
      (best, color) => distance(current, color) < best.distance
        ? { color, distance: distance(current, color) }
        : best,
      { color: paletteRgb[0], distance: Number.POSITIVE_INFINITY }
    ).color;
    data[offset] = nearest[0];
    data[offset + 1] = nearest[1];
    data[offset + 2] = nearest[2];
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
};

const isConnectedBackground = (red, green, blue) => {
  const minimum = Math.min(red, green, blue);
  const maximum = Math.max(red, green, blue);
  return minimum >= 226 && maximum - minimum <= 18;
};

const removeGeneratedBackground = async () => {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const visited = new Uint8Array(info.width * info.height);
  const queue = new Int32Array(info.width * info.height);
  let head = 0;
  let tail = 0;

  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= info.width || y >= info.height) return;
    const pixel = y * info.width + x;
    if (visited[pixel]) return;
    const offset = pixel * 4;
    if (!isConnectedBackground(data[offset], data[offset + 1], data[offset + 2])) return;
    visited[pixel] = 1;
    queue[tail++] = pixel;
  };

  for (let x = 0; x < info.width; x += 1) {
    enqueue(x, 0);
    enqueue(x, info.height - 1);
  }
  for (let y = 0; y < info.height; y += 1) {
    enqueue(0, y);
    enqueue(info.width - 1, y);
  }

  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % info.width;
    const y = Math.floor(pixel / info.width);
    enqueue(x - 1, y);
    enqueue(x + 1, y);
    enqueue(x, y - 1);
    enqueue(x, y + 1);
  }

  let removedPixels = 0;
  for (let pixel = 0; pixel < visited.length; pixel += 1) {
    const offset = pixel * 4;
    const minimum = Math.min(data[offset], data[offset + 1], data[offset + 2]);
    const maximum = Math.max(data[offset], data[offset + 1], data[offset + 2]);
    const neutralChecker = minimum >= 244 && maximum - minimum <= 3;
    if (!visited[pixel] && !neutralChecker) continue;
    data[offset + 3] = 0;
    removedPixels += 1;
  }

  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(alphaSource);
  return removedPixels;
};

const extractTrimmed = async (region) => {
  const { clear = [], ...extractRegion } = region;
  let extracted = await sharp(alphaSource)
    .extract(extractRegion)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (const mask of clear) {
    for (let y = mask.top; y < Math.min(extracted.info.height, mask.top + mask.height); y += 1) {
      for (let x = mask.left; x < Math.min(extracted.info.width, mask.left + mask.width); x += 1) {
        extracted.data[(y * extracted.info.width + x) * 4 + 3] = 0;
      }
    }
  }
  extracted = await sharp(extracted.data, { raw: extracted.info }).png().toBuffer();
  return sharp(extracted)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
};

const placeOnCanvas = async (region, {
  width,
  height,
  maxWidth,
  maxHeight,
  bottomPad = 0,
  scaleMultiplier = 1,
  yOffset = 0,
  xOffset = 0
}) => {
  const trimmed = await extractTrimmed(region);
  const metadata = await sharp(trimmed).metadata();
  const scale = Math.min(maxWidth / metadata.width, maxHeight / metadata.height) * scaleMultiplier;
  const resizedWidth = Math.max(1, Math.round(metadata.width * scale));
  const resizedHeight = Math.max(1, Math.round(metadata.height * scale));
  const resized = await sharp(trimmed)
    .resize(resizedWidth, resizedHeight, { fit: "fill" })
    .png()
    .toBuffer();
  const left = Math.max(0, Math.min(width - resizedWidth, Math.round((width - resizedWidth) / 2 + xOffset)));
  const top = Math.max(0, Math.min(height - resizedHeight, height - bottomPad - resizedHeight + yOffset));
  const placed = await sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([{ input: resized, left, top }]).png().toBuffer();
  return quantizeBuffer(placed);
};

const writeBuffer = async (path, buffer) => {
  await mkdir(dirname(path), { recursive: true });
  await sharp(buffer).png({ compressionLevel: 9 }).toFile(path);
};

const buildSequence = async ({ sequence, region, variants, options }) => {
  const directory = join(root, "assets", "enemies", "hula_king", sequence);
  const prefix = `hula_king_${sequence}`;
  const frames = [];
  for (let index = 0; index < variants.length; index += 1) {
    const frame = await placeOnCanvas(region, { ...options, ...variants[index] });
    const output = join(directory, `${prefix}_${String(index).padStart(2, "0")}.png`);
    await writeBuffer(output, frame);
    frames.push(output);
  }
  const strip = join(root, "assets", "enemies", "hula_king", `${prefix}.png`);
  await sharp({
    create: {
      width: frameSize * frames.length,
      height: frameSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  }).composite(frames.map((input, index) => ({ input, left: index * frameSize, top: 0 })))
    .png({ compressionLevel: 9 })
    .toFile(strip);
  return strip;
};

const subtleLoop = (count, scale = 0.018, y = 2) => Array.from({ length: count }, (_, index) => ({
  scaleMultiplier: 1 + Math.sin((index / count) * Math.PI * 2) * scale,
  yOffset: Math.round(Math.sin((index / count) * Math.PI * 2) * y)
}));

const removedPixels = await removeGeneratedBackground();
const bossOptions = { width: frameSize, height: frameSize, maxWidth: 116, maxHeight: 100, bottomPad: 16 };

const sequences = [];
sequences.push(await buildSequence({ sequence: "idle", region: regions.idle, variants: subtleLoop(4), options: bossOptions }));
sequences.push(await buildSequence({ sequence: "spin", region: regions.spin, variants: subtleLoop(8, 0.012, 1), options: { ...bossOptions, maxWidth: 116, maxHeight: 96 } }));
sequences.push(await buildSequence({ sequence: "warning", region: regions.warning, variants: subtleLoop(4, 0.016, 1), options: { ...bossOptions, maxHeight: 106 } }));
sequences.push(await buildSequence({ sequence: "throw", region: regions.throw, variants: subtleLoop(6, 0.025, 2), options: bossOptions }));
sequences.push(await buildSequence({ sequence: "vulnerable", region: regions.vulnerable, variants: subtleLoop(4, 0.012, 1), options: { ...bossOptions, maxWidth: 116, maxHeight: 96 } }));
sequences.push(await buildSequence({ sequence: "hurt", region: regions.hurt, variants: [{}, { scaleMultiplier: 0.96, yOffset: 2 }, { scaleMultiplier: 1.02, yOffset: -2 }], options: bossOptions }));
sequences.push(await buildSequence({
  sequence: "defeated",
  region: regions.defeated,
  variants: [
    { scaleMultiplier: 1.02, yOffset: -2 },
    { scaleMultiplier: 1 },
    { scaleMultiplier: 0.98, yOffset: 2 },
    { scaleMultiplier: 0.95, yOffset: 1 },
    { scaleMultiplier: 0.92, yOffset: 2 },
    { scaleMultiplier: 0.9, yOffset: 1 },
    { scaleMultiplier: 0.88, yOffset: 2 },
    { scaleMultiplier: 0.86, yOffset: 1 }
  ],
  options: { ...bossOptions, maxWidth: 116, maxHeight: 80 }
}));

const staticSpecs = [
  ["effects/fx_hula_spin.png", regions.spinEffect, { width: 256, height: 112, maxWidth: 244, maxHeight: 96, bottomPad: 8 }],
  ["projectiles/projectile_hula_hoop_low.png", regions.lowHoop, { width: 112, height: 64, maxWidth: 104, maxHeight: 54, bottomPad: 5 }],
  ["projectiles/projectile_hula_hoop_jump.png", regions.jumpHoop, { width: 80, height: 112, maxWidth: 70, maxHeight: 104, bottomPad: 4 }]
];

const staticOutputs = [];
for (const [relativePath, region, options] of staticSpecs) {
  const output = join(root, "assets", relativePath);
  await writeBuffer(output, await placeOnCanvas(region, options));
  staticOutputs.push(output);
}

const contactSheet = join(root, "references", "p10-hula-final-assets-contact-sheet.png");
await sharp({
  create: { width: 1408, height: 1152, channels: 4, background: { r: 238, g: 235, b: 224, alpha: 1 } }
}).composite([
  { input: sequences[0], left: 16, top: 16 },
  { input: sequences[1], left: 16, top: 160 },
  { input: sequences[2], left: 16, top: 304 },
  { input: sequences[3], left: 560, top: 304 },
  { input: sequences[4], left: 16, top: 448 },
  { input: sequences[5], left: 560, top: 448 },
  { input: sequences[6], left: 16, top: 592 },
  { input: staticOutputs[0], left: 16, top: 760 },
  { input: staticOutputs[1], left: 320, top: 784 },
  { input: staticOutputs[2], left: 480, top: 744 }
]).png({ compressionLevel: 9 }).toFile(contactSheet);

console.log(`P10 최종 에셋 생성: 보스 ${4 + 8 + 4 + 6 + 4 + 3 + 8}프레임·링 효과 ${staticOutputs.length}종 · 배경 제거 ${removedPixels}픽셀`);
