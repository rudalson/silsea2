import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets/_source/merong-enemies");
const clear = { r: 0, g: 0, b: 0, alpha: 0 };
const canvas = (width = 128, height = 128) => sharp({ create: { width, height, channels: 4, background: clear } });
const definitions = {
  merong_sentry: { source: "sentry-poses.png", maxWidth: 104, maxHeight: 98,
    sequences: { idle: [0, 4], warning: [1, 5], attack: [2], recover: [3] } },
  merong_imp: { source: "imp-poses.png", maxWidth: 94, maxHeight: 82,
    // The seated pose's shoe extends beyond the nominal second grid column.
    lowerRowColumns: [0, 1 / 3, 0.684, 1],
    sequences: { idle: [0], move: [1, 2, 3, 2], defeated: [4, 5] } }
};
const manifestEntries = [], groups = {}, frameMetadata = {}, previewRows = [];

for (const [enemy, definition] of Object.entries(definitions)) {
  const inputPath = join(source, definition.source);
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const poses = [];
  for (let index = 0; index < 6; index++) {
    const columns = index >= 3 && definition.lowerRowColumns ? definition.lowerRowColumns : [0, 1 / 3, 2 / 3, 1];
    const cellLeft = Math.floor(columns[index % 3] * info.width), cellTop = Math.floor(Math.floor(index / 3) * info.height / 2);
    const cellRight = Math.floor(columns[index % 3 + 1] * info.width), cellBottom = Math.floor((Math.floor(index / 3) + 1) * info.height / 2);
    let left = cellRight, top = cellBottom, right = -1, bottom = -1;
    for (let y = cellTop; y < cellBottom; y++) for (let x = cellLeft; x < cellRight; x++) {
      if (data[(y * info.width + x) * 4 + 3] < 16) continue;
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
    if (right < left || bottom < top) throw new Error(`${enemy}: empty pose ${index}`);
    if (left <= cellLeft || top <= cellTop || right >= cellRight - 1 || bottom >= cellBottom - 1) {
      throw new Error(`${enemy}: pose ${index} touches its source cell edge`);
    }
    poses.push({ left, top, width: right - left + 1, height: bottom - top + 1 });
  }
  // One scale for the entire character preserves the authored proportions.
  const scale = Math.min(...poses.map(({ width, height }) => Math.min(definition.maxWidth / width, definition.maxHeight / height)));
  const frames = [];
  for (const pose of poses) {
    const width = Math.round(pose.width * scale), height = Math.round(pose.height * scale);
    const input = await sharp(inputPath).extract(pose).resize(width, height).png().toBuffer();
    frames.push(await canvas().composite([{ input, left: Math.round((128 - width) / 2), top: 112 - height }]).png().toBuffer());
  }
  frameMetadata[enemy] = { source: definition.source, poses, scale, frameSize: 128, baselineY: 112, sequences: definition.sequences };
  groups[enemy] = [];
  for (const [sequence, indices] of Object.entries(definition.sequences)) {
    const key = `${enemy}_${sequence}`, directory = join(root, "assets/enemies", enemy, sequence);
    await mkdir(directory, { recursive: true });
    for (const [index, pose] of indices.entries()) {
      await writeFile(join(directory, `${key}_${String(index).padStart(2, "0")}.png`), frames[pose]);
    }
    const strip = await canvas(indices.length * 128).composite(indices.map((pose, index) => ({ input: frames[pose], left: index * 128, top: 0 }))).png().toBuffer();
    await writeFile(join(root, "assets/enemies", enemy, `${key}.png`), strip);
    manifestEntries.push({ key, type: "spritesheet", url: `/assets/enemies/${enemy}/${key}.png`, frameWidth: 128, frameHeight: 128, frames: indices.length });
    groups[enemy].push(key);
    previewRows.push({ key, strip });
  }
}
await writeFile(join(source, "frames.json"), JSON.stringify(frameMetadata, null, 2) + "\n");
const manifestPath = join(root, "assets/manifest.json");
let manifestText = await readFile(manifestPath, "utf8");
const registered = new Set(JSON.parse(manifestText).assets.map(({ key }) => key));
const missing = manifestEntries.filter(({ key }) => !registered.has(key));
if (missing.length) {
  manifestText = manifestText.replace(/\s*\]\s*\}\s*$/, `,\n${missing.map(entry => `    ${JSON.stringify(entry)}`).join(",\n")}\n  ]\n}\n`);
  await writeFile(manifestPath, manifestText);
}
const mappingPath = join(root, "references/mapping.json");
let mappingText = await readFile(mappingPath, "utf8");
const mapping = JSON.parse(mappingText);
const notes = {
  merong_sentry: "내장 imagegen으로 생성한 메롱 왕국 민트색 문지기. 왕관·큰 입·부풀린 볼·공격·회복 표정. 원화와 프롬프트는 assets/_source/merong-enemies에 보존.",
  merong_imp: "내장 imagegen으로 생성한 분홍색 메롱 꼬마. 작은 뿔·광대 신발·짧은 혀, 원화 보행과 패배 포즈를 공통 배율·발 기준선으로 조립."
};
for (const [enemy, keys] of Object.entries(groups)) {
  if (!mapping.$delivery.manifestGroups[enemy]) {
    mappingText = mappingText.replace('"manifestGroups": {', `"manifestGroups": {\n      "${enemy}": ${JSON.stringify(keys)},`);
  }
  if (!mapping[enemy]) {
    mappingText = mappingText.trimEnd().slice(0, -1).trimEnd() + `,\n  "${enemy}": ${JSON.stringify({ styleRefs: ["silsea_sprite-Photoroom.png"], note: notes[enemy] })}\n}\n`;
  }
}
await writeFile(mappingPath, mappingText);
const width = 768, rowHeight = 142, height = previewRows.length * rowHeight + 60;
const background = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f9efdf"/><text x="24" y="36" font-family="sans-serif" font-size="23" font-weight="700" fill="#4c385c">MERONG KINGDOM</text>${previewRows.map(({ key }, i) => `<text x="20" y="${i * rowHeight + 100}" font-family="sans-serif" font-size="13" fill="#4c385c">${key.replace("merong_", "")}</text>`).join("")}</svg>`);
await sharp(background).composite(previewRows.map(({ strip }, index) => ({ input: strip, left: 192, top: index * rowHeight + 52 }))).png()
  .toFile(join(root, "references/merong-enemies-review.png"));
const portraits = [];
for (const [index, metadata] of Object.values(frameMetadata).entries()) {
  const input = await sharp(join(source, metadata.source)).extract(metadata.poses[0]).resize({ height: 246 }).png().toBuffer();
  const { width } = await sharp(input).metadata();
  portraits.push({ input, left: Math.round(index * 320 + (320 - width) / 2), top: 72 });
}
await sharp({ create: { width: 640, height: 350, channels: 4, background: { r: 249, g: 239, b: 223, alpha: 1 } } })
  .composite(portraits).png().toFile(join(root, "references/merong-enemies-preview.png"));
console.log("메롱 왕국 적 조립: 문지기 4상태 6프레임, 꼬마 3상태 7프레임 · manifest/mapping 등록");
