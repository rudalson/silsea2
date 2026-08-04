import { access, readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const assetsRoot = resolve(root, "assets");
const errors = [];
const fail = (message) => errors.push(message);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const toAssetUrl = (path) => `/${relative(root, path).split(sep).join("/")}`;

const mapping = JSON.parse(await readFile(join(root, "references", "mapping.json"), "utf8"));
const manifest = JSON.parse(await readFile(join(root, "assets", "manifest.json"), "utf8"));
const delivery = mapping.$delivery ?? {};
const mappingEntries = Object.entries(mapping).filter(([key]) => !key.startsWith("$"));
const mappingKeys = new Set(mappingEntries.map(([key]) => key));
const manifestEntries = Array.isArray(manifest.assets) ? manifest.assets : [];
const visualEntries = manifestEntries.filter((entry) => entry.type !== "audio");
const visualByKey = new Map(visualEntries.map((entry) => [entry.key, entry]));
const manifestGroups = delivery.manifestGroups ?? {};
const codeEntries = delivery.code ?? {};
const plannedEntries = Array.isArray(delivery.planned) ? delivery.planned : [];
const plannedSet = new Set(plannedEntries);

if (mapping.$schemaVersion !== 2) fail("mapping.json: $schemaVersion이 2가 아님");
if (!Array.isArray(manifest.assets)) fail("manifest.json: assets 배열 없음");

const duplicateValues = (values) => [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
for (const key of duplicateValues(manifestEntries.map((entry) => entry.key))) fail(`manifest.json: 중복 키 ${key}`);
for (const key of duplicateValues(plannedEntries)) fail(`mapping.json: planned 중복 키 ${key}`);

const claims = new Map();
const claimManifestKey = (manifestKey, owner) => {
  if (!visualByKey.has(manifestKey)) {
    fail(`mapping.json: ${owner}가 존재하지 않는 시각 manifest 키 ${manifestKey}를 참조함`);
    return;
  }
  const previous = claims.get(manifestKey);
  if (previous) fail(`mapping.json: manifest 키 ${manifestKey}가 ${previous}, ${owner}에 중복 연결됨`);
  else claims.set(manifestKey, owner);
};

for (const [key, spec] of mappingEntries) {
  if (!Array.isArray(spec.styleRefs) || spec.styleRefs.length === 0) fail(`mapping.json: ${key} styleRefs 없음`);
  if (typeof spec.note !== "string" || spec.note.trim() === "") fail(`mapping.json: ${key} note 없음`);
  for (const styleRef of spec.styleRefs ?? []) {
    try {
      await access(join(root, "references", "images", styleRef));
    } catch {
      fail(`mapping.json: ${key} styleRef 파일 없음 (${styleRef})`);
    }
  }

  const directManifest = visualByKey.has(key);
  const groupedManifest = hasOwn(manifestGroups, key);
  const codeGenerated = hasOwn(codeEntries, key);
  const planned = plannedSet.has(key);
  const deliveryCount = [directManifest, groupedManifest, codeGenerated, planned].filter(Boolean).length;
  if (deliveryCount !== 1) {
    fail(`mapping.json: ${key} 전달 방식이 ${deliveryCount}개임 (manifest/code/planned 중 정확히 하나 필요)`);
    continue;
  }

  if (directManifest) claimManifestKey(key, key);
  if (groupedManifest) {
    const targets = manifestGroups[key];
    if (!Array.isArray(targets) || targets.length === 0) fail(`mapping.json: ${key} manifestGroups가 비어 있음`);
    for (const target of targets ?? []) claimManifestKey(target, key);
  }
  if (codeGenerated) {
    const sources = codeEntries[key];
    if (!Array.isArray(sources) || sources.length === 0) {
      fail(`mapping.json: 코드 생성 ${key}의 sources가 비어 있음`);
    }
    for (const source of sources ?? []) {
      try {
        await access(join(root, source));
      } catch {
        fail(`mapping.json: 코드 생성 ${key} source 파일 없음 (${source})`);
      }
    }
  }
}

for (const key of Object.keys(manifestGroups)) {
  if (!mappingKeys.has(key)) fail(`mapping.json: manifestGroups의 알 수 없는 키 ${key}`);
}
for (const key of Object.keys(codeEntries)) {
  if (!mappingKeys.has(key)) fail(`mapping.json: code의 알 수 없는 키 ${key}`);
}
for (const key of plannedSet) {
  if (!mappingKeys.has(key)) fail(`mapping.json: planned의 알 수 없는 키 ${key}`);
}
for (const entry of visualEntries) {
  if (!claims.has(entry.key)) fail(`mapping.json: 시각 manifest 키 ${entry.key} 연결 없음`);
}

const declaredPaths = new Map();
const registerPath = async (url, owner) => {
  if (typeof url !== "string" || !url.startsWith("/assets/") || url.includes("\\") || url.includes("..") || url.includes("://")) {
    fail(`manifest.json: ${owner}의 저장소 내부 URL이 잘못됨 (${url ?? "없음"})`);
    return;
  }
  if (declaredPaths.has(url)) {
    fail(`manifest.json: ${url}이 ${declaredPaths.get(url)}, ${owner}에 중복 연결됨`);
    return;
  }
  declaredPaths.set(url, owner);
  const localPath = resolve(root, url.slice(1));
  if (!localPath.startsWith(`${assetsRoot}${sep}`)) {
    fail(`manifest.json: ${owner} 경로가 assets 밖을 가리킴 (${url})`);
    return;
  }
  try {
    if (!(await stat(localPath)).isFile()) fail(`manifest.json: ${owner}가 일반 파일이 아님 (${url})`);
  } catch {
    fail(`manifest.json: ${owner} 실제 파일 없음 (${url})`);
  }
};

const expectedExtensions = Object.freeze({
  image: ".png",
  spritesheet: ".png",
  atlas: ".png",
  audio: ".wav"
});

for (const entry of manifestEntries) {
  if (typeof entry.key !== "string" || entry.key.trim() === "") {
    fail("manifest.json: 빈 key가 있음");
    continue;
  }
  if (!hasOwn(expectedExtensions, entry.type)) fail(`manifest.json: ${entry.key}의 알 수 없는 type ${entry.type}`);
  const primaryUrl = entry.url ?? entry.file;
  if (entry.url && entry.file) fail(`manifest.json: ${entry.key}에 url과 file이 동시에 있음`);
  if (extname(primaryUrl ?? "").toLowerCase() !== expectedExtensions[entry.type]) {
    fail(`manifest.json: ${entry.key} type ${entry.type}과 확장자 불일치 (${primaryUrl ?? "없음"})`);
  }
  const extension = extname(primaryUrl ?? "");
  if (basename(primaryUrl ?? "", extension) !== entry.key) {
    fail(`manifest.json: ${entry.key}와 파일명 불일치 (${primaryUrl ?? "없음"})`);
  }
  await registerPath(primaryUrl, entry.key);

  if (entry.type === "atlas") {
    if (extname(entry.atlasUrl ?? "").toLowerCase() !== ".json") fail(`manifest.json: ${entry.key} atlasUrl JSON 없음`);
    if (basename(entry.atlasUrl ?? "", ".json") !== entry.key) fail(`manifest.json: ${entry.key}와 atlas 파일명 불일치`);
    await registerPath(entry.atlasUrl, `${entry.key}#atlas`);
  } else if (entry.atlasUrl) {
    fail(`manifest.json: atlas가 아닌 ${entry.key}에 atlasUrl이 있음`);
  }
}

const runtimeFiles = [];
const collectDirectFiles = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isFile()) runtimeFiles.push(join(directory, entry.name));
  }
};
const collectFilesRecursively = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isFile()) runtimeFiles.push(path);
    else if (entry.isDirectory() && !entry.name.startsWith("_")) await collectFilesRecursively(path);
  }
};

