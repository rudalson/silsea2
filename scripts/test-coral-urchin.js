import assert from "node:assert/strict";
import { CoralUrchinController, CORAL_URCHIN_RULES } from "../src/systems/CoralUrchinController.js";
import level from "../src/data/levels/level-04.js";
import { getDifficultySettings } from "../src/systems/DifficultyManager.js";

function fixture(projectileDifficulty = {}) {
  const values = { type: "coral_urchin", state: "idle", stateUntil: 0, attackReadyAt: 0 };
  const line = {
    visible: false,
    clear() { return this; }, lineStyle() { return this; }, beginPath() { return this; },
    moveTo() { return this; }, lineTo() { return this; }, strokePath() { return this; },
    setDepth() { return this; }, setAlpha() { return this; },
    setVisible(value) { this.visible = value; return this; }
  };
  const scene = {
    cameras: { main: { worldView: { left: 0, right: 1280, top: 0, bottom: 720 } } },
    anims: { exists: () => true },
    add: { graphics: () => line },
    updateAccessibleStatus: () => {}
  };
  const hazard = {
    x: 600, y: 576, active: true, body: { enable: true }, scene,
    getData: key => values[key],
    setData(key, value) { if (typeof key === "object") Object.assign(values, key); else values[key] = value; return this; },
    setFlipX(value) { this.flipX = value; },
    play(key) { this.animation = key; }
  };
  const player = { x: 300, y: 576, body: { center: { x: 300, y: 530 } } };
  const shots = [];
  const controller = new CoralUrchinController(scene, player, projectileDifficulty, shot => shots.push(shot));
  return { scene, hazard, player, shots, controller, line };
}

const normal = fixture();
normal.controller.update(normal.hazard, 0);
assert.equal(normal.hazard.getData("state"), "telegraph");
assert.equal(normal.hazard.getData("stateUntil"), CORAL_URCHIN_RULES.warningMs);
assert.equal(normal.hazard.animation, "enemy:coral_urchin:warning");
assert.equal(normal.line.visible, true, "the player sees the aiming line");
normal.player.x = 900;
normal.player.body.center.x = 900;
normal.controller.update(normal.hazard, CORAL_URCHIN_RULES.warningMs - 1);
assert.equal(normal.shots.length, 0, "warning gives time to dodge");
normal.controller.update(normal.hazard, CORAL_URCHIN_RULES.warningMs);
assert.equal(normal.shots.length, 1);
assert.ok(normal.shots[0].velocityX < 0, "the water jet keeps the warned direction");
assert.ok(normal.shots[0].velocityY < 0, "the jet aims at the player's vertical position");
assert.equal(normal.hazard.getData("state"), "cooldown");
assert.equal(normal.line.visible, false);
normal.controller.update(normal.hazard, CORAL_URCHIN_RULES.warningMs + CORAL_URCHIN_RULES.cooldownMs - 1);
assert.equal(normal.shots.length, 1, "cooldown prevents repeated fire");
normal.controller.update(normal.hazard, CORAL_URCHIN_RULES.warningMs + CORAL_URCHIN_RULES.cooldownMs);
assert.equal(normal.hazard.getData("state"), "telegraph", "the next shot can aim at the new side");
assert.equal(normal.hazard.flipX, true);

const easy = fixture({ telegraphMultiplier: 1.5, speedMultiplier: 0.7, cooldownMultiplier: 1.5 });
easy.controller.update(easy.hazard, 0);
assert.equal(easy.hazard.getData("stateUntil"), CORAL_URCHIN_RULES.warningMs * 1.5);
easy.controller.update(easy.hazard, easy.hazard.getData("stateUntil"));
assert.ok(Math.hypot(easy.shots[0].velocityX, easy.shots[0].velocityY)
  < Math.hypot(normal.shots[0].velocityX, normal.shots[0].velocityY));
assert.ok(easy.hazard.getData("stateUntil") - CORAL_URCHIN_RULES.warningMs * 1.5
  > CORAL_URCHIN_RULES.cooldownMs);
const stageEasy = getDifficultySettings(level, true).environment.projectiles;
assert.ok(stageEasy.telegraphMultiplier > 1 && stageEasy.cooldownMultiplier > 1);
assert.ok(stageEasy.speedMultiplier < 1 && stageEasy.maxActive < 4);

const offscreen = fixture();
offscreen.controller.update(offscreen.hazard, 0);
offscreen.scene.cameras.main.worldView.left = 900;
offscreen.controller.update(offscreen.hazard, CORAL_URCHIN_RULES.warningMs);
assert.equal(offscreen.shots.length, 0, "an off-screen warning cannot fire a surprise shot");
assert.equal(offscreen.hazard.getData("state"), "idle");
assert.equal(offscreen.line.visible, false);

const far = fixture();
far.player.x = 0;
far.player.body.center.x = 0;
far.controller.update(far.hazard, 0);
assert.equal(far.hazard.getData("state"), "idle", "the urchin waits until the player approaches");

const wave = fixture();
wave.controller.update(wave.hazard, 0);
wave.controller.cancel(wave.hazard);
assert.equal(wave.hazard.getData("state"), "idle", "the warning can be cancelled when a tsunami pauses enemies");
assert.equal(wave.line.visible, false);
wave.hazard.setData("attackReadyAt", 2750);
wave.controller.update(wave.hazard, 2250);
assert.equal(wave.hazard.getData("state"), "idle", "the urchin waits after cancellation");
wave.controller.update(wave.hazard, 2750);
assert.equal(wave.hazard.getData("state"), "telegraph");

console.log("Coral urchin passed: aimed warning, dodgeable locked shot, cooldown, difficulty and warning cancellation.");
