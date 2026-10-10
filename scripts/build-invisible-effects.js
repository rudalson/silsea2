import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets/_source/invisible-king-effects");
const output = join(root, "assets/effects");
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const canvas = (width, height) => sharp({ create: { width, height, channels: 4, background: transparent } });

async function fade(input, opacity) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) data[i] = Math.round(data[i] * opacity);
  return sharp(data, { raw: info }).png().toBuffer();
}

async function frame(input, width, height, scale, opacity, dy = 0) {
  const art = await sharp(input).resize(Math.round((width - 20) * scale), Math.round((height - 20) * scale), { fit: "inside" }).png().toBuffer();
  const info = await sharp(art).metadata();
  return canvas(width, height).composite([{ input: await fade(art, opacity),
    left: Math.round((width - info.width) / 2), top: Math.round((height - info.height) / 2) + dy }]).png().toBuffer();
}

export async function buildInvisibleEffects() {
  await mkdir(output, { recursive: true });
  const reveal = await sharp(join(source, "reveal.png")).trim().png().toBuffer();
  const miss = await sharp(join(source, "miss.png")).trim().png().toBuffer();
  const impact = await sharp(join(source, "crown-impact.png")).trim().png().toBuffer();
  const sheets = [];
  // A gentle breathing loop; growth and upward drift replace rigid light rays.
  for (const [key, art, width, height, scales, opacities] of [
    ["fx_invisible_reveal", reveal, 192, 256, [.94, .97, 1, 1, .97, .94], [.42, .5, .58, .62, .55, .46]],
    ["fx_invisible_miss", miss, 256, 192, [.52, .64, .76, .86, .95, 1], [.35, .45, .55, .65, .78, .9]]
  ]) {
    const frames = [];
    for (let i = 0; i < scales.length; i++) frames.push(await frame(art, width, height, scales[i], opacities[i], key.endsWith("reveal") ? [2, 1, 0, -2, -1, 1][i] : 0));
    const sheet = await canvas(width * frames.length, height).composite(frames.map((input, i) => ({ input, left: i * width, top: 0 }))).png().toBuffer();
    await writeFile(join(output, `${key}.png`), sheet);
    sheets.push(sheet);
  }
  const crown = await frame(impact, 160, 112, 1, .92);
  await writeFile(join(output, "fx_invisible_crown_impact.png"), crown);
  // The location clue reuses the apparition's painted ground mist, with no ring.
  const info = await sharp(reveal).metadata();
  const cropped = await sharp(reveal).extract({ left: 0, top: Math.round(info.height * .76), width: info.width, height: info.height - Math.round(info.height * .76) }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Feather the crop boundary so the clue never reads as a rectangular patch.
  for (let y = 0; y < cropped.info.height; y++) for (let x = 0; x < cropped.info.width; x++) {
    const i = (y * cropped.info.width + x) * 4 + 3;
    cropped.data[i] = Math.round(cropped.data[i] * Math.min(1, y / (cropped.info.height * .3)));
  }
  const lowMist = await sharp(cropped.data, { raw: cropped.info }).png().toBuffer();
  const marker = await frame(lowMist, 160, 56, 1, .7);
  await writeFile(join(output, "fx_invisible_anchor.png"), marker);
  await canvas(1536, 480).flatten({ background: "#d9f2eb" }).composite([
    { input: sheets[0], left: 0, top: 0 }, { input: sheets[1], left: 0, top: 272 },
    { input: crown, left: 1200, top: 0 }, { input: marker, left: 1200, top: 144 }
  ]).png().toFile(join(root, "references/invisible-king-effects.png"));
  console.log("투명 대왕 원화풍 효과: 등장 6·공격 6프레임·왕관·위치 안개 출력 완료");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await buildInvisibleEffects();
