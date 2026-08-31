const definePhase = (config) => Object.freeze({
  ...config,
  volleys: Object.freeze(config.volleys.map((volley) => Object.freeze({
    ...volley,
    shots: Object.freeze(volley.shots.map((shot) => Object.freeze({ ...shot })))
  })))
});

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

export const BOSS_PATTERNS = Object.freeze({
  potato_king: POTATO_KING_PHASES
});

export function getBossPhasePattern(bossKey, phase) {
  const patterns = BOSS_PATTERNS[bossKey];
  if (!patterns) throw new Error(`등록되지 않은 보스 패턴입니다: ${bossKey}`);
  const pattern = patterns[phase];
  if (!pattern) throw new Error(`등록되지 않은 보스 페이즈입니다: ${bossKey} / ${phase}`);
  return pattern;
}
