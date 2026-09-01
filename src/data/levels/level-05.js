const tilemapUrl = new URL("../../../assets/levels/level-05/tilemap.json", import.meta.url).href;
export const P12_WATER_BOSS_ROOM_WIDTH = 2048;

export default {
  schemaVersion: 2,
  id: "level-05",
  name: "물에 잠긴 마을",
  description: "잠긴 지붕 아래를 헤엄치며 수면 위에서 숨을 고르는 길",
  visualTheme: "submerged-village",
  order: 5,
  progression: { direction: "right" },
  exit: { x: 10064, y: 576, enterFrom: "right" },
  assets: {
    tilemap: tilemapUrl,
    tilemapKey: "level-05-map",
    tileset: "submerged_village_tileset",
    preview: "stage_preview_submerged",
    backgrounds: {
      normal: { far: "bg_submerged_far", mid: "bg_submerged_mid", near: "bg_submerged_near" },
      boss: { far: "bg_submerged_far", mid: "bg_submerged_mid", near: "bg_submerged_near" }
    },
    effects: {
      waterSurface: "fx_water_surface",
      waterCaustics: "fx_water_caustics",
      bubble: "fx_bubble"
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
    bgm: { field: "bgm_submerged", boss: "bgm_boss", clear: "bgm_clear" }
  },
  world: { width: 10240, height: 768, tileSize: 64 },
  parallax: { sky: 0.02, far: 0.08, mid: 0.2, near: 0.45 },
  player: { spawn: { x: 192, y: 288 } },
  sections: [
    { id: "submerged_entry", type: "normal", xStart: 0, xEnd: 1024, mood: "normal" },
    { id: "submerged_short", type: "normal", xStart: 1024, xEnd: 2944, mood: "normal" },
    { id: "submerged_long", type: "normal", xStart: 2944, xEnd: 5248, mood: "normal" },
    { id: "submerged_combination", type: "normal", xStart: 5248, xEnd: 7296, mood: "normal" },
    { id: "submerged_recovery", type: "normal", xStart: 7296, xEnd: 8192, mood: "normal" },
    {
      id: "boss_water",
      type: "boss",
      xStart: 8192,
      xEnd: 10240,
      mood: "boss",
      lockCamera: true,
      boss: {
        key: "water_king",
        hp: 3,
        phases: ["single_splash_5", "split_splash_4", "triple_splash_3"],
        floorY: 576,
        spawn: { x: 8900, y: 576 },
        bossPools: [
          { id: "pool_left", x: 8464, y: 576, width: 304, height: 72 },
          { id: "pool_mid_left", x: 8900, y: 576, width: 304, height: 72 },
          { id: "pool_mid_right", x: 9340, y: 576, width: 304, height: 72 },
          { id: "pool_right", x: 9776, y: 576, width: 304, height: 72 }
        ],
        environment: { suspend: ["breath"] }
      }
    }
  ],
  cameraCues: [
    { id: "cue_short_breath", xStart: 896, xEnd: 2816, lookAhead: 280, targetX: 1800 },
    { id: "cue_long_breath", xStart: 3072, xEnd: 5120, lookAhead: 520, targetX: 4224 },
    { id: "cue_combined_breath", xStart: 5376, xEnd: 7168, lookAhead: 320, targetX: 6064 },
    { id: "cue_water_arena", xStart: 7936, xEnd: 8320, lookAhead: 240, targetX: 8480 }
  ],
  checkpoints: [
    { id: "cp_submerged_entry", x: 768, y: 288, restoresHealth: true },
    { id: "cp_short_recovery", x: 2944, y: 288, restoresHealth: true },
    { id: "cp_long_recovery", x: 5248, y: 288, restoresHealth: true },
    { id: "cp_final_recovery", x: 7424, y: 288, restoresHealth: true },
    { id: "cp_water_ready", x: 8064, y: 288, restoresHealth: true, restoresBreath: true }
  ],
  enemies: [],
  items: [
    { id: "short_dive_arc", type: "star_arc", x: 1600, y: 644, count: 7, radius: 92 },
    { id: "short_surface_arc", type: "star_arc", x: 2384, y: 470, count: 6, radius: 104 },
    { id: "short_form_reward", type: "horn", x: 2944, y: 288 },
    { id: "long_dive_arc_a", type: "star_arc", x: 3648, y: 648, count: 7, radius: 92 },
    { id: "long_dive_arc_b", type: "star_arc", x: 4352, y: 648, count: 7, radius: 92 },
    { id: "long_surface_arc", type: "star_arc", x: 4864, y: 470, count: 6, radius: 104 },
    { id: "long_form_reward", type: "wings", x: 5248, y: 288 },
    { id: "combined_dive_arc_a", type: "star_arc", x: 5760, y: 646, count: 6, radius: 90 },
    { id: "combined_breath_arc", type: "star_arc", x: 6160, y: 442, count: 5, radius: 88 },
    { id: "combined_dive_arc_b", type: "star_arc", x: 6624, y: 646, count: 6, radius: 90 },
    { id: "final_reward", type: "percent_large", x: 7552, y: 288 }
  ],
  terrainMechanics: {
    visualTheme: "submerged-village",
    movingPlatforms: [],
    crumblePlatforms: []
  },
  hazards: [],
  environment: {
    waterZones: [
      { id: "short_dive_water", xStart: 896, xEnd: 2816, surfaceY: 320, bottomY: 704 },
      { id: "long_dive_water", xStart: 3072, xEnd: 5120, surfaceY: 320, bottomY: 704 },
      { id: "combined_dive_water", xStart: 5376, xEnd: 7168, surfaceY: 320, bottomY: 704 }
    ],
    breathPoints: [
      { id: "breath_short_exit", zoneId: "short_dive_water", x: 1800, label: "다음 숨" },
      { id: "breath_long_exit", zoneId: "long_dive_water", x: 4224, label: "다음 숨" },
      { id: "breath_combined_mid", zoneId: "combined_dive_water", x: 6064, label: "중간 숨" },
      { id: "breath_combined_exit", zoneId: "combined_dive_water", x: 6944, label: "다음 숨" }
    ],
    breath: {
      depleteSeconds: 12,
      refillSeconds: 2,
      damageInterval: 2.5,
      warningRatio: 0.3,
      surfaceMargin: 8,
      underwaterPhysics: {
        gravityMultiplier: 0.35,
        maxFallSpeed: 260,
        horizontalSpeedMultiplier: 0.75,
        strokeVelocity: -230,
        strokeCooldown: 0.35,
        exitAssistHeight: 48
      }
    }
  },
  objectives: {
    required: [
      { type: "defeat_boss", target: "water_king" },
      { type: "reach_gate" }
    ],
    optional: [
      { type: "collect_stars", count: 42, reward: 500 },
      { type: "clear_time", seconds: 390, reward: 300 },
      { type: "no_damage", reward: 700 }
    ]
  },
  difficulty: {
    easyMode: {
      extraCheckpoints: [],
      removeEnemies: [],
      player: { extraHp: 2, flightDrainMultiplier: 0.65 },
      environment: {
        breath: {
          drainMultiplier: 12 / 17,
          refillMultiplier: 4 / 3,
          damageIntervalMultiplier: 1.4,
          warningRatioMultiplier: 7 / 6,
          horizontalSpeedMultiplier: 16 / 15,
          strokeSpeedMultiplier: 24 / 23,
          strokeRateMultiplier: 7 / 6
        }
      },
      boss: { telegraphMultiplier: 1.25, vulnerabilityMultiplier: 1 },
      pitScoreLoss: 0
    }
  }
};
