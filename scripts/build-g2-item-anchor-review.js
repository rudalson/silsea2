import sharp from "sharp";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const types = ["horn", "wings", "alicorn"];
const labels = ["HORN", "WINGS", "HORN + WINGS"];
const canvas = { width: 768, height: 256 };
const iconSize = 128;
const iconY = 50;

const sourcePath = (type) => fileURLToPath(new URL(`assets/items/item_${type}.png`, root));
const outputPath = (name) => fileURLToPath(new URL(`references/${name}`, root));

const iconBuffers = await Promise.all(types.map((type) => sharp(sourcePath(type))
  .resize(iconSize, iconSize, { fit: "contain", kernel: sharp.kernel.nearest })
  .png()
  .toBuffer()));

const labelSvg = Buffer.from(`<svg width="${canvas.width}" height="${canvas.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="20" fill="#fffef2"/>
  <path d="M256 24v208M512 24v208" stroke="#b8b0b8" stroke-width="2" stroke-dasharray="8 8"/>
  ${labels.map((label, index) => `<text x="${128 + index * 256}" y="220" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="20" fill="#29304a">${label}</text>`).join("")}
</svg>`);

const positions = types.map((_, index) => ({ left: 64 + index * 256, top: iconY }));
const composites = iconBuffers.map((input, index) => ({ input, ...positions[index] }));
const contactSheet = outputPath("g2-item-anchor-contact-sheet.png");
await sharp(labelSvg).composite(composites).png().toFile(contactSheet);

await sharp(contactSheet)
  .resize(Math.round(canvas.width * 0.25), Math.round(canvas.height * 0.25), { kernel: sharp.kernel.lanczos3 })
  .png()
  .toFile(outputPath("g2-item-anchor-25.png"));

const silhouetteBuffers = await Promise.all(types.map((type) => sharp(sourcePath(type))
  .resize(iconSize, iconSize, { fit: "contain", kernel: sharp.kernel.nearest })
  .tint("#000000")
  .png()
  .toBuffer()));
const silhouetteBase = {
  create: { width: canvas.width, height: 192, channels: 4, background: "#ffffff" }
};
const silhouetteSheet = await sharp(silhouetteBase)
  .composite(silhouetteBuffers.map((input, index) => ({ input, left: positions[index].left, top: 32 })))
  .png()
  .toBuffer();
await sharp(silhouetteSheet)
  .resize(192, 48, { kernel: sharp.kernel.lanczos3 })
  .threshold(210)
  .png()
  .toFile(outputPath("g2-item-anchor-silhouette-25.png"));

console.log("G2 아이템 앵커 생성: 768x256 · 25% 192x64 · 실루엣 192x48");
