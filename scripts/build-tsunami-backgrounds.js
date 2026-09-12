import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceRoot = join(root, "assets", "_source", "tsunami", "storybook");
const outputRoot = join(root, "assets", "backgrounds");
const WIDTH = 2048;
const HEIGHT = 720;

// Preserve illustration colors. Only remove the neutral exterior matte from
// these generated RGB exports; cream walls and enclosed stones remain opaque.
async function loadCutout(path, layer) {
  const metadata = await sharp(path).metadata();
  const pixels = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = pixels;
  if (!metadata.hasAlpha) {
    const seen = new Uint8Array(info.width * info.height);
    const queue = new Int32Array(seen.length);
    let head = 0;
    let tail = 0;
    const visit = (pixel) => {
      if (seen[pixel]) return;
      seen[pixel] = 1;
      const i = pixel * 4;
      if (Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]) > 24) return;
      queue[tail++] = pixel;
    };
    for (let x = 0; x < info.width; x += 1) {
      visit(x);
      visit((info.height - 1) * info.width + x);
    }
    for (let y = 0; y < info.height; y += 1) {
      visit(y * info.width);
      visit(y * info.width + info.width - 1);
    }
    while (head < tail) {
      const pixel = queue[head++];
      data.fill(0, pixel * 4, pixel * 4 + 4);
      if (pixel % info.width > 0) visit(pixel - 1);
      if (pixel % info.width < info.width - 1) visit(pixel + 1);
      if (pixel >= info.width) visit(pixel - info.width);
      if (pixel + info.width < seen.length) visit(pixel + info.width);
    }
    if (tail / seen.length < 0.3) throw new Error(path + ": transparent exterior missing");
    // Known empty parts of the RGB source contain occasional tinted matte specks.
    const emptyRows = Math.floor(info.height * (layer === "mid" ? 0.25 : 0.48));
    data.fill(0, 0, emptyRows * info.width * 4);
  }
  let top = info.height;
  let bottom = -1;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 16) continue;
    const y = Math.floor(i / 4 / info.width);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  if (bottom < top) throw new Error(path + ": empty scenery");
  return sharp(data, { raw: info })
    .extract({ left: 0, top, width: info.width, height: bottom - top + 1 }).png().toBuffer();
}

export async function buildTsunamiBackgroundLayer(name, layer) {
  const path = join(sourceRoot, name + ".png");
  let pipeline;
  if (layer === "far") {
    pipeline = sharp(path).resize(WIDTH, HEIGHT, { fit: "fill" }).ensureAlpha();
  } else {
    const cutout = await loadCutout(path, layer);
    const metadata = await sharp(cutout).metadata();
    const width = layer === "mid" ? WIDTH : WIDTH / 2;
    const height = layer === "mid" ? Math.round(metadata.height * width / metadata.width) : 160;
    const bottom = layer === "mid" ? 602 : 610;
    const content = await sharp(cutout).resize(width, height, { fit: "fill" }).png().toBuffer();
    const pieces = [{ input: content, left: 0, top: bottom - height }];
    if (layer === "near") {
      // Small round flowers stay visible above the stage's continuous ground.
      pieces.push({ input: await sharp(content).flop().png().toBuffer(), left: width, top: bottom - height });
    }
    pipeline = sharp({ create: { width: WIDTH, height: HEIGHT, channels: 4, background: "#00000000" } })
      .composite(pieces);
  }
  // Runtime uses original/mirrored repeats. Opposite-edge copying adds stripes.
  const output = join(outputRoot, name + ".png");
  await mkdir(outputRoot, { recursive: true });
  await writeFile(output + ".tmp", await pipeline.png({ compressionLevel: 9 }).toBuffer());
  await rename(output + ".tmp", output);
  return output;
}
