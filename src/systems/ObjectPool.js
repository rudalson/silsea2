export class ObjectPool {
  constructor({ create, activate, deactivate, destroy, maxSize = 24 }) {
    this.createObject = create;
    this.activateObject = activate;
    this.deactivateObject = deactivate;
    this.destroyObject = destroy;
    this.maxSize = maxSize;
    this.entries = [];
  }

  acquire(data = {}) {
    let entry = this.entries.find((candidate) => !candidate.poolActive);
    if (!entry && this.entries.length < this.maxSize) {
      entry = this.createObject();
      entry.poolActive = false;
      this.entries.push(entry);
    }
    if (!entry) return null;
    entry.poolActive = true;
    this.activateObject(entry, data);
    return entry;
  }

  release(entry) {
    if (!entry?.poolActive) return;
    entry.poolActive = false;
    this.deactivateObject(entry);
  }

  releaseAll() {
    for (const entry of this.entries) this.release(entry);
  }

  forEachActive(callback) {
    for (const entry of this.entries) {
      if (entry.poolActive) callback(entry);
    }
  }

  get activeCount() {
    return this.entries.filter((entry) => entry.poolActive).length;
  }

  destroy() {
    this.releaseAll();
    for (const entry of this.entries) this.destroyObject?.(entry);
    this.entries.length = 0;
  }
}
