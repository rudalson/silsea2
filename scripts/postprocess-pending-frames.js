import { readdir, access } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceDirectory = join(root, "assets", "characters", "_source");
const processor = join(root, "scripts", "postprocess-character-frame.js");
const files = (await readdir(sourceDirectory)).filter((name) => name.endsWith("_chroma.png")).sort();
const forcePrefix = process.argv.find((argument) => argument.startsWith("--force-prefix="))?.split("=")[1];
let processed = 0;

for (const filename of files) {
  const match = filename.match(/^(silsea|potato89)_(.+)_(\d{2})_chroma\.png$/);
  if (!match) continue;
  const [, character, sequence, frame] = match;
  const output = join(root, "assets", "characters", character, sequence, `${character}_${sequence}_${frame}.png`);
  if (!forcePrefix || !filename.startsWith(forcePrefix)) {
    try {
      await access(output);
      continue;
    } catch {
      // Missing output is the intended pending state.
    }
  }
  const result = spawnSync(process.execPath, [processor, join(sourceDirectory, filename), output], {
    cwd: root,
    encoding: "utf8"
  });
  process.stdout.write(result.stdout);
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
  processed += 1;
}

console.log(`신규 캐릭터 프레임 후처리 완료: ${processed}개`);
