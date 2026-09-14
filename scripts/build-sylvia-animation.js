import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { nearestPaletteColor } from "./image-utils.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets/_source/sylvia-animation");
const output = join(root, "assets/characters/sylvia");
const size = 128;
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const canvas = () => sharp({ create: { width: size, height: size, channels: 4, background: transparent } });

async function readAtlas(filename) {
  const { data, info } = await sharp(join(source, filename)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const excess = data[i + 1] - Math.max(data[i], data[i + 2]);
    if (excess <= 30) continue; // Preserve turquoise hair, whose green and blue are close.
    data[i + 3] = Math.round(255 * Math.max(0, 1 - (excess - 30) / 150));
    data[i + 1] = Math.min(data[i + 1], Math.max(data[i], data[i + 2]));
  }
  // Extract connected silhouettes rather than cutting at nominal grid lines:
  // a hoof or tail can slightly cross a cell boundary in the generated atlas.
  const visited = new Uint8Array(info.width * info.height);
  const components = [];
  for (let start = 0; start < visited.length; start++) {
    if (visited[start] || data[start * 4 + 3] < 16) continue;
    const queue = [start];
    visited[start] = 1;
    let minX = info.width, minY = info.height, maxX = 0, maxY = 0;
    for (let q = 0; q < queue.length; q++) {
      const p = queue[q], x = p % info.width, y = Math.floor(p / info.width);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= info.width || ny >= info.height) continue;
        const n = ny * info.width + nx;
        if (visited[n] || data[n * 4 + 3] < 16) continue;
        visited[n] = 1;
        queue.push(n);
      }
    }
    if (queue.length < 300) {
      // Discard the atlas's stray marks; impact effects belong to the game.
      for (const p of queue) data[p * 4 + 3] = 0;
    } else components.push({ minX, minY, maxX, maxY, pixels: queue.length, indices: queue });
  }
  return { info, components, data };
}


// Mask by component membership before cropping, so an adjacent tail cannot
// leak into the rectangular crop of a jumping pony or outstretched wing.
async function cropComponent(atlas, component, scale) {
  const { minX, minY, maxX, maxY, indices } = component;
  const width = maxX - minX + 1, height = maxY - minY + 1;
  const raw = Buffer.alloc(width * height * 4);
  for (const p of indices) {
    const x = p % atlas.info.width - minX;
    const y = Math.floor(p / atlas.info.width) - minY;
    atlas.data.copy(raw, (y * width + x) * 4, p * 4, p * 4 + 4);
  }
  return sharp(raw, { raw: { width, height, channels: 4 } })
    .resize(Math.round(width * scale), Math.round(height * scale)).png().toBuffer();
}

const atlas = await readAtlas("atlas-green.png");
const cells = Array.from({ length: 8 }, () => []);
const baselines = [154, 300, 465, 624, 752, 903, 1062, 1218];
const gridRows = [0, 164, 310, 470, 635, 762, 917, 1070, 1254];
const registrations = [];
for (const component of atlas.components) {
  const { minX, minY, maxX, maxY } = component;
  const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
  const col = Math.floor(centerX / (atlas.info.width / 8));
  const row = gridRows.findIndex((start, i) => centerY >= start && centerY < gridRows[i + 1]);
  if (row < 0 || col > 7 || cells[row][col]) throw new Error(`원본 프레임 배치 확인 필요: ${row},${col}`);
  const width = maxX - minX + 1, height = maxY - minY + 1;
  const frame = await cropComponent(atlas, component, 0.70);
  const left = Math.round(8 + (minX - col * atlas.info.width / 8) * 0.70);
  const top = Math.round(112 - (baselines[row] - minY) * 0.70);
  cells[row][col] = await canvas().composite([{ input: frame, left, top }]).png().toBuffer();
  registrations.push({ row, col, bounds: [minX, minY, width, height], scale: 0.70 });
}
const expectedColumns = [8, 8, 8, 6, 6, 6, 6, 8];
for (let row = 0; row < 8; row++) for (let col = 0; col < expectedColumns[row]; col++) {
  if (!cells[row][col]) throw new Error(`원본 프레임 누락: ${row},${col}`);
}

