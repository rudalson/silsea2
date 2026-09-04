import sharp from "sharp";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL(
  "../assets/_source/c1/c1_rainbow_relay_anchor_generated_v1.png",
  import.meta.url
));
const anchor = fileURLToPath(new URL("../references/could1-challenge-anchor.png", import.meta.url));
const preview = fileURLToPath(new URL("../references/could1-challenge-anchor-25.png", import.meta.url));
const silhouette = fileURLToPath(new URL(
  "../references/could1-challenge-anchor-silhouette-25.png",
  import.meta.url
));

const metadata = await sharp(source).metadata();
const sourceRatio = metadata.width / metadata.height;

if (Math.abs(sourceRatio - 16 / 9) > 0.01) {
  throw new Error(`C1 앵커 원본 비율이 16:9에서 벗어남: ${metadata.width}x${metadata.height}`);
}

await sharp(source)
  .resize(1536, 864, { fit: "cover", position: "centre", kernel: sharp.kernel.lanczos3 })
  .greyscale()
  .png()
  .toFile(anchor);

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
  throw new Error(`C1 앵커가 흑백 제한을 벗어남: RGB 채널 최대 편차 ${maxChannelDelta}`);
}

await sharp(anchor)
  .resize(384, 216, { kernel: sharp.kernel.lanczos3 })
  .png()
  .toFile(preview);

await sharp(anchor)
  .resize(384, 216, { kernel: sharp.kernel.lanczos3 })
  .threshold(220)
  .png()
  .toFile(silhouette);

console.log(`C1 선택 카드 앵커 검토본 생성: 1536x864 · 25% 384x216 · RGB 최대 편차 ${maxChannelDelta}`);
