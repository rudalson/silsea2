export const DISPLAY_MODES = Object.freeze({
  ORIGINAL: "original",
  FULL: "full"
});

export const DISPLAY_MODE_STORAGE_KEY = "silsea:display-mode";

export function normalizeDisplayMode(mode) {
  return mode === DISPLAY_MODES.FULL ? DISPLAY_MODES.FULL : DISPLAY_MODES.ORIGINAL;
}

function resolveStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function getInitialDisplayMode({ search = globalThis.location?.search ?? "", storage } = {}) {
  const requested = new URLSearchParams(search).get("display");
  if (requested === DISPLAY_MODES.ORIGINAL || requested === DISPLAY_MODES.FULL) return requested;

  try {
    return normalizeDisplayMode(resolveStorage(storage)?.getItem(DISPLAY_MODE_STORAGE_KEY));
  } catch {
    return DISPLAY_MODES.ORIGINAL;
  }
}

export function applyDisplayMode(mode, {
  container = globalThis.document?.querySelector?.("#game-container"),
  game = null,
  storage,
  persist = true
} = {}) {
  const normalized = normalizeDisplayMode(mode);
  if (container) container.dataset.displayMode = normalized;

  if (persist) {
    try {
      resolveStorage(storage)?.setItem(DISPLAY_MODE_STORAGE_KEY, normalized);
    } catch {
      // 저장소가 차단된 브라우저에서도 현재 실행 중인 화면 전환은 유지한다.
    }
  }

  game?.scale?.refresh?.();
  return normalized;
}
