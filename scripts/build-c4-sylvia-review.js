import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const characterRoot = join(root, "assets", "characters", "sylvia");
const outputPath = join(root, "references", "could4-sylvia-animation-overview.png");
const frameSize = 64;
const rowHeight = 82;
const columnWidth = 700;
const labelWidth = 168;
const top = 72;
const sequences = [
  ["idle", 4], ["run", 8], ["jump_up", 2], ["fall", 2], ["land", 2], ["hurt", 2],
  ["transform_unicorn", 6], ["transform_pegasus", 6], ["transform_alicorn", 8], ["fly", 6], ["wing_guard", 4],
  ["swim", 6], ["victory", 6], ["unicorn_idle", 4], ["unicorn_run", 8], ["unicorn_jump_up", 2],
  ["unicorn_fall", 2], ["unicorn_land", 2], ["unicorn_hurt", 2], ["unicorn_fly", 6],
  ["unicorn_swim", 6], ["unicorn_victory", 6]
];

const columns = [sequences.slice(0, 11), sequences.slice(11)];
const width = columnWidth * 2;
const height = top + rowHeight * 11 + 20;
const composites = [];

const escapeXml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const textSvg = (text, width, height, size = 18, color = "#42474e", weight = 600) => Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`
  + `<text x="8" y="${Math.round(height * 0.64)}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${escapeXml(text)}</text>`
  + `</svg>`
);

composites.push({ input: textSvg("C4 SYLVIA — 22 SHEETS / 100 FRAMES", width - 40, 52, 25, "#745767", 700), left: 20, top: 10 });

for (let column = 0; column < columns.length; column += 1) {
  for (let row = 0; row < columns[column].length; row += 1) {
    const [sequence, frames] = columns[column][row];
    const x = column * columnWidth + 18;
    const y = top + row * rowHeight;
    const key = `sylvia_${sequence}`;
    const strip = await sharp(join(characterRoot, `${key}.png`))
      .resize(frames * frameSize, frameSize, { kernel: sharp.kernel.nearest })
      .png()
      .toBuffer();
    composites.push({ input: textSvg(sequence, labelWidth, frameSize), left: x, top: y });
    composites.push({ input: strip, left: x + labelWidth, top: y });
  }
}

await mkdir(join(root, "references"), { recursive: true });
await sharp({
  create: { width, height, channels: 4, background: { r: 248, g: 244, b: 247, alpha: 1 } }
})
  .composite(composites)
  .png()
  .toFile(outputPath);

console.log(`실비아 애니메이션 검토 시트 생성: ${outputPath}`);
