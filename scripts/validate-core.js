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
  potatoKingBehavior,
  transformManager,
  cameraEffects,
  audioManager,
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
  particleEffects,
  difficultyManager,
  healthManager,
  environmentManager,
  breathManager,
  levelSchema,
  environmentData,
  playtestManager,
  scoreManager,
  objectPool,
  soakTest,
  packageJson,
  viteConfig,
  runtimeBuildTest,
  styles,
  gameConfig,
  palette,
  constants,
  environmentRegrade,
  combatDevices
] = await Promise.all([
  read("src/scenes/GameScene.js"),
  read("src/entities/Player.js"),
  read("src/systems/LevelLoader.js"),
  read("src/systems/EnemyManager.js"),
  read("src/systems/BossController.js"),
  read("src/systems/bosses/PotatoKingBehavior.js"),
  read("src/systems/TransformationManager.js"),
  read("src/systems/CameraEffectsManager.js"),
  read("src/systems/AudioManager.js"),
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
  read("src/systems/ParticleEffectsManager.js"),
  read("src/systems/DifficultyManager.js"),
  read("src/systems/HealthManager.js"),
  read("src/systems/EnvironmentMechanicsManager.js"),
  read("src/systems/BreathManager.js"),
  read("src/data/schema/levelSchema.js"),
  read("src/data/environment.js"),
  read("src/systems/PlaytestManager.js"),
  read("src/systems/ScoreManager.js"),
  read("src/systems/ObjectPool.js"),
  read("scripts/test-soak.js"),
  read("package.json"),
  read("vite.config.js"),
  read("scripts/validate-runtime-build.js"),
  read("src/styles.css"),
  read("src/config/gameConfig.js"),
  read("data/palette.js"),
  read("src/config/constants.js"),
  read("scripts/regrade-environment.js"),
  read("src/data/combatDevices.js")
]);

const bossRuntime = `${bossController}\n${potatoKingBehavior}`;

if (CORE_RULES.invulnerableMs !== 2000) fail("피격 무적 시간이 2초가 아님");
if (CORE_RULES.hurtLockMs > 250) fail("피격 경직이 250ms를 초과함");
if (CORE_RULES.flightMaxMs !== 10000 || CORE_RULES.flightRecoveryMs !== 3000) fail("페가수스 비행/회복 시간이 다름");
if (CORE_RULES.alicornDurationMs !== 12000 || CORE_RULES.alicornWarningMs !== 3000) fail("알리콘 지속/예고 시간이 다름");
if (CORE_RULES.bossTelegraphMs < 700 || CORE_RULES.bossTelegraphMs > 1000) fail("보스 예고 시간이 범위 밖");
if (Object.values(TRANSFORM_PRESENTATION).some((cue) => cue.emphasisMs < 100 || cue.emphasisMs > 180)) {
  fail("변신 카메라 강조 시간이 100~180ms 범위 밖");
}

