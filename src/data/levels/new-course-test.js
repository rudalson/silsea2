const tilemap = new URL("../../../assets/levels/new-course-test/tilemap.json", import.meta.url).href;

export default {
  schemaVersion: 2,
  id: "new-course-test",
  developmentOnly: true,
  name: "새 코스 장치 연습",
  description: "끈끈한 길 · 5초 정지 · 열리는 구멍",
  order: 910,
  assets: {
    tilemap, tilemapKey: "new-course-test-map", tileset: "grass_tileset",
    backgrounds: { normal: { far: "bg_normal_far", mid: "bg_normal_mid", near: "bg_normal_near" } },
    objects: {
      items: { star: "item_star", wings: "item_wings" },
      checkpoint: "checkpoint_flag", gate: "rainbow_gate"
    },
    bgm: { field: "bgm_field", clear: "bgm_clear" }
  },
  world: { width: 5120, height: 768, tileSize: 64 },
  parallax: { sky: 0.02, far: 0.08, mid: 0.2, near: 0.45 },
  progression: { direction: "right", retainAbilities: true },
  player: { spawn: { x: 128, y: 576 } },
  exit: { x: 4896, y: 576, enterFrom: "right" },
  sections: [
    { id: "sticky", type: "normal", xStart: 0, xEnd: 1280, mood: "normal" },
    { id: "rhythm", type: "normal", xStart: 1280, xEnd: 2560, mood: "normal" },
    { id: "flight", type: "normal", xStart: 2560, xEnd: 3200, mood: "normal" },
    { id: "holes", type: "normal", xStart: 3200, xEnd: 4480, mood: "normal" },
    { id: "finish", type: "normal", xStart: 4480, xEnd: 5120, mood: "normal" }
  ],
  cameraCues: [{ id: "hole_intro", xStart: 3104, xEnd: 3456, lookAhead: 230, targetX: 3520 }],
  checkpoints: [
    { id: "cp_rhythm", x: 1216, y: 576, restoresHealth: true },
    { id: "cp_holes", x: 3168, y: 576, restoresHealth: true },
    { id: "cp_hole_mid", x: 3792, y: 576, restoresHealth: true }
  ],
  enemies: [],
  items: [
    { id: "sticky_stars", type: "star_arc", x: 704, y: 416, count: 5, radius: 90 },
    { id: "practice_wings", type: "wings", x: 2752, y: 576, activationTop: 0 },
    { id: "hole_stars", type: "star_arc", x: 3520, y: 420, count: 5, radius: 90 }
  ],
  hazards: [
    { id: "pit_a", type: "pit", xStart: 3456, xEnd: 3584, respawnX: 3168 },
    { id: "pit_b", type: "pit", xStart: 4032, xEnd: 4160, respawnX: 3792 }
  ],
  terrainMechanics: {
    stickyZones: [{ id: "tape_practice", x: 512, y: 576, width: 384, height: 12, speedMultiplier: 0.6 }],
    timedHoles: [
      { id: "hole_a", x: 3456, y: 576, width: 128, height: 24, triggerDistance: 400, warningMs: 1400, openMs: 1800, closedMs: 2600 },
      { id: "hole_b", x: 4032, y: 576, width: 128, height: 24, triggerDistance: 400, warningMs: 1400, openMs: 1800, closedMs: 2600 }
    ]
  },
  environment: {
    rhythmZones: [{ id: "piano_practice", xStart: 1536, xEnd: 2240, floorY: 576,
      warningMs: 1500, stopMs: 5000, retryMs: 1200, movementTolerance: 0.2, practice: true }]
  },
  objectives: { required: [{ type: "reach_gate" }], optional: [{ type: "no_damage", reward: 100 }] },
  difficulty: {
    easyMode: {
      extraCheckpoints: [], removeEnemies: [], player: { extraHp: 2, flightDrainMultiplier: 0.65 },
      terrainMechanics: { movingSpeedMultiplier: 0.72, crumbleDelayMultiplier: 1.5, stickySpeedFloor: 0.8, holeWarningMultiplier: 1.5 },
      pitScoreLoss: 0
    }
  }
};
