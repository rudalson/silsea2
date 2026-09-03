export const LEVEL_SCHEMA_VERSION = 2;
export const SUPPORTED_LEVEL_SCHEMA_VERSIONS = Object.freeze([1, LEVEL_SCHEMA_VERSION]);

export const REQUIRED_LEVEL_FIELDS = Object.freeze([
  "schemaVersion",
  "id",
  "name",
  "order",
  "assets",
  "world",
  "player",
  "sections",
  "objectives"
]);

export const REQUIRED_ASSET_GROUPS = Object.freeze(["tilemap", "tilemapKey", "tileset", "backgrounds", "bgm"]);

export const getProgressionDirection = (level) => level?.progression?.direction === "left" ? "left" : "right";
export const getProgressionSign = (level) => getProgressionDirection(level) === "left" ? -1 : 1;
export const hasReachedProgressTrigger = (playerX, triggerX, level) => (
  getProgressionSign(level) > 0 ? playerX >= triggerX : playerX <= triggerX
);
export const getNormalizedProgress = (x, spawnX, level) => Math.max(
  0,
  (Number(x) - Number(spawnX)) * getProgressionSign(level)
);
export const getCameraLookAheadTarget = (velocityX, distance, deadzone = 35) => (
  Math.abs(Number(velocityX)) > deadzone ? -Math.sign(Number(velocityX)) * Number(distance) : 0
);

export function normalizeLevelDefinition(level) {
  if (!level || typeof level !== "object") return level;
  const direction = getProgressionDirection(level);
  return {
    ...level,
    progression: { ...(level.progression ?? {}), direction },
    exit: {
      x: level.world?.width - 180,
      enterFrom: direction,
      ...(level.exit ?? {})
    },
    environment: level.environment ?? {},
    secrets: level.secrets ?? []
  };
}

export function assertLevelShape(level) {
  for (const field of REQUIRED_LEVEL_FIELDS) {
    if (level[field] === undefined || level[field] === null) {
      throw new Error(`[${level.id ?? "unknown"}] 필수 필드 누락: ${field}`);
    }
  }

  if (!SUPPORTED_LEVEL_SCHEMA_VERSIONS.includes(level.schemaVersion)) {
    throw new Error(`[${level.id}] 지원하지 않는 schemaVersion: ${level.schemaVersion}`);
  }

  if (level.schemaVersion === LEVEL_SCHEMA_VERSION) {
    if (!["left", "right"].includes(level.progression?.direction)) {
      throw new Error(`[${level.id}] progression.direction은 left 또는 right여야 합니다.`);
    }
    if (!Number.isFinite(Number(level.exit?.x)) || !["left", "right"].includes(level.exit?.enterFrom)) {
      throw new Error(`[${level.id}] version 2 exit.x와 exit.enterFrom이 필요합니다.`);
    }
    if (!level.environment || typeof level.environment !== "object" || Array.isArray(level.environment)) {
      throw new Error(`[${level.id}] version 2 environment는 객체여야 합니다.`);
    }
  }

  for (const field of REQUIRED_ASSET_GROUPS) {
    if (level.assets[field] === undefined || level.assets[field] === null) {
      throw new Error(`[${level.id}] assets 필수 필드 누락: ${field}`);
    }
  }

  if (!Array.isArray(level.sections) || level.sections.length === 0) {
    throw new Error(`[${level.id}] sections는 비어 있지 않은 배열이어야 합니다.`);
  }

  if (!Array.isArray(level.objectives.required)) {
    throw new Error(`[${level.id}] objectives.required는 배열이어야 합니다.`);
  }

  return true;
}
