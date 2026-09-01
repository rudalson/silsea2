import { COLORS } from "../config/constants.js";

const freezeRender = ({ placeholderColor, art = null, fallback }) => Object.freeze({
  placeholder: Object.freeze({ width: 150, height: 150, color: placeholderColor }),
  art: art ? Object.freeze({
    origin: Object.freeze(art.origin),
    scale: art.scale,
    body: Object.freeze(art.body)
  }) : null,
  fallback: Object.freeze({
    origin: Object.freeze(fallback.origin),
    scale: fallback.scale,
    body: Object.freeze(fallback.body)
  })
});

const COMMON_ANIMATION_ROLES = Object.freeze([
  "idle",
  "jump",
  "fall",
  "land",
  "attack",
  "hurt",
  "defeated"
]);

export const BOSS_DEFINITIONS = Object.freeze({
  potato_king: Object.freeze({
    key: "potato_king",
    displayName: "감자 대왕",
    behavior: "potato_king",
    defaultHp: 3,
    phaseIds: Object.freeze(["single_ground_wave", "split_wave_and_high_shot", "staggered_crossfire"]),
    completion: "level",
    animationRoles: COMMON_ANIMATION_ROLES,
    spawn: Object.freeze({ edgeOffset: 560 }),
    render: freezeRender({
      placeholderColor: COLORS.dangerAlt,
      art: {
        origin: { x: 0.5, y: 112 / 128 },
        scale: 1.5,
        body: { width: 82, height: 78, offsetX: 23, offsetY: 34, center: false }
      },
      fallback: {
        origin: { x: 0.5, y: 1 },
        scale: 1,
        body: { width: 118, height: 118, center: true }
      }
    }),
    copy: Object.freeze({
      intro: "공격 예고 뒤 반짝이는 약점을 밟으세요",
      hit: "공격 예고 뒤 약점을 노리세요"
    })
  }),
  training_dummy: Object.freeze({
    key: "training_dummy",
    displayName: "연습 대왕",
    behavior: "training_dummy",
    defaultHp: 3,
    phaseIds: Object.freeze(["practice_open_1", "practice_open_2", "practice_open_3"]),
    completion: "level",
    animationRoles: Object.freeze([]),
    spawn: Object.freeze({ edgeOffset: 560 }),
    render: freezeRender({
      placeholderColor: COLORS.collectBlue,
      fallback: {
        origin: { x: 0.5, y: 1 },
        scale: 1,
        body: { width: 118, height: 118, center: true }
      }
    }),
    copy: Object.freeze({
      intro: "빛나는 동안 머리 위를 밟으세요",
      hit: "다시 빛날 때 머리 위를 노리세요"
    })
  }),
  hula_king: Object.freeze({
    key: "hula_king",
    displayName: "훌라후프 대왕",
    behavior: "hula_king",
    defaultHp: 3,
    phaseIds: Object.freeze(["guarded_single_hoop", "alternating_hoops", "bidirectional_hoops"]),
    completion: "level",
    animationRoles: Object.freeze(["idle", "spin", "warning", "throw", "vulnerable", "hurt", "defeated"]),
    spawn: Object.freeze({ edgeOffset: 560 }),
    render: freezeRender({
      placeholderColor: COLORS.collectPink,
      art: {
        origin: { x: 0.5, y: 112 / 128 },
        scale: 1.5,
        body: { width: 82, height: 78, offsetX: 23, offsetY: 34, center: false }
      },
      fallback: {
        origin: { x: 0.5, y: 1 },
        scale: 1,
        body: { width: 118, height: 118, center: true }
      }
    }),
    copy: Object.freeze({
      intro: "회전이 멈춘 순간 머리 위를 밟으세요",
      hit: "훌라후프를 피하고 정지 순간을 노리세요"
    })
  }),
  invisible_king: Object.freeze({
    key: "invisible_king",
    displayName: "투명 대왕",
    behavior: "invisible_king",
    defaultHp: 3,
    phaseIds: Object.freeze(["memory_open_1", "memory_open_2", "memory_open_3"]),
    completion: "level",
    animationRoles: Object.freeze(["idle", "reveal", "hide", "attack", "hurt", "defeated"]),
    spawn: Object.freeze({ edgeOffset: 560 }),
    render: freezeRender({
      placeholderColor: COLORS.collectBlue,
      art: {
        origin: { x: 0.5, y: 112 / 128 },
        scale: 1.5,
        body: { width: 80, height: 80, offsetX: 24, offsetY: 32, center: false }
      },
      fallback: {
        origin: { x: 0.5, y: 1 },
        scale: 1,
        body: { width: 118, height: 118, center: true }
      }
    }),
    copy: Object.freeze({
      intro: "빛에 드러난 위치를 기억한 뒤 같은 곳을 밟으세요",
      hit: "다음 빛기둥이 비춘 위치를 기억하세요"
    })
  }),
  water_king: Object.freeze({
    key: "water_king",
    displayName: "물 대왕",
    behavior: "water_king",
    defaultHp: 3,
    phaseIds: Object.freeze(["single_splash_5", "split_splash_4", "triple_splash_3"]),
    completion: "level",
    animationRoles: Object.freeze([]),
    spawn: Object.freeze({ edgeOffset: 560 }),
    render: freezeRender({
      placeholderColor: COLORS.collectBlue,
      fallback: {
        origin: { x: 0.5, y: 1 },
        scale: 1,
        body: { width: 118, height: 118, center: true }
      }
    }),
    copy: Object.freeze({
      intro: "물 공격 뒤 어지러운 동안 머리 위를 밟으세요",
      hit: "다른 웅덩이의 출현 예고를 확인하세요"
    })
  })
});

export const BOSS_TYPES = Object.freeze(Object.keys(BOSS_DEFINITIONS));

export const getBossDefinition = (key) => BOSS_DEFINITIONS[key] ?? null;

export const requireBossDefinition = (key) => {
  const definition = getBossDefinition(key);
  if (!definition) throw new Error(`등록되지 않은 보스 키입니다: ${key}`);
  return definition;
};

export const resolveBossSpawnX = (section, direction = "right", definition = null) => {
  const explicitX = section?.boss?.spawn?.x;
  if (Number.isFinite(explicitX)) return explicitX;
  const resolvedDefinition = definition ?? requireBossDefinition(section?.boss?.key);
  const edgeOffset = section?.boss?.spawn?.edgeOffset ?? resolvedDefinition.spawn.edgeOffset;
  return direction === "left"
    ? section.xStart + edgeOffset
    : section.xEnd - edgeOffset;
};

export const resolveBossPhase = (maxHp, hp, phaseCount) => Math.min(
  Math.max(1, phaseCount),
  Math.max(1, maxHp - hp + 1)
);

export const createBossEventPayload = ({
  key,
  displayName,
  hp,
  maxHp,
  levelId,
  levelName,
  completion = "level"
}) => Object.freeze({ key, displayName, hp, maxHp, levelId, levelName, completion });
