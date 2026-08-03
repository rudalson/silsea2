export const LEVEL_SCHEMA_VERSION = 1;

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

export function assertLevelShape(level) {
  for (const field of REQUIRED_LEVEL_FIELDS) {
    if (level[field] === undefined || level[field] === null) {
      throw new Error(`[${level.id ?? "unknown"}] 필수 필드 누락: ${field}`);
    }
  }

  if (level.schemaVersion !== LEVEL_SCHEMA_VERSION) {
    throw new Error(`[${level.id}] 지원하지 않는 schemaVersion: ${level.schemaVersion}`);
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

