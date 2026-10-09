import assert from "node:assert/strict";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { CHARACTER_LIST, getCharacter } from "../src/data/characters.js";
import { getCharacterAnimationSpec, getCharacterAnimationVariants, getCharacterSequenceNames } from "../src/data/characterAnimations.js";
import { CharacterAnimationManager } from "../src/systems/CharacterAnimationManager.js";
import { PlayerStateMachine } from "../src/systems/PlayerStateMachine.js";

const character = getCharacter("silsea");
const played = [];
const sprite = {
  scene: { anims: { exists: () => true } },
  anims: { currentAnim: null, isPlaying: false },
  play(key) { played.push(key); this.anims.currentAnim = { key }; }
};
CharacterAnimationManager.play(sprite, character, "jump");
for (let i = 0; i < 120; i++) CharacterAnimationManager.play(sprite, character, "jump");
assert.equal(played.length, 1, "완료된 점프는 매 업데이트마다 다시 시작하면 안 됨");
CharacterAnimationManager.play(sprite, character, "fall");
assert.equal(played.length, 2, "정점을 지나면 낙하 자세로 전환해야 함");
CharacterAnimationManager.play(sprite, character, "jump", false);
assert.equal(played.length, 3, "명시적인 다음 점프는 재생할 수 있어야 함");
CharacterAnimationManager.play(sprite, character, "jump", true, "unicorn");
assert.equal(played.at(-1), "character:silsea:unicorn:jump", "동작이 같아도 변신 텍스처는 전환해야 함");

const state = new PlayerStateMachine();
state.updateFromBody({ blocked: { down: true }, touching: { down: true }, velocity: { y: -720 } });
assert.equal(state.state, "rising", "점프 직후 남은 접촉 플래그로 지상 자세를 표시하면 안 됨");
state.updateFromBody({ blocked: {}, touching: {}, velocity: { y: 0 } });
assert.equal(state.state, "falling");
state.updateFromBody({ blocked: { down: true }, touching: {}, velocity: { y: 0 } });
assert.equal(state.state, "grounded");
assert.equal(getCharacterAnimationSpec("silsea", "fall").repeat, 0);
assert.ok(getCharacterAnimationSpec("silsea", "idle").durationMs >= 3000);

// The reported defect is visual: assert pixel stability, not just equal PNG
// dimensions. Only the authored eye patch may change, in both visual forms.
const idleCases = [
  { characterId: "silsea", eye: { left: 93, top: 35, right: 110, bottom: 51 } },
  { characterId: "potato89", eye: { left: 76, top: 40, right: 97, bottom: 68 } },
  { characterId: "sylvia", eye: { left: 92, top: 32, right: 105, bottom: 47 } }
];
for (const { characterId, eye } of idleCases) for (const prefix of [characterId, `${characterId}_unicorn`]) {
  const frames = [];
  const path = new URL(`../assets/characters/${characterId}/${prefix}_idle.png`, import.meta.url);
  for (let i = 0; i < 4; i++) frames.push(await sharp(fileURLToPath(path))
    .extract({ left: i * 128, top: 0, width: 128, height: 128 }).ensureAlpha().raw().toBuffer());
  let changedEyePixels = 0;
  for (let i = 1; i < frames.length; i++) {
    for (let p = 0; p < 128 * 128; p++) {
      const x = p % 128, y = Math.floor(p / 128);
      if (frames[0][p * 4 + 3] === 0 && frames[i][p * 4 + 3] === 0) continue;
      const changed = frames[0].subarray(p * 4, p * 4 + 4).compare(frames[i].subarray(p * 4, p * 4 + 4)) !== 0;
      if (!changed) continue;
      assert.ok(x >= eye.left && x < eye.right && y >= eye.top && y < eye.bottom, `${prefix} 대기 프레임 ${i}: 눈 밖의 몸체가 변경됨 (${x},${y})`);
      changedEyePixels++;
    }
  }
  assert.ok(changedEyePixels > 0, `${prefix} 눈 깜빡임이 있어야 함`);
}
for (const { id } of CHARACTER_LIST) {
  assert.equal(getCharacter(id).animation.stableBody, true, `${id} 점프/착지에서 몸체 크기 보존 필요`);
  assert.equal(getCharacterAnimationSpec(id, "fall").repeat, 0);
  assert.ok(getCharacterAnimationSpec(id, "idle").durationMs >= 3000);
}
assert.equal(getCharacter("sylvia").sex, "female");
assert.equal(getCharacter("silsea").sex, "male");
assert.ok(!getCharacter("sylvia").description.includes("소년"));
assert.ok(getCharacterAnimationSpec("potato89", "move").durationMs > getCharacterAnimationSpec("silsea", "move").durationMs);

