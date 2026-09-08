export const TRANSFORMATION_ITEM_TYPES = Object.freeze(["horn", "wings", "alicorn"]);

export const ITEM_EFFECT_STRENGTHS = Object.freeze({
  NORMAL: "normal",
  REDUCED: "reduced"
});

export const ITEM_PRESENTATIONS = Object.freeze({
  horn: Object.freeze({ phaseMs: 0, cycleMs: 920, glitterIntervalMs: 150 }),
  wings: Object.freeze({ phaseMs: 270, cycleMs: 1120, glitterIntervalMs: 190 }),
  alicorn: Object.freeze({ phaseMs: 560, cycleMs: 1320, glitterIntervalMs: 130 })
});

export const ITEM_EFFECT_LIMITS = Object.freeze({
  normal: Object.freeze({ twinkleCount: 3, glitterCount: 1, intervalMultiplier: 1 }),
  reduced: Object.freeze({ twinkleCount: 1, glitterCount: 1, intervalMultiplier: 2.4 }),
  offscreenMargin: 96,
  maxParticlesPerType: 20
});

export function isTransformationItem(type) {
  return TRANSFORMATION_ITEM_TYPES.includes(type);
}

export function getItemPresentation(type, strength = ITEM_EFFECT_STRENGTHS.NORMAL) {
  const presentation = ITEM_PRESENTATIONS[type];
  if (!presentation) return null;
  const effectStrength = strength === ITEM_EFFECT_STRENGTHS.REDUCED
    ? ITEM_EFFECT_STRENGTHS.REDUCED
    : ITEM_EFFECT_STRENGTHS.NORMAL;
  return {
    ...presentation,
    strength: effectStrength,
    ...ITEM_EFFECT_LIMITS[effectStrength]
  };
}

export function isItemEffectVisible(item, view, margin = ITEM_EFFECT_LIMITS.offscreenMargin) {
  if (!item?.active || !view) return false;
  return item.x >= view.x - margin
    && item.x <= view.x + view.width + margin
    && item.y >= view.y - margin
    && item.y <= view.y + view.height + margin;
}

export function getItemReviewMode(search = "") {
  const value = new URLSearchParams(search).get("itemReview");
  return value === "1" || value === "all" ? "all" : null;
}

export function applyItemReviewMode(level, mode) {
  if (!level || mode !== "all") return level;
  const direction = level.progression?.direction === "left" ? -1 : 1;
  const spawnX = Number(level.player?.spawn?.x ?? 128);
  const surfaceY = Number(level.player?.spawn?.y ?? 576);
  const positions = direction > 0
    ? [spawnX + 240, spawnX + 480, spawnX + 720]
    : [spawnX - 240, spawnX - 480, spawnX - 720];
  const reviewItems = TRANSFORMATION_ITEM_TYPES.map((type, index) => ({
    id: `item-review-${type}`,
    type,
    x: Math.max(80, Math.min(Number(level.world?.width ?? 1280) - 80, positions[index])),
    y: surfaceY - 80
  }));
  return {
    ...level,
    items: reviewItems
  };
}
