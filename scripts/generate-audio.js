import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const sampleRate = 22050;
const masterGain = 0.82;

const tone = (start, duration, from, to = from, wave = "sine", gain = 0.4) => ({
  start,
  duration,
  from,
  to,
  wave,
  gain
});

const chord = (start, duration, notes, wave = "triangle", gain = 0.18) =>
  notes.map((frequency) => tone(start, duration, frequency, frequency, wave, gain));

const arpeggio = (notes, step = 0.09, length = 0.14, wave = "triangle", gain = 0.34) =>
  notes.map((frequency, index) => tone(index * step, length, frequency, frequency * 1.015, wave, gain));

const sfx = {
  sfx_jump: { duration: 0.2, tones: [tone(0, 0.2, 420, 760, "triangle", 0.48)] },
  sfx_land: { duration: 0.14, tones: [tone(0, 0.11, 180, 92, "sine", 0.4)], noise: 0.12 },
  sfx_fall_start: { duration: 0.22, tones: [tone(0, 0.22, 560, 330, "sine", 0.34)] },
  sfx_footstep: { duration: 0.09, tones: [tone(0, 0.07, 150, 105, "sine", 0.25)], noise: 0.08 },
  sfx_star: { duration: 0.12, tones: [tone(0, 0.12, 880, 1175, "sine", 0.46)] },
  sfx_percent_small: { duration: 0.17, tones: arpeggio([659, 784], 0.065, 0.11, "triangle", 0.36) },
  sfx_percent_large: { duration: 0.32, tones: arpeggio([523, 659, 784, 1047], 0.065, 0.14, "triangle", 0.3) },
  sfx_combo: { duration: 0.46, tones: arpeggio([523, 659, 784, 988, 1175], 0.07, 0.17, "triangle", 0.28) },
  sfx_transform_unicorn: { duration: 0.72, tones: [...arpeggio([523, 659, 784, 1047], 0.12, 0.24), ...chord(0.43, 0.29, [523, 659, 784], "sine", 0.14)] },
  sfx_transform_pegasus: { duration: 0.76, tones: [tone(0, 0.48, 330, 988, "sine", 0.25), ...arpeggio([659, 784, 988], 0.15, 0.25, "triangle", 0.25)] },
  sfx_transform_alicorn: { duration: 0.96, tones: [...arpeggio([392, 523, 659, 784, 1047], 0.12, 0.3), ...chord(0.56, 0.4, [523, 659, 784, 1047], "sine", 0.11)] },
  sfx_alicorn_warning: { duration: 0.62, tones: [tone(0, 0.14, 740, 660, "sine", 0.3), tone(0.22, 0.14, 740, 660, "sine", 0.3), tone(0.44, 0.18, 740, 590, "sine", 0.3)] },
  sfx_fly_loop: { duration: 0.68, tones: [tone(0, 0.68, 260, 270, "sine", 0.16), tone(0, 0.68, 390, 405, "triangle", 0.12)], noise: 0.035 },
  sfx_flight_low: { duration: 0.22, tones: [tone(0, 0.1, 520, 470, "square", 0.18), tone(0.12, 0.1, 470, 410, "square", 0.18)] },
  sfx_glide: { duration: 0.26, tones: [tone(0, 0.26, 430, 270, "sine", 0.28)], noise: 0.03 },
  sfx_player_hurt: { duration: 0.24, tones: [tone(0, 0.24, 330, 145, "triangle", 0.36)], noise: 0.09 },
  sfx_hp_zero: { duration: 0.54, tones: arpeggio([392, 330, 262, 196], 0.1, 0.2, "triangle", 0.28) },
  sfx_respawn: { duration: 0.58, tones: arpeggio([330, 440, 554, 659], 0.09, 0.24, "sine", 0.3) },
  sfx_enemy_defeat: { duration: 0.23, tones: [tone(0, 0.23, 360, 120, "triangle", 0.34)], noise: 0.11 },
  sfx_magpie_warning: { duration: 0.34, tones: [tone(0, 0.13, 760, 1030, "sine", 0.28), tone(0.17, 0.16, 700, 970, "sine", 0.28)] },
  sfx_cloud_charge: { duration: 0.7, tones: [tone(0, 0.7, 120, 520, "saw", 0.18)], noise: 0.08 },
  sfx_lightning: { duration: 0.3, tones: [tone(0, 0.22, 180, 72, "square", 0.2)], noise: 0.32 },
  sfx_boss_appear: { duration: 1.0, tones: [...chord(0, 0.82, [82, 123, 165], "triangle", 0.14), tone(0.48, 0.52, 165, 247, "sine", 0.22)] },
  sfx_boss_warning: { duration: 0.78, tones: [tone(0, 0.78, 110, 220, "saw", 0.16), tone(0.42, 0.36, 440, 520, "square", 0.12)] },
  sfx_boss_land: { duration: 0.42, tones: [tone(0, 0.38, 105, 48, "sine", 0.5)], noise: 0.2 },
  sfx_boss_hit: { duration: 0.35, tones: [tone(0, 0.22, 520, 180, "square", 0.22), tone(0.08, 0.27, 780, 260, "triangle", 0.24)], noise: 0.12 },
  sfx_boss_defeat: { duration: 1.3, tones: [...arpeggio([196, 247, 294, 392, 523], 0.15, 0.4, "triangle", 0.25), ...chord(0.76, 0.54, [262, 330, 392], "sine", 0.14)] },
  sfx_checkpoint: { duration: 0.62, tones: [...arpeggio([523, 659, 784], 0.1, 0.28), ...chord(0.3, 0.32, [523, 659, 784], "sine", 0.12)] },
  sfx_gate_spawn: { duration: 0.88, tones: [tone(0, 0.65, 330, 1047, "sine", 0.25), ...chord(0.5, 0.38, [523, 659, 784], "triangle", 0.14)] },
  sfx_clear: { duration: 1.45, tones: [...arpeggio([523, 659, 784, 1047, 1319], 0.13, 0.38, "triangle", 0.28), ...chord(0.78, 0.67, [523, 659, 784], "sine", 0.13)] },
  sfx_ui_move: { duration: 0.08, tones: [tone(0, 0.08, 620, 690, "sine", 0.24)] },
  sfx_ui_select: { duration: 0.16, tones: arpeggio([587, 784], 0.055, 0.105, "triangle", 0.28) },
  sfx_pause: { duration: 0.2, tones: [tone(0, 0.09, 520, 440, "sine", 0.26), tone(0.11, 0.09, 440, 520, "sine", 0.26)] }
};

