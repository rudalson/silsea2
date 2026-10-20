import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets/_source/breath-pearl/breath_pearl.png");
const output = join(root, "assets/items/item_breath_pearl.png");
const anchor = join(root, "assets/_anchor/item_breath_pearl_anchor.png");
const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let left = info.width;
let top = info.height;
let right = -1;
let bottom = -1;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] < 16) continue;
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
}
if (right < left) throw new Error("Breath pearl source has no visible pixels");
const art = await sharp(data, { raw: info })
  .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
  .resize(72, 72, { kernel: sharp.kernel.lanczos3 })
  .png().toBuffer();
await mkdir(join(root, "assets/items"), { recursive: true });
await sharp({ create: { width: 128, height: 128, channels: 4, background: "#00000000" } })
  .composite([{ input: art, left: 28, top: 28 }])
  .png({ compressionLevel: 9 })
  .toFile(output);
await copyFile(output, anchor);
console.log("Breath pearl: transparent 128x128 item with a 72x72 subject");
