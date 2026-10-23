import { PALETTE } from "./palette.js";
import { THEMED_ENEMIES, isThemedEnemy } from "./themedEnemies.js";

const toNumber = (hex) => Number.parseInt(hex.slice(1), 16);

export const ENEMY_DEFINITIONS = Object.freeze({
  ...Object.fromEntries(Object.entries(THEMED_ENEMIES).map(([type, rules]) => [type, {
    behavior: "character_attack", params: ["patrol"], color: rules.color,
    artBody: { width: 58, height: 56, scale: 0.86 }
  }])),
  raw_potato: { behavior: "patrol", params: ["patrol"], color: toNumber(PALETTE.base[3]) },
  merong_imp: { behavior: "patrol", params: ["patrol"], color: toNumber(PALETTE.collect[1]) },
  tape_rollbug: { behavior: "patrol", params: ["patrol"], color: toNumber(PALETTE.collect[0]),
    artBody: { width: 62, height: 48, scale: 0.82 } },
  tape_boxling: { behavior: "patrol", params: ["patrol"], color: toNumber(PALETTE.collect[1]),
    artBody: { width: 52, height: 56, scale: 0.82 } },
  wave_crab: { behavior: "telegraph_side_rush", params: ["patrol", "canRush"], color: toNumber(PALETTE.danger[0]) },
  lantern_goblin: { behavior: "telegraph_lantern_shot", params: ["patrol"], color: toNumber(PALETTE.alora[4]) },
  dew_snail: { behavior: "telegraph_roll", params: ["patrol"], color: toNumber(PALETTE.sylvia[10]) },
  spike_pumpkin: { behavior: "stationary", params: [], color: toNumber(PALETTE.danger[0]) },
  coral_urchin: { behavior: "stationary", params: [], color: toNumber(PALETTE.collect[1]) },
  lantern_jellyfish: { behavior: "telegraph_underwater_rush", params: ["waterZoneId"], color: toNumber(PALETTE.collect[1]) },
  dark_cloud: {
    behavior: "telegraph_lightning",
    params: ["triggerX", "activationDelayMs", "telegraphMs", "cooldownMs"],
    color: toNumber(PALETTE.danger[1])
  },
  magpie: {
    behavior: "telegraph_dive",
    params: ["triggerX", "activationDelayMs", "telegraphMs", "cooldownMs"],
    color: toNumber(PALETTE.outline)
  },
  potato_archer: {
    behavior: "telegraph_projectile",
    params: ["triggerX", "activationDelayMs", "telegraphMs", "cooldownMs", "arrowSpeed"],
    color: toNumber(PALETTE.base[3])
  },
  potato_king: { behavior: "boss_graybox", params: [], color: toNumber(PALETTE.base[3]) }
});

export const ENEMY_TYPES = Object.freeze(Object.keys(ENEMY_DEFINITIONS));

export const isMistEnemy = (type) => type === "lantern_goblin" || type === "dew_snail";
export const isSimplePatrolEnemy = (type) => ENEMY_DEFINITIONS[type]?.behavior === "patrol";
export const isGroundPatrolEnemy = (type) => isSimplePatrolEnemy(type) || isThemedEnemy(type) || type === "wave_crab" || isMistEnemy(type);
