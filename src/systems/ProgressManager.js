const STORAGE_KEY = "silsea:progress:v1";

const EMPTY_PROGRESS = Object.freeze({ cleared: false, bestScore: 0, achieved: [] });

const normalizeProgress = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...EMPTY_PROGRESS };
  const bestScore = Number(value.bestScore);
  return {
    cleared: Boolean(value.cleared),
    bestScore: Number.isFinite(bestScore) ? Math.max(0, bestScore) : 0,
    achieved: Array.isArray(value.achieved)
      ? [...new Set(value.achieved.filter((entry) => typeof entry === "string"))]
      : []
  };
};

export class ProgressManager {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.memory = {};
    this.data = this.load();
  }

  load() {
    try {
      const value = this.storage?.getItem(STORAGE_KEY);
      const parsed = value ? JSON.parse(value) : {};
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      return Object.fromEntries(
        Object.entries(parsed).map(([levelId, progress]) => [levelId, normalizeProgress(progress)])
      );
    } catch {
      return { ...this.memory };
    }
  }

  get(levelId) {
    return normalizeProgress(this.data[levelId]);
  }

  isUnlocked(level, levels = []) {
    if (level?.order === 1) return true;
    const previous = levels.find((candidate) => candidate.order === level?.order - 1);
    return Boolean(previous && this.get(previous.id).cleared);
  }

  complete(levelId, score = 0, achieved = []) {
    const previous = this.get(levelId);
    const nextScore = Number(score);
    const nextAchieved = Array.isArray(achieved) ? achieved : [];
    this.data[levelId] = {
      cleared: true,
      bestScore: Math.max(previous.bestScore, Number.isFinite(nextScore) ? nextScore : 0),
      achieved: [...new Set([
        ...previous.achieved,
        ...nextAchieved.filter((entry) => typeof entry === "string")
      ])]
    };
    this.memory = { ...this.data };
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Memory state remains available when storage is blocked.
    }
    return this.data[levelId];
  }
}

export const progressManager = new ProgressManager();
