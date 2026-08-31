const tilemapUrl = new URL("../../../assets/levels/p9-boss-test/tilemap.json", import.meta.url).href;

const assets = Object.freeze({
  tilemap: tilemapUrl,
  tileset: "grass_tileset",
  backgrounds: {
    normal: { far: "bg_normal_far", mid: "bg_normal_mid", near: "bg_normal_near" },
    boss: { far: "bg_boss_far", mid: "bg_boss_mid", near: "bg_boss_near" }
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
});

const makeBossTestLevel = ({ id, name, order, direction }) => {
  const rightward = direction === "right";
  const bossSection = rightward
    ? { xStart: 2048, xEnd: 4096 }
    : { xStart: 0, xEnd: 2048 };
  const normalSection = rightward
    ? { xStart: 0, xEnd: 2048 }
    : { xStart: 2048, xEnd: 4096 };
  return {
    schemaVersion: 2,
    id,
    name,
    description: `P9 ${direction} 진행 보스 공통 기반 시험`,
    order,
    assets: { ...assets, tilemapKey: `${id}-map` },
    world: { width: 4096, height: 768, tileSize: 64 },
    parallax: { sky: 0.02, far: 0.08, mid: 0.2, near: 0.45 },
    progression: { direction },
    player: { spawn: { x: rightward ? 128 : 3968, y: 576 } },
    exit: { x: rightward ? 3920 : 176, y: 576, enterFrom: direction },
    sections: [
      { id: "approach", type: "normal", ...normalSection, mood: "normal" },
      {
        id: "boss",
        type: "boss",
        ...bossSection,
        mood: "boss",
        lockCamera: true,
        boss: {
          key: "training_dummy",
          hp: 3,
          phases: ["practice_open_1", "practice_open_2", "practice_open_3"],
          environment: { suspend: ["tsunami", "mist", "lasers", "breath"] }
        }
      }
    ].sort((left, right) => left.xStart - right.xStart),
    cameraCues: [],
    checkpoints: [{ id: "cp_before_boss", x: rightward ? 1920 : 2176, y: 576, restoresHealth: true }],
    enemies: [],
    items: [],
    hazards: [],
    environment: {},
    objectives: {
      required: [
        { type: "defeat_boss", target: "training_dummy" },
        { type: "reach_gate" }
      ],
      optional: []
    },
    difficulty: {
      easyMode: {
        extraCheckpoints: [],
        removeEnemies: [],
        player: { extraHp: 2, flightDrainMultiplier: 0.65 },
        boss: { telegraphMultiplier: 1.2 },
        pitScoreLoss: 0
      }
    }
  };
};

export const p9BossTestRight = makeBossTestLevel({
  id: "p9-boss-test-right",
  name: "P9 보스 기반 · 오른쪽 진행",
  order: 901,
  direction: "right"
});

export const p9BossTestLeft = makeBossTestLevel({
  id: "p9-boss-test-left",
  name: "P9 보스 기반 · 왼쪽 진행",
  order: 902,
  direction: "left"
});
