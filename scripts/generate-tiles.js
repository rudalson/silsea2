import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PALETTE } from "../data/palette.js";
import { hexToRgb } from "./image-utils.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const outputDirectory = join(root, "assets", "tiles");
const previewPath = join(root, "references", "grass-tileset-preview.png");
const tileSize = 64;
const extrude = 2;
const columns = 4;
const rows = 4;
const cellSize = tileSize + extrude * 2;
const atlasWidth = columns * cellSize;
const atlasHeight = rows * cellSize;
const channels = 4;

const rgba = (hex, alpha = 255) => [...hexToRgb(hex), alpha];
const COLORS = Object.freeze({
  transparent: [0, 0, 0, 0],
  outline: rgba(PALETTE.outline),
  grass: rgba(PALETTE.bgNear[0]),
  grassShadow: rgba(PALETTE.bgNear[1]),
  grassHighlight: rgba(PALETTE.highlight[1]),
  dirt: rgba(PALETTE.bgNear[2]),
  dirtHighlight: rgba(PALETTE.base[3]),
  sky: rgba(PALETTE.bgFar[0])
});

const createBuffer = (width, height, color = COLORS.transparent) => {
  const buffer = Buffer.alloc(width * height * channels);
  for (let offset = 0; offset < buffer.length; offset += channels) {
    buffer[offset] = color[0];
    buffer[offset + 1] = color[1];
    buffer[offset + 2] = color[2];
    buffer[offset + 3] = color[3];
  }
  return buffer;
};

const setPixel = (buffer, width, x, y, color) => {
  if (x < 0 || y < 0 || x >= width || y >= buffer.length / channels / width) return;
  const offset = (y * width + x) * channels;
  buffer[offset] = color[0];
  buffer[offset + 1] = color[1];
  buffer[offset + 2] = color[2];
  buffer[offset + 3] = color[3];
};

const fillRect = (buffer, width, x, y, rectangleWidth, rectangleHeight, color) => {
  for (let py = y; py < y + rectangleHeight; py += 1) {
    for (let px = x; px < x + rectangleWidth; px += 1) setPixel(buffer, width, px, py, color);
  }
};

const fillEllipse = (buffer, width, centerX, centerY, radiusX, radiusY, color) => {
  for (let y = centerY - radiusY; y <= centerY + radiusY; y += 1) {
    for (let x = centerX - radiusX; x <= centerX + radiusX; x += 1) {
      const distance = ((x - centerX) ** 2) / (radiusX ** 2) + ((y - centerY) ** 2) / (radiusY ** 2);
      if (distance <= 1) setPixel(buffer, width, x, y, color);
    }
  }
};

const paintSoil = (tile, variant = 0) => {
  fillRect(tile, tileSize, 0, 0, tileSize, tileSize, COLORS.dirt);
  const patterns = [
    [[18, 31, 8, 4], [45, 49, 7, 3]],
    [[16, 48, 7, 3], [44, 28, 9, 4]],
    [[20, 24, 6, 3], [43, 47, 8, 4]]
  ];
  for (const [x, y, rx, ry] of patterns[variant % patterns.length]) {
    fillEllipse(tile, tileSize, x, y, rx, ry, COLORS.dirtHighlight);
    fillRect(tile, tileSize, x - Math.max(1, rx - 2), y + ry, Math.max(2, (rx - 2) * 2), 2, COLORS.outline);
  }
};

const paintGrassTop = (tile) => {
  fillRect(tile, tileSize, 0, 0, tileSize, 4, COLORS.outline);
  fillRect(tile, tileSize, 0, 4, tileSize, 4, COLORS.grassHighlight);
  fillRect(tile, tileSize, 0, 8, tileSize, 10, COLORS.grass);
  fillRect(tile, tileSize, 7, 18, 6, 4, COLORS.grass);
  fillRect(tile, tileSize, 29, 18, 5, 3, COLORS.grass);
  fillRect(tile, tileSize, 50, 18, 7, 5, COLORS.grass);
  fillRect(tile, tileSize, 0, 18, tileSize, 2, COLORS.grassShadow);
};

const paintLeftEdge = (tile, grassy = false) => {
  fillRect(tile, tileSize, 0, 0, 4, tileSize, COLORS.outline);
  fillRect(tile, tileSize, 4, 4, grassy ? 6 : 3, tileSize - 8, grassy ? COLORS.grass : COLORS.dirtHighlight);
};

const paintRightEdge = (tile, grassy = false) => {
  fillRect(tile, tileSize, tileSize - 4, 0, 4, tileSize, COLORS.outline);
  fillRect(tile, tileSize, tileSize - (grassy ? 10 : 7), 4, grassy ? 6 : 3, tileSize - 8, grassy ? COLORS.grass : COLORS.dirtHighlight);
};

const soilTile = (variant = 0) => {
  const tile = createBuffer(tileSize, tileSize);
  paintSoil(tile, variant);
  return tile;
};

const topTile = (edge = null) => {
  const tile = soilTile();
  paintGrassTop(tile);
  if (edge === "left") paintLeftEdge(tile, true);
  if (edge === "right") paintRightEdge(tile, true);
  return tile;
};

const dirtEdgeTile = (edge, grassy = false) => {
  const tile = soilTile(edge === "left" ? 1 : 2);
  if (edge === "left") paintLeftEdge(tile, grassy);
  else paintRightEdge(tile, grassy);
  return tile;
};

