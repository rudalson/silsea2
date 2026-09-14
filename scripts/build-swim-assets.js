import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const frameSize = 128;
const frameCount = 6;
const characters = ["silsea", "potato89", "sylvia"];
const variants = ["base", "unicorn"];
const outputFrame = (character, variant, index) => {
  const sequence = variant === "unicorn" ? "unicorn_swim" : "swim";
  return join(root, "assets", "characters", character, sequence, `${character}_${sequence}_${String(index).padStart(2, "0")}.png`);
};

const buildFrame = async (character, variant, index) => {
  // Every character has authored paddling poses at its normal drawing scale.
  const input = outputFrame(character, "base", index);
  if (variant === "base") return input;
  const frame = await sharp(join(root, "assets", "characters", character, `${character}_unicorn_swim.png`))
    .extract({ left: index * frameSize, top: 0, width: frameSize, height: frameSize }).png().toBuffer();
  const output = outputFrame(character, variant, index);
  await mkdir(dirname(output), { recursive: true });
  await sharp(frame).png().toFile(output);
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

console.log("수영 시트 생성: 실세아·감자89·실비아 기본/유니콘 6프레임 6종");
