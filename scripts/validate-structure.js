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
const clearScene = await readFile(join(root, "src", "scenes", "ClearScene.js"), "utf8");
const characterSelectScene = await readFile(join(root, "src", "scenes", "CharacterSelectScene.js"), "utf8");
const stageSelectScene = await readFile(join(root, "src", "scenes", "StageSelectScene.js"), "utf8");
const uiScene = await readFile(join(root, "src", "scenes", "UIScene.js"), "utf8");
const levelLoader = await readFile(join(root, "src", "systems", "LevelLoader.js"), "utf8");
const playtestManager = await readFile(join(root, "src", "systems", "PlaytestManager.js"), "utf8");
const assetManager = await readFile(join(root, "src", "systems", "AssetManager.js"), "utf8");
const enemyManager = await readFile(join(root, "src", "systems", "EnemyManager.js"), "utf8");
const environmentManager = await readFile(join(root, "src", "systems", "EnvironmentMechanicsManager.js"), "utf8");
const breathManager = await readFile(join(root, "src", "systems", "BreathManager.js"), "utf8");
const levelSchema = await readFile(join(root, "src", "data", "schema", "levelSchema.js"), "utf8");
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

if (LEVELS.length < 5) fail("물에 잠긴 마을 검증용 level-05가 없음");
if (!getLevel("level-02")) fail("level-02가 레지스트리에 등록되지 않음");
if (!getLevel("level-03")) fail("level-03이 레지스트리에 등록되지 않음");
if (!getLevel("level-04")) fail("level-04가 레지스트리에 등록되지 않음");
if (!getLevel("level-05")) fail("level-05가 레지스트리에 등록되지 않음");
if (getNextLevel(LEVELS[0].id)?.id !== LEVELS[1].id) fail("getNextLevel 순서가 잘못됨");
if (getNextLevel("level-03")?.id !== "level-04") fail("안개 골짜기 다음 레벨이 쓰나미 마을이 아님");
if (getNextLevel("level-04")?.id !== "level-05") fail("쓰나미 마을 다음 레벨이 물에 잠긴 마을이 아님");

const levelIndex = await readFile(join(root, "src", "data", "levels", "index.js"), "utf8");
if (!levelIndex.includes('import level02 from "./level-02.js";')) fail("level-02 import 한 줄이 없음");
if (!levelIndex.includes('import level03 from "./level-03.js";')) fail("level-03 import 한 줄이 없음");
if (!levelIndex.includes('import level04 from "./level-04.js";')) fail("level-04 import 한 줄이 없음");
if (!levelIndex.includes('import level05 from "./level-05.js";')) fail("level-05 import 한 줄이 없음");
if (!levelIndex.includes("[level01, level02, level03, level04, level05]")) fail("LEVELS 배열에 level-05 항목이 없음");

