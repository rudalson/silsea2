import sharp from "sharp";
import { PALETTE } from "../data/palette.js";

const colors = {
  outline: PALETTE.storybook.buttonShadow,
  paper: PALETTE.storybook.buttonInner,
  pink: PALETTE.collect[2],
  yellow: PALETTE.collect[0],
  blue: PALETTE.collect[1],
  green: PALETTE.environmentNear[0],
  violet: PALETTE.sylvia[10]
};
const rainbow = [PALETTE.danger[0], PALETTE.sunlight[2], colors.yellow, colors.green, colors.blue, colors.violet];
const definition = `<defs>
  <linearGradient id="paper" x2="0" y2="1"><stop stop-color="#FFFFFF"/><stop offset=".55" stop-color="${colors.paper}"/><stop offset="1" stop-color="#FFE9BD"/></linearGradient>
  <linearGradient id="button" x2="0" y2="1"><stop stop-color="#FFFDF1"/><stop offset="1" stop-color="#FFE3B2"/></linearGradient>
  <linearGradient id="buttonHover" x2="0" y2="1"><stop stop-color="#FFF6C6"/><stop offset="1" stop-color="#FFC98E"/></linearGradient>
</defs>`;

const sparkle = (x, y, size, color) => `<path d="M${x} ${y - size} Q${x + size * .18} ${y - size * .18} ${x + size} ${y} Q${x + size * .18} ${y + size * .18} ${x} ${y + size} Q${x - size * .18} ${y + size * .18} ${x - size} ${y} Q${x - size * .18} ${y - size * .18} ${x} ${y - size}Z" fill="${color}"/>`;

const rainbowTrim = (width, y) => rainbow.map((color, index) =>
  `<rect x="${18 + index * (width - 36) / rainbow.length}" y="${y}" width="${(width - 36) / rainbow.length + .5}" height="5" fill="${color}"/>`
).join("");

const panel = (width, height, accent, sideStars = false) => {
  const bodyHeight = height - 10;
  return `${definition}
    <rect x="5" y="7" width="${width - 10}" height="${bodyHeight}" rx="26" fill="${colors.outline}" opacity=".25"/>
    <rect x="3" y="2" width="${width - 6}" height="${bodyHeight}" rx="26" fill="url(#paper)" stroke="${colors.outline}" stroke-width="3"/>
    <rect x="8" y="7" width="${width - 16}" height="${bodyHeight - 10}" rx="20" fill="none" stroke="${accent}" stroke-width="3"/>
    <path d="M30 13 H${width - 30}" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity=".9"/>
    <svg x="8" y="${bodyHeight - 4}" width="${width - 16}" height="5" viewBox="8 ${bodyHeight - 4} ${width - 16} 5">${rainbowTrim(width, bodyHeight - 4)}</svg>
    ${sideStars ? `${sparkle(22, 32, 8, colors.yellow)}${sparkle(width - 22, 32, 8, colors.yellow)}` : ""}`;
};

const button = (hover = false) => `${definition}
  <rect x="5" y="7" width="202" height="36" rx="18" fill="${colors.outline}" opacity=".27"/>
  <rect x="3" y="2" width="206" height="36" rx="18" fill="url(#${hover ? "buttonHover" : "button"})" stroke="${colors.outline}" stroke-width="2.5"/>
  <rect x="8" y="7" width="196" height="26" rx="13" fill="none" stroke="${hover ? colors.pink : colors.yellow}" stroke-width="2"/>
  <path d="M22 8 H190" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity=".85"/>`;

const assets = [
  { name: "ui_game_hud_left", width: 394, height: 112, art: panel(394, 112, colors.pink) },
  { name: "ui_game_hud_center", width: 386, height: 96, art: panel(386, 96, colors.blue, true) },
  { name: "ui_game_hud_button", width: 212, height: 46, art: button() },
  { name: "ui_game_hud_button_hover", width: 212, height: 46, art: button(true) }
];

for (const { name, width, height, art } of assets) {
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width * 4}" height="${height * 4}" viewBox="0 0 ${width} ${height}">${art}</svg>`);
  await sharp(svg).resize(width, height, { kernel: "lanczos3" }).png().toFile(`assets/ui/${name}.png`);
}

console.log(`Built ${assets.length} storybook game HUD textures.`);
