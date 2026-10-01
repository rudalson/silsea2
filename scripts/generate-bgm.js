import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const sampleRate = 22050;
const tau = Math.PI * 2;
const midi = (note) => 440 * 2 ** ((note - 69) / 12);
const note = (pitch, steps = 1) => ({ pitch, steps });
const rest = (steps = 1) => note(null, steps);

// Sixteen bars give each field theme an A / A' / B / A'' arc. The opening
// four-note rise is shared across the campaign, with different modes and timbres.
const songs = {
  bgm_field: {
    bpm: 120, chords: [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]],
    melody: [note(76), note(79), note(81), note(79), note(76, 2), note(74), note(72)],
    answer: [note(77), note(81), note(84), note(81), note(79), note(77), note(76, 2)],
    lead: "marimba", pad: "warm", bass: "round", percussion: 0.48, arp: 0.36
  },
  bgm_starlight: {
    bpm: 96, chords: [[45, 48, 52], [41, 45, 48], [48, 52, 55], [43, 47, 50]],
    melody: [note(76), note(79), note(81, 2), note(79), note(76), note(72, 2)],
    answer: [note(72), note(76), note(79), note(84, 2), note(81), rest(2)],
    lead: "bell", pad: "air", bass: "round", percussion: 0.17, arp: 0.48
  },
  bgm_mist: {
    bpm: 88, chords: [[40, 43, 47], [48, 52, 55], [43, 47, 50], [38, 42, 45]],
    melody: [note(71), note(74), note(76, 2), rest(), note(74), note(71, 2)],
    answer: [note(67), note(71), note(74, 2), note(72), rest(), note(71, 2)],
    lead: "flute", pad: "air", bass: "round", percussion: 0.1, arp: 0.22
  },
  bgm_tsunami: {
    bpm: 112, chords: [[38, 41, 45], [34, 38, 41], [41, 45, 48], [36, 40, 43]],
    melody: [note(74), rest(), note(77), note(81), note(79), rest(), note(77, 2)],
    answer: [note(74), note(77), rest(), note(79), note(81), rest(), note(77, 2)],
    lead: "pluck", pad: "warm", bass: "round", percussion: 0.56, arp: 0.23
  },
  bgm_submerged: {
    bpm: 84, chords: [[45, 48, 52], [41, 45, 48], [48, 52, 55], [43, 47, 50]],
    melody: [note(76, 2), note(79), note(81, 2), note(79), rest(2)],
    answer: [note(72, 2), note(76), note(79, 2), note(76), rest(2)],
    lead: "flute", pad: "air", bass: "round", percussion: 0.07, arp: 0.27
  },
  bgm_boss: {
    bpm: 108, chords: [[38, 41, 45], [36, 40, 43], [34, 38, 41], [36, 40, 43]],
    melody: [note(62), rest(), note(65), note(69), note(67), rest(), note(65, 2)],
    answer: [note(69), note(65), note(62), rest(), note(67), note(65), note(62, 2)],
    lead: "pluck", pad: "warm", bass: "firm", percussion: 0.68, arp: 0.16
  },
  bgm_clear_loop: {
    bpm: 112, bars: 8, chords: [[48, 52, 55], [41, 45, 48], [45, 48, 52], [43, 47, 50]],
    melody: [note(76, 2), note(79), note(81), note(79, 2), rest(2)],
    answer: [note(77, 2), note(76), note(72), note(76, 2), rest(2)],
    lead: "marimba", pad: "warm", bass: "round", percussion: 0.18, arp: 0.31
  }
};

const wrap = (index, length) => (index % length + length) % length;
const addSample = (samples, index, value) => { samples[wrap(index, samples.length)] += value; };

const timbre = (kind, phase, age) => {
  if (kind === "bell") return Math.sin(phase) * 0.72 + Math.sin(phase * 2.01) * 0.19 + Math.sin(phase * 3.94) * 0.09;
  if (kind === "marimba") return Math.sin(phase) * 0.74 + Math.sin(phase * 2) * 0.2 * Math.exp(-age * 8) + Math.sin(phase * 3) * 0.06;
  if (kind === "pluck") return Math.sin(phase) * 0.58 + Math.sin(phase * 2) * 0.29 * Math.exp(-age * 6) + Math.sin(phase * 3) * 0.13 * Math.exp(-age * 10);
  if (kind === "flute") return Math.sin(phase) * 0.87 + Math.sin(phase * 2) * 0.1 + Math.sin(phase * 3) * 0.03;
  if (kind === "air") return Math.sin(phase) * 0.81 + Math.sin(phase * 2) * 0.19;
  return Math.sin(phase) * 0.76 + Math.sin(phase * 2) * 0.19 + Math.sin(phase * 3) * 0.05;
};

