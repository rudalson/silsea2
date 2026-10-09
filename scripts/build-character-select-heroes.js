import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { CHARACTER_LIST } from "../src/data/characters.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets/_source/character-select-heroes");
const output = join(root, "assets/ui");
const ids = CHARACTER_LIST.map(({ id }) => id);
const size = 512;
const artSize = 420;
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
await mkdir(output, { recursive: true });

const review = [];
for (const [index, id] of ids.entries()) {
  const { data, info } = await sharp(join(source, `${id}.png`)).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let i = 0; i < info.width * info.height; i++) {
    if (data[i * 4 + 3] < 16) continue;
    const x = i % info.width, y = Math.floor(i / info.width);
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < left) throw new Error(`${id}: 대표 원화가 비어 있습니다`);
  const art = await sharp(data, { raw: info })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize(artSize, artSize, { fit: "inside", kernel: sharp.kernel.lanczos3 })
    .png().toBuffer();
  const { width, height } = await sharp(art).metadata();
  const hero = await sharp({ create: { width: size, height: size, channels: 4, background: transparent } })
    .composite([{ input: art, left: Math.round((size - width) / 2), top: Math.round((size - height) / 2) }])
    .png().toBuffer();
  await writeFile(join(output, `character_select_hero_${id}.png`), hero);
  review.push({
    input: await sharp(hero).resize(256, 256).png().toBuffer(),
    left: (index % 4) * 256,
    top: Math.floor(index / 4) * 256
  });
}
await sharp({ create: { width: 1024, height: 512, channels: 4, background: "#d7eff1" } })
  .composite(review).png().toFile(join(root, "references/character-select-heroes.png"));
console.log(`캐릭터 선택용 고해상도 대표 원화 ${ids.length}개 생성 완료`);
