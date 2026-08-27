import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PALETTE } from "../data/palette.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const frameSize = 128;
const frameCount = 6;
const characters = ["silsea", "potato89"];
const variants = ["base", "unicorn"];
const sourceIndices = [0, 1, 2, 4, 5, 6];

const sourceSheet = (character, variant) => {
  const sequence = character === "silsea" ? "run" : "roll";
  const variantPrefix = variant === "unicorn" ? "unicorn_" : "";
  return join(root, "assets", "characters", character, `${character}_${variantPrefix}${sequence}.png`);
};

const outputFrame = (character, variant, index) => {
  const sequence = variant === "unicorn" ? "unicorn_swim" : "swim";
  return join(root, "assets", "characters", character, sequence, `${character}_${sequence}_${String(index).padStart(2, "0")}.png`);
};

const bubbleSvg = (index) => {
  const y = 62 - index * 4;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <g fill="${PALETTE.highlight[0]}" fill-opacity="0.14" stroke="${PALETTE.collect[1]}" stroke-width="2">
      <circle cx="106" cy="${y}" r="5"/><circle cx="116" cy="${y - 16}" r="3"/>
    </g>
  </svg>`);
};

const buildFrame = async (character, variant, index) => {
  const angle = [-5, -3, 0, 3, 1, -2][index];
  const top = [5, 3, 1, 0, 2, 4][index];
  // sharp는 회전과 추출 순서를 재정렬할 수 있으므로 먼저 프레임을 버퍼로 확정한다.
  const sourceFrameBuffer = await sharp(sourceSheet(character, variant))
    .extract({ left: sourceIndices[index] * frameSize, top: 0, width: frameSize, height: frameSize })
    .png()
    .toBuffer();
  const source = await sharp(sourceFrameBuffer)
    .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(118, 118, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const output = outputFrame(character, variant, index);
  await mkdir(dirname(output), { recursive: true });
  await sharp({
    create: { width: frameSize, height: frameSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([
    { input: source, left: 4, top },
    { input: bubbleSvg(index), left: 0, top: 0 }
  ]).png({ compressionLevel: 9 }).toFile(output);
  return output;
};

const buildStrip = async (character, variant, frames) => {
  const sequence = variant === "unicorn" ? "unicorn_swim" : "swim";
  const output = join(root, "assets", "characters", character, `${character}_${sequence}.png`);
  await sharp({
    create: { width: frameSize * frameCount, height: frameSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite(frames.map((input, index) => ({ input, left: index * frameSize, top: 0 })))
    .png({ compressionLevel: 9 })
    .toFile(output);
  return output;
};

const strips = [];
for (const character of characters) {
  for (const variant of variants) {
    const frames = [];
    for (let index = 0; index < frameCount; index += 1) frames.push(await buildFrame(character, variant, index));
    strips.push(await buildStrip(character, variant, frames));
  }
}

const rowGap = 16;
await sharp({
  create: {
    width: frameSize * frameCount,
    height: frameSize * strips.length + rowGap * (strips.length - 1),
    channels: 4,
    background: { r: 238, g: 235, b: 224, alpha: 1 }
  }
}).composite(strips.map((input, index) => ({ input, left: 0, top: index * (frameSize + rowGap) })))
  .png({ compressionLevel: 9 })
  .toFile(join(root, "references", "character-swim-contact-sheet.png"));

console.log("수영 시트 생성: 실세아·감자89 기본/유니콘 6프레임 4종");
