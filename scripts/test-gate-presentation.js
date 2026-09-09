import assert from "node:assert/strict";
import { DEFAULT_TUNING } from "../src/data/characters.js";
import level06 from "../src/data/levels/level-06.js";
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
  assertLevelShape,
  getCameraLookAheadTarget,
  normalizeLevelDefinition
} from "../src/data/schema/levelSchema.js";
import { createRuntimeLevel } from "../src/systems/DifficultyManager.js";

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

console.log("게이트 표시 상태·스키마 테스트 통과");
