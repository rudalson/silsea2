import { PALETTE } from "./palette.js";

const toNumber = (hex) => Number.parseInt(hex.slice(1), 16);

export const DEFAULT_TUNING = Object.freeze({
  gravity: 1900,
  jumpVelocity: -720,
  jumpCutMultiplier: 0.45,
  fallGravityMultiplier: 1.28,
  acceleration: 2300,
  deceleration: 3000,
  maxSpeed: 360,
  airAcceleration: 1100,
  coyoteTime: 120,
  jumpBuffer: 120,
  maxFallSpeed: 900
});

const sharedPhysics = Object.freeze({
  maxHp: 3,
  bodyWidth: 44,
  bodyHeight: 58,
  displayWidth: 72,
  displayHeight: 96
});

export const CHARACTERS = Object.freeze({
  silsea: {
    id: "silsea",
    name: "실세아",
    color: toNumber(PALETTE.base[0]),
    accent: toNumber(PALETTE.base[2]),
    shape: "slender",
    physics: sharedPhysics,
    tuning: DEFAULT_TUNING
  },
  potato89: {
    id: "potato89",
    name: "89% 구운 감자",
    color: toNumber(PALETTE.base[3]),
    accent: toNumber(PALETTE.highlight[1]),
    shape: "round",
    physics: sharedPhysics,
    tuning: DEFAULT_TUNING
  }
});

export const CHARACTER_LIST = Object.values(CHARACTERS);
export const getCharacter = (id) => CHARACTERS[id] ?? CHARACTERS.silsea;
export const cloneTuning = (character) => ({ ...character.tuning });