const waveAt = (kind, phase) => {
  if (kind === "square") return Math.sin(phase) >= 0 ? 1 : -1;
  if (kind === "triangle") return (2 / Math.PI) * Math.asin(Math.sin(phase));
  if (kind === "saw") return 2 * ((phase / (2 * Math.PI)) % 1) - 1;
  return Math.sin(phase);
};

const envelope = (time, duration, attack = 0.008, release = 0.04) =>
  Math.max(0, Math.min(1, time / attack, (duration - time) / release));

const renderSfx = (recipe, seed) => {
  const length = Math.ceil(recipe.duration * sampleRate);
  const samples = new Float32Array(length);
  let noiseState = seed | 0;
  for (let index = 0; index < length; index += 1) {
    const time = index / sampleRate;
    let value = 0;
    for (const entry of recipe.tones) {
      const local = time - entry.start;
      if (local < 0 || local >= entry.duration) continue;
      const progress = local / entry.duration;
      const sweep = entry.to - entry.from;
      const cycles = entry.from * local + (sweep * local * local) / (2 * entry.duration);
      value += waveAt(entry.wave, cycles * Math.PI * 2)
        * entry.gain
        * envelope(local, entry.duration);
    }
    if (recipe.noise) {
      noiseState ^= noiseState << 13;
      noiseState ^= noiseState >>> 17;
      noiseState ^= noiseState << 5;
      const noise = ((noiseState >>> 0) / 0xffffffff) * 2 - 1;
      value += noise * recipe.noise * envelope(time, recipe.duration, 0.003, 0.06);
    }
    samples[index] = Math.tanh(value * 1.35) * masterGain;
  }
  return samples;
};

