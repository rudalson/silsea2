import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PALETTE } from "../data/palette.js";
import { colorDistance, hexToRgb } from "./image-utils.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets", "_source", "c2", "c2_result_stickers_generated_v1.png");
const outputRoot = join(root, "assets", "ui");
const referenceRoot = join(root, "references");
const OUTPUT_SIZE = 128;
const MAX_SUBJECT_SIZE = 112;
const BACKGROUND_MIN = 220;
const BACKGROUND_CHANNEL_DELTA = 18;

const specs = Object.freeze([
  Object.freeze({ key: "ui_result_sticker_clear", palette: [PALETTE.environmentNeutral[0], PALETTE.highlight[0], ...PALETTE.collect] }),
  Object.freeze({ key: "ui_result_sticker_collect", palette: [PALETTE.environmentNeutral[0], PALETTE.collect[0]] }),
  Object.freeze({ key: "ui_result_sticker_secret", palette: [PALETTE.environmentNeutral[0], PALETTE.collect[1]] }),
  Object.freeze({ key: "ui_result_sticker_speed", palette: [PALETTE.environmentNeutral[0], PALETTE.highlight[0], PALETTE.environmentNear[0], PALETTE.collect[2]] }),
  Object.freeze({ key: "ui_result_sticker_perfect", palette: [PALETTE.environmentNeutral[0], PALETTE.highlight[0], PALETTE.collect[0], PALETTE.danger[0]] })
]);

const isGeneratedBackground = (data, offset) => {
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  return Math.min(red, green, blue) >= BACKGROUND_MIN
    && Math.max(red, green, blue) - Math.min(red, green, blue) <= BACKGROUND_CHANNEL_DELTA;
};

const removeConnectedBackground = (data, width, height) => {
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const enqueue = (x, y) => {
    const pixel = y * width + x;
    if (visited[pixel] || !isGeneratedBackground(data, pixel * 4)) return;
    visited[pixel] = 1;
    queue[tail] = pixel;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (head < tail) {
    const pixel = queue[head];
    head += 1;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) enqueue(x - 1, y);
    if (x + 1 < width) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y + 1 < height) enqueue(x, y + 1);
  }

  for (let pixel = 0; pixel < visited.length; pixel += 1) {
    if (!visited[pixel]) continue;
    const offset = pixel * 4;
    data[offset] = 0;
    data[offset + 1] = 0;
    data[offset + 2] = 0;
    data[offset + 3] = 0;
  }
};

const findHorizontalRuns = (data, width, height) => {
  const occupied = new Uint8Array(width);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 16) occupied[x] = 1;
    }
  }
  const runs = [];
  let start = -1;
  for (let x = 0; x <= width; x += 1) {
    if (x < width && occupied[x] && start < 0) start = x;
    if ((x === width || !occupied[x]) && start >= 0) {
      runs.push({ left: start, width: x - start });
      start = -1;
    }
  }
  return runs;
};

const findOpaqueBounds = (data, info) => {
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] <= 16) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) throw new Error("C2 스티커 전경이 없습니다.");
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
};

const compilePalette = (hexes) => [...new Set(hexes)].map((hex) => hexToRgb(hex));
const quantize = (data, palette) => {
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] <= 16) {
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 0;
      continue;
    }
    const rgb = [data[offset], data[offset + 1], data[offset + 2]];
    const nearest = palette.reduce((best, candidate) => {
      const distance = colorDistance(rgb, candidate);
      return distance < best.distance ? { rgb: candidate, distance } : best;
    }, { rgb: palette[0], distance: Infinity }).rgb;
    data[offset] = nearest[0];
    data[offset + 1] = nearest[1];
    data[offset + 2] = nearest[2];
  }
};

const rawSource = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
removeConnectedBackground(rawSource.data, rawSource.info.width, rawSource.info.height);
const runs = findHorizontalRuns(rawSource.data, rawSource.info.width, rawSource.info.height);
if (runs.length !== specs.length) {
  throw new Error(`C2 컬러 시트의 분리 가능한 기호 수가 ${runs.length}개임 (5개 필요)`);
}

await mkdir(outputRoot, { recursive: true });
await mkdir(referenceRoot, { recursive: true });
const results = [];

for (let index = 0; index < specs.length; index += 1) {
  const spec = specs[index];
  const run = runs[index];
  const slice = await sharp(rawSource.data, { raw: rawSource.info })
    .extract({ left: run.left, top: 0, width: run.width, height: rawSource.info.height })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bounds = findOpaqueBounds(slice.data, slice.info);
  const trimmed = await sharp(slice.data, { raw: slice.info })
    .extract(bounds)
    .resize(MAX_SUBJECT_SIZE, MAX_SUBJECT_SIZE, { fit: "inside", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  const trimmedMetadata = await sharp(trimmed).metadata();
  const canvas = await sharp({
    create: { width: OUTPUT_SIZE, height: OUTPUT_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{
      input: trimmed,
      left: Math.round((OUTPUT_SIZE - trimmedMetadata.width) / 2),
      top: Math.round((OUTPUT_SIZE - trimmedMetadata.height) / 2)
    }])
    .raw()
    .toBuffer({ resolveWithObject: true });
  quantize(canvas.data, compilePalette(spec.palette));
  const output = join(outputRoot, `${spec.key}.png`);
  await sharp(canvas.data, { raw: canvas.info }).png({ compressionLevel: 9 }).toFile(output);
  results.push({ ...spec, output });
}

const slotSize = 160;
const contactSheet = await sharp({
  create: {
    width: slotSize * results.length,
    height: slotSize,
    channels: 4,
    background: { ...Object.fromEntries(["r", "g", "b"].map((channel, index) => [channel, hexToRgb(PALETTE.base[0])[index]])), alpha: 1 }
  }
})
  .composite(await Promise.all(results.map(async ({ output }, index) => ({
    input: await sharp(output).resize(112, 112, { fit: "inside" }).png().toBuffer(),
    left: index * slotSize + 24,
    top: 24
  }))))
  .png({ compressionLevel: 9 })
  .toFile(join(referenceRoot, "could2-sticker-final-contact-sheet.png"));

for (const { key, output } of results) {
  const { data, info } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bounds = findOpaqueBounds(data, info);
  console.log(`${key}: ${info.width}x${info.height}, opaque ${bounds.width}x${bounds.height}`);
}

void contactSheet;
