import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceRoot = join(root, "assets", "_source", "submerged", "storybook");
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
    const emptyRows = Math.floor(info.height * (layer === "mid" ? 0.38 : 0.55));
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

// The generated sea surface sits around source row 286. Align it with the
// gameplay surface at y=320 without tinting or quantizing the illustration.
export async function buildSubmergedBackgroundLayer(name, layer) {
  const path = join(sourceRoot, name + ".png");
  const canvas = () => sharp({ create: { width: WIDTH, height: HEIGHT, channels: 4, background: "#00000000" } });
  let pipeline;
  if (layer === "far") {
    const { width, height } = await sharp(path).metadata();
    const surface = Math.round(height * 286 / 743);
    const sky = await sharp(path).extract({ left: 0, top: 0, width, height: surface })
      .resize(WIDTH, 320, { fit: "fill" }).png().toBuffer();
    const water = await sharp(path).extract({ left: 0, top: surface, width, height: height - surface })
      .resize(WIDTH, HEIGHT - 320, { fit: "fill" }).png().toBuffer();
    pipeline = canvas().composite([{ input: sky, left: 0, top: 0 }, { input: water, left: 0, top: 320 }]);
  } else {
    const cutout = await loadCutout(path, layer);
    const metadata = await sharp(cutout).metadata();
    const width = layer === "mid" ? WIDTH / 2 : WIDTH;
    const height = layer === "mid" ? Math.round(metadata.height * width / metadata.width) : 160;
    const bottom = layer === "mid" ? 610 : HEIGHT;
    const content = await sharp(cutout).resize(width, height, { fit: "fill" }).png().toBuffer();
    const pieces = [{ input: content, left: 0, top: bottom - height }];
    if (layer === "mid") {
      // Modest cottages and open gaps reveal the far underwater scenery.
      pieces.push({ input: await sharp(content).flop().png().toBuffer(), left: width, top: bottom - height });
    }
    pipeline = canvas().composite(pieces);
  }
  // Runtime repeats mirrored tiles, joining each edge to itself.
  const output = join(outputRoot, name + ".png");
  await mkdir(outputRoot, { recursive: true });
  await writeFile(output + ".tmp", await pipeline.png({ compressionLevel: 9 }).toBuffer());
  await rename(output + ".tmp", output);
  return output;
}
