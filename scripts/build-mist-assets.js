import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { buildStorybookStagePreview } from "./build-storybook-stage-previews.js";
import { PALETTE } from "../data/palette.js";
import { colorDistance, hexToRgb } from "./image-utils.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceRoot = join(root, "assets", "_source", "mist", "storybook");
const backgroundRoot = join(root, "assets", "backgrounds");
const effectRoot = join(root, "assets", "effects");
const referenceRoot = join(root, "references");
const WIDTH = 2048;
const HEIGHT = 720;

const palettes = Object.freeze({
  effects: [PALETTE.environmentNeutral[0], PALETTE.outline, PALETTE.environmentFar[1], ...PALETTE.highlight, PALETTE.environmentFar[0], PALETTE.collect[0], PALETTE.collect[1]]
});

const compiledPalettes = Object.fromEntries(Object.entries(palettes).map(([key, colors]) => [
  key,
  [...new Set(colors)].map((hex) => ({ hex, rgb: hexToRgb(hex) }))
]));

const nearest = (rgb, palette) => palette.reduce((best, candidate) => {
  const distance = colorDistance(rgb, candidate.rgb);
  return distance < best.distance ? { ...candidate, distance } : best;
}, { ...palette[0], distance: Infinity }).rgb;

const quantize = (data, paletteKey) => {
  const palette = compiledPalettes[paletteKey];
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 48) {
      data.fill(0, index, index + 4);
      continue;
    }
    const rgb = nearest([data[index], data[index + 1], data[index + 2]], palette);
    data[index] = rgb[0];
    data[index + 1] = rgb[1];
    data[index + 2] = rgb[2];
    data[index + 3] = 255;
  }
};

const loadTransparentSource = async (input, layer) => {
  const metadata = await sharp(input).metadata();
  if (metadata.hasAlpha) return sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  // The generated exports painted a neutral checkerboard instead of alpha.
  // Remove only neutral matte connected to the top edge, as in the rainbow
  // asset builder. Enclosed stones, flower highlights and mist stay intact.
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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
  for (let x = 0; x < info.width; x += 1) visit(x);
  while (head < tail) {
    const pixel = queue[head++];
    data.fill(0, pixel * 4, pixel * 4 + 4);
    if (pixel % info.width > 0) visit(pixel - 1);
    if (pixel % info.width < info.width - 1) visit(pixel + 1);
    if (pixel >= info.width) visit(pixel - info.width);
    if (pixel + info.width < seen.length) visit(pixel + info.width);
  }
  // These exports reserve the upper quarter/half as empty background.
  // Clear isolated tinted matte specks there before computing the tight crop.
  const emptyRows = Math.floor(info.height * (layer === "near" ? 0.5 : 0.25));
  data.fill(0, 0, emptyRows * info.width * 4);
  if (tail / seen.length < 0.3) throw new Error(`${input}: 투명 여백이 부족합니다`);
  return { data, info };
};

const buildBackgroundLayer = async (name, layer, transparent) => {
  const input = join(sourceRoot, `${name}.png`);
  const source = transparent
    ? await loadTransparentSource(input, layer)
    : await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let pipeline = sharp(source.data, { raw: source.info });
  if (transparent) {
    const top = layer === "near" ? 430 : 300;
    let firstVisibleY = source.info.height;
    for (let index = 3; index < source.data.length; index += 4) {
      if (source.data[index] >= 16) {
        firstVisibleY = Math.floor(index / 4 / source.info.width);
        break;
      }
    }
    if (firstVisibleY === source.info.height) throw new Error(`${name}: 전경이 없습니다`);
    const cropped = await pipeline.extract({ left: 0, top: firstVisibleY,
      width: source.info.width, height: source.info.height - firstVisibleY }).png().toBuffer();
    let content = await sharp(cropped)
      .resize(layer === "near" ? WIDTH / 2 : WIDTH,
        layer === "near" ? Math.round((source.info.height - firstVisibleY) * (WIDTH / 2) / source.info.width) : 420,
        { fit: "fill" })
      .png().toBuffer();
    if (layer === "near") {
      // Continue the low mist to the viewport bottom, including open pits.
      // The visible flowers keep their proportions and stay above the ground.
      const { width, height } = await sharp(content).metadata();
      const bottom = HEIGHT - top - height;
      const edge = await sharp(content).extract({ left: 0, top: height - 1, width, height: 1 })
        .raw().toBuffer();
      const softEdge = await sharp(edge, { raw: { width, height: 1, channels: 4 } })
        .resize(width, bottom).blur(40).raw().toBuffer();
      for (let y = 0; y < bottom; y += 1) {
        const blend = Math.min(1, y / 40);
        for (let x = 0; x < width * 4; x += 1) {
          const i = y * width * 4 + x;
          softEdge[i] = Math.round(edge[x] * (1 - blend) + softEdge[i] * blend);
        }
      }
      const tail = await sharp(softEdge, { raw: { width, height: bottom, channels: 4 } }).png().toBuffer();
      content = await sharp(content).extend({ bottom, background: "#00000000" })
        .composite([{ input: tail, left: 0, top: height }]).png().toBuffer();
    }
    const pieces = [{ input: content, left: 0, top }];
    if (layer === "near") {
      // Preserve round flowers rather than flattening the entire wide strip.
      pieces.push({ input: await sharp(content).flop().png().toBuffer(), left: WIDTH / 2, top });
    }
    pipeline = sharp({ create: { width: WIDTH, height: HEIGHT, channels: 4, background: "#00000000" } })
      .composite(pieces);
  }
  // Keep full color and soft alpha. Runtime mirror repetition joins each edge
  // to itself; copying opposite edge columns creates a visible vertical stripe.
  const output = join(backgroundRoot, `${name}.png`);
  await mkdir(dirname(output), { recursive: true });
  await pipeline.resize(WIDTH, HEIGHT, { fit: "fill" }).png({ compressionLevel: 9 }).toFile(output);
  return output;
};

