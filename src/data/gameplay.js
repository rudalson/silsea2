export const FORMS = Object.freeze({
  BASE: "base",
  UNICORN: "unicorn",
  PEGASUS: "pegasus",
  ALICORN: "alicorn"
});

export const CORE_RULES = Object.freeze({
  maxHp: 3,
  hurtLockMs: 220,
  invulnerableMs: 2000,
  flightMaxMs: 10000,
  flightRecoveryMs: 3000,
  glideMaxFallSpeed: 260,
  alicornDurationMs: 12000,
  alicornWarningMs: 3000,
  magnetRadius: 176,
  alicornMagnetRadius: 292,
  comboWindowMs: 2500,
  bossTelegraphMs: 820
});

export const SCORE_VALUES = Object.freeze({
  star: 10,
  percent_small: 25,
  percent_large: 100,
  raw_potato: 40,
  spike_pumpkin: 60,
  dark_cloud: 80,
  magpie: 100,
  boss_hit: 150,
  recovery: 1
});

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function getMagpieStealAmount(score) {
  return Math.min(Math.floor(Math.max(0, score) * 0.1), 100);
}

export function getRespawnScoreLoss(score) {
  return Math.min(Math.floor(Math.max(0, score) * 0.08), 75);
}

export function stepFlightGauge(currentMs, deltaMs, { grounded = false, flying = false, checkpoint = false } = {}) {
  if (checkpoint) return CORE_RULES.flightMaxMs;
  if (grounded) {
    const recoveryRate = CORE_RULES.flightMaxMs / CORE_RULES.flightRecoveryMs;
    return clamp(currentMs + deltaMs * recoveryRate, 0, CORE_RULES.flightMaxMs);
  }
  if (flying) return clamp(currentMs - deltaMs, 0, CORE_RULES.flightMaxMs);
  return clamp(currentMs, 0, CORE_RULES.flightMaxMs);
}
