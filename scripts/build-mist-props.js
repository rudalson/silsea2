import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const assets = [
  { source: "cloud-platform", key: "fx_mist_cloud_platform", width: 256, height: 80 },
  { source: "beacon", key: "fx_mist_beacon", width: 96, height: 192 },
  { source: "breeze", key: "fx_mist_breeze", width: 192, height: 96 }
];

export async function buildMistProps() {
  await mkdir(join(root, "assets/effects"), { recursive: true });
  for (const asset of assets) {
    const source = join(root, "assets/_source/mist-props", `${asset.source}.png`);
    const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let left = info.width, top = info.height, right = -1, bottom = -1;
    // Crop transparent export margins without flattening painted edges or glow.
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] < 8) continue;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
    if (right < left) throw new Error(`${source}: empty artwork`);
    const painted = await sharp(data, { raw: info })
      .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
      .resize(asset.width - 8, asset.height - 8, { fit: "inside" })
      .png().toBuffer();
    const size = await sharp(painted).metadata();
    await sharp({ create: { width: asset.width, height: asset.height, channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: painted, left: Math.floor((asset.width - size.width) / 2),
        top: asset.source === "beacon" ? asset.height - size.height - 4 : Math.floor((asset.height - size.height) / 2) }])
      .png({ compressionLevel: 9 }).toFile(join(root, "assets/effects", `${asset.key}.png`));
  }
  console.log("안개마을 원화 소품 3개 출력 완료 (full color / alpha)");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await buildMistProps();
