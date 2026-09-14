import { CHARACTER_LIST } from "./characters.js";

const createSequenceKeys = (character, unicorn = false) => {
  const prefix = unicorn ? `${character.id}_unicorn` : character.id;
  const keys = {
    idle: `${prefix}_idle`,
    move: `${prefix}_${character.animation.moveSequence}`,
    jump: `${prefix}_jump_up`,
    fall: `${prefix}_fall`,
    land: `${prefix}_land`,
    hurt: `${prefix}_hurt`
  };
  if (character.animation.hasStomp) keys.stomp = `${prefix}_stomp`;
  if (!unicorn) {
    keys.transform_unicorn = `${prefix}_transform_unicorn`;
    keys.transform_pegasus = `${prefix}_transform_pegasus`;
    keys.transform_alicorn = `${prefix}_transform_alicorn`;
  }
  keys.fly = `${prefix}_fly`;
  if (!unicorn) keys.wing_guard = `${prefix}_wing_guard`;
  keys.swim = `${prefix}_swim`;
  keys.victory = `${prefix}_victory`;
  return Object.freeze(keys);
};

const createCharacterKeyMap = (unicorn = false) => Object.freeze(Object.fromEntries(
  CHARACTER_LIST.map((character) => [character.id, createSequenceKeys(character, unicorn)])
));

const CHARACTER_SEQUENCE_KEYS = createCharacterKeyMap();
const UNICORN_SEQUENCE_KEYS = createCharacterKeyMap(true);

const SEQUENCE_TIMINGS = Object.freeze({
  idle: Object.freeze({ durations: [260, 180, 200, 260], repeat: -1 }),
  move: Object.freeze({ durations: [80, 70, 85, 70, 80, 70, 85, 70], repeat: -1 }),
  jump: Object.freeze({ durations: [140, 160], repeat: 0 }),
  fall: Object.freeze({ durations: [180, 180], repeat: -1 }),
  land: Object.freeze({ durations: [80, 120], repeat: 0 }),
  hurt: Object.freeze({ durations: [100, 140], repeat: 0 }),
  stomp: Object.freeze({ durations: [180, 80, 110, 150], repeat: 0 }),
  transform_unicorn: Object.freeze({ durations: [180, 120, 90, 90, 120, 320], repeat: 0 }),
  transform_pegasus: Object.freeze({ durations: [180, 120, 100, 100, 130, 320], repeat: 0 }),
  transform_alicorn: Object.freeze({ durations: [180, 120, 90, 90, 90, 100, 150, 360], repeat: 0 }),
  fly: Object.freeze({ durations: [110, 90, 100, 110, 90, 100], repeat: -1 }),
  wing_guard: Object.freeze({ durations: [110, 90, 700, 130], repeat: -1 }),
  swim: Object.freeze({ durations: [130, 110, 120, 130, 110, 120], repeat: -1 }),
  victory: Object.freeze({ durations: [150, 110, 110, 140, 180, 280], repeat: -1 })
});

// Quiet holds and a short blink, rather than a rapid breathing loop. Airborne
// poses finish once and hold; the player changes them when velocity changes.
const SILSEA_TIMINGS = Object.freeze({
  idle: { durations: [2200, 180, 100, 720], repeat: -1 },
  move: { durations: [75, 65, 75, 85, 75, 65, 75, 85], repeat: -1 },
  jump: { durations: [100, 180], repeat: 0 },
  fall: { durations: [160, 220], repeat: 0 },
  fly: { durations: [130, 85, 70, 110, 110, 135], repeat: -1 },
  wing_guard: { durations: [100, 100, 700, 100], repeat: 0 },
  swim: { durations: [160, 140, 150, 160, 140, 150], repeat: -1 },
  victory: { durations: [160, 180, 140, 160, 180, 560], repeat: -1 }
});

// A slightly weightier gait / wingbeat suits the short-legged round pony.
const POTATO_TIMINGS = Object.freeze({
  idle: { durations: [2500, 180, 110, 810], repeat: -1 },
  move: { durations: [90, 80, 80, 90, 90, 80, 80, 90], repeat: -1 },
  jump: { durations: [110, 190], repeat: 0 },
  fall: { durations: [170, 230], repeat: 0 },
  fly: { durations: [150, 90, 80, 120, 130, 150], repeat: -1 },
  wing_guard: { durations: [110, 100, 700, 100], repeat: 0 },
  swim: { durations: [180, 150, 160, 180, 150, 160], repeat: -1 },
  victory: { durations: [180, 160, 160, 180, 200, 700], repeat: -1 }
});
const SYLVIA_TIMINGS = Object.freeze({
  idle: { durations: [2400, 180, 100, 820], repeat: -1 },
  move: { durations: [80, 70, 75, 85, 80, 70, 75, 85], repeat: -1 },
  jump: { durations: [110, 190], repeat: 0 },
  fall: { durations: [160, 240], repeat: 0 },
  fly: { durations: [145, 95, 75, 110, 125, 150], repeat: -1 },
  wing_guard: { durations: [110, 100, 700, 100], repeat: 0 },
  swim: { durations: [170, 150, 160, 170, 150, 160], repeat: -1 },
  victory: { durations: [180, 160, 160, 180, 220, 700], repeat: -1 }
});
const CHARACTER_TIMINGS = { silsea: SILSEA_TIMINGS, potato89: POTATO_TIMINGS, sylvia: SYLVIA_TIMINGS };

export const getCharacterSequenceKey = (characterId, sequence) =>
  CHARACTER_SEQUENCE_KEYS[characterId]?.[sequence] ?? null;

export const getCharacterAnimationKey = (characterId, sequence, variant = "base") =>
  variant === "base"
    ? `character:${characterId}:${sequence}`
    : `character:${characterId}:${variant}:${sequence}`;

export const getCharacterAnimationSpec = (characterId, sequence, variant = "base") => {
  const variantTextureKey = variant === "unicorn" ? UNICORN_SEQUENCE_KEYS[characterId]?.[sequence] : null;
  const textureKey = variantTextureKey ?? getCharacterSequenceKey(characterId, sequence);
  const timing = CHARACTER_TIMINGS[characterId]?.[sequence] ?? SEQUENCE_TIMINGS[sequence];
  if (!textureKey || !timing) return null;
  return {
    key: getCharacterAnimationKey(characterId, sequence, variantTextureKey ? variant : "base"),
    textureKey,
    durations: timing.durations,
    durationMs: timing.durations.reduce((total, duration) => total + duration, 0),
    repeat: timing.repeat
  };
};

export const getCharacterAssetKeys = (characterId) =>
  [...new Set([
    ...Object.values(CHARACTER_SEQUENCE_KEYS[characterId] ?? {}),
    ...Object.values(UNICORN_SEQUENCE_KEYS[characterId] ?? {})
  ])];

export const getCharacterSequenceNames = (characterId) =>
  Object.keys(CHARACTER_SEQUENCE_KEYS[characterId] ?? {});

export const getCharacterAnimationVariants = () => ["base", "unicorn"];
