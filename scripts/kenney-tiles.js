import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
export const KENNEY_PACK = "assets/kenney_new-platformer-pack-1.1";
export const KENNEY_TILESETS = Object.freeze({
  rainbow_tileset: "grass",
  starlight_tileset: "purple"
});
export const KENNEY_FRAME_SOURCES = Object.freeze({
  grass_top: "block_top",
  grass_top_left: "block_top_left",
  grass_top_right: "block_top_right",
  dirt: "block_center",
  dirt_variant: "block_center",
  dirt_left: "block_left",
  dirt_right: "block_right",
  grass_inner_left: "horizontal_overhang_left",
  grass_inner_right: "horizontal_overhang_right",
  cliff_left: "block_left",
  cliff_right: "block_right",
  platform_left: "horizontal_left",
  platform_mid: "horizontal_middle",
  platform_right: "horizontal_right",
  slope_up: "ramp_short_b",
  slope_down: "ramp_short_b"
});

export async function readKenneyTile(theme, frameName) {
  const sourceFile = `${KENNEY_PACK}/Sprites/Tiles/Default/terrain_${theme}_${KENNEY_FRAME_SOURCES[frameName]}.png`;
  let image = sharp(join(root, sourceFile));
  if (frameName === "slope_up") image = image.flop();
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== 64 || info.height !== 64) throw new Error(`Expected 64px source tile: ${sourceFile}`);
  return { data, sourceFile };
}

export async function buildKenneyTileset(key) {
  const theme = KENNEY_TILESETS[key];
  if (!theme) throw new Error(`Unknown Kenney tileset: ${key}`);
  const size = 64;
  const extrude = 2;
  const cell = size + extrude * 2;
  const atlasSize = cell * 4;
  const atlas = Buffer.alloc(atlasSize * atlasSize * 4);
  const frames = {};
  const tiles = new Map();
  for (const [index, name] of Object.keys(KENNEY_FRAME_SOURCES).entries()) {
    const { data, sourceFile } = await readKenneyTile(theme, name);
    tiles.set(name, data);
    const left = index % 4 * cell + extrude;
    const top = Math.floor(index / 4) * cell + extrude;
    // Duplicate border texels to prevent adjacent frames bleeding during scaling.
    for (let y = -extrude; y < size + extrude; y++) {
      for (let x = -extrude; x < size + extrude; x++) {
        const sourceOffset = (Math.max(0, Math.min(63, y)) * size + Math.max(0, Math.min(63, x))) * 4;
        data.copy(atlas, ((top + y) * atlasSize + left + x) * 4, sourceOffset, sourceOffset + 4);
      }
    }
    frames[name] = {
      frame: { x: left, y: top, w: size, h: size },
      rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: size, h: size },
      sourceSize: { w: size, h: size },
      sourceFile,
      ...(name === "slope_up" ? { sourceFlipX: true } : {})
    };
  }
  const output = join(root, "assets/tiles");
  await mkdir(output, { recursive: true });
  await sharp(atlas, { raw: { width: atlasSize, height: atlasSize, channels: 4 } }).png().toFile(join(output, `${key}.png`));
  await writeFile(join(output, `${key}.json`), JSON.stringify({ frames, meta: {
    app: "silsea-kenney-tile-import", version: "1.0", image: `${key}.png`,
    format: "RGBA8888", size: { w: atlasSize, h: atlasSize }, scale: "1", tileSize: size, extrude,
    source: { pack: "Kenney New Platformer Pack 1.1", directory: KENNEY_PACK, theme, license: "CC0-1.0" }
  } }, null, 2) + "\n");

  const layers = [];
  const place = (name, x, y) => layers.push({ input: tiles.get(name), raw: { width: size, height: size, channels: 4 }, left: x, top: y });
  for (const [start, width] of [[0, 7], [9, 3]]) {
    for (let row = 0; row < 3; row++) for (let column = 0; column < width; column++) {
      const edge = column === 0 ? "left" : column === width - 1 ? "right" : null;
      place(row === 0 ? edge ? `grass_top_${edge}` : "grass_top" : edge ? `dirt_${edge}` : "dirt", (start + column) * size, 192 + row * size);
    }
  }
  for (const [column, name] of [[2, "platform_left"], [3, "platform_mid"], [4, "platform_right"]]) place(name, column * size, 64);
  place("slope_up", 5 * size, 128);
  place("slope_down", 6 * size, 128);
  await sharp({ create: { width: 768, height: 384, channels: 4, background: theme === "grass" ? "#bce4ef" : "#57567d" } })
    .composite(layers).png().toFile(join(root, `references/${key.replace("_", "-")}-preview.png`));
  console.log(`${key}: Kenney ${theme}, 16 frames, 64px, 2px extrusion`);
}