const addTone = (samples, pitch, start, held, kind, gain, { echo = false } = {}) => {
  if (pitch == null) return;
  const attack = kind === "air" ? 0.24 : kind === "warm" ? 0.12 : kind === "flute" ? 0.045 : 0.008;
  const release = kind === "air" || kind === "warm" ? 0.38 : kind === "bell" ? 0.5 : 0.14;
  const duration = held + release;
  const count = Math.ceil(duration * sampleRate);
  const startIndex = Math.round(start * sampleRate);
  const frequency = midi(pitch);
  for (let i = 0; i < count; i += 1) {
    const age = i / sampleRate;
    const envelope = Math.min(1, age / attack) * Math.min(1, (duration - age) / release);
    const decay = ["bell", "marimba", "pluck"].includes(kind) ? Math.exp(-age * (kind === "bell" ? 1.7 : 2.6)) : 1;
    const value = timbre(kind, tau * frequency * age, age) * envelope * decay * gain;
    addSample(samples, startIndex + i, value);
    if (echo && i % 2 === 0) addSample(samples, startIndex + i + Math.round(0.19 * sampleRate), value * 0.13);
  }
};

const addPercussion = (samples, start, kind, gain, seed) => {
  const duration = kind === "kick" ? 0.25 : 0.085;
  const count = Math.ceil(duration * sampleRate);
  const startIndex = Math.round(start * sampleRate);
  let state = seed | 0;
  for (let i = 0; i < count; i += 1) {
    const age = i / sampleRate;
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    const noise = (state >>> 0) / 0xffffffff * 2 - 1;
    const envelope = Math.exp(-age * (kind === "kick" ? 17 : 54));
    const value = kind === "kick"
      ? Math.sin(tau * (72 * age - 35 * age * age)) * envelope * gain
      : noise * envelope * gain * (kind === "hat" ? 0.32 : 0.5);
    addSample(samples, startIndex + i, value);
  }
};

const compose = (song) => {
  const bars = song.bars ?? 16;
  const beat = 60 / song.bpm;
  const barDuration = beat * 4;
  const samples = new Float32Array(Math.round(bars * barDuration * sampleRate));
  for (let bar = 0; bar < bars; bar += 1) {
    const start = bar * barDuration;
    const chord = song.chords[bar % song.chords.length];
    const section = Math.floor(bar / 4);
    const useAnswer = section === 2 || (section === 1 && bar % 4 === 3)
      || (section === 3 && bar % 2 === 1);
    const melody = useAnswer ? song.answer : song.melody;
    const leadGain = section === 2 ? 0.125 : section === 3 ? 0.17 : 0.15;
    let step = 0;
    for (const entry of melody) {
      addTone(samples, entry.pitch, start + step * beat / 2, entry.steps * beat / 2 * 0.83,
        song.lead, leadGain, { echo: song.lead === "bell" || song.lead === "flute" });
      step += entry.steps;
    }
    for (const pitch of chord) {
      addTone(samples, pitch + 12, start, barDuration * 0.92, song.pad, section === 2 ? 0.043 : 0.032);
    }
    const bassPitch = chord[0] - 12;
    for (const offset of [0, 2]) {
      addTone(samples, bassPitch, start + offset * beat, beat * 1.5,
        "warm", song.bass === "firm" ? 0.15 : 0.11);
    }
    if (section === 1 || section === 3 || bar % 2 === 1) {
      for (let eighth = 0; eighth < 8; eighth += 1) {
        const pitch = chord[[0, 1, 2, 1, 0, 2, 1, 2][eighth]] + 24;
        addTone(samples, pitch, start + eighth * beat / 2, beat * 0.33,
          song.lead === "flute" ? "bell" : "marimba", song.arp * (section === 3 ? 0.069 : 0.052));
      }
    }
    if (section === 3) {
      addTone(samples, chord[2] + 24, start + beat, beat * 1.5, "bell", 0.024);
    }
    const percussionGain = song.percussion * [0.75, 0.9, 0.57, 1][section];
    for (let pulse = 0; pulse < 4; pulse += 1) {
      const t = start + pulse * beat;
      if (pulse % 2 === 0) addPercussion(samples, t, "kick", percussionGain * 0.19, 1701 + bar * 13 + pulse);
      if (pulse === 1 || pulse === 3) addPercussion(samples, t, "rim", percussionGain * 0.09, 2803 + bar * 17 + pulse);
      if (song.percussion > 0.12) {
        addPercussion(samples, t, "hat", percussionGain * 0.11, 3907 + bar * 23 + pulse);
        addPercussion(samples, t + beat / 2, "hat", percussionGain * 0.07, 4909 + bar * 29 + pulse);
      }
    }
  }
  return finish(samples);
};

