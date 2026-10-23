import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets/_source/tape-enemies");
const clear = { r: 0, g: 0, b: 0, alpha: 0 };
const canvas = (width = 128, height = 128) => sharp({ create: { width, height, channels: 4, background: clear } });
const definitions = {
  tape_rollbug: { source: "rollbug-poses.png", maxWidth: 104, maxHeight: 88 },
  tape_boxling: { source: "boxling-poses.png", maxWidth: 100, maxHeight: 88 }
};
const sequences = { idle: [0, 1], move: [2, 0, 3, 0], defeated: [4, 5] };
const entries = [], groups = {}, metadata = {}, reviewRows = [];

// Locate an empty gutter near the nominal grid boundary, preserving loose tape
// ends and box flaps when the generated spacing isn't exactly uniform.
function divider(counts, target, cellSize) {
  const from = Math.max(1, Math.round(target - cellSize * 0.2));
  const to = Math.min(counts.length - 2, Math.round(target + cellSize * 0.2));
  let best = null, longest = 0;
  for (let i = from; i <= to; i++) {
    if (counts[i]) continue;
    const start = i;
    while (i < to && counts[i + 1] === 0) i++;
    if (i - start + 1 > longest) { longest = i - start + 1; best = Math.round((start + i) / 2); }
  }
  if (best === null) throw new Error(`No transparent gutter near ${target}`);
  return best;
}

for (const [type, definition] of Object.entries(definitions)) {
  const path = join(source, definition.source);
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rowCounts = Array(info.height).fill(0);
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] >= 16) rowCounts[y]++;
  }
  const yEdges = [0, divider(rowCounts, info.height / 2, info.height / 2), info.height];
  const poses = [];
  for (let row = 0; row < 2; row++) {
    const columnCounts = Array(info.width).fill(0);
    for (let y = yEdges[row]; y < yEdges[row + 1]; y++) for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] >= 16) columnCounts[x]++;
    }
    const xEdges = [0, ...[1, 2].map(i => divider(columnCounts, info.width * i / 3, info.width / 3)), info.width];
    for (let column = 0; column < 3; column++) {
      let left = info.width, top = info.height, right = -1, bottom = -1;
      for (let y = yEdges[row]; y < yEdges[row + 1]; y++) for (let x = xEdges[column]; x < xEdges[column + 1]; x++) {
        if (data[(y * info.width + x) * 4 + 3] < 16) continue;
        left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
      if (right < left || left <= xEdges[column] || right >= xEdges[column + 1] - 1
        || top <= yEdges[row] || bottom >= yEdges[row + 1] - 1) throw new Error(`${type}: empty or clipped pose ${poses.length}`);
      poses.push({ left, top, width: right - left + 1, height: bottom - top + 1 });
    }
  }
  const scale = Math.min(...poses.map(p => Math.min(definition.maxWidth / p.width, definition.maxHeight / p.height)));
  const frames = [];
  for (const pose of poses) {
    const width = Math.round(pose.width * scale), height = Math.round(pose.height * scale);
    const art = await sharp(path).extract(pose).resize(width, height).png().toBuffer();
    frames.push(await canvas().composite([{ input: art, left: Math.round((128 - width) / 2), top: 112 - height }]).png().toBuffer());
  }
  metadata[type] = { source: definition.source, poses, scale, frameSize: 128, baselineY: 112, sequences };
  groups[type] = [];
  for (const [sequence, indices] of Object.entries(sequences)) {
    const key = `${type}_${sequence}`, directory = join(root, "assets/enemies", type, sequence);
    await mkdir(directory, { recursive: true });
    for (const [index, pose] of indices.entries()) await writeFile(join(directory, `${key}_${String(index).padStart(2, "0")}.png`), frames[pose]);
    const strip = await canvas(indices.length * 128).composite(indices.map((pose, index) => ({ input: frames[pose], left: index * 128, top: 0 }))).png().toBuffer();
    await writeFile(join(root, "assets/enemies", type, `${key}.png`), strip);
    entries.push({ key, type: "spritesheet", url: `/assets/enemies/${type}/${key}.png`, frameWidth: 128, frameHeight: 128, frames: indices.length });
    groups[type].push(key); reviewRows.push({ key, strip });
  }
}
await writeFile(join(source, "frames.json"), JSON.stringify(metadata, null, 2) + "\n");
const manifestPath = join(root, "assets/manifest.json");
let manifestText = await readFile(manifestPath, "utf8");
const registered = new Map(JSON.parse(manifestText).assets.map(entry => [entry.key, entry]));
for (const entry of entries) {
  if (registered.has(entry.key) && JSON.stringify(registered.get(entry.key)) !== JSON.stringify(entry)) {
    throw new Error(`${entry.key}: existing manifest registration differs from the recipe`);
  }
}
const missing = entries.filter(({ key }) => !registered.has(key));
if (missing.length) {
  manifestText = manifestText.replace(/\s*\]\s*\}\s*$/, `,\n${missing.map(entry => `    ${JSON.stringify(entry)}`).join(",\n")}\n  ]\n}\n`);
  await writeFile(manifestPath, manifestText);
}
const mappingPath = join(root, "references/mapping.json");
let mappingText = await readFile(mappingPath, "utf8");
const mapping = JSON.parse(mappingText);
for (const [type, keys] of Object.entries(groups)) {
  if (!mapping.$delivery.manifestGroups[type]) mappingText = mappingText.replace('"manifestGroups": {', `"manifestGroups": {\n      "${type}": ${JSON.stringify(keys)},`);
  if (!mapping[type]) {
    const note = `내장 imagegen으로 생성한 테이프 도시 ${type === "tape_rollbug" ? "금빛 테이프 말이" : "포장 박스 꼬마"}. 대기·보행·패배 6포즈 원화와 프롬프트는 assets/_source/tape-enemies에 보존. 공통 배율·128px 프레임·112px 발 기준선으로 조립.`;
    mappingText = mappingText.trimEnd().slice(0, -1).trimEnd() + `,\n  "${type}": ${JSON.stringify({ styleRefs: ["silsea_sprite-Photoroom.png"], note })}\n}\n`;
  }
}
if (mappingText !== await readFile(mappingPath, "utf8")) await writeFile(mappingPath, mappingText);
const width = 768, height = reviewRows.length * 142 + 60;
const background = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eaf8f2"/><text x="24" y="36" font-family="sans-serif" font-size="23" font-weight="700" fill="#715132">TAPE CITY</text>${reviewRows.map(({ key }, i) => `<text x="18" y="${i * 142 + 100}" font-family="sans-serif" font-size="12" fill="#715132">${key}</text>`).join("")}</svg>`);
await sharp(background).composite(reviewRows.map(({ strip }, index) => ({ input: strip, left: 192, top: index * 142 + 52 }))).png().toFile(join(root, "references/tape-enemies-review.png"));
const portraits = [];
for (const [index, definition] of Object.values(metadata).entries()) {
  const input = await sharp(join(source, definition.source)).extract(definition.poses[0]).resize({ height: 246 }).png().toBuffer();
  const { width: portraitWidth } = await sharp(input).metadata();
  portraits.push({ input, left: Math.round(index * 320 + (320 - portraitWidth) / 2), top: 64 });
}
await sharp({ create: { width: 640, height: 340, channels: 4, background: { r: 234, g: 248, b: 242, alpha: 1 } } })
  .composite(portraits).png().toFile(join(root, "references/tape-enemies-preview.png"));
console.log("테이프 도시 적 조립: 테이프 말이·박스 꼬마, 각 3상태 8프레임 · manifest/mapping 등록");
