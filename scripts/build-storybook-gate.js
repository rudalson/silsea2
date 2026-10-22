import { fileURLToPath } from "node:url";
import sharp from "sharp";

const source = fileURLToPath(new URL("../assets/_source/storybook-gate/rainbow-gate.png", import.meta.url));
const output = fileURLToPath(new URL("../assets/items/rainbow_gate.png", import.meta.url));
const FRAME = 128;
const WIDTH = 112;
const HEIGHT = 104;

const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let left = info.width;
let top = info.height;
let right = -1;
let bottom = -1;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] <= 16) continue;
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
}
if (right < left || bottom < top) throw new Error("Rainbow gate source has no visible pixels");

const arch = await sharp(source)
  .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
  .resize(WIDTH, HEIGHT, { fit: "fill" })
  .png()
  .toBuffer();
await sharp({
  create: { width: FRAME, height: FRAME, channels: 4, background: "#00000000" }
})
  .composite([{ input: arch, left: (FRAME - WIDTH) / 2, top: (FRAME - HEIGHT) / 2 }])
  .png({ compressionLevel: 9 })
  .toFile(output);

const { data: pixels } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (const [x, y] of [[64, 64], [64, 96], [64, 116]]) {
  if (pixels[(y * FRAME + x) * 4 + 3] > 8) throw new Error(`Gate opening is blocked at ${x}, ${y}`);
}
console.log("동화풍 무지개 문 생성: 128x128 투명 프레임, 112x104 실루엣");
