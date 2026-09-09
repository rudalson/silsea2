export const PRANK_GATE_ENCOUNTER_STAGES = Object.freeze({
  IDLE: "idle",
  REACTING: "reacting",
  POP: "pop",
  SETTLED: "settled"
});

export const PRANK_GATE_SAFETY = Object.freeze({
  checkpointDistance: 256,
  deadlineGuardSeconds: 15
});

const TIMINGS = Object.freeze({
  normal: Object.freeze({
    reactionMs: 240,
    popMs: 420,
    smokeCount: 7,
    starCount: 9
  }),
  reduced: Object.freeze({
    reactionMs: 150,
    popMs: 260,
    smokeCount: 3,
    starCount: 4
  })
});

export function getPrankGateTiming(effectStrength = "normal") {
  return effectStrength === "reduced" ? TIMINGS.reduced : TIMINGS.normal;
}

export function resolvePrankGateSafety({
  actualGateActive = false,
  bossActive = false,
  distanceToCheckpoint = Number.POSITIVE_INFINITY,
  secondsToDeadline = Number.POSITIVE_INFINITY
} = {}) {
  const reasons = [];
  if (actualGateActive) reasons.push("actual-gate-active");
  if (bossActive) reasons.push("boss-active");
  if (Number(distanceToCheckpoint) < PRANK_GATE_SAFETY.checkpointDistance) {
    reasons.push("checkpoint-nearby");
  }
  if (Number(secondsToDeadline) <= PRANK_GATE_SAFETY.deadlineGuardSeconds) {
    reasons.push("deadline-nearby");
  }
  return Object.freeze({
    eligible: reasons.length === 0,
    reasons: Object.freeze(reasons)
  });
}

export function createPrankGateEncounter({ reviewOnly = false } = {}) {
  return Object.freeze({
    reviewOnly,
    resetPolicy: "scene-restart",
    harmless: Object.freeze({
      collision: false,
      damage: false,
      score: false,
      objectives: false,
      save: false
    })
  });
}

export function createPrankGateReviewEncounter() {
  return createPrankGateEncounter({ reviewOnly: true });
}
