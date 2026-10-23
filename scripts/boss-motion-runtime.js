import { game } from "../src/main.js";
import { SCENE_KEYS } from "../src/config/constants.js";
import { LEVELS } from "../src/data/levels/index.js";
import { BOSS_MOTION_PROFILES, identityBossPose } from "../src/data/bossMotion.js";
import { progressManager } from "../src/systems/ProgressManager.js";

const output = document.querySelector("#results"), button = document.querySelector("#run");
const neutral = { moveX: 0, moveY: 0, jumpDown: false, jumpPressed: false, jumpReleased: false, specialDown: false };
const frame = () => new Promise(resolve => game.events.once("step", resolve));
const frames = async count => { for (let i = 0; i < count; i++) await frame(); };
const until = async (check, label, limitMs = 22000) => {
  const start = performance.now();
  while (performance.now() - start < limitMs) { if (check()) return; await frame(); }
  throw Error(`Timeout: ${label}`);
};
const log = text => { output.textContent += text + "\n"; };
const assert = (value, text) => { if (!value) throw Error(text); log(`PASS ${text}`); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function run() {
  button.disabled = true; output.textContent = "새 5보스 실제 전투·표시 동작 검사 (필드 생략)\n";
  const saved = { data: progressManager.data, memory: progressManager.memory, storage: progressManager.storage };
  const storageBefore = localStorage.getItem("silsea:progress:v1"), temporary = new Map();
  progressManager.data = structuredClone(saved.data); progressManager.memory = structuredClone(saved.memory);
  progressManager.storage = { getItem: key => temporary.get(key) ?? null, setItem: (key, value) => temporary.set(key, value) };
  const savedSection = game.registry.get("visualReviewSectionId"), savedOffset = game.registry.get("visualReviewOffset");
  let scene, originalInput, monitor, restorePresentation;
  try {
    for (const level of LEVELS.filter(level => Object.hasOwn(BOSS_MOTION_PROFILES, level.sections.at(-1).boss?.key))) {
      if (!game.scene.isActive(SCENE_KEYS.GAME) || game.scene.getScene(SCENE_KEYS.GAME).level.id !== level.id) {
        game.registry.set("levelId", level.id); game.registry.set("visualReviewSectionId", null);
        game.scene.stop(SCENE_KEYS.CLEAR); game.scene.stop(SCENE_KEYS.GAME);
        game.scene.start(SCENE_KEYS.PRELOAD, { levelId: level.id });
        await until(() => game.scene.isActive(SCENE_KEYS.GAME) && game.scene.getScene(SCENE_KEYS.GAME).level?.id === level.id
          && game.scene.getScene(SCENE_KEYS.GAME).player?.active, "다음 대왕 로드");
      }
      scene = game.scene.getScene(SCENE_KEYS.GAME);
      const controller = { ...neutral }; originalInput = scene.inputManager.sample; scene.inputManager.sample = () => controller;
      const place = (x, y = 574) => {
        Object.assign(controller, neutral); scene.player.body.reset(x, y); scene.player.setVelocity(0, 0);
        scene.player.controlLockedUntil = 0; scene.player.bufferedJumpUntil = -Infinity;
      };
      const grounded = () => scene.player.body.velocity.y >= 0 && (scene.player.body.blocked.down || scene.player.body.touching.down);
      place(level.checkpoints.at(-1).x); await frames(8);
      const oldPresenter = scene.bossController.presentation;
      assert(await scene.levelHotReload.reload(), `${level.name} 재로드`);
      if (oldPresenter) assert(!oldPresenter.image.active, "이전 동작 이미지 제거");
      const boss = scene.levelLoader.boss, behavior = scene.bossController.behavior, presenter = scene.bossController.presentation;
      const key = boss.getData("key"), fallback = game.registry.get("forceAssetFallback"), reduced = game.registry.get("screenEffectStrength") === "reduced";
      assert(fallback ? presenter === null : Boolean(presenter?.image && !presenter.image.body && !boss.displayList), `${key} 표시/충돌 분리 또는 도형 모드`);
      const home = level.sections.at(-1).boss.spawn.x;
      const safeX = key === "hole_king" ? 15072 : key === "cloud_king" ? 17024 : home - (key === "music_king" ? 832 : 880);
      // Dormant bodies are disabled. Wait for activation and the first Arcade
      // step to apply the configured scale before recording the invariant.
      place(safeX); await until(() => behavior.state === "warning", "공격 준비 동작");
      const geometry = () => ({ width: boss.body.width, height: boss.body.height, sx: boss.scaleX, sy: boss.scaleY, ox: boss.originX, oy: boss.originY,
        x: boss.x, y: boss.y, angle: boss.angle, dx: boss.body.x - boss.x, dy: boss.body.y - boss.y });
      const invariant = geometry(), faults = new Set(), states = new Set(), poseSamples = new Map();
      if (presenter) {
        const originalUpdate = presenter.update;
        presenter.update = function (...args) {
          const before = geometry(); originalUpdate.apply(this, args);
          if (!same(before, geometry())) faults.add("presentation changed source geometry");
        };
        restorePresentation = () => { presenter.update = originalUpdate; };
      }
      let stopSamples = 0, dodgeColumns = null, dodgeTarget = 0, dodge = true;
      monitor = () => {
        states.add(behavior.state);
        const current = geometry();
        // Existing patrol/hover behavior legitimately moves the source and calls
        // Body.reset (whose offset is synchronized on the next physics step).
        // Check fixed shape across states and all geometry around presentation.
        for (const field of ["width", "height", "sx", "sy", "ox", "oy", "angle"]) {
          if (Math.abs(current[field] - invariant[field]) > 0.001) faults.add(`body ${field}: ${invariant[field]} → ${current[field]}`);
        }
        if (presenter) {
          if (presenter.image.texture.key !== boss.texture.key || presenter.image.frame.name !== boss.frame.name) faults.add("pose texture");
          if (presenter.image.visible !== boss.visible) faults.add("visibility");
          if (!poseSamples.has(behavior.state)) poseSamples.set(behavior.state, new Set());
          poseSamples.get(behavior.state).add(JSON.stringify(presenter.pose));
          if (reduced && !same(presenter.pose, identityBossPose())) faults.add("reduced motion");
          if (behavior.state === "rhythm" && behavior.rest?.phase === "stop") {
            stopSamples++; if (!same(presenter.pose, identityBossPose())) faults.add("five second rest motion");
          }
        }
        if (key === "cloud_king" && dodge) {
          if (behavior.state === "warning" && behavior.action === "rain") {
            if (dodgeColumns !== behavior.columns) { dodgeColumns = behavior.columns; dodgeTarget = Math.min(behavior.section.xEnd - 140, behavior.columns[Math.floor(behavior.columns.length / 2)] + 96); }
            controller.moveX = Math.abs(scene.player.x - dodgeTarget) < 8 ? 0 : Math.sign(dodgeTarget - scene.player.x);
          } else controller.moveX = 0;
        }
      };
      scene.events.on("postupdate", monitor);
      if (presenter) {
        const paused = presenter.getSnapshot(), bounds = geometry();
        scene.scene.pause(); await new Promise(resolve => setTimeout(resolve, 250));
        assert(same(paused, presenter.getSnapshot()) && same(bounds, geometry()), "일시정지 중 표시·충돌 시간 보존"); scene.scene.resume();
        if (!reduced) {
          scene.registry.set("screenEffectStrength", "reduced"); await frames(2);
          assert(same(presenter.pose, identityBossPose()), "효과 감소 즉시 정지"); scene.registry.set("screenEffectStrength", "normal");
        }
      }
      for (let phase = 1; phase <= 3; phase++) {
        await until(() => behavior.state === "vulnerable", "공격 후 약점 동작", 30000); dodge = false; Object.assign(controller, neutral);
        assert(boss.getData("hp") === 4 - phase, "표시 동작이 보스 HP를 바꾸지 않음");
        controller.moveX = 1; await until(() => scene.player.x >= boss.x - 224, "머리 접근", 4500); await until(grounded, "접지", 1500);
        controller.jumpDown = controller.jumpPressed = true; await frames(1); controller.jumpPressed = false;
        await until(() => boss.getData("hp") === 3 - phase, "실제 기본 점프 타격", 2500);
        Object.assign(controller, neutral); await frames(3); assert(boss.getData("hp") === 3 - phase, `기본 점프 ${phase}타격·중복 피해 없음`);
        if (phase < 3) { place(safeX); dodge = true; }
      }
      if (presenter) {
        await until(() => presenter.elapsedMs >= 950, "처치 후 마무리 동작", 3000);
        assert(reduced ? same(presenter.pose, identityBossPose()) : presenter.pose.scaleY < 1 && presenter.pose.alpha < 1, "처치 후 비활성 보스의 표시 마무리");
        assert(reduced || [...poseSamples.values()].some(samples => samples.size > 8), reduced ? "효과 감소에서 추가 변형 없음" : "상태 안에서 실제 표시 프레임 변화");
        if (key === "music_king") assert(stopSamples > 20, "음악 대왕 5초 정지 중 동작 정지");
        assert(scene.children.list.filter(object => object.name === `boss-motion-${key}`).length === 1, "중복 동작 이미지 없음");
      }
      assert(faults.size === 0 && states.has("attack") && states.has("vulnerable") && states.has("defeated"), `${key} 충돌 불변·상태 표시 동기화 ${[...faults]}`);
      scene.events.off("postupdate", monitor); monitor = null;
      restorePresentation?.(); restorePresentation = null;
      scene.inputManager.sample = () => controller;
      await until(() => scene.levelLoader.gate?.lifecycle?.phase === "active", "게이트 활성"); place(level.exit.x);
      await until(() => game.scene.isActive(SCENE_KEYS.CLEAR), "실제 게이트 진입");
      assert(progressManager.get(level.id).cleared, `${level.id} 클리어 임시 저장`);
      if (presenter) assert(!presenter.image.active, "Scene 종료 후 동작 이미지 정리");
      log(`DONE ${level.name}`); originalInput = null;
    }
    assert(localStorage.getItem("silsea:progress:v1") === storageBefore, "사용자 기존 저장 기록 보존");
    button.textContent = "검증 완료"; log("COMPLETE — 5보스 15타격·충돌 불변·동작·정지·재로드·처치·게이트·정리 확인");
  } catch (error) {
    scene?.scene.resume(); button.textContent = "검증 실패"; log(`FAIL ${error.stack ?? error}`);
    log(`STATE ${JSON.stringify({ level: scene?.level?.id, boss: scene?.bossController?.behavior?.state, hp: scene?.levelLoader?.boss?.getData("hp"), x: scene?.player?.x, y: scene?.player?.y })}`);
  } finally {
    if (scene?.events && monitor) scene.events.off("postupdate", monitor);
    restorePresentation?.();
    if (scene?.inputManager && originalInput) scene.inputManager.sample = originalInput;
    Object.assign(progressManager, saved); game.registry.set("visualReviewSectionId", savedSection); game.registry.set("visualReviewOffset", savedOffset);
  }
}
const ready = setInterval(() => {
  const scene = game?.scene?.getScene(SCENE_KEYS.GAME); if (!scene?.player?.active) return; clearInterval(ready);
  if (!scene.levelHotReload) { output.textContent = "?visualReview=level-07&debug=1&mute=1로 열어 주세요."; return; }
  button.disabled = false; button.textContent = "5보스 동작 검증 실행";
  output.textContent = "실제 전투 15타격과 표시/충돌 분리 검사. 사용자 저장은 변경하지 않습니다.";
  button.addEventListener("click", run, { once: true });
}, 100);
