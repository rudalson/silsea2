import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));

export async function buildLanternLight() {
  const source = join(root, "assets/_source/mist-enemies/lantern-light.png");
  // Remove export margins while retaining the generated soft alpha and color.
  const painted = await sharp(source).trim({ threshold: 8, trimByAlpha: true })
    .resize(72, 40, { fit: "inside" }).png().toBuffer();
  const { width, height } = await sharp(painted).metadata();
  await mkdir(join(root, "assets/projectiles"), { recursive: true });
  await sharp({ create: { width: 80, height: 48, channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: painted, left: Math.floor((80 - width) / 2), top: Math.floor((48 - height) / 2) }])
    .png().toFile(join(root, "assets/projectiles/projectile_lantern_light.png"));
  console.log("등불 불빛 발사체 출력 완료: 80x48 RGBA");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await buildLanternLight();
