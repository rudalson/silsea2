import sharp from "sharp";

const source = "assets/ui/_source/fantasy_ui_decor.png";
const outputs = [
  { name: "ui_hud_frame", left: 128, top: 36, width: 1420, height: 514 },
  { name: "ui_hud_badge_star", left: 66, top: 566, width: 422, height: 330 },
  { name: "ui_hud_heart", left: 524, top: 580, width: 362, height: 308 },
  { name: "ui_hud_wings", left: 886, top: 550, width: 380, height: 350 },
  { name: "ui_hud_percent", left: 1270, top: 582, width: 374, height: 316 }
];

await Promise.all(outputs.map(async ({ name, ...extract }) => {
  await sharp(source).extract(extract).png().toFile(`assets/ui/${name}.png`);
}));

console.log(`Built ${outputs.length} UI decoration assets from ${source}.`);
