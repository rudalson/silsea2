import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Stage cards use dedicated storybook illustrations, independent of the
// quantized, seamless parallax layers used during gameplay.
export async function buildStorybookStagePreview(theme) {
  if (!["starlight", "mist", "tsunami", "submerged"].includes(theme)) throw new Error(`Unknown preview theme: ${theme}`);
  const source = fileURLToPath(new URL(`../assets/_source/stage-previews/${theme}-storybook.png`, import.meta.url));
  const output = fileURLToPath(new URL(`../assets/backgrounds/stage_preview_${theme}.png`, import.meta.url));
  await mkdir(dirname(output), { recursive: true });
  await sharp(source)
    .resize(1280, 720, { fit: "cover" })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(output);
}
