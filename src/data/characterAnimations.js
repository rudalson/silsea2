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

export const getCharacterSequenceKey = (characterId, sequence) =>
  CHARACTER_SEQUENCE_KEYS[characterId]?.[sequence] ?? null;

export const getCharacterAnimationKey = (characterId, sequence, variant = "base") =>
  variant === "base"
    ? `character:${characterId}:${sequence}`
    : `character:${characterId}:${variant}:${sequence}`;

export const getCharacterAnimationSpec = (characterId, sequence, variant = "base") => {
  const variantTextureKey = variant === "unicorn" ? UNICORN_SEQUENCE_KEYS[characterId]?.[sequence] : null;
  const textureKey = variantTextureKey ?? getCharacterSequenceKey(characterId, sequence);
  const timing = SEQUENCE_TIMINGS[sequence];
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
