const finiteOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export const WAVE_STATES = Object.freeze({
  IDLE: "idle",
  WARNING: "warning",
  ACTIVE: "active"
});

export const clampRatio = (value) => Math.min(1, Math.max(0, finiteOr(value, 0)));

export function getMistZoneAt(x, zones = []) {
  const position = finiteOr(x, 0);
  return zones.find((zone) => (
    position >= finiteOr(zone.xStart, 0)
    && position < finiteOr(zone.xEnd, 0)
  )) ?? null;
}

export function resolveMistProfile(zone, {
  reduced = false,
  reducedDensityMultiplier = 0.55,
  reducedRadiusBonus = 70
} = {}) {
  const density = clampRatio(zone?.density ?? 0);
  const visibilityRadius = Math.max(120, finiteOr(zone?.visibilityRadius, 420));
  return {
    density: reduced ? density * clampRatio(reducedDensityMultiplier) : density,
    visibilityRadius: reduced
      ? visibilityRadius + Math.max(0, finiteOr(reducedRadiusBonus, 70))
      : visibilityRadius
  };
}

export function stepBreathRatio(currentRatio, deltaMs, {
  underwater = false,
  recovering = false,
  immune = false,
  depleteSeconds = 12,
  refillSeconds = 2
} = {}) {
  const current = clampRatio(currentRatio);
  const seconds = Math.max(0, finiteOr(deltaMs, 0)) / 1000;
  if (underwater && !immune) {
    return clampRatio(current - seconds / Math.max(0.1, finiteOr(depleteSeconds, 12)));
  }
  if (recovering) {
    return clampRatio(current + seconds / Math.max(0.1, finiteOr(refillSeconds, 2)));
  }
  return current;
}

export function getWaveIntervalMs(interval = {}, randomValue = 0.5) {
  const min = Math.max(0.1, finiteOr(interval.min, 9));
  const max = Math.max(min, finiteOr(interval.max, min));
  const ratio = clampRatio(randomValue);
  return Math.round((min + (max - min) * ratio) * 1000);
}

export function getWaterContact(bounds, zones = [], surfaceMargin = 8) {
  const x = finiteOr(bounds?.x, 0);
  const headY = finiteOr(bounds?.headY, 0);
  const zone = zones.find((candidate) => (
    x >= finiteOr(candidate.xStart, 0)
    && x <= finiteOr(candidate.xEnd, 0)
    && headY <= finiteOr(candidate.bottomY, Number.POSITIVE_INFINITY)
  )) ?? null;
  if (!zone) return { zone: null, underwater: false, aboveSurface: true };
  const surfaceY = finiteOr(zone.surfaceY, 0);
  return {
    zone,
    underwater: headY > surfaceY,
    aboveSurface: headY <= surfaceY - Math.max(0, finiteOr(surfaceMargin, 8))
  };
}

export function isInsideShelter(bounds, shelters = []) {
  const x = finiteOr(bounds?.x, 0);
  const y = finiteOr(bounds?.y, 0);
  return shelters.some((shelter) => (
    x >= finiteOr(shelter.xStart, 0)
    && x <= finiteOr(shelter.xEnd, 0)
    && y >= finiteOr(shelter.yTop, Number.NEGATIVE_INFINITY)
    && y <= finiteOr(shelter.yBottom, Number.POSITIVE_INFINITY)
  ));
}
