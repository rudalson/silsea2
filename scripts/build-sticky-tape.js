import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

// Keep the generated painting intact; only crop transparency, resize and slice.
const directory = "assets/effects";
await mkdir(directory, { recursive: true });
const source = await readFile("assets/_source/sticky-tape/original.png");
await sharp(source).trim({ threshold: 8 }).resize(380, 36, { fit: "fill" })
  .extend({ top: 2, bottom: 2, left: 2, right: 2, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png().toFile(`${directory}/fx_sticky_tape.png`);
const frames = Object.fromEntries([["left", 0, 64], ["body", 64, 256], ["right", 320, 64]].map(([name, x, w]) => [name, {
  frame: { x, y: 0, w, h: 40 }, rotated: false, trimmed: false,
  spriteSourceSize: { x: 0, y: 0, w, h: 40 }, sourceSize: { w, h: 40 }
}]));
await writeFile(`${directory}/fx_sticky_tape.json`, `${JSON.stringify({ frames,
  meta: { image: "fx_sticky_tape.png", size: { w: 384, h: 40 }, scale: "1", fullColor: true }
}, null, 2)}\n`);
console.log("Sticky tape painting: 384×40 transparent atlas, fixed 64px curled ends and stretchable adhesive center");
