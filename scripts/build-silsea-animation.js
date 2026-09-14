import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { nearestPaletteColor } from "./image-utils.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets/_source/silsea-animation");
const output = join(root, "assets/characters/silsea");
const size = 128;
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const { data, info } = await sharp(join(source, "atlas-green.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
// Remove the generated chroma background before resizing, preserving white fur
// and the dark outline. Premultiplied alpha prevents green filtering fringes.
for (let i = 0; i < data.length; i += 4) {
  const excess = data[i + 1] - Math.max(data[i], data[i + 2]);
  if (excess <= 12) continue;
  const alpha = Math.max(0, 1 - excess / 180);
  data[i + 3] = Math.round(255 * alpha);
  data[i + 1] = Math.min(data[i + 1], Math.max(data[i], data[i + 2]));
}
const atlas = await sharp(data, { raw: info }).png().toBuffer();
const cells = [];
for (let row = 0; row < 8; row++) {
  cells[row] = [];
  for (let col = 0; col < 8; col++) {
    const left = Math.round(col * info.width / 8);
    const top = Math.round(row * info.height / 8);
    const crop = await sharp(atlas).extract({ left, top,
      width: Math.round((col + 1) * info.width / 8) - left,
      height: Math.round((row + 1) * info.height / 8) - top
    }).png().toBuffer();
    // One uniform scale for the ENTIRE atlas. Never stretch each pose to its
    // silhouette bounds: raised wings and tucked legs must not resize the horse.
    const scaled = await sharp(crop).resize(118, 118).png().toBuffer();
    cells[row][col] = await sharp({ create: { width: size, height: size, channels: 4, background: transparent } })
      .composite([{ input: scaled, left: 5, top: -1 }]).png().toBuffer();
  }
}

// The dedicated flight atlas locks the horse's body while articulating wings.
// Register each drawing to the eye, not the feather or hoof bounding box.
const flightSource = join(source, "flight.png");
const flightEyes = [[342, 299], [757, 299], [1174, 299], [342, 873], [757, 873], [1174, 873]];
const flightFrames = [];
for (let i = 0; i < flightEyes.length; i++) {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const left = col * 418;
  const top = row === 0 ? 96 : 696;
  const scaled = await sharp(flightSource).extract({ left, top, width: 418, height: 450 })
    .resize(105, 113).png().toBuffer();
  const [eyeX, eyeY] = flightEyes[i];
  flightFrames.push(await sharp({ create: { width: size, height: size, channels: 4, background: transparent } })
    .composite([{ input: scaled, left: Math.round(103 - (eyeX - left) * 105 / 418), top: Math.round(53 - (eyeY - top) * 113 / 450) }])
    .png().toBuffer());
}

// Idle is registered to a SINGLE drawing. A small generated eyelid patch is
// the only changing region, so breathing cannot inflate the torso or feet.
const eyeRegion = { left: 93, top: 37, width: 17, height: 16 };
const closedEye = await sharp(cells[0][2]).extract(eyeRegion).png().toBuffer();
const blink = await sharp(cells[0][0]).composite([{ input: closedEye, left: eyeRegion.left, top: eyeRegion.top }]).png().toBuffer();
const sequences = {
  idle: [cells[0][0], cells[0][0], blink, cells[0][0]],
  run: cells[1],
  jump_up: cells[2].slice(0, 2),
  fall: cells[2].slice(2, 4),
  land: [cells[0][4], cells[0][0]],
  hurt: cells[0].slice(6, 8),
  wing_guard: [cells[2][4], cells[2][5], cells[2][6], cells[2][6]],
  fly: flightFrames,
  swim: cells[4].slice(0, 6),
  victory: cells[5].slice(0, 6),
  transform_unicorn: cells[6].slice(0, 6),
  transform_pegasus: [cells[0][0], cells[0][0], cells[2][4], flightFrames[1], flightFrames[0], flightFrames[0]],
  transform_alicorn: cells[7]
};

const framesMetadata = {};
const airborne = new Set(["jump_up", "fall", "fly", "swim", "wing_guard", "transform_pegasus"]);
const paletteCache = new Map();
for (const [name, frames] of Object.entries(sequences)) {
  await mkdir(join(output, name), { recursive: true });
  for (const [index, frame] of frames.entries()) {
    const raw = await sharp(frame).ensureAlpha().raw().toBuffer();
    let maxY = 0;
    let minX = size, maxX = 0;
    for (let i = 0; i < raw.length; i += 4) {
      if (raw[i + 3] < 16) { raw[i + 3] = 0; continue; }
      minX = Math.min(minX, (i / 4) % size);
      maxX = Math.max(maxX, (i / 4) % size);
      if (raw[i + 3] >= 128) maxY = Math.max(maxY, Math.floor(i / 4 / size));
      const key = `${raw[i]},${raw[i + 1]},${raw[i + 2]}`;
      if (!paletteCache.has(key)) paletteCache.set(key, nearestPaletteColor([raw[i], raw[i + 1], raw[i + 2]]).rgb);
      const rgb = paletteCache.get(key);
      raw[i] = rgb[0]; raw[i + 1] = rgb[1]; raw[i + 2] = rgb[2];
    }
    const quantized = await sharp(raw, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
    const shiftX = minX < 8 ? 8 - minX : maxX > 119 ? 119 - maxX : 0;
    frames[index] = await sharp({ create: { width: size, height: size, channels: 4, background: transparent } })
      .composite([{ input: quantized, left: shiftX, top: airborne.has(name) ? 0 : 111 - maxY }]).png().toBuffer();
    await writeFile(join(output, name, `silsea_${name}_${String(index).padStart(2, "0")}.png`), frames[index]);
  }
  await sharp({ create: { width: size * frames.length, height: size, channels: 4, background: transparent } })
    .composite(frames.map((input, i) => ({ input, left: i * size, top: 0 })))
    .png().toFile(join(output, `silsea_${name}.png`));
  framesMetadata[name] = frames.length;
}
await writeFile(join(source, "frames.json"), `${JSON.stringify(framesMetadata, null, 2)}\n`);
await sharp({ create: { width: size * 8, height: size * Object.keys(sequences).length, channels: 4, background: "#eeebe0" } })
  .composite(Object.keys(sequences).map((name, row) => ({ input: join(output, `silsea_${name}.png`), left: 0, top: row * size })))
  .png().toFile(join(root, "references/silsea-animation-refined.png"));
console.log(`실세아 애니메이션 생성: ${Object.keys(sequences).length}종 / ${Object.values(sequences).reduce((n, frames) => n + frames.length, 0)}프레임`);