const finish = (samples, loop = true) => {
  // Ease the final samples toward the opening sample to prevent a loop click.
  if (loop) {
    const seam = Math.round(sampleRate * 0.014);
    for (let i = 0; i < seam; i += 1) {
      const mix = (i + 1) / seam;
      const index = samples.length - seam + i;
      samples[index] = samples[index] * (1 - mix) + samples[0] * mix;
    }
  }
  const pcm = Buffer.allocUnsafe(samples.length * 2);
  for (let i = 0; i < samples.length; i += 1) {
    pcm.writeInt16LE(Math.round(Math.tanh(samples[i] * 1.35) * 32760), i * 2);
  }
  return pcm;
};

const composeFanfare = () => {
  const seconds = 60 / 112;
  const samples = new Float32Array(Math.round(seconds * 12 * sampleRate));
  const melody = [72, 76, 79, 84, 79, 81, 84, 88];
  for (let i = 0; i < melody.length; i += 1) {
    addTone(samples, melody[i], i * seconds / 2, seconds * (i === 7 ? 2.5 : 0.44),
      "bell", 0.19, { echo: true });
  }
  for (const pitch of [48, 52, 55]) addTone(samples, pitch + 12, seconds * 2, seconds * 5.3, "warm", 0.052);
  addPercussion(samples, seconds * 2, "kick", 0.1, 7459);
  // The one-shot ends at a natural quiet point before the result loop begins.
  return finish(samples, false);
};

const composeAlicorn = () => {
  const seconds = 8;
  const samples = new Float32Array(seconds * sampleRate);
  let state = 91301;
  let smooth = 0;
  for (let i = 0; i < samples.length; i += 1) {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    const noise = (state >>> 0) / 0xffffffff * 2 - 1;
    smooth += (noise - smooth) * 0.015;
    const time = i / sampleRate;
    const swell = 0.64 + 0.36 * Math.sin(tau * time / 8 - Math.PI / 2);
    samples[i] = smooth * swell * 0.9;
  }
  // Non-metric, inharmonic sparkles do not fight the 84–120 BPM stage music.
  for (const [at, frequency] of [[0.7, 1781], [2.2, 2327], [3.9, 1987], [5.5, 2593], [7.1, 2141]]) {
    const start = Math.round(at * sampleRate);
    for (let i = 0; i < sampleRate * 0.45; i += 1) {
      const age = i / sampleRate;
      addSample(samples, start + i,
        Math.sin(tau * frequency * age) * Math.exp(-age * 13) * 0.18);
    }
  }
  return finish(samples);
};

const canonicalizeOgg = (path, key) => {
  // FFmpeg chooses a random Ogg stream serial. Fix it and recalculate each
  // page checksum so `npm run audio` produces identical committed assets.
  const buffer = readFileSync(path);
  let serial = 2166136261;
  for (const character of key) serial = Math.imul(serial ^ character.charCodeAt(0), 16777619) >>> 0;
  let offset = 0;
  while (offset < buffer.length) {
    if (buffer.toString("ascii", offset, offset + 4) !== "OggS") throw new Error(`${key}: 잘못된 OGG 페이지`);
    const tableEnd = offset + 27 + buffer[offset + 26];
    let payloadBytes = 0;
    for (let i = offset + 27; i < tableEnd; i += 1) payloadBytes += buffer[i];
    const pageEnd = tableEnd + payloadBytes;
    if (pageEnd > buffer.length) throw new Error(`${key}: 잘린 OGG 페이지`);
    buffer.writeUInt32LE(serial, offset + 14);
    buffer.writeUInt32LE(0, offset + 22);
    let crc = 0;
    for (let i = offset; i < pageEnd; i += 1) {
      crc = (crc ^ (buffer[i] << 24)) >>> 0;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = ((crc << 1) ^ ((crc & 0x80000000) ? 0x04c11db7 : 0)) >>> 0;
      }
    }
    buffer.writeUInt32LE(crc, offset + 22);
    offset = pageEnd;
  }
  writeFileSync(path, buffer);
};

const encode = (key, pcm) => {
  const path = join(root, "assets", "audio", "bgm", `${key}.ogg`);
  mkdirSync(join(root, "assets", "audio", "bgm"), { recursive: true });
  const result = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y",
    "-f", "s16le", "-ar", String(sampleRate), "-ac", "1", "-i", "pipe:0",
    "-c:a", "libvorbis", "-q:a", "5", path], { input: pcm, maxBuffer: 1024 * 1024 });
  if (result.error || result.status !== 0) {
    throw new Error(`ffmpeg OGG 인코딩 실패 (${key}): ${result.error?.message ?? result.stderr?.toString()}`);
  }
  canonicalizeOgg(path, key);
};

export const generateBgm = () => {
  for (const [key, song] of Object.entries(songs)) encode(key, compose(song));
  encode("bgm_clear", composeFanfare());
  encode("bgm_alicorn_layer", composeAlicorn());
  return Object.keys(songs).length + 2;
};
