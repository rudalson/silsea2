import { PALETTE } from "./palette.js";

const toNumber = (hex) => Number.parseInt(hex.slice(1), 16);

export const ITEM_DEFINITIONS = Object.freeze({
  star: { handler: "collect", color: toNumber(PALETTE.collect[0]) },
  star_arc: { handler: "pattern_arc", color: toNumber(PALETTE.collect[0]), params: ["count", "radius"] },
  percent_small: { handler: "collect", color: toNumber(PALETTE.collect[1]) },
  percent_large: { handler: "collect", color: toNumber(PALETTE.collect[2]) },
  horn: { handler: "transform", color: toNumber(PALETTE.collect[0]) },
  wings: { handler: "transform", color: toNumber(PALETTE.collect[1]) },
  alicorn: { handler: "transform", color: toNumber(PALETTE.collect[2]) }
});

export const ITEM_TYPES = Object.freeze(Object.keys(ITEM_DEFINITIONS));
export const HAZARD_TYPES = Object.freeze(["spike_pumpkin", "pit"]);
