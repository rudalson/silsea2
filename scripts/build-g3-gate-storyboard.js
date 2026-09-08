import sharp from "sharp";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const gatePath = fileURLToPath(new URL("assets/items/rainbow_gate.png", root));
const outputPath = fileURLToPath(new URL("references/g3-gate-arrival-storyboard.png", root));
const previewPath = fileURLToPath(new URL("references/g3-gate-arrival-storyboard-25.png", root));
const width = 1024;
const height = 288;
const panelWidth = width / 4;
const labels = ["1  FLASH", "2  POP / EXPAND", "3  FALLING GLITTER", "4  STABLE SPARKLE"];

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const gate = await sharp(gatePath).resize(150, 180, { fit: "contain", background: transparent }).png().toBuffer();
const smallGate = await sharp(gatePath).resize(80, 96, { fit: "contain", background: transparent }).png().toBuffer();
const background = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="20" fill="#29304a"/>
  ${[1, 2, 3].map((index) => `<path d="M${index * panelWidth} 20v248" stroke="#fffef2" stroke-opacity=".28" stroke-width="2" stroke-dasharray="7 7"/>`).join("")}
  ${labels.map((label, index) => `<text x="${panelWidth * index + panelWidth / 2}" y="258" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#fffef2">${label}</text>`).join("")}
  <circle cx="128" cy="128" r="50" fill="#fffef2" fill-opacity=".92" stroke="#f5df4f" stroke-width="7"/>
  <circle cx="384" cy="128" r="88" fill="none" stroke="#fffef2" stroke-opacity=".55" stroke-width="8"/>
  ${Array.from({ length: 12 }, (_, index) => {
    const x = 570 + (index * 31) % 140;
    const y = 74 + (index % 4) * 34;
    const color = ["#f5df4f", "#93d9ff", "#ff9de2"][index % 3];
    return `<path d="M${x} ${y - 7}l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="${color}"/>`;
  }).join("")}
  ${[[842, 62], [930, 92], [820, 172], [944, 184]].map(([x, y]) => `<path d="M${x} ${y - 10}l3 7 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#fffef2" stroke="#93d9ff" stroke-width="2"/>`).join("")}
</svg>`);

await sharp(background).composite([
  { input: smallGate, left: 88, top: 80 },
  { input: gate, left: 309, top: 38 },
  { input: gate, left: 565, top: 38 },
  { input: gate, left: 821, top: 38 }
]).png().toFile(outputPath);

await sharp(outputPath)
  .resize(Math.round(width * 0.25), Math.round(height * 0.25), { kernel: sharp.kernel.lanczos3 })
  .png()
  .toFile(previewPath);

console.log("G3 무지개 게이트 스토리보드 생성: 1024x288 · 25% 256x72");
