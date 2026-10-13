import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets/_source/tsunami/shelter-shield/shelter_shield.png");
const output = join(root, "assets/effects/fx_shelter_shield.png");
const art = await sharp(source).trim({ threshold: 16 })
  .resize(184, 200, { fit: "contain", background: "#00000000", kernel: sharp.kernel.lanczos3 })
  .png().toBuffer();

await mkdir(dirname(output), { recursive: true });
await sharp({ create: { width: 192, height: 208, channels: 4, background: "#00000000" } })
  .composite([{ input: art, left: 4, top: 4 }])
  .png({ compressionLevel: 9 }).toFile(output);
console.log("대피소 보호막: 192×208px 투명 원화 스프라이트 생성");
