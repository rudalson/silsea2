import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { MistEnemyController } from "../src/systems/MistEnemyController.js";
import { getEnemyAnimationSpec, getEnemySequenceNames } from "../src/data/enemyAnimations.js";
import { SCORE_VALUES } from "../src/data/gameplay.js";
import level from "../src/data/levels/level-03.js";

function fixture(type, { easy = false, terrain = [{ x: 0, y: 576, width: 1280 }] } = {}) {
  const values = { type, spawnX: 600, patrol: 160, state: "idle", stateUntil: 0, usesArt: true };
  const scene = { cameras: { main: { worldView: { left: 0, right: 1280, top: 0, bottom: 720 } } }, anims: { exists: () => true }, updateAccessibleStatus: () => {} };
  const enemy = {
    x: 600, y: 576, active: true, scene, flipX: false, animation: null,
    body: { enable: true, width: 58, bottom: 576, velocity: { x: 0 }, blocked: { left: false, right: false },
      setVelocityX(x) { this.velocity.x = x; } },
    getData: key => values[key],
    setData(key, value) { if (typeof key === "object") Object.assign(values, key); else values[key] = value; return this; },
    setFlipX(value) { this.flipX = value; },
    play(key) { this.animation = key; }
  };
  const player = { x: 450, y: 576 };
  const shots = [];
  return { enemy, player, scene, shots, controller: new MistEnemyController(scene, player,
    { terrainObjects: terrain }, easy, shot => shots.push(shot)) };
}

for (const type of ["lantern_goblin", "dew_snail"]) {
  const { enemy, player, controller, scene, shots } = fixture(type);
  controller.update(enemy, 0, 16);
  assert.equal(enemy.getData("state"), "telegraph");
  assert.equal(enemy.body.velocity.x, 0, "warning must stop the enemy");
  const warningUntil = enemy.getData("stateUntil");
  assert.ok(warningUntil >= 1100, "children have at least 1.1 seconds to read the cue");
  player.x = 750;
  controller.update(enemy, warningUntil - 1, 16);
  assert.equal(enemy.getData("state"), "telegraph");
  controller.update(enemy, warningUntil, 16);
  if (type === "lantern_goblin") {
    assert.equal(enemy.getData("state"), "firing");
    assert.equal(enemy.body.velocity.x, 0, "goblin holds still to fire instead of rushing");
    assert.equal(shots.length, 1);
    assert.ok(shots[0].velocityX < 0, "light follows the announced side without tracking the player");
    assert.equal(shots[0].y, 542, "low horizontal light can be jumped over");
    assert.ok(Math.abs(Math.abs(shots[0].velocityX) * (shots[0].expiresAt - warningUntil) / 1000 - 320) < 0.001);
    controller.update(enemy, warningUntil + 100, 16);
    assert.equal(shots.length, 1, "firing phase emits exactly one light");
    controller.update(enemy, warningUntil + 380, 16);
  } else {
    assert.equal(enemy.getData("state"), "rush");
    assert.ok(enemy.body.velocity.x < 0, "roll keeps its announced direction");
    assert.equal(shots.length, 0, "snail remains a rolling enemy");
    enemy.x = 505;
    controller.update(enemy, warningUntil + 200, 16);
  }
  assert.equal(enemy.getData("state"), "recover", "short attack stops after its distance limit");
  assert.equal(enemy.body.velocity.x, 0);
  const recoverUntil = enemy.getData("stateUntil");
  controller.update(enemy, recoverUntil, 16);
  assert.equal(enemy.getData("state"), "idle", "cooldown must not chain straight into another attack");
  enemy.x = 700; player.x = 850;
  controller.update(enemy, enemy.getData("attackReadyAt"), 16);
  assert.equal(enemy.getData("state"), "telegraph");
  assert.equal(enemy.flipX, true, "right-facing attacks mirror left-facing source art");
  scene.cameras.main.worldView.left = 1000;
  const shotCount = shots.length;
  controller.update(enemy, enemy.getData("stateUntil"), 16);
  assert.equal(enemy.getData("state"), "recover", "off-screen warning cannot become a surprise attack");
  assert.equal(shots.length, shotCount, "off-screen warnings do not emit a light");

  const normal = fixture(type), easy = fixture(type, { easy: true });
  normal.controller.update(normal.enemy, 0, 16); easy.controller.update(easy.enemy, 0, 16);
  assert.ok(easy.enemy.getData("stateUntil") > normal.enemy.getData("stateUntil"));
  normal.controller.update(normal.enemy, normal.enemy.getData("stateUntil"), 16);
  easy.controller.update(easy.enemy, easy.enemy.getData("stateUntil"), 16);
  if (type === "lantern_goblin") {
    assert.ok(Math.abs(easy.shots[0].velocityX) < Math.abs(normal.shots[0].velocityX));
  } else assert.ok(Math.abs(easy.enemy.body.velocity.x) < Math.abs(normal.enemy.body.velocity.x));

  const edge = fixture(type, { terrain: [{ x: 560, y: 576, width: 720 }] });
  edge.controller.update(edge.enemy, 0, 16);
  edge.enemy.x = 595; // Player's side is now beyond the supporting edge.
  edge.controller.update(edge.enemy, edge.enemy.getData("stateUntil"), 16);
  assert.equal(edge.enemy.getData("state"), type === "lantern_goblin" ? "firing" : "recover");
  assert.equal(edge.enemy.body.velocity.x, 0, "goblin fires across a pit; snail stops before it");

  const defeated = fixture(type);
  defeated.controller.update(defeated.enemy, 0, 16);
  defeated.enemy.body.enable = false;
  defeated.controller.update(defeated.enemy, defeated.enemy.getData("stateUntil"), 16);
  assert.equal(defeated.shots.length, 0, "defeating a charging goblin cancels the shot");

  const far = fixture(type); far.player.x = 0;
  far.enemy.x = 440;
  far.controller.update(far.enemy, 0, 16);
  assert.ok(far.enemy.body.velocity.x > 0, "patrol turns at the left boundary");
  far.enemy.x = 760;
  far.controller.update(far.enemy, 16, 16);
  assert.ok(far.enemy.body.velocity.x < 0, "patrol turns at the right boundary");

  assert.ok(SCORE_VALUES[type] > 0);
  assert.ok(level.enemies.some(enemy => enemy.type === type));
  for (const sequence of getEnemySequenceNames(type)) {
    const spec = getEnemyAnimationSpec(type, sequence);
    const manifest = JSON.parse(await readFile(new URL("../assets/manifest.json", import.meta.url), "utf8"));
    const entry = manifest.assets.find(asset => asset.key === spec.textureKey);
    assert.equal(entry.frames, spec.durations.length);
    const metadata = await sharp(fileURLToPath(new URL(`..${entry.url}`, import.meta.url))).metadata();
    assert.equal(metadata.width, entry.frames * 128);
    assert.equal(metadata.height, 128);
    assert.equal(metadata.hasAlpha, true);
  }
}
assert.equal(level.enemies.some(enemy => enemy.type === "raw_potato"), false);
assert.equal(level.hazards.some(hazard => hazard.type === "spike_pumpkin"), false);
const light = await sharp(fileURLToPath(new URL("../assets/projectiles/projectile_lantern_light.png", import.meta.url))).metadata();
assert.equal(light.width, 80); assert.equal(light.height, 48); assert.equal(light.hasAlpha, true);
console.log("Mist enemies passed: single lantern shot, locked direction/range, stationary firing, bounded snail roll, warning cancellation, cooldown, easy mode and RGBA art.");
