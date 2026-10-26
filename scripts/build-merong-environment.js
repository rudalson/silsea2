import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets/_source/merong-environment");
const png = (directory, name) => join(root, "assets", directory, `${name}.png`);
const props = [
  { source: "planter", key: "decor_merong_planter", width: 192, height: 160 },
  { source: "lantern", key: "decor_merong_lantern", width: 96, height: 176 },
  { source: "palace", key: "decor_merong_palace", width: 384, height: 448 }
];
const digest = buffer => createHash("sha256").update(buffer).digest("hex").toUpperCase();

async function buildProp(spec) {
  const { data, info } = await sharp(join(source, `${spec.source}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] < 8) continue;
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  if (maxX < minX) throw Error(`${spec.source}: empty artwork`);
  const art = await sharp(data, { raw: info }).extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    .resize(spec.width - 8, spec.height - 8, { fit: "inside" }).png().toBuffer();
  const size = await sharp(art).metadata();
  await sharp({ create: { width: spec.width, height: spec.height, channels: 4, background: "#00000000" } })
    .composite([{ input: art, left: Math.floor((spec.width - size.width) / 2), top: spec.height - size.height - 4 }])
    .png().toFile(png("decorations", spec.key));
}

async function buildTiles() {
  const size = 64, extrude = 2, cell = size + extrude * 2, atlasSize = cell * 4;
  const { data: base } = await sharp(join(source, "stone.png")).resize(size, size).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Join the painted texture at its border; native cornices remain continuous.
  for (let y = 0; y < size; y++) for (let channel = 0; channel < 3; channel++) {
    const left = (y * size) * 4 + channel, right = (y * size + size - 1) * 4 + channel;
    const average = Math.round((base[left] + base[right]) / 2); base[left] = base[right] = average;
  }
  for (let x = 0; x < size; x++) for (let channel = 0; channel < 3; channel++) {
    const top = x * 4 + channel, bottom = ((size - 1) * size + x) * 4 + channel;
    const average = Math.round((base[top] + base[bottom]) / 2); base[top] = base[bottom] = average;
  }
  const original = JSON.parse(await readFile(join(root, "assets/tiles/rainbow_tileset.json"), "utf8"));
  const names = Object.keys(original.frames), tiles = new Map(), frames = {}, atlas = Buffer.alloc(atlasSize * atlasSize * 4);
  for (const [index, name] of names.entries()) {
    let tile = Buffer.from(base);
    if (name === "dirt_variant") tile = await sharp(tile, { raw: { width: size, height: size, channels: 4 } }).flop().raw().toBuffer();
    const top = name.startsWith("grass_") || name.startsWith("platform_") || name.startsWith("cliff_");
    const edge = name.endsWith("_left") ? "left" : name.endsWith("_right") ? "right" : null;
    const ornament = top ? '<path d="M0 15h64v8H0z" fill="#b88da4"/><path d="M0 16h64M0 24h64" stroke="#805c7d" stroke-width="2"/><path d="M8 16v3q4 6 8 0v-3m16 0v3q4 6 8 0v-3" fill="#f8d9b8" stroke="#d5a473"/>'
      + '<path d="M0 2h64v10H0z" fill="#f8e3bf"/><path d="M0 1h64M0 12h64" stroke="#805c7d" stroke-width="2"/><path d="M0 4h64" stroke="#fff4d9" stroke-width="2"/>' : "";
    const sides = edge ? `<path d="M${edge === "left" ? 1 : 63} 0v64" stroke="#805c7d" stroke-width="2"/>` : "";
    const trim = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">${ornament}${sides}</svg>`);
    tile = await sharp(tile, { raw: { width: size, height: size, channels: 4 } }).composite([{ input: trim }]).raw().toBuffer();
    if (name.startsWith("slope_")) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (y < (name === "slope_up" ? size - 1 - x : x)) tile[(y * size + x) * 4 + 3] = 0;
    }
    tiles.set(name, tile);
    const left = index % 4 * cell + extrude, topY = Math.floor(index / 4) * cell + extrude;
    for (let y = -extrude; y < size + extrude; y++) for (let x = -extrude; x < size + extrude; x++) {
      const offset = (Math.max(0, Math.min(63, y)) * size + Math.max(0, Math.min(63, x))) * 4;
      tile.copy(atlas, ((topY + y) * atlasSize + left + x) * 4, offset, offset + 4);
    }
    frames[name] = { frame: { x: left, y: topY, w: size, h: size }, rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: size, h: size }, sourceSize: { w: size, h: size } };
  }
  await sharp(atlas, { raw: { width: atlasSize, height: atlasSize, channels: 4 } }).png().toFile(png("tiles", "merong_tileset"));
  await writeFile(join(root, "assets/tiles/merong_tileset.json"), JSON.stringify({ frames, meta: { app: "silsea-merong-painted-masonry",
    image: "merong_tileset.png", format: "RGBA8888", size: { w: atlasSize, h: atlasSize }, scale: "1", tileSize: size, extrude,
    source: "assets/_source/merong-environment/stone.png", fullColor: true } }, null, 2) + "\n");
  const bridge = [];
  for (let column = 0; column < 4; column++) bridge.push({ input: await sharp(tiles.get(column === 0 ? "platform_left" : column === 3 ? "platform_right" : "platform_mid"),
    { raw: { width: size, height: size, channels: 4 } }).resize(64, 32).png().toBuffer(), left: column * 64, top: 0 });
  await sharp({ create: { width: 256, height: 32, channels: 4, background: "#00000000" } }).composite(bridge).png().toFile(png("decorations", "decor_merong_bridge"));
  return tiles;
}

