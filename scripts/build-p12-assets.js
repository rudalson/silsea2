import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets", "_source", "p12", "p12_water_king_color_source_v1.png");
const alphaSource = join(root, "assets", "_source", "p12", "p12_water_king_color_source_alpha_v1.png");
const frameSize = 128;

const regions = Object.freeze({
  idle: { left: 52, top: 70, width: 270, height: 318, clear: [{ left: 25, top: 266, width: 235, height: 52 }] },
  submerge: { left: 375, top: 185, width: 330, height: 210 },
  emerge: { left: 760, top: 70, width: 300, height: 320 },
  attack: { left: 1084, top: 120, width: 272, height: 270, clear: [{ left: 12, top: 216, width: 252, height: 54 }] },
  dizzy: { left: 130, top: 460, width: 288, height: 286, clear: [{ left: 20, top: 224, width: 250, height: 62 }] },
  hurt: { left: 485, top: 500, width: 320, height: 238, clear: [{ left: 18, top: 186, width: 284, height: 52 }] },
  defeated: { left: 915, top: 575, width: 430, height: 160 },
  ripple: { left: 62, top: 765, width: 392, height: 210 },
  projectile: { left: 552, top: 786, width: 164, height: 184, clear: [{ left: 0, top: 144, width: 164, height: 40 }] },
  splash: { left: 824, top: 768, width: 240, height: 208 },
  stars: { left: 1160, top: 786, width: 280, height: 188, clear: [{ left: 36, top: 144, width: 215, height: 44 }] }
});

