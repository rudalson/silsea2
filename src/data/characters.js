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

const createRenderMetadata = ({ wingsX = -6, wingsY = -49, integratedHorn = false, integratedWings = false } = {}) => Object.freeze({
  integratedHorn,
  integratedWings,
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
const integratedWingRender = createRenderMetadata({ integratedWings: true });

const createCharacter = ({
  id,
  name,
  englishName,
  description,
  sex = null,
  color,
  accent,
  shape = "slender",
  profile = id,
  selectionSymbol = null,
  render = silseaLikeRender,
  artReady = false,
  moveSequence = "run",
  hasStomp = false,
  stableBody = false
}) => Object.freeze({
  id,
  name,
  englishName,
  description,
  sex,
  color: toNumber(color),
  accent: toNumber(accent),
  shape,
  selectionSymbol,
  fallback: Object.freeze({ shape, profile, selectionSymbol }),
  render,
  artReady,
  animation: Object.freeze({ moveSequence, hasStomp, stableBody }),
  physics: sharedPhysics,
  tuning: DEFAULT_TUNING
});

export const CHARACTERS = Object.freeze({
  silsea: createCharacter({
    id: "silsea",
    name: "실세아",
    englishName: "Sylsea",
    sex: "male",
    description: "빠르고 용감한 친구",
    color: PALETTE.base[0],
    accent: PALETTE.base[2],
    render: integratedWingRender,
    stableBody: true,
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
    render: integratedWingRender,
    artReady: true,
    moveSequence: "roll",
    stableBody: true,
    hasStomp: true
  }),
  sylvia: createCharacter({
    id: "sylvia",
    name: "실비아",
    englishName: "Sylvia",
    description: "우아하고 다정한 무지갯빛 친구",
    sex: "female",
    color: PALETTE.sylvia[0],
    accent: PALETTE.sylvia[6],
    render: integratedWingRender,
    stableBody: true,
    artReady: true
  }),
  sunlight: createCharacter({
    id: "sunlight",
    name: "선라이트",
    englishName: "Sunlight",
    description: "햇살처럼 용기를 전하는 친구",
    color: PALETTE.sunlight[0],
    accent: PALETTE.sunlight[2],
    selectionSymbol: "sun",
    render: integratedWingRender,
    stableBody: true,
    artReady: true
  }),
  moonlight: createCharacter({
    id: "moonlight",
    name: "문라이트",
    englishName: "Moonlight",
    description: "수줍지만 강한 초승달의 친구",
    color: PALETTE.moonlight[0],
    accent: PALETTE.moonlight[3],
    selectionSymbol: "moon",
    render: integratedWingRender,
    stableBody: true,
    artReady: true
  }),
  aurora: createCharacter({
    id: "aurora",
    name: "오로라",
    englishName: "Aurora",
    description: "알로라의 든든하고 다정한 언니",
    sex: "female",
    color: PALETTE.aurora[0],
    accent: PALETTE.aurora[3],
    selectionSymbol: "aurora",
    render: integratedWingRender,
    stableBody: true,
    artReady: true
  }),
  alora: createCharacter({
    id: "alora",
    name: "알로라",
    englishName: "Alora",
    description: "오로라빛을 품은 다정한 친구",
    color: PALETTE.alora[0],
    accent: PALETTE.alora[3],
    selectionSymbol: "aurora",
    render: integratedWingRender,
    stableBody: true,
    artReady: true
  }),
  oceandream: createCharacter({
    id: "oceandream",
    name: "오션드림",
    englishName: "Ocean Dream",
    description: "물놀이를 좋아하는 장난꾸러기",
    sex: "female",
    color: PALETTE.oceandream[0],
    accent: PALETTE.oceandream[4],
    selectionSymbol: "wave",
    render: integratedWingRender,
    stableBody: true,
    artReady: true
  })
});

export const CHARACTER_LIST = Object.values(CHARACTERS);
export const getCharacter = (id) => CHARACTERS[id] ?? CHARACTERS.silsea;
export const cloneTuning = (character) => ({ ...character.tuning });
