import { AIRBORNE_GATE_ROUTE, createAirborneGateRoute } from "./airborneGateRoute.js";
import { createPrankGateReviewEncounter } from "./prankGateEncounter.js";

export const GATE_KINDS = Object.freeze({
  REAL: "real",
  PRANK: "prank"
});

export const GATE_PLACEMENTS = Object.freeze({
  GROUND: "ground",
  AIR: "air"
});

export const GATE_EFFECT_STRENGTHS = Object.freeze({
  NORMAL: "normal",
  REDUCED: "reduced"
});

export const GATE_PHASES = Object.freeze({
  HIDDEN: "hidden",
  SPAWNING: "spawning",
  ACTIVE: "active",
  ENTERED: "entered",
  VANISHED: "vanished"
});

export const GATE_TRANSITIONS = Object.freeze({
  SPAWN: "spawn",
  ACTIVATE: "activate",
  ENTER: "enter",
  APPROACH: "approach"
});

export const GATE_REVIEW_MODES = Object.freeze({
  REAL: "real",
  AIR: "air",
  PRANK: "prank",
  ARRIVAL: "arrival",
  AIR_ROUTE: "air-route",
  INTEGRATION: "integration"
});

export const DEFAULT_GATE_PRESENTATION = Object.freeze({
  kind: GATE_KINDS.REAL,
  placement: GATE_PLACEMENTS.GROUND,
  effects: GATE_EFFECT_STRENGTHS.NORMAL,
  airOffset: 96,
  approachDistance: 150,
  graybox: false
});

export const APPROVED_GROUND_GATE_PRESENTATION = Object.freeze({
  kind: GATE_KINDS.REAL,
  placement: GATE_PLACEMENTS.GROUND,
  effects: GATE_EFFECT_STRENGTHS.NORMAL,
  graybox: false
});

export function createApprovedAirGatePresentation(airRoute) {
  return Object.freeze({
    kind: GATE_KINDS.REAL,
    placement: GATE_PLACEMENTS.AIR,
    effects: GATE_EFFECT_STRENGTHS.NORMAL,
    airOffset: AIRBORNE_GATE_ROUTE.airOffset,
    graybox: false,
    airRoute
  });
}

const finiteOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max, fallback) => Math.max(min, Math.min(max, finiteOr(value, fallback)));

export function normalizeGatePresentation(presentation = {}, expectedKind = GATE_KINDS.REAL) {
  const placement = Object.values(GATE_PLACEMENTS).includes(presentation?.placement)
    ? presentation.placement
    : DEFAULT_GATE_PRESENTATION.placement;
  const effects = Object.values(GATE_EFFECT_STRENGTHS).includes(presentation?.effects)
    ? presentation.effects
    : DEFAULT_GATE_PRESENTATION.effects;

  return {
    ...DEFAULT_GATE_PRESENTATION,
    ...presentation,
    kind: expectedKind,
    placement,
    effects,
    airOffset: clamp(presentation?.airOffset, 48, 160, DEFAULT_GATE_PRESENTATION.airOffset),
    approachDistance: clamp(
      presentation?.approachDistance,
      80,
      320,
      DEFAULT_GATE_PRESENTATION.approachDistance
    ),
    graybox: Boolean(presentation?.graybox)
  };
}

export function resolveGateY(surfaceY, presentation = DEFAULT_GATE_PRESENTATION) {
  const normalized = normalizeGatePresentation(presentation, presentation?.kind ?? GATE_KINDS.REAL);
  return normalized.placement === GATE_PLACEMENTS.AIR
    ? Number(surfaceY) - normalized.airOffset
    : Number(surfaceY);
}

export function transitionGatePhase(phase, transition, kind = GATE_KINDS.REAL) {
  if (phase === GATE_PHASES.HIDDEN && transition === GATE_TRANSITIONS.SPAWN) {
    return GATE_PHASES.SPAWNING;
  }
  if (phase === GATE_PHASES.SPAWNING && transition === GATE_TRANSITIONS.ACTIVATE) {
    return GATE_PHASES.ACTIVE;
  }
  if (phase === GATE_PHASES.ACTIVE && transition === GATE_TRANSITIONS.ENTER && kind === GATE_KINDS.REAL) {
    return GATE_PHASES.ENTERED;
  }
  if (phase === GATE_PHASES.ACTIVE && transition === GATE_TRANSITIONS.APPROACH && kind === GATE_KINDS.PRANK) {
    return GATE_PHASES.VANISHED;
  }
  return phase;
}

