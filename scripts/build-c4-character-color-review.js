import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceDirectory = join(root, "assets", "_source", "c4");
const maskDirectory = join(root, "references", "could4-character-anchors");
const outputDirectory = join(root, "references", "could4-character-color-anchors");
const FRAME_SIZE = 128;
const REVIEW_SCALE = 2;
const ALPHA_THRESHOLD = 16;

const hexToRgb = (hex) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: value >> 16, g: (value >> 8) & 0xff, b: value & 0xff, hex };
};

const common = {
  outline: "#42474E",
  body: "#F1F6FA",
  shadow: "#9598A2",
  highlight: "#F4FBFD"
};

const characters = [
  {
    id: "sylvia",
    light: [common.body, common.highlight, "#DEB5C6", "#D294AC", "#E573A0"],
    mid: [common.shadow, "#D294AC", "#745767"]
  }
];

const colorDistance = (pixel, candidate) => {
  const dr = pixel.r - candidate.r;
  const dg = pixel.g - candidate.g;
  const db = pixel.b - candidate.b;
  return dr * dr + dg * dg + db * db;
};

const nearestColor = (pixel, palette) => palette.reduce((nearest, candidate) =>
  colorDistance(pixel, candidate) < colorDistance(pixel, nearest) ? candidate : nearest
);

const getVisibleBounds = (data, info) => {
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] <= ALPHA_THRESHOLD) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) throw new Error("보이는 앵커 픽셀이 없습니다.");
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    baseline: info.height - maxY - 1,
    leftMargin: minX,
    rightMargin: info.width - maxX - 1
  };
};

const getGeneratedSubjectBounds = (data, info) => {
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * 4;
      const alpha = data[offset + 3];
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const maximum = Math.max(r, g, b);
      const minimum = Math.min(r, g, b);
      const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
      const saturated = maximum - minimum > 52 && maximum > 118;
      if (alpha < 224 || (luminance < 142 && !saturated)) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) throw new Error("생성본에서 캐릭터 색 면을 찾지 못했습니다.");
  const padX = Math.round((maxX - minX + 1) * 0.018);
  const padY = Math.round((maxY - minY + 1) * 0.022);
  minX = Math.max(0, minX - padX);
  minY = Math.max(0, minY - padY);
  maxX = Math.min(info.width - 1, maxX + padX);
  maxY = Math.min(info.height - 1, maxY + padY);
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
};

await mkdir(outputDirectory, { recursive: true });
const reviewAnchors = [];

for (const character of characters) {
  const sourcePath = join(sourceDirectory, `${character.id}_anchor_color_generated_v1.png`);
  const maskPath = join(maskDirectory, `${character.id}_anchor_bw_v1.png`);
  const outputPath = join(outputDirectory, `${character.id}_anchor_color_v1.png`);

  const source = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const mask = await sharp(maskPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (mask.info.width !== FRAME_SIZE || mask.info.height !== FRAME_SIZE) {
    throw new Error(`${character.id}: 승인 마스크가 128x128이 아닙니다.`);
  }

  const maskBounds = getVisibleBounds(mask.data, mask.info);
  const sourceBounds = getGeneratedSubjectBounds(source.data, source.info);
  const mapped = await sharp(sourcePath)
    .extract(sourceBounds)
    .resize(maskBounds.width, maskBounds.height, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const result = Buffer.alloc(FRAME_SIZE * FRAME_SIZE * 4);
  const lightPalette = character.light.map(hexToRgb);
  const midPalette = character.mid.map(hexToRgb);
  const outline = hexToRgb(common.outline);
  const body = hexToRgb(common.body);
  const shadow = hexToRgb(common.shadow);

  for (let y = 0; y < FRAME_SIZE; y += 1) {
    for (let x = 0; x < FRAME_SIZE; x += 1) {
      const targetOffset = (y * FRAME_SIZE + x) * 4;
      const alpha = mask.data[targetOffset + 3];
      if (alpha <= ALPHA_THRESHOLD) continue;

      const gray = mask.data[targetOffset];
      let chosen;
      if (gray < 100) {
        chosen = outline;
      } else {
        const sourceX = Math.min(mapped.info.width - 1, Math.max(0, x - maskBounds.minX));
        const sourceY = Math.min(mapped.info.height - 1, Math.max(0, y - maskBounds.minY));
        const sourceOffset = (sourceY * mapped.info.width + sourceX) * 4;
        const sample = {
          r: mapped.data[sourceOffset],
          g: mapped.data[sourceOffset + 1],
          b: mapped.data[sourceOffset + 2]
        };
        const sampleLuminance = sample.r * 0.2126 + sample.g * 0.7152 + sample.b * 0.0722;
        if (sampleLuminance < 45) {
          chosen = gray < 200 ? shadow : body;
        } else {
          chosen = nearestColor(sample, gray < 200 ? midPalette : lightPalette);
        }
      }
      result[targetOffset] = chosen.r;
      result[targetOffset + 1] = chosen.g;
      result[targetOffset + 2] = chosen.b;
      result[targetOffset + 3] = alpha;
    }
  }

  const final = await sharp(result, {
    raw: { width: FRAME_SIZE, height: FRAME_SIZE, channels: 4 }
  }).png().toBuffer();
  await sharp(final).png().toFile(outputPath);

  const finalRaw = await sharp(final).raw().toBuffer({ resolveWithObject: true });
  const finalBounds = getVisibleBounds(finalRaw.data, finalRaw.info);
  const allowed = new Set([common.outline, ...character.light, ...character.mid].map((hex) => hex.toUpperCase()));
  const used = new Set();
  for (let offset = 0; offset < finalRaw.data.length; offset += 4) {
    if (finalRaw.data[offset + 3] <= ALPHA_THRESHOLD) continue;
    const hex = `#${[finalRaw.data[offset], finalRaw.data[offset + 1], finalRaw.data[offset + 2]]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("")}`.toUpperCase();
    used.add(hex);
    if (!allowed.has(hex)) throw new Error(`${character.id}: 승인 외 색상 ${hex}`);
  }
  if (JSON.stringify(finalBounds) !== JSON.stringify(maskBounds)) {
    throw new Error(`${character.id}: 승인 실루엣 경계가 달라졌습니다.`);
  }
  reviewAnchors.push(final);
  console.log(
    `${character.id}: ${finalBounds.width}x${finalBounds.height}px · baseline ${finalBounds.baseline}px · margins ${finalBounds.leftMargin}/${finalBounds.rightMargin}px · colors ${[...used].sort().join(",")}`
  );
}

const contactSheet = await sharp({
  create: {
    width: FRAME_SIZE * characters.length * REVIEW_SCALE,
    height: FRAME_SIZE * REVIEW_SCALE,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  }
}).composite(await Promise.all(reviewAnchors.map(async (input, index) => ({
  input: await sharp(input)
    .resize(FRAME_SIZE * REVIEW_SCALE, FRAME_SIZE * REVIEW_SCALE, { kernel: sharp.kernel.nearest })
    .png()
    .toBuffer(),
  left: index * FRAME_SIZE * REVIEW_SCALE,
  top: 0
})))).png().toBuffer();

await sharp(contactSheet).png().toFile(join(root, "references", "could4-character-contact-sheet-color.png"));
console.log("C4 컬러 캐릭터 접촉 시트 생성: 256x256 · sylvia");
