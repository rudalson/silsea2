const n = (pitch, steps = 1) => ({ pitch, steps });
const r = (steps = 1) => n(null, steps);

// Original 16-bar themes. Boss arrangements share their course's opening motif,
// with a firmer pulse; piano phrases avoid the repeated alarm/stop-cue pattern.
export const EXPANSION_SONGS = {
  bgm_merong: {
    bpm: 112, chords: [[48, 52, 55], [53, 57, 60], [45, 48, 52], [43, 47, 50]],
    melody: [n(72), n(76), n(79), r(), n(81), n(79), n(76, 2)],
    answer: [n(77), r(), n(81), n(79), n(76), n(74), n(72, 2)],
    lead: "marimba", pad: "warm", bass: "round", percussion: 0.32, arp: 0.28
  },
  bgm_merong_boss: {
    bpm: 120, chords: [[48, 52, 55], [50, 53, 57], [53, 57, 60], [43, 47, 50]],
    melody: [n(72), n(76), n(79), r(), n(76), n(72), n(74, 2)],
    answer: [n(77), n(81), r(), n(79), n(76), r(), n(72, 2)],
    lead: "marimba", pad: "warm", bass: "firm", percussion: 0.5, arp: 0.2
  },
  bgm_tape: {
    bpm: 116, chords: [[45, 48, 52], [50, 53, 57], [48, 52, 55], [43, 47, 50]],
    melody: [n(69), r(), n(72), n(76), n(74, 2), n(72), r()],
    answer: [n(74), n(77), r(), n(76), n(72), r(), n(69, 2)],
    lead: "pluck", pad: "warm", bass: "round", percussion: 0.4, arp: 0.34
  },
  bgm_tape_boss: {
    bpm: 124, chords: [[45, 48, 52], [50, 53, 57], [41, 45, 48], [43, 47, 50]],
    melody: [n(69), r(), n(72), n(76), n(74), r(), n(72, 2)],
    answer: [n(76), n(74), r(), n(72), n(69), n(67), n(69, 2)],
    lead: "pluck", pad: "warm", bass: "firm", percussion: 0.57, arp: 0.24
  },
  bgm_piano: {
    bpm: 96, chords: [[41, 45, 48], [48, 52, 55], [50, 53, 57], [43, 47, 50]],
    melody: [n(72), n(74), n(76, 2), r(), n(79), n(77, 2)],
    answer: [n(77), n(76), r(2), n(74), n(72), n(69, 2)],
    lead: "piano", pad: "air", bass: "round", percussion: 0.08, arp: 0.13
  },
  bgm_piano_boss: {
    bpm: 108, chords: [[41, 45, 48], [50, 53, 57], [48, 52, 55], [43, 47, 50]],
    melody: [n(72), n(74), n(76), r(), n(79, 2), r(2)],
    answer: [n(77), n(76), r(), n(74), n(72, 2), r(2)],
    lead: "piano", pad: "warm", bass: "firm", percussion: 0.18, arp: 0.1
  },
  bgm_hole: {
    bpm: 104, chords: [[50, 53, 57], [48, 52, 55], [43, 47, 50], [45, 48, 52]],
    melody: [n(74), r(), n(77), r(), n(81), n(79), n(77, 2)],
    answer: [n(79), r(), n(77), n(74), r(), n(72), n(74, 2)],
    lead: "marimba", pad: "warm", bass: "round", percussion: 0.28, arp: 0.18
  },
  bgm_hole_boss: {
    bpm: 116, chords: [[50, 53, 57], [43, 47, 50], [48, 52, 55], [45, 48, 52]],
    melody: [n(74), r(), n(77), r(), n(81), n(79), n(74, 2)],
    answer: [n(77), r(), n(74), n(72), n(69), r(), n(74, 2)],
    lead: "pluck", pad: "warm", bass: "firm", percussion: 0.46, arp: 0.16
  },
  bgm_cloud: {
    bpm: 88, chords: [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]],
    melody: [n(76, 2), n(79), n(84, 2), n(81), r(2)],
    answer: [n(79, 2), n(76), n(72, 2), n(74), r(2)],
    lead: "flute", pad: "air", bass: "round", percussion: 0.09, arp: 0.25
  },
  bgm_cloud_boss: {
    bpm: 100, chords: [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]],
    melody: [n(76), n(79), n(84, 2), n(81), r(), n(79, 2)],
    answer: [n(79), n(76), n(72, 2), r(), n(74), n(76, 2)],
    lead: "flute", pad: "air", bass: "round", percussion: 0.26, arp: 0.21
  }
};
