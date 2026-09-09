import assert from "node:assert/strict";
import { DEFAULT_TUNING } from "../src/data/characters.js";
import level06 from "../src/data/levels/level-06.js";
import { LEVELS } from "../src/data/levels/index.js";
import {
  AIRBORNE_GATE_ROUTE,
  calculateGateReachability,
  calculateJumpApex
} from "../src/data/airborneGateRoute.js";
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
import {
  PRANK_GATE_ENCOUNTER_STAGES,
  PRANK_GATE_SAFETY,
  getPrankGateTiming,
  resolvePrankGateSafety
} from "../src/data/prankGateEncounter.js";
import {
  assertLevelShape,
  getCameraLookAheadTarget,
  normalizeLevelDefinition
} from "../src/data/schema/levelSchema.js";
import { createRuntimeLevel } from "../src/systems/DifficultyManager.js";
import { ITEM_PRESENTATIONS, TRANSFORMATION_ITEM_TYPES } from "../src/data/itemPresentation.js";

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
assert.equal(getGateReviewMode("?gateReview=air-route"), GATE_REVIEW_MODES.AIR_ROUTE);
assert.equal(getGateReviewMode("?gateReview=integration"), GATE_REVIEW_MODES.INTEGRATION);
assert.equal(getGateReviewMode("?gateReview=unknown"), null);

const normalized = normalizeLevelDefinition({
  ...level06,
  exit: { x: level06.exit.x, y: level06.exit.y, enterFrom: level06.exit.enterFrom }
});
assert.equal(normalized.prankGates, undefined, "기존 레벨 정규화 결과에 빈 선택 필드를 강제로 추가하지 않아야 함");
assert.equal(normalized.exit.presentation, undefined);
assert.equal(assertLevelShape(normalized), true);
assert.equal(
  applyGateReviewMode(normalized, GATE_REVIEW_MODES.INTEGRATION),
  normalized,
  "통합 검수 모드는 승인된 실제 레벨 데이터를 바꾸지 않아야 함"
);

const integratedLevels = LEVELS.map((level) => {
  const normalizedLevel = normalizeLevelDefinition(level);
  return {
    ...normalizedLevel,
    exit: {
      ...normalizedLevel.exit,
      presentation: normalizeGatePresentation(normalizedLevel.exit.presentation, GATE_KINDS.REAL)
    }
  };
});
assert.equal(integratedLevels.length, 6);
for (const level of integratedLevels) {
  assert.equal(assertLevelShape(level), true);
  assert.equal(level.exit.presentation.kind, GATE_KINDS.REAL);
  assert.equal(level.exit.presentation.graybox, false);
  assert.ok(level.objectives.required.some(({ type }) => type === "reach_gate"));
  const easyLevel = createRuntimeLevel(level, true);
  assert.equal(easyLevel.exit.presentation.placement, level.exit.presentation.placement);
}
const integratedAirLevels = integratedLevels.filter(
  (level) => level.exit.presentation.placement === GATE_PLACEMENTS.AIR
);
const integratedGroundLevels = integratedLevels.filter(
  (level) => level.exit.presentation.placement === GATE_PLACEMENTS.GROUND
);
assert.deepEqual(integratedAirLevels.map(({ id }) => id), ["level-06"]);
assert.equal(integratedGroundLevels.length, 5);
const integratedRelay = integratedAirLevels[0];
assert.equal(integratedRelay.exit.presentation.airRoute.retryCheckpoint.id, "cp_relay_finish");
assert.ok(integratedRelay.checkpoints.some(({ id }) => id === "cp_relay_finish"));
assert.ok(integratedRelay.cameraCues.some(({ id }) => id === "cue_relay_air_gate"));
assert.equal(integratedRelay.exit.presentation.airRoute.reachability.directReachable, true);
assert.equal(integratedRelay.exit.presentation.airRoute.reachability.platformReachable, true);

