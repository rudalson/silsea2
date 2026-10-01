import sharp from "sharp";
import { PALETTE } from "../data/palette.js";

const colors = {
  dark: PALETTE.environmentNight[0],
  near: PALETTE.environmentNear[1],
  night: PALETTE.environmentNight[1],
  cream: PALETTE.environmentFar[0],
  gold: PALETTE.collect[0],
  aqua: PALETTE.collect[1]
};
const rainbow = [PALETTE.danger[0], PALETTE.sunlight[2], colors.gold, PALETTE.environmentNear[0], PALETTE.oceandream[5], PALETTE.sylvia[10]];
const definition = `<defs><linearGradient id="glass" x2="0" y2="1"><stop stop-color="${colors.near}" stop-opacity=".96"/><stop offset="1" stop-color="${colors.night}" stop-opacity=".94"/></linearGradient></defs>`;
const panel = (width, height, radius, stripe = false) => {
  const x = 3;
  const y = 2;
  const w = width - 6;
  const h = height - 9;
  const segments = rainbow.map((color, i) => `<rect x="${x + 18 + i * 32}" y="${height - 14}" width="27" height="3" rx="1.5" fill="${color}" opacity=".9"/>`).join("");
  return `${definition}
    <rect x="${x}" y="${y + 5}" width="${w}" height="${h}" rx="${radius}" fill="${colors.dark}" opacity=".26"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="url(#glass)" stroke="${colors.cream}" stroke-opacity=".75" stroke-width="1.6"/>
    <path d="M${x + radius} ${y + 1.5}H${x + w - radius}" stroke="${colors.cream}" stroke-opacity=".28" stroke-width="1.4" stroke-linecap="round"/>
    ${stripe ? segments : ""}`;
};

const assets = [
  { name: "ui_game_hud_left", width: 394, height: 112, art: panel(394, 112, 24, true) },
  { name: "ui_game_hud_center", width: 386, height: 96, art: panel(386, 96, 24, true) },
  { name: "ui_game_hud_button", width: 212, height: 46, art: panel(212, 46, 21) },
  { name: "ui_game_hud_button_hover", width: 212, height: 46, art: `${definition}<rect x="3" y="8" width="206" height="36" rx="18" fill="${colors.dark}" opacity=".3"/><rect x="3" y="2" width="206" height="36" rx="18" fill="${colors.night}" stroke="${colors.gold}" stroke-width="2"/>` }
];

for (const { name, width, height, art } of assets) {
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width * 4}" height="${height * 4}" viewBox="0 0 ${width} ${height}">${art}</svg>`);
  await sharp(svg).resize(width, height, { kernel: "lanczos3" }).png().toFile(`assets/ui/${name}.png`);
}

console.log(`Built ${assets.length} smooth game HUD textures.`);