const innerCornerTile = (side) => {
  const tile = topTile();
  const notchX = side === "left" ? 0 : tileSize - 18;
  fillRect(tile, tileSize, notchX, 0, 18, 22, COLORS.transparent);
  if (side === "left") {
    fillRect(tile, tileSize, 18, 0, 4, 22, COLORS.outline);
    fillRect(tile, tileSize, 22, 4, 5, 18, COLORS.grass);
  } else {
    fillRect(tile, tileSize, tileSize - 22, 0, 4, 22, COLORS.outline);
    fillRect(tile, tileSize, tileSize - 27, 4, 5, 18, COLORS.grass);
  }
  return tile;
};

const slopeTile = (direction) => {
  const tile = createBuffer(tileSize, tileSize);
  for (let x = 0; x < tileSize; x += 1) {
    const sampleX = direction === "up" ? x : tileSize - 1 - x;
    const surfaceY = Math.max(0, tileSize - 1 - sampleX);
    for (let y = surfaceY; y < tileSize; y += 1) {
      const distance = y - surfaceY;
      const color = distance < 3
        ? COLORS.outline
        : distance < 7
          ? COLORS.grassHighlight
          : distance < 14
            ? COLORS.grass
            : COLORS.dirt;
      setPixel(tile, tileSize, x, y, color);
    }
  }
  return tile;
};

const tileEntries = [
  ["grass_top", topTile()],
  ["grass_top_left", topTile("left")],
  ["grass_top_right", topTile("right")],
  ["dirt", soilTile()],
  ["dirt_variant", soilTile(1)],
  ["dirt_left", dirtEdgeTile("left")],
  ["dirt_right", dirtEdgeTile("right")],
  ["grass_inner_left", innerCornerTile("left")],
  ["grass_inner_right", innerCornerTile("right")],
  ["cliff_left", dirtEdgeTile("left", true)],
  ["cliff_right", dirtEdgeTile("right", true)],
  ["platform_left", topTile("left")],
  ["platform_mid", topTile()],
  ["platform_right", topTile("right")],
  ["slope_up", slopeTile("up")],
  ["slope_down", slopeTile("down")]
];

const atlas = createBuffer(atlasWidth, atlasHeight);
const frames = {};
for (const [index, [name, tile]] of tileEntries.entries()) {
  const column = index % columns;
  const row = Math.floor(index / columns);
  const cellX = column * cellSize;
  const cellY = row * cellSize;
  for (let y = -extrude; y < tileSize + extrude; y += 1) {
    for (let x = -extrude; x < tileSize + extrude; x += 1) {
      const sourceX = Math.max(0, Math.min(tileSize - 1, x));
      const sourceY = Math.max(0, Math.min(tileSize - 1, y));
      const sourceOffset = (sourceY * tileSize + sourceX) * channels;
      setPixel(atlas, atlasWidth, cellX + x + extrude, cellY + y + extrude, [
        tile[sourceOffset], tile[sourceOffset + 1], tile[sourceOffset + 2], tile[sourceOffset + 3]
      ]);
    }
  }
  frames[name] = {
    frame: { x: cellX + extrude, y: cellY + extrude, w: tileSize, h: tileSize },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: tileSize, h: tileSize },
    sourceSize: { w: tileSize, h: tileSize }
  };
}

const previewWidth = 768;
const previewHeight = 384;
const preview = createBuffer(previewWidth, previewHeight, COLORS.sky);
const entries = new Map(tileEntries);
const blit = (target, targetWidth, source, x, y) => {
  for (let py = 0; py < tileSize; py += 1) {
    for (let px = 0; px < tileSize; px += 1) {
      const sourceOffset = (py * tileSize + px) * channels;
      if (source[sourceOffset + 3] === 0) continue;
      setPixel(target, targetWidth, x + px, y + py, [
        source[sourceOffset], source[sourceOffset + 1], source[sourceOffset + 2], source[sourceOffset + 3]
      ]);
    }
  }
};

const drawGroundSegment = (startColumn, widthInTiles) => {
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < widthInTiles; column += 1) {
      const isLeft = column === 0;
      const isRight = column === widthInTiles - 1;
      const frame = row === 0
        ? isLeft ? "grass_top_left" : isRight ? "grass_top_right" : "grass_top"
        : isLeft ? "dirt_left" : isRight ? "dirt_right" : (column + row) % 3 === 0 ? "dirt_variant" : "dirt";
      blit(preview, previewWidth, entries.get(frame), (startColumn + column) * tileSize, 192 + row * tileSize);
    }
  }
};

drawGroundSegment(0, 7);
drawGroundSegment(9, 3);
for (const [column, frame] of [[2, "platform_left"], [3, "platform_mid"], [4, "platform_right"]]) {
  blit(preview, previewWidth, entries.get(frame), column * tileSize, 64);
}
blit(preview, previewWidth, entries.get("slope_up"), 5 * tileSize, 128);
blit(preview, previewWidth, entries.get("slope_down"), 6 * tileSize, 128);

await mkdir(outputDirectory, { recursive: true });
await sharp(atlas, { raw: { width: atlasWidth, height: atlasHeight, channels } })
  .png({ compressionLevel: 9 })
  .toFile(join(outputDirectory, "grass_tileset.png"));
await writeFile(join(outputDirectory, "grass_tileset.json"), `${JSON.stringify({
  frames,
  meta: {
    app: "silsea-code-generated-tiles",
    version: "1.0",
    image: "grass_tileset.png",
    format: "RGBA8888",
    size: { w: atlasWidth, h: atlasHeight },
    scale: "1",
    tileSize,
    extrude
  }
}, null, 2)}\n`);
await sharp(preview, { raw: { width: previewWidth, height: previewHeight, channels } })
  .png({ compressionLevel: 9 })
  .toFile(previewPath);

console.log(`grass_tileset: ${tileEntries.length} frames, ${tileSize}px, ${extrude}px extrude, ${atlasWidth}x${atlasHeight} atlas`);
