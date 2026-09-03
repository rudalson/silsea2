export const OBJECTIVE_PRESENTATIONS = Object.freeze({
  collect_stars: Object.freeze({ glyph: "★", title: "별 수집가" }),
  find_secrets: Object.freeze({ glyph: "?", title: "비밀 탐험가" }),
  clear_time: Object.freeze({ glyph: "TIME", title: "번개 질주" }),
  no_damage: Object.freeze({ glyph: "HP", title: "완벽한 모험" })
});

export const getObjectiveDetail = (objective = {}) => {
  switch (objective.type) {
    case "collect_stars":
      return `별 ${objective.count}개 모으기`;
    case "find_secrets":
      return `비밀 공간 ${objective.count}곳 발견`;
    case "clear_time":
      return `${objective.seconds}초 안에 도착`;
    case "no_damage":
      return "HP 피해 없이 클리어";
    default:
      return "선택 목표 달성";
  }
};

export function getObjectiveCelebrations(level, achieved = [], limit = 3) {
  const achievedTypes = new Set(Array.isArray(achieved) ? achieved : []);
  const all = (level?.objectives?.optional ?? [])
    .filter(({ type }) => achievedTypes.has(type) && OBJECTIVE_PRESENTATIONS[type])
    .map((objective) => ({
      ...OBJECTIVE_PRESENTATIONS[objective.type],
      type: objective.type,
      detail: getObjectiveDetail(objective)
    }));
  const safeLimit = Math.max(0, Math.floor(Number(limit) || 0));
  const cards = all.slice(0, safeLimit);
  return {
    cards,
    totalAchieved: all.length,
    overflow: Math.max(0, all.length - cards.length)
  };
}
