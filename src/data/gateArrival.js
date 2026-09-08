export const GATE_ARRIVAL_STAGES = Object.freeze({
  FLASH: "flash",
  POP: "pop",
  GLITTER: "glitter",
  STABLE: "stable",
  ENTERED: "entered"
});

export const GATE_ARRIVAL_TIMINGS = Object.freeze({
  normal: Object.freeze({
    flashEndMs: 140,
    popStartMs: 90,
    popEndMs: 520,
    glitterStartMs: 320,
    stableAtMs: 920,
    glitterCount: 12
  }),
  reduced: Object.freeze({
    flashEndMs: 80,
    popStartMs: 50,
    popEndMs: 340,
    glitterStartMs: 220,
    stableAtMs: 620,
    glitterCount: 6
  })
});

export function getGateArrivalTiming(strength = "normal") {
  return strength === "reduced" ? GATE_ARRIVAL_TIMINGS.reduced : GATE_ARRIVAL_TIMINGS.normal;
}

export function resolveGateArrivalStage(elapsedMs, strength = "normal") {
  const timing = getGateArrivalTiming(strength);
  const elapsed = Math.max(0, Number(elapsedMs) || 0);
  if (elapsed < timing.popStartMs) return GATE_ARRIVAL_STAGES.FLASH;
  if (elapsed < timing.glitterStartMs) return GATE_ARRIVAL_STAGES.POP;
  if (elapsed < timing.stableAtMs) return GATE_ARRIVAL_STAGES.GLITTER;
  return GATE_ARRIVAL_STAGES.STABLE;
}

