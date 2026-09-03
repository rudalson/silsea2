import { assertLevelShape, normalizeLevelDefinition } from "../data/schema/levelSchema.js";
import { createRuntimeLevel, getDifficultySettings } from "./DifficultyManager.js";

export const HOT_RELOAD_STATES = Object.freeze({
  IDLE: "idle",
  READY: "ready",
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
  DISPOSED: "disposed"
});

const stableJson = (value) => JSON.stringify(value ?? null);
const isPositiveFinite = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

export function prepareHotReloadLevel(source, {
  expectedId,
  currentLevel,
  easyMode = false,
  hasTilemap = () => true
} = {}) {
  assertLevelShape(source);
  if (source.id !== expectedId) throw new Error(`레벨 id 불일치: ${source.id} !== ${expectedId}`);
  if (!isPositiveFinite(source.world?.width) || !isPositiveFinite(source.world?.height)) {
    throw new Error("world.width와 world.height는 양수여야 합니다.");
  }
  if (!source.sections.every(({ xStart, xEnd }) => (
    Number.isFinite(Number(xStart))
    && Number.isFinite(Number(xEnd))
    && xStart >= 0
    && xStart < xEnd
    && xEnd <= source.world.width
  ))) throw new Error("section 범위가 world 안의 양수 구간이어야 합니다.");
  if (stableJson(source.assets) !== stableJson(currentLevel?.assets)) {
    throw new Error("에셋 키 변경은 전체 레벨 재시작 후 적용할 수 있습니다.");
  }
  if (!hasTilemap(source.assets.tilemapKey)) {
    throw new Error(`로드되지 않은 tilemapKey: ${source.assets.tilemapKey}`);
  }

  const normalized = normalizeLevelDefinition(source);
  return {
    source: normalized,
    difficulty: getDifficultySettings(normalized, easyMode),
    level: createRuntimeLevel(normalized, easyMode)
  };
}

export class LevelHotReloadController {
  constructor({ load, prepare, apply, onState = () => {} }) {
    this.load = load;
    this.prepare = prepare;
    this.apply = apply;
    this.onState = onState;
    this.state = HOT_RELOAD_STATES.IDLE;
    this.count = 0;
    this.busy = false;
    this.disposed = false;
    this.lastError = null;
  }

  markReady(message = "새 레벨 데이터가 준비되었습니다.") {
    if (this.disposed || this.busy) return false;
    this.setState(HOT_RELOAD_STATES.READY, message);
    return true;
  }

  async reload() {
    if (this.disposed || this.busy) return false;
    this.busy = true;
    this.lastError = null;
    this.setState(HOT_RELOAD_STATES.LOADING, "레벨 데이터를 다시 읽는 중…");
    try {
      const source = await this.load();
      const prepared = await this.prepare(source);
      await this.apply(prepared);
      this.count += 1;
      this.setState(HOT_RELOAD_STATES.SUCCESS, `재로드 완료 · ${this.count}회`);
      return true;
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      this.setState(HOT_RELOAD_STATES.ERROR, `적용하지 않음 · ${this.lastError.message}`);
      return false;
    } finally {
      this.busy = false;
    }
  }

  getSnapshot() {
    return {
      state: this.state,
      count: this.count,
      busy: this.busy,
      disposed: this.disposed,
      error: this.lastError?.message ?? null
    };
  }

  dispose() {
    this.disposed = true;
    this.busy = false;
    this.setState(HOT_RELOAD_STATES.DISPOSED, "핫 리로드 종료");
  }

  setState(state, message) {
    this.state = state;
    this.onState({ ...this.getSnapshot(), message });
  }
}
