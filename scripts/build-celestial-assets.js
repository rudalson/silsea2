import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PALETTE } from "../data/palette.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets/_source/celestial-animation");
const characterIds = process.argv.slice(2).length ? process.argv.slice(2) : ["sunlight", "moonlight"];
const size = 128;
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const canvas = (width = size, height = size) => sharp({ create: { width, height, channels: 4, background: transparent } });

// Connected silhouettes keep tails and feathers intact even when the original
// atlas extends across nominal grid boundaries. Ignore isolated matte specks.
async function readPoses(id, form, forcedScale = null) {
  const filename = form === "alicorn" ? `${id}-atlas.png` : `${id}-${form}-atlas.png`;
  const { data, info } = await sharp(join(source, filename)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const visited = new Uint8Array(info.width * info.height);
  const components = [];
  for (let start = 0; start < visited.length; start++) {
    if (visited[start] || data[start * 4 + 3] < 128) continue;
    const indices = [start];
    visited[start] = 1;
    let minX = info.width, minY = info.height, maxX = 0, maxY = 0;
    for (let q = 0; q < indices.length; q++) {
      const p = indices[q], x = p % info.width, y = Math.floor(p / info.width);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= info.width || ny >= info.height) continue;
        const n = ny * info.width + nx;
        if (visited[n] || data[n * 4 + 3] < 128) continue;
        visited[n] = 1;
        indices.push(n);
      }
    }
    if (indices.length > 3000) components.push({ minX, minY, maxX, maxY, indices });
  }
  if (components.length !== 16) throw new Error(`${id}: expected 16 poses, got ${components.length}`);
  components.sort((a, b) => (a.minY + a.maxY) - (b.minY + b.maxY));
  const sorted = [];
  for (let row = 0; row < 4; row++) sorted.push(...components.slice(row * 4, row * 4 + 4).sort((a, b) => a.minX - b.minX));
  const scale = forcedScale ?? Math.min(...sorted.map(c => Math.min(110 / (c.maxX - c.minX + 1), 104 / (c.maxY - c.minY + 1))));
  const poses = [];
  const palette = [...PALETTE[id], PALETTE.outline, PALETTE.highlight[0], ...PALETTE.base.slice(1, 3)]
    .map(hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)));
  const cache = new Map();
  for (const c of sorted) {
    const width = c.maxX - c.minX + 1, height = c.maxY - c.minY + 1;
    const raw = Buffer.alloc(width * height * 4);
    for (const p of c.indices) {
      const target = ((Math.floor(p / info.width) - c.minY) * width + p % info.width - c.minX) * 4;
      data.copy(raw, target, p * 4, p * 4 + 4);
    }
    const resized = await sharp(raw, { raw: { width, height, channels: 4 } })
      .resize(Math.round(width * scale), Math.round(height * scale)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let p = 0; p < resized.data.length; p += 4) {
      if (resized.data[p + 3] < 16) { resized.data.fill(0, p, p + 4); continue; }
      const rgb = [...resized.data.subarray(p, p + 3)];
      const key = rgb.join(",");
      if (!cache.has(key)) cache.set(key, palette.reduce((best, color) => {
        const distance = color.reduce((n, v, channel) => n + (v - rgb[channel]) ** 2, 0);
        return distance < best.distance ? { color, distance } : best;
      }, { distance: Infinity }).color);
      resized.data.set(cache.get(key), p);
    }
    const input = await sharp(resized.data, { raw: resized.info }).png().toBuffer();
    poses.push(await canvas().composite([{ input, left: Math.round((size - resized.info.width) / 2), top: 112 - resized.info.height }]).png().toBuffer());
  }
  return { poses, registrations: sorted.map(({ indices, ...bounds }) => bounds), scale };
}

const sequencePoses = {
  idle: [0, 0, 1, 0],
  run: [4, 4, 5, 5, 6, 6, 7, 7],
  jump_up: [8, 8], fall: [9, 9], land: [2, 0], hurt: [3, 3],
  fly: [10, 11, 12, 12, 11, 10],
  wing_guard: [11, 15, 15, 11],
  swim: [13, 13, 8, 8, 13, 13],
  victory: [0, 8, 14, 14, 14, 0],
  transform_unicorn: [0, 1, 8, 14, 14, 0],
  transform_pegasus: [0, 8, 10, 11, 12, 10],
  transform_alicorn: [0, 1, 8, 10, 11, 12, 14, 0]
};
const itemFormSequences = ["idle", "run", "jump_up", "fall", "land", "hurt", "fly", "swim", "victory"];
const transformForms = {
  transform_unicorn: ["base", "base", "unicorn", "unicorn", "unicorn", "unicorn"],
  transform_pegasus: ["base", "base", "pegasus", "pegasus", "pegasus", "pegasus"],
  transform_alicorn: ["base", "base", "unicorn", "pegasus", "alicorn", "alicorn", "alicorn", "alicorn"]
};

