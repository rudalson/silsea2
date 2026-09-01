import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets", "_source", "p11", "p11_invisible_king_color_source_v1.png");
const alphaSource = join(root, "assets", "_source", "p11", "p11_invisible_king_color_source_alpha_v1.png");
const frameSize = 128;

const regions = Object.freeze({
  idle: {
    left: 90, top: 92, width: 340, height: 282,
    clear: [{ left: 85, top: 250, width: 190, height: 32 }]
  },
  revealBody: {
    left: 598, top: 88, width: 292, height: 284,
    keep: [
      { type: "ellipse", cx: 146, cy: 174, rx: 116, ry: 112 },
      { type: "rect", left: 84, top: 8, width: 124, height: 100 }
    ]
  },
  hide: { left: 1022, top: 90, width: 402, height: 292 },
  attackBody: {
    left: 126, top: 400, width: 350, height: 304,
    keep: [
      { type: "ellipse", cx: 174, cy: 173, rx: 116, ry: 112 },
      { type: "ellipse", cx: 65, cy: 172, rx: 30, ry: 32 },
      { type: "ellipse", cx: 286, cy: 172, rx: 30, ry: 32 },
      { type: "rect", left: 111, top: 18, width: 126, height: 102 }
    ],
    clear: [{ left: 84, top: 274, width: 190, height: 30 }]
  },
  hurt: {
    left: 570, top: 450, width: 390, height: 274,
    keep: [
      { type: "ellipse", cx: 188, cy: 176, rx: 158, ry: 92 },
      { type: "ellipse", cx: 53, cy: 186, rx: 30, ry: 32 },
      { type: "ellipse", cx: 325, cy: 186, rx: 30, ry: 32 },
      { type: "rect", left: 210, top: 10, width: 125, height: 105 }
    ],
    clear: [{ left: 50, top: 246, width: 270, height: 28 }]
  },
  defeated: {
    left: 995, top: 468, width: 475, height: 260,
    keep: [
      { type: "ellipse", cx: 174, cy: 175, rx: 160, ry: 82 },
      { type: "ellipse", cx: 36, cy: 190, rx: 32, ry: 30 },
      { type: "ellipse", cx: 315, cy: 190, rx: 32, ry: 30 },
      { type: "rect", left: 326, top: 86, width: 135, height: 118 }
    ],
    clear: [{ left: 22, top: 230, width: 410, height: 30 }]
  },
  revealEffect: { left: 58, top: 716, width: 338, height: 276 },
  afterimageEffect: { left: 430, top: 724, width: 300, height: 260 },
  missEffect: { left: 716, top: 720, width: 454, height: 268 },
  crownImpact: { left: 1160, top: 770, width: 330, height: 218 }
});

const approvedPalette = [
  "#9ADDF2",
  "#4691A2",
  "#F4FBFD",
  "#42474E",
  "#F5DF4F",
  "#D09A4E",
  "#3DBFE3",
  "#D1333D",
  "#752B5A",
  "#E573A0"
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
  return minimum >= 230 && maximum - minimum <= 16;
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
    if (!visited[pixel]) continue;
    data[pixel * 4 + 3] = 0;
    removedPixels += 1;
  }

  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(alphaSource);
  return removedPixels;
};

const containsPoint = (shape, x, y) => {
  if (shape.type === "rect") {
    return x >= shape.left && x < shape.left + shape.width && y >= shape.top && y < shape.top + shape.height;
  }
  const normalizedX = (x - shape.cx) / shape.rx;
  const normalizedY = (y - shape.cy) / shape.ry;
  return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
};

const extractTrimmed = async (region) => {
  const { clear = [], keep = [], ...extractRegion } = region;
  const extracted = await sharp(alphaSource)
    .extract(extractRegion)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let y = 0; y < extracted.info.height; y += 1) {
    for (let x = 0; x < extracted.info.width; x += 1) {
      const cleared = clear.some((mask) => containsPoint({ type: "rect", ...mask }, x, y));
      const kept = keep.length === 0 || keep.some((shape) => containsPoint(shape, x, y));
      if (cleared || !kept) extracted.data[(y * extracted.info.width + x) * 4 + 3] = 0;
    }
  }
  const buffer = await sharp(extracted.data, { raw: extracted.info }).png().toBuffer();
  return sharp(buffer)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
};

