import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets/_source/cloud");
const { data, info } = await sharp(join(source, "cloud-poses.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const poses = [];
for (let index = 0; index < 6; index++) {
  const left = Math.floor(index % 3 * info.width / 3), top = Math.floor(Math.floor(index / 3) * info.height / 2);
  const right = Math.floor((index % 3 + 1) * info.width / 3), bottom = Math.floor((Math.floor(index / 3) + 1) * info.height / 2);
  let minX = right, minY = bottom, maxX = left, maxY = top;
  for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
    if (data[(y * info.width + x) * 4 + 3] < 16) continue;
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  poses.push({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 });
}
const scale = Math.min(...poses.map((pose) => Math.min(112 / pose.width, 88 / pose.height)));
const output = join(root, "assets/enemies/cloud_king");
const roles = ["idle", "warning", "attack", "vulnerable", "hurt", "defeated"];
const frames = [];
for (const [index, role] of roles.entries()) {
  const pose = poses[index], width = Math.round(pose.width * scale), height = Math.round(pose.height * scale);
  const input = await sharp(join(source, "cloud-poses.png")).extract(pose).resize(width, height).png().toBuffer();
  const frame = await sharp({ create: { width: 128, height: 128, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input, left: Math.round((128 - width) / 2), top: 112 - height }]).png().toBuffer();
  await mkdir(join(output, role), { recursive: true });
  await writeFile(join(output, role, `cloud_king_${role}_00.png`), frame);
  await writeFile(join(output, `cloud_king_${role}.png`), frame);
  frames.push(frame);
}
await writeFile(join(source, "frames.json"), JSON.stringify({ scale, poses, roles, frameSize: 128, baselineY: 112 }, null, 2) + "\n");
await sharp(join(source, "sky.png")).resize(2048, 720, { fit: "fill" }).ensureAlpha()
  .png().toFile(join(root, "assets/backgrounds/bg_cloud_far.png"));
await sharp(join(source, "sky.png")).resize(640, 360, { fit: "cover" }).ensureAlpha()
  .png().toFile(join(root, "assets/backgrounds/stage_preview_cloud.png"));
await mkdir(join(root, "references"), { recursive: true });
await sharp({ create: { width: 768, height: 128, channels: 4, background: { r: 246, g: 230, b: 234, alpha: 1 } } })
  .composite(frames.map((input, index) => ({ input, left: index * 128, top: 0 })))
  .png().toFile(join(root, "references/cloud-poses-review.png"));

const manifestPath = join(root, "assets/manifest.json");
let manifestText = await readFile(manifestPath, "utf8");
const manifest = JSON.parse(manifestText);
const entries = roles.map((role) => ({ key: `cloud_king_${role}`, type: "spritesheet", url: `/assets/enemies/cloud_king/cloud_king_${role}.png`, frameWidth: 128, frameHeight: 128, frames: 1 }));
entries.push({ key: "bg_cloud_far", type: "image", url: "/assets/backgrounds/bg_cloud_far.png" },
  { key: "stage_preview_cloud", type: "image", url: "/assets/backgrounds/stage_preview_cloud.png" });
const missing = entries.filter((entry) => !manifest.assets.some(({ key }) => key === entry.key));
if (missing.length) {
  manifestText = manifestText.replace(/\s*\]\s*\}\s*$/, `,\n${missing.map((entry) => `    ${JSON.stringify(entry)}`).join(",\n")}\n  ]\n}\n`);
  await writeFile(manifestPath, manifestText);
}
const mappingPath = join(root, "references/mapping.json");
let mappingText = await readFile(mappingPath, "utf8");
const mapping = JSON.parse(mappingText);
mapping.cloud_king = { styleRefs: ["silsea_sprite-Photoroom.png"], note: "사용자 구름 대왕 스케치의 울퉁불퉁한 구름 몸체·긴 팔다리를 유지한 내장 imagegen 원화. 6개 동작 포즈, 공통 배율·발 기준선으로 조립." };
mapping.$delivery.manifestGroups.cloud_king = roles.map((role) => `cloud_king_${role}`);
for (const key of ["bg_cloud_far", "stage_preview_cloud"]) mapping[key] = { styleRefs: ["maple_story_1.png"], note: "사용자 구름 코스 원안의 구름 성과 밝은 동화풍 마을. 원화·프롬프트는 assets/_source/cloud에 보존." };
if (!JSON.parse(mappingText).$delivery.manifestGroups.cloud_king) {
  mappingText = mappingText.replace('"manifestGroups": {', `"manifestGroups": {\n      "cloud_king": ${JSON.stringify(mapping.$delivery.manifestGroups.cloud_king)},`);
}
const newOwners = ["cloud_king", "bg_cloud_far", "stage_preview_cloud"].filter((key) => !JSON.parse(mappingText)[key]);
if (newOwners.length) mappingText = mappingText.trimEnd().slice(0, -1).trimEnd() + ",\n"
  + newOwners.map((key) => `  "${key}": ${JSON.stringify(mapping[key])}`).join(",\n") + "\n}\n";
await writeFile(mappingPath, mappingText);
console.log("구름 원화 조립: 보스 6포즈·나라 배경·선택 미리보기·manifest/mapping 등록");
