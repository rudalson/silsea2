const tilemapUrl = new URL("../../../assets/levels/level-01/tilemap.json", import.meta.url).href;

export default {
  schemaVersion: 1,
  id: "level-01",
  name: "무지개 언덕",
  order: 1,
  progression: { direction: "right", retainAbilities: true },
  assets: {
    tilemap: tilemapUrl,
    tilemapKey: "level-01-map",
    tileset: "rainbow_tileset",
    preview: "stage_preview_rainbow_hill",
    backgrounds: {
      normal: { far: "bg_normal_far", mid: "bg_normal_mid", near: "bg_normal_near" },
      pit: { far: "bg_pit_far", mid: "bg_pit_mid", near: "bg_pit_near" },
      boss: { far: "bg_boss_far", mid: "bg_boss_mid", near: "bg_boss_near" }
    },
    decorations: {
      grass: "decor_grass",
      flower: "decor_flower"
    },
    objects: {
      items: {
        star: "item_star",
        percent_small: "item_percent_small",
        percent_large: "item_percent_large",
        horn: "item_horn",
        wings: "item_wings",
        alicorn: "item_alicorn"
      },
      checkpoint: "checkpoint_flag",
      gate: "rainbow_gate"
    },
    bgm: { field: "bgm_field", boss: "bgm_boss", clear: "bgm_clear" }
  },
  world: { width: 16384, height: 768, tileSize: 64 },
  parallax: { sky: 0.02, far: 0.08, mid: 0.2, near: 0.45 },
  player: { spawn: { x: 128, y: 576 } },
  sections: [
    { id: "tutorial", type: "normal", xStart: 0, xEnd: 2048, mood: "normal" },
    { id: "unicorn_garden", type: "normal", xStart: 2048, xEnd: 4608, mood: "normal" },
    { id: "orchard_rhythm", type: "normal", xStart: 4608, xEnd: 6656, mood: "normal" },
    { id: "pegasus_ravine", type: "normal", xStart: 6656, xEnd: 9472, mood: "pit" },
    { id: "storm_path", type: "normal", xStart: 9472, xEnd: 11520, mood: "pit" },
    { id: "alicorn_festival", type: "normal", xStart: 11520, xEnd: 13312, mood: "normal" },
    { id: "recovery", type: "normal", xStart: 13312, xEnd: 14336, mood: "normal" },
    {
      id: "boss",
      type: "boss",
      xStart: 14336,
      xEnd: 16384,
      mood: "boss",
      lockCamera: true,
      bgm: "boss",
      boss: {
        key: "potato_king",
        hp: 3,
        phases: ["single_ground_wave", "split_wave_and_high_shot", "staggered_crossfire"]
      }
    }
  ],
  cameraCues: [
    { id: "cue_first_hazard", xStart: 2592, xEnd: 2944, lookAhead: 170, targetX: 3008 },
    { id: "cue_orchard_rhythm", xStart: 4864, xEnd: 6208, lookAhead: 175, targetX: 6272 },
    { id: "cue_short_pit", xStart: 7040, xEnd: 7808, lookAhead: 180, targetX: 7872 },
    { id: "cue_long_pit", xStart: 9472, xEnd: 10560, lookAhead: 180, targetX: 10624 },
    { id: "cue_storm_combo", xStart: 10496, xEnd: 11456, lookAhead: 180, targetX: 11520 }
  ],
  decorations: [
    { id: "tutorial_grass", asset: "grass", x: 640, y: 578, width: 144, height: 72, depth: -5, alpha: 0.86 },
    { id: "unicorn_garden_flower", asset: "flower", x: 3200, y: 578, width: 88, height: 88, depth: -4, alpha: 0.88 }
  ],
  checkpoints: [
    { id: "cp_intro", x: 2336, y: 576, activationTop: 0 },
    { id: "cp1", x: 5056, y: 576, activationTop: 0 },
    { id: "cp2", x: 7296, y: 576, activationTop: 0 },
    { id: "cp_flight_landing", x: 7904, y: 576, activationTop: 0 },
    { id: "cp3", x: 9792, y: 576, activationTop: 0 },
    { id: "cp_storm_landing", x: 10560, y: 576, activationTop: 0 },
    { id: "cp4", x: 11648, y: 576, activationTop: 0 },
    { id: "cp5", x: 14208, y: 576, activationTop: 0, restoresHealth: true }
  ],
  enemies: [
    { id: "e_intro_potato", type: "raw_potato", x: 1344, y: 576, patrol: 192 },
    { id: "e_unicorn_potato_01", type: "raw_potato", x: 2560, y: 576, patrol: 64 },
    { id: "e_orchard_potato_01", type: "raw_potato", x: 5632, y: 432, patrol: 48 },
    { id: "e_cloud_ravine", type: "dark_cloud", x: 8704, y: 224, triggerX: 8512,
      activationDelayMs: 350, telegraphMs: 900, cooldownMs: 2400 },
    { id: "e_magpie_ravine", type: "magpie", x: 9472, y: 224, triggerX: 9248,
      activationDelayMs: 350, telegraphMs: 800, cooldownMs: 2200 },
    {
      id: "e_cloud_storm_01",
      type: "dark_cloud",
      x: 11008,
      y: 256,
      triggerX: 10816,
      activationDelayMs: 350,
      telegraphMs: 900,
      cooldownMs: 2400
    },
    {
      id: "e_magpie_storm_01",
      type: "magpie",
      x: 11456,
      y: 224,
      triggerX: 11200,
      activationDelayMs: 900,
      telegraphMs: 800,
      cooldownMs: 2200
    },
    { id: "e_alicorn_potato", type: "raw_potato", x: 12000, y: 576, patrol: 48 },
    { id: "e_alicorn_potato_02", type: "raw_potato", x: 12416, y: 480, patrol: 48 },
    { id: "e_alicorn_potato_03", type: "raw_potato", x: 12800, y: 416, patrol: 48 }
  ],
  items: [
    { id: "star_intro", type: "star", x: 384, y: 496 },
    { id: "first_jump_arc", type: "star_arc", x: 928, y: 464, count: 5, radius: 120 },
    { id: "first_jump_landing", type: "star", x: 1152, y: 496 },
    { id: "horn_intro", type: "horn", x: 1792, y: 576, activationTop: 0 },
    { id: "magnet_arc", type: "star_arc", x: 2112, y: 496, count: 8, radius: 112 },
    { id: "pumpkin_reward", type: "percent_large", x: 3072, y: 576 },
    { id: "unicorn_high_arc", type: "star_arc", x: 4384, y: 360, count: 8, radius: 124 },
    { id: "unicorn_ground_star", type: "star", x: 4448, y: 496 },
    { id: "unicorn_sky_reward", type: "percent_large", x: 4576, y: 384 },
    { id: "orchard_arc_low", type: "star_arc", x: 5152, y: 450, count: 8, radius: 130 },
    { id: "orchard_arc_high", type: "star_arc", x: 6032, y: 448, count: 6, radius: 128 },
    { id: "orchard_ground_star", type: "star", x: 6528, y: 496 },
    { id: "orchard_reward", type: "percent_large", x: 6368, y: 432 },
    { id: "wings_intro", type: "wings", x: 6848, y: 576, activationTop: 0 },
    { id: "flight_practice_arc", type: "star_arc", x: 7104, y: 440, count: 6, radius: 112 },
    { id: "flight_arc_short", type: "star_arc", x: 7552, y: 420, count: 10, radius: 170 },
    { id: "flight_ground_star", type: "star_arc", x: 7936, y: 512, count: 5, radius: 96 },
    { id: "flight_sky_reward", type: "percent_large", x: 7584, y: 300 },
    { id: "flight_arc_cloud", type: "star_arc", x: 8224, y: 392, count: 6, radius: 104 },
    { id: "updraft_reward", type: "percent_small", x: 8224, y: 320 },
    { id: "flight_arc_long", type: "star_arc", x: 8960, y: 392, count: 8, radius: 160 },
    { id: "flight_reward", type: "percent_small", x: 9760, y: 520 },
    { id: "mechanics_combo_arc", type: "star_arc", x: 10272, y: 390, count: 8, radius: 160 },
    { id: "bridge_reward", type: "percent_large", x: 10280, y: 464 },
    { id: "storm_arc", type: "star_arc", x: 10704, y: 488, count: 6, radius: 112 },
    { id: "storm_reward", type: "percent_small", x: 11328, y: 520 },
    { id: "alicorn_intro", type: "alicorn", x: 11808, y: 576, activationTop: 0 },
    { id: "alicorn_entry_arc", type: "star_arc", x: 12064, y: 488, count: 8, radius: 112 },
    { id: "alicorn_arc", type: "star_arc", x: 12416, y: 408, count: 10, radius: 144 },
    { id: "alicorn_upper_arc", type: "star_arc", x: 12800, y: 344, count: 10, radius: 144 },
    { id: "alicorn_ground_star", type: "star", x: 13056, y: 496 },
    { id: "alicorn_reward", type: "percent_large", x: 13184, y: 352 },
    { id: "recovery_arc", type: "star_arc", x: 13488, y: 432, count: 5, radius: 112 },
    { id: "secret_step_star", type: "star", x: 13696, y: 360 },
    { id: "secret_sky_arc", type: "star_arc", x: 13920, y: 304, count: 8, radius: 108 },
    { id: "secret_sky_reward", type: "percent_large", x: 13984, y: 336 },
    { id: "boss_rest_reward", type: "percent_small", x: 14272, y: 576 },
    { id: "boss_rest_star", type: "star", x: 14144, y: 496 }
  ],
  secrets: [
    {
      id: "secret_sky_garden",
      name: "회복길 하늘 정원",
      xStart: 13824,
      xEnd: 14112,
      yTop: 216,
      yBottom: 420,
      reward: 200,
      guideItemIds: ["secret_sky_arc"],
      rewardItemId: "secret_sky_reward"
    }
  ],
  terrainMechanics: {
    // Stage 1 teaches flight and updrafts; timed platforms are introduced later.
    movingPlatforms: [],
    updrafts: [
      {
        id: "updraft_practice",
        x: 8128,
        y: 224,
        width: 192,
        height: 352,
        liftSpeed: 420,
        liftAcceleration: 1050
      },
      {
        id: "updraft_combo",
        x: 9984,
        y: 224,
        width: 192,
        height: 352,
        liftSpeed: 390,
        liftAcceleration: 950
      }
    ],
    crumblePlatforms: []
  },
  hazards: [
    { id: "pumpkin_intro", type: "spike_pumpkin", x: 2880, y: 576 },
    { id: "pumpkin_unicorn_gate", type: "spike_pumpkin", x: 3744, y: 576 },
    { id: "pumpkin_orchard_01", type: "spike_pumpkin", x: 5408, y: 576 },
    { id: "pit_short", type: "pit", xStart: 7424, xEnd: 7744, respawnX: 7296 },
    { id: "pit_long", type: "pit", xStart: 9984, xEnd: 10496, respawnX: 9856 }
  ],
  objectives: {
    required: [
      { type: "defeat_boss", target: "potato_king" },
      { type: "reach_gate" }
    ],
    optional: [
      { type: "collect_stars", count: 70, reward: 700 },
      { type: "find_secrets", count: 1, reward: 300 },
      { type: "clear_time", seconds: 540, reward: 400 },
      { type: "no_damage", reward: 1000 }
    ]
  },
  difficulty: {
    easyMode: {
      extraCheckpoints: [{ id: "cp_easy", x: 8832, y: 576 }],
      removeEnemies: ["e_cloud_storm_01", "e_magpie_storm_01"],
      player: { extraHp: 2, flightDrainMultiplier: 0.65 },
      boss: { telegraphMultiplier: 1.35 },
      terrainMechanics: { movingSpeedMultiplier: 0.72, crumbleDelayMultiplier: 1.5 },
      pitScoreLoss: 0
    }
  }
};
