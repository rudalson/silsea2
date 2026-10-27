import { game } from "../src/main.js";
import { gameConfig } from "../src/config/gameConfig.js";
import { getStageCollectible, getCollectibleGoalText } from "../src/data/stageCollectibles.js";
import { expandLevelItems } from "../src/data/levelInteractions.js";
import { ScoreManager } from "../src/systems/ScoreManager.js";

gameConfig.fps = { target: 60, forceSetTimeOut: true };
const button = document.querySelector("#run"), output = document.querySelector("#results");
const neutral = { moveX: 0, moveY: 0, jumpDown: false, jumpPressed: false, jumpReleased: false, specialDown: false };
const frame = () => new Promise(resolve => game.events.once("step", resolve));
const frames = async n => { for (let i = 0; i < n; i++) await frame(); };
const until = async (check, label, limit = 18000) => {
  const started = performance.now();
  while (performance.now() - started < limit) { if (check()) return; await frame(); }
  throw new Error(`Timeout: ${label}`);
};
const log = text => { output.textContent += text + "\n"; };
const assert = (value, label) => { if (!value) throw new Error(label); log(`PASS ${label}`); };
const openLevel = async (id, easy) => {
  const previous = game.scene.getScene("GameScene")?.player;
  const active = game.scene.isActive("ClearScene") ? game.scene.getScene("ClearScene") : game.scene.getScene("GameScene");
  game.scene.stop("UIScene");
  game.registry.set("easyMode", easy); game.registry.set("levelId", id);
  active.scene.start("PreloadScene", { levelId: id });
  await until(() => { const scene = game.scene.getScene("GameScene");
    return scene?.sys.isActive() && scene.level?.id === id && scene.player !== previous && scene.player?.active && game.scene.isActive("UIScene");
  }, `${id} 로드`);
  const scene = game.scene.getScene("GameScene"); scene.inputManager.sample = () => ({ ...neutral });
  await frames(2); return scene;
};

