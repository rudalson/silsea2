import { PALETTE } from "../data/palette.js";

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const SCENE_KEYS = Object.freeze({
  BOOT: "BootScene",
  PRELOAD: "PreloadScene",
  MENU: "MenuScene",
  CHARACTER_SELECT: "CharacterSelectScene",
  STAGE_SELECT: "StageSelectScene",
  GAME: "GameScene",
  UI: "UIScene",
  CLEAR: "ClearScene"
});

export const EVENTS = Object.freeze({
  CHECKPOINT: "checkpoint:activated",
  PLAYER_FELL: "player:fell",
  PLAYER_HIT: "player:hit",
  PLAYER_RESPAWNED: "player:respawned",
  PLAYER_HP_CHANGED: "player:hp-changed",
  FORM_CHANGED: "player:form-changed",
  FORM_WARNING: "player:form-warning",
  ITEM_COLLECTED: "item:collected",
  COMBO_CHANGED: "score:combo-changed",
  BOSS_HIT: "boss:hit",
  BOSS_DEFEATED: "boss:defeated",
  GATE_ENTERED: "gate:entered",
  OBJECTIVES_UPDATED: "objectives:updated",
  DEBUG_UPDATED: "debug:updated",
  LEVEL_RELOADED: "level:reloaded"
});

const toNumber = (hex) => Number.parseInt(hex.slice(1), 16);
const withAlpha = (hex, alpha) => `${hex}${alpha}`;

export const CSS_COLORS = Object.freeze({
  skyTop: PALETTE.bgFar[1],
  skyBottom: PALETTE.highlight[1],
  far: PALETTE.bgMid[0],
  mid: PALETTE.bgMid[1],
  near: PALETTE.bgNear[1],
  ground: PALETTE.bgNear[2],
  grass: PALETTE.bgNear[0],
  silsea: PALETTE.base[0],
  potato: PALETTE.base[3],
  accent: PALETTE.base[2],
  outline: PALETTE.outline,
  danger: PALETTE.danger[0],
  dangerAlt: PALETTE.danger[1],
  collect: PALETTE.collect[0],
  collectBlue: PALETTE.collect[1],
  collectPink: PALETTE.collect[2],
  white: PALETTE.highlight[0],
  soft: PALETTE.highlight[1],
  panel: withAlpha(PALETTE.bgNear[1], "DD"),
  panelSoft: withAlpha(PALETTE.bgNear[1], "CC"),
  whiteSoft: withAlpha(PALETTE.highlight[0], "DD"),
  dangerSoft: withAlpha(PALETTE.danger[1], "DD"),
  dangerMedium: withAlpha(PALETTE.danger[1], "CC"),
  collectSoft: withAlpha(PALETTE.collect[0], "EE")
});

export const COLORS = Object.freeze(
  Object.fromEntries(Object.entries(CSS_COLORS).map(([key, value]) => [key, toNumber(value.slice(0, 7))]))
);

export const DEBUG_ENABLED = typeof window !== "undefined"
  ? new URLSearchParams(window.location.search).get("debug") === "1"
  : false;
