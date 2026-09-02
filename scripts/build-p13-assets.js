import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets", "_source", "p13", "p13_random_king_color_source_v1.png");
const alphaSource = join(root, "assets", "_source", "p13", "p13_random_king_color_source_alpha_v1.png");
const frameSize = 128;

const regions = Object.freeze({
  idle: { left: 50, top: 60, width: 300, height: 330, clear: [{ left: 0, top: 286, width: 300, height: 44 }] },
  draw: { left: 405, top: 52, width: 335, height: 340, clear: [{ left: 0, top: 252, width: 335, height: 88 }] },
  teleport: { left: 770, top: 35, width: 315, height: 365, clear: [{ left: 300, top: 0, width: 15, height: 365 }] },
  attack: { left: 1095, top: 80, width: 280, height: 315 },
  taunt: { left: 720, top: 405, width: 300, height: 330 },
  vulnerable: { left: 1030, top: 410, width: 215, height: 330 },
  defeated: { left: 1240, top: 500, width: 275, height: 235 },
  cards: [
    { left: 38, top: 815, width: 78, height: 170 },
    { left: 124, top: 815, width: 78, height: 170 },
    { left: 211, top: 815, width: 78, height: 170 },
    { left: 298, top: 815, width: 82, height: 170 }
  ],
  spiral: { left: 395, top: 785, width: 235, height: 205 },
  warningLow: { left: 625, top: 840, width: 175, height: 125 },
  warningHigh: { left: 805, top: 795, width: 180, height: 190 },
  warningDiagonal: { left: 985, top: 795, width: 195, height: 190 },
  projectile: { left: 1090, top: 805, width: 82, height: 82 },
  tongue: { left: 1175, top: 790, width: 155, height: 205 },
  stars: { left: 1320, top: 805, width: 205, height: 180 }
});

const approvedPalette = [
  "#D294AC", "#745767", "#F4FBFD", "#42474E", "#F5DF4F", "#D09A4E",
  "#3DBFE3", "#9ADDF2", "#957242", "#E573A0", "#D1333D", "#752B5A"
];
const paletteRgb = approvedPalette.map((hex) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
});
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
    const nearest = paletteRgb.reduce((best, color) => {
      const nextDistance = distance(current, color);
      return nextDistance < best.distance ? { color, distance: nextDistance } : best;
    }, { color: paletteRgb[0], distance: Number.POSITIVE_INFINITY }).color;
    data[offset] = nearest[0];
    data[offset + 1] = nearest[1];
    data[offset + 2] = nearest[2];
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
};

const isConnectedBackground = (red, green, blue) => {
  const minimum = Math.min(red, green, blue);
  const maximum = Math.max(red, green, blue);
  return minimum >= 228 && maximum - minimum <= 20;
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
    .png({ compressionLevel: 9 }).toFile(alphaSource);
  return removedPixels;
};

const extractTrimmed = async (region) => {
  const { clear = [], ...extractRegion } = region;
  const extracted = await sharp(alphaSource).extract(extractRegion).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  for (const mask of clear) {
    for (let y = mask.top; y < Math.min(extracted.info.height, mask.top + mask.height); y += 1) {
      for (let x = mask.left; x < Math.min(extracted.info.width, mask.left + mask.width); x += 1) {
        extracted.data[(y * extracted.info.width + x) * 4 + 3] = 0;
      }
    }
  }
  return sharp(extracted.data, { raw: extracted.info })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
};

const applyOpacity = async (buffer, opacity = 1) => {
  if (opacity >= 0.999) return buffer;
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let offset = 3; offset < data.length; offset += 4) data[offset] = Math.round(data[offset] * opacity);
  return sharp(data, { raw: info }).png().toBuffer();
};

