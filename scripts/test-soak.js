import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { FORMS, TRANSFORM_PRESENTATION } from "../src/data/gameplay.js";
import { ARCHER_RULES } from "../src/data/combatDevices.js";
import { PARTICLE_EFFECTS, PARTICLE_LIMITS } from "../src/data/particleEffects.js";
import { ObjectPool } from "../src/systems/ObjectPool.js";

const SIMULATED_MINUTES = 60;
const SIMULATED_MS = SIMULATED_MINUTES * 60 * 1000;
const FRAME_MS = 1000 / 60;
const RESTART_CYCLES = 2000;
const HEAP_GROWTH_LIMIT = 8 * 1024 * 1024;
const startedAt = performance.now();

assert.equal(
  typeof global.gc,
  "function",
  "정확한 메모리 검사를 위해 `npm run test:soak`로 실행해야 합니다."
);

const createLifecyclePool = ({ name, maxSize }) => {
  let nextId = 0;
  let destroyedCount = 0;
  const pool = new ObjectPool({
    maxSize,
    create: () => ({ id: `${name}-${++nextId}`, expiresAt: 0 }),
    activate: (entry, data) => { entry.expiresAt = data.expiresAt; },
    deactivate: (entry) => { entry.expiresAt = 0; },
    destroy: () => { destroyedCount += 1; }
  });
  return { name, pool, getDestroyedCount: () => destroyedCount };
};

const poolScenarios = [
  { name: "lightning", maxSize: 6, intervalMs: 32, burst: () => 1, lifetimeMs: 170 },
  { name: "recovery", maxSize: 9, intervalMs: 2100, burst: () => 3, lifetimeMs: 6000 },
  {
    name: "arrow",
    maxSize: ARCHER_RULES.maxActive,
    intervalMs: ARCHER_RULES.cooldownMs,
    burst: () => 1,
    lifetimeMs: ARCHER_RULES.arrowLifetimeMs
  },
  { name: "bossProjectile", maxSize: 16, intervalMs: 900, burst: () => 3, lifetimeMs: 4200 }
].map((scenario) => ({
  ...scenario,
  ...createLifecyclePool(scenario),
  nextSpawnAt: 0
}));

for (let now = 0; now <= SIMULATED_MS; now += FRAME_MS) {
  for (const scenario of poolScenarios) {
    scenario.pool.forEachActive((entry) => {
      if (now >= entry.expiresAt) scenario.pool.release(entry);
    });
    while (now >= scenario.nextSpawnAt) {
      const count = scenario.burst();
      for (let index = 0; index < count; index += 1) {
        scenario.pool.acquire({ expiresAt: now + scenario.lifetimeMs });
      }
      scenario.nextSpawnAt += scenario.intervalMs;
    }
  }
}

for (const scenario of poolScenarios) {
  const snapshot = scenario.pool.getSnapshot();
  assert.ok(snapshot.size <= snapshot.maxSize, `${scenario.name} 풀이 상한을 초과함`);
  assert.ok(snapshot.peakActiveCount <= snapshot.maxSize, `${scenario.name} 활성 수가 상한을 초과함`);
  assert.equal(snapshot.rejectedCount, 0, `${scenario.name} 풀 용량이 부하 시나리오보다 작음`);
  scenario.pool.releaseAll();
  assert.equal(scenario.pool.activeCount, 0, `${scenario.name} 활성 엔트리가 회수되지 않음`);
}

class ParticleBudget {
  constructor(name, maxSize) {
    this.name = name;
    this.maxSize = maxSize;
    this.expiresAt = [];
    this.peakActiveCount = 0;
    this.emittedCount = 0;
    this.rejectedCount = 0;
  }

  expire(now) {
    let writeIndex = 0;
    for (const expiresAt of this.expiresAt) {
      if (expiresAt > now) this.expiresAt[writeIndex++] = expiresAt;
    }
    this.expiresAt.length = writeIndex;
  }

  emit(count, now, lifetimeMs) {
    this.expire(now);
    const accepted = Math.min(count, this.maxSize - this.expiresAt.length);
    for (let index = 0; index < accepted; index += 1) this.expiresAt.push(now + lifetimeMs);
    this.emittedCount += accepted;
    this.rejectedCount += count - accepted;
    this.peakActiveCount = Math.max(this.peakActiveCount, this.expiresAt.length);
  }

  snapshot() {
    return {
      name: this.name,
      maxSize: this.maxSize,
      peakActiveCount: this.peakActiveCount,
      emittedCount: this.emittedCount,
      rejectedCount: this.rejectedCount
    };
  }
}

