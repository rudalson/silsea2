import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import manifest from "../assets/manifest.json" with { type: "json" };
import { BOSS_PATTERNS } from "../src/data/bossPatterns.js";
import { ENEMY_TYPES } from "../src/data/enemies.js";
import { HAZARD_TYPES, ITEM_TYPES } from "../src/data/items.js";
import { LEVELS } from "../src/data/levels/index.js";
import { assertLevelShape } from "../src/data/schema/levelSchema.js";
import { OBJECTIVE_TYPES } from "../src/systems/ObjectiveManager.js";

const errors = [];
const manifestKeys = new Set(manifest.assets.map((asset) => asset.key));
const ids = new Set();
const orders = new Set();

const fail = (level, message) => errors.push(`[${level.id ?? "unknown"}] ${message}`);
const inWorld = (level, x, y = 0) => x >= 0 && x <= level.world.width && y >= 0 && y <= level.world.height;
const isPositiveNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

const assetKeys = (value, parentKey = "") => {
  if (typeof value === "string") {
    if (["tilemap", "tilemapKey"].includes(parentKey)) return [];
    return [value];
  }
  if (Array.isArray(value)) return value.flatMap((item) => assetKeys(item, parentKey));
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => assetKeys(child, key));
};

const readTilemap = async (level) => {
  try {
    const path = level.assets.tilemap.startsWith("file:")
      ? fileURLToPath(level.assets.tilemap)
      : fileURLToPath(new URL(level.assets.tilemap, import.meta.url));
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    fail(level, `tilemap을 읽을 수 없음: ${error.message}`);
    return null;
  }
};

const hasFloorAt = (terrain, x, y, tolerance = 72) => terrain.some(
  (object) => x >= object.x && x <= object.x + object.width && Math.abs(object.y - y) <= tolerance
);

