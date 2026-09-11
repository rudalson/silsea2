import { mkdir, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const source = fileURLToPath(new URL("../assets/_source/rainbow-storybook/", import.meta.url));
const output = fileURLToPath(new URL("../assets/backgrounds/", import.meta.url));
const WIDTH = 2048;
const HEIGHT = 720;
const canvas = () => sharp({ create: { width: WIDTH, height: HEIGHT, channels: 4, background: "#00000000" } });

// Normalize complete silhouettes, retaining original color and alpha. Avoid
// the old blur/limited-palette pass that merged rainbow bands and darkened edges.
async function vegetation(name, width, height, bottom) {
  const input = `${source}${name}.png`;
  const pixels = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (name === "near-extended") {
    // The edited export painted a neutral checkerboard instead of alpha.
    // Only remove neutral matte pixels connected to the outside; saturated
    // foliage/flowers and their opaque interiors keep their original colors.
    const { data, info } = pixels;
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
    for (let x = 0; x < info.width; x++) visit(x);
    while (head < tail) {
      const p = queue[head++];
      data.fill(0, p * 4, p * 4 + 4);
      if (p % info.width > 0) visit(p - 1);
      if (p % info.width < info.width - 1) visit(p + 1);
      if (p >= info.width) visit(p - info.width);
      if (p + info.width < seen.length) visit(p + info.width);
    }
  }
  let transparent = 0;
  for (let i = 3; i < pixels.data.length; i += 4) if (pixels.data[i] === 0) transparent++;
  if (transparent / (pixels.info.width * pixels.info.height) < 0.3) throw new Error(`${name}: transparent space missing`);
  const content = await sharp(pixels.data, { raw: pixels.info }).trim({ threshold: 12 }).resize(width, height, { fit: "fill" }).png().toBuffer();
  return canvas().composite([{ input: content, left: Math.round((WIDTH - width) / 2), top: bottom - height }]).png().toBuffer();
}

async function save(buffer, name) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Runtime alternates original/mirrored tiles, joining each edge to itself.
  // Copying the opposite edge's pixels would introduce a vertical stripe.
  const path = `${output}bg_${name}.png`;
  const png = await sharp(data, { raw: info }).png({ compressionLevel: 9 }).toBuffer();
  // Swap complete files so dev-server reloads never read a partial PNG.
  await writeFile(`${path}.tmp`, png);
  await rename(`${path}.tmp`, path);
}

export async function buildRainbowAssets() {
  await mkdir(output, { recursive: true });
  const far = await sharp(`${source}far.png`).resize(WIDTH, HEIGHT).ensureAlpha().png().toBuffer();
  const pit = await sharp(`${source}pit.png`).resize(WIDTH, HEIGHT).ensureAlpha().png().toBuffer();
  const mid = await vegetation("mid", 1908, 360, 586);
  const near = await vegetation("near-extended", WIDTH, 260, HEIGHT);
  // Keep the same tree silhouettes across mood changes so scenery doesn't jump.
  for (const mood of ["normal", "pit", "boss"]) {
    await save(mood === "pit" ? pit : far, `${mood}_far`);
    await save(mid, `${mood}_mid`);
    await save(near, `${mood}_near`);
  }
  console.log("무지개 언덕 동화풍 배경 9개 생성: 일곱 색 무지개, 투명 나무, 낮은 꽃덤불");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await buildRainbowAssets();
