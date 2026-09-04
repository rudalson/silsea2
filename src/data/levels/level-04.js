const tilemapUrl = new URL("../../../assets/levels/level-04/tilemap.json", import.meta.url).href;
export const P10_HULA_BOSS_ROOM_WIDTH = 2048;
const shifted = (x) => x + P10_HULA_BOSS_ROOM_WIDTH;

export default {
  schemaVersion: 2,
  id: "level-04",
  name: "쓰나미 마을",
  description: "밀려오는 파도를 피해 왼쪽으로 달리는 길",
  visualTheme: "tsunami-village",
  order: 4,
  progression: { direction: "left" },
  exit: { x: 176, y: 576, enterFrom: "left" },
  assets: {
    tilemap: tilemapUrl,
    tilemapKey: "level-04-map",
    tileset: "village_tileset",
    preview: "stage_preview_tsunami",
    backgrounds: {
      normal: { far: "bg_tsunami_far", mid: "bg_tsunami_mid", near: "bg_tsunami_near" },
      boss: { far: "bg_tsunami_far", mid: "bg_tsunami_mid", near: "bg_tsunami_near" }
    },
    decorations: {
      sign: "decor_sign"
    },
    effects: {
      tsunamiWave: "fx_tsunami_wave",
      tsunamiWarning: "fx_tsunami_warning",
      shelterHouseOpen: "shelter_house_open",
      shelterHouseWeathered: "shelter_house_weathered",
      shelterHill: "shelter_hill"
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
    bgm: { field: "bgm_tsunami", boss: "bgm_boss", clear: "bgm_clear" }
  },
  world: { width: shifted(8192), height: 768, tileSize: 64 },
  parallax: { sky: 0.02, far: 0.08, mid: 0.2, near: 0.45 },
  player: { spawn: { x: shifted(8000), y: 576 } },
  sections: [
    {
      id: "boss_hula",
      type: "boss",
      xStart: 0,
      xEnd: P10_HULA_BOSS_ROOM_WIDTH,
      mood: "boss",
      lockCamera: true,
      boss: {
        key: "hula_king",
        hp: 3,
        phases: ["guarded_single_hoop", "alternating_hoops", "bidirectional_hoops"],
        environment: { suspend: ["tsunami"] }
      }
    },
    { id: "tsunami_exit", type: "normal", xStart: shifted(0), xEnd: shifted(1024), mood: "normal" },
    { id: "tsunami_high", type: "normal", xStart: shifted(1024), xEnd: shifted(2816), mood: "normal" },
    { id: "tsunami_house", type: "normal", xStart: shifted(2816), xEnd: shifted(5120), mood: "normal" },
    { id: "tsunami_hill", type: "normal", xStart: shifted(5120), xEnd: shifted(6912), mood: "normal" },
    { id: "tsunami_intro", type: "normal", xStart: shifted(6912), xEnd: shifted(8192), mood: "normal" }
  ],
  cameraCues: [
    { id: "cue_reverse_intro", xStart: shifted(6912), xEnd: shifted(8192), lookAhead: 205, targetX: shifted(6656) },
    { id: "cue_hill_shelters", xStart: shifted(5120), xEnd: shifted(6912), lookAhead: 190, targetX: shifted(4864) },
    { id: "cue_house_shelters", xStart: shifted(2816), xEnd: shifted(5120), lookAhead: 180, targetX: shifted(2560) },
    { id: "cue_high_shelter", xStart: shifted(1024), xEnd: shifted(2816), lookAhead: 165, targetX: shifted(896) }
  ],
  decorations: [
    { id: "tsunami_intro_sign", asset: "sign", x: shifted(7872), y: 578, width: 112, height: 144, depth: -4, alpha: 0.9, flipX: true }
  ],
  checkpoints: [
    { id: "cp_tsunami_intro", x: shifted(6912), y: 576, restoresHealth: true },
    { id: "cp_tsunami_hill", x: shifted(5120), y: 576, restoresHealth: true },
    { id: "cp_tsunami_house", x: shifted(2816), y: 576, restoresHealth: true },
    { id: "cp_tsunami_exit", x: shifted(1024), y: 576, restoresHealth: true }
  ],
  enemies: [
    { id: "e_tsunami_hill", type: "raw_potato", x: shifted(6480), y: 576, patrol: 112 },
    { id: "e_tsunami_house", type: "raw_potato", x: shifted(3904), y: 576, patrol: 120 },
    { id: "e_tsunami_exit", type: "raw_potato", x: shifted(768), y: 576, patrol: 96 }
  ],
  items: [
    { id: "tsunami_intro_arc", type: "star_arc", x: shifted(7680), y: 458, count: 7, radius: 116 },
    { id: "tsunami_hill_arc_a", type: "star_arc", x: shifted(6400), y: 438, count: 7, radius: 120 },
    { id: "tsunami_hill_reward", type: "percent_small", x: shifted(5504), y: 480 },
    { id: "tsunami_house_arc_a", type: "star_arc", x: shifted(4608), y: 420, count: 7, radius: 116 },
    { id: "tsunami_house_arc_b", type: "star_arc", x: shifted(3376), y: 408, count: 7, radius: 120 },
    { id: "tsunami_high_arc", type: "star_arc", x: shifted(1728), y: 244, count: 7, radius: 116 },
    { id: "tsunami_high_secret_reward", type: "percent_large", x: shifted(1728), y: 288 },
    { id: "tsunami_exit_reward", type: "percent_large", x: shifted(640), y: 480 }
  ],
  secrets: [
    {
      id: "secret_tsunami_rooftop",
      name: "파도 위 지붕 전망대",
      xStart: shifted(1536),
      xEnd: shifted(1920),
      yTop: 144,
      yBottom: 344,
      reward: 200,
      guideItemIds: ["tsunami_high_arc"],
      rewardItemId: "tsunami_high_secret_reward"
    }
  ],
  terrainMechanics: {
    visualTheme: "tsunami-village",
    movingPlatforms: [],
    crumblePlatforms: []
  },
  hazards: [
    { id: "tsunami_thorn_hill", type: "spike_pumpkin", x: shifted(5632), y: 576 },
    { id: "tsunami_thorn_high", type: "spike_pumpkin", x: shifted(2688), y: 576 }
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
        { id: "shelter_intro_hill", type: "hill", asset: "shelterHill", label: "낮은 언덕 뒤", xStart: shifted(7200), xEnd: shifted(7488), yTop: 416, yBottom: 576 },
        { id: "shelter_hill", type: "hill", asset: "shelterHill", label: "큰 언덕 뒤", xStart: shifted(5952), xEnd: shifted(6240), yTop: 384, yBottom: 576 },
        { id: "shelter_house_a", type: "house", asset: "shelterHouseOpen", label: "열린 집 내부", xStart: shifted(4448), xEnd: shifted(4800), yTop: 336, yBottom: 576 },
        { id: "shelter_house_b", type: "house", asset: "shelterHouseWeathered", label: "무너진 집 내부", xStart: shifted(3264), xEnd: shifted(3616), yTop: 320, yBottom: 576 },
        { id: "shelter_high", type: "high", label: "높은 지형 위", xStart: shifted(1536), xEnd: shifted(1856), yTop: 230, yBottom: 320 }
      ]
    }
  },
  objectives: {
    required: [
      { type: "defeat_boss", target: "hula_king" },
      { type: "reach_gate" }
    ],
    optional: [
      { type: "collect_stars", count: 28, reward: 450 },
      { type: "find_secrets", count: 1, reward: 300 },
      { type: "clear_time", seconds: 210, reward: 300 },
      { type: "no_damage", reward: 700 }
    ]
  },
  difficulty: {
    easyMode: {
      extraCheckpoints: [
        { id: "cp_easy_house", x: shifted(4032), y: 576, restoresHealth: true },
        { id: "cp_easy_high", x: shifted(2176), y: 576, restoresHealth: true }
      ],
      removeEnemies: ["e_tsunami_house"],
      player: { extraHp: 1, flightDrainMultiplier: 0.75 },
      boss: { telegraphMultiplier: 1.25, vulnerabilityMultiplier: 1.35, volleyIntervalMultiplier: 1.2 },
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
