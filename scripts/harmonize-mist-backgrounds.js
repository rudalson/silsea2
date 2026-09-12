// Historical palette conversion only. Never overwrite the storybook refresh.
import { access, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { buildStorybookStagePreview } from "./build-storybook-stage-previews.js";
import { PALETTE } from "../data/palette.js";
import { hexToRgb } from "./image-utils.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceDirectory = join(root, "assets", "_source", "backgrounds");
const outputDirectory = join(root, "assets", "backgrounds");
const referenceDirectory = join(root, "references");
const outputs = {};

const storybookSource = join(root, "assets", "_source", "mist", "storybook", "bg_mist_far.png");
if (await access(storybookSource).then(() => true, () => false)) {
  throw new Error("동화풍 배경이 설치되어 있습니다. 과거 팔레트 보정 대신 npm run mist:assets를 실행하세요.");
}

const mappings = {
  far: [
    [PALETTE.environmentSky[1], PALETTE.environmentSky[0]],
    [PALETTE.highlight[1], PALETTE.environmentFar[1]],
    [PALETTE.environmentNeutral[1], PALETTE.environmentMid[0]]
  ],
  mid: [
    [PALETTE.highlight[1], PALETTE.environmentFar[1]],
    [PALETTE.environmentNeutral[1], PALETTE.environmentMid[0]],
    [PALETTE.shadow[0], PALETTE.environmentMid[1]],
    [PALETTE.outline, PALETTE.environmentNear[1]]
  ],
  near: [
    [PALETTE.environmentNeutral[0], PALETTE.environmentNear[1]],
    [PALETTE.highlight[1], PALETTE.environmentFar[1]],
    [PALETTE.outline, PALETTE.environmentNear[1]]
  ]
};

for (const layer of ["far", "mid", "near"]) {
  const input = join(sourceDirectory, `bg_mist_${layer}_original-v1.png`);
  const output = join(outputDirectory, `bg_mist_${layer}.png`);
  const replacements = new Map(mappings[layer].map(([from, to]) => [hexToRgb(from).join(","), hexToRgb(to)]));
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let changed = 0;

  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] === 0) continue;
    const key = `${data[offset]},${data[offset + 1]},${data[offset + 2]}`;
    const replacement = replacements.get(key);
    if (!replacement) continue;
    data[offset] = replacement[0];
    data[offset + 1] = replacement[1];
    data[offset + 2] = replacement[2];
    changed += 1;
  }

  await mkdir(dirname(output), { recursive: true });
  await sharp(data, { raw: info }).png({ compressionLevel: 9 }).toFile(output);
  outputs[layer] = output;
  console.log(`안개 배경 ${layer}: ${info.width}x${info.height}, ${changed.toLocaleString("ko-KR")}px 색상 조정`);
}

const composite = await sharp(outputs.far)
  .composite([{ input: outputs.mid }, { input: outputs.near }])
  .png()
  .toBuffer();
await mkdir(referenceDirectory, { recursive: true });
await sharp(composite).resize(1024, 360).png({ compressionLevel: 9 })
  .toFile(join(referenceDirectory, "background-mist-preview.png"));
await buildStorybookStagePreview("mist");
console.log("안개 배경 미리보기와 스테이지 선택 이미지 갱신");