const flight = await readAtlas("flight-green.png");
const flightEyes = [[436, 281], [924, 281], [1441, 281], [436, 670], [924, 670], [1441, 670]];
const fly = [];
if (flight.components.length !== 6) throw new Error("비행 원본에 정확히 6개의 연결된 포즈가 필요합니다.");
for (const component of flight.components) {
  const { minX, minY, maxX, maxY } = component;
  const col = Math.floor((minX + maxX) / 2 / 512);
  const row = Math.floor((minY + maxY) / 2 / 512);
  const index = row * 3 + col;
  const frame = await cropComponent(flight, component, 0.23);
  const [eyeX, eyeY] = flightEyes[index];
  fly[index] = await canvas().composite([{ input: frame,
    left: Math.round(98 - (eyeX - minX) * 0.23), top: Math.round(51 - (eyeY - minY) * 0.23)
  }]).png().toBuffer();
}

// One immutable body drawing across the idle cycle; only eyelids change.
const eyeRegion = { left: 92, top: 33, width: 13, height: 13 };
const eyelid = await sharp(cells[0][2]).extract({ ...eyeRegion, top: eyeRegion.top + 3 }).png().toBuffer();
const blink = await sharp(cells[0][0]).composite([{ input: eyelid, left: eyeRegion.left, top: eyeRegion.top }]).png().toBuffer();
const sequences = {
  idle: [cells[0][0], cells[0][0], blink, cells[0][0]],
  run: cells[1],
  jump_up: cells[2].slice(0, 2),
  fall: cells[2].slice(2, 4),
  land: [cells[0][4], cells[0][0]],
  hurt: cells[0].slice(6, 8),
  wing_guard: [cells[2][4], cells[2][5], cells[2][6], cells[2][6]],
  fly,
  swim: cells[4].slice(0, 6),
  victory: [...cells[5].slice(0, 5), cells[0][0]],
  transform_unicorn: [cells[0][0], ...cells[6].slice(1, 6)],
  transform_pegasus: [cells[0][0], cells[0][0], cells[2][4], fly[1], fly[0], fly[0]],
  transform_alicorn: [cells[0][0], ...cells[7].slice(1, 8)]
};
const airborne = new Set(["jump_up", "fall", "fly", "swim", "wing_guard", "transform_pegasus"]);
const paletteCache = new Map();
for (const [name, frames] of Object.entries(sequences)) {
  await mkdir(join(output, name), { recursive: true });
  for (const [index, input] of frames.entries()) {
    const raw = await sharp(input).ensureAlpha().raw().toBuffer();
    let minX = size, maxX = 0, maxY = 0;
    for (let p = 0; p < raw.length; p += 4) {
      if (raw[p + 3] < 16) { raw[p + 3] = 0; continue; }
      minX = Math.min(minX, (p / 4) % size); maxX = Math.max(maxX, (p / 4) % size);
      if (raw[p + 3] >= 128) maxY = Math.max(maxY, Math.floor(p / 4 / size));
      const key = `${raw[p]},${raw[p + 1]},${raw[p + 2]}`;
      if (!paletteCache.has(key)) paletteCache.set(key, nearestPaletteColor([raw[p], raw[p + 1], raw[p + 2]]).rgb);
      const rgb = paletteCache.get(key);
      raw[p] = rgb[0]; raw[p + 1] = rgb[1]; raw[p + 2] = rgb[2];
    }
    const quantized = await sharp(raw, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
    frames[index] = await canvas().composite([{ input: quantized,
      left: minX < 8 ? 8 - minX : maxX > 119 ? 119 - maxX : 0,
      top: airborne.has(name) ? 0 : 111 - maxY
    }]).png().toBuffer();
    await writeFile(join(output, name, `sylvia_${name}_${String(index).padStart(2, "0")}.png`), frames[index]);
  }
  const sheet = await sharp({ create: { width: size * frames.length, height: size, channels: 4, background: transparent } })
    .composite(frames.map((input, i) => ({ input, left: i * size, top: 0 }))).png().toBuffer();
  await writeFile(join(output, `sylvia_${name}.png`), sheet);
}
await copyFile(join(output, "idle/sylvia_idle_00.png"), join(root, "assets/_anchor/sylvia_anchor.png"));
await writeFile(join(source, "frames.json"), `${JSON.stringify({
  sequences: Object.fromEntries(Object.entries(sequences).map(([key, frames]) => [key, frames.length])),
  idleEyeRegion: eyeRegion, registrations
}, null, 2)}\n`);
await sharp({ create: { width: size * 8, height: size * Object.keys(sequences).length, channels: 4, background: "#eeebe0" } })
  .composite(Object.keys(sequences).map((name, row) => ({ input: join(output, `sylvia_${name}.png`), left: 0, top: row * size })))
  .png().toFile(join(root, "references/sylvia-animation-refined.png"));
console.log("실비아 애니메이션 생성: 13종 / 62프레임");
