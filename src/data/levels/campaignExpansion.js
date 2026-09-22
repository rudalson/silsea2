// Authored field encounters. Geometry is baked into Tiled maps by the sync script.
// Distances are measured in the direction of travel, including the leftward village.
export const CAMPAIGN_PLAN = Object.freeze({
  "level-02": { originalWidth: 8192, width: 18432, block: 2560, names: ["canopy_guard", "branch_crossing", "laser_grove", "starlight_finale"], stars: 145, seconds: 600 },
  "level-03": { originalWidth: 9216, width: 20480, block: 2816, names: ["lantern_steps", "mist_windway", "hidden_crossing", "mist_finale"], stars: 160, seconds: 660 },
  "level-04": { originalWidth: 10240, width: 22528, block: 3072, names: ["shelter_relay", "roof_escape", "wave_crossing", "village_finale"], stars: 175, seconds: 720 },
  "level-05": { originalWidth: 10240, width: 24576, block: 3584, names: ["sunken_market", "deep_arcade", "breath_relay", "sunken_finale"], stars: 190, seconds: 780 }
});

const translate = (value, threshold, delta) => {
  if (Array.isArray(value)) return value.map((entry) => translate(entry, threshold, delta));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key,
    ["x", "xStart", "xEnd", "targetX", "triggerX", "respawnX"].includes(key) && typeof entry === "number"
      ? entry >= threshold ? entry + delta : entry
      : translate(entry, threshold, delta)
  ]));
};

