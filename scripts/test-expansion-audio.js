import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { EXPANSION_BGM, EXPANSION_BGM_KEYS } from "../src/data/expansionAudio.js";
import { LEVELS } from "../src/data/levels/index.js";
import { EXPANSION_SONGS } from "./lib/expansion-bgm.js";
import { readOggVorbis } from "./lib/audio-metadata.js";
import { generateBgm, renderBgmPcm } from "./generate-bgm.js";

const manifest = JSON.parse(readFileSync("assets/manifest.json", "utf8"));
const expectedIds = ["level-07", "level-08", "level-09", "level-10", "level-11"];
assert.deepEqual(Object.keys(EXPANSION_BGM), expectedIds);
assert.deepEqual(Object.keys(EXPANSION_SONGS), EXPANSION_BGM_KEYS);
assert.equal(new Set(EXPANSION_BGM_KEYS).size, 10);
assert.throws(() => generateBgm(["bgm_unknown"]), /알 수 없는 BGM/);
assert.throws(() => readOggVorbis(Buffer.from("broken")), /OGG/);
for (const [index, id] of expectedIds.entries()) {
  const level = LEVELS.find(level => level.id === id);
  assert.equal(level.order, index + 6);
  assert.deepEqual(level.assets.bgm, { ...EXPANSION_BGM[id], clear: "bgm_clear" });
}
assert.deepEqual(LEVELS.slice(0, 5).map(level => level.assets.bgm.field),
  ["bgm_rainbow_hill", "bgm_starlight", "bgm_mist", "bgm_tsunami", "bgm_submerged"]);
const sourceHashes = new Set(), assetHashes = new Set();
for (const key of EXPANSION_BGM_KEYS) {
  const song = EXPANSION_SONGS[key];
  for (const phrase of [song.melody, song.answer]) assert.equal(phrase.reduce((sum, note) => sum + note.steps, 0), 8, `${key}: 한 마디 길이`);
  const seconds = 16 * 4 * 60 / song.bpm;
  const entry = manifest.assets.find(entry => entry.key === key);
  assert.equal(entry?.type, "audio");
  assert.equal(entry.url, `/assets/audio/bgm/${key}.ogg`);
  const encoded = readFileSync(`.${entry.url}`), info = readOggVorbis(encoded);
  assert.equal(info.channels, 1); assert.equal(info.rate, 22050);
  assert.ok(Math.abs(info.duration - seconds) < 1 / 22050, `${key}: 인코딩 길이`);
  assetHashes.add(createHash("sha256").update(encoded).digest("hex"));
  const pcm = renderBgmPcm(key), samples = pcm.length / 2;
  sourceHashes.add(createHash("sha256").update(pcm).digest("hex"));
  assert.equal(samples, Math.round(seconds * 22050));
  let sum = 0, energy = 0, peak = 0;
  for (let i = 0; i < samples; i++) {
    const value = pcm.readInt16LE(i * 2) / 32768;
    sum += value; energy += value * value; peak = Math.max(peak, Math.abs(value));
  }
  const rms = Math.sqrt(energy / samples);
  const seam = Math.abs(pcm.readInt16LE(0) - pcm.readInt16LE(pcm.length - 2)) / 32768;
  assert.ok(peak < 0.98 && rms > 0.02 && rms < 0.3, `${key}: 클리핑·과도/무음 볼륨 (peak ${peak}, RMS ${rms})`);
  assert.ok(Math.abs(sum / samples) < 0.003, `${key}: DC 편향`);
  assert.ok(seam < 0.001, `${key}: 반복 경계 클릭`);
  console.log(`${key}: ${song.bpm} BPM, ${seconds.toFixed(2)}s, RMS ${rms.toFixed(3)}, peak ${peak.toFixed(3)}`);
  if (process.argv.includes("--decode")) {
    const result = spawnSync("ffmpeg", ["-v", "error", "-i", `.${entry.url}`, "-f", "f32le", "-acodec", "pcm_f32le", "pipe:1"], { maxBuffer: 16 * 1024 * 1024 });
    assert.equal(result.status, 0, `${key}: FFmpeg 디코딩 ${result.error?.message ?? result.stderr?.toString()}`);
    const decoded = result.stdout, count = decoded.length / 4;
    assert.ok(Math.abs(count - samples) < 512, `${key}: 디코딩 길이`);
    let decodedEnergy = 0, decodedPeak = 0;
    for (let i = 0; i < count; i++) {
      const value = decoded.readFloatLE(i * 4); assert.ok(Number.isFinite(value));
      decodedEnergy += value * value; decodedPeak = Math.max(decodedPeak, Math.abs(value));
    }
    const decodedRms = Math.sqrt(decodedEnergy / count);
    const decodedSeam = Math.abs(decoded.readFloatLE(0) - decoded.readFloatLE(decoded.length - 4));
    assert.ok(decodedPeak < 0.98 && decodedRms > 0.02 && Math.abs(decodedRms - rms) < 0.01, `${key}: 배포 OGG 음량·클리핑`);
    assert.ok(decodedSeam < 0.03, `${key}: 배포 OGG 반복 경계 ${decodedSeam}`);
    console.log(`  OGG decoded: RMS ${decodedRms.toFixed(3)}, peak ${decodedPeak.toFixed(3)}, seam ${decodedSeam.toFixed(5)}`);
  }
}
assert.equal(sourceHashes.size, 10); assert.equal(assetHashes.size, 10);
assert.deepEqual(renderBgmPcm("bgm_piano"), renderBgmPcm("bgm_piano"), "동일 악보의 합성 결과 재현");
console.log("신규 BGM 검사 통과: 10개 캠페인·5코스 10곡·악보/OGG 길이·로컬 등록·음량·반복 경계·서로 다른 음원·결정적 합성");
