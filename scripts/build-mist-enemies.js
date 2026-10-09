import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { buildLanternLight } from "./build-lantern-light.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const clear = { r: 0, g: 0, b: 0, alpha: 0 };
const canvas = (width, height) => sharp({ create: { width, height, channels: 4, background: clear } });
const sequences = {
  idle: [0, 2], move: [0, 1, 2, 3], warning: [4, 5, 6, 7],
  attack: [8, 9, 10, 11], recover: [7, 6, 5, 4], defeated: [12, 13, 14, 15]
};
const sources = { lantern_goblin: "lantern-goblin-sheet.png", dew_snail: "dew-snail-sheet.png" };
const entries = [];
const review = [];

// Generated sheets have generous but not perfectly equal gutters. Locate the
// empty gutters before slicing, so low poses and lantern halos aren't clipped.
function divider(counts, target, cellSize) {
  const from = Math.round(target - cellSize * 0.24);
  const to = Math.round(target + cellSize * 0.24);
  let best = Math.round(target), bestScore = Infinity;
  let widestGap = 0, gapCentre = null;
  for (let i = from; i <= to; i++) {
    if (counts[i] !== 0) continue;
    const start = i;
    while (i < to && counts[i + 1] === 0) i++;
    if (i - start + 1 > widestGap) {
      widestGap = i - start + 1;
      gapCentre = Math.round((start + i) / 2);
    }
  }
  if (widestGap >= 4) return gapCentre;
  for (let i = from; i <= to; i++) {
    const score = counts[i] * 10 + Math.abs(i - target) / cellSize;
    if (score < bestScore) { best = i; bestScore = score; }
  }
  return best;
}

for (const [type, filename] of Object.entries(sources)) {
  const path = join(root, "assets/_source/mist-enemies", filename);
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rows = Array(info.height).fill(0);
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] >= 16) rows[y]++;
  }
  const yEdges = [0, ...[1, 2, 3].map(i => divider(rows, info.height * i / 4, info.height / 4)), info.height];
  const poses = [];
  for (let row = 0; row < 4; row++) {
    const columns = Array(info.width).fill(0);
    for (let y = yEdges[row]; y < yEdges[row + 1]; y++) for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] >= 16) columns[x]++;
    }
    const xEdges = [0, ...[1, 2, 3].map(i => divider(columns, info.width * i / 4, info.width / 4)), info.width];
    for (let column = 0; column < 4; column++) {
      let left = info.width, top = info.height, right = -1, bottom = -1;
      for (let y = yEdges[row]; y < yEdges[row + 1]; y++) for (let x = xEdges[column]; x < xEdges[column + 1]; x++) {
        if (data[(y * info.width + x) * 4 + 3] < 16) continue;
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      if (right < left) throw new Error(`${type}: empty pose ${row},${column}`);
      const width = right - left + 1, height = bottom - top + 1;
      poses.push({ art: await sharp(path).extract({ left, top, width, height }).png().toBuffer(), width, height });
    }
  }
  // One scale for every pose preserves body volume when crouching or rolling.
  const scale = Math.min(106 / Math.max(...poses.map(p => p.width)), 98 / Math.max(...poses.map(p => p.height)));
  const frames = [];
  for (const pose of poses) {
    const width = Math.round(pose.width * scale), height = Math.round(pose.height * scale);
    const art = await sharp(pose.art).resize(width, height, { kernel: sharp.kernel.lanczos3 }).png().toBuffer();
    frames.push(await canvas(128, 128).composite([{ input: art, left: Math.round((128 - width) / 2), top: 112 - height }]).png().toBuffer());
  }
  for (const [sequence, indices] of Object.entries(sequences)) {
    const directory = join(root, "assets/enemies", type, sequence);
    await mkdir(directory, { recursive: true });
    for (const [frame, index] of indices.entries()) {
      await writeFile(join(directory, `${type}_${sequence}_${String(frame).padStart(2, "0")}.png`), frames[index]);
    }
    const key = `${type}_${sequence}`;
    const strip = await canvas(indices.length * 128, 128).composite(indices.map((index, frame) => ({ input: frames[index], left: frame * 128, top: 0 }))).png().toBuffer();
    await writeFile(join(root, "assets/enemies", type, `${key}.png`), strip);
    entries.push({ key, type: "spritesheet", url: `/assets/enemies/${type}/${key}.png`, frameWidth: 128, frameHeight: 128, frames: indices.length });
    review.push({ label: `${type} / ${sequence}`, strip });
  }
  await copyFile(join(root, "assets/enemies", type, "idle", `${type}_idle_00.png`), join(root, "assets/_anchor", `${type}_anchor.png`));
}

const manifestPath = join(root, "assets/manifest.json");
const manifestSource = await readFile(manifestPath, "utf8");
const manifest = JSON.parse(manifestSource);
const additions = [];
for (const entry of entries) {
  const existing = manifest.assets.find(asset => asset.key === entry.key);
  if (!existing) additions.push(entry);
  else if (Object.entries(entry).some(([key, value]) => existing[key] !== value)) throw new Error(`Update manifest metadata for ${entry.key} before rebuilding.`);
}
if (additions.length) {
  const suffix = additions.map(entry => `    ${JSON.stringify(entry)}`).join(",\n");
  await writeFile(manifestPath, manifestSource.replace(/\s*\]\s*}\s*$/, `,\n${suffix}\n  ]\n}\n`));
}
const reviewWidth = 768, rowHeight = 156;
const labels = review.map(({ label }, i) => `<text x="20" y="${i * rowHeight + 24}" fill="#24465a" font-family="sans-serif" font-size="18">${label}</text>`).join("");
const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${reviewWidth}" height="${review.length * rowHeight}"><rect width="100%" height="100%" fill="#c4edf0"/>${labels}</svg>`);
await sharp(background).composite(review.map(({ strip }, i) => ({ input: strip, left: 128, top: i * rowHeight + 28 }))).png().toFile(join(root, "references/mist-enemy-animation.png"));
await buildLanternLight();
console.log("Built lantern goblin and dew snail: 44 RGBA frames, 12 animation sheets, stable scale and 16px baseline.");
