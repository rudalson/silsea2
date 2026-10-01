import sharp from "sharp";
import { PALETTE } from "../data/palette.js";

const size = 72;
const scale = 4;
const variants = [
  { name: "ui_stage_nav", fill: PALETTE.environmentNear[1], rim: PALETTE.highlight[0], rimOpacity: 0.82 },
  { name: "ui_stage_nav_hover", fill: PALETTE.environmentNight[2], rim: PALETTE.collect[0], rimOpacity: 1 }
];

for (const { name, fill, rim, rimOpacity } of variants) {
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size * scale}" height="${size * scale}" viewBox="0 0 ${size} ${size}">
    <circle cx="36" cy="39" r="29" fill="${PALETTE.environmentNight[0]}" opacity="0.27"/>
    <circle cx="36" cy="34" r="28" fill="${fill}" stroke="${rim}" stroke-opacity="${rimOpacity}" stroke-width="1.8"/>
    <path d="M44 34H28 M35 27L28 34L35 41" fill="none" stroke="${PALETTE.highlight[0]}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`);
  await sharp(svg).resize(size, size, { kernel: "lanczos3" }).png().toFile(`assets/ui/${name}.png`);
}

console.log(`Built ${variants.length} smooth stage navigation button textures.`);