export function createGateLifecycle(kind = GATE_KINDS.REAL) {
  let phase = GATE_PHASES.HIDDEN;
  return Object.freeze({
    get kind() {
      return kind;
    },
    get phase() {
      return phase;
    },
    transition(event) {
      const next = transitionGatePhase(phase, event, kind);
      const changed = next !== phase;
      phase = next;
      return changed;
    },
    snapshot() {
      return Object.freeze({ kind, phase });
    }
  });
}

export function getGateReviewMode(search = "") {
  const mode = new URLSearchParams(search).get("gateReview");
  return Object.values(GATE_REVIEW_MODES).includes(mode) ? mode : null;
}

export function applyGateReviewMode(level, mode) {
  if (!level || !Object.values(GATE_REVIEW_MODES).includes(mode)) return level;
  if (mode === GATE_REVIEW_MODES.INTEGRATION) return level;
  const direction = level.progression?.direction === "left" ? -1 : 1;
  const existing = normalizeGatePresentation(level.exit?.presentation, GATE_KINDS.REAL);
  const airborne = mode === GATE_REVIEW_MODES.AIR_ROUTE;
  const exitPresentation = {
    ...existing,
    placement: mode === GATE_REVIEW_MODES.AIR || airborne ? GATE_PLACEMENTS.AIR : GATE_PLACEMENTS.GROUND,
    airOffset: airborne ? AIRBORNE_GATE_ROUTE.airOffset : existing.airOffset,
    graybox: mode !== GATE_REVIEW_MODES.ARRIVAL && !airborne
  };
  const arrivalX = Math.max(96, Math.min(
    Number(level.world?.width ?? 1280) - 96,
    Number(level.player?.spawn?.x ?? 160) + direction * 480
  ));
  const routeX = Math.max(96, Math.min(
    Number(level.world?.width ?? 1280) - 96,
    Number(level.player?.spawn?.x ?? 160) + direction * AIRBORNE_GATE_ROUTE.gateDistance
  ));
  const exitX = mode === GATE_REVIEW_MODES.ARRIVAL ? arrivalX : airborne ? routeX : level.exit?.x;
  const airRoute = airborne
    ? createAirborneGateRoute({
        gateX: exitX,
        surfaceY: level.exit?.y ?? level.player?.spawn?.y,
        direction
      })
    : null;
  const prankX = Math.max(96, Math.min(
    Number(level.world?.width ?? 1280) - 96,
    Number(level.player?.spawn?.x ?? 160) + direction * 360
  ));
  const reviewPranks = mode === GATE_REVIEW_MODES.PRANK
    ? [{
        id: "gate-review-prank",
        x: prankX,
        encounter: createPrankGateReviewEncounter(),
        presentation: {
          kind: GATE_KINDS.PRANK,
          placement: GATE_PLACEMENTS.GROUND,
          approachDistance: 150,
          graybox: false
        }
      }]
    : [];

  return {
    ...level,
    exit: {
      ...level.exit,
      x: exitX,
      presentation: airborne ? { ...exitPresentation, airRoute } : exitPresentation
    },
    prankGateReviewOnly: mode === GATE_REVIEW_MODES.PRANK,
    prankGates: mode === GATE_REVIEW_MODES.PRANK ? reviewPranks : (level.prankGates ?? []),
    checkpoints: airRoute
      ? [...(level.checkpoints ?? []), airRoute.retryCheckpoint]
      : level.checkpoints,
    cameraCues: airRoute
      ? [...(level.cameraCues ?? []), {
          id: "gate-review-air-camera",
          xStart: Math.min(airRoute.retryCheckpoint.x, exitX) - 96,
          xEnd: Math.max(airRoute.retryCheckpoint.x, exitX) + 96,
          lookAhead: AIRBORNE_GATE_ROUTE.cameraLookAhead,
          targetX: exitX
        }]
      : level.cameraCues
  };
}

