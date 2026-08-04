export const PARTICLE_EFFECTS = Object.freeze({
  landing: Object.freeze({
    count: 4,
    lifespan: Object.freeze({ min: 280, max: 380 }),
    speedX: Object.freeze({ min: -105, max: 105 }),
    speedY: Object.freeze({ min: -125, max: -70 }),
    gravityY: 260
  }),
  magnet: Object.freeze({
    intervalMs: 42,
    distanceStep: 12,
    lateralOffset: 9,
    lifespan: 260
  }),
  transform: Object.freeze({
    lifespan: Object.freeze({ min: 260, max: 380 }),
    speed: Object.freeze({ min: 125, max: 220 }),
    pulseExtraMs: 160
  })
});
