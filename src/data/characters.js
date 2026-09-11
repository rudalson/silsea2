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

const createRenderMetadata = ({ wingsX = -7, wingsY = -61 } = {}) => Object.freeze({
  frameWidth: 128,
  frameHeight: 128,
  baselineY: 112,
  originX: 0.5,
  originY: 112 / 128,
  displayWidth: 128,
  displayHeight: 128,
  attachments: Object.freeze({ wingsX, wingsY })
});

const silseaLikeRender = createRenderMetadata();
const potatoRender = createRenderMetadata({ wingsX: -5, wingsY: -57 });

const createCharacter = ({
  id,
  name,
  englishName,
  description,
  color,
  accent,
  shape = "slender",
  profile = id,
  selectionSymbol = null,
  render = silseaLikeRender,
  artReady = false,
  moveSequence = "run",
  hasStomp = false
}) => Object.freeze({
  id,
  name,
  englishName,
  description,
  color: toNumber(color),
  accent: toNumber(accent),
  shape,
  selectionSymbol,
  fallback: Object.freeze({ shape, profile, selectionSymbol }),
  render,
  artReady,
  animation: Object.freeze({ moveSequence, hasStomp }),
  physics: sharedPhysics,
  tuning: DEFAULT_TUNING
});

export const CHARACTERS = Object.freeze({
  silsea: createCharacter({
    id: "silsea",
    name: "실세아",
    englishName: "Sylsea",
    description: "빠르고 용감한 친구",
    color: PALETTE.base[0],
    accent: PALETTE.base[2],
    artReady: true
  }),
  potato89: createCharacter({
    id: "potato89",
    name: "89% 구운 감자",
    englishName: "89% Baked Potato",
    description: "튼튼하고 다정한 친구",
    color: PALETTE.base[3],
    accent: PALETTE.highlight[1],
    shape: "round",
    render: potatoRender,
    artReady: true,
    moveSequence: "roll",
    hasStomp: true
  }),
  sylvia: createCharacter({
    id: "sylvia",
    name: "실비아",
    englishName: "Sylvia",
    description: "씩씩하고 다정한 무지갯빛 소년",
    color: PALETTE.sylvia[0],
    accent: PALETTE.sylvia[6],
    artReady: true
  })
});

export const CHARACTER_LIST = Object.values(CHARACTERS);
export const getCharacter = (id) => CHARACTERS[id] ?? CHARACTERS.silsea;
export const cloneTuning = (character) => ({ ...character.tuning });
