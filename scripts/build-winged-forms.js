import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { nearestPaletteColor } from "./image-utils.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const size = 128;
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const canvas = (width = size, height = size) => sharp({ create: { width, height, channels: 4, background: transparent } });
const sharedSequencePoses = {
  idle: [0, 0, "blink", 0],
  jump_up: [8, 8], fall: [9, 9], land: [2, 0], hurt: [3, 3],
  fly: [10, 11, 12, 12, 11, 10],
  swim: [13, 13, 8, 8, 13, 13],
  victory: [0, 8, 14, 14, 14, 0]
};

// The source atlases are image-edited 4x4 pose sheets. Retain only the main
// connected silhouette in each cell: image generation can leave tiny detached
// colored flecks in the otherwise transparent background.
async function cleanCell(input, character) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const visited = new Uint8Array(info.width * info.height);
  let main = [];
  for (let start = 0; start < visited.length; start++) {
    if (visited[start] || data[start * 4 + 3] < 32) continue;
    const component = [start];
    visited[start] = 1;
    for (let q = 0; q < component.length; q++) {
      const p = component[q], x = p % info.width, y = Math.floor(p / info.width);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= info.width || ny >= info.height) continue;
        const next = ny * info.width + nx;
        if (visited[next] || data[next * 4 + 3] < 32) continue;
        visited[next] = 1;
        component.push(next);
      }
    }
    if (component.length > main.length) main = component;
  }
  if (main.length < 1000) throw new Error(`${character} 날개 시트의 캐릭터 실루엣을 찾지 못했습니다.`);
  const keep = new Uint8Array(info.width * info.height);
  for (const p of main) keep[p] = 1;
  for (let p = 0; p < keep.length; p++) {
    if (keep[p]) continue;
    const x = p % info.width, y = Math.floor(p / info.width);
    let touchesMain = false;
    for (let dy = -1; dy <= 1 && !touchesMain; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < info.width && ny < info.height && keep[ny * info.width + nx]) {
        touchesMain = true;
        break;
      }
    }
    if (!touchesMain) data.fill(0, p * 4, p * 4 + 4);
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

