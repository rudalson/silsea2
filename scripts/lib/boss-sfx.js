const tone = (start, duration, from, to = from, wave = "sine", gain = 0.25) => ({ start, duration, from, to, wave, gain });
const notes = (frequencies, step, length, wave = "sine", gain = 0.23) =>
  frequencies.map((frequency, index) => tone(index * step, length, frequency, frequency, wave, gain));

// Short, non-looping accents leave room for the warning and rhythm signals.
// Append after the legacy recipes: their seeded noise must remain unchanged.
export const BOSS_SFX_RECIPES = {
  sfx_merong_tongue: { duration: 0.32, tones: [tone(0, 0.18, 190, 430, "triangle", 0.32), tone(0.12, 0.2, 430, 170, "sine", 0.24)] },
  sfx_merong_weakness: { duration: 0.5, tones: notes([392, 523, 659], 0.12, 0.25, "triangle") },
  sfx_tape_shot: { duration: 0.28, tones: [tone(0, 0.24, 820, 280, "triangle", 0.28)], noise: 0.035 },
  sfx_tape_patch: { duration: 0.36, tones: [tone(0, 0.16, 360, 140, "triangle", 0.3), tone(0.16, 0.18, 240, 90, "sine", 0.26)], noise: 0.065 },
  sfx_tape_weakness: { duration: 0.48, tones: notes([523, 784, 1047], 0.1, 0.26, "triangle", 0.21) },
  sfx_music_note: { duration: 0.3, tones: [tone(0, 0.3, 330, 330, "triangle", 0.28), tone(0, 0.18, 660, 660, "sine", 0.1)] },
  sfx_music_weakness: { duration: 0.54, tones: notes([262, 330, 392, 523], 0.1, 0.24, "sine", 0.21) },
  sfx_hole_open: { duration: 0.42, tones: [tone(0, 0.3, 210, 90, "sine", 0.3), tone(0.09, 0.3, 320, 130, "triangle", 0.19)], noise: 0.045 },
  sfx_hole_weakness: { duration: 0.52, tones: notes([330, 440, 659], 0.13, 0.25, "triangle", 0.23) },
  sfx_cloud_wind: { duration: 0.6, tones: [tone(0, 0.6, 220, 440, "sine", 0.18), tone(0.12, 0.46, 330, 550, "triangle", 0.1)], noise: 0.055 },
  sfx_cloud_rain: { duration: 0.42, tones: [tone(0, 0.14, 900, 480, "sine", 0.23), tone(0.13, 0.14, 760, 390, "sine", 0.23), tone(0.26, 0.16, 620, 310, "sine", 0.23)], noise: 0.018 },
  sfx_cloud_weakness: { duration: 0.56, tones: notes([440, 554, 880], 0.14, 0.26, "sine", 0.22) }
};