export function buildCampaignExtension(id) {
  const plan = CAMPAIGN_PLAN[id];
  const reverse = id === "level-04";
  const water = id === "level-05";
  const start = reverse ? 2048 : plan.originalWidth - 2048;
  const extra = plan.width - plan.originalWidth;
  const result = { terrain: [], sections: [], items: [], enemies: [], hazards: [], checkpoints: [],
    movingPlatforms: [], crumblePlatforms: [], zones: [], guides: [], shelters: [], waterZones: [], breathPoints: [],
    switches: [], beams: [], easyEnemies: [], easyCheckpoints: [], cameraCues: [] };
  for (let index = 0; index < 4; index++) {
    const name = plan.names[index];
    const base = reverse ? start + extra - (index + 1) * plan.block : start + index * plan.block;
    const point = (distance) => reverse ? base + plan.block - distance : base + distance;
    const span = (distance, width) => reverse ? point(distance) - width : point(distance);
    const terrain = (suffix, distance, y, width, height, type = "platform") => {
      result.terrain.push({ name: `${name}_${suffix}`, x: span(distance, width), y, width, height, type, rotation: 0, visible: true });
    };
    const item = (suffix, type, distance, y, rest = {}) => result.items.push({ id: `${name}_${suffix}`, type, x: point(distance), y, ...rest });
    const arc = (suffix, distance, y, count = 7, radius = 112) => item(suffix, "star_arc", distance, y, { count, radius });
    const checkpoint = (suffix, distance, y, health = false) => result.checkpoints.push({
      id: `${name}_${suffix}`, x: point(distance), y, activationTop: 0, ...(health ? { restoresHealth: true } : {}), ...(water ? { restoresBreath: true } : {})
    });
    const raw = (suffix, distance, y = 576) => result.enemies.push({ id: `${name}_${suffix}`, type: "raw_potato", x: point(distance), y, patrol: 48 });
    const archer = (distance) => {
      const enemyId = `${name}_archer`;
      result.enemies.push({ id: enemyId, type: "potato_archer", x: point(distance), y: 576,
        triggerX: point(distance - 300), telegraphMs: 1000 - index * 60, arrowSpeed: 270 + index * 15, cooldownMs: 1700 });
      result.easyEnemies.push(enemyId);
    };
    result.sections.push({ id: name, type: "normal", xStart: base, xEnd: base + plan.block, mood: "normal" });
    result.cameraCues.push({ id: `${name}_cue`, xStart: base, xEnd: base + plan.block, lookAhead: 200, targetX: point(plan.block - 160) });

    if (water) {
      // Two submerged ceilings force dives; each exits into an open breathing shaft.
      // No health drain increase: challenge comes from longer navigation and optional dives.
      terrain("entry", 0, 288, 256, 480, "ground");
      terrain("floor", 256, 704, plan.block - 512, 64, "ground");
      terrain("exit", plan.block - 256, 288, 256, 480, "ground");
      const roofWidths = [448, 576, 704, 832];
      terrain("roof_a", 448, 0, roofWidths[index], 448, "ground");
      terrain("roof_b", 1920, 0, 704 + index * 64, 448, "ground");
      for (const [n, distance] of [1408, 3008, 3152].entries()) {
        terrain(`breath_${n}`, distance - 80, 288, 160, 32);
        result.breathPoints.push({ id: `${name}_breath_${n}`, zoneId: `${name}_water`, x: point(distance), label: "다음 숨" });
      }
      terrain("exit_step", plan.block - 480, 544, 192, 32);
      result.waterZones.push({ id: `${name}_water`, xStart: point(256), xEnd: point(plan.block - 256), surfaceY: 320, bottomY: 704 });
      checkpoint("start", 128, 288, index === 0 || index === 2);
      result.easyCheckpoints.push({ id: `${name}_easy`, x: point(1408), y: 288, activationTop: 0, restoresBreath: true });
      arc("entry_stars", 144, 208, 5, 80);
      arc("dive_a", 704, 640, 9, 160);
      arc("ascent_a", 1408, 488, 7, 80);
      arc("breath_reward", 1472, 240, 7, 112);
      arc("dive_b", 2208, 640, 9, 160);
      arc("ascent_b", 3008, 488, 7, 80);
      arc("exit_stars", 3440, 208, 5, 80);
      item("deep_bonus_a", "percent_large", 992, 672);
      item("deep_bonus_b", "percent_large", 2528, 672);
      item("air_bonus", "percent_small", 3008, 288);
      arc("deep_trail_a", 1664, 640, 7, 112);
      arc("deep_trail_b", 2928, 640, 7, 80);
      continue;
    }

    checkpoint("start", 128, 576, index === 0 || index === 2);
    // Every encounter has a low route; its high route trades platforming for extra rewards.
    const pit = !reverse && index !== 0;
    const pitStart = 1248;
    const pitWidth = 448 + (index === 2 ? 128 : 0);
    if (pit) {
      terrain("floor_a", 0, 576, pitStart, 192, "ground");
      terrain("floor_b", pitStart + pitWidth, 576, plan.block - pitStart - pitWidth, 192, "ground");
      for (let d = pitStart + 48, n = 0; d < pitStart + pitWidth; d += 208, n++) terrain(`bridge_${n}`, d, 512, 144, 32);
      result.hazards.push({ id: `${name}_gap`, type: "pit", xStart: point(pitStart), xEnd: point(pitStart + pitWidth), respawnX: point(1120) });
      checkpoint("gap", 1120, 576);
    } else terrain("floor", 0, 576, plan.block, 192, "ground");
    // Full-height steps avoid inaccessible slits underneath the lowest ledge.
    terrain("step", 544, 512, 192, 64, "ground");
    terrain("upper", 800, 416, 256, 32);
    if (index === 0) raw("walker", reverse ? 1300 : 1408);
    raw("landing_walker", 1936);
    if (id === "level-02") {
      archer(2240);
      if (index === 1 || index === 2) {
        result.enemies.push({ id: `${name}_cloud`, type: "dark_cloud", x: point(1584), y: 224,
          triggerX: point(1152), telegraphMs: 950, activationDelayMs: 200, cooldownMs: 2400 });
        result.easyEnemies.push(`${name}_cloud`);
      }
      if (index === 1) result.crumblePlatforms.push({ id: `${name}_bonus_branch`, x: point(1328), y: 352, width: 192, height: 32, crumbleDelayMs: 1050, respawnMs: 2200 });
      if (index === 2) {
        result.switches.push({ id: `${name}_switch`, x: point(2048), y: 476 });
        result.beams.push({ id: `${name}_laser`, switchId: `${name}_switch`, x: point(2352), yStart: 288, yEnd: 576,
          warningMs: 1000, activeMs: 1200, restMs: 1400, startDelayMs: 500 });
      }
    }
    if (id === "level-03") {
      result.zones.push({ id: name, xStart: base, xEnd: base + plan.block, density: [0.42, 0.48, 0.54, 0.32][index], visibilityRadius: [380, 350, 320, 440][index] });
      for (let d = 320, n = 0; d < plan.block; d += 448, n++) result.guides.push({ id: `${name}_guide_${d}`, kind: n % 2 ? "breeze" : "beacon", x: point(d), y: 576 });
      if (index < 3) {
        result.enemies.push({ id: `${name}_cloud`, type: "dark_cloud", x: point(2304), y: 240, triggerX: point(2048), telegraphMs: 1000, activationDelayMs: 400, cooldownMs: 2600 });
        result.easyEnemies.push(`${name}_cloud`);
      }
      if (index > 0) {
        result.enemies.push({ id: `${name}_magpie`, type: "magpie", x: point(1664), y: 224,
          triggerX: point(1232), telegraphMs: 850, activationDelayMs: 200, cooldownMs: 2300 });
        result.easyEnemies.push(`${name}_magpie`);
      }
      if (index === 1) result.movingPlatforms.push({ id: `${name}_wind`, x: point(1344), y: 352, width: 176, height: 32, axis: "y", distance: 64, speed: 48 });
    }
    if (reverse) {
      if (index > 0) archer(2632);
      // Shelters never require flight. Ground shelter gaps stay below 900px.
      for (const [n, d] of [256, 1120, 2080, 2816].entries()) {
        const width = 288;
        result.shelters.push({ id: `${name}_shelter_${n}`, type: "house", asset: "shelterHouseOpen",
          xStart: span(d - width / 2, width), xEnd: span(d - width / 2, width) + width, yTop: 352, yBottom: 576 });
      }
      if (index < 3) result.hazards.push({ id: `${name}_thorn`, type: "spike_pumpkin", x: point(2480), y: 576 });
      terrain("roof_step", 1456, 512, 160, 64, "ground");
      terrain("roof_bonus", 1648, 416, 176, 32);
      arc("roof_stars", 1736, 344, 7, 80);
      item("roof_percent", "percent_large", 1736, 416);
    }
    arc("welcome", 320, 496);
    arc("step_stars", 656, 440, 7, 80);
    arc("upper_stars", 928, 344, 8, 104);
    item("upper_reward", "percent_large", 944, 416);
    arc("crossing", 1440, reverse ? 416 : 400, 9, 144);
    arc("landing", 2048, 496, 8, 112);
    arc("exit_stars", plan.block - 176, 496, 7, 96);
    item("landing_reward", "percent_small", 2024, 576);
    if (index === 3 && !reverse) {
      item("fever", "alicorn", 1824, 576, { activationTop: 0 });
      raw("fever_walker", 2368);
    }
  }
  return result;
}

