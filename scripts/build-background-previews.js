import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { PALETTE } from "../data/palette.js";

const PREVIEW_WIDTH = 1024;
const PREVIEW_HEIGHT = 360;
const moods = ["normal", "pit", "boss"];

await mkdir("references", { recursive: true });
const previews = [];
for (const mood of moods) {
  const layers = ["far", "mid", "near"].map((layer) => `assets/backgrounds/bg_${mood}_${layer}.png`);
  const full = await sharp(layers[0])
    .flatten({ background: PALETTE.environmentSky[0] })
    .composite(layers.slice(1).map((input) => ({ input })))
    .png()
    .toBuffer();
  const preview = await sharp(full)
    .resize(PREVIEW_WIDTH, PREVIEW_HEIGHT)
    .png({ compressionLevel: 9 })
    .toBuffer();
  const path = `references/background-${mood}-preview.png`;
  await sharp(preview).toFile(path);
  previews.push(preview);
}

await sharp({
  create: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT * previews.length,
    channels: 4,
    background: PALETTE.environmentNeutral[0]
  }
})
  .composite(previews.map((input, index) => ({ input, left: 0, top: index * PREVIEW_HEIGHT })))
  .png({ compressionLevel: 9 })
  .toFile("references/background-mood-contact-sheet.png");

console.log("배경 미리보기 생성: normal, pit, boss, contact sheet");
