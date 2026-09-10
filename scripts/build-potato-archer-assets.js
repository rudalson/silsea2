import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceDirectory = join(root, "assets", "_source", "potato-archer-storybook");
const outputDirectory = join(root, "assets", "enemies", "potato_archer");
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const poses = {
  idle: [[1, 1], [1, 0.98]],
  aim: [[0.98, 0.99], [0.99, 1], [1, 1]],
  shoot: [[0.98, 1], [1, 0.98], [1, 1]],
  defeated: [[1, 1], [1, 0.97], [0.97, 0.93], [0.94, 0.9]]
};

// Some generated pose sources contain an opaque transparency preview. Remove
// neutral connected regions dominated by mid-gray checks, including the gaps
// inside the bow. White eye highlights are separate, predominantly white regions.
function removePreviewBackground(data, width, height) {
  if (data.some((value, index) => index % 4 === 3 && value < 16)) return;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const neutral = (pixel) => {
    const offset = pixel * 4;
    const minimum = Math.min(data[offset], data[offset + 1], data[offset + 2]);
    const maximum = Math.max(data[offset], data[offset + 1], data[offset + 2]);
    return minimum >= 65 && maximum - minimum <= 24;
  };
  for (let pixel = 0; pixel < visited.length; pixel += 1) {
    if (visited[pixel] || !neutral(pixel)) continue;
    let head = 0;
    let tail = 1;
    let gray = 0;
    queue[0] = pixel;
    visited[pixel] = 1;
    while (head < tail) {
      const current = queue[head++];
      if (data[current * 4] < 220) gray += 1;
      const x = current % width;
      const y = Math.floor(current / width);
      const neighbors = [x > 0 ? current - 1 : -1, x + 1 < width ? current + 1 : -1,
        y > 0 ? current - width : -1, y + 1 < height ? current + width : -1];
      for (const next of neighbors) {
        if (next < 0 || visited[next] || !neutral(next)) continue;
        visited[next] = 1;
        queue[tail++] = next;
      }
    }
    if (tail < 80 || gray / tail < 0.35) continue;
    for (let index = 0; index < tail; index += 1) data.fill(0, queue[index] * 4, queue[index] * 4 + 4);
  }
}

async function readPose(pose) {
  const { data, info } = await sharp(join(sourceDirectory, `${pose}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  removePreviewBackground(data, info.width, info.height);
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;
  for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
    if (data[pixel * 4 + 3] < 16) continue;
    left = Math.min(left, pixel % info.width);
    right = Math.max(right, pixel % info.width);
    top = Math.min(top, Math.floor(pixel / info.width));
    bottom = Math.max(bottom, Math.floor(pixel / info.width));
  }
  if (right < left || left < 4 || top < 4 || right >= info.width - 4 || bottom >= info.height - 4) {
    throw new Error(`${pose}: source silhouette is missing or touches the canvas edge`);
  }
  // Crop only after finding the entire silhouette; never crop a pose out of a
  // fixed atlas rectangle (the old shoot rectangle cut through the potato).
  const width = right - left + 1;
  const height = bottom - top + 1;
  const buffer = await sharp(data, { raw: info }).extract({ left, top, width, height }).png().toBuffer();
  return { buffer, width, height };
}

export async function buildPotatoArcherAssets() {
  const sheets = {};
  const preview = [];
  for (const [pose, variants] of Object.entries(poses)) {
    const source = await readPose(pose);
    const scale = Math.min(110 / source.width, (pose === "defeated" ? 88 : 94) / source.height);
    const directory = join(outputDirectory, pose);
    await mkdir(directory, { recursive: true });
    const frames = [];
    for (const [index, [scaleX, scaleY]] of variants.entries()) {
      const width = Math.round(source.width * scale * scaleX);
      const height = Math.round(source.height * scale * scaleY);
      const subject = await sharp(source.buffer).resize(width, height, { fit: "fill" }).png().toBuffer();
      const frame = await sharp({ create: { width: 128, height: 128, channels: 4, background: transparent } })
        .composite([{ input: subject, left: Math.floor((128 - width) / 2), top: 112 - height }]).png().toBuffer();
      await sharp(frame).toFile(join(directory, `potato_archer_${pose}_${String(index).padStart(2, "0")}.png`));
      frames.push({ input: frame, left: index * 128, top: 0 });
    }
    const sheet = join(outputDirectory, `potato_archer_${pose}.png`);
    await sharp({ create: { width: variants.length * 128, height: 128, channels: 4, background: transparent } })
      .composite(frames).png().toFile(sheet);
    sheets[pose] = sheet;
    preview.push({ input: sheet, left: 16, top: 16 + preview.length * 144 });
  }
  await mkdir(join(root, "references"), { recursive: true });
  await sharp({ create: { width: 544, height: 592, channels: 4, background: "#b4a6f3" } })
    .composite(preview).png().toFile(join(root, "references", "potato-archer-storybook-preview.png"));
  return sheets;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildPotatoArcherAssets();
  console.log("감자 궁수 생성: 독립 원본 4종 → 투명 프레임 12개, 시트 4개");
}
