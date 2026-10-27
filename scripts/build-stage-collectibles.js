import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import sharp from "sharp";
import { STAGE_COLLECTIBLES } from "../src/data/stageCollectibles.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets/_source/stage-collectibles");
const frames = {}, previews = [], entries = [];
for (const theme of STAGE_COLLECTIBLES) {
  const path = join(source, `${theme.key}.png`);
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] < 8) continue;
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  if (right < left || bottom < top || left === 0 || top === 0 || right === info.width - 1 || bottom === info.height - 1) {
    throw new Error(`${theme.key}: empty artwork or clipped silhouette`);
  }
  const crop = { left, top, width: right - left + 1, height: bottom - top + 1 };
  const art = await sharp(path).extract(crop).resize(72, 70, { fit: "inside" }).png().toBuffer();
  const { width, height } = await sharp(art).metadata();
  const frame = await sharp({ create: { width: 128, height: 128, channels: 4, background: "#00000000" } })
    .composite([{ input: art, left: Math.round((128 - width) / 2), top: Math.round((128 - height) / 2) }]).png().toBuffer();
  await writeFile(join(root, "assets/items", `${theme.key}.png`), frame);
  await writeFile(join(root, "assets/_anchor", `${theme.key}_anchor.png`), frame);
  frames[theme.key] = { source: `${theme.key}.png`, crop, width, height, frameSize: 128 };
  entries.push({ key: theme.key, type: "image", url: `/assets/items/${theme.key}.png` });
  previews.push(await sharp(frame).resize(256, 256).png().toBuffer());
}
await writeFile(join(source, "frames.json"), JSON.stringify(frames, null, 2) + "\n");
const manifestPath = join(root, "assets/manifest.json");
let manifestText = await readFile(manifestPath, "utf8");
const registered = new Set(JSON.parse(manifestText).assets.map(entry => entry.key));
const missing = entries.filter(entry => !registered.has(entry.key));
if (missing.length) {
  manifestText = manifestText.replace(/\s*\]\s*\}\s*$/, `,\n${missing.map(entry => `    ${JSON.stringify(entry)}`).join(",\n")}\n  ]\n}\n`);
  await writeFile(manifestPath, manifestText);
}
const mappingPath = join(root, "references/mapping.json");
let mappingText = await readFile(mappingPath, "utf8");
const mapping = JSON.parse(mappingText);
for (const theme of STAGE_COLLECTIBLES) if (!mapping[theme.key]) {
  const entry = { styleRefs: ["silsea_sprite-Photoroom.png"], note: `내장 image_gen으로 생성한 ${theme.name}. 기존 별의 렌더링 화풍을 참조한 스테이지 전용 수집물. 원본·프롬프트·128px 조립 정보는 assets/_source/stage-collectibles에 보존.` };
  mappingText = mappingText.trimEnd().slice(0, -1).trimEnd() + `,\n  "${theme.key}": ${JSON.stringify(entry)}\n}\n`;
}
await writeFile(mappingPath, mappingText);
const labels = ["MERONG", "TAPE CITY", "PIANO", "HOLE COURSE", "CLOUD COURSE"];
const backdrop = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="320"><rect width="100%" height="100%" fill="#fcf2df"/>${labels.map((label, i) => `<text x="${128 + i * 256}" y="290" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="middle" fill="#573d60">${label}</text>`).join("")}</svg>`);
await sharp(backdrop).composite(previews.map((input, i) => ({ input, left: i * 256, top: 0 }))).png().toFile(join(root, "references/stage-collectibles-preview.png"));
console.log("스테이지 수집물 5종: 비율 보존·128px 프레임·투명 알파·manifest/mapping 등록");