const applyOpacity = async (buffer, opacity = 1) => {
  if (opacity >= 0.999) return buffer;
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let offset = 3; offset < data.length; offset += 4) data[offset] = Math.round(data[offset] * opacity);
  return sharp(data, { raw: info }).png().toBuffer();
};

const placeOnCanvas = async (region, {
  width,
  height,
  maxWidth,
  maxHeight,
  bottomPad = 0,
  scaleMultiplier = 1,
  yOffset = 0,
  xOffset = 0,
  opacity = 1,
  center = false
}) => {
  const trimmed = await extractTrimmed(region);
  const metadata = await sharp(trimmed).metadata();
  const scale = Math.min(maxWidth / metadata.width, maxHeight / metadata.height) * scaleMultiplier;
  const resizedWidth = Math.max(1, Math.round(metadata.width * scale));
  const resizedHeight = Math.max(1, Math.round(metadata.height * scale));
  let resized = await sharp(trimmed)
    .resize(resizedWidth, resizedHeight, { fit: "fill" })
    .png()
    .toBuffer();
  resized = await applyOpacity(resized, opacity);
  const left = Math.max(0, Math.min(width - resizedWidth, Math.round((width - resizedWidth) / 2 + xOffset)));
  const defaultTop = center ? (height - resizedHeight) / 2 : height - bottomPad - resizedHeight;
  const top = Math.max(0, Math.min(height - resizedHeight, Math.round(defaultTop + yOffset)));
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
  const directory = join(root, "assets", "enemies", "invisible_king", sequence);
  const prefix = `invisible_king_${sequence}`;
  const frames = [];
  for (let index = 0; index < variants.length; index += 1) {
    const variant = variants[index];
    const frame = await placeOnCanvas(variant.region ?? region, { ...options, ...variant });
    const output = join(directory, `${prefix}_${String(index).padStart(2, "0")}.png`);
    await writeBuffer(output, frame);
    frames.push(output);
  }
  const strip = join(root, "assets", "enemies", "invisible_king", `${prefix}.png`);
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

const buildEffectSequence = async ({ key, region, frameWidth, frameHeight, variants, options }) => {
  const frames = [];
  for (const variant of variants) {
    frames.push(await placeOnCanvas(region, {
      width: frameWidth,
      height: frameHeight,
      center: true,
      ...options,
      ...variant
    }));
  }
  const output = join(root, "assets", "effects", `${key}.png`);
  await mkdir(dirname(output), { recursive: true });
  const sheet = await sharp({
    create: {
      width: frameWidth * frames.length,
      height: frameHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  }).composite(frames.map((input, index) => ({ input, left: index * frameWidth, top: 0 })))
    .png()
    .toBuffer();
  await writeBuffer(output, await quantizeBuffer(sheet));
  return output;
};

const subtleLoop = (count, scale = 0.018, y = 2) => Array.from({ length: count }, (_, index) => ({
  scaleMultiplier: 1 + Math.sin((index / count) * Math.PI * 2) * scale,
  yOffset: Math.round(Math.sin((index / count) * Math.PI * 2) * y)
}));

const removedPixels = await removeGeneratedBackground();
const bossOptions = { width: frameSize, height: frameSize, maxWidth: 112, maxHeight: 96, bottomPad: 16 };

const sequences = [];
sequences.push(await buildSequence({ sequence: "idle", region: regions.idle, variants: subtleLoop(4), options: bossOptions }));
sequences.push(await buildSequence({
  sequence: "reveal",
  region: regions.revealBody,
  variants: [
    { opacity: 0.28, scaleMultiplier: 0.94 },
    { opacity: 0.46, scaleMultiplier: 0.96 },
    { opacity: 0.65, scaleMultiplier: 0.98 },
    { opacity: 0.82 },
    { opacity: 1, scaleMultiplier: 1.01 },
    { opacity: 1 }
  ],
  options: bossOptions
}));
sequences.push(await buildSequence({
  sequence: "hide",
  region: regions.hide,
  variants: [
    { region: regions.idle },
    { opacity: 1 },
    { opacity: 0.82, xOffset: 2 },
    { opacity: 0.62, xOffset: 4 },
    { opacity: 0.4, xOffset: 6 },
    { opacity: 0.18, xOffset: 8 }
  ],
  options: bossOptions
}));
sequences.push(await buildSequence({
  sequence: "attack",
  region: regions.attackBody,
  variants: subtleLoop(6, 0.03, 2),
  options: bossOptions
}));
sequences.push(await buildSequence({
  sequence: "hurt",
  region: regions.hurt,
  variants: [{ scaleMultiplier: 1.02 }, { scaleMultiplier: 0.96, yOffset: 2 }, { scaleMultiplier: 1 }],
  options: { ...bossOptions, maxWidth: 116, maxHeight: 78 }
}));
sequences.push(await buildSequence({
  sequence: "defeated",
  region: regions.defeated,
  variants: [
    { region: regions.hurt, maxHeight: 78, scaleMultiplier: 1.02, yOffset: -2 },
    { region: regions.hurt, maxHeight: 76 },
    { scaleMultiplier: 1.02, yOffset: -2 },
    { scaleMultiplier: 1 },
    { scaleMultiplier: 0.97, yOffset: 1 },
    { scaleMultiplier: 0.94, yOffset: 2 },
    { scaleMultiplier: 0.92, yOffset: 2 },
    { scaleMultiplier: 0.9, yOffset: 2 }
  ],
  options: { ...bossOptions, maxWidth: 116, maxHeight: 64 }
}));

const revealEffect = await buildEffectSequence({
  key: "fx_invisible_reveal",
  region: regions.revealEffect,
  frameWidth: 192,
  frameHeight: 256,
  variants: [
    { opacity: 0.25, scaleMultiplier: 0.82 },
    { opacity: 0.42, scaleMultiplier: 0.9 },
    { opacity: 0.62, scaleMultiplier: 0.96 },
    { opacity: 0.82 },
    { opacity: 1, scaleMultiplier: 1.02 },
    { opacity: 0.78 }
  ],
  options: { maxWidth: 180, maxHeight: 244 }
});
const afterimageEffect = await buildEffectSequence({
  key: "fx_invisible_afterimage",
  region: regions.afterimageEffect,
  frameWidth: 192,
  frameHeight: 192,
  variants: [
    { opacity: 0.78, scaleMultiplier: 0.9 },
    { opacity: 0.58, scaleMultiplier: 0.96 },
    { opacity: 0.36, scaleMultiplier: 1.02 },
    { opacity: 0.16, scaleMultiplier: 1.08 }
  ],
  options: { maxWidth: 174, maxHeight: 174 }
});
const missEffect = await buildEffectSequence({
  key: "fx_invisible_miss",
  region: regions.missEffect,
  frameWidth: 256,
  frameHeight: 192,
  variants: [
    { opacity: 0.32, scaleMultiplier: 0.52 },
    { opacity: 0.46, scaleMultiplier: 0.64 },
    { opacity: 0.6, scaleMultiplier: 0.76 },
    { opacity: 0.74, scaleMultiplier: 0.86 },
    { opacity: 0.9, scaleMultiplier: 0.95 },
    { opacity: 1 }
  ],
  options: { maxWidth: 244, maxHeight: 180 }
});

const crownImpact = join(root, "assets", "effects", "fx_invisible_crown_impact.png");
await writeBuffer(crownImpact, await placeOnCanvas(regions.crownImpact, {
  width: 160,
  height: 112,
  maxWidth: 150,
  maxHeight: 102,
  center: true
}));

const contactSheet = join(root, "references", "p11-invisible-final-assets-contact-sheet.png");
await sharp({
  create: { width: 1800, height: 1584, channels: 4, background: { r: 238, g: 235, b: 224, alpha: 1 } }
}).composite([
  { input: sequences[0], left: 16, top: 16 },
  { input: sequences[1], left: 16, top: 160 },
  { input: sequences[2], left: 16, top: 304 },
  { input: sequences[3], left: 16, top: 448 },
  { input: sequences[4], left: 800, top: 448 },
  { input: sequences[5], left: 16, top: 592 },
  { input: revealEffect, left: 16, top: 752 },
  { input: afterimageEffect, left: 16, top: 1024 },
  { input: missEffect, left: 16, top: 1232 },
  { input: crownImpact, left: 1584, top: 1280 }
]).png({ compressionLevel: 9 }).toFile(contactSheet);

console.log(`P11 최종 에셋 생성: 보스 ${4 + 6 + 6 + 6 + 3 + 8}프레임·빛/잔상/공격 ${6 + 4 + 6}프레임·왕관 효과 1종 · 배경 제거 ${removedPixels}픽셀`);
