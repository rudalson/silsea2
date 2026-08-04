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
  ["potato89", "hurt", 2],
  ["silsea", "transform_unicorn", 6],
  ["potato89", "stomp", 4],
  ["potato89", "transform_unicorn", 6],
  ["potato89", "transform_pegasus", 6],
  ["potato89", "transform_alicorn", 8],
  ["potato89", "fly", 6],
  ["potato89", "victory", 6],
  ["silsea", "transform_pegasus", 6],
  ["silsea", "transform_alicorn", 8],
  ["silsea", "fly", 6],
  ["silsea", "victory", 6]
];

const enemySequenceSpecs = [
  ["raw_potato", "idle", 2],
  ["raw_potato", "roll", 6],
  ["raw_potato", "defeated", 4],
  ["spike_pumpkin", "idle", 2],
  ["spike_pumpkin", "warning", 2],
  ["spike_pumpkin", "break", 6],
  ["dark_cloud", "idle", 4],
  ["dark_cloud", "charge", 4],
  ["dark_cloud", "attack", 3],
  ["dark_cloud", "defeated", 4],
  ["magpie", "fly", 6],
  ["magpie", "warning", 3],
  ["magpie", "dive", 4],
  ["magpie", "stunned", 4],
  ["magpie", "defeated", 4],
  ["potato_king", "idle", 4],
  ["potato_king", "jump", 4],
  ["potato_king", "fall", 2],
  ["potato_king", "land", 4],
  ["potato_king", "shoot", 4],
  ["potato_king", "hurt", 3],
  ["potato_king", "defeated", 8]
];

const sequencePath = (character, sequence) =>
  join(root, "assets", "characters", character, `${character}_${sequence}.png`);

const enemySequencePath = (enemy, sequence) =>
  join(root, "assets", "enemies", enemy, `${enemy}_${sequence}.png`);

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