const particleScenarios = [
  {
    budget: new ParticleBudget("landing", PARTICLE_LIMITS.landing),
    intervalMs: 100,
    burstCount: PARTICLE_EFFECTS.landing.count,
    lifetimeMs: PARTICLE_EFFECTS.landing.lifespan.max
  },
  {
    budget: new ParticleBudget("magnet", PARTICLE_LIMITS.magnet),
    intervalMs: PARTICLE_EFFECTS.magnet.intervalMs,
    burstCount: 24,
    lifetimeMs: PARTICLE_EFFECTS.magnet.lifespan
  },
  {
    budget: new ParticleBudget("transform:alicorn", PARTICLE_LIMITS.transformPerForm),
    intervalMs: 200,
    burstCount: TRANSFORM_PRESENTATION[FORMS.ALICORN].burstCount,
    lifetimeMs: PARTICLE_EFFECTS.transform.lifespan.max
  }
];

for (const scenario of particleScenarios) {
  for (let now = 0; now <= SIMULATED_MS; now += scenario.intervalMs) {
    scenario.budget.emit(scenario.burstCount, now, scenario.lifetimeMs);
  }
  const snapshot = scenario.budget.snapshot();
  assert.ok(snapshot.peakActiveCount <= snapshot.maxSize, `${snapshot.name} 파티클이 상한을 초과함`);
  assert.equal(snapshot.rejectedCount, 0, `${snapshot.name} 파티클 상한이 부하 시나리오보다 작음`);
}

const runRestartCycles = (cycles) => {
  let createdCount = 0;
  let destroyedCount = 0;
  for (let cycle = 0; cycle < cycles; cycle += 1) {
    for (const maxSize of [6, 9, ARCHER_RULES.maxActive, 16]) {
      const pool = new ObjectPool({
        maxSize,
        create: () => ({ id: ++createdCount }),
        activate: () => {},
        deactivate: () => {},
        destroy: () => { destroyedCount += 1; }
      });
      for (let index = 0; index < maxSize; index += 1) pool.acquire();
      pool.destroy();
      assert.equal(pool.getSnapshot().size, 0, "재시작 후 풀 엔트리가 남음");
    }
  }
  assert.equal(destroyedCount, createdCount, "재시작 시 생성된 엔트리가 모두 폐기되지 않음");
  return createdCount;
};

runRestartCycles(20);
global.gc();
const heapBefore = process.memoryUsage().heapUsed;
const restartedEntries = runRestartCycles(RESTART_CYCLES);
global.gc();
const heapAfter = process.memoryUsage().heapUsed;
const heapDelta = heapAfter - heapBefore;
assert.ok(
  heapDelta <= HEAP_GROWTH_LIMIT,
  `반복 재시작 후 heap 증가량이 상한을 초과함: ${(heapDelta / 1024 / 1024).toFixed(2)} MiB`
);

const elapsedMs = performance.now() - startedAt;
const formatNumber = (value) => new Intl.NumberFormat("ko-KR").format(value);
const formatMiB = (value) => `${value >= 0 ? "+" : ""}${(value / 1024 / 1024).toFixed(2)} MiB`;

console.log(`Soak 테스트 통과: ${SIMULATED_MINUTES}분 등가 · ${formatNumber(Math.round(SIMULATED_MS / FRAME_MS))} 프레임`);
for (const scenario of poolScenarios) {
  const snapshot = scenario.pool.getSnapshot();
  console.log(
    `- Pool ${scenario.name}: peak ${snapshot.peakActiveCount}/${snapshot.maxSize}, `
    + `acquire ${formatNumber(snapshot.acquireCount)}, rejected ${snapshot.rejectedCount}`
  );
}
for (const scenario of particleScenarios) {
  const snapshot = scenario.budget.snapshot();
  console.log(
    `- FX ${snapshot.name}: peak ${snapshot.peakActiveCount}/${snapshot.maxSize}, `
    + `emit ${formatNumber(snapshot.emittedCount)}, rejected ${snapshot.rejectedCount}`
  );
}
console.log(`- Scene restart: ${formatNumber(RESTART_CYCLES)}회 · entry destroy ${formatNumber(restartedEntries)}개`);
console.log(`- Heap delta after GC: ${formatMiB(heapDelta)} / limit +8.00 MiB`);
console.log(`- Wall time: ${(elapsedMs / 1000).toFixed(2)}초`);
