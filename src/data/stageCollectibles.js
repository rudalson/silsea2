import { PALETTE } from "../../data/palette.js";

const colorNumber = color => Number.parseInt(color.slice(1), 16);
const theme = (key, name, glyph, shape, color) => Object.freeze({ key, name, glyph, shape, color: colorNumber(color), themed: true });

export const STAGE_COLLECTIBLES = Object.freeze([
  theme("item_merong_crown", "왕관 보석", "♛", "crown", PALETTE.collect[0]),
  theme("item_tape_ribbon", "테이프 조각", "▰", "ribbon", PALETTE.alora[3]),
  theme("item_music_note", "음표 보석", "♫", "note", PALETTE.sylvia[10]),
  theme("item_hole_ring", "고리 보석", "◎", "ring", PALETTE.sunlight[2]),
  theme("item_cloud_drop", "빗방울 보석", "♦", "drop", PALETTE.collect[1])
]);
const original = Object.freeze({ key: "item_star", name: "별", glyph: "★", shape: "star", color: colorNumber(PALETTE.collect[0]), themed: false });

export function getStageCollectible(level) {
  const key = level?.assets?.objects?.items?.star;
  return STAGE_COLLECTIBLES.find(theme => theme.key === key) ?? original;
}

export function getCollectibleGoalText(level, count) {
  const target = level?.objectives?.optional?.find(goal => goal.type === "collect_stars")?.count;
  return `${getStageCollectible(level).name} ${count}${target ? `/${target}` : "개"}`;
}
