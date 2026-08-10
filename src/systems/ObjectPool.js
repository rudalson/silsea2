export class ObjectPool {
  constructor({ create, activate, deactivate, destroy, maxSize = 24 }) {
    this.createObject = create;
    this.activateObject = activate;
    this.deactivateObject = deactivate;
    this.destroyObject = destroy;
    this.maxSize = maxSize;
    this.entries = [];
    this.createdCount = 0;
    this.acquireCount = 0;
    this.releaseCount = 0;
    this.rejectedCount = 0;
    this.peakActiveCount = 0;
    this.destroyed = false;
  }

  acquire(data = {}) {
    if (this.destroyed) {
      this.rejectedCount += 1;
      return null;
    }

    let entry = this.entries.find((candidate) => !candidate.poolActive);
    if (!entry && this.entries.length < this.maxSize) {
      entry = this.createObject();
      entry.poolActive = false;
      this.entries.push(entry);
      this.createdCount += 1;
    }
    if (!entry) {
      this.rejectedCount += 1;
      return null;
    }
    entry.poolActive = true;
    this.activateObject(entry, data);
    this.acquireCount += 1;
    this.peakActiveCount = Math.max(this.peakActiveCount, this.activeCount);
    return entry;
  }

  release(entry) {
    if (!entry?.poolActive) return;
    entry.poolActive = false;
    this.deactivateObject(entry);
    this.releaseCount += 1;
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

  getSnapshot() {
    const activeCount = this.activeCount;
    return {
      maxSize: this.maxSize,
      size: this.entries.length,
      activeCount,
      inactiveCount: this.entries.length - activeCount,
      createdCount: this.createdCount,
      acquireCount: this.acquireCount,
      releaseCount: this.releaseCount,
      rejectedCount: this.rejectedCount,
      peakActiveCount: this.peakActiveCount,
      destroyed: this.destroyed
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.releaseAll();
    for (const entry of this.entries) this.destroyObject?.(entry);
    this.entries.length = 0;
    this.destroyed = true;
  }
}
