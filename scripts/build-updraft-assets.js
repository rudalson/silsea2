import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceRoot = join(root, "assets", "_source", "updraft");
const outputRoot = join(root, "assets", "effects");

for (const spec of [
  { source: "fx_updraft_wind_generated_v2.png", output: "fx_updraft_wind.png", width: 1024, height: 1536 },
  { source: "fx_updraft_curl_generated_v1.png", output: "fx_updraft_curl.png", width: 256, height: 256 }
]) {
  const destination = join(outputRoot, spec.output);
  await mkdir(dirname(destination), { recursive: true });
  await sharp(join(sourceRoot, spec.source))
    .resize(spec.width, spec.height, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png({ compressionLevel: 9 })
    .toFile(destination);
  console.log(`${spec.output}: ${spec.width}x${spec.height}`);
}