async function readPoses(character, form) {
  const atlas = sharp(join(root, `assets/_source/${character}-animation`, `${form}-atlas.png`));
  const { width, height } = await atlas.metadata();
  const poses = [];
  const paletteCache = new Map();
  for (let i = 0; i < 16; i++) {
    const col = i % 4, row = Math.floor(i / 4);
    const left = Math.round(col * width / 4), top = Math.round(row * height / 4);
    const cropped = await atlas.clone().extract({ left, top,
      width: Math.round((col + 1) * width / 4) - left,
      height: Math.round((row + 1) * height / 4) - top
    }).png().toBuffer();
    const cleaned = await cleanCell(cropped, character);
    const innerSize = character === "silsea" ? size - 4 : size - 8;
    const pad = (size - innerSize) / 2;
    const raw = await sharp(cleaned).resize(innerSize, innerSize)
      .extend({ top: pad, bottom: pad, left: pad, right: pad, background: transparent })
      .ensureAlpha().raw().toBuffer();
    let minX = size, maxX = 0, minY = size, maxY = 0;
    for (let p = 0; p < size * size; p++) {
      const offset = p * 4;
      if (raw[offset + 3] < 16) { raw.fill(0, offset, offset + 4); continue; }
      const x = p % size, y = Math.floor(p / size);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      const key = `${raw[offset]},${raw[offset + 1]},${raw[offset + 2]}`;
      if (!paletteCache.has(key)) paletteCache.set(key, nearestPaletteColor([...raw.subarray(offset, offset + 3)]).rgb);
      const rgb = paletteCache.get(key);
      raw[offset] = rgb[0]; raw[offset + 1] = rgb[1]; raw[offset + 2] = rgb[2];
    }
    if (minX === size) throw new Error(`${character}/${form} 원화 ${i}번 칸이 비어 있습니다.`);
    const shiftX = minX < 8 ? 8 - minX : maxX > 119 ? 119 - maxX : 0;
    const shiftY = 111 - maxY;
    if (minY + shiftY < 2 || minX + shiftX < 8 || maxX + shiftX > 119) {
      throw new Error(`${character}/${form} 원화 ${i}번 칸이 프레임 여백을 벗어납니다: x=${minX + shiftX}..${maxX + shiftX}, y=${minY + shiftY}..${maxY + shiftY}`);
    }
    const frame = await sharp(raw, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
    poses.push(await canvas().composite([{ input: frame, left: shiftX, top: shiftY }]).png().toBuffer());
  }
  // Only the eye changes while idle; the torso and planted feet stay fixed.
  const eye = character === "potato89"
    ? { left: 72, top: 37, width: 27, height: 31 }
    : { left: 89, top: 30, width: 23, height: 25 };
  const eyelid = await sharp(poses[1]).extract(eye).png().toBuffer();
  poses.blink = await sharp(poses[0]).composite([{ input: eyelid, left: eye.left, top: eye.top }]).png().toBuffer();
  return poses;
}

async function writeSheet(character, key, frames, sequence = null) {
  const output = join(root, "assets/characters", character);
  if (sequence) {
    await mkdir(join(output, sequence), { recursive: true });
    for (const [index, frame] of frames.entries()) {
      await writeFile(join(output, sequence, `${key}_${String(index).padStart(2, "0")}.png`), frame);
    }
  }
  const sheet = await canvas(size * frames.length).composite(frames.map((input, index) => ({ input, left: index * size, top: 0 })))
    .png().toBuffer();
  await writeFile(join(output, `${key}.png`), sheet);
}

const requestedCharacters = process.argv.slice(2);
const characters = requestedCharacters.length ? requestedCharacters : ["silsea", "sylvia", "potato89"];
for (const character of characters) {
  if (!["silsea", "sylvia", "potato89"].includes(character)) throw new Error(`지원하지 않는 캐릭터: ${character}`);
  const output = join(root, "assets/characters", character);
  const move = character === "potato89" ? "roll" : "run";
  const sequencePoses = {
    ...sharedSequencePoses,
    [move]: [4, 4, 5, 5, 6, 6, 7, 7],
    ...(character === "potato89" ? { stomp: [0, 8, 15, 0] } : {})
  };
  const forms = Object.fromEntries(await Promise.all(["pegasus", "alicorn"].map(async form => [form, await readPoses(character, form)])));
  for (const [form, poses] of Object.entries(forms)) {
    for (const [sequence, indices] of Object.entries(sequencePoses)) {
      const frames = indices.map(index => index === "blink" ? poses.blink : poses[index]);
      await writeSheet(character, `${character}_${form}_${sequence}`, frames);
    }
  }

  const fromSheet = async (key, index = 0) => sharp(join(output, `${key}.png`))
    .extract({ left: index * size, top: 0, width: size, height: size }).png().toBuffer();
  await writeSheet(character, `${character}_transform_pegasus`, [
    await fromSheet(`${character}_idle`), await fromSheet(`${character}_idle`),
    forms.pegasus[0], forms.pegasus[8], forms.pegasus[10], forms.pegasus[0]
  ], "transform_pegasus");
  await writeSheet(character, `${character}_transform_alicorn`, [
    await fromSheet(`${character}_idle`), await fromSheet(`${character}_unicorn_idle`),
    forms.pegasus[0], forms.alicorn[0], forms.alicorn[8],
    forms.alicorn[10], forms.alicorn[0], forms.alicorn[0]
  ], "transform_alicorn");

  const review = [];
  for (const [row, form] of ["pegasus", "alicorn"].entries()) {
    for (const [column, pose] of [0, 4, 8, 10, 11, 12, 13, 14].entries()) {
      review.push({ input: forms[form][pose], left: column * size, top: row * size });
    }
  }
  await sharp({ create: { width: size * 8, height: size * 2, channels: 4, background: "#eeebe0" } })
    .composite(review).png().toFile(join(root, `references/${character}-winged-forms.png`));
  console.log(`${character} 페가수스·알리콘: ${Object.keys(sequencePoses).length * 2}개 동작 시트와 변신 프레임 생성 완료`);
}
