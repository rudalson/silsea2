import { PALETTE } from "./palette.js";

const toNumber = (hex) => Number.parseInt(hex.slice(1), 16);

export const ENEMY_DEFINITIONS = Object.freeze({
  raw_potato: { behavior: "patrol", params: ["patrol"], color: toNumber(PALETTE.base[3]) },
  spike_pumpkin: { behavior: "stationary", params: [], color: toNumber(PALETTE.danger[0]) },
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
  potato_king: { behavior: "boss_graybox", params: [], color: toNumber(PALETTE.base[3]) }
});

export const ENEMY_TYPES = Object.freeze(Object.keys(ENEMY_DEFINITIONS));
