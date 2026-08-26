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
const outputImage = join(outputDirectory, "village_tileset.png");
const outputJson = join(outputDirectory, "village_tileset.json");
const previewPath = join(root, "references", "village-tileset-preview.png");
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
  [PALETTE.environmentNear[0], PALETTE.environmentFar[0]],
  [PALETTE.environmentMid[1], PALETTE.environmentNeutral[1]],
  [PALETTE.environmentFar[1], PALETTE.environmentFar[0]],
  [PALETTE.environmentNear[2], PALETTE.shadow[2]],
  [PALETTE.environmentNeutral[2], PALETTE.environmentNear[2]]
].map(([from, to]) => [hexToRgb(from).join(","), hexToRgb(to)]));
const mortarColor = hexToRgb(PALETTE.environmentNeutral[0]);
const wetHighlight = hexToRgb(PALETTE.collect[1]);

const setPixel = (buffer, width, x, y, rgb, alpha = 255) => {
  if (x < 0 || y < 0 || x >= width || y >= buffer.length / 4 / width) return;
  const offset = (y * width + x) * 4;
  buffer[offset] = rgb[0];
  buffer[offset + 1] = rgb[1];
  buffer[offset + 2] = rgb[2];
  buffer[offset + 3] = alpha;
};

const drawStoneJoints = (tile, variant) => {
  const y = 34 + (variant % 3) * 5;
  for (let x = 7; x < 58; x += 1) {
    if ((x + variant) % 9 < 7) setPixel(tile, tileSize, x, y, mortarColor);
  }
  const jointX = 18 + (variant % 3) * 13;
  for (let py = y; py < 59; py += 1) {
    if ((py + variant) % 7 !== 0) setPixel(tile, tileSize, jointX + Math.round(Math.sin(py / 5) * 2), py, mortarColor);
  }
};

const addWetEdge = (tile, variant) => {
  const start = variant % 2 === 0 ? 12 : 30;
  for (let x = start; x < Math.min(60, start + 22); x += 1) {
    const y = 10 + Math.round(Math.sin((x + variant) / 4));
    setPixel(tile, tileSize, x, y, wetHighlight);
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
  if (frameName.startsWith("dirt") || frameName.startsWith("cliff") || frameName.startsWith("platform")) drawStoneJoints(data, index);
  if (frameName.startsWith("grass") || frameName.startsWith("platform")) addWetEdge(data, index);
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
const sky = hexToRgb(PALETTE.environmentSky[1]);
for (let index = 0; index < preview.length; index += 4) {
  preview[index] = sky[0];
  preview[index + 1] = sky[1];
  preview[index + 2] = sky[2];
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
const drawGround = (startColumn, widthInTiles) => {
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < widthInTiles; column += 1) {
      const left = column === 0;
      const right = column === widthInTiles - 1;
      const name = row === 0
        ? left ? "grass_top_left" : right ? "grass_top_right" : "grass_top"
        : left ? "dirt_left" : right ? "dirt_right" : (column + row) % 3 === 0 ? "dirt_variant" : "dirt";
      blit(name, (startColumn + column) * tileSize, 192 + row * tileSize);
    }
  }
};
drawGround(0, 7);
drawGround(9, 3);
[[2, "platform_left"], [3, "platform_mid"], [4, "platform_right"]].forEach(([column, name]) => blit(name, column * tileSize, 64));
blit("slope_up", 5 * tileSize, 128);
blit("slope_down", 6 * tileSize, 128);

await mkdir(outputDirectory, { recursive: true });
await sharp(atlas, { raw: { width: atlasWidth, height: atlasHeight, channels } }).png({ compressionLevel: 9 }).toFile(outputImage);
await writeFile(outputJson, `${JSON.stringify({
  frames,
  meta: { ...sourceAtlas.meta, app: "silsea-code-generated-village-tiles", image: "village_tileset.png", size: { w: atlasWidth, h: atlasHeight } }
}, null, 2)}\n`);
await sharp(preview, { raw: { width: previewWidth, height: previewHeight, channels } }).png({ compressionLevel: 9 }).toFile(previewPath);

console.log(`village_tileset: ${frameNames.length} frames, ${tileSize}px, ${extrude}px extrude, ${atlasWidth}x${atlasHeight} atlas`);
