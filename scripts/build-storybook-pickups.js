import { mkdir, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets/_source/storybook-pickups");
const clear = { r: 0, g: 0, b: 0, alpha: 0 };
const canvas = (width = 128, height = 128) => sharp({ create: { width, height, channels: 4, background: clear } });

// Crop by alpha, never by color: pale highlights and the original soft edges
// must survive. The generated source art is kept untouched for reproduction.
async function cropAlpha(input, requireMargins = false) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] < 16) continue;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < 0 || (requireMargins && (left === 0 || top === 0 || right === info.width - 1 || bottom === info.height - 1))) {
    throw new Error("Source must contain one subject with transparent margins");
  }
  return sharp(input).extract({ left, top, width: right - left + 1, height: bottom - top + 1 }).png().toBuffer();
}

async function frame(input, width, height, { grounded = false, angle = 0 } = {}) {
  let subject = input;
  if (angle) subject = await cropAlpha(await sharp(input).rotate(angle, { background: clear }).png().toBuffer());
  const resized = await sharp(subject).resize(width, height, { fit: "fill", kernel: sharp.kernel.lanczos3 }).png().toBuffer();
  return canvas().composite([{ input: resized, left: Math.floor((128 - width) / 2), top: grounded ? 112 - height : Math.floor((128 - height) / 2) }]).png().toBuffer();
}

await mkdir(join(root, "assets/items"), { recursive: true });
for (const [name, width, height] of [["star", 72, 70], ["horn", 48, 96]]) {
  const art = await cropAlpha(join(source, `${name}.png`), true);
  const output = join(root, "assets/items", `item_${name}.png`);
  await sharp(await frame(art, width, height)).toFile(output);
  await copyFile(output, join(root, "assets/_anchor", `item_${name}_anchor.png`));
}

const refreshedItems = [
  { source: "percent", outputs: [["percent_small", 68, 68], ["percent_large", 92, 92]] },
  { source: "wings", outputs: [["wings", 96, 62]] },
  { source: "checkpoint", outputs: [["checkpoint_flag", 82, 96]] }
];
const refreshedPreview = [];
for (const asset of refreshedItems) {
  const art = await cropAlpha(join(source, `${asset.source}.png`), true);
  for (const [name, width, height] of asset.outputs) {
    const output = join(root, "assets/items", `item_${name}.png`);
    const finalOutput = name === "checkpoint_flag"
      ? join(root, "assets/items/checkpoint_flag.png")
      : output;
    const rendered = await frame(art, width, height);
    await sharp(rendered).toFile(finalOutput);
    await copyFile(finalOutput, join(root, "assets/_anchor", `${name === "checkpoint_flag" ? "checkpoint_flag" : `item_${name}`}_anchor.png`));
    if (name !== "percent_small") refreshedPreview.push(rendered);
  }
}

const previewBackground = Buffer.from(`<svg width="${refreshedPreview.length * 192}" height="192" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="20" fill="#fff6d8"/>
</svg>`);
await sharp(previewBackground)
  .composite(refreshedPreview.map((input, index) => ({ input, left: index * 192 + 32, top: 16 })))
  .png()
  .toFile(join(root, "references/storybook-item-refresh.png"));

const potato = await cropAlpha(join(source, "potato.png"), true);
const defeated = await cropAlpha(join(source, "potato-defeated.png"), true);
// Retain the existing two / six / four-frame timing contract and 16px baseline.
// Small grounded rocking poses keep the face readable while the potato patrols.
const sequences = {
  idle: [[104, 86, 0], [106, 84, 0]],
  roll: [[104, 86, -8], [102, 88, -4], [104, 86, 0], [106, 84, 8], [104, 86, 4], [102, 88, 0]],
  defeated: [[104, 86, -8], [108, 76, -16], [110, 68, -24], [110, 66, -28]]
};
const strips = [];
for (const [sequence, poses] of Object.entries(sequences)) {
  const directory = join(root, "assets/enemies/raw_potato", sequence);
  await mkdir(directory, { recursive: true });
  const frames = [];
  for (const [index, [width, height, angle]] of poses.entries()) {
    const input = await frame(sequence === "defeated" ? defeated : potato, width, height, { grounded: true, angle });
    const name = `raw_potato_${sequence}_${String(index).padStart(2, "0")}.png`;
    await sharp(input).toFile(join(directory, name));
    frames.push({ input, left: index * 128, top: 0 });
  }
  const strip = await canvas(poses.length * 128, 128).composite(frames).png().toBuffer();
  await sharp(strip).toFile(join(root, "assets/enemies/raw_potato", `raw_potato_${sequence}.png`));
  strips.push({ input: strip, left: 0, top: strips.length * 144 });
}
await copyFile(join(root, "assets/enemies/raw_potato/idle/raw_potato_idle_00.png"), join(root, "assets/_anchor/raw_potato_anchor.png"));
await canvas(768, 416).composite(strips).png().toFile(join(root, "references/storybook-potato-animation.png"));
console.log("Built storybook horn, star, percent tokens, wings, checkpoint, and all 12 potato frames with original manifest keys and alpha.");