export function expandCampaignLevel(original) {
  const plan = CAMPAIGN_PLAN[original.id];
  const extra = plan.width - plan.originalWidth;
  const reverse = original.progression?.direction === "left";
  const threshold = reverse ? 2048 : plan.originalWidth - 2048;
  // Shift the field in the reverse stage; shift the arena in forward stages.
  const level = translate(original, threshold, extra);
  for (const section of level.sections) {
    if (reverse && section.type === "boss") section.xEnd = 2048;
    if (!reverse && section.type !== "boss" && section.xEnd === threshold + extra) section.xEnd = threshold;
  }
  level.world.width = plan.width;
  level.progression = { ...original.progression, direction: reverse ? "left" : "right", retainAbilities: true };
  const extension = buildCampaignExtension(original.id);
  level.sections.push(...extension.sections);
  level.sections.sort((a, b) => a.xStart - b.xStart);
  if (level.id === "level-02") {
    const boss = level.sections.find(({ type }) => type === "boss").boss;
    // Replays return to the final field course, not the now-distant tutorial.
    boss.replayCourses = extension.sections.map((section, i) => ({
      id: section.id, name: ["숲관 방어길", "나뭇가지 건너기", "레이저 숲", "별빛 피날레"][i], x: section.xStart + 128, y: 576
    }));
  }
  for (const key of ["items", "enemies", "hazards", "checkpoints", "cameraCues"]) level[key].push(...extension[key]);
  level.terrainMechanics.movingPlatforms.push(...extension.movingPlatforms);
  level.terrainMechanics.crumblePlatforms.push(...extension.crumblePlatforms);
  level.difficulty.easyMode.removeEnemies.push(...extension.easyEnemies);
  level.difficulty.easyMode.extraCheckpoints.push(...extension.easyCheckpoints);
  if (level.environment.mist) {
    // The last field zone ends where the extension begins; only the boss zone moves.
    const recovery = level.environment.mist.zones.find(({ id }) => id === "mist_recovery");
    recovery.xEnd = threshold;
    level.environment.mist.zones.push(...extension.zones);
    level.environment.mist.zones.sort((a, b) => a.xStart - b.xStart);
    level.environment.mist.guides.push(...extension.guides);
  }
  if (level.environment.lasers) {
    level.environment.lasers.switches.push(...extension.switches);
    level.environment.lasers.beams.push(...extension.beams);
  }
  if (level.environment.tsunami) level.environment.tsunami.shelters.push(...extension.shelters);
  if (level.environment.waterZones) {
    level.environment.waterZones.push(...extension.waterZones);
    level.environment.breathPoints.push(...extension.breathPoints);
  }
  const readyId = { "level-02": "cp_random_ready", "level-03": "cp_invisible_ready", "level-05": "cp_water_ready" }[level.id];
  if (readyId) {
    const ready = level.checkpoints.find(({ id }) => id === readyId);
    ready.x = plan.width - 2048 - 128;
  } else level.checkpoints.push({ id: "cp_hula_ready", x: 2176, y: 576, restoresHealth: true });
  for (const cp of level.checkpoints) cp.activationTop = 0;
  for (const goal of level.objectives.optional) {
    if (goal.type === "collect_stars") { goal.count = plan.stars; goal.reward = 700 + level.order * 100; }
    if (goal.type === "clear_time") goal.seconds = plan.seconds;
  }
  return level;
}

export function expandCampaignTerrain(id, map) {
  const plan = CAMPAIGN_PLAN[id];
  const alreadyExpanded = map.width * map.tilewidth === plan.width;
  if (!alreadyExpanded && map.width * map.tilewidth !== plan.originalWidth) throw new Error(`Unexpected base map width: ${id}`);
  const extra = plan.width - plan.originalWidth;
  const threshold = id === "level-04" ? 2048 : plan.originalWidth - 2048;
  const copy = structuredClone(map);
  const terrain = copy.layers.find(({ name }) => name === "terrain");
  if (alreadyExpanded) {
    terrain.objects = terrain.objects.filter(({ name }) => !plan.names.some((prefix) => name.startsWith(`${prefix}_`)));
    copy.nextobjectid = Math.max(...terrain.objects.map(({ id }) => id)) + 1;
  } else {
    for (const object of terrain.objects) if (object.x >= threshold) object.x += extra;
  }
  for (const object of buildCampaignExtension(id).terrain) terrain.objects.push({ ...object, id: copy.nextobjectid++ });
  copy.width = plan.width / copy.tilewidth;
  return copy;
}
