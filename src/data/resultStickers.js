export const MAX_RESULT_STICKERS = 5;
export const RESULT_STICKER_RADIUS = 35;

export const RESULT_STICKER_PRESENTATION = Object.freeze({
  normal: Object.freeze({ startYOffset: 12, startScale: 0.72, durationMs: 260, delayMs: 110 }),
  reduced: Object.freeze({ startYOffset: 0, startScale: 1, durationMs: 100, delayMs: 80 }),
  sfx: Object.freeze({ key: "sfx_ui_select", limit: 3, volume: 0.28, rateStep: 0.04 })
});

export const RESULT_STICKER_FORBIDDEN_AREAS = Object.freeze([
  Object.freeze({ id: "clear_title", x: 450, y: 20, width: 380, height: 56 }),
  Object.freeze({ id: "character_level_name", x: 430, y: 276, width: 420, height: 32 }),
  Object.freeze({ id: "record_score", x: 450, y: 315, width: 380, height: 30 }),
  Object.freeze({ id: "objective_cards", x: 170, y: 360, width: 940, height: 150 }),
  Object.freeze({ id: "result_actions", x: 260, y: 532, width: 760, height: 145 })
]);

export const RESULT_STICKER_DEFINITIONS = Object.freeze([
  Object.freeze({ key: "clear", objectiveType: null, label: "무지개 클리어", symbol: "rainbow", textureKey: "ui_result_sticker_clear" }),
  Object.freeze({ key: "collect_stars", objectiveType: "collect_stars", label: "별 수집가", symbol: "star", textureKey: "ui_result_sticker_collect" }),
  Object.freeze({ key: "find_secrets", objectiveType: "find_secrets", label: "비밀 탐험가", symbol: "keyhole", textureKey: "ui_result_sticker_secret" }),
  Object.freeze({ key: "clear_time", objectiveType: "clear_time", label: "번개 질주", symbol: "winged_clock", textureKey: "ui_result_sticker_speed" }),
  Object.freeze({ key: "no_damage", objectiveType: "no_damage", label: "완벽한 모험", symbol: "heart_shield", textureKey: "ui_result_sticker_perfect" })
]);

export const RESULT_STICKER_SLOTS = Object.freeze([
  Object.freeze({ x: 476, y: 142, angle: -8 }),
  Object.freeze({ x: 514, y: 236, angle: 6 }),
  Object.freeze({ x: 766, y: 236, angle: -6 }),
  Object.freeze({ x: 804, y: 142, angle: 8 }),
  Object.freeze({ x: 640, y: 112, angle: 0 })
]);

export function resolveResultStickers(achieved = []) {
  const achievedTypes = new Set(Array.isArray(achieved) ? achieved : []);
  return RESULT_STICKER_DEFINITIONS
    .filter(({ objectiveType }) => objectiveType === null || achievedTypes.has(objectiveType))
    .slice(0, MAX_RESULT_STICKERS)
    .map((sticker) => ({ ...sticker }));
}

export function getResultStickerLayout(achieved = []) {
  return resolveResultStickers(achieved).map((sticker) => {
    const slotIndex = RESULT_STICKER_DEFINITIONS.findIndex(({ key }) => key === sticker.key);
    return {
      ...sticker,
      ...RESULT_STICKER_SLOTS[slotIndex],
      slotIndex
    };
  });
}
