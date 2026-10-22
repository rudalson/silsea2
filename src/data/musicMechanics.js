import { createRhythmState, stepRhythm } from "./courseMechanics.js";

const phase = (config) => Object.freeze({ ...config, lanes: Object.freeze(config.lanes) });
export const MUSIC_KING_PHASES = Object.freeze({
  1: phase({ id: "single_note_phrase", lanes: [32], warningMs: 1200, speed: 300, travelMs: 2200, restRequired: false, vulnerabilityMs: 3400 }),
  2: phase({ id: "note_and_five_second_rest", lanes: [32], warningMs: 1200, speed: 310, travelMs: 2200, restRequired: true, vulnerabilityMs: 3500 }),
  3: phase({ id: "alternating_notes_and_rest", lanes: [32, 108, 32], warningMs: 1100, speed: 330, travelMs: 2200, restRequired: true, vulnerabilityMs: 3600 })
});
export const MUSIC_REST_CONFIG = Object.freeze({ warningMs: 1500, stopMs: 5000, retryMs: 1200, movementTolerance: 0.2 });
export const canHitMusicKing = (state, fallingOntoHead) => state === "vulnerable" && Boolean(fallingOntoHead);
export const isMusicRestSafe = (body, bossX, section, floorY) => Boolean(body?.enable
  && body.center.x >= section.xStart + 48 && body.center.x <= section.xEnd - 48
  && Math.abs(body.center.x - bossX) >= 180 && Math.abs(body.bottom - floorY) <= 8);
export const createMusicRestState = createRhythmState;
export const stepMusicRest = (state, options, config = MUSIC_REST_CONFIG) => stepRhythm(state, options, config);

export function advanceMusicNote(note, deltaMs) {
  const elapsedMs = note.elapsedMs + Math.max(0, deltaMs);
  return { ...note, previousX: note.x, x: note.x + note.velocityX * Math.max(0, deltaMs) / 1000,
    elapsedMs, active: elapsedMs < note.lifetimeMs };
}
export function musicNoteHits(note, body) {
  if (!note?.active || !body?.enable) return false;
  return body.right > Math.min(note.previousX, note.x) - 16 && body.left < Math.max(note.previousX, note.x) + 16
    && body.bottom > note.y - 12 && body.top < note.y + 12;
}