for (const level of LEVELS) {
  try {
    assertLevelShape(level);
  } catch (error) {
    fail(level, error.message);
    continue;
  }

  if (ids.has(level.id)) fail(level, `중복 id: ${level.id}`);
  if (orders.has(level.order)) fail(level, `중복 order: ${level.order}`);
  ids.add(level.id);
  orders.add(level.order);

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(level.id)) fail(level, "id는 kebab-case여야 함");
  if (!Number.isInteger(level.order) || level.order < 1) fail(level, "order는 양의 정수여야 함");
  if (level.world.tileSize !== 64) fail(level, "tileSize는 64여야 함");

  let expectedStart = 0;
  let bossCount = 0;
  for (const section of level.sections) {
    if (section.xStart !== expectedStart) fail(level, `section ${section.id} 앞에 빈 구간/겹침 존재`);
    if (section.xEnd <= section.xStart) fail(level, `section ${section.id}의 범위가 역방향`);
    expectedStart = section.xEnd;
    if (section.type === "boss") {
      bossCount += 1;
      if (!section.boss?.key || !section.boss?.hp || !Array.isArray(section.boss?.phases)) {
        fail(level, `boss section ${section.id} 필드 누락`);
      }
      if (section.boss?.key && !ENEMY_TYPES.includes(section.boss.key)) fail(level, `미등록 boss key: ${section.boss.key}`);
      if (section.boss?.hp !== section.boss?.phases?.length) fail(level, `boss ${section.id} hp와 phases 수가 다름`);
      const registeredPatterns = BOSS_PATTERNS[section.boss?.key];
      if (registeredPatterns) {
        const patternIds = Object.values(registeredPatterns).map(({ id }) => id);
        for (const phaseId of section.boss.phases) {
          if (!patternIds.includes(phaseId)) fail(level, `boss ${section.id} 미등록 phase pattern: ${phaseId}`);
        }
      }
    }
    if (!level.assets.backgrounds[section.mood]) fail(level, `section ${section.id}의 mood가 assets.backgrounds에 없음`);
  }
  if (expectedStart !== level.world.width) fail(level, "sections가 world.width 전체를 덮지 않음");
  if (bossCount > 1) fail(level, "boss section은 최대 1개");

  for (const key of assetKeys(level.assets)) {
    if (!manifestKeys.has(key)) fail(level, `manifest에 없는 asset key: ${key}`);
  }

  for (const enemy of level.enemies) {
    if (!ENEMY_TYPES.includes(enemy.type)) fail(level, `미등록 enemy type: ${enemy.type}`);
    if (!inWorld(level, enemy.x, enemy.y)) fail(level, `enemy ${enemy.id} 좌표가 world 밖`);
    if (enemy.activationDelayMs !== undefined && !(Number(enemy.activationDelayMs) >= 0)) {
      fail(level, `enemy ${enemy.id} activationDelayMs는 0 이상이어야 함`);
    }
    for (const field of ["telegraphMs", "cooldownMs", "diveDurationMs", "stunnedMs"]) {
      if (enemy[field] !== undefined && !isPositiveNumber(enemy[field])) {
        fail(level, `enemy ${enemy.id} ${field}는 양수여야 함`);
      }
    }
  }
  for (const item of level.items) {
    if (!ITEM_TYPES.includes(item.type)) fail(level, `미등록 item type: ${item.type}`);
    if (!inWorld(level, item.x, item.y)) fail(level, `item ${item.id} 좌표가 world 밖`);
  }
  for (const hazard of level.hazards) {
    if (!HAZARD_TYPES.includes(hazard.type)) fail(level, `미등록 hazard type: ${hazard.type}`);
    const x = hazard.x ?? hazard.xStart;
    if (!inWorld(level, x, hazard.y ?? 0)) fail(level, `hazard ${hazard.id} 좌표가 world 밖`);
    if (hazard.xEnd !== undefined && hazard.xEnd <= hazard.xStart) fail(level, `hazard ${hazard.id} 범위가 역방향`);
  }

  const mechanicIds = new Set();
  const mechanics = level.terrainMechanics ?? {};
  const validateMechanicBounds = (mechanic, group) => {
    if (!mechanic.id) fail(level, `${group} 장치 id 누락`);
    if (mechanicIds.has(mechanic.id)) fail(level, `중복 terrain mechanic id: ${mechanic.id}`);
    mechanicIds.add(mechanic.id);
    if (!isPositiveNumber(mechanic.width) || !isPositiveNumber(mechanic.height)) {
      fail(level, `${group} ${mechanic.id} 크기는 양수여야 함`);
      return;
    }
    const distanceX = mechanic.axis === "x" ? Number(mechanic.distance ?? 0) : 0;
    const distanceY = mechanic.axis === "y" ? Number(mechanic.distance ?? 0) : 0;
    const minX = Math.min(mechanic.x, mechanic.x + distanceX);
    const minY = Math.min(mechanic.y, mechanic.y + distanceY);
    const maxX = Math.max(mechanic.x, mechanic.x + distanceX) + mechanic.width;
    const maxY = Math.max(mechanic.y, mechanic.y + distanceY) + mechanic.height;
    if (!inWorld(level, minX, minY) || !inWorld(level, maxX, maxY)) {
      fail(level, `${group} ${mechanic.id} 이동 범위가 world 밖`);
    }
  };

  for (const platform of mechanics.movingPlatforms ?? []) {
    validateMechanicBounds(platform, "moving platform");
    if (!["x", "y"].includes(platform.axis)) fail(level, `moving platform ${platform.id} axis는 x 또는 y여야 함`);
    if (!Number.isFinite(Number(platform.distance)) || Number(platform.distance) === 0) {
      fail(level, `moving platform ${platform.id} distance는 0이 아니어야 함`);
    }
    if (!isPositiveNumber(platform.speed)) fail(level, `moving platform ${platform.id} speed는 양수여야 함`);
  }
  for (const updraft of mechanics.updrafts ?? []) {
    validateMechanicBounds(updraft, "updraft");
    if (!isPositiveNumber(updraft.liftSpeed)) fail(level, `updraft ${updraft.id} liftSpeed는 양수여야 함`);
    if (!isPositiveNumber(updraft.liftAcceleration)) fail(level, `updraft ${updraft.id} liftAcceleration은 양수여야 함`);
  }
  for (const platform of mechanics.crumblePlatforms ?? []) {
    validateMechanicBounds(platform, "crumble platform");
    if (!isPositiveNumber(platform.crumbleDelayMs)) {
      fail(level, `crumble platform ${platform.id} crumbleDelayMs는 양수여야 함`);
    }
    if (!isPositiveNumber(platform.respawnMs)) fail(level, `crumble platform ${platform.id} respawnMs는 양수여야 함`);
  }

  const easyTerrain = level.difficulty?.easyMode?.terrainMechanics;
  if (easyTerrain) {
    const movingMultiplier = Number(easyTerrain.movingSpeedMultiplier);
    const crumbleMultiplier = Number(easyTerrain.crumbleDelayMultiplier);
    if (!(movingMultiplier > 0 && movingMultiplier <= 1)) {
      fail(level, "easyMode movingSpeedMultiplier는 0보다 크고 1 이하여야 함");
    }
    if (!(crumbleMultiplier >= 1)) fail(level, "easyMode crumbleDelayMultiplier는 1 이상이어야 함");
  }

  for (const objective of [...level.objectives.required, ...(level.objectives.optional ?? [])]) {
    if (!OBJECTIVE_TYPES.includes(objective.type)) fail(level, `미등록 objective type: ${objective.type}`);
  }

  const serialized = JSON.stringify(level);
  if (serialized.includes("references/")) fail(level, "레벨 데이터에 references 경로가 포함됨");

  const tilemap = await readTilemap(level);
  if (!tilemap) continue;
  if (tilemap.width * tilemap.tilewidth !== level.world.width) fail(level, "tilemap 너비와 world.width 불일치");
  if (tilemap.height * tilemap.tileheight !== level.world.height) fail(level, "tilemap 높이와 world.height 불일치");
  const terrain = tilemap.layers.find((layer) => layer.type === "objectgroup" && layer.name === "terrain")?.objects ?? [];
  if (terrain.length === 0) fail(level, "terrain object layer가 비어 있음");
  if (!hasFloorAt(terrain, level.player.spawn.x, level.player.spawn.y)) fail(level, "player spawn 아래에 바닥이 없음");
  for (const checkpoint of level.checkpoints) {
    if (!inWorld(level, checkpoint.x, checkpoint.y)) fail(level, `checkpoint ${checkpoint.id} 좌표가 world 밖`);
    if (!hasFloorAt(terrain, checkpoint.x, checkpoint.y)) fail(level, `checkpoint ${checkpoint.id} 아래에 바닥이 없음`);
    if (checkpoint.restoresHealth !== undefined && typeof checkpoint.restoresHealth !== "boolean") {
      fail(level, `checkpoint ${checkpoint.id} restoresHealth는 boolean이어야 함`);
    }
  }
  for (const pit of level.hazards.filter((hazard) => hazard.type === "pit")) {
    if (pit.respawnX !== undefined && !hasFloorAt(terrain, pit.respawnX, level.player.spawn.y)) {
      fail(level, `pit ${pit.id} respawnX 아래에 바닥이 없음`);
    }
  }
}

if (errors.length) {
  console.error(`레벨 검증 실패 (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`레벨 검증 통과: ${LEVELS.length}개 레벨, ${manifestKeys.size}개 manifest 키`);
