const tilemapUrl = new URL("../../../assets/levels/level-03/tilemap.json", import.meta.url).href;

export const P11_INVISIBLE_BOSS_ROOM_WIDTH = 2048;

export default {
  schemaVersion: 2,
  id: "level-03",
  name: "안개 골짜기",
  description: "빛 기둥과 바람을 따라가는 길",
  visualTheme: "mist-valley",
  order: 3,
  progression: { direction: "right" },
  exit: { x: 9040, y: 576, enterFrom: "right" },
  assets: {
    tilemap: tilemapUrl,
    tilemapKey: "level-03-map",
    tileset: "mist_tileset",
    preview: "stage_preview_mist",
    backgrounds: {
      normal: { far: "bg_mist_far", mid: "bg_mist_mid", near: "bg_mist_near" },
      boss: { far: "bg_mist_far", mid: "bg_mist_mid", near: "bg_mist_near" }
    },
    effects: {
      mistBank: "fx_mist_bank",
      mistClear: "fx_mist_clear",
      mistBeacon: "fx_mist_beacon",
      mistBreeze: "fx_mist_breeze"
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
    bgm: { field: "bgm_mist", boss: "bgm_boss", clear: "bgm_clear" }
  },
  world: { width: 9216, height: 768, tileSize: 64 },
  parallax: { sky: 0.02, far: 0.08, mid: 0.2, near: 0.45 },
  player: { spawn: { x: 128, y: 576 } },
  sections: [
    { id: "mist_intro", type: "normal", xStart: 0, xEnd: 1664, mood: "normal" },
    { id: "mist_practice", type: "normal", xStart: 1664, xEnd: 3456, mood: "normal" },
    { id: "mist_application", type: "normal", xStart: 3456, xEnd: 5248, mood: "normal" },
    { id: "mist_combination", type: "normal", xStart: 5248, xEnd: 6400, mood: "normal" },
    { id: "mist_recovery", type: "normal", xStart: 6400, xEnd: 7168, mood: "normal" },
    {
      id: "boss_invisible",
      type: "boss",
      xStart: 7168,
      xEnd: 9216,
      mood: "boss",
      lockCamera: true,
      boss: {
        key: "invisible_king",
        hp: 3,
        phases: ["memory_open_1", "memory_open_2", "memory_open_3"],
        floorY: 576,
        maxAnchorRise: 160,
        anchors: [
          { id: "left_ground", x: 7520, y: 576, lane: "ground" },
          { id: "left_air", x: 7856, y: 448, lane: "air" },
          { id: "center_ground", x: 8192, y: 576, lane: "ground" },
          { id: "right_air", x: 8528, y: 448, lane: "air" },
          { id: "right_ground", x: 8864, y: 576, lane: "ground" }
        ]
      }
    }
  ],
  cameraCues: [
    { id: "cue_practice_landing", xStart: 1450, xEnd: 2200, lookAhead: 185, targetX: 2304 },
    { id: "cue_application_path", xStart: 3260, xEnd: 4580, lookAhead: 205, targetX: 4672 },
    { id: "cue_combination_path", xStart: 5050, xEnd: 6300, lookAhead: 210, targetX: 6400 },
    { id: "cue_invisible_arena", xStart: 6944, xEnd: 7424, lookAhead: 220, targetX: 7680 }
  ],
  checkpoints: [
    { id: "cp_mist_intro", x: 1536, y: 576 },
    { id: "cp_mist_practice", x: 3328, y: 576 },
    { id: "cp_mist_application", x: 5056, y: 576 },
    { id: "cp_mist_recovery", x: 6400, y: 576, restoresHealth: true },
    { id: "cp_invisible_ready", x: 7040, y: 576, restoresHealth: true }
  ],
  enemies: [
    { id: "e_mist_practice", type: "raw_potato", x: 2784, y: 576, patrol: 144 },
    { id: "e_mist_application", type: "raw_potato", x: 4800, y: 576, patrol: 128 },
    { id: "e_mist_recovery", type: "raw_potato", x: 6656, y: 576, patrol: 112 }
  ],
  items: [
    { id: "mist_first_star", type: "star", x: 384, y: 496 },
    { id: "mist_intro_arc", type: "star_arc", x: 960, y: 430, count: 7, radius: 122 },
    { id: "mist_practice_arc", type: "star_arc", x: 1920, y: 374, count: 8, radius: 128 },
    { id: "mist_practice_reward", type: "percent_small", x: 2464, y: 480 },
    { id: "mist_application_arc_a", type: "star_arc", x: 3744, y: 408, count: 8, radius: 124 },
    { id: "mist_application_arc_b", type: "star_arc", x: 4224, y: 382, count: 8, radius: 132 },
    { id: "mist_application_reward", type: "percent_large", x: 4800, y: 468 },
    { id: "mist_combination_arc_a", type: "star_arc", x: 5504, y: 392, count: 8, radius: 120 },
    { id: "mist_combination_arc_b", type: "star_arc", x: 5984, y: 378, count: 8, radius: 128 },
    { id: "mist_recovery_reward", type: "percent_large", x: 6560, y: 456 },
    { id: "mist_gate_star", type: "star", x: 6848, y: 496 }
  ],
  secrets: [
    {
      id: "secret_mist_lantern",
      name: "안개 속 등불길",
      xStart: 4608,
      xEnd: 4928,
      yTop: 304,
      yBottom: 520,
      reward: 200,
      guideItemIds: ["mist_application_arc_b"],
      rewardItemId: "mist_application_reward"
    }
  ],
  terrainMechanics: {
    visualTheme: "mist-valley",
    movingPlatforms: [
      { id: "mist_breeze_platform", x: 4000, y: 448, width: 176, height: 32, axis: "y", distance: 80, speed: 50 },
      { id: "mist_combo_platform", x: 6080, y: 456, width: 176, height: 32, axis: "x", distance: 120, speed: 54 }
    ],
    crumblePlatforms: []
  },
  hazards: [
    { id: "mist_practice_gap", type: "pit", xStart: 1664, xEnd: 2176, respawnX: 1536 },
    { id: "mist_application_gap", type: "pit", xStart: 3456, xEnd: 4544, respawnX: 3328 },
    { id: "mist_combination_gap", type: "pit", xStart: 5248, xEnd: 6272, respawnX: 5056 },
    { id: "mist_thorn_practice", type: "spike_pumpkin", x: 2912, y: 576 },
    { id: "mist_thorn_recovery", type: "spike_pumpkin", x: 6752, y: 576 }
  ],
  environment: {
    mist: {
      fadeMs: 260,
      defaultVisibilityRadius: 520,
      reducedDensityMultiplier: 0.55,
      reducedRadiusBonus: 70,
      zones: [
        { id: "mist_intro", label: "소개 · 옅은 안개", xStart: 640, xEnd: 1664, density: 0.26, visibilityRadius: 430 },
        { id: "mist_practice", label: "연습 · 두 단서", xStart: 1664, xEnd: 3456, density: 0.42, visibilityRadius: 360 },
        { id: "mist_application", label: "응용 · 갈림 지형", xStart: 3456, xEnd: 5248, density: 0.54, visibilityRadius: 320 },
        { id: "mist_combination", label: "조합 · 짙은 안개", xStart: 5248, xEnd: 6400, density: 0.62, visibilityRadius: 280 },
        { id: "mist_recovery", label: "회복 · 안개가 걷히는 길", xStart: 6400, xEnd: 7168, density: 0.18, visibilityRadius: 500 },
        { id: "boss_invisible", label: "보스 · 고정된 옅은 안개", xStart: 7168, xEnd: 9216, density: 0.24, visibilityRadius: 460 }
      ],
      guides: [
        { id: "guide_intro_beacon", kind: "beacon", x: 896, y: 576 },
        { id: "guide_intro_breeze", kind: "breeze", x: 1280, y: 544, delay: 120 },
        { id: "guide_practice_beacon_a", kind: "beacon", x: 1760, y: 512 },
        { id: "guide_practice_breeze_a", kind: "breeze", x: 1984, y: 448, delay: 180 },
        { id: "guide_practice_beacon_b", kind: "beacon", x: 2464, y: 576, delay: 80 },
        { id: "guide_practice_breeze_b", kind: "breeze", x: 3072, y: 544, delay: 220 },
        { id: "guide_application_beacon_a", kind: "beacon", x: 3584, y: 512 },
        { id: "guide_application_breeze_a", kind: "breeze", x: 3904, y: 448, delay: 140 },
        { id: "guide_application_beacon_b", kind: "beacon", x: 4224, y: 512, delay: 240 },
        { id: "guide_application_breeze_b", kind: "breeze", x: 4800, y: 544 },
        { id: "guide_combination_beacon_a", kind: "beacon", x: 5376, y: 512 },
        { id: "guide_combination_breeze_a", kind: "breeze", x: 5664, y: 432, delay: 180 },
        { id: "guide_combination_beacon_b", kind: "beacon", x: 5984, y: 496, delay: 100 },
        { id: "guide_combination_breeze_b", kind: "breeze", x: 6304, y: 544, delay: 260 },
        { id: "guide_recovery_beacon", kind: "beacon", x: 6592, y: 576 },
        { id: "guide_recovery_breeze", kind: "breeze", x: 6880, y: 544, delay: 120 },
        { id: "guide_boss_beacon_left", kind: "beacon", x: 7520, y: 576 },
        { id: "guide_boss_beacon_center", kind: "beacon", x: 8192, y: 576, delay: 120 },
        { id: "guide_boss_beacon_right", kind: "beacon", x: 8864, y: 576, delay: 240 },
        { id: "guide_boss_breeze", kind: "breeze", x: 9024, y: 544, delay: 180 }
      ]
    }
  },
  objectives: {
    required: [
      { type: "defeat_boss", target: "invisible_king" },
      { type: "reach_gate" }
    ],
    optional: [
      { type: "collect_stars", count: 30, reward: 450 },
      { type: "find_secrets", count: 1, reward: 300 },
      { type: "clear_time", seconds: 240, reward: 300 },
      { type: "no_damage", reward: 700 }
    ]
  },
  difficulty: {
    easyMode: {
      extraCheckpoints: [
        { id: "cp_easy_application", x: 4544, y: 576 },
        { id: "cp_easy_combination", x: 6272, y: 576 }
      ],
      removeEnemies: ["e_mist_application"],
      player: { extraHp: 1, flightDrainMultiplier: 0.75 },
      terrainMechanics: { movingSpeedMultiplier: 0.75, crumbleDelayMultiplier: 1.4 },
      environment: { mist: { densityMultiplier: 0.82, radiusMultiplier: 1.15 } },
      boss: { telegraphMultiplier: 1.25, vulnerabilityMultiplier: 1.35 },
      pitScoreLoss: 0
    }
  }
};
