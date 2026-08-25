const DEFAULT_DIFFICULTY = Object.freeze({
  enabled: false,
  player: Object.freeze({ extraHp: 0, flightDrainMultiplier: 1 }),
  boss: Object.freeze({ telegraphMultiplier: 1 }),
  environment: Object.freeze({
    tsunami: Object.freeze({
      firstWarningMultiplier: 1,
      intervalMultiplier: 1,
      telegraphMultiplier: 1,
      speedMultiplier: 1,
      durationMultiplier: 1,
      shelterGraceMultiplier: 1,
      respawnGraceMultiplier: 1
    }),
    breath: Object.freeze({
      drainMultiplier: 1,
      refillMultiplier: 1,
      damageIntervalMultiplier: 1,
      warningRatioMultiplier: 1,
      horizontalSpeedMultiplier: 1,
      strokeSpeedMultiplier: 1,
      strokeRateMultiplier: 1
    }),
    lasers: Object.freeze({ cycleMultiplier: 1 }),
    projectiles: Object.freeze({ speedMultiplier: 1 })
  }),
  pitScoreLoss: null
});

const finiteOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max, fallback = min) => Math.max(min, Math.min(max, finiteOr(value, fallback)));

const getEnvironmentDifficulty = (config = {}) => ({
  tsunami: {
    firstWarningMultiplier: clamp(config.tsunami?.firstWarningMultiplier, 1, 1.5, 1),
    intervalMultiplier: clamp(config.tsunami?.intervalMultiplier, 1, 1.6, 1),
    telegraphMultiplier: clamp(config.tsunami?.telegraphMultiplier, 1, 2, 1),
    speedMultiplier: clamp(config.tsunami?.speedMultiplier, 0.8, 1, 1),
    durationMultiplier: clamp(config.tsunami?.durationMultiplier, 1, 1.4, 1),
    shelterGraceMultiplier: clamp(config.tsunami?.shelterGraceMultiplier, 1, 2, 1),
    respawnGraceMultiplier: clamp(config.tsunami?.respawnGraceMultiplier, 1, 1.6, 1)
  },
  breath: {
    drainMultiplier: clamp(config.breath?.drainMultiplier, 0.6, 1, 1),
    refillMultiplier: clamp(config.breath?.refillMultiplier, 1, 1.5, 1),
    damageIntervalMultiplier: clamp(config.breath?.damageIntervalMultiplier, 1, 1.6, 1),
    warningRatioMultiplier: clamp(config.breath?.warningRatioMultiplier, 1, 1.3, 1),
    horizontalSpeedMultiplier: clamp(config.breath?.horizontalSpeedMultiplier, 1, 1.15, 1),
    strokeSpeedMultiplier: clamp(config.breath?.strokeSpeedMultiplier, 1, 1.15, 1),
    strokeRateMultiplier: clamp(config.breath?.strokeRateMultiplier, 1, 1.25, 1)
  },
  lasers: {
    cycleMultiplier: clamp(config.lasers?.cycleMultiplier, 1, 1.6, 1)
  },
  projectiles: {
    speedMultiplier: clamp(config.projectiles?.speedMultiplier, 0.7, 1, 1)
  }
});

export function getDifficultySettings(level, easyMode = false) {
  const config = easyMode ? level?.difficulty?.easyMode : null;
  if (!config) return DEFAULT_DIFFICULTY;

  return {
    enabled: true,
    player: {
      extraHp: Math.max(0, Math.floor(finiteOr(config.player?.extraHp, 0))),
      flightDrainMultiplier: Math.max(0.1, Math.min(1, finiteOr(config.player?.flightDrainMultiplier, 1)))
    },
    boss: {
      telegraphMultiplier: Math.max(1, Math.min(2, finiteOr(config.boss?.telegraphMultiplier, 1)))
    },
    environment: getEnvironmentDifficulty(config.environment),
    pitScoreLoss: config.pitScoreLoss === undefined
      ? null
      : Math.max(0, Math.floor(finiteOr(config.pitScoreLoss, 0)))
  };
}

