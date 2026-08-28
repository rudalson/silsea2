import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets", "_source", "p6", "p6_combat_devices_color_source.png");
const alphaSource = join(root, "assets", "_source", "p6", "p6_combat_devices_color_source_alpha.png");
const frameSize = 128;

const regions = Object.freeze({
  silseaReady: { left: 18, top: 82, width: 304, height: 276 },
  silseaActive: { left: 335, top: 82, width: 240, height: 280 },
  potatoReady: { left: 850, top: 88, width: 220, height: 276 },
  potatoActive: { left: 1080, top: 84, width: 195, height: 286 },
  archerIdle: { left: 65, top: 392, width: 300, height: 240 },
  archerAim: { left: 350, top: 390, width: 320, height: 250 },
  archerShoot: { left: 700, top: 388, width: 260, height: 252 },
  archerDefeated: { left: 1040, top: 410, width: 245, height: 238 },
  arrow: { left: 1320, top: 466, width: 190, height: 118 },
  emitter: { left: 60, top: 666, width: 270, height: 300 },
  switchOn: { left: 378, top: 700, width: 270, height: 270 },
  switchOff: { left: 680, top: 700, width: 300, height: 270 },
  warning: { left: 1080, top: 650, width: 90, height: 320 },
  beam: { left: 1280, top: 622, width: 145, height: 286 }
});

const paletteGroups = Object.freeze({
  silsea: ["#F1F6FA", "#F4FBFD", "#E573A0", "#D294AC", "#DEB5C6", "#9598A2", "#42474E"],
  potato: ["#957242", "#5D4326", "#DEB5C6", "#D294AC", "#F1F6FA", "#F4FBFD", "#42474E"],
  archer: ["#957242", "#5D4326", "#F1F6FA", "#F4FBFD", "#D294AC", "#E573A0", "#D09A4E", "#F5DF4F", "#82CB70", "#CDE5B9", "#42474E"],
  device: ["#193A3E", "#214D59", "#285144", "#82CB70", "#A8AA96", "#F5DF4F", "#F4FBFD", "#3DBFE3", "#D294AC", "#752B5A", "#42474E"]
});

const toRgb = (hex) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const paletteRgb = Object.fromEntries(
  Object.entries(paletteGroups).map(([key, values]) => [key, values.map(toRgb)])
);

const distance = (left, right) => {
  const red = left[0] - right[0];
  const green = left[1] - right[1];
  const blue = left[2] - right[2];
  return red * red * 0.3 + green * green * 0.59 + blue * blue * 0.11;
};

const quantizeBuffer = async (buffer, paletteKey) => {
  const allowed = paletteRgb[paletteKey];
  if (!allowed) return buffer;
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] === 0) continue;
    const current = [data[offset], data[offset + 1], data[offset + 2]];
    const nearest = allowed.reduce(
      (best, color) => distance(current, color) < best.distance
        ? { color, distance: distance(current, color) }
        : best,
      { color: allowed[0], distance: Number.POSITIVE_INFINITY }
    ).color;
    data[offset] = nearest[0];
    data[offset + 1] = nearest[1];
    data[offset + 2] = nearest[2];
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
};

const removeSmallComponents = async (buffer, minimumPixels = 0) => {
  if (minimumPixels <= 0) return buffer;
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const visited = new Uint8Array(info.width * info.height);
  const queue = new Int32Array(info.width * info.height);
  const components = [];

  for (let seed = 0; seed < visited.length; seed += 1) {
    if (visited[seed] || data[seed * 4 + 3] === 0) continue;
    let head = 0;
    let tail = 0;
    visited[seed] = 1;
    queue[tail++] = seed;
    const pixels = [];
    while (head < tail) {
      const pixel = queue[head++];
      pixels.push(pixel);
      const x = pixel % info.width;
      const y = Math.floor(pixel / info.width);
      for (const [nextX, nextY] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nextX < 0 || nextY < 0 || nextX >= info.width || nextY >= info.height) continue;
        const next = nextY * info.width + nextX;
        if (visited[next] || data[next * 4 + 3] === 0) continue;
        visited[next] = 1;
        queue[tail++] = next;
      }
    }
    components.push(pixels);
  }

  for (const pixels of components) {
    if (pixels.length >= minimumPixels) continue;
    for (const pixel of pixels) data[pixel * 4 + 3] = 0;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
};

