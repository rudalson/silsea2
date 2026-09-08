import assert from "node:assert/strict";
import level06 from "../src/data/levels/level-06.js";
import {
  GATE_KINDS,
  GATE_PHASES,
  GATE_PLACEMENTS,
  GATE_REVIEW_MODES,
  GATE_TRANSITIONS,
  applyGateReviewMode,
  createGateLifecycle,
  getGateReviewMode,
  normalizeGatePresentation,
  resolveGateY,
  transitionGatePhase
} from "../src/data/gatePresentation.js";
import {
  GATE_ARRIVAL_STAGES,
  getGateArrivalTiming,
  resolveGateArrivalStage
} from "../src/data/gateArrival.js";
import { assertLevelShape, normalizeLevelDefinition } from "../src/data/schema/levelSchema.js";

const real = normalizeGatePresentation({}, GATE_KINDS.REAL);
assert.equal(real.kind, GATE_KINDS.REAL);
assert.equal(real.placement, GATE_PLACEMENTS.GROUND);
assert.equal(real.airOffset, 96);
assert.equal(real.approachDistance, 150);
assert.equal(real.graybox, false);

const air = normalizeGatePresentation({
  kind: GATE_KINDS.PRANK,
  placement: GATE_PLACEMENTS.AIR,
  airOffset: 120,
  approachDistance: 220,
  graybox: true
}, GATE_KINDS.REAL);
assert.equal(air.kind, GATE_KINDS.REAL, "호출 경로가 기대한 실제/장난 종류를 잠가야 함");
assert.equal(resolveGateY(576, air), 456);

assert.equal(
  transitionGatePhase(GATE_PHASES.HIDDEN, GATE_TRANSITIONS.SPAWN, GATE_KINDS.REAL),
  GATE_PHASES.SPAWNING
);
assert.equal(
  transitionGatePhase(GATE_PHASES.SPAWNING, GATE_TRANSITIONS.ACTIVATE, GATE_KINDS.REAL),
  GATE_PHASES.ACTIVE
);
assert.equal(
  transitionGatePhase(GATE_PHASES.ACTIVE, GATE_TRANSITIONS.APPROACH, GATE_KINDS.REAL),
  GATE_PHASES.ACTIVE,
  "실제 게이트는 접근만으로 사라지면 안 됨"
);
assert.equal(
  transitionGatePhase(GATE_PHASES.ACTIVE, GATE_TRANSITIONS.ENTER, GATE_KINDS.PRANK),
  GATE_PHASES.ACTIVE,
  "장난 게이트는 클리어 진입을 받으면 안 됨"
);

const realLifecycle = createGateLifecycle(GATE_KINDS.REAL);
assert.equal(realLifecycle.phase, GATE_PHASES.HIDDEN);
assert.equal(realLifecycle.transition(GATE_TRANSITIONS.ENTER), false);
assert.equal(realLifecycle.transition(GATE_TRANSITIONS.SPAWN), true);
assert.equal(realLifecycle.transition(GATE_TRANSITIONS.ACTIVATE), true);
assert.equal(realLifecycle.transition(GATE_TRANSITIONS.ENTER), true);
assert.equal(realLifecycle.phase, GATE_PHASES.ENTERED);
assert.equal(realLifecycle.transition(GATE_TRANSITIONS.ENTER), false, "실제 게이트 완료는 한 번만 허용해야 함");

const prankLifecycle = createGateLifecycle(GATE_KINDS.PRANK);
prankLifecycle.transition(GATE_TRANSITIONS.SPAWN);
prankLifecycle.transition(GATE_TRANSITIONS.ACTIVATE);
assert.equal(prankLifecycle.transition(GATE_TRANSITIONS.APPROACH), true);
assert.equal(prankLifecycle.phase, GATE_PHASES.VANISHED);
assert.equal(prankLifecycle.transition(GATE_TRANSITIONS.ENTER), false);