if (!gameScene.includes("TransformationManager") || !gameScene.includes("HealthManager")) fail("GameScene에 핵심 매니저가 연결되지 않음");
if (!gameScene.includes("new EnvironmentMechanicsManager") || !gameScene.includes("new BreathManager")) {
  fail("GameScene에 P1 환경·숨 매니저가 연결되지 않음");
}
if (!preloadScene.includes("normalizeLevelDefinition") || !gameScene.includes("normalizeLevelDefinition")) {
  fail("v1 레벨을 v2 런타임 형태로 정규화하는 경로가 없음");
}
if (!levelSchema.includes("SUPPORTED_LEVEL_SCHEMA_VERSIONS") || !levelSchema.includes("getCameraLookAheadTarget")) {
  fail("스키마 v1/v2 호환 또는 역방향 카메라 회귀 계산이 없음");
}
if (!gameScene.includes("ParticleEffectsManager") || !particleEffects.includes("scene.add.particles")) {
  fail("GameScene에 Phaser 파티클 효과 매니저가 연결되지 않음");
}
if (!player.includes("emitLanding") || !gameScene.includes("emitMagnetTrail") || !transformManager.includes("emitTransform")) {
  fail("착지·자석·변신 파티클 중 실제 런타임 연결이 누락됨");
}
if (!particleEffects.includes("generateTexture") || !particleEffects.includes("magnetStates")) {
  fail("팔레트 고정 런타임 파티클 텍스처 또는 자석 궤적 제어가 없음");
}
if (!particleEffects.includes("PARTICLE_LIMITS") || !particleEffects.includes("maxParticles")) {
  fail("파티클 emitter 하드캡이 없음");
}
if (!particleEffects.includes("getSnapshot") || !gameScene.includes("getPerformanceSnapshot")) {
  fail("풀·파티클 런타임 성능 계측 경로가 없음");
}
if (!levelLoader.includes('candidate.type === "boss"')) fail("보스가 section 데이터로 로드되지 않음");
if (!enemyManager.includes("isOnScreen")) fail("화면 밖 공격 차단이 없음");
if (!enemyManager.includes("new ObjectPool") || !bossRuntime.includes("new ObjectPool")) fail("반복 오브젝트에 Object Pool이 없음");
if (!enemyManager.includes("getPoolSnapshot") || !bossController.includes("getPoolSnapshot")) {
  fail("Object Pool 런타임 계측이 없음");
}
if (!objectPool.includes("peakActiveCount") || !objectPool.includes("rejectedCount") || !objectPool.includes("getSnapshot")) {
  fail("Object Pool 생성·회수·상한 계측이 없음");
}
if (!packageJson.includes('"test:soak"') || !soakTest.includes("SIMULATED_MINUTES = 60") || !soakTest.includes("RESTART_CYCLES")) {
  fail("60분 등가 soak 또는 반복 재시작 메모리 테스트가 없음");
}
if (!packageJson.includes('"test:release"') || !viteConfig.includes("copyRuntimeAssets")) {
  fail("프로덕션 빌드의 로컬 런타임 에셋 복사·검증 경로가 없음");
}
if (!assetManager.includes("import.meta.env.BASE_URL") || !assetManager.includes("document.baseURI")) {
  fail("런타임 에셋이 상대 base URL을 따르지 않음");
}
if (!runtimeBuildTest.includes("외부 URL 0개") || !runtimeBuildTest.includes("runtimeUrls")) {
  fail("프로덕션 런타임의 로컬 에셋 전수 검증이 없음");
}
if (!gameConfig.includes("Phaser.Scale.FIT") || !gameConfig.includes("Phaser.Scale.CENTER_BOTH")) {
  fail("1280×720 종횡비 보존 또는 중앙 정렬 스케일 설정이 없음");
}
if (!styles.includes("100dvh") || !styles.includes("safe-area-inset") || !styles.includes("max-width: 100%") || !styles.includes("max-height: 100%")) {
  fail("동적 뷰포트·안전 영역·캔버스 반응형 CSS가 없음");
}
if (!["environmentSky", "environmentFar", "environmentMid", "environmentNear", "environmentNeutral"]
  .every((group) => palette.includes(group))) {
  fail("어린이용 밝은 환경 확장 팔레트가 완전하지 않음");
}
if (!constants.includes("PALETTE.environmentSky") || !constants.includes("PALETTE.environmentNear")) {
  fail("런타임 하늘·HUD·지형이 밝은 환경 팔레트에 연결되지 않음");
}
if (!environmentRegrade.includes("files.length !== 9") || !environmentRegrade.includes("environmentNeutral")) {
  fail("배경 9종의 재현 가능한 환경 리그레이드 경로가 없음");
}
if (!bossRuntime.includes("SeededRandom")) fail("보스 패턴에 고정 Seed가 없음");
if (!transformManager.includes("findNearestSafePoint")) fail("알리콘 종료 안전 착지가 없음");
if (!transformManager.includes("body.moves = false") || !transformManager.includes("camera.flash") || !transformManager.includes("camera.zoomTo")) {
  fail("변신 정지·플래시·카메라 강조가 모두 연결되지 않음");
}
if (!transformManager.includes("TRANSFORM_CAMERA_EASING.emphasize") || !transformManager.includes("TRANSFORM_CAMERA_EASING.restore")) {
  fail("변신 카메라 zoom ease가 함수로 연결되지 않음");
}
if (/camera\.zoomTo\([^;]+[\"']Sine\./s.test(transformManager)) {
  fail("Phaser Camera zoomTo에 문자열 ease를 전달함");
}
if (!transformManager.includes("this.transforming || this.form === FORMS.ALICORN")) {
  fail("변신 정지 중 피격 방지가 연결되지 않음");
}
if (transformManager.includes('this.scene.add.image(0, 0, "item_horn")')
  || !transformManager.includes('this.scene.add.image(0, 0, "item_wings")')
  || !player.includes("setVisualForm(form)")
  || !characterAnimator.includes("getCharacterAnimationVariants")) {
  fail("유니콘 뿔 프레임 합성 또는 날개 부착물 연결이 올바르지 않음");
}
if (!transformManager.includes('animationKey.endsWith(":fly")')) fail("비행 시트와 날개 부착물의 중복 방지가 없음");
if (!uiScene.includes("Math.round(this.gameScene.scoreManager?.displayScore ?? 0)")) {
  fail("HUD 보간 점수가 정수로 표시되지 않음");
}
if (!gameScene.includes("CameraEffectsManager") || !bossRuntime.includes("cameraEffects?.shake")) {
  fail("카메라 흔들림이 중앙 CameraEffectsManager를 통하지 않음");
}
if ([gameScene, enemyManager, bossRuntime].some((source) => source.includes("cameras.main.shake"))) {
  fail("CameraEffectsManager 밖에 직접 camera shake 호출이 있음");
}
if (!cameraEffects.includes("screenShakeEnabled") || !cameraEffects.includes("shakeEffect?.reset")) {
  fail("화면 흔들림 설정 저장 또는 즉시 중단 처리가 없음");
}
if (!gameScene.includes("transitionBgm") || !audioManager.includes("BGM_CROSSFADE_MS")) {
  fail("일반 구간과 보스 구간 BGM 크로스페이드가 연결되지 않음");
}
if (!audioManager.includes("playBgmLayer") || !audioManager.includes("ALICORN_LAYER_KEY")) {
  fail("알리콘 BGM 레이어 재생 경로가 없음");
}
if (!audioManager.includes("EVENTS.FORM_WARNING") || !audioManager.includes("stopBgmLayer")) {
  fail("알리콘 종료 예고부터 BGM 레이어를 페이드 아웃하지 않음");
}
if (!audioManager.includes("activeBgmLayers") || !audioManager.includes("setBgmVolume")) {
  fail("BGM 레이어 상태 또는 공용 볼륨 연결이 없음");
}
if (!uiScene.includes("toggleScreenShake") || !inputManager.includes("shakeTogglePressed")) {
  fail("HUD 또는 키보드 화면 흔들림 토글이 연결되지 않음");
}
if (!uiScene.includes("createPauseOverlay") || !uiScene.includes("adjustPauseOption") || !uiScene.includes("toggleMute")) {
  fail("일시정지 메뉴의 볼륨·음소거 설정이 연결되지 않음");
}
if (!uiScene.includes("this.pauseButton") || !uiScene.includes('playSfx("sfx_pause"')) {
  fail("포인터 일시정지 버튼 또는 일시정지 효과음이 연결되지 않음");
}
if (!uiScene.includes("조작 안내") || !inputManager.includes("menuUpPressed") || !inputManager.includes("muteTogglePressed")) {
  fail("일시정지 조작 안내 또는 메뉴 입력이 연결되지 않음");
}
if (!uiScene.includes("toggleEasyMode") || !gameScene.includes("getDifficultySettings")) {
  fail("쉬운 모드 토글 또는 런타임 난이도 연결이 없음");
}
if (!difficultyManager.includes("extraCheckpoints") || !difficultyManager.includes("removeEnemies")) {
  fail("쉬운 모드 추가 체크포인트 또는 적 제거 변환이 없음");
}
if (!difficultyManager.includes("getEnvironmentDifficulty") || !difficultyManager.includes("environment.tsunami")) {
  fail("쉬운 모드 환경 수치 변환이 없음");
}
if (!healthManager.includes("difficulty.player?.extraHp") || !transformManager.includes("flightDrainMultiplier")) {
  fail("쉬운 모드 추가 HP 또는 비행 소모 완화가 없음");
}
if (!healthManager.includes("takeEnvironmentDamage") || !breathManager.includes("takeEnvironmentDamage")) {
  fail("숨 0 이후 환경 피해가 공통 HP 경로에 연결되지 않음");
}
if (!environmentData.includes("stepBreathRatio") || !environmentData.includes("getWaterContact") || !breathManager.includes("getWaterContact")) {
  fail("수면 경계 또는 숨 소모·회복 계산이 데이터 기반이 아님");
}
if (!environmentData.includes("getMistZoneAt") || !environmentData.includes("resolveMistProfile") || !environmentManager.includes("createMistVisuals")) {
  fail("안개 영역·시야 반경·화면 효과 강도 계산이 데이터 기반이 아님");
}
if (!player.includes('ability.mode === "swim"') || !transformManager.includes("underwater = false")) {
  fail("수중 이동 또는 수중 비행 차단이 연결되지 않음");
}
if (!environmentManager.includes("SeededRandom") || !environmentManager.includes("pauseEnemiesDuringWave") || !enemyManager.includes("setPaused")) {
  fail("고정 Seed 쓰나미 또는 파도 중 적 일시정지가 없음");
}
if (!combatDevices.includes("GUARD_RULES") || !combatDevices.includes("getLaserPhase") || !combatDevices.includes("isInsideGuardArc")) {
  fail("P6 날개 방어·레이저 규칙이 공용 데이터 함수로 분리되지 않음");
}
if (!transformManager.includes("canGuardProjectile") || !transformManager.includes("GUARD_PHASES.ACTIVE")) {
  fail("페가수스·알리콘 날개 방어 판정이 변신 시스템에 연결되지 않음");
}
if (!enemyManager.includes('guardable: true') || !enemyManager.includes("createArrowPool") || !enemyManager.includes("updatePotatoArcher")) {
  fail("등록 투사체 방어 또는 궁수 화살 Object Pool 연결이 없음");
}
if (!environmentManager.includes("createLaserVisuals") || !environmentManager.includes("disableLaserSwitch")) {
  fail("레이저 주기 또는 같은 레벨 스위치 연결이 없음");
}
if (environmentManager.includes("Math.random")) fail("쓰나미 패턴에 고정 Seed 밖의 랜덤 호출이 있음");
if (!uiScene.includes("breathManager?.getSnapshot") || !uiScene.includes("screenEffectStrength")) {
  fail("숨 HUD 또는 화면 효과 강도 설정이 없음");
}
if (!playtestManager.includes("getNormalizedProgress") || !playtestManager.includes("maxProgressX")) {
  fail("역방향 플레이테스트 진행도와 원시 좌표 계측이 함께 남지 않음");
}
if (!bossController.includes("telegraphMultiplier") || !scoreManager.includes("overrideAmount")) {
  fail("쉬운 모드 보스 예고 연장 또는 낭떠러지 점수 보호가 없음");
}
if (levelLoader.includes("terrainBodies.clear(true, true)")) {
  fail("Scene 종료 시 정적 지형 그룹을 중복 정리함");
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
if (!enemyManager.includes('"warning"') || !enemyManager.includes('"defeated"') || !bossRuntime.includes('"hurt"')) {
  fail("적 경고·처치 또는 보스 피격 애니메이션 상태 연결이 없음");
}
if (!enemyAnimator.includes("frameRate: 1000")) fail("적 프레임별 duration 등록이 없음");
if (menuScene.includes("GRAYBOX")) fail("메뉴에 Graybox 표기가 남아 있음");
if (!(levelLoader.includes("add.tileSprite") || levelLoader.includes("createMirroredBackgroundTiles")) || !levelLoader.includes("setBackgroundMood")) {
  fail("패럴랙스 배경 반복 처리 또는 무드 전환이 없음");
}
if (!gameScene.includes("setBackgroundMood(section?.mood)")) fail("섹션 mood가 배경 전환에 연결되지 않음");
const bossDefeatBlock = levelLoader.slice(levelLoader.indexOf("if (hp <= 0)"), levelLoader.indexOf("return true;", levelLoader.indexOf("if (hp <= 0)")));
if (bossDefeatBlock.indexOf("this.spawnGate()") > bossDefeatBlock.indexOf("EVENTS.BOSS_DEFEATED")) {
  fail("보스 처치 이벤트보다 게이트가 먼저 생성되지 않아 게이트 충돌 연결이 누락될 수 있음");
}
if (!gameScene.includes("transformationManager?.cancelPresentation()") || !transformManager.includes("flashEffect?.reset?.()")) {
  fail("보스 처치 시 남은 변신 플래시를 해제하는 경로가 없음");
}
if (!transformManager.includes("this.scene?.cameras?.main")) {
  fail("장면 종료 중 카메라가 먼저 제거되는 경우를 변신 연출 정리가 처리하지 못함");
}
if (!gameScene.includes("BOSS_CLEAR_DELAY_MS") || !gameScene.includes("this.handleGateEntered()")) {
  fail("보스 처치 애니메이션 이후 자동 클리어 전환 경로가 없음");
}
if ([enemyManager, bossRuntime].some((source) => source.includes("Math.random"))) fail("고정 Seed 밖의 랜덤 호출이 있음");
if ([gameScene, player].some((source) => source.includes("Phaser.Math.MoveTowards"))) {
  fail("현재 Phaser 버전에 없는 Math.MoveTowards 호출이 있음");
}
if (/#[0-9a-f]{6}\b|0x[0-9a-f]{6}\b/i.test([
  gameScene,
  levelLoader,
  enemyManager,
  bossRuntime,
  transformManager,
  particleEffects,
  environmentManager,
  breathManager
].join("\n"))) {
  fail("Core Mechanics 소스에 직접 색상 값이 있음");
}

if (errors.length) {
  console.error(`Core Mechanics 검증 실패 (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Core Mechanics 구조 검증 통과: ${root}`);
