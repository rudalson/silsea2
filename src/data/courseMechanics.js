export const RHYTHM_PHASES = Object.freeze({
  WAITING: "waiting", WARNING: "warning", STOP: "stop", RETRY: "retry", SUCCESS: "success"
});

export const createRhythmState = () => ({ phase: RHYTHM_PHASES.WAITING, elapsedMs: 0, failures: 0 });

// Count active simulation time, so pausing a Scene never consumes the wait.
export function stepRhythm(state, { deltaMs, inside, grounded, moving, paused = false }, config) {
  if (paused || state.phase === RHYTHM_PHASES.SUCCESS) return state;
  const elapsedMs = state.elapsedMs + Math.max(0, deltaMs);
  const next = (phase, elapsed = 0) => ({ ...state, phase, elapsedMs: elapsed });
  if (state.phase === RHYTHM_PHASES.WAITING) {
    return inside && grounded ? next(RHYTHM_PHASES.WARNING) : state;
  }
  if (state.phase === RHYTHM_PHASES.RETRY) {
    return elapsedMs >= config.retryMs
      ? next(inside && grounded ? RHYTHM_PHASES.WARNING : RHYTHM_PHASES.WAITING)
      : next(state.phase, elapsedMs);
  }
  if (state.phase === RHYTHM_PHASES.WARNING) {
    if (!inside || !grounded) return next(RHYTHM_PHASES.WAITING);
    return elapsedMs >= config.warningMs ? next(RHYTHM_PHASES.STOP) : next(state.phase, elapsedMs);
  }
  if (!inside || !grounded || moving) {
    return { ...next(RHYTHM_PHASES.RETRY), failures: state.failures + 1 };
  }
  return elapsedMs >= config.stopMs ? next(RHYTHM_PHASES.SUCCESS) : next(state.phase, elapsedMs);
}

export function getStickySpeedMultiplier(body, zones, grounded) {
  if (!body?.enable || !grounded) return 1;
  return zones.reduce((speed, zone) => (
    body.right > zone.x && body.left < zone.x + zone.width && Math.abs(body.bottom - zone.y) <= 8
      ? Math.min(speed, zone.speedMultiplier) : speed
  ), 1);
}

export function getTimedHolePhase(elapsedMs, config) {
  if (elapsedMs === null) return "closed";
  const cycleMs = config.warningMs + config.openMs + config.closedMs;
  const time = Math.max(0, elapsedMs) % cycleMs;
  return time < config.warningMs ? "warning" : time < config.warningMs + config.openMs ? "open" : "closed";
}

