import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const frameSize = 128;

const sequenceSpecs = [
  ["silsea", "run", 8],
  ["potato89", "roll", 8],
  ["silsea", "idle", 4],
  ["potato89", "idle", 4],
  ["silsea", "jump_up", 2],
  ["silsea", "fall", 2],
  ["potato89", "jump_up", 2],
  ["potato89", "fall", 2],
  ["silsea", "land", 2],
  ["silsea", "hurt", 2],
  ["potato89", "land", 2],
  ["potato89", "hurt", 2]
];

const sequencePath = (character, sequence) =>
  join(root, "assets", "characters", character, `${character}_${sequence}.png`);

const buildStrip = async (character, sequence, frameCount) => {
  const directory = join(root, "assets", "characters", character, sequence);
  const prefix = `${character}_${sequence}_`;
  const output = sequencePath(character, sequence);
  const composites = Array.from({ length: frameCount }, (_, index) => ({
    input: join(directory, `${prefix}${String(index).padStart(2, "0")}.png`),
    left: index * frameSize,
    top: 0
  }));
  await sharp({
    create: {
      width: frameSize * frameCount,
      height: frameSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  }).composite(composites).png().toFile(output);
  return output;
};

for (const spec of sequenceSpecs) await buildStrip(...spec);

await sharp({
  create: {
    width: frameSize * 8,
    height: frameSize * 2 + 16,
    channels: 4,
    background: { r: 238, g: 235, b: 224, alpha: 1 }
  }
}).composite([
  { input: sequencePath("silsea", "run"), left: 0, top: 0 },
  { input: sequencePath("potato89", "roll"), left: 0, top: frameSize + 16 }
]).png().toFile(join(root, "references", "character-run-roll-contact-sheet.png"));

const rowGap = 16;
await sharp({
  create: {
    width: frameSize * 4,
    height: frameSize * 4 + rowGap * 3,
    channels: 4,
    background: { r: 238, g: 235, b: 224, alpha: 1 }
  }
}).composite([
  { input: sequencePath("silsea", "idle"), left: 0, top: 0 },
  { input: sequencePath("potato89", "idle"), left: 0, top: frameSize + rowGap },
  { input: sequencePath("silsea", "jump_up"), left: 0, top: (frameSize + rowGap) * 2 },
  { input: sequencePath("silsea", "fall"), left: frameSize * 2, top: (frameSize + rowGap) * 2 },
  { input: sequencePath("potato89", "jump_up"), left: 0, top: (frameSize + rowGap) * 3 },
  { input: sequencePath("potato89", "fall"), left: frameSize * 2, top: (frameSize + rowGap) * 3 }
]).png().toFile(join(root, "references", "character-idle-jump-fall-contact-sheet.png"));

await sharp({
  create: {
    width: frameSize * 4,
    height: frameSize * 2 + rowGap,
    channels: 4,
    background: { r: 238, g: 235, b: 224, alpha: 1 }
  }
}).composite([
  { input: sequencePath("silsea", "land"), left: 0, top: 0 },
  { input: sequencePath("silsea", "hurt"), left: frameSize * 2, top: 0 },
  { input: sequencePath("potato89", "land"), left: 0, top: frameSize + rowGap },
  { input: sequencePath("potato89", "hurt"), left: frameSize * 2, top: frameSize + rowGap }
]).png().toFile(join(root, "references", "character-land-hurt-contact-sheet.png"));

console.log(`스프라이트 시트 생성: ${sequenceSpecs.length}개, 접촉 시트: 3개`);
