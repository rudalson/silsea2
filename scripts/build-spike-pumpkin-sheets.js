import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { nearestPaletteColor } from "./image-utils.js";

const sourcePath = fileURLToPath(new URL("../assets/_source/spike_pumpkin_spiked_orange_v2.png", import.meta.url));
const outputRoot = fileURLToPath(new URL("../assets/enemies/spike_pumpkin/", import.meta.url));
const anchorPath = fileURLToPath(new URL("../assets/_anchor/spike_pumpkin_anchor.png", import.meta.url));
const frameSize = 128;
const baseline = 16;

const quantize = async (buffer) => {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 16) continue;
    const color = nearestPaletteColor([data[index], data[index + 1], data[index + 2]]).rgb;
    data[index] = color[0];
    data[index + 1] = color[1];
    data[index + 2] = color[2];
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
};

const createFrame = async (width, height) => {
  const trimmed = await sharp(sourcePath).ensureAlpha().trim().png().toBuffer();
  const character = await sharp(trimmed).resize(width, height, { fit: "fill" }).png().toBuffer();
  const frame = await sharp({
    create: { width: frameSize, height: frameSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([{
    input: character,
    left: Math.round((frameSize - width) / 2),
    top: frameSize - baseline - height
  }]).png().toBuffer();
  return quantize(frame);
};

const writeFrames = async (sequence, sizes) => {
  const directory = `${outputRoot}${sequence}`;
  await mkdir(directory, { recursive: true });
  for (const [index, [width, height]] of sizes.entries()) {
    const frame = await createFrame(width, height);
    const name = `spike_pumpkin_${sequence}_${String(index).padStart(2, "0")}.png`;
    await sharp(frame).png().toFile(`${directory}/${name}`);
  }
};

await writeFrames("idle", [[108, 72], [108, 70]]);
await writeFrames("warning", [[108, 74], [108, 76]]);
await writeFrames("break", [[108, 72], [104, 64], [100, 56], [98, 48], [96, 40], [96, 35]]);
await mkdir(fileURLToPath(new URL("../assets/_anchor/", import.meta.url)), { recursive: true });
await sharp(await createFrame(108, 72)).png().toFile(anchorPath);

console.log("귀여운 주황 호박 프레임 10개와 앵커를 생성했습니다.");
