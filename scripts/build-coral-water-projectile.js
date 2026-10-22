import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets/_source/coral-urchin/coral_water_projectile.png");
const output = join(root, "assets/projectiles/projectile_coral_water.png");
const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

let left = info.width, top = info.height, right = -1, bottom = -1;
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  const alpha = data[(y * info.width + x) * 4 + 3];
  if (alpha <= 32) continue;
  left = Math.min(left, x); right = Math.max(right, x);
  top = Math.min(top, y); bottom = Math.max(bottom, y);
}
if (right < left) throw new Error("coral_water_projectile.png has no visible droplet");

const art = await sharp(data, { raw: info })
  .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
  .flop() // The runtime rotates a right-facing shot toward its target.
  .resize(72, 36, { fit: "contain", background: "#00000000", kernel: sharp.kernel.lanczos3 })
  .png().toBuffer();
const sprite = await sharp({
  create: { width: 80, height: 48, channels: 4, background: "#00000000" }
}).composite([{ input: art, left: 4, top: 6 }]).png({ compressionLevel: 9 }).toBuffer();

await mkdir(join(root, "assets/projectiles"), { recursive: true });
await writeFile(output, sprite);
console.log("산호 성게 물총: 80×48px 투명 탄환 스프라이트 생성");
