import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets/_source/wave-crab");
const output = join(root, "assets/enemies/wave_crab");
const frameSize = 128;
const baseline = 112;
const canvas = (width = frameSize, height = frameSize) => sharp({
  create: { width, height, channels: 4, background: "#00000000" }
});

async function cropPose(filename) {
  const { data, info } = await sharp(join(source, filename)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const offset = (y * info.width + x) * 4;
    if (data[offset + 3] <= 16) {
      data[offset + 3] = 0;
      continue;
    }
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < left) throw new Error(`${filename} has no visible crab`);
  return sharp(data, { raw: info }).extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .png().toBuffer();
}

const poses = {
  patrol: await cropPose("patrol.png"),
  warning: await cropPose("warning.png")
};

async function frame(pose, width, heightScale = 1, shiftX = 0, shiftY = 0) {
  const input = poses[pose];
  const info = await sharp(input).metadata();
  const height = Math.round(info.height * width / info.width * heightScale);
  const art = await sharp(input).resize(width, height, { kernel: sharp.kernel.lanczos3 }).png().toBuffer();
  return canvas().composite([{
    input: art,
    left: Math.round((frameSize - width) / 2) + shiftX,
    top: baseline - height + shiftY
  }]).png().toBuffer();
}

const sequences = {
  idle: [
    ["patrol", 104, 1, 0, 0], ["patrol", 103, 1, 0, -1]
  ],
  move: [
    ["patrol", 104, 1, 0, 0], ["patrol", 102, 1.03, -2, -1],
    ["patrol", 104, 1, 0, 0], ["patrol", 102, 1.03, 2, -1]
  ],
  warning: [
    ["warning", 104, 1, 0, 0], ["warning", 106, 1, 0, -1],
    ["warning", 104, 1, 0, 0], ["warning", 106, 1, 0, -1]
  ],
  attack: [
    ["warning", 104, 0.92, 0, 0], ["warning", 108, 0.86, -2, -1],
    ["warning", 108, 0.86, 2, -1], ["patrol", 104, 0.94, 0, 0]
  ],
  recover: [
    ["warning", 104, 0.94, 0, 0], ["patrol", 104, 0.94, 0, 0],
    ["patrol", 104, 1, 0, 0], ["patrol", 104, 1, 0, 0]
  ],
  defeated: [
    ["patrol", 104, 0.8, 0, 0], ["patrol", 104, 0.65, 0, 0],
    ["patrol", 104, 0.5, 0, 0], ["patrol", 104, 0.42, 0, 0]
  ]
};

await mkdir(output, { recursive: true });
for (const [sequence, specs] of Object.entries(sequences)) {
  const frames = await Promise.all(specs.map(spec => frame(...spec)));
  const directory = join(output, sequence);
  await mkdir(directory, { recursive: true });
  for (const [index, image] of frames.entries()) {
    await writeFile(join(directory, `wave_crab_${sequence}_${String(index).padStart(2, "0")}.png`), image);
  }
  const strip = await canvas(frameSize * frames.length, frameSize)
    .composite(frames.map((input, index) => ({ input, left: index * frameSize, top: 0 })))
    .png({ compressionLevel: 9 }).toBuffer();
  await writeFile(join(output, `wave_crab_${sequence}.png`), strip);
}
await copyFile(join(output, "idle/wave_crab_idle_00.png"), join(root, "assets/_anchor/wave_crab_anchor.png"));
console.log("파도 집게게: 22개 RGBA 프레임과 6개 스프라이트 시트 생성");
