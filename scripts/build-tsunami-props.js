import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets/_source/tsunami/painted-props");
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const canvas = (width, height) => sharp({ create: { width, height, channels: 4, background: transparent } });

async function paintedProp(sourceName, directory, key, width, height, fill = false) {
  const art = await sharp(join(source, sourceName)).trim().resize(width - 16, height - 16, { fit: fill ? "fill" : "inside" }).png().toBuffer();
  const info = await sharp(art).metadata();
  const output = join(root, "assets", directory, `${key}.png`);
  await mkdir(dirname(output), { recursive: true });
  // Keep generated colors and alpha; no palette reduction or white-pixel removal.
  await canvas(width, height).composite([{ input: art, left: Math.round((width - info.width) / 2), top: height - info.height - 8 }])
    .png({ compressionLevel: 9 }).toFile(output);
  return output;
}

export async function buildTsunamiSign() {
  return paintedProp("decor_sign.png", "decorations", "decor_sign", 160, 192);
}

export async function buildTsunamiProps() {
  const houseOpen = await paintedProp("shelter_house_open.png", "environment", "shelter_house_open", 448, 336);
  const houseWeathered = await paintedProp("shelter_house_weathered.png", "environment", "shelter_house_weathered", 448, 336);
  const shelterHill = await paintedProp("shelter_hill.png", "environment", "shelter_hill", 512, 256, true);
  const warning = await paintedProp("tsunami_warning.png", "effects", "fx_tsunami_warning", 128, 128);
  const sign = await buildTsunamiSign();
  const waveArt = await sharp(join(source, "tsunami_wave.png")).trim().png().toBuffer();
  const motion = [
    [346, 470, 19, 30], [352, 476, 16, 25], [358, 484, 13, 18], [362, 488, 11, 15],
    [358, 484, 13, 18], [352, 476, 16, 25], [348, 472, 18, 29], [344, 468, 20, 32]
  ];
  const frames = [];
  for (const [width, height, left, top] of motion) {
    const input = await sharp(waveArt).resize(width, height, { fit: "fill" }).png().toBuffer();
    frames.push(await canvas(384, 512).composite([{ input, left, top }]).png().toBuffer());
  }
  const wave = join(root, "assets/effects/fx_tsunami_wave.png");
  await canvas(384 * 8, 512).composite(frames.map((input, i) => ({ input, left: i * 384, top: 0 })))
    .png({ compressionLevel: 9 }).toFile(wave);
  const previews = await Promise.all([
    sharp(houseOpen).resize(320, 240).png().toBuffer(), sharp(houseWeathered).resize(320, 240).png().toBuffer(),
    sharp(shelterHill).resize(490, 245).png().toBuffer(), sharp(frames[3]).resize(250, 334).png().toBuffer(),
    sharp(warning).resize(112, 112).png().toBuffer(), sharp(sign).resize(128, 154).png().toBuffer()
  ]);
  await sharp({ create: { width: 1200, height: 550, channels: 4, background: "#d9f2eb" } }).composite([
    { input: previews[0], left: 20, top: 20 }, { input: previews[1], left: 360, top: 20 },
    { input: previews[2], left: 70, top: 280 }, { input: previews[3], left: 720, top: 90 },
    { input: previews[4], left: 1040, top: 30 }, { input: previews[5], left: 1032, top: 210 }
  ]).png().toFile(join(root, "references/tsunami-effects-preview.png"));
  console.log("쓰나미 마을 원화 소품: 언덕·집 2종·파도 8프레임·경고·방향 표지 (full color / soft alpha)");
  return { houseOpen, houseWeathered, shelterHill, wave, warning, sign };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await buildTsunamiProps();
