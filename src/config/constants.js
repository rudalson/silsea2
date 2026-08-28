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
  BREATH_CHANGED: "player:breath-changed",
  WATER_STATE_CHANGED: "environment:water-state-changed",
  TSUNAMI_WARNING: "environment:tsunami-warning",
  TSUNAMI_STATE_CHANGED: "environment:tsunami-state-changed",
  MIST_ZONE_CHANGED: "environment:mist-zone-changed",
  LASER_STATE_CHANGED: "environment:laser-state-changed",
  LASER_SWITCH_DISABLED: "environment:laser-switch-disabled",
  FORM_CHANGED: "player:form-changed",
  FORM_WARNING: "player:form-warning",
  GUARD_CHANGED: "player:guard-changed",
  PROJECTILE_GUARDED: "player:projectile-guarded",
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
  skyTop: PALETTE.environmentSky[0],
  skyBottom: PALETTE.environmentSky[1],
  far: PALETTE.environmentFar[1],
  mid: PALETTE.environmentMid[0],
  near: PALETTE.environmentNear[1],
  ground: PALETTE.environmentNear[2],
  grass: PALETTE.environmentNear[0],
  nightVeil: PALETTE.environmentNight[0],
  nightTrunk: PALETTE.environmentNight[1],
  nightCanopy: PALETTE.environmentNight[2],
  silsea: PALETTE.base[0],
  potato: PALETTE.base[3],
  accent: PALETTE.base[2],
  outline: PALETTE.environmentNeutral[0],
  danger: PALETTE.danger[0],
  dangerAlt: PALETTE.danger[1],
  collect: PALETTE.collect[0],
  collectBlue: PALETTE.collect[1],
  collectPink: PALETTE.collect[2],
  white: PALETTE.highlight[0],
  soft: PALETTE.environmentFar[0],
  panel: withAlpha(PALETTE.environmentNear[1], "DD"),
  panelSoft: withAlpha(PALETTE.environmentNear[1], "CC"),
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