export function createRuntimeLevel(level, easyMode = false) {
  const config = easyMode ? level?.difficulty?.easyMode : null;
  if (!config) return level;

  const checkpointIds = new Set((level.checkpoints ?? []).map(({ id }) => id));
  const extraCheckpoints = (config.extraCheckpoints ?? []).filter(({ id }) => !checkpointIds.has(id));
  const removedEnemies = new Set(config.removeEnemies ?? []);
  const terrainConfig = config.terrainMechanics ?? {};
  const movingSpeedMultiplier = Math.max(0.35, Math.min(1, finiteOr(terrainConfig.movingSpeedMultiplier, 1)));
  const crumbleDelayMultiplier = Math.max(1, Math.min(3, finiteOr(terrainConfig.crumbleDelayMultiplier, 1)));
  const terrainMechanics = level.terrainMechanics
    ? {
        ...level.terrainMechanics,
        movingPlatforms: (level.terrainMechanics.movingPlatforms ?? []).map((platform) => ({
          ...platform,
          speed: platform.speed * movingSpeedMultiplier
        })),
        updrafts: (level.terrainMechanics.updrafts ?? []).map((updraft) => ({ ...updraft })),
        crumblePlatforms: (level.terrainMechanics.crumblePlatforms ?? []).map((platform) => ({
          ...platform,
          crumbleDelayMs: Math.round(platform.crumbleDelayMs * crumbleDelayMultiplier)
        }))
      }
    : undefined;
  const environmentDifficulty = getEnvironmentDifficulty(config.environment);
  const tsunami = level.environment?.tsunami
    ? {
        ...level.environment.tsunami,
        firstWarning: level.environment.tsunami.firstWarning * environmentDifficulty.tsunami.firstWarningMultiplier,
        telegraph: level.environment.tsunami.telegraph * environmentDifficulty.tsunami.telegraphMultiplier,
        interval: {
          min: level.environment.tsunami.interval.min * environmentDifficulty.tsunami.intervalMultiplier,
          max: level.environment.tsunami.interval.max * environmentDifficulty.tsunami.intervalMultiplier
        },
        speedMultiplier: level.environment.tsunami.speedMultiplier * environmentDifficulty.tsunami.speedMultiplier,
        duration: level.environment.tsunami.duration * environmentDifficulty.tsunami.durationMultiplier,
        shelterGrace: level.environment.tsunami.shelterGrace * environmentDifficulty.tsunami.shelterGraceMultiplier,
        respawnGrace: level.environment.tsunami.respawnGrace * environmentDifficulty.tsunami.respawnGraceMultiplier,
        shelters: (level.environment.tsunami.shelters ?? []).map((shelter) => ({ ...shelter }))
      }
    : undefined;
  const breath = level.environment?.breath
    ? {
        ...level.environment.breath,
        depleteSeconds: level.environment.breath.depleteSeconds / environmentDifficulty.breath.drainMultiplier,
        refillSeconds: level.environment.breath.refillSeconds / environmentDifficulty.breath.refillMultiplier,
        damageInterval: level.environment.breath.damageInterval * environmentDifficulty.breath.damageIntervalMultiplier,
        warningRatio: Math.min(1, level.environment.breath.warningRatio * environmentDifficulty.breath.warningRatioMultiplier),
        underwaterPhysics: {
          ...level.environment.breath.underwaterPhysics,
          horizontalSpeedMultiplier: Math.min(
            1,
            level.environment.breath.underwaterPhysics.horizontalSpeedMultiplier
              * environmentDifficulty.breath.horizontalSpeedMultiplier
          ),
          strokeVelocity: level.environment.breath.underwaterPhysics.strokeVelocity
            * environmentDifficulty.breath.strokeSpeedMultiplier,
          strokeCooldown: level.environment.breath.underwaterPhysics.strokeCooldown
            / environmentDifficulty.breath.strokeRateMultiplier
        }
      }
    : undefined;
  const environment = level.environment
    ? {
        ...level.environment,
        waterZones: (level.environment.waterZones ?? []).map((zone) => ({ ...zone })),
        ...(tsunami ? { tsunami } : {}),
        ...(breath ? { breath } : {})
      }
    : undefined;

  return {
    ...level,
    checkpoints: [...(level.checkpoints ?? []), ...extraCheckpoints],
    enemies: (level.enemies ?? []).filter(({ id }) => !removedEnemies.has(id)),
    ...(terrainMechanics ? { terrainMechanics } : {}),
    ...(environment ? { environment } : {})
  };
}
