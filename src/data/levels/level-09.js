import { MUSIC_KING_PHASES } from "../musicMechanics.js";

const tilemap = new URL("../../../assets/levels/level-09/tilemap.json", import.meta.url).href;
const rest = (id, xStart, xEnd, practice = false) => ({ id, xStart, xEnd, floorY: 576,
  warningMs: 1500, stopMs: 5000, retryMs: 1200, movementTolerance: 0.2, practice, requireSuccess: true });

export default {
  schemaVersion: 2, id: "level-09", name: "피아노 나라", order: 9,
  description: "띵! 신호에 5초 멈추고 음악 대왕의 연주를 들어요", visualTheme: "piano-kingdom",
  assets: {
    tilemap, tilemapKey: "level-09-map", tileset: "rainbow_tileset", preview: "stage_preview_music",
    backgrounds: {
      normal: { far: "bg_music_far", mid: "bg_normal_mid", near: "bg_normal_near" },
      boss: { far: "bg_music_far", mid: "bg_normal_mid", near: "bg_normal_near" }
    },
    objects: { items: { star: "item_star", percent_small: "item_percent_small", percent_large: "item_percent_large",
      horn: "item_horn", wings: "item_wings", alicorn: "item_alicorn" }, checkpoint: "checkpoint_flag", gate: "rainbow_gate" },
    bgm: { field: "bgm_field", boss: "bgm_boss", clear: "bgm_clear" }
  },
  world: { width: 16384, height: 768, tileSize: 64 },
  parallax: { sky: 0.02, far: 0.08, mid: 0.2, near: 0.45, layerAlpha: { mid: 0, near: 0 } },
  progression: { direction: "right", retainAbilities: true },
  player: { spawn: { x: 128, y: 576 } },
  exit: { x: 16192, y: 576, enterFrom: "right", presentation: { kind: "real", placement: "ground", effects: "normal", graybox: false } },
  sections: [
    { id: "music_gate", type: "normal", xStart: 0, xEnd: 1536, mood: "normal" },
    { id: "piano_practice", type: "normal", xStart: 1536, xEnd: 3584, mood: "normal" },
    { id: "melody_paths", type: "normal", xStart: 3584, xEnd: 6656, mood: "normal" },
    { id: "sky_keys", type: "normal", xStart: 6656, xEnd: 10240, mood: "normal" },
    { id: "concert_approach", type: "normal", xStart: 10240, xEnd: 14848, mood: "normal" },
    { id: "boss_music", type: "boss", xStart: 14848, xEnd: 16384, mood: "boss", lockCamera: true,
      boss: { key: "music_king", hp: 3, phases: Object.values(MUSIC_KING_PHASES).map(({ id }) => id),
        spawn: { x: 15744, y: 576 }, environment: { suspend: [] } } }
  ],
  cameraCues: [
    { id: "cue_rest_first", xStart: 1024, xEnd: 1536, lookAhead: 200, targetX: 1888 },
    { id: "cue_keyboard_gap", xStart: 3328, xEnd: 3840, lookAhead: 220, targetX: 3936 },
    { id: "cue_rest_second", xStart: 4864, xEnd: 5376, lookAhead: 200, targetX: 5760 },
    { id: "cue_rest_third", xStart: 10752, xEnd: 11264, lookAhead: 200, targetX: 11648 },
    { id: "cue_music_boss", xStart: 14080, xEnd: 14848, lookAhead: 240, targetX: 14848 }
  ],
  checkpoints: [
    { id: "cp_music_practice", x: 1344, y: 576, activationTop: 0 },
    { id: "cp_music_gap", x: 3712, y: 576, activationTop: 0 },
    { id: "cp_music_flight", x: 6528, y: 576, activationTop: 0, restoresHealth: true },
    { id: "cp_music_sky", x: 7936, y: 576, activationTop: 0, restoresHealth: true },
    { id: "cp_music_concert", x: 12288, y: 576, activationTop: 0, restoresHealth: true },
    { id: "cp_music_boss", x: 14656, y: 576, activationTop: 0, restoresHealth: true }
  ],
  enemies: [
    { id: "music_potato_a", type: "raw_potato", x: 4672, y: 576, patrol: 80 },
    { id: "music_potato_b", type: "raw_potato", x: 13440, y: 576, patrol: 80 }
  ],
  items: [
    { id: "music_horn", type: "horn", x: 768, y: 576, activationTop: 0 },
    { id: "music_wings", type: "wings", x: 7040, y: 576, activationTop: 0 },
    { id: "music_fever", type: "alicorn", x: 12160, y: 576, activationTop: 0 },
    ...[448, 1152, 1888, 2688, 3200, 3936, 4416, 5056, 5760, 6400, 7296, 8320, 8960, 9600, 10496, 11648, 12736, 13760, 14336]
      .map((x, index) => ({ id: `music_arc_${index}`, type: "star_arc", x,
        y: [2688, 9600, 13760].includes(x) ? 280 : 420, count: 6, radius: 100 })),
    { id: "music_secret_guide", type: "star_arc", x: 9576, y: 290, count: 5, radius: 72 },
    { id: "music_secret_reward", type: "percent_large", x: 9664, y: 352 },
    { id: "music_stage_reward", type: "percent_small", x: 14528, y: 576 }
  ],
  secrets: [{ id: "music_harp_balcony", name: "하프 궁전의 전망대", xStart: 9408, xEnd: 9856, yTop: 160, yBottom: 440,
    reward: 200, guideItemIds: ["music_secret_guide"], rewardItemId: "music_secret_reward" }],
  terrainMechanics: {
    movingPlatforms: [{ id: "music_key_bridge", x: 8224, y: 480, width: 160, height: 32, axis: "x", distance: 160, speed: 72 }],
    updrafts: [], crumblePlatforms: []
  },
  hazards: [
    { id: "music_pit_a", type: "pit", xStart: 3840, xEnd: 4032, respawnX: 3712 },
    { id: "music_pit_b", type: "pit", xStart: 8192, xEnd: 8512, respawnX: 7936 }
  ],
  environment: { pianoCourse: true,
    rhythmZones: [rest("music_rest_practice", 1536, 2240, true), rest("music_rest_melody", 5376, 6144), rest("music_rest_concert", 11264, 12032)] },
  objectives: { required: [{ type: "defeat_boss", target: "music_king" }, { type: "reach_gate" }],
    optional: [{ type: "collect_stars", count: 65, reward: 500 }, { type: "find_secrets", count: 1, reward: 300 },
      { type: "clear_time", seconds: 480, reward: 400 }, { type: "no_damage", reward: 800 }] },
  difficulty: { easyMode: { extraCheckpoints: [{ id: "cp_music_easy", x: 10112, y: 576, activationTop: 0, restoresHealth: true }],
    removeEnemies: ["music_potato_b"], player: { extraHp: 2, flightDrainMultiplier: 0.65 },
    boss: { telegraphMultiplier: 1.35, vulnerabilityMultiplier: 1.3 },
    terrainMechanics: { movingSpeedMultiplier: 0.8, crumbleDelayMultiplier: 1.3 },
    environment: { rhythmWarningMultiplier: 1.4 }, pitScoreLoss: 0 } }
};
