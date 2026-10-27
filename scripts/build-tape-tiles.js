import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets/_source/tape-tiles");
const specification = JSON.parse(await readFile(join(source, "prompts.json"), "utf8"));
const digest = buffer => createHash("sha256").update(buffer).digest("hex");
for (const [path, expected] of Object.entries(specification.preserved)) {
  if (digest(await readFile(join(root, path))) !== expected) throw Error(`${path}: protected source changed`);
}
const size = 64, padding = 2, cell = size + padding * 2, atlasSize = cell * 4;
function periodic(buffer) {
  const result = Buffer.from(buffer);
  // Fade eight pixels toward a shared boundary so the painted material joins
  // smoothly without an abrupt one-pixel color correction at every tile.
  for (const axis of [0, 1]) for (let cross = 0; cross < size; cross++) for (let channel = 0; channel < 3; channel++) {
    const offset = (edge, distance) => (axis === 0 ? cross * size + (edge ? 63 - distance : distance) : (edge ? 63 - distance : distance) * size + cross) * 4 + channel;
    const average = (result[offset(0, 0)] + result[offset(1, 0)]) / 2;
    for (let distance = 0; distance < 8; distance++) for (const edge of [0, 1]) {
      const i = offset(edge, distance), weight = (1 - distance / 8) ** 2;
      result[i] = Math.round(result[i] * (1 - weight) + average * weight);
    }
  }
  return result;
}
const paper = periodic(await sharp(join(source, "paper.png")).resize(size, size).ensureAlpha().raw().toBuffer());
const tape = periodic(await sharp(join(source, "tape.png")).resize(size, size).ensureAlpha().raw().toBuffer());
const original = JSON.parse(await readFile(join(root, "assets/tiles/rainbow_tileset.json"), "utf8"));
const frames = {}, tiles = new Map(), atlas = Buffer.alloc(atlasSize * atlasSize * 4);
const raw = { width: size, height: size, channels: 4 };
for (const [index, name] of Object.keys(original.frames).entries()) {
  let tile = Buffer.from(paper);
  if (name === "dirt_variant") {
    tile = await sharp(tile, { raw }).flop().raw().toBuffer();
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) for (let channel = 0; channel < 3; channel++) {
      const weight = Math.max(0, 1 - Math.min(y, 63 - y) / 8) ** 2, offset = (y * size + x) * 4 + channel;
      tile[offset] = Math.round(tile[offset] * (1 - weight) + paper[offset] * weight);
    }
  }
  const capped = /^(grass_|platform_|cliff_)/.test(name);
  if (capped) for (let y = 1; y < 14; y++) for (let x = 0; x < size; x++) {
    const from = (Math.floor((y - 1) / 13 * 64) * 64 + x) * 4;
    tape.copy(tile, (y * 64 + x) * 4, from, from + 4);
  }
  const side = name.endsWith("_left") ? 1 : name.endsWith("_right") ? 63 : null;
  const trim = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">${capped ? '<path d="M0 0.5h64M0 14.5h64" stroke="#977541"/><path d="M0 2h64" stroke="#fff2bf" stroke-width="2"/><path d="M0 16h64v5H0z" fill="#54b6a3"/><path d="M0 16h64" stroke="#b5e5ce"/><path d="M0 22h64" stroke="#377e78"/><path d="M0 24h64" stroke="#fff2cf"/>' : ""}${side === null ? "" : `<path d="M${side} 0v64" stroke="#a98655" stroke-width="2"/>`}</svg>`);
  tile = await sharp(tile, { raw }).composite([{ input: trim }]).raw().toBuffer();
  if (name.startsWith("slope_")) for (let x = 0; x < size; x++) {
    const surface = name === "slope_up" ? 63 - x : x;
    for (let y = 0; y < size; y++) {
      const to = (y * size + x) * 4;
      if (y < surface) tile[to + 3] = 0;
      else if (y < surface + 13) {
        const from = (Math.min(63, (y - surface) * 5) * size + x) * 4;
        tape.copy(tile, to, from, from + 4);
      }
    }
  }
  if (name.startsWith("grass_inner_")) for (let y = 0; y < 20; y++) for (let x = 0; x < 16; x++) {
    tile[(y * size + (name.endsWith("left") ? x : 63 - x)) * 4 + 3] = 0;
  }
  tiles.set(name, tile);
  const x = index % 4 * cell + padding, y = Math.floor(index / 4) * cell + padding;
  for (let py = -padding; py < size + padding; py++) for (let px = -padding; px < size + padding; px++) {
    const from = (Math.max(0, Math.min(63, py)) * size + Math.max(0, Math.min(63, px))) * 4;
    tile.copy(atlas, ((y + py) * atlasSize + x + px) * 4, from, from + 4);
  }
  frames[name] = { frame: { x, y, w: size, h: size }, rotated: false, trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: size, h: size }, sourceSize: { w: size, h: size } };
}
await sharp(atlas, { raw: { width: atlasSize, height: atlasSize, channels: 4 } }).png().toFile(join(root, "assets/tiles/tape_tileset.png"));
await writeFile(join(root, "assets/tiles/tape_tileset.json"), JSON.stringify({ frames, meta: { app: "silsea-tape-painted-paper",
  image: "tape_tileset.png", format: "RGBA8888", size: { w: atlasSize, h: atlasSize }, scale: "1", tileSize: size, extrude: padding,
  source: "assets/_source/tape-tiles", fullColor: true } }, null, 2) + "\n");
