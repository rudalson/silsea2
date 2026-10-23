import { TAPE_KING_PHASES } from "../tapeMechanics.js";
import { EXPANSION_BGM } from "../expansionAudio.js";

const tilemap = new URL("../../../assets/levels/level-08/tilemap.json", import.meta.url).href;
const sticky = (id, x, width, showHint = false) => ({ id, x, y: 576, width, height: 12,
  speedMultiplier: 0.6, visualStyle: "tape", showHint });

export default {
  schemaVersion: 2, id: "level-08", name: "테이프 도시", order: 7,
  description: "끈끈한 길을 뛰어넘어 테이프 작업장으로 가요", visualTheme: "tape-city",
  assets: {
    tilemap, tilemapKey: "level-08-map", tileset: "rainbow_tileset", preview: "stage_preview_tape",
    backgrounds: {
      normal: { far: "bg_tape_far", mid: "bg_normal_mid", near: "bg_normal_near" },
      boss: { far: "bg_tape_far", mid: "bg_normal_mid", near: "bg_normal_near" }
    },
    objects: { items: { star: "item_star", percent_small: "item_percent_small", percent_large: "item_percent_large",
      horn: "item_horn", wings: "item_wings", alicorn: "item_alicorn" }, checkpoint: "checkpoint_flag", gate: "rainbow_gate" },
    bgm: { ...EXPANSION_BGM["level-08"], clear: "bgm_clear" }
  },
  world: { width: 14336, height: 768, tileSize: 64 },
  parallax: { sky: 0.02, far: 0.08, mid: 0.2, near: 0.45, layerAlpha: { mid: 0, near: 0 } },
  progression: { direction: "right", retainAbilities: true },
  player: { spawn: { x: 128, y: 576 } },
  exit: { x: 14144, y: 576, enterFrom: "right", presentation: { kind: "real", placement: "ground", effects: "normal", graybox: false } },
  sections: [
    { id: "city_gate", type: "normal", xStart: 0, xEnd: 1536, mood: "normal" },
    { id: "tape_practice", type: "normal", xStart: 1536, xEnd: 3584, mood: "normal" },
    { id: "ribbon_streets", type: "normal", xStart: 3584, xEnd: 6144, mood: "normal" },
    { id: "moving_workshops", type: "normal", xStart: 6144, xEnd: 9216, mood: "normal" },
    { id: "factory_approach", type: "normal", xStart: 9216, xEnd: 12800, mood: "normal" },
    { id: "boss_tape", type: "boss", xStart: 12800, xEnd: 14336, mood: "boss", lockCamera: true,
      boss: { key: "tape_king", hp: 3, phases: Object.values(TAPE_KING_PHASES).map(({ id }) => id),
        spawn: { x: 13696, y: 576 }, environment: { suspend: [] } } }
  ],
  cameraCues: [
    { id: "cue_tape", xStart: 1088, xEnd: 1536, lookAhead: 220, targetX: 1664 },
    { id: "cue_ribbon_gap", xStart: 3392, xEnd: 3840, lookAhead: 220, targetX: 3936 },
    { id: "cue_moving_workshop", xStart: 7168, xEnd: 7680, lookAhead: 240, targetX: 7872 },
    { id: "cue_tape_boss", xStart: 12032, xEnd: 12800, lookAhead: 240, targetX: 12800 }
  ],
  checkpoints: [
    { id: "cp_tape_practice", x: 1344, y: 576, activationTop: 0 },
    { id: "cp_tape_streets", x: 3712, y: 576, activationTop: 0 },
    { id: "cp_tape_flight", x: 6080, y: 576, activationTop: 0, restoresHealth: true },
    { id: "cp_tape_factory", x: 8256, y: 576, activationTop: 0, restoresHealth: true },
    { id: "cp_tape_boss", x: 12608, y: 576, activationTop: 0, restoresHealth: true }
  ],
  enemies: [
    { id: "tape_potato_a", type: "raw_potato", x: 5056, y: 576, patrol: 80 },
    { id: "tape_potato_b", type: "raw_potato", x: 11264, y: 576, patrol: 80 }
  ],
  items: [
    { id: "tape_horn", type: "horn", x: 768, y: 576, activationTop: 0 },
    { id: "tape_wings", type: "wings", x: 6208, y: 576, activationTop: 0 },
    { id: "tape_fever", type: "alicorn", x: 9280, y: 576, activationTop: 0 },
    ...[448, 1152, 1664, 2496, 3200, 3936, 4352, 4864, 5664, 6592, 7296, 7840, 8640, 9536, 10112, 10816, 11648, 12352]
      .map((x, index) => ({ id: `tape_arc_${index}`, type: "star_arc", x,
        y: [2496, 5664, 10112].includes(x) ? 280 : 420, count: 6, radius: 100 })),
    { id: "tape_secret_guide", type: "star_arc", x: 5680, y: 290, count: 5, radius: 72 },
    { id: "tape_secret_reward", type: "percent_large", x: 5728, y: 352 },
    { id: "tape_workshop_reward", type: "percent_small", x: 12480, y: 576 }
  ],
  secrets: [{ id: "tape_roof", name: "테이프 말이 전망대", xStart: 5504, xEnd: 5952, yTop: 160, yBottom: 440,
    reward: 200, guideItemIds: ["tape_secret_guide"], rewardItemId: "tape_secret_reward" }],
  terrainMechanics: {
    stickyZones: [sticky("tape_first", 1536, 256, true), sticky("tape_second", 2304, 320), sticky("tape_third", 3008, 384),
      sticky("tape_street_a", 4480, 320), sticky("tape_street_b", 5376, 320), sticky("tape_factory_a", 8448, 320, true),
      sticky("tape_factory_b", 9472, 384), sticky("tape_factory_c", 10560, 320), sticky("tape_factory_d", 11840, 384)],
    movingPlatforms: [
      { id: "tape_moving_bridge", x: 7712, y: 480, width: 160, height: 32, axis: "x", distance: 160, speed: 72 },
      { id: "tape_workshop_lift", x: 9984, y: 480, width: 160, height: 32, axis: "y", distance: -96, speed: 64 }
    ], updrafts: [], crumblePlatforms: []
  },
  hazards: [
    { id: "tape_pit_a", type: "pit", xStart: 3840, xEnd: 4032, respawnX: 3712 },
    { id: "tape_pit_b", type: "pit", xStart: 7680, xEnd: 8000, respawnX: 7552 }
  ],
  environment: {},
  objectives: { required: [{ type: "defeat_boss", target: "tape_king" }, { type: "reach_gate" }],
    optional: [{ type: "collect_stars", count: 60, reward: 500 }, { type: "find_secrets", count: 1, reward: 300 },
      { type: "clear_time", seconds: 420, reward: 400 }, { type: "no_damage", reward: 800 }] },
  difficulty: { easyMode: { extraCheckpoints: [{ id: "cp_tape_easy", x: 11072, y: 576, activationTop: 0, restoresHealth: true }],
    removeEnemies: ["tape_potato_b"], player: { extraHp: 2, flightDrainMultiplier: 0.65 },
    boss: { telegraphMultiplier: 1.35, vulnerabilityMultiplier: 1.3 },
    terrainMechanics: { stickySpeedFloor: 0.8, movingSpeedMultiplier: 0.8, crumbleDelayMultiplier: 1.3 }, pitScoreLoss: 0 } }
};
