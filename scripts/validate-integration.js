import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { FORMS } from "../src/data/gameplay.js";
import { FOOTSTEP_SFX } from "../src/data/footsteps.js";
import { LEVELS } from "../src/data/levels/index.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const errors = [];
const fail = (message) => errors.push(message);
const manifest = JSON.parse(await readFile(join(root, "assets", "manifest.json"), "utf8"));
const mapping = JSON.parse(await readFile(join(root, "references", "mapping.json"), "utf8"));
const manifestByKey = new Map(manifest.assets.map((entry) => [entry.key, entry]));
const visualKeys = new Set(manifest.assets.filter((entry) => entry.type !== "audio").map((entry) => entry.key));
const audioKeys = new Set(manifest.assets.filter((entry) => entry.type === "audio").map((entry) => entry.key));

const collectFiles = async (directory) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(path));
    else if (entry.name.endsWith(".js")) files.push(path);
  }
  return files;
};

const collectAssetKeys = (value, parentKey = "") => {
  if (typeof value === "string") {
    return ["tilemap", "tilemapKey"].includes(parentKey) ? [] : [value];
  }
  if (Array.isArray(value)) return value.flatMap((child) => collectAssetKeys(child, parentKey));
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => collectAssetKeys(child, key));
};

for (const level of LEVELS) {
  const requiredVisualSlots = [
    ["preview", level.assets.preview],
    ["tileset", level.assets.tileset],
    ["backgrounds.normal.far", level.assets.backgrounds?.normal?.far],
    ["backgrounds.normal.mid", level.assets.backgrounds?.normal?.mid],
    ["backgrounds.normal.near", level.assets.backgrounds?.normal?.near],
    ["objects.checkpoint", level.assets.objects?.checkpoint],
    ["objects.gate", level.assets.objects?.gate]
  ];
  for (const [slot, key] of requiredVisualSlots) {
    if (!key) fail(`${level.id}: 필수 시각 슬롯 ${slot}이 비어 있음`);
    else if (!visualKeys.has(key)) fail(`${level.id}: ${slot}의 시각 manifest 키가 없음 (${key})`);
  }

  for (const key of new Set(collectAssetKeys(level.assets))) {
    if (!manifestByKey.has(key)) fail(`${level.id}: 레벨 에셋이 manifest에 없음 (${key})`);
  }

  for (const slot of ["field", "clear"]) {
    const key = level.assets.bgm?.[slot];
    if (!key || !audioKeys.has(key)) fail(`${level.id}: bgm.${slot} 오디오가 없음 (${key ?? "미지정"})`);
  }
  if (level.sections.some((section) => section.type === "boss")) {
    const key = level.assets.bgm?.boss;
    if (!key || !audioKeys.has(key)) fail(`${level.id}: 보스 구간의 boss BGM이 없음 (${key ?? "미지정"})`);
  }
}

const sourceFiles = await collectFiles(join(root, "src"));
const sourceEntries = await Promise.all(sourceFiles.map(async (path) => [path, await readFile(path, "utf8")]));
const allSource = sourceEntries.map(([, source]) => source).join("\n");
const audioCallPattern = /\.(?:playSfx|playLoop|stopLoop|playBgm|transitionBgm|playBgmLayer|stopBgmLayer)\(\s*["']([^"']+)["']/g;
const calledAudioKeys = new Set([...allSource.matchAll(audioCallPattern)].map((match) => match[1]));
for (const form of Object.values(FORMS).filter((form) => form !== FORMS.BASE)) {
  calledAudioKeys.add(`sfx_transform_${form}`);
}
calledAudioKeys.add("sfx_percent_small");
calledAudioKeys.add("sfx_percent_large");
for (const key of Object.values(FOOTSTEP_SFX)) calledAudioKeys.add(key);
for (const key of calledAudioKeys) {
  if (!audioKeys.has(key)) fail(`런타임 오디오 호출 키가 manifest에 없음 (${key})`);
}

const sourceByName = new Map(sourceEntries.map(([path, source]) => [path.split(/[\\/]/).at(-1), source]));
const assertOrdered = (fileName, markers, label) => {
  const source = sourceByName.get(fileName) ?? "";
  let cursor = -1;
  for (const marker of markers) {
    const index = source.indexOf(marker, cursor + 1);
    if (index < 0) {
      fail(`${label}: ${fileName}에서 동기화 표식 누락 (${marker})`);
      return;
    }
    cursor = index;
  }
};

assertOrdered("GameScene.js", [
  "this.audioManager.playBgm(this.level.assets.bgm.field)",
  "this.audioManager.transitionBgm(this.level.assets.bgm.boss)",
  "this.audioManager.transitionBgm(this.level.assets.bgm.field)"
], "필드↔보스 BGM 전환");
assertOrdered("EnvironmentMechanicsManager.js", [
  "entry.warning.setVisible(warning)",
  'playSfx("sfx_laser_warning"'
], "레이저 시각·음향 예고");
assertOrdered("EnvironmentMechanicsManager.js", [
  "this.waveState = WAVE_STATES.WARNING",
  "EVENTS.TSUNAMI_WARNING",
  'playSfx("sfx_tsunami_warning"'
], "쓰나미 시각·음향 예고");
assertOrdered("PotatoKingBehavior.js", [
  'EnemyAnimationManager.play(this.boss, "jump", false)',
  'playSfx("sfx_boss_warning"'
], "보스 시각·음향 예고");
assertOrdered("HulaKingBehavior.js", [
  "this.warningShadow.setVisible(true)",
  'playSfx("sfx_boss_warning"'
], "훌라후프 시각·음향 예고");
assertOrdered("EnemyManager.js", [
  "beginDarkCloudTelegraph",
  "this.applyTelegraphColor(enemy, COLORS.collectBlue)",
  'playSfx("sfx_cloud_charge"'
], "먹구름 시각·음향 예고");

const s6DecorationKeys = ["decor_flower", "decor_grass", "decor_rock", "decor_sign"];
const planned = [...(mapping.$delivery?.planned ?? [])].sort();
if (planned.length !== 0) {
  fail(`S6 완료 뒤 계획 항목은 없어야 함 (현재: ${planned.join(", ")})`);
}
for (const key of s6DecorationKeys) {
  if (!visualKeys.has(key)) fail(`S6 장식 manifest 누락: ${key}`);
}

const assetManager = sourceByName.get("AssetManager.js") ?? "";
const bootScene = sourceByName.get("BootScene.js") ?? "";
if (!assetManager.includes('get?.("forceAssetFallback")') || !bootScene.includes('query.get("fallback") === "1"')) {
  fail("정상/도형·무음 fallback 전환 경로가 연결되지 않음");
}

if (errors.length) {
  console.error(`P7 통합 검증 실패 (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `P7 통합 검증 통과: ${LEVELS.length}개 스테이지 · manifest 시각 ${visualKeys.size}개/오디오 ${audioKeys.size}개 · `
  + `런타임 오디오 호출 ${calledAudioKeys.size}개 · S6 선택 장식 ${s6DecorationKeys.length}종 연결 · 정상/fallback 진입점 확인`
);
