export const MERONG_KING_PHASES = Object.freeze({
  1: Object.freeze({ id: "single_low_tongue", warningMs: 1200, activeMs: 600, betweenMs: 450, vulnerabilityMs: 2600,
    attacks: Object.freeze([{ laneOffset: 22, reach: 540 }]) }),
  2: Object.freeze({ id: "low_then_high_tongue", warningMs: 1150, activeMs: 600, betweenMs: 450, vulnerabilityMs: 2700,
    attacks: Object.freeze([{ laneOffset: 22, reach: 580 }, { laneOffset: 106, reach: 580 }]) }),
  3: Object.freeze({ id: "alternating_long_tongue", warningMs: 1100, activeMs: 650, betweenMs: 450, vulnerabilityMs: 2800,
    attacks: Object.freeze([{ laneOffset: 22, reach: 640 }, { laneOffset: 106, reach: 640 }, { laneOffset: 22, reach: 660 }]) })
});

export function getTongueBounds({ x, y, direction, reach, height = 24 }, extension = 1) {
  const width = Math.max(0, Math.min(1, extension)) * reach;
  return { x: direction < 0 ? x - width : x, y: y - height / 2, width, height };
}

export const overlapsTongue = (body, bounds) => Boolean(body?.enable && bounds.width > 0
  && body.right > bounds.x && body.left < bounds.x + bounds.width
  && body.bottom > bounds.y && body.top < bounds.y + bounds.height);

export function getTongueTrapPhase(elapsedMs, config) {
  if (elapsedMs === null) return "idle";
  const time = elapsedMs % (config.warningMs + config.activeMs + config.restMs);
  return time < config.warningMs ? "warning" : time < config.warningMs + config.activeMs ? "attack" : "rest";
}

export const canHitMerongKing = (state, fallingOntoHead) => state === "vulnerable" && Boolean(fallingOntoHead);

export function assertTongueMechanicsShape(level) {
  const traps = level.environment?.tongueTraps;
  if (traps === undefined) return true;
  const fail = (text) => { throw new Error(`[${level.id}] tongueTraps: ${text}`); };
  if (!Array.isArray(traps)) fail("배열이어야 합니다.");
  const ids = new Set();
  for (const trap of traps) {
    if (!trap || typeof trap.id !== "string" || !trap.id || ids.has(trap.id)) fail("id 누락 또는 중복");
    ids.add(trap.id);
    for (const key of ["x", "y", "reach", "warningMs", "activeMs", "restMs", "triggerDistance"]) {
      if (!Number.isFinite(trap[key]) || trap[key] < (key === "x" || key === "y" ? 0 : 1)) fail(`${trap.id} ${key} 범위 오류`);
    }
    if (![1, -1].includes(trap.direction)) fail(`${trap.id} direction은 -1 또는 1`);
    if (trap.warningMs < 900 || trap.activeMs > 1500 || trap.restMs < 500) fail(`${trap.id} 예고·공격·휴식 시간 오류`);
    const bounds = getTongueBounds(trap);
    if (bounds.x < 0 || bounds.x + bounds.width > level.world.width || bounds.y < 0
      || bounds.y + bounds.height > level.world.height) fail(`${trap.id} 공격 범위가 world 밖`);
    if (typeof trap.practice !== "boolean") fail(`${trap.id} practice는 boolean`);
    if (level.sections.some((section) => section.type === "boss" && bounds.x < section.xEnd
      && bounds.x + bounds.width > section.xStart)) fail(`${trap.id} 일반 혀 장치는 보스 구간과 겹칠 수 없음`);
  }
  const easyWarning = level.difficulty?.easyMode?.environment?.tongueWarningMultiplier;
  if (easyWarning !== undefined && (!Number.isFinite(easyWarning) || easyWarning < 1 || easyWarning > 2)) {
    fail("쉬운 모드 tongueWarningMultiplier는 1~2 범위");
  }
  return true;
}