const midi = (note) => 440 * (2 ** ((note - 69) / 12));

const tracks = {
  bgm_field: {
    bpm: 120,
    lead: [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 81, 79, 76, 74],
    bass: [48, 48, 53, 53, 45, 45, 55, 55],
    wave: "triangle",
    percussion: 0.055
  },
  bgm_boss: {
    bpm: 108,
    lead: [48, null, 51, 53, 48, null, 55, 54, 46, null, 50, 53, 46, 55, 54, 50],
    bass: [36, 36, 34, 34, 31, 31, 34, 35],
    wave: "square",
    percussion: 0.11
  },
  bgm_clear: {
    bpm: 112,
    lead: [72, 76, 79, 84, 83, 79, 81, 84, 88, 86, 84, 79, 81, 84, 88, 91],
    bass: [48, 53, 55, 48, 53, 57, 55, 60],
    wave: "triangle",
    percussion: 0.04
  },
  bgm_alicorn_layer: {
    bpm: 120,
    lead: [84, 88, 91, 88, 86, 89, 93, 89, 84, 88, 91, 96, 93, 91, 88, 86],
    bass: [72, 76, 77, 79, 72, 76, 77, 79],
    wave: "sine",
    percussion: 0.025
  }
};

const renderTrack = (track, seed) => {
  const beatSeconds = 60 / track.bpm / 2;
  const duration = track.lead.length * beatSeconds;
  const length = Math.ceil(duration * sampleRate);
  const samples = new Float32Array(length);
  let noiseState = seed | 0;
  for (let index = 0; index < length; index += 1) {
    const time = index / sampleRate;
    const beat = Math.min(track.lead.length - 1, Math.floor(time / beatSeconds));
    const local = time - beat * beatSeconds;
    const leadNote = track.lead[beat];
    const bassNote = track.bass[Math.floor(beat / 2) % track.bass.length];
    const beatEnvelope = envelope(local, beatSeconds, 0.018, 0.06);
    let value = leadNote === null ? 0 : waveAt(track.wave, time * midi(leadNote) * Math.PI * 2) * 0.18 * beatEnvelope;
    value += Math.sin(time * midi(bassNote) * Math.PI * 2) * 0.17 * beatEnvelope;
    value += Math.sin(time * midi(bassNote + 7) * Math.PI * 2) * 0.06 * beatEnvelope;

    noiseState ^= noiseState << 13;
    noiseState ^= noiseState >>> 17;
    noiseState ^= noiseState << 5;
    const noise = ((noiseState >>> 0) / 0xffffffff) * 2 - 1;
    const percussionEnvelope = Math.exp(-local * 34);
    value += noise * track.percussion * percussionEnvelope;

    const edge = Math.min(1, time / 0.018, (duration - time) / 0.018);
    samples[index] = Math.tanh(value * 1.4) * masterGain * Math.max(0, edge);
  }
  return samples;
};

const wavBuffer = (samples) => {
  const dataBytes = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataBytes, 40);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + index * 2);
  }
  return buffer;
};

const writeAudio = (relativePath, samples) => {
  const output = join(root, relativePath);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, wavBuffer(samples));
};

Object.entries(sfx).forEach(([key, recipe], index) => {
  writeAudio(`assets/audio/sfx/${key}.wav`, renderSfx(recipe, 8901 + index * 97));
});

Object.entries(tracks).forEach(([key, track], index) => {
  writeAudio(`assets/audio/bgm/${key}.wav`, renderTrack(track, 1989 + index * 131));
});

console.log(`오디오 생성 완료: SFX ${Object.keys(sfx).length}개, BGM ${Object.keys(tracks).length}개, ${sampleRate}Hz mono PCM WAV`);