const productionPrankLevels = integratedLevels.filter((level) => (level.prankGates ?? []).length > 0);
assert.deepEqual(productionPrankLevels.map(({ id }) => id), ["level-02"]);
assert.equal(productionPrankLevels[0].prankGates.length, 1);
const productionPrank = productionPrankLevels[0].prankGates[0];
assert.equal(productionPrank.id, "starlight-canopy-prank");
assert.equal(productionPrankLevels[0].sections.find(
  ({ xStart, xEnd }) => productionPrank.x >= xStart && productionPrank.x < xEnd
)?.id, "glow_canopy");
assert.ok(Math.min(...productionPrankLevels[0].checkpoints.map(
  ({ x }) => Math.abs(x - productionPrank.x)
)) >= PRANK_GATE_SAFETY.checkpointDistance);
assert.equal(productionPrank.encounter.reviewOnly, false);

const integratedTransformationTypes = new Set(integratedLevels.flatMap(
  (level) => (level.items ?? []).map(({ type }) => type).filter((type) => TRANSFORMATION_ITEM_TYPES.includes(type))
));
assert.deepEqual([...integratedTransformationTypes].sort(), [...TRANSFORMATION_ITEM_TYPES].sort());
for (const type of integratedTransformationTypes) {
  assert.ok(ITEM_PRESENTATIONS[type], `${type} 아이템 연출 규칙이 모든 실제 배치에 연결되어야 함`);
}

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
assert.equal(prankReview.prankGateReviewOnly, true);
assert.equal(prankReview.prankGates[0].presentation.kind, GATE_KINDS.PRANK);
assert.equal(prankReview.prankGates[0].presentation.graybox, false);
assert.equal(prankReview.prankGates[0].encounter.resetPolicy, "scene-restart");
assert.deepEqual(prankReview.prankGates[0].encounter.harmless, {
  collision: false,
  damage: false,
  score: false,
  objectives: false,
  save: false
});
assert.ok(prankReview.prankGates[0].x > normalized.player.spawn.x);
assert.equal(assertLevelShape(prankReview), true);

const replacementPrankReview = applyGateReviewMode({
  ...normalized,
  prankGates: [{ id: "existing-prank", x: 900 }]
}, GATE_REVIEW_MODES.PRANK);
assert.equal(replacementPrankReview.prankGates.length, 1, "고정 검수에서는 장난 게이트를 최대 1개만 둬야 함");
assert.equal(replacementPrankReview.prankGates[0].id, "gate-review-prank");

const normalPrankTiming = getPrankGateTiming("normal");
const reducedPrankTiming = getPrankGateTiming("reduced");
assert.ok(reducedPrankTiming.reactionMs < normalPrankTiming.reactionMs);
assert.ok(reducedPrankTiming.popMs < normalPrankTiming.popMs);
assert.ok(reducedPrankTiming.smokeCount < normalPrankTiming.smokeCount);
assert.ok(reducedPrankTiming.starCount < normalPrankTiming.starCount);
assert.equal(PRANK_GATE_ENCOUNTER_STAGES.IDLE, "idle");
assert.deepEqual(resolvePrankGateSafety(), { eligible: true, reasons: [] });
assert.deepEqual(resolvePrankGateSafety({ actualGateActive: true }), {
  eligible: false,
  reasons: ["actual-gate-active"]
});
assert.deepEqual(resolvePrankGateSafety({ bossActive: true }), {
  eligible: false,
  reasons: ["boss-active"]
});
assert.deepEqual(resolvePrankGateSafety({
  distanceToCheckpoint: PRANK_GATE_SAFETY.checkpointDistance - 1
}), { eligible: false, reasons: ["checkpoint-nearby"] });
assert.deepEqual(resolvePrankGateSafety({
  secondsToDeadline: PRANK_GATE_SAFETY.deadlineGuardSeconds
}), { eligible: false, reasons: ["deadline-nearby"] });

const arrivalReview = applyGateReviewMode(normalized, GATE_REVIEW_MODES.ARRIVAL);
assert.equal(arrivalReview.exit.presentation.graybox, false);
assert.equal(arrivalReview.exit.presentation.placement, GATE_PLACEMENTS.GROUND);
assert.equal(arrivalReview.exit.x, normalized.player.spawn.x + 480);

