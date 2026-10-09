import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const key = "invisible_king";
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const canvas = (width = 128, height = 128) => sharp({ create: { width, height, channels: 4, background: transparent } });
const poseMap = {
  idle: [0, 0, 1, 0], reveal: [2, 2, 3, 3, 0, 0], hide: [4, 4, 5, 5, 4, 4],
  attack: [6, 7, 8, 9, 9, 0], hurt: [10, 11, 0], defeated: [12, 12, 13, 13, 14, 14, 15, 15]
};

function divider(counts, target, cellSize) {
  const from = Math.round(target - cellSize * 0.25), to = Math.round(target + cellSize * 0.25);
  let widest = 0, center = Math.round(target);
  for (let i = from; i <= to; i++) {
    if (counts[i] > 0) continue;
    const start = i;
    while (i < to && counts[i + 1] === 0) i++;
    if (i - start + 1 > widest) { widest = i - start + 1; center = Math.round((start + i) / 2); }
  }
  if (widest < 4) throw new Error("투명 대왕 원화의 포즈 사이 투명 여백을 확인하세요.");
  return center;
}

export async function buildInvisibleKing() {
  const path = join(root, "assets/_source/invisible-king-storybook/key-poses.png");
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Discard detached export specks; preserve the painted body and its soft alpha.
  const visited = new Uint8Array(info.width * info.height);
  for (let start = 0; start < visited.length; start++) {
    if (visited[start] || data[start * 4 + 3] < 16) continue;
    const queue = [start]; visited[start] = 1;
    for (let q = 0; q < queue.length; q++) {
      const pixel = queue[q], x = pixel % info.width, y = Math.floor(pixel / info.width);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= info.width || ny >= info.height) continue;
        const next = ny * info.width + nx;
        if (visited[next] || data[next * 4 + 3] < 16) continue;
        visited[next] = 1; queue.push(next);
      }
    }
    if (queue.length < 100) for (const pixel of queue) data.fill(0, pixel * 4, pixel * 4 + 4);
  }
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
    for (let col = 0; col < 4; col++) {
      let left = info.width, top = info.height, right = -1, bottom = -1;
      for (let y = yEdges[row]; y < yEdges[row + 1]; y++) for (let x = xEdges[col]; x < xEdges[col + 1]; x++) {
        if (data[(y * info.width + x) * 4 + 3] < 16) continue;
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      if (right < left) throw new Error(`투명 대왕 ${row}/${col}: 포즈 누락`);
      poses.push({ left, top, width: right - left + 1, height: bottom - top + 1 });
    }
  }
  const scale = 84 / poses[0].height;
  const normalized = [];
  for (const pose of poses) {
    const width = Math.round(pose.width * scale), height = Math.round(pose.height * scale);
    if (width > 112 || height > 108) throw new Error(`투명 대왕 포즈 ${width}x${height}: 공통 배율 확인 필요`);
    const art = await sharp(data, { raw: info }).extract(pose).resize(width, height).png().toBuffer();
    normalized.push(await canvas().composite([{ input: art, left: Math.round((128 - width) / 2), top: 112 - height }]).png().toBuffer());
  }
  const eye = { left: 40, top: 60, width: 48, height: 23 };
  const patch = await sharp(normalized[1]).extract(eye).ensureAlpha().raw().toBuffer();
  for (let y = 0; y < eye.height; y++) for (let x = 0; x < eye.width; x++) {
    const edge = Math.min(x, y, eye.width - x - 1, eye.height - y - 1);
    patch[(y * eye.width + x) * 4 + 3] *= Math.min(1, edge / 2);
  }
  const eyelid = await sharp(patch, { raw: { width: eye.width, height: eye.height, channels: 4 } }).png().toBuffer();
  const blink = await sharp(normalized[0]).composite([{ input: eyelid, left: eye.left, top: eye.top }]).ensureAlpha().raw().toBuffer();
  const closedPixels = await sharp(normalized[0]).ensureAlpha().raw().toBuffer();
  // Copy only the eye patch: compositing must not round translucent body colors.
  for (let y = eye.top; y < eye.top + eye.height; y++) {
    const start = (y * 128 + eye.left) * 4;
    blink.copy(closedPixels, start, start, start + eye.width * 4);
  }
  const closed = await sharp(closedPixels, { raw: { width: 128, height: 128, channels: 4 } }).png().toBuffer();
  const output = join(root, "assets/enemies", key);
  const review = [], measurements = [];
  for (const [sequence, indices] of Object.entries(poseMap)) {
    await mkdir(join(output, sequence), { recursive: true });
    const frames = [];
    for (const [index, poseIndex] of indices.entries()) {
      const frame = sequence === "idle" ? (index === 2 ? closed : normalized[0]) : normalized[poseIndex];
      const pixels = await sharp(frame).ensureAlpha().raw().toBuffer();
      const opacity = sequence === "hide" ? [1, 0.9, 0.75, 0.6, 0.4, 0.22][index]
        : sequence === "reveal" ? [0.3, 0.45, 0.65, 0.8, 0.95, 1][index] : 1;
      for (let p = 3; p < pixels.length; p += 4) pixels[p] = Math.round(pixels[p] * opacity);
      const packed = await sharp(pixels, { raw: { width: 128, height: 128, channels: 4 } }).png().toBuffer();
      frames.push(packed);
      await writeFile(join(output, sequence, `${key}_${sequence}_${String(index).padStart(2, "0")}.png`), packed);
      measurements.push({ sequence, index, poseIndex, sourceBounds: poses[poseIndex], scale });
    }
    const sheet = await canvas(frames.length * 128, 128).composite(frames.map((input, i) => ({ input, left: i * 128, top: 0 }))).png().toBuffer();
    await writeFile(join(output, `${key}_${sequence}.png`), sheet);
    review.push(sheet);
  }
  // Memory clues use the same new silhouette and smooth sampling as the boss.
  const hint = await sharp(normalized[0]).resize(171, 171).ensureAlpha().raw().toBuffer();
  const hints = [];
  for (const opacity of [0.7, 0.5, 0.3, 0.12]) {
    const pixels = Buffer.from(hint);
    for (let p = 3; p < pixels.length; p += 4) pixels[p] = Math.round(pixels[p] * opacity);
    hints.push(await sharp(pixels, { raw: { width: 171, height: 171, channels: 4 } }).png().toBuffer());
  }
  await canvas(768, 192).composite(hints.map((input, i) => ({ input, left: i * 192 + 10, top: 3 }))).png()
    .toFile(join(root, "assets/effects/fx_invisible_afterimage.png"));
  const metadata = { sequences: Object.fromEntries(Object.entries(poseMap).map(([name, frames]) => [name, frames.length])),
    idleEyeRegion: eye, scale, idleHeight: 84, source: "../invisible-king-storybook/key-poses.png", fullColor: true, measurements };
  const metadataPath = join(root, "assets/_source/boss-refresh/frames.json");
  const all = JSON.parse(await readFile(metadataPath, "utf8")); all[key] = metadata;
  await writeFile(metadataPath, `${JSON.stringify(all, null, 2)}\n`);
  await sharp({ create: { width: 1024, height: review.length * 144, channels: 4, background: "#d9f2eb" } })
    .composite(review.map((input, i) => ({ input, left: 0, top: i * 144 }))).png().toFile(join(root, "references/invisible_king-refined.png"));
  console.log("투명 대왕 원화 출력 완료: 33프레임·6시트·잔상 (full color / soft alpha)");
  return metadata;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await buildInvisibleKing();
