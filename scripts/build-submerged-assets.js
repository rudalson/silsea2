import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { buildSubmergedBackgroundLayer } from "./build-submerged-backgrounds.js";
import { buildStorybookStagePreview } from "./build-storybook-stage-previews.js";
import { PALETTE } from "../data/palette.js";
import { colorDistance, hexToRgb } from "./image-utils.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const backgroundRoot = join(root, "assets", "backgrounds");
const effectRoot = join(root, "assets", "effects");
const referenceRoot = join(root, "references");

const palettes = Object.freeze({
  effects: [PALETTE.collect[1], PALETTE.bgFar[1], PALETTE.environmentNight[2], PALETTE.highlight[0], PALETTE.highlight[1], PALETTE.outline]
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

const buildSpriteSheet = async ({ name, frameWidth, frameHeight, frames, svg }) => {
  const buffers = await Promise.all(Array.from({ length: frames }, (_, frame) => (
    sharp(Buffer.from(svg(frame))).png().toBuffer()
  )));
  const output = join(effectRoot, `${name}.png`);
  await mkdir(dirname(output), { recursive: true });
  const { data, info } = await sharp({
    create: {
      width: frameWidth * frames,
      height: frameHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  }).composite(buffers.map((input, index) => ({ input, left: index * frameWidth, top: 0 })))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  quantize(data, "effects");
  await sharp(data, { raw: info }).png({ compressionLevel: 9 }).toFile(output);
  return output;
};

const surfaceSvg = (frame) => {
  const shift = frame * 18;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="384" height="64" viewBox="0 0 384 64">
    <path d="M-40 ${24 + frame % 2 * 2} C8 3 54 45 104 24 S200 4 248 24 S344 44 424 20" fill="none" stroke="${PALETTE.highlight[0]}" stroke-width="8" stroke-linecap="round"/>
    <path d="M${-70 + shift} 40 C-18 24 24 52 76 38 S170 22 222 39 S316 52 454 34" fill="none" stroke="${PALETTE.collect[1]}" stroke-width="7" stroke-linecap="round"/>
    <path d="M${-130 + shift} 53 C-82 42 -38 61 10 50 S104 40 154 51 S250 62 324 48" fill="none" stroke="${PALETTE.bgFar[1]}" stroke-width="5" stroke-linecap="round" opacity="0.92"/>
  </svg>`;
};

const causticsSvg = (frame) => {
  const phase = frame * 13;
  const paths = Array.from({ length: 5 }, (_, index) => {
    const x = 18 + index * 50 + ((phase + index * 7) % 22);
    const y = 18 + (index % 2) * 38;
    return `<path d="M${x - 28} ${y + 22} Q${x} ${y - 12} ${x + 28} ${y + 22} Q${x} ${y + 8} ${x - 28} ${y + 22}Z"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="128" viewBox="0 0 256 128">
    <g fill="none" stroke="${PALETTE.highlight[0]}" stroke-width="5" stroke-linecap="round" opacity="0.78">${paths}</g>
  </svg>`;
};

const bubbleSvg = (frame) => {
  const rise = frame * 6;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <g fill="${PALETTE.highlight[0]}" fill-opacity="0.16" stroke="${PALETTE.highlight[0]}" stroke-width="3">
      <circle cx="22" cy="${52 - rise}" r="8"/><circle cx="43" cy="${40 - rise * 0.7}" r="5"/><circle cx="31" cy="${20 - rise * 0.4}" r="3"/>
    </g>
  </svg>`;
};

await Promise.all([
  mkdir(backgroundRoot, { recursive: true }),
  mkdir(effectRoot, { recursive: true }),
  mkdir(referenceRoot, { recursive: true })
]);

const far = await buildSubmergedBackgroundLayer("bg_submerged_far", "far");
const mid = await buildSubmergedBackgroundLayer("bg_submerged_mid", "mid");
const near = await buildSubmergedBackgroundLayer("bg_submerged_near", "near");
const [surface, caustics, bubble] = await Promise.all([
  buildSpriteSheet({ name: "fx_water_surface", frameWidth: 384, frameHeight: 64, frames: 4, svg: surfaceSvg }),
  buildSpriteSheet({ name: "fx_water_caustics", frameWidth: 256, frameHeight: 128, frames: 4, svg: causticsSvg }),
  buildSpriteSheet({ name: "fx_bubble", frameWidth: 64, frameHeight: 64, frames: 6, svg: bubbleSvg })
]);

const composite = await sharp(far).composite([{ input: mid }, { input: near }]).png().toBuffer();
await sharp(composite).resize(1024, 360).png({ compressionLevel: 9 }).toFile(join(referenceRoot, "background-submerged-preview.png"));
await buildStorybookStagePreview("submerged");

const effectPreview = await sharp({
  create: { width: 1024, height: 384, channels: 4, background: PALETTE.bgFar[1] }
}).png().toBuffer();
const previewFrames = await Promise.all([
  sharp(surface).extract({ left: 0, top: 0, width: 384, height: 64 }).png().toBuffer(),
  sharp(caustics).extract({ left: 0, top: 0, width: 256, height: 128 }).resize(384, 192).png().toBuffer(),
  sharp(bubble).extract({ left: 0, top: 0, width: 64, height: 64 }).resize(192, 192).png().toBuffer()
]);
await sharp(effectPreview).composite([
  { input: previewFrames[0], left: 48, top: 56 },
  { input: previewFrames[1], left: 72, top: 152 },
  { input: previewFrames[2], left: 688, top: 104 }
]).png({ compressionLevel: 9 }).toFile(join(referenceRoot, "submerged-effects-preview.png"));

console.log("물에 잠긴 마을 최종 시각 에셋 생성: 배경 3, 수면 4프레임, 빛결 4프레임, 기포 6프레임, 선택 카드 1, 검토 미리보기 2");
