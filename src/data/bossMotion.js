// Presentation only: none of these offsets or scales are applied to Arcade bodies.
const profile = (config) => Object.freeze(config);
export const BOSS_MOTION_PROFILES = Object.freeze({
  merong_king: profile({ periodMs: 1800, breath: 0.009, anticipation: 2, lunge: 4, lean: 1.1 }),
  tape_king: profile({ periodMs: 2000, breath: 0.007, anticipation: 1.7, lunge: 3, lean: 0.8 }),
  music_king: profile({ periodMs: 1200, breath: 0.008, anticipation: 1.6, lunge: 2, lean: 1.3 }),
  hole_king: profile({ periodMs: 1500, breath: 0.01, anticipation: 1.8, lunge: 2, lean: 1.6 }),
  cloud_king: profile({ periodMs: 2200, breath: 0.011, anticipation: 1.7, lunge: 2, lean: 1.2 })
});

export const identityBossPose = () => ({ offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, angle: 0, alpha: 1 });
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smooth = (value) => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };

export function sampleBossPose(key, state, elapsedMs, { durationMs = 0, direction = 1, reduced = false, still = false } = {}) {
  const config = BOSS_MOTION_PROFILES[key], pose = identityBossPose();
  if (!config || reduced || still || state === "dormant") return pose;
  const time = Math.max(0, Number(elapsedMs) || 0), facing = direction < 0 ? -1 : 1;
  const cycle = Math.sin(time / config.periodMs * Math.PI * 2);
  const progress = durationMs > 0 ? clamp(time / durationMs, 0, 1) : 0;
  switch (state) {
    case "intro": case "idle": case "between": case "recovery": case "returning": case "rhythm":
      pose.scaleX = 1 - cycle * config.breath * 0.45;
      pose.scaleY = 1 + cycle * config.breath;
      pose.angle = cycle * config.lean * 0.35;
      break;
    case "warning": {
      const anticipation = smooth(progress);
      pose.scaleX = 1 + anticipation * 0.014;
      pose.scaleY = 1 - anticipation * 0.016;
      pose.angle = -facing * config.anticipation * anticipation;
      break;
    }
    case "attack": {
      const impulse = Math.sin(Math.PI * clamp(time / 300, 0, 1)) * Math.exp(-time / 320);
      pose.offsetX = facing * config.lunge * impulse;
      pose.scaleX = 1 + impulse * 0.022;
      pose.scaleY = 1 - impulse * 0.014;
      pose.angle = facing * config.lean * impulse;
      if (key === "hole_king") pose.angle += facing * Math.sin(time / 140) * 1.1;
      if (key === "music_king") pose.angle += Math.sin(time / 180) * 0.7;
      if (key === "cloud_king") pose.scaleX += Math.sin(time / 210) * 0.006;
      break;
    }
    case "vulnerable":
      // Keep the exposed head and star steady; the tired pose breathes very subtly.
      pose.scaleY = 1 - (1 - Math.cos(time / 500)) * 0.003;
      break;
    case "hurt": {
      const recoil = Math.sin(time / 55) * Math.exp(-time / 170);
      pose.offsetX = -facing * recoil * 3;
      pose.angle = -facing * recoil * 2;
      break;
    }
    case "defeated": {
      const settle = smooth(time / 900);
      pose.scaleX = 1 + settle * 0.025;
      pose.scaleY = 1 - settle * 0.045;
      pose.angle = facing * settle * 2.5;
      pose.alpha = 1 - settle * 0.12;
      break;
    }
  }
  return pose;
}
