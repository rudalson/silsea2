import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets/_source/pegasus-wing/folded-wing.png");
const destination = join(root, "assets/effects/fx_pegasus_folded_wing.png");
const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let left = info.width, top = info.height, right = 0, bottom = 0;
for (let pixel = 0; pixel < info.width * info.height; pixel++) {
  if (data[pixel * 4 + 3] < 16) continue;
  const x = pixel % info.width;
  const y = Math.floor(pixel / info.width);
  left = Math.min(left, x);
  top = Math.min(top, y);
  right = Math.max(right, x);
  bottom = Math.max(bottom, y);
}
if (left > right) throw new Error("접힌 날개 원화에 불투명 픽셀이 없습니다.");

const wing = await sharp(source)
  .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
  .resize(60, 42, { fit: "inside" })
  .png().toBuffer();
const dimensions = await sharp(wing).metadata();
await mkdir(join(root, "assets/effects"), { recursive: true });
await sharp({ create: { width: 64, height: 48, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: wing, left: Math.floor((64 - dimensions.width) / 2), top: Math.floor((48 - dimensions.height) / 2) }])
  .png().toFile(destination);
console.log("페가수스 접힌 날개 64×48px 생성");