const renderEffect = async (name, width, height, svg) => {
  const { data, info } = await sharp(Buffer.from(svg))
    .resize(width, height, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  quantize(data, "effects");
  const output = join(effectRoot, `${name}.png`);
  await mkdir(dirname(output), { recursive: true });
  await sharp(data, { raw: info }).png({ compressionLevel: 9 }).toFile(output);
  return output;
};

const mistBankSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="384" height="128" viewBox="0 0 384 128">
  <g fill="${PALETTE.highlight[0]}" stroke="${PALETTE.outline}" stroke-width="5" stroke-linejoin="round">
    <path d="M12 112C18 82 45 75 70 83C77 49 117 37 145 60C165 28 222 27 238 66C272 48 309 66 312 92C338 79 368 91 372 112Z"/>
  </g>
  <path d="M38 104C86 89 132 104 184 91C232 79 287 100 347 86" fill="none" stroke="${PALETTE.environmentSky[1]}" stroke-width="10" stroke-linecap="round"/>
</svg>`;

const mistClearSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <ellipse cx="128" cy="132" rx="102" ry="65" fill="none" stroke="${PALETTE.highlight[0]}" stroke-width="22"/>
  <ellipse cx="128" cy="132" rx="82" ry="50" fill="none" stroke="${PALETTE.collect[1]}" stroke-width="6"/>
  <path d="M42 128C62 111 77 112 94 121M162 116C181 105 202 108 218 124" fill="none" stroke="${PALETTE.environmentSky[1]}" stroke-width="8" stroke-linecap="round"/>
</svg>`;

const mistBeaconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="192" viewBox="0 0 96 192">
  <path d="M26 174L34 65H62L70 174Z" fill="${PALETTE.shadow[0]}" stroke="${PALETTE.outline}" stroke-width="6" stroke-linejoin="round"/>
  <path d="M20 174H76L82 188H14Z" fill="${PALETTE.environmentNeutral[0]}" stroke="${PALETTE.outline}" stroke-width="6" stroke-linejoin="round"/>
  <path d="M28 64H68L73 76H23Z" fill="${PALETTE.environmentNeutral[1]}" stroke="${PALETTE.outline}" stroke-width="5"/>
  <circle cx="48" cy="37" r="27" fill="${PALETTE.environmentFar[0]}" stroke="${PALETTE.collect[0]}" stroke-width="5"/>
  <path d="M49 48C31 43 34 22 49 21C63 20 67 39 53 41C43 42 42 31 49 29" fill="none" stroke="${PALETTE.outline}" stroke-width="5" stroke-linecap="round"/>
</svg>`;

const mistBreezeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="96" viewBox="0 0 192 96">
  <path d="M12 33C54 7 96 55 180 25M20 61C70 38 112 84 174 55" fill="none" stroke="${PALETTE.highlight[0]}" stroke-width="13" stroke-linecap="round"/>
  <path d="M12 33C54 7 96 55 180 25M20 61C70 38 112 84 174 55" fill="none" stroke="${PALETTE.collect[1]}" stroke-width="5" stroke-linecap="round"/>
  <path d="M70 20C83 7 94 8 101 22C88 28 78 27 70 20ZM120 63C133 50 145 52 151 66C138 72 128 70 120 63Z" fill="${PALETTE.environmentFar[1]}" stroke="${PALETTE.outline}" stroke-width="3"/>
</svg>`;

await mkdir(referenceRoot, { recursive: true });
const far = await buildBackgroundLayer("bg_mist_far", "far", false);
const mid = await buildBackgroundLayer("bg_mist_mid", "mid", true);
const near = await buildBackgroundLayer("bg_mist_near", "near", true);
const [bank, clear, beacon, breeze] = await Promise.all([
  renderEffect("fx_mist_bank", 384, 128, mistBankSvg),
  renderEffect("fx_mist_clear", 256, 256, mistClearSvg),
  renderEffect("fx_mist_beacon", 96, 192, mistBeaconSvg),
  renderEffect("fx_mist_breeze", 192, 96, mistBreezeSvg)
]);

const composite = await sharp(far).composite([{ input: mid }, { input: near }]).png().toBuffer();
await sharp(composite).resize(1024, 360).png({ compressionLevel: 9 }).toFile(join(referenceRoot, "background-mist-preview.png"));
await buildStorybookStagePreview("mist");

const effectBackground = await sharp({
  create: { width: 896, height: 256, channels: 4, background: PALETTE.environmentSky[1] }
}).png().toBuffer();
const previewAssets = await Promise.all([
  sharp(bank).resize({ width: 300, height: 100, fit: "contain" }).png().toBuffer(),
  sharp(clear).resize({ width: 170, height: 170, fit: "contain" }).png().toBuffer(),
  sharp(beacon).resize({ width: 90, height: 180, fit: "contain" }).png().toBuffer(),
  sharp(breeze).resize({ width: 220, height: 110, fit: "contain" }).png().toBuffer()
]);
await sharp(effectBackground).composite([
  { input: previewAssets[0], left: 20, top: 90 },
  { input: previewAssets[1], left: 340, top: 42 },
  { input: previewAssets[2], left: 550, top: 34 },
  { input: previewAssets[3], left: 665, top: 78 }
]).png({ compressionLevel: 9 }).toFile(join(referenceRoot, "mist-effects-preview.png"));

console.log("안개 골짜기 최종 시각 에셋 생성: 배경 3, 효과 4, 선택 카드 1, 검토 미리보기 2");
