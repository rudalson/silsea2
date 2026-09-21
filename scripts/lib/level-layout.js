import { expandLevelItems } from "../../src/data/levelInteractions.js";
import { CHARACTER_LIST } from "../../src/data/characters.js";

const overlaps = (a, b) => a.x < b.x + b.width - 0.01 && a.x + a.width > b.x + 0.01
  && a.y < b.y + b.height - 0.01 && a.y + a.height > b.y + 0.01;

// Conservative clearance checks, not a substitute for a physics playthrough.
export function findLayoutIssues(level, terrain) {
  const issues = [];
  const width = Math.max(...CHARACTER_LIST.map(({ physics }) => physics.bodyWidth));
  const height = Math.max(...CHARACTER_LIST.map(({ physics }) => physics.bodyHeight));
  const hasSupport = (area, footY) => terrain.some((t) => Math.abs(t.y - footY) < 0.01
    && t.x <= area.x && t.x + t.width >= area.x + area.width);
  for (const item of expandLevelItems(level.items)) {
    const box = { x: item.x - 24, y: item.y - 24, width: 48, height: 48 };
    for (const t of terrain) {
      if (overlaps(box, t)) issues.push(`item ${item.id} overlaps ${t.name}`);
    }
  }
  for (const enemy of level.enemies.filter(({ type }) => type === "raw_potato")) {
    const patrol = enemy.patrol ?? 160;
    const route = { x: enemy.x - patrol - width / 2 - 2, y: enemy.y - height,
      width: patrol * 2 + width + 4, height };
    if (!hasSupport(route, enemy.y)) issues.push(`enemy ${enemy.id} patrol has no continuous support`);
    for (const t of terrain) {
      if (overlaps(route, t)) issues.push(`enemy ${enemy.id} patrol excludes player at ${t.name}`);
    }
  }
  for (const hazard of level.hazards.filter(({ type }) => type === "spike_pumpkin")) {
    const approach = { x: hazard.x - 42 - width, y: hazard.y - height - 72,
      width: 84 + width * 2, height: height + 72 };
    if (terrain.some((t) => overlaps(approach, t))) issues.push(`hazard ${hazard.id} has no open jump approach`);
  }
  for (const cp of [...level.checkpoints, ...(level.difficulty?.easyMode?.extraCheckpoints ?? [])]) {
    const body = { x: cp.x - width / 2, y: cp.y - height, width, height };
    if (!hasSupport(body, cp.y) || terrain.some((t) => overlaps(body, t))) {
      issues.push(`checkpoint ${cp.id} respawn is obstructed`);
    }
  }
  return issues;
}
