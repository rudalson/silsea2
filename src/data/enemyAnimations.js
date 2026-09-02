const ENEMY_SEQUENCE_KEYS = Object.freeze({
  raw_potato: Object.freeze({
    idle: "raw_potato_idle",
    move: "raw_potato_roll",
    defeated: "raw_potato_defeated"
  }),
  potato_archer: Object.freeze({
    idle: "potato_archer_idle",
    warning: "potato_archer_aim",
    attack: "potato_archer_shoot",
    defeated: "potato_archer_defeated"
  }),
  spike_pumpkin: Object.freeze({
    idle: "spike_pumpkin_idle",
    warning: "spike_pumpkin_warning",
    defeated: "spike_pumpkin_break"
  }),
  dark_cloud: Object.freeze({
    idle: "dark_cloud_idle",
    warning: "dark_cloud_charge",
    attack: "dark_cloud_attack",
    defeated: "dark_cloud_defeated"
  }),
  magpie: Object.freeze({
    idle: "magpie_fly",
    warning: "magpie_warning",
    attack: "magpie_dive",
    stunned: "magpie_stunned",
    defeated: "magpie_defeated"
  }),
  potato_king: Object.freeze({
    idle: "potato_king_idle",
    jump: "potato_king_jump",
    fall: "potato_king_fall",
    land: "potato_king_land",
    attack: "potato_king_shoot",
    hurt: "potato_king_hurt",
    defeated: "potato_king_defeated"
  }),
  hula_king: Object.freeze({
    idle: "hula_king_idle",
    spin: "hula_king_spin",
    warning: "hula_king_warning",
    throw: "hula_king_throw",
    vulnerable: "hula_king_vulnerable",
    hurt: "hula_king_hurt",
    defeated: "hula_king_defeated"
  }),
  invisible_king: Object.freeze({
    idle: "invisible_king_idle",
    reveal: "invisible_king_reveal",
    hide: "invisible_king_hide",
    attack: "invisible_king_attack",
    hurt: "invisible_king_hurt",
    defeated: "invisible_king_defeated"
  }),
  water_king: Object.freeze({
    idle: "water_king_idle",
    submerge: "water_king_submerge",
    emerge: "water_king_emerge",
    attack: "water_king_attack",
    dizzy: "water_king_dizzy",
    hurt: "water_king_hurt",
    defeated: "water_king_defeated"
  }),
  random_king: Object.freeze({
    idle: "random_king_idle",
    draw: "random_king_draw",
    teleport: "random_king_teleport",
    attack: "random_king_attack",
    taunt: "random_king_taunt",
    vulnerable: "random_king_vulnerable",
    hurt: "random_king_hurt",
    defeated: "random_king_defeated"
  })
});

