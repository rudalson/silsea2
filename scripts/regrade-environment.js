import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PALETTE } from "../data/palette.js";
import { hexToRgb } from "./image-utils.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const backgroundsDirectory = join(root, "assets", "backgrounds");
const replacements = new Map([
  ["#CDE5B9", PALETTE.environmentFar[0]],
  ["#BFC596", PALETTE.environmentFar[1]],
  ["#4DABA1", PALETTE.environmentMid[0]],
  ["#4691A2", PALETTE.environmentMid[1]],
  ["#4ECCA0", PALETTE.environmentNear[0]],
  ["#183D30", PALETTE.environmentNear[1]],
  ["#5D4326", PALETTE.environmentNear[2]],
  ["#42474E", PALETTE.environmentNeutral[0]],
  ["#9598A2", PALETTE.environmentNeutral[1]],
  ["#957242", PALETTE.environmentNeutral[2]]
].map(([source, target]) => [source, hexToRgb(target)]));

const toHex = (red, green, blue) => `#${[red, green, blue]
  .map((value) => value.toString(16).padStart(2, "0"))
  .join("")
  .toUpperCase()}`;

const files = (await readdir(backgroundsDirectory))
  .filter((file) => /^bg_(normal|pit|boss)_(far|mid|near)\.png$/.test(file))
  .sort();

if (files.length !== 9) {
  throw new Error(`환경 배경 9개가 필요하지만 ${files.length}개를 찾음`);
}

let totalChanged = 0;
for (const file of files) {
  const path = join(backgroundsDirectory, file);
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let changed = 0;
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] === 0) continue;
    const replacement = replacements.get(toHex(data[offset], data[offset + 1], data[offset + 2]));
    if (!replacement) continue;
    data[offset] = replacement[0];
    data[offset + 1] = replacement[1];
    data[offset + 2] = replacement[2];
    changed += 1;
  }
  await sharp(data, { raw: info }).png({ compressionLevel: 9 }).toFile(path);
  totalChanged += changed;
  console.log(`${file}: ${changed.toLocaleString("ko-KR")}px 환경색 보정`);
}

console.log(`환경 리그레이드 완료: 배경 ${files.length}개, ${totalChanged.toLocaleString("ko-KR")}px 변경`);
