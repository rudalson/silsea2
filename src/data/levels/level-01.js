const tilemapUrl = new URL("../../../assets/levels/level-01/tilemap.json", import.meta.url).href;

export default {
  schemaVersion: 1,
  id: "level-01",
  name: "무지개 언덕",
  order: 1,
  assets: {
    tilemap: tilemapUrl,
    tilemapKey: "level-01-map",
    tileset: "grass_tileset",
    backgrounds: {
      normal: { far: "bg_normal_far", mid: "bg_normal_mid", near: "bg_normal_near" },
      pit: { far: "bg_pit_far", mid: "bg_pit_mid", near: "bg_pit_near" },
      boss: { far: "bg_boss_far", mid: "bg_boss_mid", near: "bg_boss_near" }
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
      boss: { key: "potato_king", hp: 3, phases: ["p1", "p2", "p3"] }
    }
  ],
  cameraCues: [
    { id: "cue_first_hazard", xStart: 2368, xEnd: 2944, lookAhead: 170, targetX: 3008 },
    { id: "cue_orchard_rhythm", xStart: 4864, xEnd: 6208, lookAhead: 175, targetX: 6272 },
    { id: "cue_short_pit", xStart: 7040, xEnd: 7808, lookAhead: 180, targetX: 7872 },
    { id: "cue_long_pit", xStart: 9536, xEnd: 10432, lookAhead: 180, targetX: 10496 },
    { id: "cue_storm_combo", xStart: 10624, xEnd: 11456, lookAhead: 185, targetX: 11520 }
  ],
  checkpoints: [
    { id: "cp1", x: 4480, y: 576 },
    { id: "cp2", x: 7296, y: 576 },
    { id: "cp3", x: 9792, y: 576 },
    { id: "cp4", x: 11648, y: 576 },
    { id: "cp5", x: 14080, y: 576 }
  ],
  enemies: [
    { id: "e_intro_potato", type: "raw_potato", x: 1344, y: 576, patrol: 192 },
    { id: "e_unicorn_potato_01", type: "raw_potato", x: 2496, y: 576, patrol: 160 },
    { id: "e_unicorn_potato_02", type: "raw_potato", x: 3904, y: 576, patrol: 192 },
    { id: "e_orchard_potato_01", type: "raw_potato", x: 5056, y: 576, patrol: 144 },
    { id: "e_orchard_potato_02", type: "raw_potato", x: 6208, y: 576, patrol: 176 },
    { id: "e_cloud_ravine", type: "dark_cloud", x: 8448, y: 256, triggerX: 8128 },
    { id: "e_magpie_ravine", type: "magpie", x: 9152, y: 224, triggerX: 8832 },
    { id: "e_cloud_storm_01", type: "dark_cloud", x: 10880, y: 256, triggerX: 10560 },
    { id: "e_magpie_storm_01", type: "magpie", x: 11456, y: 224, triggerX: 11136 },
    { id: "e_alicorn_potato", type: "raw_potato", x: 12416, y: 576, patrol: 208 }
  ],
  items: [
    { id: "star_intro", type: "star", x: 384, y: 496 },
    { id: "horn_intro", type: "horn", x: 1792, y: 496 },
    { id: "magnet_arc", type: "star_arc", x: 2240, y: 456, count: 12, radius: 154 },
    { id: "pumpkin_reward", type: "percent_large", x: 3072, y: 576 },
    { id: "unicorn_high_arc", type: "star_arc", x: 4384, y: 360, count: 8, radius: 124 },
    { id: "orchard_arc_low", type: "star_arc", x: 5152, y: 450, count: 8, radius: 130 },
    { id: "orchard_arc_high", type: "star_arc", x: 5888, y: 390, count: 10, radius: 150 },
    { id: "orchard_reward", type: "percent_small", x: 6464, y: 520 },
    { id: "wings_intro", type: "wings", x: 6912, y: 496 },
    { id: "flight_arc_short", type: "star_arc", x: 7552, y: 420, count: 10, radius: 170 },
    { id: "flight_arc_cloud", type: "star_arc", x: 8448, y: 350, count: 10, radius: 190 },
    { id: "flight_arc_long", type: "star_arc", x: 9408, y: 390, count: 10, radius: 210 },
    { id: "flight_reward", type: "percent_small", x: 9760, y: 520 },
    { id: "storm_arc", type: "star_arc", x: 10816, y: 410, count: 10, radius: 170 },
    { id: "storm_reward", type: "percent_small", x: 11328, y: 520 },
    { id: "alicorn_intro", type: "alicorn", x: 11648, y: 496 },
    { id: "alicorn_arc", type: "star_arc", x: 12224, y: 420, count: 12, radius: 180 },
    { id: "alicorn_reward", type: "percent_large", x: 13056, y: 512 },
    { id: "recovery_arc", type: "star_arc", x: 13824, y: 470, count: 12, radius: 180 }
  ],
  hazards: [
    { id: "pumpkin_intro", type: "spike_pumpkin", x: 2880, y: 576 },
    { id: "pumpkin_unicorn_gate", type: "spike_pumpkin", x: 4256, y: 576 },
    { id: "pumpkin_orchard_01", type: "spike_pumpkin", x: 5408, y: 576 },
    { id: "pumpkin_orchard_02", type: "spike_pumpkin", x: 6080, y: 576 },
    { id: "pit_short", type: "pit", xStart: 7424, xEnd: 7744, respawnX: 7296 },
    { id: "pit_long", type: "pit", xStart: 9984, xEnd: 10496, respawnX: 9856 },
    { id: "pumpkin_alicorn_gate", type: "spike_pumpkin", x: 12736, y: 576 }
  ],
  objectives: {
    required: [
      { type: "defeat_boss", target: "potato_king" },
      { type: "reach_gate" }
    ],
    optional: [
      { type: "collect_stars", count: 70, reward: 700 },
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
      pitScoreLoss: 0
    }
  }
};
