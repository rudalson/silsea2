const tilemapUrl = new URL("../../../assets/levels/c3-coop-test/tilemap.json", import.meta.url).href;

export default {
  schemaVersion: 2,
  id: "c3-coop-test",
  name: "C3 둘이서 무지개 길",
  description: "키보드와 게임패드 한 화면 협동 회색상자",
  visualTheme: "coop-prototype-graybox",
  order: 903,
  progression: { direction: "right" },
  exit: { x: 2384, y: 576, enterFrom: "right" },
  assets: {
    tilemap: tilemapUrl,
    tilemapKey: "c3-coop-test-map",
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
  world: { width: 2560, height: 768, tileSize: 64 },
  parallax: { sky: 0.02, far: 0.08, mid: 0.2, near: 0.45 },
  player: { spawn: { x: 224, y: 576 } },
  sections: [
    { id: "coop_start", type: "normal", xStart: 0, xEnd: 704, mood: "normal" },
    { id: "coop_separation", type: "normal", xStart: 704, xEnd: 1536, mood: "normal" },
    { id: "coop_rally", type: "normal", xStart: 1536, xEnd: 2112, mood: "normal" },
    { id: "coop_finish", type: "normal", xStart: 2112, xEnd: 2560, mood: "normal" }
  ],
  cameraCues: [],
  checkpoints: [
    { id: "cp_coop_middle", x: 1472, y: 576, restoresHealth: true }
  ],
  enemies: [],
  items: [
    { id: "coop_star_arc", type: "star_arc", x: 560, y: 468, count: 5, radius: 96 },
    { id: "coop_horn", type: "horn", x: 944, y: 576 },
    { id: "coop_wings", type: "wings", x: 1296, y: 576 },
    { id: "coop_finish_star", type: "percent_large", x: 2144, y: 576 }
  ],
  hazards: [
    { id: "coop_damage_pumpkin", type: "spike_pumpkin", x: 1760, y: 576 }
  ],
  environment: {},
  secrets: [],
  terrainMechanics: { movingPlatforms: [], updrafts: [], crumblePlatforms: [] },
  objectives: {
    required: [
      { type: "defeat_boss", target: "coop_target_dummy" },
      { type: "reach_gate" }
    ],
    optional: [{ type: "collect_stars", count: 5, reward: 300 }]
  },
  difficulty: {
    easyMode: {
      extraCheckpoints: [],
      removeEnemies: [],
      player: { extraHp: 2, flightDrainMultiplier: 0.65 },
      pitScoreLoss: 0
    }
  }
};
