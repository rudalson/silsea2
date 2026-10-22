export const HOLE_KING_PHASES = Object.freeze({
  1: Object.freeze({ id: "single_opening", targetIndexes: [0], warningMs: 1500, openMs: 2200, moveSpeed: 90, vulnerabilityMs: 3600 }),
  2: Object.freeze({ id: "moving_hole_guard", targetIndexes: [1], warningMs: 1400, openMs: 2600, moveSpeed: 125, vulnerabilityMs: 3700 }),
  3: Object.freeze({ id: "two_openings_and_return", targetIndexes: [0, 1], warningMs: 1300, openMs: 3000, moveSpeed: 150, vulnerabilityMs: 3800 })
});

export const canHitHoleKing = (state, fallingOntoHead) => state === "vulnerable" && fallingOntoHead;
export const selectBossHoles = (holes, phase, easyMode = false) => {
  const indexes = HOLE_KING_PHASES[phase]?.targetIndexes ?? [];
  return indexes.slice(0, easyMode ? 1 : indexes.length).map((index) => holes[index]).filter(Boolean);
};

export function advanceHolePatrol(x, direction, deltaMs, speed, minX, maxX) {
  const next = x + direction * speed * Math.max(0, deltaMs) / 1000;
  return { x: Math.max(minX, Math.min(maxX, next)), direction: next >= maxX ? -1 : next <= minX ? 1 : direction };
}

export const canRestoreBridge = (body, hole) => !(body?.enable && body.right > hole.x && body.left < hole.x + hole.width
  && body.bottom > hole.y && body.top < hole.y + hole.height);
