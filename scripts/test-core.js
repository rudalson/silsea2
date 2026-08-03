import assert from "node:assert/strict";
import level01 from "../src/data/levels/level-01.js";
import {
  CORE_RULES,
  getMagpieStealAmount,
  getRespawnScoreLoss,
  stepFlightGauge
} from "../src/data/gameplay.js";
import { ObjectPool } from "../src/systems/ObjectPool.js";
import { ScoreManager } from "../src/systems/ScoreManager.js";
import { SeededRandom } from "../src/systems/SeededRandom.js";

assert.equal(CORE_RULES.invulnerableMs, 2000);
assert.ok(CORE_RULES.hurtLockMs <= 250);
assert.equal(CORE_RULES.flightMaxMs, 10000);
assert.equal(CORE_RULES.flightRecoveryMs, 3000);
assert.equal(CORE_RULES.alicornDurationMs, 12000);
assert.equal(CORE_RULES.alicornWarningMs, 3000);
assert.ok(CORE_RULES.bossTelegraphMs >= 700 && CORE_RULES.bossTelegraphMs <= 1000);

assert.equal(stepFlightGauge(10000, 1000, { flying: true }), 9000);
assert.equal(stepFlightGauge(0, 3000, { grounded: true }), 10000);
assert.equal(stepFlightGauge(120, 16, { checkpoint: true }), 10000);
assert.equal(getMagpieStealAmount(99), 9);
assert.equal(getMagpieStealAmount(10000), 100);
assert.equal(getRespawnScoreLoss(10000), 75);

const score = new ScoreManager();
assert.equal(score.collect("star"), 10);
assert.equal(score.collect("star", 2), 20);
score.score = 10000;
assert.equal(score.steal(), 100);
assert.equal(score.score, 9900);

const first = new SeededRandom(8901);
const second = new SeededRandom(8901);
assert.deepEqual(
  Array.from({ length: 12 }, () => first.next()),
  Array.from({ length: 12 }, () => second.next())
);

let created = 0;
const pool = new ObjectPool({
  maxSize: 2,
  create: () => ({ id: ++created }),
  activate: () => {},
  deactivate: () => {},
  destroy: () => {}
});
const pooledA = pool.acquire();
const pooledB = pool.acquire();
assert.ok(pooledA && pooledB);
assert.equal(pool.acquire(), null);
pool.release(pooledA);
assert.equal(pool.acquire(), pooledA);
assert.equal(pool.entries.length, 2);
for (let index = 0; index < 10000; index += 1) {
  const entry = pool.acquire();
  if (entry) pool.release(entry);
}
assert.equal(pool.entries.length, 2);
pool.destroy();

const starCount = level01.items.reduce((total, item) => {
  if (item.type === "star") return total + 1;
  if (item.type === "star_arc") return total + item.count;
  return total;
}, 0);
assert.ok(starCount >= 50, `level-01 별 수 부족: ${starCount}`);
assert.equal(level01.enemies.find((enemy) => enemy.type === "raw_potato")?.x, 1344);
assert.equal(level01.items.find((item) => item.type === "horn")?.x, 1792);
assert.equal(level01.items.find((item) => item.id === "magnet_arc")?.x, 2240);
assert.ok(Math.min(...level01.hazards.filter((hazard) => hazard.type === "pit").map((hazard) => hazard.xStart)) > 4096);
const boss = level01.sections.find((section) => section.type === "boss")?.boss;
assert.equal(boss?.hp, 3);
assert.equal(boss?.phases.length, 3);

console.log("Core Mechanics 테스트 통과: 변신 시간, 비행 회복, 점수 손실, Seed, Object Pool, 보스 3단계");
