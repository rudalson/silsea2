// Dev-only: set visualReview=level-02..05 and section to a real field section.
// Each new encounter starts at its checkpoint with the abilities learned before it.
// Movement, collecting, hazards, breath and respawns then use real Phaser physics.
import { game } from "../src/main.js";
import { CAMPAIGN_PLAN } from "../src/data/levels/campaignExpansion.js";
import { EVENTS } from "../src/config/constants.js";
const button = document.querySelector("#run");
const output = document.querySelector("#results");
const neutral = { moveX: 0, moveY: 0, jumpDown: false, jumpPressed: false, jumpReleased: false, specialDown: false };
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
async function run(scene) {
  button.disabled = true;
  output.textContent = "";
  await new Promise((resolve) => {
    scene.events.once("create", resolve);
    scene.scene.restart({ levelId: scene.level.id, easyMode: scene.difficulty.enabled });
  });
  const plan = CAMPAIGN_PLAN[scene.level.id];
  const sign = scene.level.progression.direction === "left" ? -1 : 1;
  const water = scene.level.id === "level-05";
  const allTerrain = scene.levelLoader.getTerrainObjects();
  let hits = 0, respawns = 0;
  const hit = () => hits++;
  const respawn = () => respawns++;
  scene.events.on(EVENTS.PLAYER_HIT, hit);
  scene.events.on(EVENTS.PLAYER_RESPAWNED, respawn);
  try {
    for (const name of plan.names) {
      const section = scene.level.sections.find(({ id }) => id === name);
      const entry = scene.level.checkpoints.find(({ id }) => id === `${name}_start`);
      scene.player.body.reset(entry.x, entry.y - 2);
      scene.player.setVelocity(0, 0);
      scene.healthManager.restoreFull();
      scene.breathManager.restoreFull();
      scene.transformationManager.collect("horn", scene.time.now);
      scene.transformationManager.collect("wings", scene.time.now);
      scene.transformationManager.restoreFlight();
      const began = scene.time.now;
      const oldRespawns = respawns, oldHits = hits;
      let lastJump = false;
      const done = () => sign > 0 ? scene.player.x >= section.xEnd - 96 : scene.player.x <= section.xStart + 96;
      scene.inputManager.sample = () => {
        const p = scene.player, body = p.body;
        const grounded = body.blocked.down || body.touching.down;
        let moveX = sign, jump;
        if (water) {
          const ceiling = allTerrain.find((t) => t.y === 0 && p.x + 60 >= t.x && p.x - 35 <= t.x + t.width);
          const under = Boolean(ceiling);
          if (ceiling && p.x < ceiling.x && body.top < ceiling.height + 8) moveX = 0;
          // Paddle below a roof, otherwise rise through the open breathing shaft.
          const target = under ? ceiling.height + 96 : 276;
          jump = p.y > target && Math.floor((scene.time.now - began) / 200) % 2 === 0;
          if (!under && scene.breathManager.ratio < 0.9 && !scene.breathManager.contact.underwater) moveX = 0;
        } else {
          const manager = scene.transformationManager;
          const wall = allTerrain.some((t) => (sign > 0 ? t.x - body.right : body.left - t.x - t.width) >= -4
            && (sign > 0 ? t.x - body.right : body.left - t.x - t.width) < 100 && t.y < p.y && t.y + t.height > body.top);
          const hazard = scene.level.hazards.some((h) => h.type === "spike_pumpkin" && (h.x - p.x) * sign > 0 && (h.x - p.x) * sign < 150);
          jump = grounded ? wall || hazard : p.y > 400;
          // Recharge on solid ground, without bypassing damage or the actual gauge.
          if (grounded && manager.flightMs < 6500) { moveX = 0; jump = false; }
          if (grounded && lastJump) jump = false;
        }
        const input = { ...neutral, moveX, jumpDown: jump, jumpPressed: jump && !lastJump, jumpReleased: !jump && lastJump };
        lastJump = jump;
        return input;
      };
      while (!done()) {
        if (scene.time.now - began > 65000) throw new Error(`${name}: timeout x=${Math.round(scene.player.x)}, y=${Math.round(scene.player.y)}`);
        if (respawns - oldRespawns > 2) throw new Error(`${name}: repeated respawns`);
        button.textContent = `${name} x=${Math.round(scene.player.x)} · ${Math.round((scene.time.now - began) / 1000)}초`;
        await frame();
      }
      output.textContent += `PASS ${name}: ${Math.round((scene.time.now - began) / 1000)}s, hits=${hits - oldHits}, respawns=${respawns - oldRespawns}\n`;
    }
    output.textContent += `COMPLETE ${scene.level.id}, stars=${scene.objectiveManager.context.starCount}\n`;
    button.textContent = "검증 완료";
  } catch (error) { output.textContent += `FAIL ${error.message}\n`; button.textContent = "검증 실패"; }
  finally { scene.inputManager.sample = () => ({ ...neutral }); scene.events.off(EVENTS.PLAYER_HIT, hit); scene.events.off(EVENTS.PLAYER_RESPAWNED, respawn); }
}
const timer = setInterval(() => {
  const scene = game?.scene?.getScene("GameScene");
  if (!scene?.player?.active) return;
  clearInterval(timer);
  output.textContent = `${scene.level.id} 확장 구간 4개 물리 검사`;
  button.textContent = "검증 실행"; button.disabled = false;
  button.addEventListener("click", () => run(scene), { once: true });
}, 100);
