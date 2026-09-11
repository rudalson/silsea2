import { readFile, copyFile, writeFile } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { setTimeout } from "node:timers/promises";
import { PALETTE } from "../data/palette.js";
import { hexToRgb, colorDistance } from "./image-utils.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets/_source/character-refresh");
const framePaths = JSON.parse(await readFile(join(source, "sylvia-frames.json"), "utf8"));
const atlas = await sharp(join(source, "sylvia-colorful-generated.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const palette = PALETTE.sylvia.map(hexToRgb);
const frames = [];
const sequences = new Map();
const saveFrame = async (path, buffer) => {
  // Windows preview/antivirus readers can briefly lock an existing PNG.
  for (let attempt = 0; ; attempt++) {
    try { await writeFile(path, buffer); return; }
    catch (error) {
      if (attempt >= 4 || !["UNKNOWN", "EBUSY", "EPERM"].includes(error.code)) throw error;
      await setTimeout(100 * (attempt + 1));
    }
  }
};

// The generator supplies a white matte. Flood only its exterior, retaining eye
// highlights enclosed by the character's outline, then keep the main silhouette.
function cutout(data, width, height) {
  const visited = new Uint8Array(width * height);
  const queue = [];
  const neighbors = (p) => [p % width > 0 ? p - 1 : -1, p % width < width - 1 ? p + 1 : -1, p - width, p + width]
    .filter((n) => n >= 0 && n < visited.length);
  const background = (p) => {
    const rgb = data.subarray(p * 4, p * 4 + 3);
    return data[p * 4 + 3] < 16 || (Math.min(...rgb) > 225 && Math.max(...rgb) - Math.min(...rgb) < 22);
  };
  for (let p = 0; p < visited.length; p++) {
    if ((p < width || p >= width * (height - 1) || p % width === 0 || p % width === width - 1) && background(p)) {
      visited[p] = 1;
      queue.push(p);
    }
  }
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    data[p * 4 + 3] = 0;
    for (const n of neighbors(p)) if (!visited[n] && background(n)) { visited[n] = 1; queue.push(n); }
  }
  visited.fill(0);
  let largest = [];
  for (let p = 0; p < visited.length; p++) {
    if (visited[p] || data[p * 4 + 3] < 16) continue;
    const component = [p];
    visited[p] = 1;
    for (let i = 0; i < component.length; i++) {
      for (const n of neighbors(component[i])) {
        if (!visited[n] && data[n * 4 + 3] >= 16) { visited[n] = 1; component.push(n); }
      }
    }
    if (component.length > largest.length) largest = component;
  }
  if (largest.length < 1000) throw new Error("Missing sprite in generated atlas");
  const keep = new Set(largest);
  for (let p = 0; p < visited.length; p++) if (!keep.has(p)) data.fill(0, p * 4, p * 4 + 4);
  return data;
}

for (let index = 0; index < framePaths.length; index++) {
  const x = Math.round(index % 8 * atlas.info.width / 8);
  const y = Math.round(Math.floor(index / 8) * atlas.info.height / 8);
  const width = Math.round((index % 8 + 1) * atlas.info.width / 8) - x;
  const height = Math.round((Math.floor(index / 8) + 1) * atlas.info.height / 8) - y;
  const cell = await sharp(atlas.data, { raw: atlas.info }).extract({ left: x, top: y, width, height }).raw().toBuffer();
  const trimmed = await sharp(cutout(cell, width, height), { raw: { width, height, channels: 4 } })
    .trim({ background: "#00000000", threshold: 1 }).png().toBuffer({ resolveWithObject: true });
  const targetWidth = Math.min(112, Math.round(trimmed.info.width / trimmed.info.height * 96));
  const resized = await sharp(trimmed.data).resize(targetWidth, 96, { fit: "fill" }).ensureAlpha().raw().toBuffer();
  for (let offset = 0; offset < resized.length; offset += 4) {
    if (resized[offset + 3] < 80) { resized.fill(0, offset, offset + 4); continue; }
    const rgb = resized.subarray(offset, offset + 3);
    const nearest = palette.reduce((best, candidate) => colorDistance(rgb, candidate) < colorDistance(rgb, best) ? candidate : best);
    resized.set(nearest, offset);
    resized[offset + 3] = 255;
  }
  let frame = await sharp({ create: { width: 128, height: 128, channels: 4, background: "#00000000" } })
    .composite([{ input: resized, raw: { width: targetWidth, height: 96, channels: 4 }, left: Math.floor((128 - targetWidth) / 2), top: 16 }])
    .png().toBuffer();
  const path = join(root, framePaths[index]);
  const sequence = basename(dirname(path));
  const frameIndex = Number(basename(path).match(/_(\d+)\.png$/)[1]);
  if ((sequence === "transform_unicorn" && frameIndex >= 4) || (sequence === "transform_alicorn" && frameIndex >= 2)) {
    const rgba = await sharp(frame).ensureAlpha().raw().toBuffer();
    let foreheadY = 24;
    for (let y = 12; y < 72; y++) if (rgba[(y * 128 + 108) * 4 + 3] > 40) { foreheadY = y; break; }
    const horn = await sharp(join(source, "sylvia-horn.png")).resize(8, 11, { kernel: "nearest" }).png().toBuffer();
    const transformed = await sharp(frame).composite([{ input: horn, left: 104, top: Math.max(0, foreheadY - 8) }])
      .trim({ background: "#00000000", threshold: 1 }).png().toBuffer({ resolveWithObject: true });
    const transformedWidth = Math.min(112, Math.round(transformed.info.width / transformed.info.height * 96));
    const sprite = await sharp(transformed.data).resize(transformedWidth, 96, { fit: "fill", kernel: "nearest" }).png().toBuffer();
    frame = await sharp({ create: { width: 128, height: 128, channels: 4, background: "#00000000" } })
      .composite([{ input: sprite, left: Math.floor((128 - transformedWidth) / 2), top: 16 }]).png().toBuffer();
  }
  await saveFrame(path, frame);
  frames.push(frame);
  if (!sequences.has(sequence)) sequences.set(sequence, []);
  sequences.get(sequence).push(frame);
}
for (const [sequence, strip] of sequences) {
  await sharp({ create: { width: 128 * strip.length, height: 128, channels: 4, background: "#00000000" } })
    .composite(strip.map((input, index) => ({ input, left: index * 128, top: 0 })))
    .png().toFile(join(root, `assets/characters/sylvia/sylvia_${sequence}.png`));
}
await copyFile(join(root, framePaths[4]), join(root, "assets/_anchor/sylvia_anchor.png"));
await sharp({ create: { width: 1024, height: 896, channels: 4, background: "#eee9df" } })
  .composite(frames.map((input, index) => ({ input, left: index % 8 * 128, top: Math.floor(index / 8) * 128 })))
  .png().toFile(join(root, "references/sylvia-colorful-contact-sheet.png"));
console.log(`실비아 다색 스프라이트: ${frames.length}프레임 · ${sequences.size}시트`);
