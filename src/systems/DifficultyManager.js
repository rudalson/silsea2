const DEFAULT_DIFFICULTY = Object.freeze({
  enabled: false,
  player: Object.freeze({ extraHp: 0, flightDrainMultiplier: 1 }),
  boss: Object.freeze({ telegraphMultiplier: 1 }),
  pitScoreLoss: null
});

const finiteOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

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

  return {
    ...level,
    checkpoints: [...(level.checkpoints ?? []), ...extraCheckpoints],
    enemies: (level.enemies ?? []).filter(({ id }) => !removedEnemies.has(id))
  };
}
