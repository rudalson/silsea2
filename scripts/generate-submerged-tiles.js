import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PALETTE } from "../data/palette.js";
import { hexToRgb } from "./image-utils.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceImage = join(root, "assets", "tiles", "grass_tileset.png");
const sourceAtlas = JSON.parse(await readFile(join(root, "assets", "tiles", "grass_tileset.json"), "utf8"));
const outputDirectory = join(root, "assets", "tiles");
const outputImage = join(outputDirectory, "submerged_village_tileset.png");
const outputJson = join(outputDirectory, "submerged_village_tileset.json");
const previewPath = join(root, "references", "submerged-tileset-preview.png");
const tileSize = 64;
const extrude = 2;
const columns = 4;
const rows = 4;
const cellSize = tileSize + extrude * 2;
const atlasWidth = columns * cellSize;
const atlasHeight = rows * cellSize;
const channels = 4;

const colorMap = new Map([
  [PALETTE.environmentNeutral[0], PALETTE.outline],
  [PALETTE.environmentNear[0], PALETTE.environmentNeutral[2]],
  [PALETTE.environmentMid[1], PALETTE.environmentNeutral[1]],
  [PALETTE.environmentFar[1], PALETTE.environmentFar[0]],
  [PALETTE.environmentNear[2], PALETTE.shadow[2]],
  [PALETTE.environmentNeutral[2], PALETTE.bgFar[1]]
].map(([from, to]) => [hexToRgb(from).join(","), hexToRgb(to)]));
const outline = hexToRgb(PALETTE.outline);
const roofLight = hexToRgb(PALETTE.environmentNeutral[2]);
const roofDark = hexToRgb(PALETTE.shadow[2]);
const wallLight = hexToRgb(PALETTE.environmentFar[0]);
const submerged = hexToRgb(PALETTE.bgFar[1]);
const caustic = hexToRgb(PALETTE.highlight[0]);

const setPixel = (buffer, width, x, y, rgb, alpha = 255) => {
  if (x < 0 || y < 0 || x >= width || y >= buffer.length / 4 / width) return;
  const offset = (y * width + x) * 4;
  buffer[offset] = rgb[0];
  buffer[offset + 1] = rgb[1];
  buffer[offset + 2] = rgb[2];
  buffer[offset + 3] = alpha;
};

const drawRoofShingles = (tile, variant) => {
  for (let y = 12; y < 54; y += 13) {
    for (let x = -8 + ((y / 13 + variant) % 2) * 10; x < 64; x += 20) {
      for (let px = 0; px < 14; px += 1) setPixel(tile, tileSize, x + px, y + Math.round(Math.sin(px / 13 * Math.PI) * 3), roofDark);
    }
  }
  for (let x = 6; x < 58; x += 1) setPixel(tile, tileSize, x, 8 + Math.round(Math.sin((x + variant) / 5)), roofLight);
};

const drawSubmergedWall = (tile, frameName, variant) => {
  // 창문은 variant 타일에만 두어 넓은 건물 벽이 창문 격자로 보이지 않게 한다.
  if (frameName === "dirt_variant") {
    const windowX = 22;
    for (let y = 23; y < 44; y += 1) {
      for (let x = windowX; x < windowX + 18; x += 1) {
        const border = x === windowX || x === windowX + 17 || y === 23 || y === 43 || x === windowX + 8;
        setPixel(tile, tileSize, x, y, border ? outline : submerged);
      }
    }
  }
  // 나머지는 잠긴 회벽의 이음매와 옅은 수중 빛무늬만 남긴다.
  const jointY = 38 + (variant % 3) * 3;
  for (let x = 4; x < 60; x += 1) {
    if ((x + variant) % 9 < 6) setPixel(tile, tileSize, x, jointY, wallLight);
  }
  for (let x = 8; x < 58; x += 1) {
    if ((x + variant) % 5 !== 0) setPixel(tile, tileSize, x, 10 + Math.round(Math.sin((x + variant) / 6)), caustic);
  }
};

