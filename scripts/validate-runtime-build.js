import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import manifest from "../assets/manifest.json" with { type: "json" };

const root = fileURLToPath(new URL("..", import.meta.url));
const distUrl = new URL("../dist/", import.meta.url);
const indexHtml = await readFile(new URL("index.html", distUrl), "utf8");
const runtimeUrls = new Set(
  manifest.assets.flatMap((entry) => [entry.url, entry.atlasUrl].filter(Boolean))
);

assert.ok(indexHtml.includes('type="module"'), "배포 index에 module 진입점이 없음");
assert.ok(!/https?:\/\//i.test(indexHtml), "배포 index에 외부 네트워크 URL이 있음");

const entryUrls = [...indexHtml.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
assert.ok(entryUrls.length >= 2, "배포 index의 JS/CSS 진입점을 찾지 못함");
for (const url of entryUrls) {
  assert.ok(url.startsWith("./"), `하위 경로 배포에 안전하지 않은 진입점: ${url}`);
}
const productionScripts = await Promise.all(
  entryUrls.filter((url) => url.endsWith(".js")).map((url) => readFile(new URL(url, distUrl), "utf8"))
);
const productionSource = productionScripts.join("\n");
assert.ok(!productionSource.includes("/@vite/client"), "프로덕션 번들에 Vite 개발 클라이언트가 포함됨");
assert.ok(!productionSource.includes("createHotContext"), "프로덕션 번들에 HMR 파일 감시 코드가 포함됨");

let totalBytes = 0;
for (const url of runtimeUrls) {
  assert.ok(url.startsWith("/assets/"), `외부 또는 비표준 런타임 에셋 URL: ${url}`);
  const target = new URL(url.slice(1), distUrl);
  const info = await stat(target);
  assert.ok(info.isFile() && info.size > 0, `배포 에셋이 없거나 비어 있음: ${url}`);
  totalBytes += info.size;
}

const source = await readFile(new URL("../src/systems/AssetManager.js", import.meta.url), "utf8");
assert.ok(source.includes("import.meta.env.BASE_URL"), "런타임 에셋 URL이 배포 base를 따르지 않음");
assert.ok(source.includes("document.baseURI"), "런타임 에셋 URL이 현재 문서 경로를 기준으로 하지 않음");

console.log(
  `Production runtime 검증 통과: ${runtimeUrls.size}개 로컬 이미지·오디오 `
  + `(${(totalBytes / 1024 / 1024).toFixed(2)} MiB), 상대 JS/CSS 진입점 ${entryUrls.length}개, 외부 URL 0개 · ${root}`
);
