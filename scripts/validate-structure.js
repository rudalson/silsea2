import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { LEVELS, getLevel, getNextLevel } from "../src/data/levels/index.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const errors = [];
const fail = (message) => errors.push(message);

const walk = async (directory) => {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(path));
    else result.push(path);
  }
  return result;
};

const sceneFiles = await walk(join(root, "src", "scenes"));
const systemFiles = await walk(join(root, "src", "systems"));
const sourceFiles = [...sceneFiles, ...systemFiles];
const allSourceFiles = await walk(join(root, "src"));

if (sceneFiles.some((file) => file.endsWith("BossScene.js"))) fail("BossScene.js가 존재함");

const gameScene = await readFile(join(root, "src", "scenes", "GameScene.js"), "utf8");
const bootScene = await readFile(join(root, "src", "scenes", "BootScene.js"), "utf8");
const uiScene = await readFile(join(root, "src", "scenes", "UIScene.js"), "utf8");
const levelLoader = await readFile(join(root, "src", "systems", "LevelLoader.js"), "utf8");
const constants = await readFile(join(root, "src", "config", "constants.js"), "utf8");
for (const forbidden of LEVELS.flatMap((level) => [level.id, level.name])) {
  if (gameScene.includes(forbidden)) fail(`GameScene에 특정 레벨 참조가 있음: ${forbidden}`);
  if (levelLoader.includes(forbidden)) fail(`LevelLoader에 특정 레벨 참조가 있음: ${forbidden}`);
}

for (const file of sourceFiles.filter((path) => !path.endsWith("InputManager.js"))) {
  const source = await readFile(file, "utf8");
  if (/createCursorKeys|\.addKeys\(|KeyCodes\./.test(source)) {
    fail(`InputManager 밖에서 직접 키를 등록함: ${file.slice(root.length + 1)}`);
  }
}

for (const file of allSourceFiles.filter((path) => /\.(?:js|css)$/.test(path))) {
  const source = await readFile(file, "utf8");
  if (/#[0-9a-f]{6}\b|0x[0-9a-f]{6}\b/i.test(source)) {
    fail(`src에 palette.js 밖의 직접 색상 값이 있음: ${file.slice(root.length + 1)}`);
  }
}

if (LEVELS.length < 2) fail("확장성 검증용 level-02가 없음");
if (!getLevel("level-02")) fail("level-02가 레지스트리에 등록되지 않음");
if (getNextLevel(LEVELS[0].id)?.id !== LEVELS[1].id) fail("getNextLevel 순서가 잘못됨");

const levelIndex = await readFile(join(root, "src", "data", "levels", "index.js"), "utf8");
if (!levelIndex.includes('import level02 from "./level-02.js";')) fail("level-02 import 한 줄이 없음");
if (!levelIndex.includes("[level01, level02]")) fail("LEVELS 배열에 level-02 항목이 없음");

if (!bootScene.includes('query.get("visualReview")')) fail("런타임 화풍 검수용 visualReview 진입점이 없음");
if (!bootScene.includes('query.get("section")')) fail("런타임 화풍 검수용 section 선택이 없음");
if (!bootScene.includes('query.get("form")')) fail("캐릭터 런타임 검수용 form 선택이 없음");
if (!bootScene.includes('query.get("animation")')) fail("캐릭터 런타임 검수용 animation 선택이 없음");
if (!gameScene.includes("visualReviewOffset")) fail("런타임 화풍 검수용 구간 오프셋이 없음");
if (!gameScene.includes("visualReviewAnimation")) fail("캐릭터 런타임 애니메이션 고정이 없음");
if (!constants.includes('get("debug") === "1"')) fail("디버그가 명시적인 ?debug=1 없이 활성화됨");
if (!levelLoader.includes('registry.get("debugEnabled")')) fail("구간 마커가 디버그 상태에 연결되지 않음");
if (!uiScene.includes('setVisible(this.registry.get("debugEnabled"))')) fail("FPS 표시가 디버그 상태에 연결되지 않음");

if (errors.length) {
  console.error(`구조 검증 실패 (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("구조 검증 통과: 공용 GameScene, Boss section, InputManager, level-02 레지스트리, visualReview 진입점, 디버그 표시 격리");
