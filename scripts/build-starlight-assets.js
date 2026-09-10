import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { buildStorybookStagePreview } from "./build-storybook-stage-previews.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceRoot = join(root, "assets", "_source", "starlight", "storybook");
const backgroundRoot = join(root, "assets", "backgrounds");
const decorationRoot = join(root, "assets", "decorations");
const referenceRoot = join(root, "references");
const WIDTH = 2048;
const HEIGHT = 720;
const SEAM_COLUMNS = 2;

// Preserve the storybook palette and soft alpha edges; quantizing these
// illustrations to the old night palette made the entire stage muddy.
const loadTransparentSource = async (input) => {
  const metadata = await sharp(input).metadata();
  if (!metadata.hasAlpha) throw new Error(`${input}: 실제 알파 채널이 필요합니다`);
  return sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
};

const makeSeamless = (data, width, height) => {
  const source = Buffer.from(data);
  for (let offset = 0; offset < SEAM_COLUMNS; offset += 1) {
    const rightX = width - 1 - offset;
    for (let y = 0; y < height; y += 1) {
      const sourceIndex = (y * width + offset) * 4;
      const targetIndex = (y * width + rightX) * 4;
      source.copy(data, targetIndex, sourceIndex, sourceIndex + 4);
    }
  }
};

const buildBackgroundLayer = async (name, layer, transparent) => {
  const input = join(sourceRoot, `${name}.png`);
  let pipeline;
  if (transparent) {
    const matte = await loadTransparentSource(input);
    pipeline = sharp(matte.data, { raw: matte.info });
  } else {
    pipeline = sharp(input).ensureAlpha();
  }
  if (layer === "near") {
    // Fit the entire vegetation silhouette below y=500, without cutting off
    // the tops of the glowing flowers or filling the play area with bushes.
    const vegetation = await pipeline.trim().resize(WIDTH, 220, { fit: "fill" }).png().toBuffer();
    pipeline = sharp({ create: { width: WIDTH, height: HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: vegetation, left: 0, top: 500 }]);
  }
  const { data, info } = await pipeline
    .resize(WIDTH, HEIGHT, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  makeSeamless(data, info.width, info.height);
  const output = join(backgroundRoot, `${name}.png`);
  await mkdir(dirname(output), { recursive: true });
  await sharp(data, { raw: info }).png({ compressionLevel: 9 }).toFile(output);
  return output;
};

const normalizeDecoration = async (sheet, rectangle, outputName, width, height) => {
  let minimumX = rectangle.width;
  let minimumY = rectangle.height;
  let maximumX = -1;
  let maximumY = -1;
  for (let y = 0; y < rectangle.height; y += 1) {
    for (let x = 0; x < rectangle.width; x += 1) {
      const sourceX = rectangle.left + x;
      const sourceY = rectangle.top + y;
      const alpha = sheet.data[(sourceY * sheet.info.width + sourceX) * 4 + 3];
      if (alpha < 12) continue;
      minimumX = Math.min(minimumX, x);
      minimumY = Math.min(minimumY, y);
      maximumX = Math.max(maximumX, x);
      maximumY = Math.max(maximumY, y);
    }
  }
  if (maximumX < minimumX || maximumY < minimumY) throw new Error(`${outputName}: 투명 추출 뒤 전경이 없음`);
  const tight = {
    left: rectangle.left + minimumX,
    top: rectangle.top + minimumY,
    width: maximumX - minimumX + 1,
    height: maximumY - minimumY + 1
  };
  const content = await sharp(sheet.data, { raw: sheet.info })
    .extract(tight)
    .resize(width - 24, height - 24, { fit: "inside", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  const contentInfo = await sharp(content).metadata();
  const extracted = await sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{
      input: content,
      left: Math.round((width - contentInfo.width) / 2),
      top: Math.round((height - contentInfo.height) / 2)
    }])
    .raw()
    .toBuffer({ resolveWithObject: true });
  const output = join(decorationRoot, `${outputName}.png`);
  await mkdir(dirname(output), { recursive: true });
  await sharp(extracted.data, { raw: extracted.info }).png({ compressionLevel: 9 }).toFile(output);
  return output;
};

const buildDecorations = async () => {
  const source = join(sourceRoot, "starlight_decor.png");
  const sheet = await loadTransparentSource(source);
  const halfWidth = Math.floor(sheet.info.width / 2);
  const rightWidth = sheet.info.width - halfWidth;
  const topHeight = Math.round(sheet.info.height * 0.64);
  const bottomTop = topHeight;
  const bottomHeight = sheet.info.height - bottomTop;
  // The tree's soft root silhouette extends below the shared 64% split.
  // Start the firefly crop in the empty gap, before its glow begins at 71%.
  const fireflyTop = Math.round(sheet.info.height * 0.70);
  return Promise.all([
    normalizeDecoration(sheet, { left: 0, top: 0, width: halfWidth, height: topHeight }, "decor_star_tree", 640, 640),
    normalizeDecoration(sheet, { left: halfWidth, top: 0, width: rightWidth, height: topHeight }, "decor_moon_branch", 384, 256),
    normalizeDecoration(sheet, { left: 0, top: fireflyTop, width: halfWidth, height: sheet.info.height - fireflyTop }, "decor_firefly", 192, 160),
    normalizeDecoration(sheet, { left: halfWidth, top: bottomTop, width: rightWidth, height: bottomHeight }, "decor_star_flower", 256, 192)
  ]);
};

await mkdir(referenceRoot, { recursive: true });
const far = await buildBackgroundLayer("bg_starlight_far", "far", false);
const mid = await buildBackgroundLayer("bg_starlight_mid", "mid", true);
const near = await buildBackgroundLayer("bg_starlight_near", "near", true);
await buildDecorations();

const backgroundComposite = await sharp(far)
  .composite([{ input: mid }, { input: near }])
  .png()
  .toBuffer();

await sharp(backgroundComposite)
  .resize(1024, 360)
  .png({ compressionLevel: 9 })
  .toFile(join(referenceRoot, "background-starlight-preview.png"));

await buildStorybookStagePreview("starlight");

console.log("별빛 숲 최종 시각 에셋 생성: 배경 3, 장식 4, 미리보기 2");