export function assertCourseMechanicsShape(level) {
  const fail = (message) => { throw new Error(`[${level.id}] ${message}`); };
  const list = (value, label) => {
    if (value === undefined) return [];
    if (!Array.isArray(value)) fail(`${label}는 배열이어야 합니다.`);
    return value;
  };
  const mechanics = level.terrainMechanics ?? {};
  const stickyZones = list(mechanics.stickyZones, "stickyZones");
  const timedHoles = list(mechanics.timedHoles, "timedHoles");
  const rhythmZones = list(level.environment?.rhythmZones, "rhythmZones");
  const ids = new Set([
    ...(mechanics.movingPlatforms ?? []), ...(mechanics.crumblePlatforms ?? []), ...(mechanics.updrafts ?? [])
  ].map(({ id }) => id));
  const range = (entry, field, min, max) => {
    if (!Number.isFinite(entry[field]) || entry[field] < min || entry[field] > max) {
      fail(`${entry.id ?? "장치"} ${field}는 ${min}~${max} 범위여야 합니다.`);
    }
  };
  const identify = (entry) => {
    if (!entry || typeof entry.id !== "string" || !entry.id || ids.has(entry.id)) fail("새 코스 장치 id가 없거나 중복됩니다.");
    ids.add(entry.id);
  };
  const rectangle = (entry) => {
    identify(entry);
    range(entry, "x", 0, level.world.width);
    range(entry, "y", 0, level.world.height);
    range(entry, "width", 1, level.world.width);
    range(entry, "height", 1, level.world.height);
    if (entry.x + entry.width > level.world.width || entry.y + entry.height > level.world.height) fail(`${entry.id}가 world 밖입니다.`);
  };
  for (const zone of stickyZones) {
    rectangle(zone);
    range(zone, "speedMultiplier", 0.1, 1);
  }
  for (const hole of timedHoles) {
    rectangle(hole);
    range(hole, "triggerDistance", 128, 640);
    range(hole, "warningMs", 500, 10000);
    range(hole, "openMs", 250, 10000);
    range(hole, "closedMs", 500, 10000);
    for (const other of timedHoles) {
      if (hole === other || Math.abs(hole.y - other.y) > 32) continue;
      if (hole.x < other.x + other.width + 128 && hole.x + hole.width + 128 > other.x) {
        fail(`${hole.id}와 ${other.id} 사이에는 고정 안전 발판 128px 이상이 필요합니다.`);
      }
    }
  }
  for (const zone of rhythmZones) {
    identify(zone);
    range(zone, "xStart", 0, level.world.width);
    range(zone, "xEnd", zone.xStart + 128, level.world.width);
    range(zone, "floorY", 64, level.world.height);
    range(zone, "warningMs", 500, 10000);
    range(zone, "stopMs", 1000, 10000);
    range(zone, "retryMs", 500, 10000);
    range(zone, "movementTolerance", 0.05, 0.3);
    if (typeof zone.practice !== "boolean") fail(`${zone.id} practice는 boolean이어야 합니다.`);
    const dangers = [
      ...(level.hazards ?? []), ...(level.enemies ?? []), ...timedHoles,
      ...(mechanics.movingPlatforms ?? []), ...(mechanics.crumblePlatforms ?? []), ...(mechanics.updrafts ?? []),
      ...(level.environment?.waterZones ?? []), ...(level.environment?.lasers?.beams ?? [])
    ];
    if (level.environment?.tsunami || dangers.some((entry) => {
      const start = entry.xStart ?? entry.x - (entry.patrol ?? 0);
      const end = entry.xEnd ?? entry.x + (entry.width ?? entry.patrol ?? 64);
      return start < zone.xEnd + 64 && end > zone.xStart - 64;
    })) fail(`${zone.id} 정지 연습 구역에는 위험 장치나 이동 지형을 둘 수 없습니다.`);
  }
  const easyTerrain = level.difficulty?.easyMode?.terrainMechanics ?? {};
  for (const [field, min, max] of [["stickySpeedFloor", 0.1, 1], ["holeWarningMultiplier", 1, 2]]) {
    if (easyTerrain[field] !== undefined) range({ id: "easyMode", ...easyTerrain }, field, min, max);
  }
  if (level.developmentOnly !== undefined && typeof level.developmentOnly !== "boolean") fail("developmentOnly는 boolean이어야 합니다.");
  return true;
}

// Validate before creating bodies so a rejected hot reload preserves the old course.
export function assertCourseTerrainSafety(level, terrain) {
  const fail = (message) => { throw new Error(`[${level.id}] ${message}`); };
  const support = (x, y) => terrain.some((floor) => x >= floor.x && x <= floor.x + floor.width && Math.abs(floor.y - y) <= 1);
  for (const hole of level.terrainMechanics?.timedHoles ?? []) {
    if (terrain.some((floor) => floor.x < hole.x + hole.width && floor.x + floor.width > hole.x
      && floor.y < hole.y + hole.height && floor.y + floor.height > hole.y)) {
      fail(`timed hole ${hole.id} 아래에 개폐를 막는 고정 충돌 지형이 있음`);
    }
    if (!support(hole.x - 48, hole.y) || !support(hole.x + hole.width + 48, hole.y)) {
      fail(`timed hole ${hole.id} 양쪽에 고정 안전 발판이 필요함`);
    }
  }
  for (const zone of [...(level.terrainMechanics?.stickyZones ?? []), ...(level.environment?.rhythmZones ?? [])]) {
    const left = zone.xStart ?? zone.x;
    const right = zone.xEnd ?? zone.x + zone.width;
    const floorY = zone.floorY ?? zone.y;
    if (!terrain.some((floor) => floor.x <= left && floor.x + floor.width >= right && floor.y === floorY)) {
      fail(`course zone ${zone.id} 전체를 받치는 고정 바닥이 필요함`);
    }
  }
  return true;
}
