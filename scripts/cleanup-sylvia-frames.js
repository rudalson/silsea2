import { copyFile, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const characterDirectory = join(root, "assets", "characters", "sylvia");
const ALPHA_THRESHOLD = 16;
const MIN_COMPONENT_PIXELS = 6;

const cleanFrame = async (path) => {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixelCount = info.width * info.height;
  const visited = new Uint8Array(pixelCount);
  const stack = new Int32Array(pixelCount);
  let removed = 0;

  for (let start = 0; start < pixelCount; start += 1) {
    if (visited[start] || data[start * 4 + 3] <= ALPHA_THRESHOLD) continue;
    let stackSize = 0;
    stack[stackSize++] = start;
    visited[start] = 1;
    const component = [];

    while (stackSize > 0) {
      const pixel = stack[--stackSize];
      component.push(pixel);
      const x = pixel % info.width;
      const y = Math.floor(pixel / info.width);
      const neighbors = [];
      if (x > 0) neighbors.push(pixel - 1);
      if (x + 1 < info.width) neighbors.push(pixel + 1);
      if (y > 0) neighbors.push(pixel - info.width);
      if (y + 1 < info.height) neighbors.push(pixel + info.width);
      for (const neighbor of neighbors) {
        if (visited[neighbor] || data[neighbor * 4 + 3] <= ALPHA_THRESHOLD) continue;
        visited[neighbor] = 1;
        stack[stackSize++] = neighbor;
      }
    }

    if (component.length >= MIN_COMPONENT_PIXELS) continue;
    for (const pixel of component) {
      data[pixel * 4] = 0;
      data[pixel * 4 + 1] = 0;
      data[pixel * 4 + 2] = 0;
      data[pixel * 4 + 3] = 0;
      removed += 1;
    }
  }

  const temporaryPath = `${path}.clean.png`;
  await sharp(data, { raw: info }).png({ compressionLevel: 9 }).toFile(temporaryPath);
  await copyFile(temporaryPath, path);
  await unlink(temporaryPath);
  return removed;
};

let frames = 0;
let pixels = 0;
for (const directory of await readdir(characterDirectory, { withFileTypes: true })) {
  if (!directory.isDirectory()) continue;
  const sequenceDirectory = join(characterDirectory, directory.name);
  for (const filename of await readdir(sequenceDirectory)) {
    if (!filename.endsWith(".png") || filename.endsWith(".clean.png")) continue;
    pixels += await cleanFrame(join(sequenceDirectory, filename));
    frames += 1;
  }
}

console.log(`실비아 프레임 정리: ${frames}개 · 고립 픽셀 ${pixels}개 제거`);