export function assertGatePresentationShape(level) {
  const fail = (message) => {
    throw new Error(`[${level?.id ?? "unknown"}] ${message}`);
  };
  const validatePresentation = (presentation, expectedKind, label) => {
    if (!presentation) return;
    if (presentation.kind !== undefined && presentation.kind !== expectedKind) {
      fail(`${label}.kind는 ${expectedKind}이어야 합니다.`);
    }
    if (presentation.placement !== undefined && !Object.values(GATE_PLACEMENTS).includes(presentation.placement)) {
      fail(`${label}.placement는 ground 또는 air여야 합니다.`);
    }
    if (presentation.effects !== undefined && !Object.values(GATE_EFFECT_STRENGTHS).includes(presentation.effects)) {
      fail(`${label}.effects는 normal 또는 reduced여야 합니다.`);
    }
    if (presentation.airOffset !== undefined
      && (!Number.isFinite(Number(presentation.airOffset)) || presentation.airOffset < 48 || presentation.airOffset > 160)) {
      fail(`${label}.airOffset은 48~160이어야 합니다.`);
    }
    if (presentation.approachDistance !== undefined
      && (!Number.isFinite(Number(presentation.approachDistance))
        || presentation.approachDistance < 80
        || presentation.approachDistance > 320)) {
      fail(`${label}.approachDistance는 80~320이어야 합니다.`);
    }
    if (presentation.graybox !== undefined && typeof presentation.graybox !== "boolean") {
      fail(`${label}.graybox는 boolean이어야 합니다.`);
    }
    if (presentation.airRoute !== undefined) {
      const route = presentation.airRoute;
      const finitePoint = (point) => Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
      if (!finitePoint(route.platform)
        || !Number.isFinite(Number(route.platform?.width))
        || !Number.isFinite(Number(route.platform?.height))
        || route.platform.width <= 0
        || route.platform.height <= 0) {
        fail(`${label}.airRoute.platform 좌표와 크기가 필요합니다.`);
      }
      if (!Array.isArray(route.guideStars)
        || route.guideStars.length < 2
        || route.guideStars.some((star) => !finitePoint(star) || !Number.isFinite(Number(star.size)))) {
        fail(`${label}.airRoute.guideStars는 유효한 안내점 배열이어야 합니다.`);
      }
      if (!Number.isFinite(Number(route.lightBeam?.x))
        || !Number.isFinite(Number(route.lightBeam?.yTop))
        || !Number.isFinite(Number(route.lightBeam?.yBottom))
        || route.lightBeam.yTop >= route.lightBeam.yBottom) {
        fail(`${label}.airRoute.lightBeam 범위가 필요합니다.`);
      }
      if (!route.retryCheckpoint?.id || !finitePoint(route.retryCheckpoint)) {
        fail(`${label}.airRoute.retryCheckpoint가 필요합니다.`);
      }
      if (!["directReachable", "platformReachable"].every(
        (key) => typeof route.reachability?.[key] === "boolean"
      )) {
        fail(`${label}.airRoute.reachability 판정이 필요합니다.`);
      }
    }
  };

  validatePresentation(level?.exit?.presentation, GATE_KINDS.REAL, "exit.presentation");
  if (level?.prankGates !== undefined && !Array.isArray(level.prankGates)) {
    fail("prankGates는 배열이어야 합니다.");
  }
  const ids = new Set();
  for (const [index, prank] of (level?.prankGates ?? []).entries()) {
    if (!prank?.id || typeof prank.id !== "string") fail(`prankGates[${index}].id가 필요합니다.`);
    if (ids.has(prank.id)) fail(`prank gate id 중복: ${prank.id}`);
    ids.add(prank.id);
    if (!Number.isFinite(Number(prank.x)) || prank.x < 0 || prank.x > Number(level.world?.width)) {
      fail(`prank gate ${prank.id} x가 world 범위 밖입니다.`);
    }
    if (prank.y !== undefined && !Number.isFinite(Number(prank.y))) {
      fail(`prank gate ${prank.id} y는 숫자여야 합니다.`);
    }
    if (prank.encounter !== undefined) {
      if (prank.encounter.resetPolicy !== "scene-restart") {
        fail(`prank gate ${prank.id}.encounter.resetPolicy는 scene-restart여야 합니다.`);
      }
      for (const key of ["collision", "damage", "score", "objectives", "save"]) {
        if (prank.encounter.harmless?.[key] !== false) {
          fail(`prank gate ${prank.id}.encounter.harmless.${key}는 false여야 합니다.`);
        }
      }
    }
    validatePresentation(prank.presentation, GATE_KINDS.PRANK, `prank gate ${prank.id}.presentation`);
  }
  return true;
}
