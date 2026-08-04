import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { CORE_RULES, TRANSFORM_PRESENTATION } from "../src/data/gameplay.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFile(new URL(path, `${new URL("../", import.meta.url)}`), "utf8");
const errors = [];
const fail = (message) => errors.push(message);

const [gameScene, player, levelLoader, enemyManager, bossController, transformManager] = await Promise.all([
  read("src/scenes/GameScene.js"),
  read("src/entities/Player.js"),
  read("src/systems/LevelLoader.js"),
  read("src/systems/EnemyManager.js"),
  read("src/systems/BossController.js"),
  read("src/systems/TransformationManager.js")
]);

if (CORE_RULES.invulnerableMs !== 2000) fail("피격 무적 시간이 2초가 아님");
if (CORE_RULES.hurtLockMs > 250) fail("피격 경직이 250ms를 초과함");
if (CORE_RULES.flightMaxMs !== 10000 || CORE_RULES.flightRecoveryMs !== 3000) fail("페가수스 비행/회복 시간이 다름");
if (CORE_RULES.alicornDurationMs !== 12000 || CORE_RULES.alicornWarningMs !== 3000) fail("알리콘 지속/예고 시간이 다름");
if (CORE_RULES.bossTelegraphMs < 700 || CORE_RULES.bossTelegraphMs > 1000) fail("보스 예고 시간이 범위 밖");
if (Object.values(TRANSFORM_PRESENTATION).some((cue) => cue.emphasisMs < 100 || cue.emphasisMs > 180)) {
  fail("변신 카메라 강조 시간이 100~180ms 범위 밖");
}

if (!gameScene.includes("TransformationManager") || !gameScene.includes("HealthManager")) fail("GameScene에 핵심 매니저가 연결되지 않음");
if (!levelLoader.includes('candidate.type === "boss"')) fail("보스가 section 데이터로 로드되지 않음");
if (!enemyManager.includes("isOnScreen")) fail("화면 밖 공격 차단이 없음");
if (!enemyManager.includes("new ObjectPool") || !bossController.includes("new ObjectPool")) fail("반복 오브젝트에 Object Pool이 없음");
if (!bossController.includes("SeededRandom")) fail("보스 패턴에 고정 Seed가 없음");
if (!transformManager.includes("findNearestSafePoint")) fail("알리콘 종료 안전 착지가 없음");
if (!transformManager.includes("body.moves = false") || !transformManager.includes("camera.flash") || !transformManager.includes("camera.zoomTo")) {
  fail("변신 정지·플래시·카메라 강조가 모두 연결되지 않음");
}
if (!transformManager.includes("this.transforming || this.form === FORMS.ALICORN")) {
  fail("변신 정지 중 피격 방지가 연결되지 않음");
}
if (!levelLoader.includes("add.tileSprite") || !levelLoader.includes("setBackgroundMood")) {
  fail("패럴랙스 배경 TileSprite 또는 무드 전환이 없음");
}
if (!gameScene.includes("setBackgroundMood(section?.mood)")) fail("섹션 mood가 배경 전환에 연결되지 않음");
if ([enemyManager, bossController].some((source) => source.includes("Math.random"))) fail("고정 Seed 밖의 랜덤 호출이 있음");
if ([gameScene, player].some((source) => source.includes("Phaser.Math.MoveTowards"))) {
  fail("현재 Phaser 버전에 없는 Math.MoveTowards 호출이 있음");
}
if (/#[0-9a-f]{6}\b|0x[0-9a-f]{6}\b/i.test([gameScene, levelLoader, enemyManager, bossController, transformManager].join("\n"))) {
  fail("Core Mechanics 소스에 직접 색상 값이 있음");
}

if (errors.length) {
  console.error(`Core Mechanics 검증 실패 (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Core Mechanics 구조 검증 통과: ${root}`);
