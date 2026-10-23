// Stable boss keys keep these cues independent of campaign display order.
export const BOSS_SFX_PROFILES = Object.freeze({
  merong_king: Object.freeze({ attack: "sfx_merong_tongue", vulnerable: "sfx_merong_weakness" }),
  tape_king: Object.freeze({
    attack: Object.freeze({ shot: "sfx_tape_shot", patch: "sfx_tape_patch" }),
    vulnerable: "sfx_tape_weakness"
  }),
  music_king: Object.freeze({ attack: "sfx_music_note", vulnerable: "sfx_music_weakness" }),
  hole_king: Object.freeze({ attack: "sfx_hole_open", vulnerable: "sfx_hole_weakness" }),
  cloud_king: Object.freeze({
    attack: Object.freeze({ wind: "sfx_cloud_wind", rain: "sfx_cloud_rain" }),
    vulnerable: "sfx_cloud_weakness"
  })
});

export const BOSS_SFX_KEYS = Object.freeze(Object.values(BOSS_SFX_PROFILES)
  .flatMap(profile => Object.values(profile).flatMap(value => typeof value === "string" ? [value] : Object.values(value))));
export const BOSS_WEAKNESS_SFX_KEYS = Object.freeze(Object.values(BOSS_SFX_PROFILES).map(profile => profile.vulnerable));

export function getBossStateSfx(bossKey, state, variant) {
  const cue = BOSS_SFX_PROFILES[bossKey]?.[state];
  return typeof cue === "string" ? cue : cue?.[variant] ?? null;
}
