import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceDir = join(root, "assets/_source/boss-refresh");
const outputDir = join(root, "assets/enemies/hula_king");
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const frameSize = 128;
const eye = { left: 32, top: 56, width: 54, height: 28 };
const regions = {
  idle: { left: 10, top: 110, width: 373, height: 351 },
  spin: { left: 381, top: 103, width: 407, height: 356 },
  warning: { left: 792, top: 98, width: 409, height: 368 },
  vulnerable: { left: 36, top: 525, width: 364, height: 324 },
  hurt: { left: 442, top: 501, width: 366, height: 340 },
  defeated: { left: 885, top: 532, width: 373, height: 316 }
};
const sequences = {
  idle: ["idle", "idle", "blink", "idle"],
  spin: Array(8).fill("spin"),
  warning: Array(4).fill("warning"),
  throw: ["warning", "warning", "throw", "throw", "throw", "idle"],
  vulnerable: Array(4).fill("vulnerable"),
  hurt: Array(3).fill("hurt"),
  defeated: ["hurt", "vulnerable", ...Array(6).fill("defeated")]
};

const newCanvas = () => sharp({ create: { width: frameSize, height: frameSize, channels: 4, background: transparent } });
const toKey = (red, green, blue) => `${red},${green},${blue}`;

export async function buildHulaStorybook() {
  const source = join(sourceDir, "hula_king_storybook_poses.png");
  const poseBuffers = {};
  for (const [name, region] of Object.entries(regions)) {
    const crop = await sharp(source).extract(region).png().toBuffer();
    poseBuffers[name] = await sharp(crop).trim({ threshold: 16 }).png().toBuffer();
  }
  poseBuffers.throw = await sharp(join(sourceDir, "hula_king_storybook_throw.png"))
    .trim({ threshold: 16 }).png().toBuffer();

  // One shared color table preserves the painted tones across every state.
  const indexed = await sharp(source).png({ palette: true, colours: 128, dither: 0 }).toBuffer();
  const paletteData = await sharp(indexed).ensureAlpha().raw().toBuffer();
  const paletteMap = new Map();
  for (let offset = 0; offset < paletteData.length; offset += 4) {
    if (paletteData[offset + 3] < 128) continue;
    const color = [paletteData[offset], paletteData[offset + 1], paletteData[offset + 2]];
    paletteMap.set(toKey(...color), color);
  }
  const palette = [...paletteMap.values()];
  const cache = new Map();
  const quantize = async (buffer) => {
    const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let offset = 0; offset < data.length; offset += 4) {
      if (data[offset + 3] < 16) {
        data[offset + 3] = 0;
        continue;
      }
      const key = toKey(data[offset], data[offset + 1], data[offset + 2]);
      if (!cache.has(key)) {
        let closest = palette[0];
        let distance = Infinity;
        for (const color of palette) {
          const next = (data[offset] - color[0]) ** 2 + (data[offset + 1] - color[1]) ** 2
            + (data[offset + 2] - color[2]) ** 2;
          if (next < distance) { closest = color; distance = next; }
        }
        cache.set(key, closest);
      }
      const color = cache.get(key);
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
    }
    return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  };

  const render = async (name, index = 0, count = 1) => {
    const metadata = await sharp(poseBuffers[name]).metadata();
    const height = Math.min(85, Math.max(82, 84 + Math.round(Math.sin(index / count * Math.PI * 2))));
    const scale = Math.min(height / metadata.height, 116 / metadata.width);
    const width = Math.round(metadata.width * scale);
    const drawHeight = Math.round(metadata.height * scale);
    const image = await sharp(poseBuffers[name]).resize(width, drawHeight, { kernel: sharp.kernel.lanczos3 }).png().toBuffer();
    const x = Math.round((frameSize - width) / 2 + (name === "spin" ? Math.sin(index / count * Math.PI * 2) : 0));
    return quantize(await newCanvas().composite([{ input: image, left: x, top: 112 - drawHeight }]).png().toBuffer());
  };

  const idle = await render("idle");
  const spin = await render("spin");
  const [idleRaw, spinRaw] = await Promise.all([
    sharp(idle).ensureAlpha().raw().toBuffer(),
    sharp(spin).ensureAlpha().raw().toBuffer()
  ]);
  const blinkRaw = Buffer.from(idleRaw);
  for (let y = eye.top; y < eye.top + eye.height; y += 1) {
    for (let x = eye.left; x < eye.left + eye.width; x += 1) {
      const offset = (y * frameSize + x) * 4;
      spinRaw.copy(blinkRaw, offset, offset, offset + 4);
    }
  }
  const blink = await sharp(blinkRaw, { raw: { width: frameSize, height: frameSize, channels: 4 } }).png().toBuffer();
  const counts = {};
  const measurements = [];
  const strips = [];
  for (const [sequence, roles] of Object.entries(sequences)) {
    const frames = [];
    counts[sequence] = roles.length;
    await mkdir(join(outputDir, sequence), { recursive: true });
    for (let index = 0; index < roles.length; index += 1) {
      const role = roles[index];
      const frame = sequence === "idle"
        ? (role === "blink" ? blink : idle)
        : await render(role, index, roles.length);
      frames.push(frame);
      await writeFile(join(outputDir, sequence, `hula_king_${sequence}_${String(index).padStart(2, "0")}.png`), frame);
      measurements.push({ sequence, index, sourcePose: role, sourceBounds: regions[role] ?? null });
    }
    const strip = await sharp({ create: { width: frameSize * frames.length, height: frameSize, channels: 4, background: transparent } })
      .composite(frames.map((input, index) => ({ input, left: frameSize * index, top: 0 })))
      .png().toBuffer();
    const stripPath = join(outputDir, `hula_king_${sequence}.png`);
    await writeFile(stripPath, strip);
    strips.push(stripPath);
  }

  const preview = await sharp({ create: { width: 1024, height: strips.length * 144, channels: 4, background: "#f8f0e6" } })
    .composite(strips.map((input, index) => ({ input, left: 0, top: index * 144 })))
    .png().toBuffer();
  await writeFile(join(root, "references/hula_king-refined.png"), preview);

  const framesPath = join(sourceDir, "frames.json");
  const palettePath = join(sourceDir, "palette.json");
  const frameMetadata = JSON.parse(await readFile(framesPath, "utf8"));
  const paletteMetadata = JSON.parse(await readFile(palettePath, "utf8"));
  frameMetadata.hula_king = { sequences: counts, idleEyeRegion: eye, idleHeight: 84, measurements };
  paletteMetadata.hula_king = palette;
  await writeFile(framesPath, `${JSON.stringify(frameMetadata, null, 2)}\n`);
  await writeFile(palettePath, `${JSON.stringify(paletteMetadata, null, 2)}\n`);
  console.log("hula_king: 37 painted storybook frames");
  return { metadata: frameMetadata.hula_king, palette };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await buildHulaStorybook();
}
