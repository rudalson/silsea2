import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const frameSize = 128;
const partsDirectory = join(root, "assets", "characters", "_parts");
const hornSources = Object.freeze({
  silsea: Object.freeze({
    frame: join(root, "assets", "characters", "silsea", "transform_unicorn", "silsea_transform_unicorn_05.png"),
    extract: Object.freeze({ left: 106, top: 19, width: 6, height: 7 })
  }),
  potato89: Object.freeze({
    frame: join(root, "assets", "characters", "potato89", "transform_unicorn", "potato89_transform_unicorn_05.png"),
    extract: Object.freeze({ left: 100, top: 16, width: 7, height: 8 })
  })
});

// Each coordinate is the point where the horn enters the forehead in a 128x128 frame.
// Keeping these anchors beside the build makes the baked variants deterministic and
// lets animation-specific head movement remain perfectly attached to the character.
const specs = Object.freeze({
  silsea: Object.freeze({
    hornWidth: 8,
    hornHeight: 11,
    sequences: Object.freeze({
      idle: [[96, 21, 14], [97, 23, 12], [96, 22, 14], [97, 22, 12]],
      run: [[95, 23, 14], [97, 23, 10], [95, 23, 14], [97, 21, 10], [96, 22, 14], [98, 21, 10], [96, 22, 14], [97, 22, 10]],
      jump_up: [[95, 33, 24], [95, 34, 12]],
      fall: [[96, 23, 14], [100, 37, 25]],
      land: [[96, 37, 22], [96, 23, 14]],
      hurt: [[93, 23, 25], [96, 22, 14]],
      fly: [[96, 24, 14], [96, 22, 10], [96, 25, 14], [97, 42, 18], [96, 24, 24], [96, 25, 14]],
      victory: [[96, 21, 14], [96, 21, 5], [94, 26, 0], [95, 21, 10], [96, 21, 14], [96, 21, 14]]
    })
  }),
  potato89: Object.freeze({
    hornWidth: 9,
    hornHeight: 11,
    sequences: Object.freeze({
      idle: [[85, 29, 14], [86, 28, 12], [85, 30, 14], [86, 28, 12]],
      roll: [[85, 28, 14], [86, 23, 10], [92, 33, 24], [86, 26, 14], [85, 22, 14], [87, 25, 10], [85, 27, 14], [86, 26, 10]],
      jump_up: [[83, 31, 24], [83, 28, 14]],
      fall: [[86, 25, 14], [87, 24, 14]],
      land: [[84, 34, 22], [86, 29, 14]],
      hurt: [[78, 22, 25], [85, 28, 14]],
      stomp: [[83, 27, 14], [82, 22, 14], [91, 33, 24], [85, 28, 14]],
      fly: [[84, 25, 14], [85, 26, 10], [86, 24, 14], [85, 28, 18], [84, 28, 24], [85, 23, 14]],
      victory: [[85, 28, 14], [84, 23, 5], [82, 22, 14], [83, 22, 5], [85, 23, 14], [85, 28, 14]]
    })
  })
});

const framePath = (character, sequence, index) => join(
  root,
  "assets",
  "characters",
  character,
  sequence,
  `${character}_${sequence}_${String(index).padStart(2, "0")}.png`
);

const sheetPath = (character, sequence) => join(
  root,
  "assets",
  "characters",
  character,
  `${character}_unicorn_${sequence}.png`
);

await mkdir(partsDirectory, { recursive: true });

const extractedHornSources = new Map();
for (const [character, source] of Object.entries(hornSources)) {
  const data = await sharp(source.frame)
    .extract(source.extract)
    .png({ palette: true, colours: 32, dither: 0 })
    .toBuffer();
  extractedHornSources.set(character, data);
  await sharp(data).toFile(join(partsDirectory, `unicorn_horn_${character}.png`));
}

