const definePhase = (config) => Object.freeze({
  ...config,
  volleys: Object.freeze(config.volleys.map((volley) => Object.freeze({
    ...volley,
    shots: Object.freeze(volley.shots.map((shot) => Object.freeze({ ...shot })))
  })))
});

const defineHulaPhase = (config) => Object.freeze({
  ...config,
  sequences: Object.freeze(config.sequences.map((sequence) => Object.freeze({
    ...sequence,
    volleys: Object.freeze(sequence.volleys.map((volley) => Object.freeze({
      ...volley,
      shots: Object.freeze(volley.shots.map((shot) => Object.freeze({ ...shot })))
    })))
  })))
});

const defineInvisiblePhase = (config) => Object.freeze({ ...config });

export const POTATO_KING_PHASES = Object.freeze({
  1: definePhase({
    id: "single_ground_wave",
    telegraphOffsetMs: 100,
    jumpHeight: 92,
    projectileSpeed: 340,
    vulnerabilityMs: 1650,
    recoveryMs: 700,
    volleys: [
      {
        delayMs: 0,
        shots: [
          { direction: "toward", laneOffset: 18, style: "ground", speedMultiplier: 1 }
        ]
      }
    ]
  }),
  2: definePhase({
    id: "split_wave_and_high_shot",
    telegraphOffsetMs: 0,
    jumpHeight: 74,
    projectileSpeed: 370,
    vulnerabilityMs: 1500,
    recoveryMs: 650,
    volleys: [
      {
        delayMs: 0,
        shots: [
          { direction: "left", laneOffset: 18, style: "ground", speedMultiplier: 1 },
          { direction: "right", laneOffset: 18, style: "ground", speedMultiplier: 1 }
        ]
      },
      {
        delayMs: 360,
        shots: [
          { direction: "toward", laneOffset: 92, style: "sky", speedMultiplier: 1.08 }
        ]
      }
    ]
  }),
  3: definePhase({
    id: "staggered_crossfire",
    telegraphOffsetMs: -70,
    jumpHeight: 64,
    projectileSpeed: 405,
    vulnerabilityMs: 1550,
    recoveryMs: 600,
    volleys: [
      {
        delayMs: 0,
        shots: [
          { direction: "left", laneOffset: 18, style: "ground", speedMultiplier: 1.04 },
          { direction: "right", laneOffset: 18, style: "ground", speedMultiplier: 1.04 }
        ]
      },
      {
        delayMs: 280,
        shots: [
          { direction: "toward", laneOffset: 96, style: "sky", speedMultiplier: 1.12 }
        ]
      },
      {
        delayMs: 560,
        shuffleShots: true,
        shots: [
          { direction: "toward", laneOffset: 54, style: "rainbow", speedMultiplier: 1.08 },
          { direction: "away", laneOffset: 54, style: "rainbow", speedMultiplier: 1.08 }
        ]
      }
    ]
  })
});

export const HULA_KING_PHASES = Object.freeze({
  1: defineHulaPhase({
    id: "guarded_single_hoop",
    spinMinMs: 2200,
    spinMaxMs: 3200,
    warningMs: 900,
    projectileSpeed: 330,
    vulnerabilityMs: 1800,
    recoveryMs: 650,
    sequences: [
      { id: "single_jump_fast", volleys: [{ delayMs: 0, shots: [{ direction: "toward", lane: "jump", speedMultiplier: 1 }] }] },
      { id: "single_jump_slow", volleys: [{ delayMs: 0, shots: [{ direction: "toward", lane: "jump", speedMultiplier: 0.88 }] }] }
    ]
  }),
  2: defineHulaPhase({
    id: "alternating_hoops",
    spinMinMs: 2200,
    spinMaxMs: 3050,
    warningMs: 900,
    projectileSpeed: 350,
    vulnerabilityMs: 1600,
    recoveryMs: 620,
    sequences: [
      {
        id: "low_then_jump",
        volleys: [
          { delayMs: 0, shots: [{ direction: "toward", lane: "low", speedMultiplier: 1 }] },
          { delayMs: 460, shots: [{ direction: "toward", lane: "jump", speedMultiplier: 1.04 }] }
        ]
      },
      {
        id: "jump_then_low",
        volleys: [
          { delayMs: 0, shots: [{ direction: "toward", lane: "jump", speedMultiplier: 1.02 }] },
          { delayMs: 500, shots: [{ direction: "toward", lane: "low", speedMultiplier: 0.96 }] }
        ]
      }
    ]
  }),
  3: defineHulaPhase({
    id: "bidirectional_hoops",
    spinMinMs: 2200,
    spinMaxMs: 2900,
    warningMs: 900,
    projectileSpeed: 375,
    vulnerabilityMs: 1400,
    recoveryMs: 580,
    sequences: [
      {
        id: "split_jump_then_low",
        volleys: [
          { delayMs: 0, shots: [{ direction: "left", lane: "jump" }, { direction: "right", lane: "jump" }] },
          { delayMs: 430, shots: [{ direction: "toward", lane: "low", speedMultiplier: 1.08 }] }
        ]
      },
      {
        id: "split_low_then_jump",
        volleys: [
          { delayMs: 0, shots: [{ direction: "left", lane: "low" }, { direction: "right", lane: "low" }] },
          { delayMs: 470, shots: [{ direction: "toward", lane: "jump", speedMultiplier: 1.1 }] }
        ]
      }
    ]
  })
});

