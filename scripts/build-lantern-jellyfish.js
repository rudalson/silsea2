import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets/_source/lantern-jellyfish/lantern_jellyfish.png");
const output = join(root, "assets/enemies/lantern_jellyfish/lantern_jellyfish_idle.png");
const size = 128;
const margin = 8;

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
if (right < left) throw new Error("Lantern jellyfish source has no visible pixels");

const cropped = sharp(data, { raw: info }).extract({
  left,
  top,
  width: right - left + 1,
  height: bottom - top + 1
});
const art = await cropped.resize(size - margin * 2, size - margin * 2, {
  fit: "inside",
  kernel: sharp.kernel.lanczos3
}).png().toBuffer();
const { width, height } = await sharp(art).metadata();
const sprite = await sharp({
  create: { width: size, height: size, channels: 4, background: "#00000000" }
}).composite([{
  input: art,
  left: Math.round((size - width) / 2),
  top: Math.round((size - height) / 2)
}]).png({ compressionLevel: 9 }).toBuffer();

await mkdir(join(root, "assets/enemies/lantern_jellyfish"), { recursive: true });
await writeFile(output, sprite);
console.log(`Lantern jellyfish sprite: ${size}x${size} RGBA`);
