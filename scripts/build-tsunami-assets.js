import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { buildTsunamiBackgroundLayer } from "./build-tsunami-backgrounds.js";
import { buildStorybookStagePreview } from "./build-storybook-stage-previews.js";
import { buildTsunamiProps } from "./build-tsunami-props.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const far = await buildTsunamiBackgroundLayer("bg_tsunami_far", "far");
const mid = await buildTsunamiBackgroundLayer("bg_tsunami_mid", "mid");
const near = await buildTsunamiBackgroundLayer("bg_tsunami_near", "near");
await buildTsunamiProps();
const composite = await sharp(far).composite([{ input: mid }, { input: near }]).png().toBuffer();
await sharp(composite).resize(1024, 360).png({ compressionLevel: 9 }).toFile(join(root, "references/background-tsunami-preview.png"));
await buildStorybookStagePreview("tsunami");
console.log("쓰나미 마을 배경 3·원화 소품 6종·선택 카드·검토 미리보기 출력 완료");
