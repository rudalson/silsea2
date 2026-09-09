import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceRoot = join(root, "assets", "_source", "tsunami", "final");
const input = join(sourceRoot, "tsunami_wave_v2_generated.png");
const output = join(sourceRoot, "tsunami_wave_v2_cutout.png");

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const pixelCount = info.width * info.height;
const background = new Uint8Array(pixelCount);
const queued = new Uint8Array(pixelCount);
const queue = new Int32Array(pixelCount);
let queueStart = 0;
let queueEnd = 0;

const isNeutralBackdrop = (pixelIndex) => {
  const offset = pixelIndex * 4;
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  return Math.max(red, green, blue) <= 250
    && Math.max(red, green, blue) - Math.min(red, green, blue) <= 28;
};

const enqueue = (x, y) => {
  const pixelIndex = y * info.width + x;
  if (queued[pixelIndex] || !isNeutralBackdrop(pixelIndex)) return;
  queued[pixelIndex] = 1;
  queue[queueEnd] = pixelIndex;
  queueEnd += 1;
};

for (let x = 0; x < info.width; x += 1) {
  enqueue(x, 0);
  enqueue(x, info.height - 1);
}
for (let y = 1; y < info.height - 1; y += 1) {
  enqueue(0, y);
  enqueue(info.width - 1, y);
}

while (queueStart < queueEnd) {
  const pixelIndex = queue[queueStart];
  queueStart += 1;
  background[pixelIndex] = 1;
  const x = pixelIndex % info.width;
  const y = Math.floor(pixelIndex / info.width);
  if (x > 0) enqueue(x - 1, y);
  if (x + 1 < info.width) enqueue(x + 1, y);
  if (y > 0) enqueue(x, y - 1);
  if (y + 1 < info.height) enqueue(x, y + 1);
}

let removed = 0;
for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
  if (!background[pixelIndex]) continue;
  data.fill(0, pixelIndex * 4, pixelIndex * 4 + 4);
  removed += 1;
}

await sharp(data, { raw: info })
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 2 })
  .extend({
    top: 28,
    bottom: 28,
    left: 28,
    right: 28,
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  })
  .png({ compressionLevel: 9 })
  .toFile(output);

console.log(`tsunami wave source cutout: ${removed}/${pixelCount} background pixels removed`);
