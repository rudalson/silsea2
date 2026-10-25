import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { EVENTS } from "../src/config/constants.js";
import { resolveBossPhase } from "../src/data/bossDefinitions.js";
import { MerongKingBehavior } from "../src/systems/bosses/MerongKingBehavior.js";
import { TapeKingBehavior } from "../src/systems/bosses/TapeKingBehavior.js";
import { MusicKingBehavior } from "../src/systems/bosses/MusicKingBehavior.js";
import { HoleKingBehavior } from "../src/systems/bosses/HoleKingBehavior.js";
import { CloudKingBehavior } from "../src/systems/bosses/CloudKingBehavior.js";

function display() {
  const object = { active: true, visible: true, destroy() { this.active = false; } };
  for (const key of ["setOrigin", "setDepth", "setText", "setColor", "setStrokeStyle", "setAlpha", "fillStyle",
    "fillEllipse", "fillCircle", "fillRect", "fillRoundedRect", "lineStyle", "strokeEllipse", "strokeCircle",
    "strokeRect", "strokeRoundedRect", "lineBetween", "clear"]) object[key] = () => object;
  object.setPosition = (x, y) => { Object.assign(object, { x, y }); return object; };
  object.setVisible = value => { object.visible = value; return object; };
  return object;
}

function fixture(Behavior, easyMode) {
  const data = { section: { xStart: 0, xEnd: 2400 }, hp: 3, maxHp: 3, phase: 1, usesArt: false };
  const boss = { x: 1800, y: 576, active: true, getData: key => data[key],
    setData(key, value) { typeof key === "object" ? Object.assign(data, key) : data[key] = value; return this; },
    setVisible() { return this; }, setFlipX() { return this; }, setActive(value) { this.active = value; return this; },
    body: { enable: true, top: 470, reset(x, y) { Object.assign(boss, { x, y }); } } };
  const player = { x: 1000, body: { enable: true, left: 978, right: 1022, top: 518, bottom: 576 } };
  const mechanics = { sticky: new Map(), holes: [600, 1100].map((x, index) => ({
    config: { id: `boss_hole_${index}`, controller: "hole_king", x, y: 576, width: 256 },
    phase: "closed", platform: { body: { enable: true } }
  })), setTransientStickyZones(owner, zones) { this.sticky.set(owner, zones); },
  clearTransientStickyZones(owner) { this.sticky.delete(owner); },
  setControlledHoles(_controller, ids, phase) { for (const hole of this.holes) {
    hole.phase = ids.includes(hole.config.id) ? phase : "closed";
    hole.platform.body.enable = hole.phase !== "open";
  } } };
  const scene = { events: new EventEmitter(), add: { graphics: display, star: display, text: display }, courseMechanics: mechanics };
  let awards = 0;
  const behavior = new Behavior({ scene, player, levelLoader: { boss }, healthManager: { takeDamage() {} },
    transformationManager: { scoreMultiplier: 1, transforming: false, canGuardProjectile: () => false },
    scoreManager: { defeat() { awards++; } }, easyMode, telegraphMultiplier: easyMode ? 1.35 : 1, vulnerabilityMultiplier: 1 });
  return { data, boss, player, mechanics, scene, behavior, awards: () => awards };
}

function assertResting(f, hp, phase) {
  assert.equal(f.data.hp, hp, "부활해도 누적 보스 피해 보존");
  assert.equal(f.data.phase, phase, "보존한 체력에 맞는 공격 단계 유지");
  assert.equal(f.behavior.state, "dormant");
  assert.equal(f.data.vulnerable, false);
  assert.equal(f.boss.body.enable, false);
  assert.equal(f.behavior.weakness.visible, false);
  assert.equal(f.behavior.tongue?.active ?? false, false);
  for (const key of ["shots", "patches", "notes", "drops", "columns", "targets"]) assert.equal(f.behavior[key]?.length ?? 0, 0, `${key} 정리`);
  assert.equal(f.behavior.pending ?? null, null);
  assert.equal(f.behavior.rest ?? null, null);
  assert.equal(f.behavior.getMovementVelocityX?.() ?? 0, 0);
  assert.equal(f.mechanics.sticky.size, 0);
  assert.ok(f.mechanics.holes.every(hole => hole.phase === "closed" && hole.platform.body.enable));
  if (f.behavior.homeX !== undefined) assert.equal(f.boss.x, f.behavior.homeX);
  if (f.behavior.homeY !== undefined) assert.equal(f.boss.y, f.behavior.homeY);
}

for (const Behavior of [MerongKingBehavior, TapeKingBehavior, MusicKingBehavior, HoleKingBehavior, CloudKingBehavior]) {
  for (const easyMode of [false, true]) {
    const f = fixture(Behavior, easyMode), { behavior: b, boss, data, scene } = f;
    for (const hp of [3, 2, 1]) {
      assert.equal(data.hp, hp);
      const phase = resolveBossPhase(3, hp, 3), pattern = b.pattern;
      // Enter each phase through its real intro/warning/attack state machine.
      for (let time = 0; b.state !== "attack" && time < 10000; time += 50) b.update(time, 50);
      assert.equal(b.state, "attack"); b.update(10000, 250);
      scene.events.emit(EVENTS.PLAYER_RESPAWNED);
      assertResting(f, hp, phase); assert.equal(b.pattern, pattern);
      assert.equal(f.awards(), 3 - hp, "부활만으로 점수 재지급 없음");
      scene.events.emit(EVENTS.PLAYER_RESPAWNED);
      assertResting(f, hp, phase);
      f.player.x = -100; b.update(11000, 1000); assertResting(f, hp, phase);
      f.player.x = 1000; b.update(12000, 16); assert.equal(b.state, "intro");
      b.update(13000, 1000); assert.equal(b.state, "warning");
      assert.equal(data.hp, hp); assert.equal(data.phase, phase); assert.equal(b.pattern, pattern);

      // Match the hit/phase values emitted by LevelLoader, then retry while hurt.
      data.hp--; data.phase = resolveBossPhase(3, data.hp, 3); b.onBossHit({ hp: data.hp });
      if (data.hp > 0) {
        scene.events.emit(EVENTS.PLAYER_RESPAWNED); assertResting(f, data.hp, data.phase);
      } else {
        b.onBossDefeated(); scene.events.emit(EVENTS.PLAYER_RESPAWNED);
        assert.equal(data.hp, 0); assert.equal(b.state, "defeated"); assert.equal(boss.active, false);
        assert.equal(f.awards(), 3, "처치 뒤 부활에도 타격 점수 중복 없음");
      }
    }
    b.destroy(); assert.equal(scene.events.listenerCount(EVENTS.PLAYER_RESPAWNED), 0);
    const fresh = fixture(Behavior, easyMode);
    assert.equal(fresh.data.hp, 3); assert.equal(fresh.data.phase, 1, "새 플레이는 정상 초기 체력"); fresh.behavior.destroy();
  }
}
console.log("신규 보스 5종 부활 검사 통과: 양 난이도·HP 3/2/1 보존·단계 유지·반복 복귀·재입장·공격/지형 정리·처치 유지·새 플레이 초기화");