const prepareHorn = (character, width, height, angle = 14) => sharp(extractedHornSources.get(character))
  .resize({ width, height, fit: "fill", kernel: sharp.kernel.lanczos3 })
  // 원화 뿔 자체가 약 14도 기울어 있으므로 프레임 값은 그 기준의 보정각이다.
  .rotate(angle - 14, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 4 });

const createHorn = async (character, width, height, angle = 14) => {
  const { data, info } = await prepareHorn(character, width, height, angle)
    .png({ palette: true, colours: 64, dither: 0 })
    .toBuffer({ resolveWithObject: true });
  const raw = await sharp(data).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let maxY = 0;
  for (let y = 0; y < raw.info.height; y += 1) {
    for (let x = 0; x < raw.info.width; x += 1) {
      if (raw.data[(y * raw.info.width + x) * 4 + 3] > 32) maxY = Math.max(maxY, y);
    }
  }
  let weightedX = 0;
  let alphaTotal = 0;
  for (let y = Math.max(0, maxY - 3); y <= maxY; y += 1) {
    for (let x = 0; x < raw.info.width; x += 1) {
      const alpha = raw.data[(y * raw.info.width + x) * 4 + 3];
      if (alpha <= 32) continue;
      weightedX += x * alpha;
      alphaTotal += alpha;
    }
  }
  const pixels = [];
  for (let y = 0; y < raw.info.height; y += 1) {
    for (let x = 0; x < raw.info.width; x += 1) {
      const alpha = raw.data[(y * raw.info.width + x) * 4 + 3];
      if (alpha > 40) pixels.push({ x, y, alpha });
    }
  }
  return {
    data,
    width: info.width,
    height: info.height,
    baseX: Math.round(weightedX / alphaTotal),
    baseY: Math.max(0, maxY - 1),
    alpha: raw.data,
    alphaWidth: raw.info.width,
    alphaHeight: raw.info.height,
    baseBandStart: Math.max(0, maxY - 4),
    pixels
  };
};

const hornCache = new Map();
const getHorn = async (character, width, height, angle) => {
  const key = `${character}:${width}x${height}@${angle}`;
  if (!hornCache.has(key)) hornCache.set(key, createHorn(character, width, height, angle));
  return hornCache.get(key);
};

const ALPHA_THRESHOLD = 40;
const weldStats = [];
const readAlpha = async (input) => {
  const raw = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: raw.data, width: raw.info.width, height: raw.info.height };
};
const alphaAt = (image, x, y) => {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return 0;
  return image.data[(y * image.width + x) * 4 + 3];
};

const placeHornAtAnchor = (frameAlpha, horn, anchorX, anchorY) => {
  const left = Math.round(anchorX - horn.baseX);
  const top = Math.round(anchorY - horn.baseY);
  if (left < 0 || top < 0 || left + horn.width > frameAlpha.width || top + horn.height > frameAlpha.height) {
    throw new Error(`수동 앵커가 프레임 밖에 있음 (${anchorX},${anchorY})`);
  }
  let baseOverlap = 0;
  let upperOverlap = 0;
  for (const pixel of horn.pixels) {
    if (alphaAt(frameAlpha, left + pixel.x, top + pixel.y) <= ALPHA_THRESHOLD) continue;
    if (pixel.y >= horn.baseBandStart) baseOverlap += 1;
    else upperOverlap += 1;
  }
  return { anchorX, anchorY, left, top, baseOverlap, upperOverlap };
};

const countAddedContacts = (baseAlpha, resultAlpha) => {
  let addedPixels = 0;
  let contactPixels = 0;
  for (let y = 0; y < baseAlpha.height; y += 1) {
    for (let x = 0; x < baseAlpha.width; x += 1) {
      if (alphaAt(resultAlpha, x, y) <= ALPHA_THRESHOLD || alphaAt(baseAlpha, x, y) > ALPHA_THRESHOLD) continue;
      addedPixels += 1;
      let touchesBase = false;
      for (let offsetY = -1; offsetY <= 1 && !touchesBase; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) continue;
          if (alphaAt(baseAlpha, x + offsetX, y + offsetY) > ALPHA_THRESHOLD) {
            touchesBase = true;
            break;
          }
        }
      }
      if (touchesBase) contactPixels += 1;
    }
  }
  return { addedPixels, contactPixels };
};