assert.equal(getGateReviewMode("?gateReview=real"), GATE_REVIEW_MODES.REAL);
assert.equal(getGateReviewMode("?gateReview=air"), GATE_REVIEW_MODES.AIR);
assert.equal(getGateReviewMode("?gateReview=prank"), GATE_REVIEW_MODES.PRANK);
assert.equal(getGateReviewMode("?gateReview=arrival"), GATE_REVIEW_MODES.ARRIVAL);
assert.equal(getGateReviewMode("?gateReview=unknown"), null);

const normalized = normalizeLevelDefinition(level06);
assert.equal(normalized.prankGates, undefined, "기존 레벨 정규화 결과에 빈 선택 필드를 강제로 추가하지 않아야 함");
assert.equal(normalized.exit.presentation, undefined);
assert.equal(assertLevelShape(normalized), true);

const realReview = applyGateReviewMode(normalized, GATE_REVIEW_MODES.REAL);
assert.equal(realReview.exit.presentation.kind, GATE_KINDS.REAL);
assert.equal(realReview.exit.presentation.placement, GATE_PLACEMENTS.GROUND);
assert.equal(realReview.exit.presentation.graybox, true);
assert.equal(realReview.prankGates.length, 0);

const airReview = applyGateReviewMode(normalized, GATE_REVIEW_MODES.AIR);
assert.equal(airReview.exit.presentation.placement, GATE_PLACEMENTS.AIR);
assert.equal(resolveGateY(normalized.exit.y, airReview.exit.presentation), normalized.exit.y - 96);

const prankReview = applyGateReviewMode(normalized, GATE_REVIEW_MODES.PRANK);
assert.equal(prankReview.prankGates.length, 1);
assert.equal(prankReview.prankGates[0].presentation.kind, GATE_KINDS.PRANK);
assert.ok(prankReview.prankGates[0].x > normalized.player.spawn.x);
assert.equal(assertLevelShape(prankReview), true);

const arrivalReview = applyGateReviewMode(normalized, GATE_REVIEW_MODES.ARRIVAL);
assert.equal(arrivalReview.exit.presentation.graybox, false);
assert.equal(arrivalReview.exit.presentation.placement, GATE_PLACEMENTS.GROUND);
assert.equal(arrivalReview.exit.x, normalized.player.spawn.x + 480);

const normalArrival = getGateArrivalTiming("normal");
const reducedArrival = getGateArrivalTiming("reduced");
assert.ok(reducedArrival.stableAtMs < normalArrival.stableAtMs);
assert.ok(reducedArrival.glitterCount < normalArrival.glitterCount);
assert.equal(resolveGateArrivalStage(0), GATE_ARRIVAL_STAGES.FLASH);
assert.equal(resolveGateArrivalStage(normalArrival.popStartMs), GATE_ARRIVAL_STAGES.POP);
assert.equal(resolveGateArrivalStage(normalArrival.glitterStartMs), GATE_ARRIVAL_STAGES.GLITTER);
assert.equal(resolveGateArrivalStage(normalArrival.stableAtMs), GATE_ARRIVAL_STAGES.STABLE);

const leftReview = applyGateReviewMode({
  ...normalized,
  progression: { direction: "left" },
  player: { spawn: { x: 4800, y: 576 } }
}, GATE_REVIEW_MODES.PRANK);
assert.ok(leftReview.prankGates[0].x < leftReview.player.spawn.x, "역방향 검수 장난 게이트는 진행 방향에 있어야 함");

assert.throws(
  () => assertLevelShape({
    ...normalized,
    exit: { ...normalized.exit, presentation: { placement: "diagonal" } }
  }),
  /placement는 ground 또는 air/
);
assert.throws(
  () => assertLevelShape({
    ...normalized,
    prankGates: [
      { id: "duplicate", x: 320 },
      { id: "duplicate", x: 640 }
    ]
  }),
  /id 중복/
);

console.log("게이트 표시 상태·스키마 테스트 통과");