const approvedPalette = [
  "#3DBFE3", "#9ADDF2", "#4691A2", "#F4FBFD", "#42474E",
  "#F5DF4F", "#D09A4E", "#D1333D", "#752B5A", "#E573A0"
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
  yOffset = 0, xOffset = 0, opacity = 1, center = false
}) => {
  const trimmed = await extractTrimmed(region);
  const metadata = await sharp(trimmed).metadata();
  const baseScale = Math.min(maxWidth / metadata.width, maxHeight / metadata.height);
  const scale = Math.min(baseScale * scaleMultiplier, width / metadata.width, height / metadata.height);
  const resizedWidth = Math.max(1, Math.round(metadata.width * scale));
  const resizedHeight = Math.max(1, Math.round(metadata.height * scale));
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
  const directory = join(root, "assets", "enemies", "water_king", sequence);
  const prefix = `water_king_${sequence}`;
  const frames = [];
  for (let index = 0; index < variants.length; index += 1) {
    const variant = variants[index];
    const frame = await placeOnCanvas(variant.region ?? region, { ...options, ...variant });
    const output = join(directory, `${prefix}_${String(index).padStart(2, "0")}.png`);
    await writeBuffer(output, frame);
    frames.push(output);
  }
  const strip = join(root, "assets", "enemies", "water_king", `${prefix}.png`);
  await sharp({
    create: { width: frameSize * frames.length, height: frameSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite(frames.map((input, index) => ({ input, left: index * frameSize, top: 0 })))
    .png({ compressionLevel: 9 }).toFile(strip);
  return strip;
};

const buildEffectSequence = async ({ key, region, frameWidth, frameHeight, variants, options }) => {
  const frames = [];
  for (const variant of variants) {
    frames.push(await placeOnCanvas(region, { width: frameWidth, height: frameHeight, center: true, ...options, ...variant }));
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
const bossOptions = { width: frameSize, height: frameSize, maxWidth: 116, maxHeight: 108, bottomPad: 12 };
const sequences = [];
sequences.push(await buildSequence({ sequence: "idle", region: regions.idle, variants: loop(4), options: bossOptions }));
sequences.push(await buildSequence({
  sequence: "submerge", region: regions.submerge,
  variants: [
    { region: regions.idle }, { scaleMultiplier: 1.02, yOffset: 10 }, { yOffset: 20 },
    { scaleMultiplier: 0.96, yOffset: 28 }, { scaleMultiplier: 0.9, yOffset: 34, opacity: 0.72 },
    { scaleMultiplier: 0.82, yOffset: 40, opacity: 0.42 }
  ], options: bossOptions
}));
sequences.push(await buildSequence({
  sequence: "emerge", region: regions.emerge,
  variants: [
    { opacity: 0.3, scaleMultiplier: 0.84, yOffset: 12 }, { opacity: 0.48, scaleMultiplier: 0.9, yOffset: 7 },
    { opacity: 0.68, scaleMultiplier: 0.95, yOffset: 3 }, { opacity: 0.86 },
    { scaleMultiplier: 1.03, yOffset: -2 }, { scaleMultiplier: 1 }
  ], options: bossOptions
}));
sequences.push(await buildSequence({ sequence: "attack", region: regions.attack, variants: loop(6, 0.025, 2), options: bossOptions }));
sequences.push(await buildSequence({ sequence: "dizzy", region: regions.dizzy, variants: loop(4, 0.02, 2), options: bossOptions }));
sequences.push(await buildSequence({
  sequence: "hurt", region: regions.hurt,
  variants: [{ scaleMultiplier: 1.04 }, { scaleMultiplier: 0.95, yOffset: 3 }, { scaleMultiplier: 1 }],
  options: { ...bossOptions, maxHeight: 88 }
}));
sequences.push(await buildSequence({
  sequence: "defeated", region: regions.defeated,
  variants: [
    { region: regions.hurt, maxHeight: 88 }, { region: regions.hurt, maxHeight: 82, yOffset: 3 },
    { scaleMultiplier: 1.04, yOffset: -2 }, { scaleMultiplier: 1 }, { scaleMultiplier: 0.97, yOffset: 2 },
    { scaleMultiplier: 0.94, yOffset: 3 }, { scaleMultiplier: 0.91, yOffset: 4 }, { scaleMultiplier: 0.88, yOffset: 5 }
  ], options: { ...bossOptions, maxWidth: 120, maxHeight: 58 }
}));

const ripple = await buildEffectSequence({
  key: "fx_water_king_ripple", region: regions.ripple, frameWidth: 256, frameHeight: 128,
  variants: [
    { opacity: 0.28, scaleMultiplier: 0.62 }, { opacity: 0.45, scaleMultiplier: 0.72 },
    { opacity: 0.64, scaleMultiplier: 0.82 }, { opacity: 0.82, scaleMultiplier: 0.9 },
    { opacity: 1 }, { opacity: 0.56, scaleMultiplier: 1.06 }
  ], options: { maxWidth: 244, maxHeight: 116 }
});
const projectile = await buildEffectSequence({
  key: "fx_water_king_projectile", region: regions.projectile, frameWidth: 64, frameHeight: 64,
  variants: loop(4, 0.05, 1), options: { maxWidth: 54, maxHeight: 54 }
});
const splash = await buildEffectSequence({
  key: "fx_water_king_splash", region: regions.splash, frameWidth: 192, frameHeight: 160,
  variants: [
    { opacity: 0.25, scaleMultiplier: 0.55 }, { opacity: 0.45, scaleMultiplier: 0.68 },
    { opacity: 0.68, scaleMultiplier: 0.8 }, { opacity: 0.88, scaleMultiplier: 0.9 },
    { opacity: 1 }, { opacity: 0.55, scaleMultiplier: 1.08 }
  ], options: { maxWidth: 180, maxHeight: 148 }
});
const stars = await buildEffectSequence({
  key: "fx_water_king_dizzy", region: regions.stars, frameWidth: 192, frameHeight: 96,
  variants: loop(4, 0.025, 2), options: { maxWidth: 180, maxHeight: 84 }
});

const contactSheet = join(root, "references", "p12-water-final-assets-contact-sheet.png");
await sharp({
  create: { width: 1800, height: 1456, channels: 4, background: { r: 238, g: 235, b: 224, alpha: 1 } }
}).composite([
  { input: sequences[0], left: 16, top: 16 }, { input: sequences[1], left: 16, top: 160 },
  { input: sequences[2], left: 16, top: 304 }, { input: sequences[3], left: 16, top: 448 },
  { input: sequences[4], left: 800, top: 448 }, { input: sequences[5], left: 16, top: 592 },
  { input: sequences[6], left: 416, top: 592 }, { input: ripple, left: 16, top: 752 },
  { input: projectile, left: 16, top: 896 }, { input: splash, left: 16, top: 976 },
  { input: stars, left: 16, top: 1152 }
]).png({ compressionLevel: 9 }).toFile(contactSheet);

console.log(`P12 최종 에셋 생성: 보스 ${4 + 6 + 6 + 6 + 4 + 3 + 8}프레임·물 효과 ${6 + 4 + 6 + 4}프레임 · 배경 제거 ${removedPixels}픽셀`);
