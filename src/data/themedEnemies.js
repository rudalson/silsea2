import { PALETTE } from "./palette.js";
const color = hex => Number.parseInt(hex.slice(1), 16);

// Character-specific attacks share the same sampled geometry for drawing,
// telegraphing and collision. Origins and directions lock before anticipation.
export const THEMED_ENEMIES = Object.freeze({
  burrow_mole: Object.freeze({ name: "굴파기 두더지", stage: "hole", kind: "dirt_spout", warningMs: 1300,
    attackMs: 1000, recoverMs: 850, cooldownMs: 2700, range: 220, walkSpeed: 22,
    color: color(PALETTE.sunlight[3]), sfx: "sfx_hole_open", hint: "두더지가 땅을 긁어요. 표시된 자리에서 흙기둥이 솟으니 자리를 피하거나 점프해요." }),
  ring_golem: Object.freeze({ name: "고리돌 골렘", stage: "hole", kind: "return_ring", warningMs: 1150,
    attackMs: 1800, recoverMs: 850, cooldownMs: 2700, range: 260, walkSpeed: 20,
    color: color(PALETTE.sunlight[4]), sfx: "sfx_hole_weakness", hint: "고리돌 골렘이 돌고리를 굴려요. 고리가 되돌아올 때도 점프하거나 날개로 막아요." }),
  piano_imp: Object.freeze({ name: "건반 도깨비", stage: "music", kind: "skip_notes", warningMs: 1050,
    attackMs: 1900, recoverMs: 700, cooldownMs: 2300, range: 260, walkSpeed: 24,
    color: color(PALETTE.sylvia[10]), sfx: "sfx_music_note", hint: "건반 도깨비가 손을 들어요. 두 번 통통 튀는 음표를 점프로 넘거나 날개로 막아요." }),
  metronome_owl: Object.freeze({ name: "박자 부엉이", stage: "music", kind: "pendulum", warningMs: 1250,
    attackMs: 1100, recoverMs: 850, cooldownMs: 2500, range: 200, walkSpeed: 20,
    color: color(PALETTE.collect[0]), sfx: "sfx_rhythm_warning", hint: "박자 부엉이가 추를 당겨요. 추가 바깥으로 나갔다 돌아오니 점프로 피하세요." })
});

export const isThemedEnemy = type => Boolean(THEMED_ENEMIES[type]);
export const getThemedEnemyTypes = stage => Object.keys(THEMED_ENEMIES).filter(type => THEMED_ENEMIES[type].stage === stage);

export function createThemedAttack(type, { x, floorY, direction, targetX }, easy = false) {
  const rules = THEMED_ENEMIES[type];
  if (!rules) throw new Error(`Unknown themed enemy: ${type}`);
  return { type, kind: rules.kind, x, floorY, direction: direction < 0 ? -1 : 1,
    targetX, easy, durationMs: rules.attackMs, color: rules.color };
}

export function sampleThemedAttack(plan, elapsedMs) {
  if (elapsedMs < 0 || elapsedMs >= plan.durationMs) return [];
  if (plan.kind === "dirt_spout") {
    const height = Math.sin(elapsedMs / plan.durationMs * Math.PI) * (plan.easy ? 64 : 84);
    return height < 6 ? [] : [{ id: "spout", shape: "spout", x: plan.targetX, y: plan.floorY - height / 2,
      width: plan.easy ? 44 : 60, height, guardable: false }];
  }
  if (plan.kind === "return_ring") {
    const travel = Math.sin(elapsedMs / plan.durationMs * Math.PI) * (plan.easy ? 180 : 240);
    return [{ id: "ring", shape: "ring", x: plan.x + plan.direction * (40 + travel), y: plan.floorY - 25,
      width: 46, height: 46, innerRadius: 12, guardable: true }];
  }
  if (plan.kind === "skip_notes") {
    return (plan.easy ? [0] : [0, 320]).flatMap((delay, index) => {
      const t = (elapsedMs - delay) / 1000;
      if (t < 0 || t >= 1.55) return [];
      return [{ id: `note-${index}`, shape: "note", x: plan.x + plan.direction * (36 + t * (plan.easy ? 135 : 175)),
        y: plan.floorY - 22 - Math.abs(Math.sin(t / 1.55 * Math.PI * 2)) * 54,
        width: 28, height: 24, guardable: true }];
    });
  }
  if (plan.kind === "pendulum") {
    const arc = Math.sin(elapsedMs / plan.durationMs * Math.PI);
    return [{ id: "pendulum", shape: "pendulum", x: plan.x + plan.direction * (32 + arc * (plan.easy ? 88 : 112)),
      y: plan.floorY - 26 - arc * 46, width: 28, height: 28, guardable: false }];
  }
  return [];
}

export function overlapsThemedHazard(body, hazard) {
  if (!body?.enable) return false;
  if (hazard.shape === "ring") {
    const closestX = Math.max(body.left, Math.min(hazard.x, body.right));
    const closestY = Math.max(body.top, Math.min(hazard.y, body.bottom));
    const farthestX = Math.max(Math.abs(body.left - hazard.x), Math.abs(body.right - hazard.x));
    const farthestY = Math.max(Math.abs(body.top - hazard.y), Math.abs(body.bottom - hazard.y));
    return (closestX - hazard.x) ** 2 + (closestY - hazard.y) ** 2 < (hazard.width / 2) ** 2
      && farthestX ** 2 + farthestY ** 2 > hazard.innerRadius ** 2;
  }
  return body.right > hazard.x - hazard.width / 2 && body.left < hazard.x + hazard.width / 2
    && body.bottom > hazard.y - hazard.height / 2 && body.top < hazard.y + hazard.height / 2;
}

export function findThemedAttackHits(plan, fromMs, toMs, body, resolved = new Set()) {
  const hits = new Map(), from = Math.max(0, fromMs), to = Math.min(plan.durationMs, toMs);
  if (!body?.enable || to < from) return [];
  const steps = Math.max(1, Math.ceil((to - from) / 12));
  for (let step = 0; step <= steps; step++) {
    for (const hazard of sampleThemedAttack(plan, from + (to - from) * step / steps)) {
      if (!resolved.has(hazard.id) && overlapsThemedHazard(body, hazard)) hits.set(hazard.id, hazard);
    }
  }
  return [...hits.values()];
}
