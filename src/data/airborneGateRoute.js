export const AIRBORNE_GATE_ROUTE = Object.freeze({
  airOffset: 150,
  gateDistance: 640,
  checkpointDistance: 320,
  platformTopOffset: 64,
  platformWidth: 192,
  platformHeight: 24,
  cameraLookAhead: 220
});

export function calculateJumpApex(jumpVelocity, gravity) {
  const velocity = Math.abs(Number(jumpVelocity) || 0);
  const gravityValue = Math.max(1, Number(gravity) || 1);
  return (velocity * velocity) / (2 * gravityValue);
}

export function calculateGateReachability({
  airOffset = AIRBORNE_GATE_ROUTE.airOffset,
  bodyHeight = 58,
  jumpVelocity = -720,
  gravity = 1900,
  platformTopOffset = AIRBORNE_GATE_ROUTE.platformTopOffset
} = {}) {
  const apex = calculateJumpApex(jumpVelocity, gravity);
  const directRise = Math.max(0, airOffset - bodyHeight - 18);
  const platformRise = Math.max(0, directRise - platformTopOffset);
  return Object.freeze({
    apex,
    directRise,
    platformRise,
    directReachable: apex >= directRise,
    platformReachable: apex >= platformRise
  });
}

export function createAirborneGateRoute({
  gateX,
  surfaceY,
  direction = 1,
  retryCheckpoint = null
} = {}) {
  const sign = direction < 0 ? -1 : 1;
  const platformTop = Number(surfaceY) - AIRBORNE_GATE_ROUTE.platformTopOffset;
  const guideOffsets = [
    { x: -260, y: -34 },
    { x: -190, y: -76 },
    { x: -116, y: -118 }
  ];
  return Object.freeze({
    platform: Object.freeze({
      x: Number(gateX) - sign * 18,
      y: platformTop,
      width: AIRBORNE_GATE_ROUTE.platformWidth,
      height: AIRBORNE_GATE_ROUTE.platformHeight
    }),
    guideStars: Object.freeze(guideOffsets.map((offset, index) => Object.freeze({
      x: Number(gateX) + sign * offset.x,
      y: Number(surfaceY) + offset.y,
      size: 8 + index * 2
    }))),
    lightBeam: Object.freeze({
      x: Number(gateX),
      yTop: Number(surfaceY) - AIRBORNE_GATE_ROUTE.airOffset - 210,
      yBottom: Number(surfaceY) - 8,
      width: 78
    }),
    retryCheckpoint: Object.freeze(retryCheckpoint ? { ...retryCheckpoint } : {
      id: "gate-review-air-checkpoint",
      x: Number(gateX) - sign * AIRBORNE_GATE_ROUTE.checkpointDistance,
      y: Number(surfaceY),
      restoresHealth: true
    }),
    reachability: calculateGateReachability()
  });
}
