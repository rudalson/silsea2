const STORAGE_KEY = "silsea:progress:v1";

export class ProgressManager {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.memory = {};
    this.data = this.load();
  }

  load() {
    try {
      const value = this.storage?.getItem(STORAGE_KEY);
      return value ? JSON.parse(value) : {};
    } catch {
      return { ...this.memory };
    }
  }

  get(levelId) {
    return this.data[levelId] ?? { cleared: false, bestScore: 0, achieved: [] };
  }

  complete(levelId, score = 0, achieved = []) {
    const previous = this.get(levelId);
    this.data[levelId] = {
      cleared: true,
      bestScore: Math.max(previous.bestScore, score),
      achieved: [...new Set([...previous.achieved, ...achieved])]
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

