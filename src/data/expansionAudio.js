// Stable level IDs survive campaign reordering; display order is not an audio key.
export const EXPANSION_BGM = Object.freeze({
  "level-07": Object.freeze({ field: "bgm_merong", boss: "bgm_merong_boss" }),
  "level-08": Object.freeze({ field: "bgm_tape", boss: "bgm_tape_boss" }),
  "level-09": Object.freeze({ field: "bgm_piano", boss: "bgm_piano_boss" }),
  "level-10": Object.freeze({ field: "bgm_hole", boss: "bgm_hole_boss" }),
  "level-11": Object.freeze({ field: "bgm_cloud", boss: "bgm_cloud_boss" })
});

export const EXPANSION_BGM_KEYS = Object.freeze(Object.values(EXPANSION_BGM).flatMap(({ field, boss }) => [field, boss]));