export const INVISIBLE_KING_PHASES = Object.freeze({
  1: defineInvisiblePhase({
    id: "memory_open_1",
    relocateMs: 420,
    warningMs: 900,
    revealMs: 1200,
    memoryMs: 1800,
    missAttackMs: 900,
    recoveryMs: 650,
    attackRadiusX: 190,
    attackRadiusY: 150
  }),
  2: defineInvisiblePhase({
    id: "memory_open_2",
    relocateMs: 390,
    warningMs: 900,
    revealMs: 1200,
    memoryMs: 1600,
    missAttackMs: 900,
    recoveryMs: 620,
    attackRadiusX: 200,
    attackRadiusY: 155
  }),
  3: defineInvisiblePhase({
    id: "memory_open_3",
    relocateMs: 360,
    warningMs: 900,
    revealMs: 1200,
    memoryMs: 1400,
    missAttackMs: 900,
    recoveryMs: 580,
    attackRadiusX: 210,
    attackRadiusY: 160
  })
});

export const BOSS_PATTERNS = Object.freeze({
  potato_king: POTATO_KING_PHASES,
  hula_king: HULA_KING_PHASES,
  invisible_king: INVISIBLE_KING_PHASES
});

export const getHulaSpinDuration = (pattern, randomValue) => Math.round(
  pattern.spinMinMs + (pattern.spinMaxMs - pattern.spinMinMs) * Math.max(0, Math.min(1, randomValue))
);

export const chooseHulaSequence = (pattern, randomValue, previousId = null) => {
  const candidates = pattern.sequences.filter(({ id }) => id !== previousId);
  const pool = candidates.length ? candidates : pattern.sequences;
  const index = Math.min(pool.length - 1, Math.floor(Math.max(0, Math.min(0.999999, randomValue)) * pool.length));
  return pool[index];
};

export const canHitHulaKing = (state, fallingOntoHead) => (
  state === "vulnerable_rest" && Boolean(fallingOntoHead)
);

export const canHitInvisibleKing = (state, fallingOntoHead) => (
  state === "hidden_memory_window" && Boolean(fallingOntoHead)
);

export const isInvisibleAnchorReachable = (anchor, {
  xStart = Number.NEGATIVE_INFINITY,
  xEnd = Number.POSITIVE_INFINITY,
  floorY = 576,
  maxRise = 160,
  padding = 96
} = {}) => Boolean(
  anchor
  && typeof anchor.id === "string"
  && Number.isFinite(anchor.x)
  && Number.isFinite(anchor.y)
  && anchor.x >= xStart + padding
  && anchor.x <= xEnd - padding
  && anchor.y <= floorY
  && floorY - anchor.y <= maxRise
);

export const chooseInvisibleAnchor = (anchors, randomValue, previousId = null, recentIds = []) => {
  const candidates = anchors.filter(({ id }) => id !== previousId);
  const pool = candidates.length ? candidates : anchors;
  if (!pool.length) throw new Error("투명 대왕의 유효한 위치 앵커가 없습니다.");
  const weighted = pool.map((anchor) => ({
    anchor,
    weight: recentIds.includes(anchor.id) ? 1 : 3
  }));
  const total = weighted.reduce((sum, { weight }) => sum + weight, 0);
  const target = Math.max(0, Math.min(0.999999, randomValue)) * total;
  let cursor = 0;
  for (const entry of weighted) {
    cursor += entry.weight;
    if (target < cursor) return entry.anchor;
  }
  return weighted[weighted.length - 1].anchor;
};

export function getBossPhasePattern(bossKey, phase) {
  const patterns = BOSS_PATTERNS[bossKey];
  if (!patterns) throw new Error(`등록되지 않은 보스 패턴입니다: ${bossKey}`);
  const pattern = patterns[phase];
  if (!pattern) throw new Error(`등록되지 않은 보스 페이즈입니다: ${bossKey} / ${phase}`);
  return pattern;
}
