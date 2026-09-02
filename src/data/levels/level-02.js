const tilemapUrl = new URL("../../../assets/levels/level-02/tilemap.json", import.meta.url).href;

export const P13_RANDOM_BOSS_ROOM_WIDTH = 2048;

export default {
  schemaVersion: 1,
  id: "level-02",
  name: "별빛 숲",
  description: "달빛 나뭇가지와 반짝이는 길",
  visualTheme: "starlit-forest",
  order: 2,
  assets: {
    tilemap: tilemapUrl,
    tilemapKey: "level-02-map",
    tileset: "starlight_tileset",
    preview: "stage_preview_starlight",
    backgrounds: {
      normal: { far: "bg_starlight_far", mid: "bg_starlight_mid", near: "bg_starlight_near" }
    },
    decorations: {
      starTree: "decor_star_tree",
      moonBranch: "decor_moon_branch",
      firefly: "decor_firefly",
      starFlower: "decor_star_flower"
    },
    effects: {
      laserEmitter: "laser_emitter",
      laserSwitchOn: "laser_switch_on",
      laserSwitchOff: "laser_switch_off",
      laserWarning: "fx_laser_warning",
      laserBeam: "fx_laser_beam"
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
    bgm: { field: "bgm_starlight", boss: "bgm_boss", clear: "bgm_clear" }
  },
  world: { width: 8192, height: 768, tileSize: 64 },
  parallax: { sky: 0.02, far: 0.08, mid: 0.2, near: 0.45 },
  player: { spawn: { x: 128, y: 576 } },
  sections: [
    { id: "moonlit_trail", type: "normal", xStart: 0, xEnd: 1792, mood: "normal" },
    { id: "glow_canopy", type: "normal", xStart: 1792, xEnd: 3840, mood: "normal" },
    { id: "whispering_gap", type: "normal", xStart: 3840, xEnd: 4992, mood: "normal" },
    { id: "star_tree", type: "normal", xStart: 4992, xEnd: 6144, mood: "normal" },
    {
      id: "boss_random",
      type: "boss",
      xStart: 6144,
      xEnd: 8192,
      mood: "normal",
      lockCamera: true,
      boss: {
        key: "random_king",
        hp: 3,
        phases: ["random_mix_1", "random_mix_2", "random_mix_3"],
        completion: "level",
        spawn: { x: 7584, y: 576 },
        floorY: 576,
        environment: { suspend: ["lasers"] },
        resultDeck: ["replay_section", "score_plus", "score_minus", "start_battle"],
        maxNonBattle: 3,
        scoreDelta: 100,
        reentrySafetyMs: 1000,
        easyReentrySafetyMs: 1500,
        replayCourses: [
          { id: "moonlit_trail", name: "달빛 길", x: 256, y: 576 },
          { id: "glow_canopy", name: "빛나는 숲관", x: 1664, y: 576 },
          { id: "whispering_gap", name: "속삭이는 틈", x: 3712, y: 576 },
          { id: "star_tree", name: "별나무", x: 5120, y: 576 }
        ],
        arenaAnchors: [
          { id: "random_left", x: 6560, y: 576 },
          { id: "random_mid_left", x: 6976, y: 576 },
          { id: "random_mid_right", x: 7392, y: 576 },
          { id: "random_right", x: 7808, y: 576 }
        ]
      }
    }
  ],
  cameraCues: [
    { id: "cue_first_gap", xStart: 1504, xEnd: 2240, lookAhead: 175, targetX: 2304 },
    { id: "cue_canopy_arc", xStart: 2880, xEnd: 3520, lookAhead: 165, targetX: 3712 },
    { id: "cue_whispering_gap", xStart: 3648, xEnd: 4800, lookAhead: 190, targetX: 4992 }
  ],
  decorations: [
    { id: "moon_branch_marker", asset: "moonBranch", x: 1480, y: 574, width: 330, height: 220, depth: -5 },
    { id: "firefly_glade", asset: "firefly", x: 2230, y: 344, width: 176, height: 146, depth: -4, float: true },
    { id: "star_flower_canopy", asset: "starFlower", x: 3390, y: 574, width: 190, height: 142, depth: -4 },
    { id: "firefly_gap", asset: "firefly", x: 4410, y: 312, width: 168, height: 140, depth: -4, float: true, delay: 260 },
    { id: "star_tree_landmark", asset: "starTree", x: 5480, y: 578, width: 570, height: 570, depth: -5 },
    { id: "star_flower_exit", asset: "starFlower", x: 5820, y: 574, width: 176, height: 132, depth: -4 },
    { id: "random_room_tree_left", asset: "starTree", x: 6400, y: 578, width: 420, height: 420, depth: -5 },
    { id: "random_room_fireflies", asset: "firefly", x: 7080, y: 330, width: 210, height: 174, depth: -4, float: true },
    { id: "random_room_tree_right", asset: "starTree", x: 7950, y: 578, width: 460, height: 460, depth: -5 }
  ],
  checkpoints: [
    { id: "cp_moonroot", x: 1664, y: 576 },
    { id: "cp_fireflies", x: 3712, y: 576 },
    { id: "cp_star_tree", x: 5120, y: 576, restoresHealth: true },
    { id: "cp_random_ready", x: 6272, y: 576, restoresHealth: true }
  ],
  enemies: [
    { id: "e_moonroot_01", type: "raw_potato", x: 896, y: 576, patrol: 160 },
    {
      id: "e_archer_intro",
      type: "potato_archer",
      x: 3008,
      y: 576,
      triggerX: 2672,
      telegraphMs: 1100,
      arrowSpeed: 240,
      cooldownMs: 1200,
      oneShot: true
    },
    {
      id: "e_archer_practice",
      type: "potato_archer",
      x: 3584,
      y: 576,
      triggerX: 3168,
      telegraphMs: 900,
      arrowSpeed: 320,
      cooldownMs: 1200
    },
    {
      id: "e_archer_combination",
      type: "potato_archer",
      x: 5824,
      y: 576,
      triggerX: 5488,
      activationDelayMs: 280,
      telegraphMs: 900,
      arrowSpeed: 320,
      cooldownMs: 1200
    }
  ],
  items: [
    { id: "moonlit_star", type: "star", x: 320, y: 496 },
    { id: "moonlit_arc", type: "star_arc", x: 704, y: 424, count: 8, radius: 132 },
    { id: "moonlit_horn", type: "horn", x: 1216, y: 496 },
    { id: "moonlit_reward", type: "percent_small", x: 1536, y: 496 },
    { id: "wing_glade", type: "wings", x: 2496, y: 496 },
    { id: "canopy_arc_low", type: "star_arc", x: 2768, y: 430, count: 10, radius: 148 },
    { id: "canopy_arc_high", type: "star_arc", x: 3264, y: 350, count: 10, radius: 134 },
    { id: "canopy_reward", type: "percent_large", x: 3648, y: 376 },
    { id: "gap_arc_01", type: "star_arc", x: 4064, y: 392, count: 9, radius: 130 },
    { id: "gap_arc_02", type: "star_arc", x: 4608, y: 320, count: 10, radius: 162 },
    { id: "gap_reward", type: "percent_small", x: 4736, y: 352 },
    { id: "star_tree_arc", type: "star_arc", x: 5440, y: 402, count: 10, radius: 160 },
    { id: "star_tree_reward", type: "percent_large", x: 5824, y: 368 },
    { id: "gate_star", type: "star", x: 5952, y: 496 }
  ],
  terrainMechanics: {
    visualTheme: "starlit-forest",
    movingPlatforms: [
      { id: "moon_branch", x: 1856, y: 464, width: 160, height: 32, axis: "x", distance: 224, speed: 64 },
      { id: "firefly_branch", x: 4504, y: 400, width: 160, height: 32, axis: "y", distance: 112, speed: 56 }
    ],
    crumblePlatforms: [
      { id: "glow_branch_01", x: 4144, y: 448, width: 176, height: 32, crumbleDelayMs: 1100, respawnMs: 2200 }
    ]
  },
  hazards: [
    { id: "thorn_moonroot", type: "spike_pumpkin", x: 1472, y: 576 },
    { id: "moon_gap", type: "pit", xStart: 1792, xEnd: 2304, respawnX: 1664 },
    { id: "whispering_gap", type: "pit", xStart: 3840, xEnd: 4992, respawnX: 3712 }
  ],
  environment: {
    lasers: {
      switches: [
        { id: "laser_switch_application", x: 5144, y: 430 },
        { id: "laser_switch_combination", x: 5440, y: 398 }
      ],
      beams: [
        {
          id: "laser_application",
          switchId: "laser_switch_application",
          x: 5304,
          yStart: 284,
          yEnd: 576,
          startDelayMs: 0,
          warningMs: 900,
          activeMs: 1400,
          restMs: 1200
        },
        {
          id: "laser_combination",
          switchId: "laser_switch_combination",
          x: 5616,
          yStart: 284,
          yEnd: 576,
          startDelayMs: 650,
          warningMs: 900,
          activeMs: 1400,
          restMs: 1200
        }
      ]
    }
  },
  objectives: {
    required: [
      { type: "defeat_boss", target: "random_king" },
      { type: "reach_gate" }
    ],
    optional: [
      { type: "collect_stars", count: 35, reward: 450 },
      { type: "clear_time", seconds: 210, reward: 300 },
      { type: "no_damage", reward: 700 }
    ]
  },
  difficulty: {
    easyMode: {
      extraCheckpoints: [{ id: "cp_easy_gap", x: 3712, y: 576 }],
      removeEnemies: [],
      player: { extraHp: 1, flightDrainMultiplier: 0.7 },
      terrainMechanics: { movingSpeedMultiplier: 0.72, crumbleDelayMultiplier: 1.45 },
      boss: { telegraphMultiplier: 1.25, vulnerabilityMultiplier: 1.35, volleyIntervalMultiplier: 1.2 },
      environment: {
        lasers: { warningMultiplier: 13 / 9, activeMultiplier: 6 / 7, restMultiplier: 1.5 },
        projectiles: {
          speedMultiplier: 0.75,
          telegraphMultiplier: 25 / 18,
          cooldownMultiplier: 31 / 24,
          maxActive: 3
        }
      },
      pitScoreLoss: 0
    }
  },
  exit: { x: 8016, y: 576 }
};
