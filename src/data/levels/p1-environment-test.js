const tilemapUrl = new URL("../../../assets/levels/p1-environment-test/tilemap.json", import.meta.url).href;

export default {
  schemaVersion: 2,
  id: "p1-environment-test",
  name: "P1 환경 회색 상자",
  description: "역방향 파도와 수중 숨 규칙 시험",
  order: 900,
  assets: {
    tilemap: tilemapUrl,
    tilemapKey: "p1-environment-test-map",
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
  world: { width: 4096, height: 768, tileSize: 64 },
  parallax: { sky: 0.02, far: 0.08, mid: 0.2, near: 0.45 },
  progression: { direction: "left" },
  player: { spawn: { x: 3904, y: 576 } },
  exit: { x: 176, y: 576, enterFrom: "left" },
  sections: [
    { id: "surface_exit", type: "normal", xStart: 0, xEnd: 640, mood: "normal" },
    { id: "submerged_test", type: "normal", xStart: 640, xEnd: 2304, mood: "normal" },
    { id: "tsunami_test", type: "normal", xStart: 2304, xEnd: 4096, mood: "normal" }
  ],
  cameraCues: [
    { id: "cue_reverse_start", xStart: 3456, xEnd: 4096, lookAhead: 180, targetX: 3200 },
    { id: "cue_water", xStart: 1792, xEnd: 2496, lookAhead: 170, targetX: 1500 }
  ],
  checkpoints: [
    { id: "cp_before_water", x: 2368, y: 576, restoresHealth: true },
    { id: "cp_underwater", x: 1472, y: 704, restoresHealth: true },
    { id: "cp_after_water", x: 576, y: 576, restoresHealth: true }
  ],
  enemies: [],
  items: [
    { id: "reverse_star_guide", type: "star_arc", x: 3660, y: 486, count: 7, radius: 120 },
    { id: "water_star_guide", type: "star_arc", x: 1980, y: 430, count: 8, radius: 140 },
    { id: "surface_reward", type: "percent_large", x: 480, y: 496 }
  ],
  hazards: [],
  environment: {
    tsunami: {
      direction: "left",
      firstWarning: 6,
      telegraph: 1.5,
      interval: { min: 9.5, max: 11.4 },
      speedMultiplier: 1.15,
      duration: 2.5,
      shelterGrace: 0.25,
      damage: 1,
      respawnGrace: 3,
      pauseEnemiesDuringWave: true,
      flightClearanceY: 300,
      shelters: [
        { id: "shelter_house", type: "house", label: "집 내부", xStart: 3376, xEnd: 3584, yTop: 408, yBottom: 590 },
        { id: "shelter_hill", type: "hill", label: "언덕 뒤", xStart: 2912, xEnd: 3136, yTop: 424, yBottom: 590 },
        { id: "shelter_high", type: "high", label: "높은 지형", xStart: 2496, xEnd: 2720, yTop: 360, yBottom: 590 }
      ]
    },
    waterZones: [
      { id: "village_water", xStart: 640, xEnd: 2304, surfaceY: 320, bottomY: 704 }
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
        strokeCooldown: 0.35
      }
    }
  },
  objectives: {
    required: [{ type: "reach_gate" }],
    optional: [
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
        tsunami: {
          firstWarningMultiplier: 4 / 3,
          intervalMultiplier: 1.4,
          telegraphMultiplier: 22 / 15,
          speedMultiplier: 21 / 23,
          durationMultiplier: 1.2,
          shelterGraceMultiplier: 1.6,
          respawnGraceMultiplier: 1.5
        },
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
      pitScoreLoss: 0
    }
  }
};
