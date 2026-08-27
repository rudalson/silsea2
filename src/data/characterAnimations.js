const CHARACTER_SEQUENCE_KEYS = Object.freeze({
  silsea: Object.freeze({
    idle: "silsea_idle",
    move: "silsea_run",
    jump: "silsea_jump_up",
    fall: "silsea_fall",
    land: "silsea_land",
    hurt: "silsea_hurt",
    transform_unicorn: "silsea_transform_unicorn",
    transform_pegasus: "silsea_transform_pegasus",
    transform_alicorn: "silsea_transform_alicorn",
    fly: "silsea_fly",
    swim: "silsea_swim",
    victory: "silsea_victory"
  }),
  potato89: Object.freeze({
    idle: "potato89_idle",
    move: "potato89_roll",
    jump: "potato89_jump_up",
    fall: "potato89_fall",
    land: "potato89_land",
    hurt: "potato89_hurt",
    stomp: "potato89_stomp",
    transform_unicorn: "potato89_transform_unicorn",
    transform_pegasus: "potato89_transform_pegasus",
    transform_alicorn: "potato89_transform_alicorn",
    fly: "potato89_fly",
    swim: "potato89_swim",
    victory: "potato89_victory"
  })
});

const UNICORN_SEQUENCE_KEYS = Object.freeze({
  silsea: Object.freeze({
    idle: "silsea_unicorn_idle",
    move: "silsea_unicorn_run",
    jump: "silsea_unicorn_jump_up",
    fall: "silsea_unicorn_fall",
    land: "silsea_unicorn_land",
    hurt: "silsea_unicorn_hurt",
    fly: "silsea_unicorn_fly",
    swim: "silsea_unicorn_swim",
    victory: "silsea_unicorn_victory"
  }),
  potato89: Object.freeze({
    idle: "potato89_unicorn_idle",
    move: "potato89_unicorn_roll",
    jump: "potato89_unicorn_jump_up",
    fall: "potato89_unicorn_fall",
    land: "potato89_unicorn_land",
    hurt: "potato89_unicorn_hurt",
    stomp: "potato89_unicorn_stomp",
    fly: "potato89_unicorn_fly",
    swim: "potato89_unicorn_swim",
    victory: "potato89_unicorn_victory"
  })
});

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
