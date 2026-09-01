import sharp from "sharp";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../assets/_source/p11/p11_invisible_king_anchor_generated_v1.png", import.meta.url));
const contactSheet = fileURLToPath(new URL("../references/p11-invisible-anchor-contact-sheet.png", import.meta.url));
const preview = fileURLToPath(new URL("../references/p11-invisible-anchor-preview-25.png", import.meta.url));
const silhouette = fileURLToPath(new URL("../references/p11-invisible-anchor-silhouette-25.png", import.meta.url));

const metadata = await sharp(source).metadata();

if (metadata.width !== 1536 || metadata.height !== 1024) {
  throw new Error(`P11 앵커 원본 규격 불일치: ${metadata.width}x${metadata.height}`);
}

await sharp(source)
  .greyscale()
  .png()
  .toFile(contactSheet);

const { data: sourcePixels, info: sourceInfo } = await sharp(contactSheet)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
let maxChannelDelta = 0;

for (let offset = 0; offset < sourcePixels.length; offset += sourceInfo.channels) {
  const red = sourcePixels[offset];
  const green = sourcePixels[offset + 1];
  const blue = sourcePixels[offset + 2];
  maxChannelDelta = Math.max(maxChannelDelta, Math.abs(red - green), Math.abs(green - blue), Math.abs(red - blue));
}

if (maxChannelDelta > 2) {
  throw new Error(`P11 앵커가 흑백 제한을 벗어남: RGB 채널 최대 편차 ${maxChannelDelta}`);
}

const reviewWidth = Math.round(metadata.width * 0.25);
const reviewHeight = Math.round(metadata.height * 0.25);

await sharp(contactSheet)
  .resize(reviewWidth, reviewHeight, { kernel: sharp.kernel.lanczos3 })
  .png()
  .toFile(preview);

await sharp(contactSheet)
  .resize(reviewWidth, reviewHeight, { kernel: sharp.kernel.lanczos3 })
  .greyscale()
  .threshold(170)
  .png()
  .toFile(silhouette);

console.log(`P11 앵커 검토본 생성: ${reviewWidth}x${reviewHeight} 축소·이진 실루엣 · RGB 최대 편차 ${maxChannelDelta}`);
