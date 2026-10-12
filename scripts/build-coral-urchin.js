import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets/_source/coral-urchin/coral_urchin.png");
const output = join(root, "assets/enemies/coral_urchin");
const frameSize = 128;
const baseline = 112;
const canvas = (width = frameSize) => sharp({
  create: { width, height: frameSize, channels: 4, background: "#00000000" }
});

const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let left = info.width, top = info.height, right = -1, bottom = -1;
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  const alpha = data[(y * info.width + x) * 4 + 3];
  if (alpha <= 16) continue;
  left = Math.min(left, x); right = Math.max(right, x);
  top = Math.min(top, y); bottom = Math.max(bottom, y);
}
if (right < left) throw new Error("coral_urchin.png has no visible creature");
const cropped = await sharp(data, { raw: info })
  .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
  .png().toBuffer();

async function frame(width, height, shiftY = 0) {
  const art = await sharp(cropped).resize(width, height, { kernel: sharp.kernel.lanczos3 }).png().toBuffer();
  return canvas().composite([{
    input: art,
    left: Math.round((frameSize - width) / 2),
    top: baseline - height + shiftY
  }]).png().toBuffer();
}

const sequences = {
  idle: [[108, 72, 0], [106, 70, 0]],
  warning: [[110, 78, 0], [112, 80, -1]]
};

await mkdir(output, { recursive: true });
for (const [sequence, sizes] of Object.entries(sequences)) {
  const frames = await Promise.all(sizes.map((size) => frame(...size)));
  const directory = join(output, sequence);
  await mkdir(directory, { recursive: true });
  for (const [index, image] of frames.entries()) {
    await writeFile(join(directory, `coral_urchin_${sequence}_${String(index).padStart(2, "0")}.png`), image);
  }
  const strip = await canvas(frameSize * frames.length)
    .composite(frames.map((input, index) => ({ input, left: index * frameSize, top: 0 })))
    .png({ compressionLevel: 9 }).toBuffer();
  await writeFile(join(output, `coral_urchin_${sequence}.png`), strip);
}
await copyFile(join(output, "idle/coral_urchin_idle_00.png"), join(root, "assets/_anchor/coral_urchin_anchor.png"));
console.log("산호 성게: 4개 RGBA 프레임과 2개 스프라이트 시트 생성");