const manifestPath = join(root, "assets/manifest.json");
const originalManifest = await readFile(manifestPath, "utf8");
const manifest = JSON.parse(originalManifest);
const originalKeys = new Set(manifest.assets.map(asset => asset.key));
const mappingPath = join(root, "references/mapping.json");
const mapping = JSON.parse(await readFile(mappingPath, "utf8"));
const review = [];
const formReview = [];
for (const [row, id] of characterIds.entries()) {
  const forms = ["base", "unicorn", "pegasus", "alicorn"];
  const measurements = Object.fromEntries(await Promise.all(forms.map(async form => [form, await readPoses(id, form)])));
  const scale = Math.min(...Object.values(measurements).map(value => value.scale)) * 0.97;
  const posesByForm = Object.fromEntries(await Promise.all(forms.map(async form => [form, await readPoses(id, form, scale)])));
  const output = join(root, "assets/characters", id);
  await mkdir(output, { recursive: true });
  const keys = [];
  for (const form of forms) {
    for (const [sequence, indices] of Object.entries(sequencePoses)) {
      if (form !== "base" && !itemFormSequences.includes(sequence)) continue;
      const key = form === "base" ? `${id}_${sequence}` : `${id}_${form}_${sequence}`;
      keys.push(key);
      const frames = indices.map((index, i) => posesByForm[transformForms[sequence]?.[i] ?? form].poses[index]);
      if (form === "base") {
        await mkdir(join(output, sequence), { recursive: true });
        for (const [i, frame] of frames.entries()) await writeFile(join(output, sequence, `${key}_${String(i).padStart(2, "0")}.png`), frame);
      }
      await canvas(size * frames.length).composite(frames.map((input, i) => ({ input, left: i * size, top: 0 })))
        .png().toFile(join(output, `${key}.png`));
      const entry = { key, type: "spritesheet", url: `/assets/characters/${id}/${key}.png`, frameWidth: size, frameHeight: size, frames: frames.length };
      const existing = manifest.assets.findIndex(asset => asset.key === key);
      if (existing < 0) manifest.assets.push(entry); else manifest.assets[existing] = entry;
    }
  }
  await writeFile(join(root, `assets/_anchor/${id}_anchor.png`), posesByForm.base.poses[0]);
  await writeFile(join(source, `${id}-frames.json`), `${JSON.stringify({ scale, registrations: Object.fromEntries(Object.entries(posesByForm).map(([form, value]) => [form, value.registrations])), sequencePoses }, null, 2)}\n`);
  mapping.$delivery.manifestGroups[`${id}_motion`] = keys;
  mapping[`${id}_motion`] = {
    styleRefs: [`${id}-reference.jpg`],
    note: `${({ sunlight: "선라이트의 해", moonlight: "문라이트의 초승달", alora: "알로라의 오로라", oceandream: "오션드림의 바다", aurora: "알로라의 언니 오로라의 오로라" })[id]} 색과 분위기를 사용자 손그림에서 반영한 원화. 기본형에는 뿔과 날개가 없고 아이템 형태에만 추가된다. 네 형태의 동작 시트.`
  };
  for (let i = 0; i < 16; i++) review.push({ input: posesByForm.base.poses[i], left: (i % 8) * size, top: (row * 2 + Math.floor(i / 8)) * size });
  for (const [column, form] of forms.entries()) formReview.push({
    input: await sharp(posesByForm[form].poses[0]).resize(256, 256, { kernel: sharp.kernel.nearest }).png().toBuffer(),
    left: column * 256, top: row * 256
  });
}
const additions = manifest.assets.filter(asset => !originalKeys.has(asset.key));
if (additions.length) await writeFile(manifestPath, originalManifest.replace(/\s*\]\s*}\s*$/, `,\n${additions.map(entry => `    ${JSON.stringify(entry)}`).join(",\n")}\n  ]\n}\n`));
// Preserve the compact formatting of the existing mapping; append only new groups.
const originalMapping = await readFile(mappingPath, "utf8");
let updatedMapping = originalMapping;
for (const id of characterIds) {
  const key = `${id}_motion`;
  if (!JSON.parse(originalMapping)[key]) {
    updatedMapping = updatedMapping.replace('"manifestGroups": {', `"manifestGroups": {\n      "${key}": ${JSON.stringify(mapping.$delivery.manifestGroups[key])},`);
    updatedMapping = updatedMapping.replace('"$schemaVersion": 2,', `"$schemaVersion": 2,\n  "${key}": ${JSON.stringify(mapping[key])},`);
  } else {
    updatedMapping = updatedMapping.replace(new RegExp(`"${key}": \\[?[^\\n]+`, "g"), match => match.startsWith(`"${key}": [`)
      ? `"${key}": ${JSON.stringify(mapping.$delivery.manifestGroups[key])},`
      : `"${key}": ${JSON.stringify(mapping[key])},`);
  }
}
await writeFile(mappingPath, updatedMapping);
const reviewName = characterIds.join("-") === "sunlight-moonlight" ? "celestial-character" : characterIds.join("-");
await sharp({ create: { width: 1024, height: characterIds.length * 256, channels: 4, background: "#eeeaf4" } })
  .composite(review).png().toFile(join(root, `references/${reviewName}-poses.png`));
await sharp({ create: { width: 1024, height: characterIds.length * 256, channels: 4, background: "#eeeaf4" } })
  .composite(formReview).png().toFile(join(root, `references/${reviewName}-forms.png`));
console.log(`${characterIds.join("·")}: 4개 형태별 원화, ${characterIds.length * 40}개 런타임 시트 생성 완료`);
