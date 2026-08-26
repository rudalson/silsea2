import level01 from "./level-01.js";
import level02 from "./level-02.js";
import level03 from "./level-03.js";
import level04 from "./level-04.js";
import p1EnvironmentTest from "./p1-environment-test.js";

export const LEVELS = Object.freeze([level01, level02, level03, level04]);
export const DEVELOPMENT_LEVELS = Object.freeze([p1EnvironmentTest]);
export const ALL_LEVELS = Object.freeze([...LEVELS, ...DEVELOPMENT_LEVELS]);
export const getLevel = (id) => ALL_LEVELS.find((level) => level.id === id) ?? null;
export const getNextLevel = (id) => {
  const current = getLevel(id);
  return current ? LEVELS.find((level) => level.order === current.order + 1) ?? null : null;
};