const isConnectedBackground = (red, green, blue) => {
  const minimum = Math.min(red, green, blue);
  const maximum = Math.max(red, green, blue);
  return minimum >= 226 && maximum - minimum <= 15;
};

const removeConnectedBackground = async () => {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const visited = new Uint8Array(info.width * info.height);
  const queue = new Int32Array(info.width * info.height);
  let head = 0;
  let tail = 0;

  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= info.width || y >= info.height) return;
    const pixel = y * info.width + x;
    if (visited[pixel]) return;
    const offset = pixel * info.channels;
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
    const offset = pixel * info.channels;
    if (visited[pixel]) {
      data[offset + 3] = 0;
      removedPixels += 1;
      continue;
    }
  }

  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(alphaSource);
  return removedPixels;
};

const extractTrimmed = async (region) => {
  const extracted = await sharp(alphaSource)
    .extract(region)
    .png()
    .toBuffer();
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
  palette = null,
  minimumComponentPixels = 0
}) => {
  const trimmed = await removeSmallComponents(await extractTrimmed(region), minimumComponentPixels);
  const metadata = await sharp(trimmed).metadata();
  const scale = Math.min(maxWidth / metadata.width, maxHeight / metadata.height) * scaleMultiplier;
  const resizedWidth = Math.max(1, Math.round(metadata.width * scale));
  const resizedHeight = Math.max(1, Math.round(metadata.height * scale));
  const resized = await sharp(trimmed)
    .resize(resizedWidth, resizedHeight, { fit: "fill" })
    .png()
    .toBuffer();
  const left = Math.round((width - resizedWidth) / 2);
  const top = Math.max(0, height - bottomPad - resizedHeight + yOffset);
  const placed = await sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([{ input: resized, left, top }]).png({ compressionLevel: 9 }).toBuffer();
  return quantizeBuffer(placed, palette);
};

const writeBuffer = async (path, buffer) => {
  await mkdir(dirname(path), { recursive: true });
  await sharp(buffer).png({ compressionLevel: 9 }).toFile(path);
};

