import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { WAVE_CRAB_RULES, WaveCrabController } from "../src/systems/WaveCrabController.js";
import { getEnemyAnimationSpec, getEnemySequenceNames } from "../src/data/enemyAnimations.js";
import { SCORE_VALUES } from "../src/data/gameplay.js";
import level from "../src/data/levels/level-04.js";

function fixture({ canRush = true, easy = false, terrain = [{ x: 0, y: 576, width: 1280 }] } = {}) {
  const values = { type: "wave_crab", spawnX: 600, patrol: 112, canRush, state: "idle", stateUntil: 0, usesArt: true };
  const scene = {
    cameras: { main: { worldView: { left: 0, right: 1280, top: 0, bottom: 720 } } },
    anims: { exists: () => true }, updateAccessibleStatus: () => {}
  };
  const enemy = {
    x: 600, y: 576, active: true, scene, flipX: false,
    body: { enable: true, width: 72, bottom: 576, velocity: { x: 0 }, blocked: { left: false, right: false },
      setVelocityX(x) { this.velocity.x = x; } },
    getData: key => values[key],
    setData(key, value) { if (typeof key === "object") Object.assign(values, key); else values[key] = value; return this; },
    setFlipX(value) { this.flipX = value; },
    play(key) { this.animation = key; }
  };
  const player = { x: 450, y: 576 };
  return { enemy, player, scene, controller: new WaveCrabController(scene, player, { terrainObjects: terrain }, easy) };
}

const first = fixture({ canRush: false });
first.controller.update(first.enemy, 0, 16);
assert.equal(first.enemy.getData("state"), "idle", "the first crab only patrols");
assert.ok(first.enemy.body.velocity.x < 0);

const normal = fixture();
normal.controller.update(normal.enemy, 0, 16);
assert.equal(normal.enemy.getData("state"), "telegraph");
assert.equal(normal.enemy.body.velocity.x, 0, "raising claws stops the crab");
assert.equal(normal.enemy.getData("stateUntil"), WAVE_CRAB_RULES.warningMs);
assert.equal(normal.enemy.animation, "enemy:wave_crab:warning");
normal.player.x = 750;
normal.controller.update(normal.enemy, WAVE_CRAB_RULES.warningMs, 16);
assert.equal(normal.enemy.getData("state"), "rush");
assert.ok(normal.enemy.body.velocity.x < 0, "rush keeps the announced direction");
normal.enemy.x = 515;
normal.controller.update(normal.enemy, WAVE_CRAB_RULES.warningMs + 250, 16);
assert.equal(normal.enemy.getData("state"), "recover", "rush ends after its distance limit");
assert.equal(normal.enemy.body.velocity.x, 0);
const readyAt = normal.enemy.getData("attackReadyAt");
normal.controller.update(normal.enemy, normal.enemy.getData("stateUntil"), 16);
assert.equal(normal.enemy.getData("state"), "idle");
assert.ok(readyAt > normal.enemy.getData("stateUntil"), "recovery has a cooldown");

const twoStep = fixture();
twoStep.controller.update(twoStep.enemy, 0, 16);
twoStep.controller.update(twoStep.enemy, WAVE_CRAB_RULES.warningMs, 16);
twoStep.enemy.x = 544;
twoStep.controller.update(twoStep.enemy, WAVE_CRAB_RULES.warningMs + 200, 16);
assert.equal(twoStep.enemy.getData("state"), "reaim", "a short first dash leaves room for a second strike");
assert.equal(twoStep.enemy.getData("rushDirection"), -1);

