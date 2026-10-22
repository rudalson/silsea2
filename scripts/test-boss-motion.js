import assert from "node:assert/strict";
import { BOSS_MOTION_PROFILES, identityBossPose, sampleBossPose } from "../src/data/bossMotion.js";
import { BossMotionPresenter, createBossMotionPresenter } from "../src/systems/BossMotionPresenter.js";

const keys = ["merong_king", "tape_king", "music_king", "hole_king", "cloud_king"];
const states = ["dormant", "intro", "idle", "warning", "attack", "between", "returning", "rhythm", "vulnerable", "hurt", "recovery", "defeated"];
assert.deepEqual(Object.keys(BOSS_MOTION_PROFILES), keys);
for (const key of keys) {
  for (const state of states) for (const time of [0, 80, 250, 500, 900, 1800, 60000]) {
    const pose = sampleBossPose(key, state, time, { durationMs: 1300 });
    assert.ok(Object.values(pose).every(Number.isFinite));
    assert.ok(Math.abs(pose.offsetX) <= 4 && Math.abs(pose.offsetY) <= 4);
    assert.ok(pose.scaleX >= 0.95 && pose.scaleX <= 1.03 && pose.scaleY >= 0.95 && pose.scaleY <= 1.03);
    assert.ok(Math.abs(pose.angle) <= 3 && pose.alpha >= 0.85 && pose.alpha <= 1);
    assert.deepEqual(sampleBossPose(key, state, time, { reduced: true }), identityBossPose());
  }
  assert.notDeepEqual(sampleBossPose(key, "idle", 300), identityBossPose());
  assert.ok(sampleBossPose(key, "warning", 1300, { durationMs: 1300 }).scaleY < 1);
  assert.ok(Math.abs(sampleBossPose(key, "hurt", 80).offsetX) > Math.abs(sampleBossPose(key, "hurt", 1600).offsetX));
  assert.deepEqual(sampleBossPose(key, "defeated", 900), sampleBossPose(key, "defeated", 60000));
  assert.deepEqual(sampleBossPose(key, "rhythm", 800, { still: true }), identityBossPose());
  const left = sampleBossPose(key, "warning", 800, { durationMs: 1300, direction: -1 });
  const right = sampleBossPose(key, "warning", 800, { durationMs: 1300, direction: 1 });
  assert.equal(left.angle, -right.angle);
}
assert.deepEqual(sampleBossPose("potato_king", "attack", 100), identityBossPose());
assert.equal(createBossMotionPresenter({}, { getData: () => false }), null);
assert.equal(createBossMotionPresenter({}, { getData: name => name === "usesArt" ? true : "potato_king" }), null);

const makeImage = (x, y, texture, frame) => ({
  x, y, texture: { key: texture }, frame: { name: frame }, visible: true, active: true, body: undefined,
  setTexture(key, name) { this.texture.key = key; this.frame.name = name; return this; },
  setOrigin(x, y) { this.originX = x; this.originY = y; return this; },
  setPosition(x, y) { this.x = x; this.y = y; return this; },
  setScale(x, y) { this.scaleX = x; this.scaleY = y; return this; },
  setAngle(value) { this.angle = value; return this; },
  setFlip(x, y) { this.flipX = x; this.flipY = y; return this; },
  setDepth(value) { this.depth = value; return this; },
  setAlpha(value) { this.alpha = value; return this; },
  setVisible(value) { this.visible = value; return this; },
  setTint(...colors) { this.tint = colors; this.tintFill = false; return this; },
  setTintFill(...colors) { this.tint = colors; this.tintFill = true; return this; },
  clearTint() { this.tint = null; return this; },
  destroy() { this.active = false; }
});
for (const key of keys) {
  let reduced = false, added = 0, removed = 0, updateRegistrations = 0;
  const displayList = {}, scene = { registry: { get: () => reduced ? "reduced" : "normal" }, add: { image: makeImage } };
  const data = { key, usesArt: true, bossState: "idle" };
  const boss = { ...makeImage(15072, 576, `${key}_idle`, 0), scene, active: true, depth: 4, alpha: 1,
    originX: 0.5, originY: 112 / 128, scaleX: 1.5, scaleY: 1.5, angle: 0, flipX: false, flipY: false,
    displayList, body: Object.freeze({ x: 15015, y: 471, width: 114, height: 105, offset: Object.freeze({ x: 26, y: 42 }) }),
    getData: name => data[name], removeFromDisplayList() { removed++; this.displayList = null; },
    addToUpdateList() { updateRegistrations++; }, addToDisplayList(list) { added++; this.displayList = list; } };
  const invariant = () => JSON.stringify([boss.x, boss.y, boss.scaleX, boss.scaleY, boss.angle, boss.originX, boss.originY, boss.body]);
  const before = invariant(), presenter = new BossMotionPresenter(scene, boss);
  assert.equal(removed, 1); assert.equal(updateRegistrations, 1); assert.equal(presenter.image.body, undefined);
  presenter.update(300, {}); assert.notEqual(presenter.image.scaleY, boss.scaleY); assert.equal(invariant(), before);
  const frozen = presenter.getSnapshot(); presenter.update(10000, {}, { frozen: true }); assert.deepEqual(presenter.getSnapshot(), frozen);
  boss.flipX = true; boss.texture.key = `${key}_warning`; data.bossState = "warning";
  presenter.update(0, { durationMs: 1300 }); presenter.update(1300, { durationMs: 1300 });
  assert.equal(presenter.image.texture.key, boss.texture.key); assert.equal(presenter.image.flipX, true);
  boss.isTinted = true; boss.tintFill = true; boss.tintTopLeft = boss.tintTopRight = boss.tintBottomLeft = boss.tintBottomRight = 0xffee66;
  presenter.update(16, {}); assert.equal(presenter.image.tintFill, true); assert.equal(presenter.image.tint[0], 0xffee66);
  reduced = true; presenter.update(16, {}); assert.deepEqual(presenter.pose, identityBossPose());
  reduced = false; data.bossState = "rhythm"; presenter.update(300, { rest: { phase: "stop" } }); assert.deepEqual(presenter.pose, identityBossPose());
  boss.visible = false; data.bossState = "dormant"; presenter.update(16, {}); assert.equal(presenter.image.visible, false);
  boss.visible = true; boss.active = false; data.bossState = "defeated"; presenter.update(0, {}); presenter.update(900, {});
  assert.ok(presenter.image.visible && presenter.image.alpha < 1 && presenter.image.scaleY < boss.scaleY);
  assert.equal(invariant(), before); presenter.destroy(); presenter.destroy(); assert.equal(added, 1); assert.equal(boss.displayList, displayList); assert.equal(presenter.image.active, false);
}
console.log("보스 동작 검사 통과: 신규 5종 상태 동작·몸 없는 표시 이미지·충돌/원본 변환 불변·방향/포즈/피격 색 동기화·정지/효과 감소·처치 후 동작·해제 복원");
