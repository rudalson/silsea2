import level01 from "./level-01.js";
import level02 from "./level-02.js";
import level03 from "./level-03.js";
import level04 from "./level-04.js";
import level05 from "./level-05.js";
import level06 from "./level-06.js";
import p1EnvironmentTest from "./p1-environment-test.js";
import { p9BossTestLeft, p9BossTestRight } from "./p9-boss-test.js";

const hotLevelOverrides = new Map();
const hotLevelRevisions = new Map();
const hotLevelListeners = new Set();

const acceptHotLevel = (module) => {
  const level = module?.default;
  if (!level?.id) return;
  hotLevelOverrides.set(level.id, level);
  const revision = (hotLevelRevisions.get(level.id) ?? 0) + 1;
  hotLevelRevisions.set(level.id, revision);
  for (const listener of hotLevelListeners) listener({ id: level.id, level, revision });
};

if (import.meta.hot) {
  import.meta.hot.accept([
    "./level-01.js",
    "./level-02.js",
    "./level-03.js",
    "./level-04.js",
    "./level-05.js",
    "./level-06.js"
  ], (modules) => modules.forEach(acceptHotLevel));
}

export const LEVELS = Object.freeze([level01, level02, level03, level04, level05, level06]);
export const DEVELOPMENT_LEVELS = Object.freeze([p1EnvironmentTest, p9BossTestRight, p9BossTestLeft]);
export const ALL_LEVELS = Object.freeze([...LEVELS, ...DEVELOPMENT_LEVELS]);
export const getLevel = (id) => hotLevelOverrides.get(id) ?? ALL_LEVELS.find((level) => level.id === id) ?? null;
export const isLevelHotReloadAvailable = () => Boolean(import.meta.hot);
export const getLevelHotRevision = (id) => hotLevelRevisions.get(id) ?? 0;
export const subscribeLevelHotUpdates = (listener) => {
  if (!import.meta.hot || typeof listener !== "function") return () => {};
  hotLevelListeners.add(listener);
  return () => hotLevelListeners.delete(listener);
};
export const getNextLevel = (id) => {
  const current = getLevel(id);
  const next = current ? LEVELS.find((level) => level.order === current.order + 1) ?? null : null;
  return next ? getLevel(next.id) : null;
};