const apex = calculateJumpApex(DEFAULT_TUNING.jumpVelocity, DEFAULT_TUNING.gravity);
assert.ok(apex > 136 && apex < 137, "기본형 표준 점프 정점은 약 136px이어야 함");
const reachability = calculateGateReachability({
  jumpVelocity: DEFAULT_TUNING.jumpVelocity,
  gravity: DEFAULT_TUNING.gravity
});
assert.equal(reachability.directRise, 74);
assert.equal(reachability.platformRise, 10);
assert.equal(reachability.directReachable, true, "지면 표준 점프로 게이트 충돌 영역에 닿아야 함");
assert.equal(reachability.platformReachable, true, "보조 발판에서는 짧은 점프로 진입 가능해야 함");

const airRouteReview = applyGateReviewMode(normalized, GATE_REVIEW_MODES.AIR_ROUTE);
const route = airRouteReview.exit.presentation.airRoute;
assert.equal(airRouteReview.exit.presentation.graybox, false);
assert.equal(airRouteReview.exit.presentation.placement, GATE_PLACEMENTS.AIR);
assert.equal(airRouteReview.exit.presentation.airOffset, AIRBORNE_GATE_ROUTE.airOffset);
assert.equal(resolveGateY(airRouteReview.exit.y, airRouteReview.exit.presentation), 426);
assert.equal(route.platform.y, 512);
assert.equal(route.guideStars.length, 3);
assert.equal(route.retryCheckpoint.id, "gate-review-air-checkpoint");
assert.equal(airRouteReview.checkpoints.filter(({ id }) => id === route.retryCheckpoint.id).length, 1);
assert.equal(airRouteReview.cameraCues.at(-1).lookAhead, AIRBORNE_GATE_ROUTE.cameraLookAhead);
assert.equal(route.reachability.directReachable, true);
assert.equal(route.reachability.platformReachable, true);
assert.equal(assertLevelShape(airRouteReview), true);

const easyAirRoute = createRuntimeLevel(airRouteReview, true);
assert.ok(easyAirRoute.checkpoints.some(({ id }) => id === route.retryCheckpoint.id));
assert.equal(easyAirRoute.exit.presentation.airRoute.retryCheckpoint.id, route.retryCheckpoint.id);

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

const leftAirRoute = applyGateReviewMode({
  ...normalized,
  progression: { direction: "left" },
  player: { spawn: { x: 4800, y: 576 } }
}, GATE_REVIEW_MODES.AIR_ROUTE);
const leftRoute = leftAirRoute.exit.presentation.airRoute;
const leftCue = leftAirRoute.cameraCues.at(-1);
assert.ok(leftAirRoute.exit.x < leftAirRoute.player.spawn.x, "역방향 공중 게이트는 진행 방향에 있어야 함");
assert.ok(leftRoute.retryCheckpoint.x > leftAirRoute.exit.x, "역방향 체크포인트는 게이트 진입 전이어야 함");
assert.ok(leftRoute.guideStars.every(({ x }) => x > leftAirRoute.exit.x), "별 궤적은 역방향에서 좌우 반전되어야 함");
assert.equal(getCameraLookAheadTarget(-180, leftCue.lookAhead), AIRBORNE_GATE_ROUTE.cameraLookAhead);

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
assert.throws(
  () => assertLevelShape({
    ...airRouteReview,
    exit: {
      ...airRouteReview.exit,
      presentation: {
        ...airRouteReview.exit.presentation,
        airRoute: { ...route, guideStars: [] }
      }
    }
  }),
  /guideStars는 유효한 안내점 배열/
);
assert.throws(
  () => assertLevelShape({
    ...prankReview,
    prankGates: [{
      ...prankReview.prankGates[0],
      encounter: {
        ...prankReview.prankGates[0].encounter,
        harmless: { ...prankReview.prankGates[0].encounter.harmless, score: true }
      }
    }]
  }),
  /encounter.harmless.score는 false/
);

console.log("게이트 표시 상태·스키마 테스트 통과");