async function run() {
  button.disabled = true; output.textContent = "5개 스테이지 × 보통/쉬움 수집·자석·HUD·목표·결과 검사\n";
  const saved = localStorage.getItem("silsea:progress:v1");
  try {
    for (const easy of [false, true]) for (const number of [7, 8, 9, 10, 11]) {
      const id = `level-${String(number).padStart(2, "0")}`, scene = await openLevel(id, easy);
      const ui = game.scene.getScene("UIScene"), theme = getStageCollectible(scene.level);
      const fallback = game.registry.get("forceAssetFallback"), items = scene.levelLoader.collectibles.filter(item => item.type === "star");
      const label = `${scene.level.name}/${easy ? "쉬움" : "보통"}`;
      const art = item => item.visuals.find(visual => visual.texture?.key === theme.key);
      assert(items.length === expandLevelItems(scene.level.items).filter(item => item.type === "star").length
        && items.every(item => fallback ? item.visuals.some(visual => visual.type === "Graphics") : art(item)), `${label} 전용 모양·기존 배치 개수`);
      assert(ui.objectiveText.text === getCollectibleGoalText(scene.level, 0)
        && (fallback ? ui.collectibleIcon.type === "Graphics" : ui.collectibleIcon.texture.key === theme.key), `${label} 수집물 이름·HUD 아이콘·실제 목표`);

      const target = scene.level.objectives.optional.find(goal => goal.type === "collect_stars").count;
      scene.objectiveManager.addStars(target - 1);
      const touch = items[0], before = scene.objectiveManager.context.starCount;
      scene.player.body.reset(touch.x, touch.y + 20); scene.player.setVelocity(0, 0);
      await until(() => !touch.active, `${label} 실제 접촉 수집`);
      await frames(2);
      const collected = scene.objectiveManager.context.starCount - before, expected = new ScoreManager();
      for (let i = 0; i < collected; i++) expected.collect("star");
      assert(collected >= 1 && scene.scoreManager.score === expected.score, `${label} 접촉 수집·기존 점수/콤보`);
      assert(ui.objectiveText.text === getCollectibleGoalText(scene.level, scene.objectiveManager.context.starCount)
        && scene.objectiveManager.getSnapshot().some(goal => goal.type === "collect_stars" && goal.complete), `${label} 실제 수집 뒤 HUD 증가·목표 달성`);

      const magnetic = items.find(item => item.active && item.x > touch.x + 300);
      scene.transformationManager.cancelPresentation(); scene.transformationManager.setForm("unicorn", false);
      scene.player.body.reset(magnetic.x - 130, magnetic.y + 45); scene.player.setVelocity(0, 0);
      const oldX = magnetic.x;
      await until(() => magnetic.magnetizing && magnetic.x !== oldX, `${label} 자석 이동`, 2000);
      assert(fallback || art(magnetic), `${label} 자석으로 끌리는 중에도 전용 모양 유지`);
      await until(() => !magnetic.active, `${label} 자석 수집`, 2000);
      assert(!magnetic.active, `${label} 자석 수집 완료`);

      for (const key of ["UIScene", "GameScene"]) game.scene.stop(key);
      game.scene.start("ClearScene", { levelId: id, characterId: scene.character.id, elapsed: 30, score: expected.score,
        achieved: ["collect_stars"] });
      await until(() => game.scene.isActive("ClearScene"), `${label} 결과 화면`); await frames(3);
      const clear = game.scene.getScene("ClearScene"), card = clear.celebrations.cards[0];
      assert(card.title === `${theme.name} 수집가` && card.detail.includes(theme.name)
        && clear.resultStickerLayout.some(sticker => sticker.key === "collect_stars" && sticker.textureKey === theme.key), `${label} 결과 카드·스티커 이름/모양 일치`);
    }
    assert(localStorage.getItem("silsea:progress:v1") === saved, "사용자 기존 진행 기록 보존");
    button.textContent = "검증 완료"; log("COMPLETE — 5개 코스 양 난이도 전용 수집물·자석·HUD·목표·결과 통과");
  } catch (error) {
    button.textContent = "검증 실패"; log(`FAIL ${error.stack ?? error}`);
    const loading = game.scene.getScene("PreloadScene"), scene = game.scene.getScene("GameScene");
    log(`STATE ${JSON.stringify({ loader: loading.sys.settings.status, loadingId: loading.levelId, loadState: loading.load.state,
      pending: loading.load.list.entries.map(file => file.key), inflight: loading.load.inflight.entries.map(file => file.key),
      game: scene.sys.settings.status, gameId: scene.level?.id, ui: game.scene.isActive("UIScene") })}`);
  }
}

async function preview(scene, result = false) {
  const theme = getStageCollectible(scene.level);
  if (result) {
    const id = scene.level.id, characterId = scene.character.id;
    for (const key of ["UIScene", "GameScene"]) game.scene.stop(key);
    game.scene.start("ClearScene", { levelId: id, characterId, elapsed: 54.2, score: 340,
      achieved: ["collect_stars", "find_secrets", "clear_time"] });
    await until(() => game.scene.isActive("ClearScene"), "검수용 결과 화면");
    await frames(90); game.scene.getScene("ClearScene").scene.pause();
  } else {
    scene.inputManager.sample = () => ({ ...neutral });
    scene.player.body.reset(160, 574); scene.player.setVelocity(0, 0);
    scene.cameras.main.stopFollow(); scene.cameras.main.setZoom(1.5).centerOn(430, 410);
    await frames(60); scene.scene.pause();
  }
  document.querySelector("#checks").hidden = true; document.title = `${theme.name} · ${result ? "결과" : "게임"}`;
}
const ready = setInterval(() => {
  const scene = game?.scene.getScene("GameScene"); if (!scene?.player?.active) return;
  clearInterval(ready);
  const mode = new URLSearchParams(location.search).get("collectiblePreview");
  if (["field", "result"].includes(mode)) { preview(scene, mode === "result").catch(error => { output.textContent = error.stack; }); return; }
  button.disabled = false; button.textContent = "스테이지 수집물 검증 실행";
  output.textContent = "수집물·자석·HUD·목표·결과 카드 검증. 기존 저장은 변경하지 않습니다.";
  button.addEventListener("click", run, { once: true });
}, 100);