await collectFilesRecursively(join(assetsRoot, "audio"));
for (const directory of ["backgrounds", "items", "tiles"]) {
  await collectDirectFiles(join(assetsRoot, directory));
}
for (const rootName of ["characters", "enemies"]) {
  const directory = join(assetsRoot, rootName);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
    await collectDirectFiles(join(directory, entry.name));
  }
}

const runtimeUrls = new Set(runtimeFiles.map(toAssetUrl));
for (const url of runtimeUrls) {
  if (!declaredPaths.has(url)) fail(`manifest.json: 등록되지 않은 런타임 파일 ${url}`);
}
for (const url of declaredPaths.keys()) {
  if (!runtimeUrls.has(url)) fail(`manifest.json: 런타임 파일 집합에서 찾을 수 없음 ${url}`);
}

if (errors.length) {
  console.error(`에셋 매핑 정합성 검증 실패 (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `에셋 매핑 정합성 통과: mapping ${mappingEntries.length}개 `
  + `(manifest 직결 ${mappingEntries.filter(([key]) => visualByKey.has(key)).length}, 그룹 ${Object.keys(manifestGroups).length}, 코드 ${Object.keys(codeEntries).length}, 계획 ${plannedSet.size}) · `
  + `manifest ${manifestEntries.length}개(시각 ${visualEntries.length}, 오디오 ${manifestEntries.length - visualEntries.length}) · 런타임 파일 ${runtimeUrls.size}개`
);