const buildEnemyStrip = async (enemy, sequence, frameCount) => {
  const directory = join(root, "assets", "enemies", enemy, sequence);
  const prefix = `${enemy}_${sequence}_`;
  const output = enemySequencePath(enemy, sequence);
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
for (const spec of enemySequenceSpecs) await buildEnemyStrip(...spec);

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

await sharp({
  create: {
    width: frameSize * 6,
    height: frameSize * 2 + rowGap,
    channels: 4,
    background: { r: 238, g: 235, b: 224, alpha: 1 }
  }
}).composite([
  { input: sequencePath("silsea", "transform_unicorn"), left: 0, top: 0 },
  { input: sequencePath("potato89", "stomp"), left: 0, top: frameSize + rowGap }
]).png().toFile(join(root, "references", "character-unicorn-stomp-contact-sheet.png"));

await sharp({
  create: {
    width: frameSize * 6,
    height: frameSize,
    channels: 4,
    background: { r: 238, g: 235, b: 224, alpha: 1 }
  }
}).composite([
  { input: sequencePath("silsea", "transform_pegasus"), left: 0, top: 0 }
]).png().toFile(join(root, "references", "character-pegasus-contact-sheet.png"));

await sharp({
  create: {
    width: frameSize * 8,
    height: frameSize,
    channels: 4,
    background: { r: 238, g: 235, b: 224, alpha: 1 }
  }
}).composite([
  { input: sequencePath("silsea", "transform_alicorn"), left: 0, top: 0 }
]).png().toFile(join(root, "references", "character-alicorn-contact-sheet.png"));

await sharp({
  create: {
    width: frameSize * 6,
    height: frameSize,
    channels: 4,
    background: { r: 238, g: 235, b: 224, alpha: 1 }
  }
}).composite([
  { input: sequencePath("silsea", "fly"), left: 0, top: 0 }
]).png().toFile(join(root, "references", "character-fly-contact-sheet.png"));

await sharp({
  create: {
    width: frameSize * 6,
    height: frameSize,
    channels: 4,
    background: { r: 238, g: 235, b: 224, alpha: 1 }
  }
}).composite([
  { input: sequencePath("silsea", "victory"), left: 0, top: 0 }
]).png().toFile(join(root, "references", "character-victory-contact-sheet.png"));

await sharp({
  create: {
    width: frameSize * 6,
    height: frameSize,
    channels: 4,
    background: { r: 238, g: 235, b: 224, alpha: 1 }
  }
}).composite([
  { input: sequencePath("potato89", "transform_unicorn"), left: 0, top: 0 }
]).png().toFile(join(root, "references", "character-potato-unicorn-contact-sheet.png"));

await sharp({
  create: {
    width: frameSize * 6,
    height: frameSize,
    channels: 4,
    background: { r: 238, g: 235, b: 224, alpha: 1 }
  }
}).composite([
  { input: sequencePath("potato89", "transform_pegasus"), left: 0, top: 0 }
]).png().toFile(join(root, "references", "character-potato-pegasus-contact-sheet.png"));

await sharp({
  create: {
    width: frameSize * 8,
    height: frameSize,
    channels: 4,
    background: { r: 238, g: 235, b: 224, alpha: 1 }
  }
}).composite([
  { input: sequencePath("potato89", "transform_alicorn"), left: 0, top: 0 }
]).png().toFile(join(root, "references", "character-potato-alicorn-contact-sheet.png"));

await sharp({
  create: {
    width: frameSize * 6,
    height: frameSize,
    channels: 4,
    background: { r: 238, g: 235, b: 224, alpha: 1 }
  }
}).composite([
  { input: sequencePath("potato89", "fly"), left: 0, top: 0 }
]).png().toFile(join(root, "references", "character-potato-fly-contact-sheet.png"));

await sharp({
  create: {
    width: frameSize * 6,
    height: frameSize,
    channels: 4,
    background: { r: 238, g: 235, b: 224, alpha: 1 }
  }
}).composite([
  { input: sequencePath("potato89", "victory"), left: 0, top: 0 }
]).png().toFile(join(root, "references", "character-potato-victory-contact-sheet.png"));

await sharp({
  create: {
    width: frameSize * 6,
    height: frameSize * 3 + rowGap * 2,
    channels: 4,
    background: { r: 238, g: 235, b: 224, alpha: 1 }
  }
}).composite([
  { input: enemySequencePath("raw_potato", "idle"), left: 0, top: 0 },
  { input: enemySequencePath("raw_potato", "roll"), left: 0, top: frameSize + rowGap },
  { input: enemySequencePath("raw_potato", "defeated"), left: 0, top: (frameSize + rowGap) * 2 }
]).png().toFile(join(root, "references", "enemy-raw-potato-contact-sheet.png"));

await sharp({
  create: {
    width: frameSize * 6,
    height: frameSize * 3 + rowGap * 2,
    channels: 4,
    background: { r: 238, g: 235, b: 224, alpha: 1 }
  }
}).composite([
  { input: enemySequencePath("spike_pumpkin", "idle"), left: 0, top: 0 },
  { input: enemySequencePath("spike_pumpkin", "warning"), left: 0, top: frameSize + rowGap },
  { input: enemySequencePath("spike_pumpkin", "break"), left: 0, top: (frameSize + rowGap) * 2 }
]).png().toFile(join(root, "references", "enemy-spike-pumpkin-contact-sheet.png"));

await sharp({
  create: {
    width: frameSize * 4,
    height: frameSize * 4 + rowGap * 3,
    channels: 4,
    background: { r: 238, g: 235, b: 224, alpha: 1 }
  }
}).composite([
  { input: enemySequencePath("dark_cloud", "idle"), left: 0, top: 0 },
  { input: enemySequencePath("dark_cloud", "charge"), left: 0, top: frameSize + rowGap },
  { input: enemySequencePath("dark_cloud", "attack"), left: 0, top: (frameSize + rowGap) * 2 },
  { input: enemySequencePath("dark_cloud", "defeated"), left: 0, top: (frameSize + rowGap) * 3 }
]).png().toFile(join(root, "references", "enemy-dark-cloud-contact-sheet.png"));

await sharp({
  create: {
    width: frameSize * 6,
    height: frameSize * 5 + rowGap * 4,
    channels: 4,
    background: { r: 238, g: 235, b: 224, alpha: 1 }
  }
}).composite([
  { input: enemySequencePath("magpie", "fly"), left: 0, top: 0 },
  { input: enemySequencePath("magpie", "warning"), left: 0, top: frameSize + rowGap },
  { input: enemySequencePath("magpie", "dive"), left: 0, top: (frameSize + rowGap) * 2 },
  { input: enemySequencePath("magpie", "stunned"), left: 0, top: (frameSize + rowGap) * 3 },
  { input: enemySequencePath("magpie", "defeated"), left: 0, top: (frameSize + rowGap) * 4 }
]).png().toFile(join(root, "references", "enemy-magpie-contact-sheet.png"));

await sharp({
  create: {
    width: frameSize * 8,
    height: frameSize * 7 + rowGap * 6,
    channels: 4,
    background: { r: 238, g: 235, b: 224, alpha: 1 }
  }
}).composite([
  { input: enemySequencePath("potato_king", "idle"), left: 0, top: 0 },
  { input: enemySequencePath("potato_king", "jump"), left: 0, top: frameSize + rowGap },
  { input: enemySequencePath("potato_king", "fall"), left: 0, top: (frameSize + rowGap) * 2 },
  { input: enemySequencePath("potato_king", "land"), left: 0, top: (frameSize + rowGap) * 3 },
  { input: enemySequencePath("potato_king", "shoot"), left: 0, top: (frameSize + rowGap) * 4 },
  { input: enemySequencePath("potato_king", "hurt"), left: 0, top: (frameSize + rowGap) * 5 },
  { input: enemySequencePath("potato_king", "defeated"), left: 0, top: (frameSize + rowGap) * 6 }
]).png().toFile(join(root, "references", "enemy-potato-king-contact-sheet.png"));

console.log(`스프라이트 시트 생성: ${sequenceSpecs.length + enemySequenceSpecs.length}개, 접촉 시트: 18개`);
