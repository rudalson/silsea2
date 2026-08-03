const tilemapUrl = new URL("../../../assets/levels/level-02/tilemap.json", import.meta.url).href;

export default {
  schemaVersion: 1,
  id: "level-02",
  name: "구조 검증 놀이터",
  order: 2,
  assets: {
    tilemap: tilemapUrl,
    tilemapKey: "level-02-map",
    tileset: "grass_tileset",
    backgrounds: {
      normal: { far: "bg_normal_far", mid: "bg_normal_mid", near: "bg_normal_near" }
    },
    bgm: { field: "bgm_field", clear: "bgm_clear" }
  },
  world: { width: 2560, height: 768, tileSize: 64 },
  parallax: { sky: 0.02, far: 0.08, mid: 0.2, near: 0.45 },
  player: { spawn: { x: 128, y: 576 } },
  sections: [
    { id: "start", type: "normal", xStart: 0, xEnd: 1536, mood: "normal" },
    { id: "finish", type: "normal", xStart: 1536, xEnd: 2560, mood: "normal" }
  ],
  cameraCues: [],
  checkpoints: [{ id: "cp_test", x: 1280, y: 576 }],
  enemies: [],
  items: [{ id: "star_test", type: "star", x: 832, y: 432 }],
  hazards: [],
  objectives: {
    required: [{ type: "reach_gate" }],
    optional: [{ type: "clear_time", seconds: 45, reward: 100 }]
  },
  difficulty: { easyMode: { extraCheckpoints: [], removeEnemies: [], pitScoreLoss: 0 } }
};

