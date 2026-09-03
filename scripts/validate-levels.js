import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import manifest from "../assets/manifest.json" with { type: "json" };
import {
  getBossDefinition,
  resolveBossSpawnX
} from "../src/data/bossDefinitions.js";
import { BOSS_BEHAVIOR_TYPES } from "../src/data/bossBehaviorTypes.js";
import { ENEMY_TYPES } from "../src/data/enemies.js";
import { getEnemyAnimationSpec } from "../src/data/enemyAnimations.js";
import { ENVIRONMENT_SUSPENSION_TYPES } from "../src/data/environment.js";
import { HAZARD_TYPES, ITEM_TYPES } from "../src/data/items.js";
import { ALL_LEVELS, LEVELS } from "../src/data/levels/index.js";
import { OBJECTIVE_PRESENTATIONS } from "../src/data/objectivePresentation.js";
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
      const definition = getBossDefinition(section.boss?.key);
      if (section.boss?.key && !definition) fail(level, `미등록 boss key: ${section.boss.key}`);
      if (definition && !BOSS_BEHAVIOR_TYPES.includes(definition.behavior)) {
        fail(level, `boss ${section.id} 미등록 behavior: ${definition.behavior}`);
      }
      for (const role of definition?.animationRoles ?? []) {
        if (!getEnemyAnimationSpec(definition.key, role)) {
          fail(level, `boss ${section.id} 애니메이션 역할 누락: ${role}`);
        }
      }
      if (section.boss?.hp !== section.boss?.phases?.length) fail(level, `boss ${section.id} hp와 phases 수가 다름`);
      if (definition) {
        for (const phaseId of section.boss.phases) {
          if (!definition.phaseIds.includes(phaseId)) fail(level, `boss ${section.id} 미등록 phase pattern: ${phaseId}`);
        }
        const spawnX = resolveBossSpawnX(section, level.progression.direction, definition);
        if (!(spawnX >= section.xStart && spawnX < section.xEnd)) {
          fail(level, `boss ${section.id} spawn.x가 section 밖`);
        }
      }
      const suspended = section.boss?.environment?.suspend ?? [];
      if (!Array.isArray(suspended)) fail(level, `boss ${section.id} environment.suspend는 배열이어야 함`);
      for (const type of Array.isArray(suspended) ? suspended : []) {
        if (!ENVIRONMENT_SUSPENSION_TYPES.includes(type)) {
          fail(level, `boss ${section.id} 미지원 환경 정지 항목: ${type}`);
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
    for (const field of ["gravityMultiplier", "maxFallSpeed", "horizontalSpeedMultiplier", "strokeCooldown", "exitAssistHeight"]) {
      if (!isPositiveNumber(breath.underwaterPhysics?.[field])) fail(level, `breath.underwaterPhysics.${field}는 양수여야 함`);
    }
    if (!(Number(breath.underwaterPhysics?.strokeVelocity) < 0)) fail(level, "수중 strokeVelocity는 음수여야 함");
  }

  const breathPointIds = new Set();
  for (const point of level.environment.breathPoints ?? []) {
    if (!point.id || breathPointIds.has(point.id)) fail(level, `호흡 지점 id 누락/중복: ${point.id ?? "unknown"}`);
    breathPointIds.add(point.id);
    const zone = waterZones.find(({ id }) => id === point.zoneId);
    if (!zone) {
      fail(level, `호흡 지점 ${point.id}의 zoneId가 물 영역에 없음`);
      continue;
    }
    if (!(point.x >= zone.xStart && point.x <= zone.xEnd)) fail(level, `호흡 지점 ${point.id}가 물 영역 밖`);
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
    [level.difficulty?.easyMode?.boss?.telegraphMultiplier, 1, 2, "boss.telegraphMultiplier"],
    [level.difficulty?.easyMode?.boss?.vulnerabilityMultiplier, 1, 1.6, "boss.vulnerabilityMultiplier"],
    [level.difficulty?.easyMode?.boss?.volleyIntervalMultiplier, 1, 1.6, "boss.volleyIntervalMultiplier"],
    [easyEnvironment.tsunami?.firstWarningMultiplier, 1, 1.5, "tsunami.firstWarningMultiplier"],
    [easyEnvironment.tsunami?.intervalMultiplier, 1, 1.6, "tsunami.intervalMultiplier"],
    [easyEnvironment.tsunami?.telegraphMultiplier, 1, 2, "tsunami.telegraphMultiplier"],
    [easyEnvironment.tsunami?.speedMultiplier, 0.8, 1, "tsunami.speedMultiplier"],
    [easyEnvironment.breath?.drainMultiplier, 0.6, 1, "breath.drainMultiplier"],
    [easyEnvironment.breath?.refillMultiplier, 1, 1.5, "breath.refillMultiplier"],
    [easyEnvironment.breath?.damageIntervalMultiplier, 1, 1.6, "breath.damageIntervalMultiplier"],
    [easyEnvironment.mist?.densityMultiplier, 0.65, 1, "mist.densityMultiplier"],
    [easyEnvironment.mist?.radiusMultiplier, 1, 1.35, "mist.radiusMultiplier"],
    [easyEnvironment.lasers?.warningMultiplier, 1, 1.6, "lasers.warningMultiplier"],
    [easyEnvironment.lasers?.activeMultiplier, 0.75, 1, "lasers.activeMultiplier"],
    [easyEnvironment.lasers?.restMultiplier, 1, 1.8, "lasers.restMultiplier"],
    [easyEnvironment.projectiles?.speedMultiplier, 0.7, 1, "projectiles.speedMultiplier"],
    [easyEnvironment.projectiles?.telegraphMultiplier, 1, 1.5, "projectiles.telegraphMultiplier"],
    [easyEnvironment.projectiles?.cooldownMultiplier, 1, 1.5, "projectiles.cooldownMultiplier"],
    [easyEnvironment.projectiles?.maxActive, 1, 4, "projectiles.maxActive"]
  ];
  for (const [value, min, max, field] of easyRanges) {
    if (value !== undefined && !inRange(value, min, max)) fail(level, `easyMode ${field}가 ${min}~${max} 범위 밖`);
  }

  const laserConfig = level.environment.lasers;
  if (laserConfig) {
    const switchIds = new Set();
    for (const laserSwitch of laserConfig.switches ?? []) {
      if (!laserSwitch.id || switchIds.has(laserSwitch.id)) {
        fail(level, `laser switch id 누락/중복: ${laserSwitch.id ?? "unknown"}`);
      }
      switchIds.add(laserSwitch.id);
      if (!inWorld(level, laserSwitch.x, laserSwitch.y)) fail(level, `laser switch ${laserSwitch.id}가 world 밖`);
    }
    const beamIds = new Set();
    for (const laser of laserConfig.beams ?? []) {
      if (!laser.id || beamIds.has(laser.id) || !laser.switchId) fail(level, "laser id 중복 또는 switchId 누락");
      beamIds.add(laser.id);
      if (!switchIds.has(laser.switchId)) fail(level, `laser ${laser.id}의 switchId가 같은 레벨에 없음`);
      if (!inWorld(level, laser.x, laser.yStart) || !inWorld(level, laser.x, laser.yEnd) || laser.yEnd <= laser.yStart) {
        fail(level, `laser ${laser.id} 범위가 잘못됨`);
      }
      for (const field of ["warningMs", "activeMs", "restMs"]) {
        if (!isPositiveNumber(laser[field])) fail(level, `laser ${laser.id} ${field}는 양수여야 함`);
      }
    }
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
  const itemIds = new Set();
  for (const item of level.items) {
    if (!item.id || itemIds.has(item.id)) fail(level, `item id 누락/중복: ${item.id ?? "unknown"}`);
    itemIds.add(item.id);
    if (!ITEM_TYPES.includes(item.type)) fail(level, `미등록 item type: ${item.type}`);
    if (!inWorld(level, item.x, item.y)) fail(level, `item ${item.id} 좌표가 world 밖`);
  }
  const secretIds = new Set();
  for (const secret of level.secrets ?? []) {
    if (!secret.id || secretIds.has(secret.id)) fail(level, `비밀 공간 id 누락/중복: ${secret.id ?? "unknown"}`);
    secretIds.add(secret.id);
    if (!secret.name) fail(level, `비밀 공간 ${secret.id} 이름 누락`);
    if (!(secret.xStart < secret.xEnd && secret.yTop < secret.yBottom)) {
      fail(level, `비밀 공간 ${secret.id} 범위가 잘못됨`);
    } else if (!inWorld(level, secret.xStart, secret.yTop) || !inWorld(level, secret.xEnd, secret.yBottom)) {
      fail(level, `비밀 공간 ${secret.id}가 world 밖`);
    }
    if (!isPositiveNumber(secret.reward)) fail(level, `비밀 공간 ${secret.id} reward는 양수여야 함`);
    if (!Array.isArray(secret.guideItemIds) || secret.guideItemIds.length === 0) {
      fail(level, `비밀 공간 ${secret.id} 별 단서 누락`);
    }
    for (const guideId of secret.guideItemIds ?? []) {
      const guide = level.items.find(({ id }) => id === guideId);
      if (!guide || !["star", "star_arc"].includes(guide.type)) {
        fail(level, `비밀 공간 ${secret.id} 별 단서 ${guideId}가 없음`);
      }
    }
    const rewardItem = level.items.find(({ id }) => id === secret.rewardItemId);
    if (!rewardItem || rewardItem.type !== "percent_large") {
      fail(level, `비밀 공간 ${secret.id} 대형 퍼센트 보상이 없음`);
    }
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
    if (objective.type === "find_secrets" && (
      !Number.isInteger(objective.count)
      || objective.count < 1
      || objective.count > (level.secrets?.length ?? 0)
    )) fail(level, "find_secrets count가 비밀 공간 수 범위 밖");
  }
  for (const objective of level.objectives.optional ?? []) {
    if (!OBJECTIVE_PRESENTATIONS[objective.type]) {
      fail(level, `선택 목표 ${objective.type} 결과 카드 정의가 없음`);
    }
  }
  const bossSection = level.sections.find(({ type }) => type === "boss");
  if (bossSection) {
    if (!level.objectives.required.some(({ type, target }) => type === "defeat_boss" && target === bossSection.boss.key)) {
      fail(level, `required objective에 defeat_boss:${bossSection.boss.key}가 없음`);
    }
    if (!level.objectives.required.some(({ type }) => type === "reach_gate")) {
      fail(level, "boss level required objective에 reach_gate가 없음");
    }
  }

  const serialized = JSON.stringify(level);
  if (serialized.includes("references/")) fail(level, "레벨 데이터에 references 경로가 포함됨");

  const tilemap = await readTilemap(level);
  if (!tilemap) continue;
  if (tilemap.width * tilemap.tilewidth !== level.world.width) fail(level, "tilemap 너비와 world.width 불일치");
  if (tilemap.height * tilemap.tileheight !== level.world.height) fail(level, "tilemap 높이와 world.height 불일치");
  const terrain = tilemap.layers.find((layer) => layer.type === "objectgroup" && layer.name === "terrain")?.objects ?? [];
  if (tilemap.width * tilemap.tilewidth !== level.world.width) fail(level, "tilemap 폭과 world.width가 다름");
  if (terrain.length === 0) fail(level, "terrain object layer가 비어 있음");
  if (!hasFloorAt(terrain, level.player.spawn.x, level.player.spawn.y)) fail(level, "player spawn 아래에 바닥이 없음");
  if (!hasFloorAt(terrain, level.exit.x, level.exit.y ?? level.player.spawn.y)) fail(level, "exit 아래에 바닥이 없음");

  if (level.id === "level-04") {
    const shift = 2048;
    const hulaSection = level.sections.find(({ id }) => id === "boss_hula");
    if (!hulaSection || hulaSection.xStart !== 0 || hulaSection.xEnd !== shift) fail(level, "P10 훌라후프 보스룸이 0~2048이 아님");
    if (hulaSection?.boss?.key !== "hula_king") fail(level, "P10 boss key가 hula_king이 아님");
    if (!hulaSection?.boss?.environment?.suspend?.includes("tsunami")) fail(level, "P10 보스룸에서 쓰나미가 정지되지 않음");
    if (level.world.width !== 8192 + shift || level.player.spawn.x !== 8000 + shift) fail(level, "P10 world/player 좌표 이동 누락");
    const expectedPoints = [
      [level.checkpoints.find(({ id }) => id === "cp_tsunami_exit")?.x, 1024 + shift, "checkpoint"],
      [level.enemies.find(({ id }) => id === "e_tsunami_hill")?.x, 6480 + shift, "enemy"],
      [level.items.find(({ id }) => id === "tsunami_house_arc_b")?.x, 3376 + shift, "item"],
      [level.hazards.find(({ id }) => id === "tsunami_thorn_high")?.x, 2688 + shift, "hazard"],
      [level.environment.tsunami.shelters.find(({ id }) => id === "shelter_house_a")?.xStart, 4448 + shift, "shelter"],
      [level.cameraCues.find(({ id }) => id === "cue_high_shelter")?.targetX, 896 + shift, "camera cue"],
      [level.difficulty.easyMode.extraCheckpoints.find(({ id }) => id === "cp_easy_high")?.x, 2176 + shift, "easy checkpoint"],
      [terrain.find(({ name }) => name === "high_shelter")?.x, 1536 + shift, "tilemap terrain"]
    ];
    for (const [actual, expected, label] of expectedPoints) {
      if (actual !== expected) fail(level, `P10 ${label} 좌표 이동 누락: ${actual} !== ${expected}`);
    }
  }
  if (level.id === "level-02") {
    const originalWidth = 6144;
    const roomWidth = 2048;
    const randomSection = level.sections.find(({ id }) => id === "boss_random");
    if (!randomSection || randomSection.xStart !== originalWidth || randomSection.xEnd !== originalWidth + roomWidth) {
      fail(level, "P13 랜덤대왕 보스룸이 기존 코스 오른쪽 6144~8192에 있지 않음");
    }
    if (randomSection?.boss?.key !== "random_king") fail(level, "P13 boss key가 random_king이 아님");
    if (level.world.width !== originalWidth + roomWidth || level.exit.x !== 8016) {
      fail(level, "P13 world/exit 확장 누락");
    }
    if (level.checkpoints.find(({ id }) => id === "cp_random_ready")?.restoresHealth !== true) {
      fail(level, "P13 보스 직전 완전 회복 체크포인트가 없음");
    }
    const results = randomSection?.boss?.resultDeck ?? [];
    const requiredResults = ["replay_section", "score_plus", "score_minus", "start_battle"];
    if (results.length !== requiredResults.length || requiredResults.some((result) => !results.includes(result))) {
      fail(level, "P13 결과 덱 4종이 정확히 선언되지 않음");
    }
    if (randomSection?.boss?.maxNonBattle !== 3 || randomSection?.boss?.scoreDelta !== 100) {
      fail(level, "P13 비전투 상한 또는 점수 증감량이 승인값과 다름");
    }
    const courses = randomSection?.boss?.replayCourses ?? [];
    if (courses.length !== 4 || new Set(courses.map(({ id }) => id)).size !== courses.length) {
      fail(level, "P13 안전 재도전 코스가 4개가 아니거나 id가 중복됨");
    }
    for (const course of courses) {
      if (!inWorld(level, course.x, course.y) || !hasFloorAt(terrain, course.x, course.y)) {
        fail(level, `P13 재도전 코스 ${course.id}가 안전 바닥 밖`);
      }
    }
    const anchors = randomSection?.boss?.arenaAnchors ?? [];
    if (anchors.length !== 4 || new Set(anchors.map(({ id }) => id)).size !== anchors.length) {
      fail(level, "P13 전투 위치 앵커가 4개가 아니거나 id가 중복됨");
    }
    for (const anchor of anchors) {
      if (anchor.x < randomSection.xStart + 96
        || anchor.x > randomSection.xEnd - 96
        || anchor.y !== randomSection.boss.floorY
        || !hasFloorAt(terrain, anchor.x, anchor.y)) {
        fail(level, `P13 전투 위치 앵커 ${anchor.id}가 보스룸 안전 바닥 밖`);
      }
    }
  }
  if (level.id === "level-03") {
    const originalWidth = 7168;
    const roomWidth = 2048;
    const invisibleSection = level.sections.find(({ id }) => id === "boss_invisible");
    if (!invisibleSection || invisibleSection.xStart !== originalWidth || invisibleSection.xEnd !== originalWidth + roomWidth) {
      fail(level, "P11 투명 대왕 보스룸이 기존 코스 오른쪽 7168~9216에 있지 않음");
    }
    if (invisibleSection?.boss?.key !== "invisible_king") fail(level, "P11 boss key가 invisible_king이 아님");
    if (level.world.width !== originalWidth + roomWidth || level.exit.x !== 9040) fail(level, "P11 world/exit 확장 누락");
    if (level.checkpoints.find(({ id }) => id === "cp_invisible_ready")?.restoresHealth !== true) {
      fail(level, "P11 보스 직전 완전 회복 체크포인트가 없음");
    }
    const anchors = invisibleSection?.boss?.anchors ?? [];
    if (anchors.length < 3) fail(level, "P11 투명 대왕 위치 앵커가 3개 미만");
    const anchorIds = new Set();
    for (const anchor of anchors) {
      if (anchorIds.has(anchor.id)) fail(level, `P11 위치 앵커 id 중복: ${anchor.id}`);
      anchorIds.add(anchor.id);
      if (!inWorld(level, anchor.x, anchor.y)
        || anchor.x < invisibleSection.xStart + 96
        || anchor.x > invisibleSection.xEnd - 96
        || anchor.y > invisibleSection.boss.floorY
        || invisibleSection.boss.floorY - anchor.y > invisibleSection.boss.maxAnchorRise) {
        fail(level, `P11 위치 앵커 ${anchor.id}가 도달 가능 보스룸 범위 밖`);
      }
      if (!hasFloorAt(terrain, anchor.x, invisibleSection.boss.floorY)) {
        fail(level, `P11 위치 앵커 ${anchor.id} 아래에 보스룸 바닥이 없음`);
      }
      if (anchor.lane === "air") {
        const support = terrain.find((object) => (
          object.type === "platform"
          && anchor.x >= object.x
          && anchor.x <= object.x + object.width
          && object.y > anchor.y
          && object.y - anchor.y <= 64
          && invisibleSection.boss.floorY - object.y <= 96
        ));
        if (!support) fail(level, `P11 공중 앵커 ${anchor.id}의 기본 점프용 기억 발판이 없음`);
      }
    }
    const bossGuides = level.environment.mist.guides.filter(({ x }) => x >= invisibleSection.xStart && x < invisibleSection.xEnd);
    if (bossGuides.filter(({ kind }) => kind === "beacon").length < 3) fail(level, "P11 보스룸 광원 비콘이 3개 미만");
  }
  if (level.id === "level-05") {
    const originalWidth = 8192;
    const roomWidth = 2048;
    const waterSection = level.sections.find(({ id }) => id === "boss_water");
    if (!waterSection || waterSection.xStart !== originalWidth || waterSection.xEnd !== originalWidth + roomWidth) {
      fail(level, "P12 물대왕 보스룸이 기존 코스 오른쪽 8192~10240에 있지 않음");
    }
    if (waterSection?.boss?.key !== "water_king") fail(level, "P12 boss key가 water_king이 아님");
    if (level.world.width !== originalWidth + roomWidth || level.exit.x !== 10064) {
      fail(level, "P12 world/exit 확장 누락");
    }
    const ready = level.checkpoints.find(({ id }) => id === "cp_water_ready");
    if (ready?.restoresHealth !== true || ready?.restoresBreath !== true) {
      fail(level, "P12 보스 직전 체력·비행·숨 완전 회복 체크포인트가 없음");
    }
    if (!waterSection?.boss?.environment?.suspend?.includes("breath")) {
      fail(level, "P12 보스룸에서 기존 대형 수중 숨 시스템이 정지되지 않음");
    }
    const pools = waterSection?.boss?.bossPools ?? [];
    if (pools.length < 3 || pools.length > 4) fail(level, "P12 보스 전용 웅덩이가 3~4개가 아님");
    const poolIds = new Set();
    const waterZoneIds = new Set((level.environment.waterZones ?? []).map(({ id }) => id));
    for (const pool of pools) {
      if (poolIds.has(pool.id)) fail(level, `P12 보스 웅덩이 id 중복: ${pool.id}`);
      poolIds.add(pool.id);
      if (waterZoneIds.has(pool.id)) fail(level, `P12 보스 웅덩이 ${pool.id}가 waterZones와 섞임`);
      if (!inWorld(level, pool.x, pool.y)
        || pool.x < waterSection.xStart + 96
        || pool.x > waterSection.xEnd - 96
        || pool.y !== waterSection.boss.floorY
        || !isPositiveNumber(pool.width)
        || !isPositiveNumber(pool.height)) {
        fail(level, `P12 보스 웅덩이 ${pool.id}가 arena 규격 밖`);
      }
      if (!hasFloorAt(terrain, pool.x, waterSection.boss.floorY)) {
        fail(level, `P12 보스 웅덩이 ${pool.id} 아래에 보스룸 바닥이 없음`);
      }
    }
    if ((level.environment.waterZones ?? []).some(({ xEnd }) => xEnd > originalWidth)) {
      fail(level, "P12 얕은 보스 웅덩이가 기존 waterZones에 포함됨");
    }
  }
  for (const checkpoint of level.checkpoints) {
    if (!inWorld(level, checkpoint.x, checkpoint.y)) fail(level, `checkpoint ${checkpoint.id} 좌표가 world 밖`);
    if (!hasFloorAt(terrain, checkpoint.x, checkpoint.y)) fail(level, `checkpoint ${checkpoint.id} 아래에 바닥이 없음`);
    if (checkpoint.restoresHealth !== undefined && typeof checkpoint.restoresHealth !== "boolean") {
      fail(level, `checkpoint ${checkpoint.id} restoresHealth는 boolean이어야 함`);
    }
    if (checkpoint.restoresBreath !== undefined && typeof checkpoint.restoresBreath !== "boolean") {
      fail(level, `checkpoint ${checkpoint.id} restoresBreath는 boolean이어야 함`);
    }
  }
  for (const point of level.environment.breathPoints ?? []) {
    const zone = level.environment.waterZones.find(({ id }) => id === point.zoneId);
    const hasSurfaceTerrain = zone && terrain.some((object) => (
      point.x >= object.x
      && point.x <= object.x + object.width
      && object.y <= zone.surfaceY
    ));
    if (!hasSurfaceTerrain) fail(level, `호흡 지점 ${point.id}에 수면 위 충돌 지형이 없음`);
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
