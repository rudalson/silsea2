import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import sharp from "sharp";
import { splitEnemyPoses } from "./lib/split-enemy-poses.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets/_source/merong-imp-attack");
const { poses, arts } = await splitEnemyPoses(join(source, "poses.png"), 3, 3);
// Match the existing imp's 82px height and 112px feet, using one shared scale.
const scale = Math.min(...poses.map(p => Math.min(104 / p.width, 82 / p.height)));
const entries = [], frames = [], roles = ["warning", "attack", "recover"];
for (const [index, pose] of poses.entries()) {
  const width = Math.round(pose.width * scale), height = Math.round(pose.height * scale);
  const art = await sharp(arts[index]).resize(width, height).png().toBuffer();
  const frame = await sharp({ create: { width: 128, height: 128, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: art, left: Math.round((128 - width) / 2), top: 112 - height }]).png().toBuffer();
  const key = `merong_imp_${roles[index]}`, directory = join(root, "assets/enemies/merong_imp", roles[index]);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, `${key}_00.png`), frame);
  await writeFile(join(root, "assets/enemies/merong_imp", `${key}.png`), frame);
  entries.push({ key, type: "spritesheet", url: `/assets/enemies/merong_imp/${key}.png`, frameWidth: 128, frameHeight: 128, frames: 1 });
  frames.push(frame);
}
await writeFile(join(source, "frames.json"), JSON.stringify({ source: "poses.png", poses, scale, frameSize: 128, baselineY: 112, roles }, null, 2) + "\n");
const manifestPath = join(root, "assets/manifest.json");
let manifest = await readFile(manifestPath, "utf8");
const registered = new Set(JSON.parse(manifest).assets.map(entry => entry.key));
const missing = entries.filter(entry => !registered.has(entry.key));
if (missing.length) {
  manifest = manifest.replace(/\s*\]\s*\}\s*$/, `,\n${missing.map(entry => `    ${JSON.stringify(entry)}`).join(",\n")}\n  ]\n}\n`);
  await writeFile(manifestPath, manifest);
}
const mappingPath = join(root, "references/mapping.json");
let mapping = await readFile(mappingPath, "utf8");
const keys = [...new Set([...JSON.parse(mapping).$delivery.manifestGroups.merong_imp, ...entries.map(entry => entry.key)])];
mapping = mapping.replace(/"merong_imp": \[[^\]]*\]/, `"merong_imp": ${JSON.stringify(keys)}`);
await writeFile(mappingPath, mapping);
const preview = await sharp({ create: { width: 384, height: 128, channels: 4, background: "#f9efdf" } })
  .composite(frames.map((input, index) => ({ input, left: index * 128, top: 0 }))).png().toBuffer();
await sharp(preview).resize(1152, 384, { kernel: "nearest" }).png().toFile(join(root, "references/merong-imp-attack-preview.png"));
console.log("메롱 꼬마: 볼 부풀리기·풍선 불기·장난 웃음 3포즈 조립·등록");
