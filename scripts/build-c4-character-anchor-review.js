import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceDirectory = join(root, "assets", "_source", "c4");
const outputDirectory = join(root, "references", "could4-character-anchors");
const characters = ["sylvia"];
const FRAME_SIZE = 128;
const MAX_SUBJECT_WIDTH = 112;
const MAX_SUBJECT_HEIGHT = 96;
const BASELINE_FROM_BOTTOM = 16;
const ALPHA_THRESHOLD = 16;
const GRAYS = [66, 150, 225, 248];

const quantizeGrayscale = async (input) => {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] <= ALPHA_THRESHOLD) {
      data[offset + 3] = 0;
      continue;
    }
    const luminance = Math.round(
      data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722
    );
    const gray = GRAYS.reduce((nearest, candidate) =>
      Math.abs(candidate - luminance) < Math.abs(nearest - luminance) ? candidate : nearest
    );
    data[offset] = gray;
    data[offset + 1] = gray;
    data[offset + 2] = gray;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
};

const getVisibleBounds = async (input) => {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * 4 + 3];
      if (alpha <= ALPHA_THRESHOLD) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0 || maxY < 0) throw new Error("보이는 캐릭터 픽셀이 없습니다.");
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

await mkdir(outputDirectory, { recursive: true });
const normalizedAnchors = [];

for (const characterId of characters) {
  const source = join(sourceDirectory, `${characterId}_anchor_generated_v1.png`);
  const output = join(outputDirectory, `${characterId}_anchor_bw_v1.png`);
  const grayscale = await quantizeGrayscale(source);
  const trimmed = await sharp(grayscale)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const metadata = await sharp(trimmed).metadata();
  const scale = Math.min(MAX_SUBJECT_WIDTH / metadata.width, MAX_SUBJECT_HEIGHT / metadata.height);
  const width = Math.max(1, Math.round(metadata.width * scale));
  const height = Math.max(1, Math.round(metadata.height * scale));
  const resized = await sharp(trimmed)
    .resize(width, height, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  const normalized = await sharp({
    create: {
      width: FRAME_SIZE,
      height: FRAME_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  }).composite([{
    input: resized,
    left: Math.round((FRAME_SIZE - width) / 2),
    top: FRAME_SIZE - BASELINE_FROM_BOTTOM - height
  }]).png().toBuffer();
  const final = await quantizeGrayscale(normalized);
  await sharp(final).png().toFile(output);
  const bounds = await getVisibleBounds(final);
  if (bounds.height > MAX_SUBJECT_HEIGHT) throw new Error(`${characterId}: 높이 ${bounds.height}px`);
  if (bounds.baseline !== BASELINE_FROM_BOTTOM) throw new Error(`${characterId}: 기준선 ${bounds.baseline}px`);
  if (bounds.leftMargin < 8 || bounds.rightMargin < 8) {
    throw new Error(`${characterId}: 좌우 여백 ${bounds.leftMargin}/${bounds.rightMargin}px`);
  }
  normalizedAnchors.push(final);
  console.log(
    `${characterId}: ${bounds.width}x${bounds.height}px · baseline ${bounds.baseline}px · margins ${bounds.leftMargin}/${bounds.rightMargin}px`
  );
}

const reviewScale = 2;
const contactSheet = await sharp({
  create: {
    width: FRAME_SIZE * characters.length * reviewScale,
    height: FRAME_SIZE * reviewScale,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  }
}).composite(await Promise.all(normalizedAnchors.map(async (input, index) => ({
  input: await sharp(input)
    .resize(FRAME_SIZE * reviewScale, FRAME_SIZE * reviewScale, { kernel: sharp.kernel.nearest })
    .png()
    .toBuffer(),
  left: index * FRAME_SIZE * reviewScale,
  top: 0
})))).png().toBuffer();

await sharp(contactSheet).png().toFile(join(root, "references", "could4-character-contact-sheet-bw.png"));
console.log("C4 흑백 캐릭터 접촉 시트 생성: 256x256 · sylvia");
