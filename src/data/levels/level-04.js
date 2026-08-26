const tilemapUrl = new URL("../../../assets/levels/level-04/tilemap.json", import.meta.url).href;

export default {
  schemaVersion: 2,
  id: "level-04",
  name: "쓰나미 마을",
  description: "밀려오는 파도를 피해 왼쪽으로 달리는 길",
  visualTheme: "tsunami-graybox",
  order: 4,
  progression: { direction: "left" },
  exit: { x: 176, y: 576, enterFrom: "left" },
  assets: {
    tilemap: tilemapUrl,
    tilemapKey: "level-04-map",
    tileset: "grass_tileset",
    backgrounds: {
      normal: { far: "bg_normal_far", mid: "bg_normal_mid", near: "bg_normal_near" }
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
    bgm: { field: "bgm_field", clear: "bgm_clear" }
  },
  world: { width: 8192, height: 768, tileSize: 64 },
  parallax: { sky: 0.02, far: 0.08, mid: 0.2, near: 0.45 },
  player: { spawn: { x: 8000, y: 576 } },
  sections: [
    { id: "tsunami_exit", type: "normal", xStart: 0, xEnd: 1024, mood: "normal" },
    { id: "tsunami_high", type: "normal", xStart: 1024, xEnd: 2816, mood: "normal" },
    { id: "tsunami_house", type: "normal", xStart: 2816, xEnd: 5120, mood: "normal" },
    { id: "tsunami_hill", type: "normal", xStart: 5120, xEnd: 6912, mood: "normal" },
    { id: "tsunami_intro", type: "normal", xStart: 6912, xEnd: 8192, mood: "normal" }
  ],
  cameraCues: [
    { id: "cue_reverse_intro", xStart: 6912, xEnd: 8192, lookAhead: 205, targetX: 6656 },
    { id: "cue_hill_shelters", xStart: 5120, xEnd: 6912, lookAhead: 190, targetX: 4864 },
    { id: "cue_house_shelters", xStart: 2816, xEnd: 5120, lookAhead: 180, targetX: 2560 },
    { id: "cue_high_shelter", xStart: 1024, xEnd: 2816, lookAhead: 165, targetX: 896 }
  ],
  checkpoints: [
    { id: "cp_tsunami_intro", x: 6912, y: 576, restoresHealth: true },
    { id: "cp_tsunami_hill", x: 5120, y: 576, restoresHealth: true },
    { id: "cp_tsunami_house", x: 2816, y: 576, restoresHealth: true },
    { id: "cp_tsunami_exit", x: 1024, y: 576, restoresHealth: true }
  ],
  enemies: [
    { id: "e_tsunami_hill", type: "raw_potato", x: 6480, y: 576, patrol: 112 },
    { id: "e_tsunami_house", type: "raw_potato", x: 3904, y: 576, patrol: 120 },
    { id: "e_tsunami_exit", type: "raw_potato", x: 768, y: 576, patrol: 96 }
  ],
  items: [
    { id: "tsunami_intro_arc", type: "star_arc", x: 7680, y: 458, count: 7, radius: 116 },
    { id: "tsunami_hill_arc_a", type: "star_arc", x: 6400, y: 438, count: 7, radius: 120 },
    { id: "tsunami_hill_reward", type: "percent_small", x: 5504, y: 480 },
    { id: "tsunami_house_arc_a", type: "star_arc", x: 4608, y: 420, count: 7, radius: 116 },
    { id: "tsunami_house_arc_b", type: "star_arc", x: 3376, y: 408, count: 7, radius: 120 },
    { id: "tsunami_high_arc", type: "star_arc", x: 1728, y: 244, count: 7, radius: 116 },
    { id: "tsunami_exit_reward", type: "percent_large", x: 640, y: 480 }
  ],
  terrainMechanics: {
    visualTheme: "default",
    movingPlatforms: [],
    crumblePlatforms: []
  },
  hazards: [
    { id: "tsunami_thorn_hill", type: "spike_pumpkin", x: 5632, y: 576 },
    { id: "tsunami_thorn_high", type: "spike_pumpkin", x: 2688, y: 576 }
  ],
  environment: {
    tsunami: {
      direction: "left",
      firstWarning: 6,
      telegraph: 1.5,
      interval: { min: 9, max: 12 },
      speedMultiplier: 1.15,
      duration: 2.5,
      shelterGrace: 0.25,
      damage: 1,
      respawnGrace: 3,
      pauseEnemiesDuringWave: true,
      flightClearanceY: 270,
      shelters: [
        { id: "shelter_intro_hill", type: "hill", label: "낮은 언덕 뒤", xStart: 7200, xEnd: 7488, yTop: 416, yBottom: 576 },
        { id: "shelter_hill", type: "hill", label: "큰 언덕 뒤", xStart: 5952, xEnd: 6240, yTop: 384, yBottom: 576 },
        { id: "shelter_house_a", type: "house", label: "열린 집 내부", xStart: 4448, xEnd: 4800, yTop: 336, yBottom: 576 },
        { id: "shelter_house_b", type: "house", label: "무너진 집 내부", xStart: 3264, xEnd: 3616, yTop: 320, yBottom: 576 },
        { id: "shelter_high", type: "high", label: "높은 지형 위", xStart: 1536, xEnd: 1856, yTop: 230, yBottom: 320 }
      ]
    }
  },
  objectives: {
    required: [{ type: "reach_gate" }],
    optional: [
      { type: "collect_stars", count: 28, reward: 450 },
      { type: "clear_time", seconds: 210, reward: 300 },
      { type: "no_damage", reward: 700 }
    ]
  },
  difficulty: {
    easyMode: {
      extraCheckpoints: [
        { id: "cp_easy_house", x: 4032, y: 576, restoresHealth: true },
        { id: "cp_easy_high", x: 2176, y: 576, restoresHealth: true }
      ],
      removeEnemies: ["e_tsunami_house"],
      player: { extraHp: 1, flightDrainMultiplier: 0.75 },
      terrainMechanics: { movingSpeedMultiplier: 0.8, crumbleDelayMultiplier: 1.35 },
      environment: {
        tsunami: {
          firstWarningMultiplier: 4 / 3,
          intervalMultiplier: 1.4,
          telegraphMultiplier: 22 / 15,
          speedMultiplier: 21 / 23,
          durationMultiplier: 1.2,
          shelterGraceMultiplier: 1.6,
          respawnGraceMultiplier: 1.5
        }
      },
      pitScoreLoss: 0
    }
  }
};
