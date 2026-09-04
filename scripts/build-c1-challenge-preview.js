import sharp from "sharp";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL(
  "../assets/_source/c1/c1_rainbow_relay_color_source_v1.png",
  import.meta.url
));
const output = fileURLToPath(new URL(
  "../assets/backgrounds/stage_preview_rainbow_relay.png",
  import.meta.url
));
const review = fileURLToPath(new URL(
  "../references/could1-challenge-preview-25.png",
  import.meta.url
));
const silhouette = fileURLToPath(new URL(
  "../references/could1-challenge-preview-silhouette-25.png",
  import.meta.url
));

const sourceMetadata = await sharp(source).metadata();
const sourceRatio = sourceMetadata.width / sourceMetadata.height;

if (Math.abs(sourceRatio - 16 / 9) > 0.01) {
  throw new Error(`C1 컬러 원본 비율이 16:9에서 벗어남: ${sourceMetadata.width}x${sourceMetadata.height}`);
}

await sharp(source)
  .resize(1280, 720, { fit: "cover", position: "centre", kernel: sharp.kernel.lanczos3 })
  .png({ compressionLevel: 9 })
  .toFile(output);

const { data: pixels, info } = await sharp(output)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
let colorfulPixels = 0;

for (let offset = 0; offset < pixels.length; offset += info.channels) {
  const red = pixels[offset];
  const green = pixels[offset + 1];
  const blue = pixels[offset + 2];
  if (Math.max(red, green, blue) - Math.min(red, green, blue) >= 24) colorfulPixels += 1;
}

const colorfulRatio = colorfulPixels / (info.width * info.height);
if (colorfulRatio < 0.4) {
  throw new Error(`C1 컬러 미리보기 채도 픽셀 비율이 너무 낮음: ${(colorfulRatio * 100).toFixed(1)}%`);
}

await sharp(output)
  .resize(320, 180, { kernel: sharp.kernel.lanczos3 })
  .png({ compressionLevel: 9 })
  .toFile(review);

await sharp(output)
  .resize(320, 180, { kernel: sharp.kernel.lanczos3 })
  .greyscale()
  .threshold(160)
  .png({ compressionLevel: 9 })
  .toFile(silhouette);

console.log(
  `C1 선택 카드 최종 미리보기 생성: 1280x720 · 축소 320x180 · 채도 픽셀 ${(colorfulRatio * 100).toFixed(1)}%`
);
