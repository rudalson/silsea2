import sharp from "sharp";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL(
  "../references/could2-sticker-anchor-contact-sheet.png",
  import.meta.url
));
const anchor = fileURLToPath(new URL("../references/could2-sticker-anchor.png", import.meta.url));
const preview = fileURLToPath(new URL("../references/could2-sticker-anchor-25.png", import.meta.url));
const silhouette = fileURLToPath(new URL(
  "../references/could2-sticker-anchor-silhouette-25.png",
  import.meta.url
));

const sourceMetadata = await sharp(source).metadata();
if (!sourceMetadata.width || !sourceMetadata.height || sourceMetadata.width / sourceMetadata.height < 2.8) {
  throw new Error(`C2 스티커 앵커가 가로 접촉 시트가 아님: ${sourceMetadata.width}x${sourceMetadata.height}`);
}

await sharp(source)
  .trim({ background: { r: 0, g: 0, b: 0 }, threshold: 8 })
  .greyscale()
  .png()
  .toFile(anchor);

const metadata = await sharp(anchor).metadata();
const { data: pixels, info } = await sharp(anchor)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
let maxChannelDelta = 0;

for (let offset = 0; offset < pixels.length; offset += info.channels) {
  const red = pixels[offset];
  const green = pixels[offset + 1];
  const blue = pixels[offset + 2];
  maxChannelDelta = Math.max(maxChannelDelta, Math.abs(red - green), Math.abs(green - blue), Math.abs(red - blue));
}

if (maxChannelDelta > 2) {
  throw new Error(`C2 스티커 앵커가 흑백 제한을 벗어남: RGB 채널 최대 편차 ${maxChannelDelta}`);
}

const reviewWidth = Math.round(metadata.width * 0.25);
const reviewHeight = Math.round(metadata.height * 0.25);

await sharp(anchor)
  .resize(reviewWidth, reviewHeight, { kernel: sharp.kernel.lanczos3 })
  .png()
  .toFile(preview);

await sharp(anchor)
  .resize(reviewWidth, reviewHeight, { kernel: sharp.kernel.lanczos3 })
  .threshold(220)
  .png()
  .toFile(silhouette);

console.log(
  `C2 스티커 앵커 검토본 생성: ${metadata.width}x${metadata.height} · 25% ${reviewWidth}x${reviewHeight} · RGB 최대 편차 ${maxChannelDelta}`
);
