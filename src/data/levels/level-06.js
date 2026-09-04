const tilemapUrl = new URL("../../../assets/levels/level-06/tilemap.json", import.meta.url).href;

export default {
  schemaVersion: 1,
  id: "level-06",
  name: "무지개 이어달리기",
  description: "익숙한 움직임과 변신을 짧게 이어 달리는 도전길",
  visualTheme: "rainbow-relay-graybox",
  order: 6,
  progression: { direction: "right" },
  exit: { x: 4944, y: 576, enterFrom: "right" },
  assets: {
    tilemap: tilemapUrl,
    tilemapKey: "level-06-map",
    tileset: "grass_tileset",
    preview: "stage_preview_rainbow_relay",
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
    bgm: { field: "bgm_field", boss: "bgm_boss", clear: "bgm_clear" }
  },
  world: { width: 5120, height: 768, tileSize: 64 },
  parallax: { sky: 0.02, far: 0.08, mid: 0.2, near: 0.45 },
  player: { spawn: { x: 128, y: 576 } },
  sections: [
    { id: "relay_start", type: "normal", xStart: 0, xEnd: 768, mood: "normal" },
    { id: "relay_unicorn", type: "normal", xStart: 768, xEnd: 1920, mood: "normal" },
    { id: "relay_flight", type: "normal", xStart: 1920, xEnd: 3328, mood: "normal" },
    { id: "relay_mix", type: "normal", xStart: 3328, xEnd: 4608, mood: "normal" },
    { id: "relay_finish", type: "normal", xStart: 4608, xEnd: 5120, mood: "normal" }
  ],
  cameraCues: [
    { id: "cue_first_pumpkin", xStart: 768, xEnd: 1152, lookAhead: 170, targetX: 1216 },
    { id: "cue_first_pit", xStart: 1856, xEnd: 2240, lookAhead: 190, targetX: 2464 },
    { id: "cue_mix", xStart: 3264, xEnd: 3648, lookAhead: 180, targetX: 3840 }
  ],
  checkpoints: [
    { id: "cp_relay_unicorn", x: 1792, y: 576 },
    { id: "cp_relay_flight", x: 3264, y: 576 },
    { id: "cp_relay_finish", x: 4544, y: 576, restoresHealth: true }
  ],
  enemies: [
    { id: "relay_potato", type: "raw_potato", x: 1392, y: 576, patrol: 128 },
    { id: "relay_cloud", type: "dark_cloud", x: 3104, y: 256, triggerX: 2928, telegraphMs: 1050, cooldownMs: 2600 },
    {
      id: "relay_archer",
      type: "potato_archer",
      x: 3712,
      y: 576,
      triggerX: 3328,
      telegraphMs: 1050,
      arrowSpeed: 280,
      cooldownMs: 1500,
      oneShot: true
    }
  ],
  items: [
    { id: "relay_start_arc", type: "star_arc", x: 416, y: 460, count: 4, radius: 90 },
    { id: "relay_horn", type: "horn", x: 896, y: 496 },
    { id: "relay_unicorn_arc", type: "star_arc", x: 1280, y: 360, count: 6, radius: 110 },
    { id: "relay_unicorn_exit_star", type: "star", x: 1760, y: 496 },
    { id: "relay_wings", type: "wings", x: 2048, y: 496 },
    { id: "relay_flight_arc_a", type: "star_arc", x: 2320, y: 392, count: 6, radius: 100 },
    { id: "relay_flight_arc_b", type: "star_arc", x: 2816, y: 384, count: 6, radius: 100 },
    { id: "relay_flight_exit_star", type: "star", x: 3168, y: 496 },
    { id: "relay_alicorn", type: "alicorn", x: 3392, y: 496 },
    { id: "relay_mix_arc_a", type: "star_arc", x: 3680, y: 360, count: 4, radius: 92 },
    { id: "relay_mix_arc_b", type: "star_arc", x: 4048, y: 340, count: 4, radius: 100 },
    { id: "relay_mix_exit_star", type: "star", x: 4384, y: 496 },
    { id: "relay_finish_reward", type: "percent_large", x: 4672, y: 496 }
  ],
  secrets: [],
  terrainMechanics: {
    movingPlatforms: [
      {
        id: "relay_moving_bridge",
        x: 2208,
        y: 480,
        width: 160,
        height: 32,
        axis: "x",
        distance: 144,
        speed: 72
      },
      {
        id: "relay_moving_lift",
        x: 2736,
        y: 480,
        width: 160,
        height: 32,
        axis: "y",
        distance: -96,
        speed: 64
      }
    ],
    updrafts: [],
    crumblePlatforms: [
      {
        id: "relay_crumble_low",
        x: 3552,
        y: 432,
        width: 176,
        height: 32,
        crumbleDelayMs: 950,
        respawnMs: 2000
      },
      {
        id: "relay_crumble_high",
        x: 3856,
        y: 368,
        width: 176,
        height: 32,
        crumbleDelayMs: 900,
        respawnMs: 2000
      }
    ]
  },
  hazards: [
    { id: "relay_pumpkin_intro", type: "spike_pumpkin", x: 1120, y: 576 },
    { id: "relay_pumpkin_unicorn", type: "spike_pumpkin", x: 1600, y: 576 },
    { id: "relay_pit_bridge", type: "pit", xStart: 2176, xEnd: 2528, respawnX: 2048 },
    { id: "relay_pit_lift", type: "pit", xStart: 2688, xEnd: 2976, respawnX: 2624 },
    { id: "relay_pumpkin_mix", type: "spike_pumpkin", x: 4032, y: 576 }
  ],
  objectives: {
    required: [{ type: "reach_gate" }],
    optional: [
      { type: "collect_stars", count: 30, reward: 500 },
      { type: "clear_time", seconds: 180, reward: 400 },
      { type: "no_damage", reward: 800 }
    ]
  },
  difficulty: {
    easyMode: {
      extraCheckpoints: [{ id: "cp_relay_easy", x: 2624, y: 576 }],
      removeEnemies: ["relay_archer"],
      player: { extraHp: 2, flightDrainMultiplier: 0.65 },
      terrainMechanics: { movingSpeedMultiplier: 0.75, crumbleDelayMultiplier: 1.5 },
      pitScoreLoss: 0
    }
  }
};