const placeOnCanvas = async (region, {
  width, height, maxWidth, maxHeight, bottomPad = 0, scaleMultiplier = 1,
  scaleX = 1, scaleY = 1, yOffset = 0, xOffset = 0, opacity = 1, center = false
}) => {
  const trimmed = await extractTrimmed(region);
  const metadata = await sharp(trimmed).metadata();
  const baseScale = Math.min(maxWidth / (metadata.width * scaleX), maxHeight / (metadata.height * scaleY));
  const scale = Math.min(baseScale * scaleMultiplier, width / (metadata.width * scaleX), height / (metadata.height * scaleY));
  const resizedWidth = Math.max(1, Math.round(metadata.width * scale * scaleX));
  const resizedHeight = Math.max(1, Math.round(metadata.height * scale * scaleY));
  let resized = await sharp(trimmed).resize(resizedWidth, resizedHeight, { fit: "fill" }).png().toBuffer();
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
  const directory = join(root, "assets", "enemies", "random_king", sequence);
  const prefix = `random_king_${sequence}`;
  const frames = [];
  for (let index = 0; index < variants.length; index += 1) {
    const variant = variants[index];
    const frame = await placeOnCanvas(variant.region ?? region, { ...options, ...variant });
    const output = join(directory, `${prefix}_${String(index).padStart(2, "0")}.png`);
    await writeBuffer(output, frame);
    frames.push(output);
  }
  const strip = join(root, "assets", "enemies", "random_king", `${prefix}.png`);
  await sharp({
    create: { width: frameSize * frames.length, height: frameSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite(frames.map((input, index) => ({ input, left: index * frameSize, top: 0 })))
    .png({ compressionLevel: 9 }).toFile(strip);
  return strip;
};

const buildEffectSequence = async ({ key, region, frameWidth, frameHeight, variants, options }) => {
  const frames = [];
  for (const variant of variants) {
    frames.push(await placeOnCanvas(variant.region ?? region, {
      width: frameWidth, height: frameHeight, center: true, ...options, ...variant
    }));
  }
  const output = join(root, "assets", "effects", `${key}.png`);
  const sheet = await sharp({
    create: { width: frameWidth * frames.length, height: frameHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite(frames.map((input, index) => ({ input, left: index * frameWidth, top: 0 }))).png().toBuffer();
  await writeBuffer(output, await quantizeBuffer(sheet));
  return output;
};

const loop = (count, scale = 0.018, y = 2) => Array.from({ length: count }, (_, index) => ({
  scaleMultiplier: 1 + Math.sin((index / count) * Math.PI * 2) * scale,
  yOffset: Math.round(Math.sin((index / count) * Math.PI * 2) * y)
}));

const removedPixels = await removeGeneratedBackground();
const bossOptions = { width: frameSize, height: frameSize, maxWidth: 108, maxHeight: 108, bottomPad: 16 };
const sequences = [];
sequences.push(await buildSequence({ sequence: "idle", region: regions.idle, variants: loop(4), options: bossOptions }));
sequences.push(await buildSequence({ sequence: "draw", region: regions.draw, variants: loop(6, 0.024, 2), options: bossOptions }));
sequences.push(await buildSequence({
  sequence: "teleport", region: regions.teleport,
  variants: [
    { opacity: 0.34, scaleY: 0.82 }, { opacity: 0.52, scaleY: 0.9 },
    { opacity: 0.72, scaleY: 0.96 }, { opacity: 0.9 },
    { scaleY: 1.05 }, { scaleY: 1 }
  ], options: bossOptions
}));
sequences.push(await buildSequence({ sequence: "attack", region: regions.attack, variants: loop(6, 0.025, 2), options: bossOptions }));
sequences.push(await buildSequence({ sequence: "taunt", region: regions.taunt, variants: loop(6, 0.022, 2), options: bossOptions }));
sequences.push(await buildSequence({ sequence: "vulnerable", region: regions.vulnerable, variants: loop(4, 0.02, 2), options: bossOptions }));
sequences.push(await buildSequence({
  sequence: "hurt", region: regions.vulnerable,
  variants: [{ scaleX: 1.08, scaleY: 0.92 }, { scaleX: 0.94, scaleY: 1.04, yOffset: -2 }, { scaleX: 1, scaleY: 1 }],
  options: bossOptions
}));
sequences.push(await buildSequence({
  sequence: "defeated", region: regions.defeated,
  variants: [
    { region: regions.vulnerable, scaleX: 1.05, scaleY: 0.9 },
    { region: regions.vulnerable, scaleX: 1.12, scaleY: 0.78 },
    { scaleX: 0.9, scaleY: 1.08 }, { scaleX: 1, scaleY: 1 },
    { scaleX: 1.03, scaleY: 0.97 }, { scaleX: 1.05, scaleY: 0.94 },
    { scaleX: 1.07, scaleY: 0.91 }, { scaleX: 1.09, scaleY: 0.88 }
  ], options: { ...bossOptions, maxWidth: 108, maxHeight: 72 }
}));

const cardFrames = await buildEffectSequence({
  key: "fx_random_king_cards", region: regions.cards[0], frameWidth: 96, frameHeight: 112,
  variants: regions.cards.map((region) => ({ region })), options: { maxWidth: 86, maxHeight: 104 }
});
const spiral = await buildEffectSequence({
  key: "fx_random_king_teleport", region: regions.spiral, frameWidth: 192, frameHeight: 192,
  variants: [
    { opacity: 0.28, scaleMultiplier: 0.58 }, { opacity: 0.46, scaleMultiplier: 0.7 },
    { opacity: 0.66, scaleMultiplier: 0.82 }, { opacity: 0.84, scaleMultiplier: 0.92 },
    { opacity: 1 }, { opacity: 0.55, scaleMultiplier: 1.08 }
  ], options: { maxWidth: 184, maxHeight: 184 }
});
const projectile = await buildEffectSequence({
  key: "fx_random_king_projectile", region: regions.projectile, frameWidth: 64, frameHeight: 64,
  variants: loop(4, 0.05, 1), options: { maxWidth: 54, maxHeight: 54 }
});
const warningLow = await buildEffectSequence({
  key: "fx_random_king_warning_low", region: regions.warningLow, frameWidth: 256, frameHeight: 64,
  variants: loop(4, 0.035, 1), options: { maxWidth: 244, maxHeight: 54 }
});
const warningHigh = await buildEffectSequence({
  key: "fx_random_king_warning_high", region: regions.warningHigh, frameWidth: 256, frameHeight: 64,
  variants: loop(4, 0.035, 1), options: { maxWidth: 244, maxHeight: 54 }
});
const warningDiagonal = await buildEffectSequence({
  key: "fx_random_king_warning_diagonal", region: regions.warningDiagonal, frameWidth: 192, frameHeight: 192,
  variants: loop(4, 0.035, 2), options: { maxWidth: 180, maxHeight: 180 }
});
const tongue = await buildEffectSequence({
  key: "fx_random_king_tongue", region: regions.tongue, frameWidth: 192, frameHeight: 256,
  variants: loop(6, 0.03, 3), options: { maxWidth: 176, maxHeight: 242 }
});
const stars = await buildEffectSequence({
  key: "fx_random_king_vulnerable", region: regions.stars, frameWidth: 192, frameHeight: 96,
  variants: loop(4, 0.025, 2), options: { maxWidth: 180, maxHeight: 86 }
});

const contactSheet = join(root, "references", "p13-random-final-assets-contact-sheet.png");
await sharp({
  create: { width: 2048, height: 1580, channels: 4, background: { r: 238, g: 235, b: 224, alpha: 1 } }
}).composite([
  { input: sequences[0], left: 16, top: 16 }, { input: sequences[1], left: 16, top: 160 },
  { input: sequences[2], left: 16, top: 304 }, { input: sequences[3], left: 16, top: 448 },
  { input: sequences[4], left: 816, top: 448 }, { input: sequences[5], left: 16, top: 592 },
  { input: sequences[6], left: 560, top: 592 }, { input: sequences[7], left: 960, top: 592 },
  { input: cardFrames, left: 16, top: 752 }, { input: spiral, left: 16, top: 896 },
  { input: projectile, left: 1210, top: 896 }, { input: warningLow, left: 16, top: 1104 },
  { input: warningHigh, left: 1056, top: 1104 }, { input: warningDiagonal, left: 16, top: 1190 },
  { input: tongue, left: 816, top: 1190 }, { input: stars, left: 16, top: 1450 }
]).png({ compressionLevel: 9 }).toFile(contactSheet);

console.log(`P13 최종 에셋 생성: 보스 ${4 + 6 + 6 + 6 + 6 + 4 + 3 + 8}프레임·효과 ${4 + 6 + 4 + 4 + 4 + 4 + 6 + 4}프레임 · 배경 제거 ${removedPixels}픽셀`);
