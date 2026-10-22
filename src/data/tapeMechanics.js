const phase = (config) => Object.freeze({ ...config, steps: Object.freeze(config.steps.map((step) => Object.freeze(step))) });

export const TAPE_KING_PHASES = Object.freeze({
  1: phase({ id: "tape_piece_throw", warningMs: 1200, projectileSpeed: 300, projectileMs: 2300,
    patchLifetimeMs: 4200, vulnerabilityMs: 3200, steps: [{ type: "shot", laneOffset: 32 }] }),
  2: phase({ id: "sticky_floor_install", warningMs: 1200, projectileSpeed: 300, projectileMs: 2300,
    patchLifetimeMs: 4200, vulnerabilityMs: 3300, steps: [{ type: "patch", count: 1 }] }),
  3: phase({ id: "sticky_floor_and_pieces", warningMs: 1100, projectileSpeed: 330, projectileMs: 2300,
    patchLifetimeMs: 5600, vulnerabilityMs: 3400,
    steps: [{ type: "patch", count: 2 }, { type: "shot", laneOffset: 32 }, { type: "shot", laneOffset: 108 }] })
});

export const canHitTapeKing = (state, fallingOntoHead) => state === "vulnerable" && Boolean(fallingOntoHead);

// Leave the entire basic-jump approach beside the boss free of adhesive.
export function planTapePatches({ playerX, bossX, section, floorY, count, width = 192, speedMultiplier = 0.6 }) {
  const leftSide = playerX < bossX;
  const minimum = leftSide ? section.xStart + 80 : bossX + 320;
  const maximum = leftSide ? bossX - 320 : section.xEnd - 80;
  if (maximum - minimum < width) return [];
  const slots = Math.min(count, Math.floor((maximum - minimum + 112) / (width + 112)));
  const totalWidth = slots * width + (slots - 1) * 112;
  const start = Math.max(minimum, Math.min(maximum - totalWidth, playerX - totalWidth / 2));
  const patches = [];
  for (let index = 0; index < slots; index++) {
    const x = start + index * (width + 112);
    patches.push({ id: `boss_tape_${index}`, x, y: floorY, width, height: 12, speedMultiplier });
  }
  return patches;
}

export function advanceTapeProjectile(shot, deltaMs) {
  const elapsedMs = shot.elapsedMs + Math.max(0, deltaMs);
  return { ...shot, previousX: shot.x, x: shot.x + shot.velocityX * Math.max(0, deltaMs) / 1000,
    elapsedMs, active: elapsedMs < shot.lifetimeMs };
}

// Sweep the short horizontal strip too, so low frame rates cannot skip a player.
export function tapeProjectileHits(shot, body) {
  if (!shot?.active || !body?.enable) return false;
  const left = Math.min(shot.previousX, shot.x) - 24, right = Math.max(shot.previousX, shot.x) + 24;
  return body.right > left && body.left < right && body.bottom > shot.y - 10 && body.top < shot.y + 10;
}