const buildSequence = async (character, sequence, anchors, width, height) => {
  const frames = [];

  for (let index = 0; index < anchors.length; index += 1) {
    const [anchorX, anchorY, angle] = anchors[index];
    const horn = await getHorn(character, width, height, angle);
    const inputPath = framePath(character, sequence, index);
    const baseAlpha = await readAlpha(inputPath);
    const weld = placeHornAtAnchor(baseAlpha, horn, anchorX, anchorY);
    const frame = await sharp(inputPath)
      .composite([{
        input: horn.data,
        left: weld.left,
        top: weld.top
      }])
      .png({ palette: true, colours: 128, dither: 0 })
      .toBuffer();
    const resultAlpha = await readAlpha(frame);
    const contact = countAddedContacts(baseAlpha, resultAlpha);
    weldStats.push({
      frame: `${character}/${sequence}/${index}`,
      anchor: [weld.anchorX, weld.anchorY],
      overlapPixels: weld.baseOverlap,
      contactPixels: contact.contactPixels,
      addedPixels: contact.addedPixels
    });
    frames.push(frame);
  }

  await sharp({
    create: {
      width: frameSize * frames.length,
      height: frameSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  }).composite(frames.map((input, index) => ({
    input,
    left: index * frameSize,
    top: 0
  }))).png({ palette: true, colours: 128, dither: 0 }).toFile(sheetPath(character, sequence));
};

for (const [character, spec] of Object.entries(specs)) {
  for (const [sequence, anchors] of Object.entries(spec.sequences)) {
    await buildSequence(character, sequence, anchors, spec.hornWidth, spec.hornHeight);
  }
}

const rowGap = 16;
const rows = [
  ["silsea", "idle"],
  ["silsea", "run"],
  ["silsea", "jump_up"],
  ["silsea", "fall"],
  ["silsea", "land"],
  ["silsea", "hurt"],
  ["silsea", "fly"],
  ["silsea", "victory"],
  ["potato89", "idle"],
  ["potato89", "roll"],
  ["potato89", "jump_up"],
  ["potato89", "fall"],
  ["potato89", "land"],
  ["potato89", "hurt"],
  ["potato89", "stomp"],
  ["potato89", "fly"],
  ["potato89", "victory"]
];
const widest = Math.max(...rows.map(([character, sequence]) => specs[character].sequences[sequence].length));
await sharp({
  create: {
    width: widest * frameSize,
    height: rows.length * frameSize + (rows.length - 1) * rowGap,
    channels: 4,
    background: { r: 238, g: 235, b: 224, alpha: 1 }
  }
}).composite(rows.map(([character, sequence], index) => ({
  input: sheetPath(character, sequence),
  left: 0,
  top: index * (frameSize + rowGap)
}))).png().toFile(join(root, "references", "character-unicorn-variants-contact-sheet.png"));

const minimumContact = Math.min(...weldStats.map(({ contactPixels }) => contactPixels));
const minimumOverlap = Math.min(...weldStats.map(({ overlapPixels }) => overlapPixels));
console.log(`유니콘 실루엣 용접 시트 생성: ${rows.length}개·${weldStats.length}프레임 (최소 접촉 ${minimumContact}px, 최소 겹침 ${minimumOverlap}px)`);
if (process.argv.includes("--print-anchors")) {
  console.log(JSON.stringify(weldStats, null, 2));
}
const detachedFrames = weldStats.filter(({ contactPixels }) => contactPixels < 1);
if (detachedFrames.length) {
  throw new Error(`수동 앵커 연결 실패: ${detachedFrames.map(({ frame }) => frame).join(", ")}`);
}