if (!bootScene.includes('query.get("visualReview")')) fail("런타임 화풍 검수용 visualReview 진입점이 없음");
if (!bootScene.includes('query.get("guard")')) fail("P6 날개 방어 visualReview 고정 진입점이 없음");
if (!bootScene.includes('query.get("laser")')) fail("P6 레이저 단계 visualReview 고정 진입점이 없음");
if (!bootScene.includes('query.get("p1test")')) fail("P1 환경 회색 상자 직접 진입점이 없음");
if (!bootScene.includes('query.get("section")')) fail("런타임 화풍 검수용 section 선택이 없음");
if (!bootScene.includes('query.get("form")')) fail("캐릭터 런타임 검수용 form 선택이 없음");
if (!bootScene.includes('query.get("animation")')) fail("캐릭터 런타임 검수용 animation 선택이 없음");
if (!bootScene.includes('query.get("breath")')) fail("숨 소모·회복 런타임 검수용 breath 선택이 없음");
if (!gameScene.includes("visualReviewOffset")) fail("런타임 화풍 검수용 구간 오프셋이 없음");
if (!gameScene.includes("visualReviewAnimation")) fail("캐릭터 런타임 애니메이션 고정이 없음");
if (!constants.includes('get("debug") === "1"')) fail("디버그가 명시적인 ?debug=1 없이 활성화됨");
if (!levelLoader.includes('registry.get("debugEnabled")')) fail("구간 마커가 디버그 상태에 연결되지 않음");
if (!uiScene.includes('setVisible(this.registry.get("debugEnabled"))')) fail("FPS 표시가 디버그 상태에 연결되지 않음");
if (!bootScene.includes('query.get("playtest")') || !bootScene.includes('query.get("tester")')) {
  fail("익명 플레이테스트 진입 쿼리가 없음");
}
if (!bootScene.includes('query.get("level")') || !bootScene.includes("playtestLevel")) {
  fail("저장 진행도와 분리된 P8 대상 레벨 플레이테스트 진입점이 없음");
}
for (const marker of ["tsunamiHits", "breathDepletions", "projectilesGuarded", "hpLosses"]) {
  if (!playtestManager.includes(marker)) fail(`P8 플레이테스트 계측이 없음: ${marker}`);
}
if (!bootScene.includes('query.get("fallback")') || !assetManager.includes('get?.("forceAssetFallback")')) {
  fail("이미지·오디오 fallback 전체 검증 진입점이 없음");
}
if (!enemyManager.includes("applyTelegraphColor") || !enemyManager.includes("clearTelegraphColor")) {
  fail("도형 fallback 적의 공격 예고 색상 전환이 안전하지 않음");
}
if (!gameScene.includes("new PlaytestManager") || !gameScene.includes("playtestManager?.complete")) {
  fail("GameScene에 플레이테스트 세션 시작·완료가 연결되지 않음");
}
if (!gameScene.includes("new EnvironmentMechanicsManager") || !gameScene.includes("new BreathManager")) {
  fail("GameScene에 공용 환경·숨 매니저가 연결되지 않음");
}
if (!levelSchema.includes("normalizeLevelDefinition") || !levelSchema.includes("SUPPORTED_LEVEL_SCHEMA_VERSIONS")) {
  fail("Schema v1/v2 정규화 호환 경로가 없음");
}
if (!levelLoader.includes("this.level.exit?.x")) fail("게이트가 명시적 exit 좌표를 사용하지 않음");
if (!enemyManager.includes("hasReachedProgressTrigger")) fail("적 활성화가 진행 방향을 사용하지 않음");
if (!playtestManager.includes("maxProgress") || !playtestManager.includes("getNormalizedProgress")) {
  fail("플레이테스트가 역방향 정규화 진행 거리를 기록하지 않음");
}
if (!environmentManager.includes("pauseEnemiesDuringWave") || !breathManager.includes("takeEnvironmentDamage")) {
  fail("쓰나미 중 적 정지 또는 숨 0 환경 피해 경로가 없음");
}
if (!environmentManager.includes("createMistVisuals") || !environmentManager.includes("resolveMistProfile")) {
  fail("안개 영역 시각화 또는 화면 효과 강도 완화 경로가 없음");
}
if (!environmentManager.includes("mistBeacon") || !environmentManager.includes("mistBreeze") || !environmentManager.includes("mistClear")) {
  fail("승인된 P3 비콘·바람 리본·안개 걷힘 에셋 연결이 없음");
}
if (!playtestManager.includes("PLAYTEST_STALL_SECONDS") || !playtestManager.includes("adjustmentCandidates")) {
  fail("플레이테스트 정체·2명 이상 조정 후보 분석이 없음");
}
if (!clearScene.includes("downloadPlaytestBundle") || !clearScene.includes("input.exportPressed")) {
  fail("클리어 화면에 플레이테스트 JSON 저장 경로가 없음");
}
if (!gameScene.includes("this.scene.start(SCENE_KEYS.CLEAR") || gameScene.includes("this.time.delayedCall(320")) {
  fail("게이트 완료 뒤 즉시 클리어 화면으로 전환되지 않음");
}
if (!gameScene.includes("completeProgressSafely") || !gameScene.includes("completePlaytestSafely") || !gameScene.includes("playStageClearPresentation")) {
  fail("클리어 부가 기록·연출 오류가 장면 전환을 막지 않도록 격리되지 않음");
}
const gateCompletionStart = gameScene.indexOf("  handleGateEntered() {");
const gateCompletionBlock = gameScene.slice(
  gateCompletionStart,
  gameScene.indexOf("  completeProgressSafely", gateCompletionStart)
);
if (gateCompletionBlock.indexOf("playStageClearPresentation()") > gateCompletionBlock.indexOf("this.scene.start(SCENE_KEYS.CLEAR")) {
  fail("클리어 연출 정리가 장면 전환보다 늦게 실행됨");
}
if (!clearScene.includes("startNextLevel") || !clearScene.includes("goToStageSelect")) {
  fail("클리어 화면에 다음 스테이지·스테이지 선택 이동 경로가 없음");
}
if (!clearScene.includes("createActionButton") || !clearScene.includes("input.pausePressed")) {
  fail("클리어 화면의 직접 선택 버튼 또는 Esc 복귀가 없음");
}
if (!characterSelectScene.includes("createBackButton") || !characterSelectScene.includes("goBack") || !characterSelectScene.includes("input.pausePressed")) {
  fail("캐릭터 선택 화면의 직접 이전 메뉴 버튼 또는 Esc 복귀가 없음");
}
if (!stageSelectScene.includes("createBackButton") || !stageSelectScene.includes("goBack") || !stageSelectScene.includes("input.pausePressed")) {
  fail("스테이지 선택 화면의 직접 캐릭터 선택 버튼 또는 Esc 복귀가 없음");
}
if (!stageSelectScene.includes("pageIndicator") || !stageSelectScene.includes("relative * 390")) {
  fail("다섯 번째 스테이지를 위한 좌우 캐러셀·페이지 표시가 없음");
}
if (!stageSelectScene.includes('level.visualTheme === "submerged-graybox"')) fail("물에 잠긴 마을 선택 카드 실루엣이 없음");
if (!stageSelectScene.includes("progressManager.isUnlocked") || !stageSelectScene.includes("이전 스테이지를 먼저 클리어")) {
  fail("직전 스테이지 클리어 기반 순차 해금 경로가 없음");
}

if (errors.length) {
  console.error(`구조 검증 실패 (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("구조 검증 통과: Schema v1/v2 호환, 방향 독립 GameScene·게이트·적·계측, 공용 환경·숨·안개·쓰나미 매니저, 캐러셀·순차 해금, P1 시험 진입점, level-02~05 확장성");
