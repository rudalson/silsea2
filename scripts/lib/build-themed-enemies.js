import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { splitEnemyPoses } from "./split-enemy-poses.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const clear = { r: 0, g: 0, b: 0, alpha: 0 };
const canvas = (width = 128, height = 128) => sharp({ create: { width, height, channels: 4, background: clear } });

export async function buildThemedEnemies({ slug, title, types }) {
  const source = join(root, `assets/_source/${slug}-enemies`);
  const definitions = Object.fromEntries(types.map(type => [type, { source: `${type}-poses.png`, maxWidth: 104, maxHeight: 92 }]));
  const sequences = { idle: [0, 1], move: [2, 0, 3, 0], warning: [4], attack: [5], recover: [6], defeated: [7] };
  const entries = [], groups = {}, metadata = {}, reviewRows = [];

  for (const [type, definition] of Object.entries(definitions)) {
    const path = join(source, definition.source);
    const { poses, arts } = await splitEnemyPoses(path);
    const scale = Math.min(...poses.map(p => Math.min(definition.maxWidth / p.width, definition.maxHeight / p.height)));
    const frames = [];
    for (const [poseIndex, pose] of poses.entries()) {
      const width = Math.round(pose.width * scale), height = Math.round(pose.height * scale);
      const art = await sharp(arts[poseIndex]).resize(width, height).png().toBuffer();
      frames.push(await canvas().composite([{ input: art, left: Math.round((128 - width) / 2), top: 112 - height }]).png().toBuffer());
    }
    metadata[type] = { source: definition.source, poses, scale, frameSize: 128, baselineY: 112, sequences };
    groups[type] = [];
    for (const [sequence, indices] of Object.entries(sequences)) {
      const key = `${type}_${sequence}`, directory = join(root, "assets/enemies", type, sequence);
      await mkdir(directory, { recursive: true });
      for (const [index, pose] of indices.entries()) await writeFile(join(directory, `${key}_${String(index).padStart(2, "0")}.png`), frames[pose]);
      const strip = await canvas(indices.length * 128).composite(indices.map((pose, index) => ({ input: frames[pose], left: index * 128, top: 0 }))).png().toBuffer();
      await writeFile(join(root, "assets/enemies", type, `${key}.png`), strip);
      entries.push({ key, type: "spritesheet", url: `/assets/enemies/${type}/${key}.png`, frameWidth: 128, frameHeight: 128, frames: indices.length });
      groups[type].push(key); reviewRows.push({ key, strip });
    }
  }
  await writeFile(join(source, "frames.json"), JSON.stringify(metadata, null, 2) + "\n");
  const manifestPath = join(root, "assets/manifest.json");
  let manifestText = await readFile(manifestPath, "utf8");
  const registered = new Map(JSON.parse(manifestText).assets.map(entry => [entry.key, entry]));
  for (const entry of entries) {
    if (registered.has(entry.key) && JSON.stringify(registered.get(entry.key)) !== JSON.stringify(entry)) {
      throw new Error(`${entry.key}: existing manifest registration differs from the recipe`);
    }
  }
  const missing = entries.filter(({ key }) => !registered.has(key));
  if (missing.length) {
    manifestText = manifestText.replace(/\s*\]\s*\}\s*$/, `,\n${missing.map(entry => `    ${JSON.stringify(entry)}`).join(",\n")}\n  ]\n}\n`);
    await writeFile(manifestPath, manifestText);
  }
  const mappingPath = join(root, "references/mapping.json");
  let mappingText = await readFile(mappingPath, "utf8");
  const mapping = JSON.parse(mappingText);
  for (const [type, keys] of Object.entries(groups)) {
    if (!mapping.$delivery.manifestGroups[type]) mappingText = mappingText.replace('"manifestGroups": {', `"manifestGroups": {\n      "${type}": ${JSON.stringify(keys)},`);
    if (!mapping[type]) {
      const note = `내장 imagegen으로 생성한 ${title} 전용 적 ${type}. 8포즈 원화·프롬프트는 assets/_source/${slug}-enemies에 보존. 6상태 10프레임을 공통 배율·128px 프레임·112px 기준선으로 조립.`;
      mappingText = mappingText.trimEnd().slice(0, -1).trimEnd() + `,\n  "${type}": ${JSON.stringify({ styleRefs: ["silsea_sprite-Photoroom.png"], note })}\n}\n`;
    }
  }
  if (mappingText !== await readFile(mappingPath, "utf8")) await writeFile(mappingPath, mappingText);
  const width = 768, height = reviewRows.length * 142 + 60;
  const background = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eaf8f2"/><text x="24" y="36" font-family="sans-serif" font-size="23" font-weight="700" fill="#715132">${title}</text>${reviewRows.map(({ key }, i) => `<text x="18" y="${i * 142 + 100}" font-family="sans-serif" font-size="12" fill="#715132">${key}</text>`).join("")}</svg>`);
  await sharp(background).composite(reviewRows.map(({ strip }, index) => ({ input: strip, left: 192, top: index * 142 + 52 }))).png().toFile(join(root, `references/${slug}-enemies-review.png`));
  const portraits = [];
  for (const [index, definition] of Object.values(metadata).entries()) {
    const input = await sharp(join(source, definition.source)).extract(definition.poses[0]).resize({ height: 246 }).png().toBuffer();
    const { width: portraitWidth } = await sharp(input).metadata();
    portraits.push({ input, left: Math.round(index * 320 + (320 - portraitWidth) / 2), top: 64 });
  }
  await sharp({ create: { width: 640, height: 340, channels: 4, background: { r: 234, g: 248, b: 242, alpha: 1 } } })
    .composite(portraits).png().toFile(join(root, `references/${slug}-enemies-preview.png`));
  console.log(`${title}: ${types.length}종, 각 6상태 10프레임 조립·등록`);
}