const recolorTile = async (frameName, index) => {
  const frame = sourceAtlas.frames[frameName].frame;
  const { data } = await sharp(sourceImage)
    .extract({ left: frame.x, top: frame.y, width: tileSize, height: tileSize })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let offset = 0; offset < data.length; offset += 4) {
    const mapped = colorMap.get(`${data[offset]},${data[offset + 1]},${data[offset + 2]}`);
    if (!mapped) continue;
    data[offset] = mapped[0];
    data[offset + 1] = mapped[1];
    data[offset + 2] = mapped[2];
  }
  if (frameName.startsWith("dirt") || frameName.startsWith("cliff")) {
    const stoneLight = hexToRgb(PALETTE.environmentNeutral[1]);
    for (let offset = 0; offset < data.length; offset += 4) {
      if (data[offset] === roofDark[0] && data[offset + 1] === roofDark[1] && data[offset + 2] === roofDark[2]) {
        data[offset] = stoneLight[0];
        data[offset + 1] = stoneLight[1];
        data[offset + 2] = stoneLight[2];
      }
      if (data[offset] === roofLight[0] && data[offset + 1] === roofLight[1] && data[offset + 2] === roofLight[2]) {
        data[offset] = submerged[0];
        data[offset + 1] = submerged[1];
        data[offset + 2] = submerged[2];
      }
    }
  }
  if (frameName.startsWith("grass") || frameName.startsWith("platform") || frameName.startsWith("slope")) drawRoofShingles(data, index);
  if (frameName.startsWith("dirt") || frameName.startsWith("cliff")) drawSubmergedWall(data, frameName, index);
  return data;
};

const frameNames = Object.keys(sourceAtlas.frames);
const tiles = await Promise.all(frameNames.map(recolorTile));
const atlas = Buffer.alloc(atlasWidth * atlasHeight * channels);
const frames = {};
for (const [index, frameName] of frameNames.entries()) {
  const tile = tiles[index];
  const column = index % columns;
  const row = Math.floor(index / columns);
  const cellX = column * cellSize;
  const cellY = row * cellSize;
  for (let y = -extrude; y < tileSize + extrude; y += 1) {
    for (let x = -extrude; x < tileSize + extrude; x += 1) {
      const sourceX = Math.max(0, Math.min(tileSize - 1, x));
      const sourceY = Math.max(0, Math.min(tileSize - 1, y));
      const sourceOffset = (sourceY * tileSize + sourceX) * channels;
      const targetOffset = ((cellY + y + extrude) * atlasWidth + cellX + x + extrude) * channels;
      tile.copy(atlas, targetOffset, sourceOffset, sourceOffset + channels);
    }
  }
  frames[frameName] = { ...sourceAtlas.frames[frameName], frame: { x: cellX + extrude, y: cellY + extrude, w: tileSize, h: tileSize } };
}

const previewWidth = 768;
const previewHeight = 384;
const preview = Buffer.alloc(previewWidth * previewHeight * channels);
const water = hexToRgb(PALETTE.environmentNight[2]);
for (let index = 0; index < preview.length; index += 4) {
  preview[index] = water[0];
  preview[index + 1] = water[1];
  preview[index + 2] = water[2];
  preview[index + 3] = 255;
}
const tileMap = new Map(frameNames.map((name, index) => [name, tiles[index]]));
const blit = (name, x, y) => {
  const tile = tileMap.get(name);
  for (let py = 0; py < tileSize; py += 1) {
    for (let px = 0; px < tileSize; px += 1) {
      const sourceOffset = (py * tileSize + px) * 4;
      if (!tile[sourceOffset + 3]) continue;
      const targetOffset = ((y + py) * previewWidth + x + px) * 4;
      tile.copy(preview, targetOffset, sourceOffset, sourceOffset + 4);
    }
  }
};
for (let column = 0; column < 12; column += 1) blit(column === 0 ? "dirt_left" : column === 11 ? "dirt_right" : "dirt", column * tileSize, 320);
for (let column = 1; column < 6; column += 1) blit(column === 1 ? "grass_top_left" : column === 5 ? "grass_top_right" : "grass_top", column * tileSize, 64);
for (let row = 1; row < 4; row += 1) {
  for (let column = 1; column < 6; column += 1) blit(column === 1 ? "dirt_left" : column === 5 ? "dirt_right" : "dirt_variant", column * tileSize, 64 + row * tileSize);
}
for (let column = 8; column < 11; column += 1) blit(column === 8 ? "platform_left" : column === 10 ? "platform_right" : "platform_mid", column * tileSize, 168);

await mkdir(outputDirectory, { recursive: true });
await sharp(atlas, { raw: { width: atlasWidth, height: atlasHeight, channels } }).png({ compressionLevel: 9 }).toFile(outputImage);
await writeFile(outputJson, `${JSON.stringify({
  frames,
  meta: { ...sourceAtlas.meta, app: "silsea-code-generated-submerged-village-tiles", image: "submerged_village_tileset.png", size: { w: atlasWidth, h: atlasHeight } }
}, null, 2)}\n`);
await sharp(preview, { raw: { width: previewWidth, height: previewHeight, channels } }).png({ compressionLevel: 9 }).toFile(previewPath);

console.log(`submerged_village_tileset: ${frameNames.length} frames, ${tileSize}px, ${extrude}px extrude, ${atlasWidth}x${atlasHeight} atlas`);
