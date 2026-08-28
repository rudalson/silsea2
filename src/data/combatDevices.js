export const GUARD_PHASES = Object.freeze({
  IDLE: "idle",
  WINDUP: "windup",
  ACTIVE: "active"
});

export const GUARD_RULES = Object.freeze({
  windupMs: 120,
  cooldownMs: 350,
  drainMultiplier: 1.5,
  moveSpeedMultiplier: 0.55,
  range: 96,
  arcDegrees: 150
});

export const ARCHER_RULES = Object.freeze({
  telegraphMs: 900,
  arrowSpeed: 320,
  cooldownMs: 1200,
  arrowLifetimeMs: 3600,
  maxActive: 4
});

export const LASER_PHASES = Object.freeze({
  WAITING: "waiting",
  WARNING: "warning",
  ACTIVE: "active",
  REST: "rest",
  DISABLED: "disabled"
});

export const LASER_RULES = Object.freeze({
  warningMs: 900,
  activeMs: 1400,
  restMs: 1200
});

const finiteOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function isInsideGuardArc({
  playerX,
  playerY,
  facing = 1,
  projectileX,
  projectileY,
  range = GUARD_RULES.range,
  arcDegrees = GUARD_RULES.arcDegrees
}) {
  const dx = finiteOr(projectileX, 0) - finiteOr(playerX, 0);
  const dy = finiteOr(projectileY, 0) - finiteOr(playerY, 0);
  const distance = Math.hypot(dx, dy);
  if (distance <= 0 || distance > Math.max(0, finiteOr(range, GUARD_RULES.range))) return false;
  const normalizedFacing = Number(facing) < 0 ? -1 : 1;
  const halfArc = Math.max(0, Math.min(180, finiteOr(arcDegrees, GUARD_RULES.arcDegrees))) / 2;
  const minimumDot = Math.cos((halfArc * Math.PI) / 180);
  return (dx * normalizedFacing) / distance >= minimumDot;
}

export function getLaserPhase(elapsedMs, config = LASER_RULES) {
  const elapsed = finiteOr(elapsedMs, 0);
  if (elapsed < 0) return LASER_PHASES.WAITING;
  const warningMs = Math.max(1, finiteOr(config.warningMs, LASER_RULES.warningMs));
  const activeMs = Math.max(1, finiteOr(config.activeMs, LASER_RULES.activeMs));
  const restMs = Math.max(1, finiteOr(config.restMs, LASER_RULES.restMs));
  const cycleMs = warningMs + activeMs + restMs;
  const cycleElapsed = elapsed % cycleMs;
  if (cycleElapsed < warningMs) return LASER_PHASES.WARNING;
  if (cycleElapsed < warningMs + activeMs) return LASER_PHASES.ACTIVE;
  return LASER_PHASES.REST;
}

