import assert from "node:assert/strict";
import { LEVELS, getNextLevel } from "../src/data/levels/index.js";
import {
  GATE_KINDS,
  GATE_PLACEMENTS,
  normalizeGatePresentation
} from "../src/data/gatePresentation.js";
import { TRANSFORMATION_ITEM_TYPES } from "../src/data/itemPresentation.js";
import { normalizeLevelDefinition } from "../src/data/schema/levelSchema.js";
import { ObjectiveManager } from "../src/systems/ObjectiveManager.js";
import { ProgressManager } from "../src/systems/ProgressManager.js";

const storageValues = new Map();
const storage = {
  getItem: (key) => storageValues.get(key) ?? null,
  setItem: (key, value) => storageValues.set(key, value)
};
const progress = new ProgressManager(storage);
const campaignItemTypes = new Set();

assert.equal(LEVELS.length, 6);

for (const [index, sourceLevel] of LEVELS.entries()) {
  const level = normalizeLevelDefinition(sourceLevel);
  const next = LEVELS[index + 1] ?? null;
  const presentation = normalizeGatePresentation(level.exit.presentation, GATE_KINDS.REAL);
  const bossSections = level.sections.filter(({ type }) => type === "boss");
  const bossObjectives = level.objectives.required.filter(({ type }) => type === "defeat_boss");
  const reachObjectives = level.objectives.required.filter(({ type }) => type === "reach_gate");

  assert.equal(progress.isUnlocked(level, LEVELS), true, `${level.id} 순차 해금 실패`);
  assert.equal(reachObjectives.length, 1, `${level.id}는 실제 게이트 목표가 정확히 하나여야 함`);
  assert.equal(presentation.kind, GATE_KINDS.REAL);
  assert.equal(presentation.graybox, false);
  assert.equal(
    presentation.placement,
    level.id === "level-06" ? GATE_PLACEMENTS.AIR : GATE_PLACEMENTS.GROUND
  );

  if (level.id === "level-06") {
    assert.equal(bossSections.length, 0);
    assert.equal(bossObjectives.length, 0);
    assert.equal(presentation.airRoute.reachability.directReachable, true);
    assert.equal(presentation.airRoute.reachability.platformReachable, true);
  } else {
    assert.equal(bossSections.length, 1, `${level.id} 보스 section 누락`);
    assert.equal(bossObjectives.length, 1, `${level.id} 보스 필수 목표 누락`);
    assert.equal(bossSections[0].boss.key, bossObjectives[0].target);
  }

  const objectives = new ObjectiveManager({ events: { emit() {} } }, level.objectives);
  assert.equal(objectives.areRequiredComplete(), false);
  for (const objective of bossObjectives) objectives.markBossDefeated(objective.target);
  assert.equal(
    objectives.areRequiredComplete(),
    false,
    `${level.id}는 실제 게이트 진입 전에 완료되면 안 됨`
  );
  objectives.markGateEntered();
  assert.equal(objectives.areRequiredComplete(), true, `${level.id} 실제 게이트 완료 실패`);

  progress.complete(level.id, 100 + index, ["release_flow"]);
  assert.equal(progress.get(level.id).cleared, true);
  assert.equal(getNextLevel(level.id)?.id ?? null, next?.id ?? null);
  if (next) assert.equal(progress.isUnlocked(next, LEVELS), true, `${next.id} 해금 실패`);

  for (const item of level.items ?? []) {
    if (TRANSFORMATION_ITEM_TYPES.includes(item.type)) campaignItemTypes.add(item.type);
  }
}

assert.deepEqual([...campaignItemTypes].sort(), [...TRANSFORMATION_ITEM_TYPES].sort());
assert.equal(getNextLevel(LEVELS.at(-1).id), null);

console.log("최종 게이트 흐름 테스트 통과: 6개 레벨 목표→실제 게이트→저장→다음 레벨 해금, 변신 3종, 지상 5·공중 1");