// Check every authored pony pose, including stomp, guard and swim, against
// its runtime strip. This catches stale sheets and cropped hooves/wing tips.
for (const [characterId, expectedCount] of [["potato89", 66], ["sylvia", 62]]) {
  const { sequences } = JSON.parse(await readFile(new URL(`../assets/_source/${characterId}-animation/frames.json`, import.meta.url), "utf8"));
  assert.equal(Object.values(sequences).reduce((n, count) => n + count, 0), expectedCount);
  const airborne = new Set(["jump_up", "fall", "fly", "swim", "wing_guard", "transform_pegasus"]);
  for (const [sequence, count] of Object.entries(sequences)) {
    const sheetPath = fileURLToPath(new URL(`../assets/characters/${characterId}/${characterId}_${sequence}.png`, import.meta.url));
    for (let i = 0; i < count; i++) {
      const framePath = fileURLToPath(new URL(`../assets/characters/${characterId}/${sequence}/${characterId}_${sequence}_${String(i).padStart(2, "0")}.png`, import.meta.url));
      const raw = await sharp(framePath).ensureAlpha().raw().toBuffer();
      const packed = await sharp(sheetPath).extract({ left: i * 128, top: 0, width: 128, height: 128 }).ensureAlpha().raw().toBuffer();
      for (let p = 0; p < raw.length; p += 4) {
        assert.equal(packed[p + 3], raw[p + 3], `${sequence}/${i}: 시트 투명도 불일치`);
        // Alpha compositing may round a color channel by one display level.
        for (let c = 0; c < 3; c++) assert.ok(Math.abs(packed[p + c] - raw[p + c]) * raw[p + 3] / 255 <= 1,
          `${sequence}/${i}: 런타임 시트가 개별 프레임과 다름 (${p / 4})`);
      }
      let minX = 128, maxX = 0, minY = 128, maxY = 0;
      for (let p = 0; p < raw.length; p += 4) {
        if (raw[p + 3] < 16) continue;
        const x = (p / 4) % 128, y = Math.floor(p / 4 / 128);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      assert.ok(minX >= 8 && maxX <= 119 && minY >= 2 && maxY <= 125, `${sequence}/${i}: 스프라이트가 가장자리에 잘림`);
      if (!airborne.has(sequence)) assert.ok(Math.abs(maxY - 111) <= 2, `${sequence}/${i}: 지상 발 기준선 불일치`);
    }
  }
}
for (const { id } of CHARACTER_LIST) {
  assert.equal(getCharacter(id).render.integratedWings, true, `${id}: 날개는 동작 프레임에 통합되어야 함`);
  const visualForms = [];
  for (const variant of getCharacterAnimationVariants(id)) {
    visualForms.push(await sharp(fileURLToPath(new URL(`../assets/characters/${id}/${id}${variant === "base" ? "" : `_${variant}`}_idle.png`, import.meta.url)))
      .extract({ left: 0, top: 0, width: 128, height: 128 }).raw().toBuffer());
    if (!["sunlight", "moonlight", "alora", "oceandream", "aurora"].includes(id) && (variant === "base" || variant === "unicorn")) continue;
    for (const sequence of getCharacterSequenceNames(id)) {
    const spec = getCharacterAnimationSpec(id, sequence, variant);
    if (!spec || (variant !== "base" && !spec.textureKey.startsWith(`${id}_${variant}_`))) continue;
    const path = fileURLToPath(new URL(`../assets/characters/${id}/${spec.textureKey}.png`, import.meta.url));
    const frames = [];
    for (let i = 0; i < spec.durations.length; i++) {
      const raw = await sharp(path).extract({ left: i * 128, top: 0, width: 128, height: 128 }).ensureAlpha().raw().toBuffer();
      frames.push(raw);
      let opaque = 0, bottom = 0;
      for (let p = 0; p < raw.length; p += 4) {
        if (raw[p + 3] < 16) continue;
        const x = p / 4 % 128, y = Math.floor(p / 4 / 128);
        assert.ok(x >= 8 && x <= 119 && y >= 2 && y <= 113, `${id}/${sequence}/${i}: 날개·뿔·발 여백`);
        opaque++;
        bottom = Math.max(bottom, y);
      }
      assert.ok(opaque > 1000, `${id}/${sequence}/${i}: 비어 있는 프레임`);
      assert.ok(Math.abs(bottom - 111) <= 2, `${id}/${variant}/${sequence}/${i}: 발 기준선`);
    }
    if (sequence === "move" || sequence === "fly") {
      assert.ok(new Set(frames.map(frame => frame.toString("base64"))).size >= 3, `${id}/${sequence}: 서로 다른 관절 포즈 필요`);
    }
    }
  }
  assert.equal(new Set(visualForms.map(frame => frame.toString("base64"))).size, 4, `${id}: 기본·뿔·날개·뿔+날개 원화가 각각 달라야 함`);
}
console.log(`캐릭터 애니메이션 회귀 테스트 통과: ${CHARACTER_LIST.length}인 동작·전원 4형태 전용 시트·날갯짓·대기 픽셀 안정성·변신 전환`);
