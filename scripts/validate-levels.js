import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import manifest from "../assets/manifest.json" with { type: "json" };
import { BOSS_PATTERNS } from "../src/data/bossPatterns.js";
import { ENEMY_TYPES } from "../src/data/enemies.js";
import { HAZARD_TYPES, ITEM_TYPES } from "../src/data/items.js";
import { ALL_LEVELS, LEVELS } from "../src/data/levels/index.js";
import { assertLevelShape, normalizeLevelDefinition } from "../src/data/schema/levelSchema.js";
import { OBJECTIVE_TYPES } from "../src/systems/ObjectiveManager.js";

const errors = [];
const manifestKeys = new Set(manifest.assets.map((asset) => asset.key));
const ids = new Set();
const orders = new Set();

const fail = (level, message) => errors.push(`[${level.id ?? "unknown"}] ${message}`);
const inWorld = (level, x, y = 0) => x >= 0 && x <= level.world.width && y >= 0 && y <= level.world.height;
const isPositiveNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
const inRange = (value, min, max) => Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max;

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

for (const sourceLevel of ALL_LEVELS) {
  let level = sourceLevel;
  try {
    assertLevelShape(sourceLevel);
    level = normalizeLevelDefinition(sourceLevel);
  } catch (error) {
    fail(sourceLevel, error.message);
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

  if (!inWorld(level, level.exit.x, level.exit.y ?? level.player.spawn.y)) fail(level, "exit 좌표가 world 밖");
  if (level.progression.direction === "left" && level.player.spawn.x <= level.exit.x) {
    fail(level, "좌향 레벨은 player.spawn.x가 exit.x보다 커야 함");
  }
  if (level.progression.direction === "right" && level.player.spawn.x >= level.exit.x) {
    fail(level, "우향 레벨은 player.spawn.x가 exit.x보다 작아야 함");
  }

  const tsunami = level.environment.tsunami;
  if (tsunami) {
    if (tsunami.direction !== level.progression.direction) fail(level, "쓰나미 방향과 진행 방향이 다름");
    for (const field of ["firstWarning", "telegraph", "speedMultiplier", "duration", "shelterGrace", "damage", "respawnGrace"]) {
      if (!isPositiveNumber(tsunami[field])) fail(level, `tsunami.${field}는 양수여야 함`);
    }
    if (!isPositiveNumber(tsunami.interval?.min) || Number(tsunami.interval?.max) < Number(tsunami.interval?.min)) {
      fail(level, "tsunami.interval은 양수이며 max가 min 이상이어야 함");
    }
    const shelterIds = new Set();
    for (const shelter of tsunami.shelters ?? []) {
      if (!shelter.id || shelterIds.has(shelter.id)) fail(level, `쓰나미 대피처 id 누락/중복: ${shelter.id ?? "unknown"}`);
      shelterIds.add(shelter.id);
      if (!(shelter.xStart < shelter.xEnd && shelter.yTop < shelter.yBottom)) {
        fail(level, `쓰나미 대피처 ${shelter.id} 범위가 잘못됨`);
      }
      if (!inWorld(level, shelter.xStart, shelter.yTop) || !inWorld(level, shelter.xEnd, shelter.yBottom)) {
        fail(level, `쓰나미 대피처 ${shelter.id}가 world 밖`);
      }
    }
  }

  const waterZones = level.environment.waterZones ?? [];
  if (waterZones.length && !level.environment.breath) fail(level, "waterZones가 있으면 breath 설정이 필요함");
  const waterIds = new Set();
  for (const zone of waterZones) {
    if (!zone.id || waterIds.has(zone.id)) fail(level, `물 영역 id 누락/중복: ${zone.id ?? "unknown"}`);
    waterIds.add(zone.id);
    if (!(zone.xStart < zone.xEnd && zone.surfaceY < zone.bottomY)) fail(level, `물 영역 ${zone.id} 범위가 잘못됨`);
    if (!inWorld(level, zone.xStart, zone.surfaceY) || !inWorld(level, zone.xEnd, zone.bottomY)) {
      fail(level, `물 영역 ${zone.id}가 world 밖`);
    }
    const maxSwimDistance = 360
      * (level.environment.breath?.underwaterPhysics?.horizontalSpeedMultiplier ?? 0.75)
      * (level.environment.breath?.depleteSeconds ?? 12);
    if (zone.xEnd - zone.xStart > maxSwimDistance) fail(level, `물 영역 ${zone.id}가 한 번의 숨으로 통과할 수 없음`);
    for (const pit of level.hazards.filter((hazard) => hazard.type === "pit")) {
      if (pit.xStart < zone.xEnd && pit.xEnd > zone.xStart) fail(level, `물 영역 ${zone.id} 안에 pit ${pit.id}가 있음`);
    }
  }

  const breath = level.environment.breath;
  if (breath) {
    for (const field of ["depleteSeconds", "refillSeconds", "damageInterval", "surfaceMargin"]) {
      if (!isPositiveNumber(breath[field])) fail(level, `breath.${field}는 양수여야 함`);
    }
    if (!inRange(breath.warningRatio, 0, 1)) fail(level, "breath.warningRatio는 0~1이어야 함");
    for (const field of ["gravityMultiplier", "maxFallSpeed", "horizontalSpeedMultiplier", "strokeCooldown"]) {
      if (!isPositiveNumber(breath.underwaterPhysics?.[field])) fail(level, `breath.underwaterPhysics.${field}는 양수여야 함`);
    }
    if (!(Number(breath.underwaterPhysics?.strokeVelocity) < 0)) fail(level, "수중 strokeVelocity는 음수여야 함");
  }

  const mist = level.environment.mist;
  if (mist) {
    if (!Array.isArray(mist.zones) || mist.zones.length === 0) fail(level, "mist.zones는 비어 있지 않아야 함");
    if (!inRange(mist.reducedDensityMultiplier, 0.4, 0.8)) {
      fail(level, "mist.reducedDensityMultiplier는 0.4~0.8이어야 함");
    }
    if (!inRange(mist.reducedRadiusBonus, 40, 140)) fail(level, "mist.reducedRadiusBonus는 40~140이어야 함");
    const mistZoneIds = new Set();
    let previousMistEnd = -1;
    for (const zone of mist.zones ?? []) {
      if (!zone.id || mistZoneIds.has(zone.id)) fail(level, `안개 영역 id 누락/중복: ${zone.id ?? "unknown"}`);
      mistZoneIds.add(zone.id);
      if (!(zone.xStart < zone.xEnd) || !inWorld(level, zone.xStart) || !inWorld(level, zone.xEnd)) {
        fail(level, `안개 영역 ${zone.id} 범위가 잘못됨`);
      }
      if (zone.xStart < previousMistEnd) fail(level, `안개 영역 ${zone.id}가 앞 영역과 겹침`);
      previousMistEnd = zone.xEnd;
      if (!inRange(zone.density, 0.1, 0.72)) fail(level, `안개 영역 ${zone.id} density는 0.1~0.72여야 함`);
      if (!inRange(zone.visibilityRadius, 240, 540)) {
        fail(level, `안개 영역 ${zone.id} visibilityRadius는 240~540이어야 함`);
      }
    }
    const guideIds = new Set();
    for (const guide of mist.guides ?? []) {
      if (!guide.id || guideIds.has(guide.id)) fail(level, `안개 단서 id 누락/중복: ${guide.id ?? "unknown"}`);
      guideIds.add(guide.id);
      if (!["beacon", "breeze"].includes(guide.kind)) fail(level, `안개 단서 ${guide.id} kind가 잘못됨`);
      if (!inWorld(level, guide.x, guide.y ?? level.player.spawn.y)) fail(level, `안개 단서 ${guide.id}가 world 밖`);
    }
    for (const zone of mist.zones ?? []) {
      const guideKinds = new Set((mist.guides ?? [])
        .filter(({ x }) => x >= zone.xStart && x < zone.xEnd)
        .map(({ kind }) => kind));
      if (!guideKinds.has("beacon") || !guideKinds.has("breeze")) {
        fail(level, `안개 영역 ${zone.id}에 빛 기둥·바람 화살표 두 단서가 모두 필요함`);
      }
    }
  }

  const easyEnvironment = level.difficulty?.easyMode?.environment ?? {};
  const easyRanges = [
    [easyEnvironment.tsunami?.firstWarningMultiplier, 1, 1.5, "tsunami.firstWarningMultiplier"],
    [easyEnvironment.tsunami?.intervalMultiplier, 1, 1.6, "tsunami.intervalMultiplier"],
    [easyEnvironment.tsunami?.telegraphMultiplier, 1, 2, "tsunami.telegraphMultiplier"],
    [easyEnvironment.tsunami?.speedMultiplier, 0.8, 1, "tsunami.speedMultiplier"],
    [easyEnvironment.breath?.drainMultiplier, 0.6, 1, "breath.drainMultiplier"],
    [easyEnvironment.breath?.refillMultiplier, 1, 1.5, "breath.refillMultiplier"],
    [easyEnvironment.breath?.damageIntervalMultiplier, 1, 1.6, "breath.damageIntervalMultiplier"],
    [easyEnvironment.mist?.densityMultiplier, 0.65, 1, "mist.densityMultiplier"],
    [easyEnvironment.mist?.radiusMultiplier, 1, 1.35, "mist.radiusMultiplier"],
    [easyEnvironment.lasers?.cycleMultiplier, 1, 1.6, "lasers.cycleMultiplier"],
    [easyEnvironment.projectiles?.speedMultiplier, 0.7, 1, "projectiles.speedMultiplier"]
  ];
  for (const [value, min, max, field] of easyRanges) {
    if (value !== undefined && !inRange(value, min, max)) fail(level, `easyMode ${field}가 ${min}~${max} 범위 밖`);
  }

  const laserIds = new Set((level.environment.lasers ?? []).map(({ id }) => id));
  for (const laser of level.environment.lasers ?? []) {
    if (!laser.id || !laser.switchId) fail(level, "laser id와 switchId가 필요함");
    if (laser.switchId && !laserIds.has(laser.switchId)) fail(level, `laser ${laser.id}의 switchId가 같은 레벨에 없음`);
  }

  for (const key of assetKeys(level.assets)) {
    if (!manifestKeys.has(key)) fail(level, `manifest에 없는 asset key: ${key}`);
  }

  const decorationIds = new Set();
  for (const decoration of level.decorations ?? []) {
    if (!decoration.id || decorationIds.has(decoration.id)) {
      fail(level, `장식 id 누락/중복: ${decoration.id ?? "unknown"}`);
    }
    decorationIds.add(decoration.id);
    const key = level.assets.decorations?.[decoration.asset];
    if (!key || !manifestKeys.has(key)) fail(level, `장식 ${decoration.id}의 asset 별칭이 manifest에 없음`);
    if (!inWorld(level, decoration.x, decoration.y)) fail(level, `장식 ${decoration.id} 좌표가 world 밖`);
    if (!isPositiveNumber(decoration.width) || !isPositiveNumber(decoration.height)) {
      fail(level, `장식 ${decoration.id} 크기는 양수여야 함`);
    }
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
  if (!hasFloorAt(terrain, level.exit.x, level.exit.y ?? level.player.spawn.y)) fail(level, "exit 아래에 바닥이 없음");
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
    if (level.environment.mist) {
      const routePlatforms = terrain
        .filter((object) => object.type === "platform" && object.x < pit.xEnd && object.x + object.width > pit.xStart)
        .sort((left, right) => left.x - right.x);
      let reachableX = pit.xStart;
      for (const platform of routePlatforms) {
        if (platform.x - reachableX > 224) fail(level, `안개 pit ${pit.id}의 발판 사이가 224px보다 멂`);
        reachableX = Math.max(reachableX, platform.x + platform.width);
      }
      if (pit.xEnd - reachableX > 224) fail(level, `안개 pit ${pit.id}의 마지막 착지 간격이 224px보다 멂`);
    }
  }
  for (const shelter of level.environment.tsunami?.shelters ?? []) {
    const centerX = (shelter.xStart + shelter.xEnd) / 2;
    if (!hasFloorAt(terrain, centerX, shelter.yBottom)) fail(level, `대피처 ${shelter.id} 아래에 충돌 지형이 없음`);
  }
}

if (errors.length) {
  console.error(`레벨 검증 실패 (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`레벨 검증 통과: 플레이 ${LEVELS.length}개·개발 시험 ${ALL_LEVELS.length - LEVELS.length}개, ${manifestKeys.size}개 manifest 키`);