export async function buildMerongEnvironment() {
  const specification = JSON.parse(await readFile(join(source, "prompts.json"), "utf8"));
  const farPath = png("backgrounds", "bg_merong_far"), farBefore = await readFile(farPath);
  if (digest(farBefore) !== specification.preserved.far) throw Error("The protected Merong far background changed");
  for (const directory of ["backgrounds", "decorations", "tiles"]) await mkdir(join(root, "assets", directory), { recursive: true });
  for (const layer of ["mid", "near"]) await sharp(join(source, `${layer}.png`)).resize(2048, 720, { fit: "fill" }).ensureAlpha()
    .png().toFile(png("backgrounds", `bg_merong_${layer}`));
  for (const spec of props) await buildProp(spec);
  const tiles = await buildTiles();
  const ground = [];
  for (let row = 0; row < 3; row++) for (let column = 0; column < 32; column++) ground.push({ input: await sharp(tiles.get(row === 0 ? "grass_top" : "dirt"),
    { raw: { width: 64, height: 64, channels: 4 } }).png().toBuffer(), left: column * 64, top: 576 + row * 64 });
  const floor = await sharp({ create: { width: 2048, height: 192, channels: 4, background: "#00000000" } })
    .composite(ground.map(item => ({ ...item, top: item.top - 576 }))).extract({ left: 0, top: 0, width: 2048, height: 144 }).png().toBuffer();
  const preview = await sharp(farBefore).composite([
    { input: png("backgrounds", "bg_merong_mid") }, { input: png("backgrounds", "bg_merong_near") }, { input: floor, left: 0, top: 576 }
  ]).png().toBuffer();
  await writeFile(join(root, "references/merong-environment-preview.png"), preview);
  await sharp(preview).resize(640, 360, { fit: "cover" }).png().toFile(png("backgrounds", "stage_preview_merong"));

  const entries = ["mid", "near"].map(layer => ({ key: `bg_merong_${layer}`, type: "image", url: `/assets/backgrounds/bg_merong_${layer}.png` }));
  for (const key of [...props.map(prop => prop.key), "decor_merong_bridge"]) entries.push({ key, type: "image", url: `/assets/decorations/${key}.png` });
  entries.push({ key: "merong_tileset", type: "atlas", url: "/assets/tiles/merong_tileset.png", atlasUrl: "/assets/tiles/merong_tileset.json", tileWidth: 64, tileHeight: 64, extrude: 2, frames: 16 });
  const manifestPath = join(root, "assets/manifest.json"), manifestText = await readFile(manifestPath, "utf8"), manifest = JSON.parse(manifestText);
  const missing = entries.filter(entry => !manifest.assets.some(asset => asset.key === entry.key));
  if (missing.length) await writeFile(manifestPath, manifestText.replace(/\s*\]\s*\}\s*$/, `,\n${missing.map(entry => `    ${JSON.stringify(entry)}`).join(",\n")}\n  ]\n}\n`));
  const mappingPath = join(root, "references/mapping.json"), mappingText = await readFile(mappingPath, "utf8"), mapping = JSON.parse(mappingText);
  const unmapped = entries.filter(entry => !mapping[entry.key]);
  if (unmapped.length) await writeFile(mappingPath, mappingText.trimEnd().slice(0, -1).trimEnd() + ",\n" + unmapped.map(entry =>
    `  ${JSON.stringify(entry.key)}: ${JSON.stringify({ styleRefs: ["maple_story_1.png"], note: "메롱왕국 전용 새 내장 image_gen 정원 원화. 분홍·보라 석조와 말린 잎·왕관 장식. 원화·프롬프트: assets/_source/merong-environment. 큰 배경 및 타 스테이지 에셋 보존." })}`).join(",\n") + "\n}\n");
  if (digest(await readFile(farPath)) !== digest(farBefore)) throw Error("Protected background changed during build");
  console.log("메롱 환경 조립: 중경·근경·석조 타일 16종·왕관 화분·등불·궁전 아치·다리·선택 미리보기 (원경 보존)");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await buildMerongEnvironment();
