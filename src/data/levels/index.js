import level01 from "./level-01.js";
import level02 from "./level-02.js";

export const LEVELS = Object.freeze([level01, level02]);
export const getLevel = (id) => LEVELS.find((level) => level.id === id) ?? null;
export const getNextLevel = (id) => {
  const current = getLevel(id);
  return current ? LEVELS.find((level) => level.order === current.order + 1) ?? null : null;
};