const floor = [];
for (let row = 0; row < 3; row++) for (let column = 0; column < 32; column++) {
  const input = await sharp(tiles.get(row === 0 ? "grass_top" : (column * 2 + row) % 5 === 0 ? "dirt_variant" : "dirt"), { raw }).png().toBuffer();
  floor.push({ input, left: column * size, top: row * size });
}
const strip = await sharp({ create: { width: 2048, height: 192, channels: 4, background: "#00000000" } }).composite(floor).png().toBuffer();
const preview = await sharp(join(root, "assets/backgrounds/bg_tape_far.png")).composite([{ input: await sharp(strip).extract({ left: 0, top: 0, width: 2048, height: 144 }).toBuffer(), left: 0, top: 576 }]).png().toBuffer();
await writeFile(join(root, "references/tape-environment-preview.png"), preview);
await sharp(preview).resize(640, 360).png().toFile(join(root, "assets/backgrounds/stage_preview_tape.png"));
await sharp(strip).resize(1024, 96).png().toFile(join(root, "references/tape-tileset-strip.png"));
const manifestPath = join(root, "assets/manifest.json"), manifestText = await readFile(manifestPath, "utf8");
if (!JSON.parse(manifestText).assets.some(entry => entry.key === "tape_tileset")) {
  const entry = { key: "tape_tileset", type: "atlas", url: "/assets/tiles/tape_tileset.png", atlasUrl: "/assets/tiles/tape_tileset.json", tileWidth: 64, tileHeight: 64, extrude: 2, frames: 16 };
  await writeFile(manifestPath, manifestText.replace(/\s*\]\s*\}\s*$/, `,\n    ${JSON.stringify(entry)}\n  ]\n}\n`));
}
const mappingPath = join(root, "references/mapping.json"), mappingText = await readFile(mappingPath, "utf8");
if (!JSON.parse(mappingText).tape_tileset) {
  const entry = { styleRefs: ["maple_story_1.png"], note: "테이프 도시 전용 내장 image_gen 금빛 테이프·크림색 종이층 타일. 16프레임·2px extrude. 원본과 프롬프트: assets/_source/tape-tiles. 기존 원경·공용 타일·충돌 배치 보존." };
  await writeFile(mappingPath, mappingText.trimEnd().slice(0, -1).trimEnd() + `,\n  "tape_tileset": ${JSON.stringify(entry)}\n}\n`);
}
console.log("테이프 도시 타일: 금빛 테이프·청록 띠·크림 종이층 16프레임 조립·등록");
