import { MERONG_KING_PHASES } from "../tongueMechanics.js";

const tilemap = new URL("../../../assets/levels/level-07/tilemap.json", import.meta.url).href;
const trap = (id, x, laneOffset, reach, practice = false) => ({ id, x, y: 576 - laneOffset,
  direction: 1, reach, warningMs: 1200, activeMs: 650, restMs: 2000, triggerDistance: 400, practice });

export default {
  schemaVersion: 2, id: "level-07", name: "메롱 왕국", order: 7,
  description: "메롱하는 길을 지나 웃음 궁전의 대왕을 만나요", visualTheme: "merong-kingdom",
  assets: {
    tilemap, tilemapKey: "level-07-map", tileset: "rainbow_tileset", preview: "stage_preview_merong",
    backgrounds: {
      normal: { far: "bg_merong_far", mid: "bg_normal_mid", near: "bg_normal_near" },
      boss: { far: "bg_merong_far", mid: "bg_normal_mid", near: "bg_normal_near" }
    },
    objects: { items: { star: "item_star", percent_small: "item_percent_small", percent_large: "item_percent_large",
      horn: "item_horn", wings: "item_wings", alicorn: "item_alicorn" }, checkpoint: "checkpoint_flag", gate: "rainbow_gate" },
    bgm: { field: "bgm_field", boss: "bgm_boss", clear: "bgm_clear" }
  },
  world: { width: 12288, height: 768, tileSize: 64 },
  parallax: { sky: 0.02, far: 0.08, mid: 0.2, near: 0.45 },
  progression: { direction: "right", retainAbilities: true },
  player: { spawn: { x: 128, y: 576 } },
  exit: { x: 12096, y: 576, enterFrom: "right", presentation: { kind: "real", placement: "ground", effects: "normal", graybox: false } },
  sections: [
    { id: "welcome", type: "normal", xStart: 0, xEnd: 1536, mood: "normal" },
    { id: "tongue_practice", type: "normal", xStart: 1536, xEnd: 3584, mood: "normal" },
    { id: "tongue_bridges", type: "normal", xStart: 3584, xEnd: 6144, mood: "normal" },
    { id: "royal_terraces", type: "normal", xStart: 6144, xEnd: 9216, mood: "normal" },
    { id: "palace_approach", type: "normal", xStart: 9216, xEnd: 10752, mood: "normal" },
    { id: "boss_merong", type: "boss", xStart: 10752, xEnd: 12288, mood: "boss", lockCamera: true,
      boss: { key: "merong_king", hp: 3, phases: Object.values(MERONG_KING_PHASES).map(({ id }) => id),
        spawn: { x: 11648, y: 576 }, environment: { suspend: [] } } }
  ],
  cameraCues: [
    { id: "cue_low", xStart: 1024, xEnd: 1536, lookAhead: 220, targetX: 1664 },
    { id: "cue_bridge", xStart: 3136, xEnd: 3584, lookAhead: 220, targetX: 3680 },
    { id: "cue_palace", xStart: 9984, xEnd: 10752, lookAhead: 240, targetX: 10752 }
  ],
  checkpoints: [
    { id: "cp_merong_practice", x: 1344, y: 576, activationTop: 0 },
    { id: "cp_merong_bridge", x: 3456, y: 576, activationTop: 0 },
    { id: "cp_merong_flight", x: 6208, y: 576, activationTop: 0, restoresHealth: true },
    { id: "cp_merong_palace", x: 9504, y: 576, activationTop: 0 },
    { id: "cp_merong_boss", x: 10560, y: 576, activationTop: 0, restoresHealth: true }
  ],
  enemies: [
    { id: "merong_potato_a", type: "raw_potato", x: 4480, y: 576, patrol: 96 },
    { id: "merong_potato_b", type: "raw_potato", x: 8064, y: 576, patrol: 96 }
  ],
  items: [
    { id: "merong_horn", type: "horn", x: 768, y: 576, activationTop: 0 },
    { id: "merong_wings", type: "wings", x: 5888, y: 576, activationTop: 0 },
    { id: "merong_fever", type: "alicorn", x: 8960, y: 576, activationTop: 0 },
    ...[448, 1152, 1664, 2112, 2944, 3680, 4096, 4864, 5536, 6464, 6848, 7360, 7872, 8512, 9728, 10304]
      .map((x, index) => ({ id: `merong_arc_${index}`, type: "star_arc", x,
        y: [2112, 4864, 5536].includes(x) ? 280 : 420, count: 6, radius: 100 })),
    { id: "merong_secret_guide", type: "star_arc", x: 5312, y: 300, count: 5, radius: 72 },
    { id: "merong_secret_reward", type: "percent_large", x: 5344, y: 352 },
    { id: "merong_rest_reward", type: "percent_small", x: 10432, y: 576 }
  ],
  secrets: [{ id: "merong_rooftop", name: "궁전 지붕 정원", xStart: 5120, xEnd: 5632, yTop: 180, yBottom: 440,
    reward: 200, guideItemIds: ["merong_secret_guide"], rewardItemId: "merong_secret_reward" }],
  terrainMechanics: { movingPlatforms: [], updrafts: [], crumblePlatforms: [] },
  hazards: [
    { id: "merong_pit_a", type: "pit", xStart: 3584, xEnd: 3776, respawnX: 3456 },
    { id: "merong_pit_b", type: "pit", xStart: 6656, xEnd: 6912, respawnX: 6528 }
  ],
  environment: {
    tongueTraps: [trap("merong_practice", 1536, 22, 256, true), trap("merong_low_a", 2816, 22, 384),
      trap("merong_high_a", 3840, 106, 448), trap("merong_low_b", 7552, 22, 448),
      trap("merong_high_b", 8832, 106, 512), trap("merong_palace_guard", 9984, 22, 384)],
    tongueCourse: { palace: { x: 10752, y: 576 }, bridges: [{ x: 3328, y: 576, width: 256, height: 16 },
      { x: 3776, y: 576, width: 320, height: 16 }, { x: 6912, y: 576, width: 320, height: 16 }] }
  },
  objectives: { required: [{ type: "defeat_boss", target: "merong_king" }, { type: "reach_gate" }],
    optional: [{ type: "collect_stars", count: 50, reward: 500 }, { type: "find_secrets", count: 1, reward: 300 },
      { type: "clear_time", seconds: 390, reward: 400 }, { type: "no_damage", reward: 800 }] },
  difficulty: { easyMode: { extraCheckpoints: [{ id: "cp_merong_easy", x: 7168, y: 576, restoresHealth: true }],
    removeEnemies: ["merong_potato_b"], player: { extraHp: 2, flightDrainMultiplier: 0.65 },
    boss: { telegraphMultiplier: 1.35, vulnerabilityMultiplier: 1.3 },
    environment: { tongueWarningMultiplier: 1.4 }, pitScoreLoss: 0 } }
};
