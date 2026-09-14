import assert from "node:assert/strict";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { getCharacter } from "../src/data/characters.js";
import { getCharacterAnimationSpec } from "../src/data/characterAnimations.js";
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
  { characterId: "silsea", eye: { left: 93, top: 37, right: 110, bottom: 53 } },
  { characterId: "potato89", eye: { left: 76, top: 40, right: 97, bottom: 68 } }
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
for (const id of ["silsea", "potato89"]) {
  assert.equal(getCharacter(id).animation.stableBody, true, `${id} 점프/착지에서 몸체 크기 보존 필요`);
  assert.equal(getCharacterAnimationSpec(id, "fall").repeat, 0);
  assert.ok(getCharacterAnimationSpec(id, "idle").durationMs >= 3000);
}
assert.equal(getCharacter("sylvia").animation.stableBody, false);
assert.ok(getCharacterAnimationSpec("potato89", "move").durationMs > getCharacterAnimationSpec("silsea", "move").durationMs);

// Check every authored pony pose, including stomp, guard and swim, against
// its runtime strip. This catches stale sheets and cropped hooves/wing tips.
const { sequences } = JSON.parse(await readFile(new URL("../assets/_source/potato89-animation/frames.json", import.meta.url), "utf8"));
assert.equal(Object.values(sequences).reduce((n, count) => n + count, 0), 66);
const airborne = new Set(["jump_up", "fall", "fly", "swim", "wing_guard", "transform_pegasus"]);
for (const [sequence, count] of Object.entries(sequences)) {
  const sheetPath = fileURLToPath(new URL(`../assets/characters/potato89/potato89_${sequence}.png`, import.meta.url));
  for (let i = 0; i < count; i++) {
    const framePath = fileURLToPath(new URL(`../assets/characters/potato89/${sequence}/potato89_${sequence}_${String(i).padStart(2, "0")}.png`, import.meta.url));
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
console.log("캐릭터 애니메이션 회귀 테스트 통과: 대기 픽셀 안정성·눈 깜빡임·점프 접촉·단발 자세 유지·변신 전환");
