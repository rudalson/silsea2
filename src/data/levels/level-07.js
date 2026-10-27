import { MERONG_KING_PHASES } from "../tongueMechanics.js";
import { EXPANSION_BGM } from "../expansionAudio.js";

const tilemap = new URL("../../../assets/levels/level-07/tilemap.json", import.meta.url).href;
const trap = (id, x, laneOffset, reach, practice = false) => ({ id, x, y: 576 - laneOffset,
  direction: 1, reach, warningMs: 1200, activeMs: 650, restMs: 2000, triggerDistance: 400, practice });

export default {
  schemaVersion: 2, id: "level-07", name: "메롱 왕국", order: 6,
  description: "메롱하는 길을 지나 웃음 궁전의 대왕을 만나요", visualTheme: "merong-kingdom",
  assets: {
    tilemap, tilemapKey: "level-07-map", tileset: "merong_tileset", preview: "stage_preview_merong",
    backgrounds: {
      normal: { far: "bg_merong_far", mid: "bg_merong_mid", near: "bg_merong_near" },
      boss: { far: "bg_merong_far", mid: "bg_merong_mid", near: "bg_merong_near" }
    },
    decorations: { planter: "decor_merong_planter", lantern: "decor_merong_lantern", palace: "decor_merong_palace", bridge: "decor_merong_bridge" },
    objects: { items: { star: "item_merong_crown", percent_small: "item_percent_small", percent_large: "item_percent_large",
      horn: "item_horn", wings: "item_wings", alicorn: "item_alicorn" }, checkpoint: "decor_merong_lantern", gate: "rainbow_gate" },
    bgm: { ...EXPANSION_BGM["level-07"], clear: "bgm_clear" }
  },
  world: { width: 12288, height: 768, tileSize: 64 },
  parallax: { sky: 0.02, far: 0.08, mid: 0.18, near: 0.38 },
  checkpointPresentation: { width: 80, height: 144, offsetY: 72 },
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
  decorations: [
    ...[384, 1090, 2180, 3190, 4050, 5632, 6400, 7184, 8600, 10176, 11200, 12096].map((x, index) => ({
      id: `merong_planter_${index}`, asset: "planter", x, y: 578, width: 136 + index % 3 * 16,
      height: 112 + index % 3 * 12, depth: -3, flipX: index % 2 === 1
    })),
    ...[576, 1856, 4928, 9024, 11264].map((x, index) => ({
      id: `merong_lantern_${index}`, asset: "lantern", x, y: 578, width: 80, height: 144, depth: -4
    }))
  ],
  checkpoints: [
    { id: "cp_merong_practice", x: 1344, y: 576, activationTop: 0 },
    { id: "cp_merong_bridge", x: 3456, y: 576, activationTop: 0 },
    { id: "cp_merong_flight", x: 6208, y: 576, activationTop: 0, restoresHealth: true },
    { id: "cp_merong_palace", x: 9504, y: 576, activationTop: 0 },
    { id: "cp_merong_boss", x: 10560, y: 576, activationTop: 0, restoresHealth: true }
  ],
  enemies: [
    { id: "merong_imp_a", type: "merong_imp", x: 4480, y: 576, patrol: 96 },
    { id: "merong_imp_b", type: "merong_imp", x: 8064, y: 576, patrol: 96 }
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
    removeEnemies: ["merong_imp_b"], player: { extraHp: 2, flightDrainMultiplier: 0.65 },
    boss: { telegraphMultiplier: 1.35, vulnerabilityMultiplier: 1.3 },
    environment: { tongueWarningMultiplier: 1.4 }, pitScoreLoss: 0 } }
};