const buildSequence = async ({ rootDirectory, prefix, regions: frameRegions, variants, options }) => {
  const frames = [];
  for (let index = 0; index < frameRegions.length; index += 1) {
    const buffer = await placeOnCanvas(frameRegions[index], { ...options, ...(variants[index] ?? {}) });
    const output = join(rootDirectory, `${prefix}_${String(index).padStart(2, "0")}.png`);
    await writeBuffer(output, buffer);
    frames.push(output);
  }
  const strip = join(dirname(rootDirectory), `${prefix}.png`);
  await sharp({
    create: {
      width: options.width * frames.length,
      height: options.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  }).composite(frames.map((input, index) => ({ input, left: index * options.width, top: 0 })))
    .png({ compressionLevel: 9 })
    .toFile(strip);
  return strip;
};

const removedPixels = await removeConnectedBackground();

const silseaOptions = { width: frameSize, height: frameSize, maxWidth: 118, maxHeight: 108, bottomPad: 16, palette: "silsea", minimumComponentPixels: 120 };
const potatoOptions = { width: frameSize, height: frameSize, maxWidth: 118, maxHeight: 108, bottomPad: 16, palette: "potato", minimumComponentPixels: 120 };
const enemyOptions = { width: frameSize, height: frameSize, maxWidth: 118, maxHeight: 94, bottomPad: 16, palette: "archer", minimumComponentPixels: 55 };

const silseaGuard = await buildSequence({
  rootDirectory: join(root, "assets", "characters", "silsea", "wing_guard"),
  prefix: "silsea_wing_guard",
  regions: [regions.silseaReady, regions.silseaActive, regions.silseaActive, regions.silseaActive],
  variants: [{ scaleMultiplier: 0.98 }, {}, { scaleMultiplier: 0.985, yOffset: 2 }, { scaleMultiplier: 1.01 }],
  options: silseaOptions
});

const potatoGuard = await buildSequence({
  rootDirectory: join(root, "assets", "characters", "potato89", "wing_guard"),
  prefix: "potato89_wing_guard",
  regions: [regions.potatoReady, regions.potatoActive, regions.potatoActive, regions.potatoActive],
  variants: [{ scaleMultiplier: 0.98 }, {}, { scaleMultiplier: 0.985, yOffset: 2 }, { scaleMultiplier: 1.01 }],
  options: potatoOptions
});

const archerDirectory = join(root, "assets", "enemies", "potato_archer");
const archerIdle = await buildSequence({
  rootDirectory: join(archerDirectory, "idle"),
  prefix: "potato_archer_idle",
  regions: [regions.archerIdle, regions.archerIdle],
  variants: [{}, { scaleMultiplier: 0.985, yOffset: 2 }],
  options: enemyOptions
});
const archerAim = await buildSequence({
  rootDirectory: join(archerDirectory, "aim"),
  prefix: "potato_archer_aim",
  regions: [regions.archerAim, regions.archerAim, regions.archerAim],
  variants: [{ scaleMultiplier: 0.98 }, {}, { scaleMultiplier: 1.01 }],
  options: enemyOptions
});
const archerShoot = await buildSequence({
  rootDirectory: join(archerDirectory, "shoot"),
  prefix: "potato_archer_shoot",
  regions: [regions.archerShoot, regions.archerShoot, regions.archerShoot],
  variants: [{ scaleMultiplier: 1.01 }, {}, { scaleMultiplier: 0.98, yOffset: 2 }],
  options: enemyOptions
});
const archerDefeated = await buildSequence({
  rootDirectory: join(archerDirectory, "defeated"),
  prefix: "potato_archer_defeated",
  regions: [regions.archerDefeated, regions.archerDefeated, regions.archerDefeated, regions.archerDefeated],
  variants: [{}, { scaleMultiplier: 0.96, yOffset: 2 }, { scaleMultiplier: 0.9, yOffset: 5 }, { scaleMultiplier: 0.82, yOffset: 8 }],
  options: enemyOptions
});

const staticSpecs = [
  ["projectiles/projectile_arrow.png", regions.arrow, { width: 64, height: 32, maxWidth: 60, maxHeight: 24, palette: "archer" }],
  ["effects/laser_emitter.png", regions.emitter, { width: 128, height: 128, maxWidth: 118, maxHeight: 118, bottomPad: 3, palette: "device" }],
  ["effects/laser_switch_on.png", regions.switchOn, { width: 128, height: 96, maxWidth: 118, maxHeight: 88, bottomPad: 3, palette: "device" }],
  ["effects/laser_switch_off.png", regions.switchOff, { width: 128, height: 96, maxWidth: 118, maxHeight: 88, bottomPad: 3, palette: "device" }],
  ["effects/fx_laser_warning.png", regions.warning, { width: 64, height: 256, maxWidth: 54, maxHeight: 248, bottomPad: 4, palette: "device" }],
  ["effects/fx_laser_beam.png", regions.beam, { width: 96, height: 256, maxWidth: 88, maxHeight: 248, bottomPad: 4, palette: "device" }]
];

const staticOutputs = [];
for (const [relativePath, region, options] of staticSpecs) {
  const output = join(root, "assets", relativePath);
  await writeBuffer(output, await placeOnCanvas(region, options));
  staticOutputs.push(output);
}

const contactSheet = join(root, "references", "p6-final-assets-contact-sheet.png");
const background = { r: 238, g: 235, b: 224, alpha: 1 };
await sharp({
  create: { width: 1664, height: 720, channels: 4, background }
}).composite([
  { input: silseaGuard, left: 16, top: 16 },
  { input: potatoGuard, left: 16, top: 160 },
  { input: archerIdle, left: 16, top: 320 },
  { input: archerAim, left: 288, top: 320 },
  { input: archerShoot, left: 688, top: 320 },
  { input: archerDefeated, left: 1088, top: 320 },
  { input: staticOutputs[0], left: 30, top: 552 },
  { input: staticOutputs[1], left: 160, top: 552 },
  { input: staticOutputs[2], left: 352, top: 584 },
  { input: staticOutputs[3], left: 528, top: 584 },
  { input: staticOutputs[4], left: 760, top: 448 },
  { input: staticOutputs[5], left: 1000, top: 448 }
]).png({ compressionLevel: 9 }).toFile(contactSheet);

console.log(`P6 최종 에셋 생성: 캐릭터 8프레임·궁수 12프레임·장치/효과 ${staticOutputs.length}종 · 배경 제거 ${removedPixels}픽셀`);