const agile = fixture();
agile.controller.update(agile.enemy, 0, 16);
agile.controller.update(agile.enemy, WAVE_CRAB_RULES.warningMs, 16);
agile.enemy.x = 515;
agile.player.x = 650; // The player evades behind the first dash.
agile.controller.update(agile.enemy, WAVE_CRAB_RULES.warningMs + 250, 16);
assert.equal(agile.enemy.getData("state"), "reaim", "a nearby dodge can trigger a second, warned strike");
assert.equal(agile.enemy.body.velocity.x, 0, "the crab brakes before changing direction");
assert.equal(agile.enemy.getData("rushDirection"), 1);
assert.equal(agile.enemy.flipX, true, "raised claws show the second direction");
assert.equal(agile.enemy.animation, "enemy:wave_crab:warning");
agile.player.x = 440;
agile.controller.update(agile.enemy, agile.enemy.getData("stateUntil") - 1, 16);
assert.equal(agile.enemy.getData("state"), "reaim", "the player can react during the second warning");
const followupAt = agile.enemy.getData("stateUntil");
agile.controller.update(agile.enemy, followupAt, 16);
assert.equal(agile.enemy.getData("state"), "rush");
assert.ok(agile.enemy.body.velocity.x > 0, "second rush keeps its warned direction");
assert.ok(agile.enemy.body.velocity.x > WAVE_CRAB_RULES.rushSpeed, "second rush is quicker and shorter");
agile.enemy.x = 570;
agile.controller.update(agile.enemy, followupAt + 150, 16);
assert.equal(agile.enemy.getData("state"), "recover", "the two-step attack does not chain indefinitely");

const easy = fixture({ easy: true });
easy.controller.update(easy.enemy, 0, 16);
assert.ok(easy.enemy.getData("stateUntil") > WAVE_CRAB_RULES.warningMs);
easy.controller.update(easy.enemy, easy.enemy.getData("stateUntil"), 16);
assert.ok(Math.abs(easy.enemy.body.velocity.x) < WAVE_CRAB_RULES.rushSpeed);
easy.enemy.x = 515;
easy.player.x = 650;
easy.controller.update(easy.enemy, easy.enemy.getData("stateUntil") - WAVE_CRAB_RULES.rushMs + 250, 16);
assert.equal(easy.enemy.getData("state"), "recover", "easy mode keeps one dash");

const offscreen = fixture();
offscreen.controller.update(offscreen.enemy, 0, 16);
offscreen.scene.cameras.main.worldView.left = 1000;
offscreen.controller.update(offscreen.enemy, WAVE_CRAB_RULES.warningMs, 16);
assert.equal(offscreen.enemy.getData("state"), "recover", "off-screen warning never becomes an attack");

const offscreenFollowup = fixture();
offscreenFollowup.controller.update(offscreenFollowup.enemy, 0, 16);
offscreenFollowup.controller.update(offscreenFollowup.enemy, WAVE_CRAB_RULES.warningMs, 16);
offscreenFollowup.enemy.x = 544;
offscreenFollowup.controller.update(offscreenFollowup.enemy, WAVE_CRAB_RULES.warningMs + 200, 16);
offscreenFollowup.scene.cameras.main.worldView.left = 1000;
offscreenFollowup.controller.update(offscreenFollowup.enemy, offscreenFollowup.enemy.getData("stateUntil"), 16);
assert.equal(offscreenFollowup.enemy.getData("state"), "recover", "off-screen second warning cannot dash");

const edge = fixture({ terrain: [{ x: 500, y: 576, width: 780 }] });
edge.controller.update(edge.enemy, 0, 16);
edge.enemy.x = 535;
edge.controller.update(edge.enemy, WAVE_CRAB_RULES.warningMs, 16);
assert.equal(edge.enemy.getData("state"), "recover", "rush cannot cross a missing floor");

assert.ok(SCORE_VALUES.wave_crab > 0);
assert.ok(level.enemies.every(enemy => enemy.type !== "raw_potato" && enemy.type !== "potato_archer"));
assert.ok(level.enemies.every(enemy => enemy.type !== "wave_crab" || enemy.id === "e_tsunami_hill" || enemy.canRush !== false));
assert.equal(level.enemies.find(enemy => enemy.id === "e_tsunami_hill")?.canRush, false);
const manifest = JSON.parse(await readFile(new URL("../assets/manifest.json", import.meta.url), "utf8"));
for (const sequence of getEnemySequenceNames("wave_crab")) {
  const spec = getEnemyAnimationSpec("wave_crab", sequence);
  const entry = manifest.assets.find(asset => asset.key === spec.textureKey);
  assert.equal(entry.frames, spec.durations.length);
  const metadata = await sharp(fileURLToPath(new URL(`..${entry.url}`, import.meta.url))).metadata();
  assert.equal(metadata.width, entry.frames * 128);
  assert.equal(metadata.height, 128);
  assert.equal(metadata.hasAlpha, true);
}
console.log("Wave crab passed: first patrol, warned two-step reversal, locked direction, cooldown, easy mode, ground edge, off-screen cancellation and RGBA sheets.");
