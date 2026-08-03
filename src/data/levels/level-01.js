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
    bgm: { field: "bgm_field", boss: "bgm_boss", clear: "bgm_clear" }
  },
  world: { width: 12288, height: 768, tileSize: 64 },
  parallax: { sky: 0.02, far: 0.08, mid: 0.2, near: 0.45 },
  player: { spawn: { x: 128, y: 576 } },
  sections: [
    { id: "tutorial", type: "normal", xStart: 0, xEnd: 2048, mood: "normal" },
    { id: "unicorn", type: "normal", xStart: 2048, xEnd: 4096, mood: "normal" },
    { id: "pegasus", type: "normal", xStart: 4096, xEnd: 7168, mood: "pit" },
    { id: "alicorn", type: "normal", xStart: 7168, xEnd: 9216, mood: "normal" },
    { id: "recovery", type: "normal", xStart: 9216, xEnd: 10240, mood: "normal" },
    {
      id: "boss",
      type: "boss",
      xStart: 10240,
      xEnd: 12288,
      mood: "boss",
      lockCamera: true,
      bgm: "boss",
      boss: { key: "potato_king", hp: 3, phases: ["p1", "p2", "p3"] }
    }
  ],
  cameraCues: [
    { id: "cue_first_hazard", xStart: 2368, xEnd: 2944, lookAhead: 170, targetX: 3008 },
    { id: "cue_short_pit", xStart: 4608, xEnd: 5376, lookAhead: 180, targetX: 5440 },
    { id: "cue_long_pit", xStart: 6144, xEnd: 7104, lookAhead: 180, targetX: 7168 }
  ],
  checkpoints: [
    { id: "cp1", x: 3904, y: 576 },
    { id: "cp2", x: 7424, y: 576 },
    { id: "cp3", x: 9984, y: 576 }
  ],
  enemies: [
    { id: "e_intro_potato", type: "raw_potato", x: 1344, y: 576, patrol: 192 },
    { id: "e_cloud_01", type: "dark_cloud", x: 5632, y: 256, triggerX: 5248 },
    { id: "e_magpie_01", type: "magpie", x: 6400, y: 224, triggerX: 6080 }
  ],
  items: [
    { id: "star_intro", type: "star", x: 384, y: 496 },
    { id: "horn_intro", type: "horn", x: 1792, y: 496 },
    { id: "magnet_arc", type: "star_arc", x: 2240, y: 456, count: 9, radius: 144 },
    { id: "wings_intro", type: "wings", x: 4352, y: 496 },
    { id: "alicorn_intro", type: "alicorn", x: 7680, y: 496 }
  ],
  hazards: [
    { id: "pumpkin_intro", type: "spike_pumpkin", x: 2880, y: 576 },
    { id: "pit_short", type: "pit", xStart: 5120, xEnd: 5376, respawnX: 4992 },
    { id: "pit_long", type: "pit", xStart: 6592, xEnd: 7104, respawnX: 6464 }
  ],
  objectives: {
    required: [
      { type: "defeat_boss", target: "potato_king" },
      { type: "reach_gate" }
    ],
    optional: [
      { type: "collect_stars", count: 50, reward: 500 },
      { type: "clear_time", seconds: 420, reward: 300 },
      { type: "no_damage", reward: 1000 }
    ]
  },
  difficulty: {
    easyMode: {
      extraCheckpoints: [{ id: "cp_easy", x: 6080, y: 576 }],
      removeEnemies: ["e_cloud_01"],
      player: { extraHp: 2, flightDrainMultiplier: 0.65 },
      boss: { telegraphMultiplier: 1.35 },
      pitScoreLoss: 0
    }
  }
};

