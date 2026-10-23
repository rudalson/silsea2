import { getBossStateSfx } from "../../data/bossAudio.js";

// Called only by enter(): no frame polling, timers, loops, or delayed cues.
export function playBossStateSfx(scene, bossKey, state, variant) {
  const key = getBossStateSfx(bossKey, state, variant);
  if (!key) return null;
  return scene.audioManager?.playSfx(key, {
    randomizeRate: false,
    volume: state === "vulnerable" ? 0.85 : 0.78
  }) ?? null;
}
