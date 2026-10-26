export const MERONG_IMP_RULES = Object.freeze({ range: 430, warningMs: 1100, travelMs: 1050,
  inflateMs: 260, burstMs: 320, recoverMs: 650, cooldownMs: 1850, walkSpeed: 48 });

export function createMerongPrank({ x, floorY, direction, groundLimit }, easy = false) {
  const facing = direction < 0 ? -1 : 1, originX = x + facing * 34;
  const travel = Math.max(0, Math.min(easy ? 230 : 300, (groundLimit - originX) * facing - 28));
  const popX = originX + facing * travel;
  const reach = Math.max(0, Math.min(easy ? 72 : 104, (groundLimit - popX) * facing - 8));
  const travelMs = MERONG_IMP_RULES.travelMs * (easy ? 1.3 : 1);
  return { x: originX, popX, floorY, direction: facing, travel, reach, easy, travelMs,
    durationMs: travelMs + MERONG_IMP_RULES.inflateMs + MERONG_IMP_RULES.burstMs };
}

export function sampleMerongPrank(plan, elapsedMs) {
  if (elapsedMs < 0 || elapsedMs >= plan.durationMs) return [];
  if (elapsedMs < plan.travelMs) {
    const progress = elapsedMs / plan.travelMs;
    return [{ id: "prank", shape: "balloon", x: plan.x + plan.direction * plan.travel * progress,
      y: plan.floorY - 24 - Math.abs(Math.sin(progress * Math.PI * 2)) * (plan.easy ? 42 : 60), width: 34, height: 34 }];
  }
  const inflated = elapsedMs - plan.travelMs;
  if (inflated < MERONG_IMP_RULES.inflateMs) {
    const size = 34 + inflated / MERONG_IMP_RULES.inflateMs * 18;
    return [{ id: "prank", shape: "balloon", x: plan.popX, y: plan.floorY - 27, width: size, height: size }];
  }
  const progress = (inflated - MERONG_IMP_RULES.inflateMs) / MERONG_IMP_RULES.burstMs;
  const width = Math.sin(progress * Math.PI) * plan.reach;
  return width < 2 ? [] : [{ id: "prank", shape: "tongue", x: plan.popX + plan.direction * width / 2,
    y: plan.floorY - 28, width, height: 18 }];
}

export function overlapsMerongPrank(body, hazard) {
  if (!body?.enable) return false;
  if (hazard.shape === "balloon") {
    const x = Math.max(body.left, Math.min(hazard.x, body.right)), y = Math.max(body.top, Math.min(hazard.y, body.bottom));
    return (x - hazard.x) ** 2 + (y - hazard.y) ** 2 < (hazard.width / 2) ** 2;
  }
  return body.right > hazard.x - hazard.width / 2 && body.left < hazard.x + hazard.width / 2
    && body.bottom > hazard.y - hazard.height / 2 && body.top < hazard.y + hazard.height / 2;
}

export function findMerongPrankHit(plan, fromMs, toMs, body) {
  const from = Math.max(0, fromMs), to = Math.min(plan.durationMs, toMs);
  if (to < from || !body?.enable) return null;
  const steps = Math.max(1, Math.ceil((to - from) / 12));
  for (let step = 0; step <= steps; step++) for (const hazard of sampleMerongPrank(plan, from + (to - from) * step / steps)) {
    if (overlapsMerongPrank(body, hazard)) return hazard;
  }
  return null;
}
