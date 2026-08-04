import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { CORE_RULES, TRANSFORM_PRESENTATION } from "../src/data/gameplay.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFile(new URL(path, `${new URL("../", import.meta.url)}`), "utf8");
const errors = [];
const fail = (message) => errors.push(message);

const [
  gameScene,
  player,
  levelLoader,
  enemyManager,
  bossController,
  transformManager,
  cameraEffects,
  uiScene,
  inputManager,
  bootScene,
  preloadScene,
  characterSelectScene,
  clearScene,
  menuScene,
  assetManager,
  characterAnimator,
  enemyAnimator,
  particleEffects
] = await Promise.all([
  read("src/scenes/GameScene.js"),
  read("src/entities/Player.js"),
  read("src/systems/LevelLoader.js"),
  read("src/systems/EnemyManager.js"),
  read("src/systems/BossController.js"),
  read("src/systems/TransformationManager.js"),
  read("src/systems/CameraEffectsManager.js"),
  read("src/scenes/UIScene.js"),
  read("src/systems/InputManager.js"),
  read("src/scenes/BootScene.js"),
  read("src/scenes/PreloadScene.js"),
  read("src/scenes/CharacterSelectScene.js"),
  read("src/scenes/ClearScene.js"),
  read("src/scenes/MenuScene.js"),
  read("src/systems/AssetManager.js"),
  read("src/systems/CharacterAnimationManager.js"),
  read("src/systems/EnemyAnimationManager.js"),
  read("src/systems/ParticleEffectsManager.js")
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
if (!gameScene.includes("ParticleEffectsManager") || !particleEffects.includes("scene.add.particles")) {
  fail("GameScene에 Phaser 파티클 효과 매니저가 연결되지 않음");
}
if (!player.includes("emitLanding") || !gameScene.includes("emitMagnetTrail") || !transformManager.includes("emitTransform")) {
  fail("착지·자석·변신 파티클 중 실제 런타임 연결이 누락됨");
}
if (!particleEffects.includes("generateTexture") || !particleEffects.includes("magnetStates")) {
  fail("팔레트 고정 런타임 파티클 텍스처 또는 자석 궤적 제어가 없음");
}
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
if (transformManager.includes("this.horn.setPosition(this.player.x + direction * 18, this.player.y - 82).setFlipX")) {
  fail("Shape 기반 뿔에 지원되지 않는 setFlipX 호출이 남아 있음");
}
if (!gameScene.includes("CameraEffectsManager") || !bossController.includes("cameraEffects?.shake")) {
  fail("카메라 흔들림이 중앙 CameraEffectsManager를 통하지 않음");
}
if ([gameScene, enemyManager, bossController].some((source) => source.includes("cameras.main.shake"))) {
  fail("CameraEffectsManager 밖에 직접 camera shake 호출이 있음");
}
if (!cameraEffects.includes("screenShakeEnabled") || !cameraEffects.includes("shakeEffect?.reset")) {
  fail("화면 흔들림 설정 저장 또는 즉시 중단 처리가 없음");
}
if (!uiScene.includes("toggleScreenShake") || !inputManager.includes("shakeTogglePressed")) {
  fail("HUD 또는 키보드 화면 흔들림 토글이 연결되지 않음");
}
if (!bootScene.includes("queueCharacterPortraits") || !preloadScene.includes("queueCharacterAssets")) {
  fail("선택 화면 idle 또는 선택 캐릭터 전체 시트 프리로드가 없음");
}
if (!assetManager.includes("getCharacterAssetKeys") || !assetManager.includes("queueManifestAsset")) {
  fail("manifest 기반 캐릭터 에셋 로딩 경로가 없음");
}
if (!characterSelectScene.includes("CharacterAnimationManager.play") || !clearScene.includes('"victory"')) {
  fail("선택 또는 클리어 화면에 실제 캐릭터 애니메이션이 없음");
}
if (!player.includes("usesCharacterArt") || !player.includes("updateCharacterAnimation") || !characterAnimator.includes("frameRate: 1000")) {
  fail("Player 실제 캐릭터 애니메이션 또는 프레임별 duration 등록이 없음");
}
if (!transformManager.includes("playTransformAnimation") || !gameScene.includes("playVictoryAnimation")) {
  fail("변신 또는 스테이지 클리어 애니메이션이 Player에 연결되지 않음");
}
if (!preloadScene.includes("queueEnemyAssets") || !levelLoader.includes("EnemyAnimationManager.play")) {
  fail("레벨 적·보스 시트 프리로드 또는 실제 스프라이트 생성 경로가 없음");
}
if (!enemyManager.includes('"warning"') || !enemyManager.includes('"defeated"') || !bossController.includes('"hurt"')) {
  fail("적 경고·처치 또는 보스 피격 애니메이션 상태 연결이 없음");
}
if (!enemyAnimator.includes("frameRate: 1000")) fail("적 프레임별 duration 등록이 없음");
if (menuScene.includes("GRAYBOX")) fail("메뉴에 Graybox 표기가 남아 있음");
if (!levelLoader.includes("add.tileSprite") || !levelLoader.includes("setBackgroundMood")) {
  fail("패럴랙스 배경 TileSprite 또는 무드 전환이 없음");
}
if (!gameScene.includes("setBackgroundMood(section?.mood)")) fail("섹션 mood가 배경 전환에 연결되지 않음");
if ([enemyManager, bossController].some((source) => source.includes("Math.random"))) fail("고정 Seed 밖의 랜덤 호출이 있음");
if ([gameScene, player].some((source) => source.includes("Phaser.Math.MoveTowards"))) {
  fail("현재 Phaser 버전에 없는 Math.MoveTowards 호출이 있음");
}
if (/#[0-9a-f]{6}\b|0x[0-9a-f]{6}\b/i.test([gameScene, levelLoader, enemyManager, bossController, transformManager, particleEffects].join("\n"))) {
  fail("Core Mechanics 소스에 직접 색상 값이 있음");
}

if (errors.length) {
  console.error(`Core Mechanics 검증 실패 (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Core Mechanics 구조 검증 통과: ${root}`);