const ENEMY_TIMINGS = Object.freeze({
  raw_potato: Object.freeze({
    idle: Object.freeze({ durations: [300, 300], repeat: -1 }),
    move: Object.freeze({ durations: [90, 85, 90, 85, 90, 100], repeat: -1 }),
    defeated: Object.freeze({ durations: [110, 90, 120, 240], repeat: 0 })
  }),
  potato_archer: Object.freeze({
    idle: Object.freeze({ durations: [320, 320], repeat: -1 }),
    warning: Object.freeze({ durations: [260, 230, 210], repeat: -1 }),
    attack: Object.freeze({ durations: [70, 90, 180], repeat: 0 }),
    defeated: Object.freeze({ durations: [120, 100, 140, 260], repeat: 0 })
  }),
  spike_pumpkin: Object.freeze({
    idle: Object.freeze({ durations: [320, 320], repeat: -1 }),
    warning: Object.freeze({ durations: [260, 220], repeat: -1 }),
    defeated: Object.freeze({ durations: [120, 80, 80, 90, 120, 240], repeat: 0 })
  }),
  dark_cloud: Object.freeze({
    idle: Object.freeze({ durations: [180, 170, 180, 190], repeat: -1 }),
    warning: Object.freeze({ durations: [180, 170, 160, 190], repeat: -1 }),
    attack: Object.freeze({ durations: [80, 90, 140], repeat: 0 }),
    defeated: Object.freeze({ durations: [120, 110, 130, 260], repeat: 0 })
  }),
  magpie: Object.freeze({
    idle: Object.freeze({ durations: [100, 90, 100, 90, 100, 110], repeat: -1 }),
    warning: Object.freeze({ durations: [200, 180, 240], repeat: -1 }),
    attack: Object.freeze({ durations: [90, 80, 80, 110], repeat: -1 }),
    stunned: Object.freeze({ durations: [220, 180, 220, 180], repeat: -1 }),
    defeated: Object.freeze({ durations: [100, 100, 120, 260], repeat: 0 })
  }),
  potato_king: Object.freeze({
    idle: Object.freeze({ durations: [210, 190, 210, 190], repeat: -1 }),
    jump: Object.freeze({ durations: [180, 140, 120, 160], repeat: 0 }),
    fall: Object.freeze({ durations: [160, 160], repeat: -1 }),
    land: Object.freeze({ durations: [90, 80, 110, 180], repeat: 0 }),
    attack: Object.freeze({ durations: [180, 100, 100, 200], repeat: 0 }),
    hurt: Object.freeze({ durations: [100, 100, 160], repeat: 0 }),
    defeated: Object.freeze({ durations: [150, 120, 110, 110, 130, 160, 220, 360], repeat: 0 })
  }),
  hula_king: Object.freeze({
    idle: Object.freeze({ durations: [220, 200, 220, 200], repeat: -1 }),
    spin: Object.freeze({ durations: [90, 85, 90, 85, 90, 85, 90, 105], repeat: -1 }),
    warning: Object.freeze({ durations: [240, 210, 220, 230], repeat: -1 }),
    throw: Object.freeze({ durations: [80, 75, 85, 95, 120, 190], repeat: 0 }),
    vulnerable: Object.freeze({ durations: [260, 220, 260, 220], repeat: -1 }),
    hurt: Object.freeze({ durations: [100, 100, 160], repeat: 0 }),
    defeated: Object.freeze({ durations: [130, 110, 110, 120, 140, 170, 220, 320], repeat: 0 })
  }),
  invisible_king: Object.freeze({
    idle: Object.freeze({ durations: [230, 210, 230, 210], repeat: -1 }),
    reveal: Object.freeze({ durations: [150, 160, 170, 190, 240, 290], repeat: 0 }),
    hide: Object.freeze({ durations: [70, 70, 70, 70, 70, 70], repeat: 0 }),
    attack: Object.freeze({ durations: [130, 130, 140, 150, 160, 190], repeat: 0 }),
    hurt: Object.freeze({ durations: [100, 100, 160], repeat: 0 }),
    defeated: Object.freeze({ durations: [120, 100, 110, 120, 140, 170, 220, 320], repeat: 0 })
  }),
  water_king: Object.freeze({
    idle: Object.freeze({ durations: [180, 170, 180, 190], repeat: -1 }),
    submerge: Object.freeze({ durations: [70, 75, 80, 85, 85, 85], repeat: 0 }),
    emerge: Object.freeze({ durations: [80, 80, 85, 90, 90, 95], repeat: 0 }),
    attack: Object.freeze({ durations: [90, 95, 100, 100, 105, 110], repeat: 0 }),
    dizzy: Object.freeze({ durations: [140, 130, 140, 150], repeat: -1 }),
    hurt: Object.freeze({ durations: [90, 100, 130], repeat: 0 }),
    defeated: Object.freeze({ durations: [130, 140, 150, 160, 170, 180, 190, 220], repeat: 0 })
  }),
  random_king: Object.freeze({
    idle: Object.freeze({ durations: [180, 170, 180, 190], repeat: -1 }),
    draw: Object.freeze({ durations: [90, 90, 95, 100, 105, 120], repeat: -1 }),
    teleport: Object.freeze({ durations: [75, 75, 80, 85, 90, 105], repeat: 0 }),
    attack: Object.freeze({ durations: [80, 85, 90, 95, 105, 130], repeat: 0 }),
    taunt: Object.freeze({ durations: [90, 90, 100, 110, 120, 150], repeat: 0 }),
    vulnerable: Object.freeze({ durations: [140, 130, 140, 150], repeat: -1 }),
    hurt: Object.freeze({ durations: [90, 100, 130], repeat: 0 }),
    defeated: Object.freeze({ durations: [120, 130, 140, 150, 160, 180, 200, 240], repeat: 0 })
  })
});

export const getEnemyAnimationKey = (enemyType, sequence) => `enemy:${enemyType}:${sequence}`;

export const getEnemyAnimationSpec = (enemyType, sequence) => {
  const textureKey = ENEMY_SEQUENCE_KEYS[enemyType]?.[sequence];
  const timing = ENEMY_TIMINGS[enemyType]?.[sequence];
  if (!textureKey || !timing) return null;
  return {
    key: getEnemyAnimationKey(enemyType, sequence),
    textureKey,
    durations: timing.durations,
    durationMs: timing.durations.reduce((total, duration) => total + duration, 0),
    repeat: timing.repeat
  };
};

export const getEnemyAssetKeys = (enemyType) =>
  [...new Set(Object.values(ENEMY_SEQUENCE_KEYS[enemyType] ?? {}))];

export const getEnemySequenceNames = (enemyType) =>
  Object.keys(ENEMY_SEQUENCE_KEYS[enemyType] ?? {});
