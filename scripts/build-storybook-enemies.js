import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets/_source/storybook-enemies");
const clear = { r: 0, g: 0, b: 0, alpha: 0 };
const canvas = (width = 128, height = 128) => sharp({ create: { width, height, channels: 4, background: clear } });

async function cropAlpha(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
    if (data[(y * info.width + x) * 4 + 3] < 16) continue;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < 0) throw new Error(`No visible subject in ${input}`);
  return sharp(input).extract({ left, top, width: right - left + 1, height: bottom - top + 1 }).png().toBuffer();
}

async function makeFrame(input, width, height, { angle = 0 } = {}) {
  let art = input;
  if (angle) art = await cropAlpha(await sharp(art).rotate(angle, { background: clear }).png().toBuffer());
  art = await sharp(art)
    .resize(width, height, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 0.55 })
    .png()
    .toBuffer();
  // Keep the established 16 px sprite baseline so Phaser's 112/128 origin
  // and the existing physics-body offsets stay unchanged.
  return canvas().composite([{ input: art, left: Math.round((128 - width) / 2), top: 112 - height }]).png().toBuffer();
}

const sourceArt = {
  cloudIdle: await cropAlpha(join(source, "dark-cloud-idle.png")),
  cloudAttack: await cropAlpha(join(source, "dark-cloud-attack.png")),
  magpieFly: await cropAlpha(join(source, "magpie-fly.png")),
  magpieStunned: await cropAlpha(join(source, "magpie-stunned.png"))
};

const definitions = {
  dark_cloud: {
    idle: [
      ["cloudIdle", 108, 70, { angle: -1 }], ["cloudIdle", 110, 72, {}],
      ["cloudIdle", 108, 70, { angle: 1 }], ["cloudIdle", 108, 71, {}]
    ],
    charge: [
      ["cloudAttack", 104, 82, { y: 62 }], ["cloudAttack", 108, 88, { y: 60 }],
      ["cloudAttack", 106, 86, { y: 61, angle: -1 }], ["cloudAttack", 110, 92, { y: 59, angle: 1 }]
    ],
    attack: [
      ["cloudAttack", 110, 94, { y: 62 }], ["cloudAttack", 104, 102, { y: 64 }],
      ["cloudIdle", 106, 68, { y: 60 }]
    ],
    defeated: [
      ["cloudIdle", 102, 66, { y: 63, angle: 5 }], ["cloudIdle", 92, 57, { y: 68, angle: 12 }],
      ["cloudIdle", 78, 47, { y: 72, angle: 22 }], ["cloudIdle", 64, 36, { y: 76, angle: 30 }]
    ]
  },
  magpie: {
    fly: [
      ["magpieFly", 108, 76, { y: 61, angle: -4 }], ["magpieFly", 110, 84, { y: 58, angle: -1 }],
      ["magpieFly", 108, 91, { y: 56, angle: 2 }], ["magpieFly", 108, 84, { y: 59, angle: 4 }],
      ["magpieFly", 110, 78, { y: 62, angle: 1 }], ["magpieFly", 108, 76, { y: 61, angle: -2 }]
    ],
    warning: [
      ["magpieFly", 108, 80, { y: 61, angle: -8 }], ["magpieFly", 112, 86, { y: 57, angle: 4 }],
      ["magpieFly", 108, 80, { y: 61, angle: -5 }]
    ],
    dive: [
      ["magpieFly", 98, 82, { y: 62, angle: 18 }], ["magpieFly", 82, 96, { y: 63, angle: 38 }],
      ["magpieFly", 60, 110, { y: 64, angle: 63 }], ["magpieFly", 74, 102, { y: 65, angle: 48 }]
    ],
    stunned: [
      ["magpieStunned", 78, 102, { y: 62, angle: -5 }], ["magpieStunned", 82, 106, { y: 60, angle: 5 }],
      ["magpieStunned", 78, 102, { y: 62, angle: -4 }], ["magpieStunned", 82, 106, { y: 60, angle: 4 }]
    ],
    defeated: [
      ["magpieStunned", 80, 96, { y: 64, angle: 18 }], ["magpieStunned", 88, 78, { y: 69, angle: 42 }],
      ["magpieStunned", 96, 54, { y: 75, angle: 72 }], ["magpieStunned", 102, 38, { y: 80, angle: 88 }]
    ]
  }
};

const previewRows = [];
for (const [enemy, sequences] of Object.entries(definitions)) {
  for (const [sequence, poses] of Object.entries(sequences)) {
    const frames = [];
    const directory = join(root, "assets/enemies", enemy, sequence);
    await mkdir(directory, { recursive: true });
    for (const [index, [sourceKey, width, height, options]] of poses.entries()) {
      const frame = await makeFrame(sourceArt[sourceKey], width, height, options);
      const filename = `${enemy}_${sequence}_${String(index).padStart(2, "0")}.png`;
      await sharp(frame).toFile(join(directory, filename));
      frames.push({ input: frame, left: index * 128, top: 0 });
    }
    const strip = await canvas(poses.length * 128, 128).composite(frames).png().toBuffer();
    await sharp(strip).toFile(join(root, "assets/enemies", enemy, `${enemy}_${sequence}.png`));
    previewRows.push({ strip });
  }
}

await copyFile(join(root, "assets/enemies/dark_cloud/idle/dark_cloud_idle_00.png"), join(root, "assets/_anchor/dark_cloud_anchor.png"));
await copyFile(join(root, "assets/enemies/magpie/fly/magpie_fly_00.png"), join(root, "assets/_anchor/magpie_anchor.png"));

const previewWidth = 768;
const previewHeight = previewRows.length * 144;
const previewBackground = Buffer.from(`<svg width="${previewWidth}" height="${previewHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="18" fill="#9fe8fa"/><text x="12" y="24" fill="#fff5d8" font-family="sans-serif" font-size="18" font-weight="700" stroke="#24465a" stroke-width="4" paint-order="stroke">storybook enemies</text></svg>`);
await sharp(previewBackground).composite(previewRows.map((row, index) => ({ input: row.strip, left: 128, top: index * 144 + 8 }))).png().toFile(join(root, "references/storybook-enemy-animation.png"));

console.log("Built 15 storybook dark-cloud frames and 21 storybook magpie frames with the existing manifest keys.");
