import assert from "node:assert/strict";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
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
for (const prefix of ["silsea", "silsea_unicorn"]) {
  const frames = [];
  const path = new URL(`../assets/characters/silsea/${prefix}_idle.png`, import.meta.url);
  for (let i = 0; i < 4; i++) frames.push(await sharp(fileURLToPath(path))
    .extract({ left: i * 128, top: 0, width: 128, height: 128 }).ensureAlpha().raw().toBuffer());
  let changedEyePixels = 0;
  for (let i = 1; i < frames.length; i++) {
    for (let p = 0; p < 128 * 128; p++) {
      const x = p % 128, y = Math.floor(p / 128);
      if (frames[0][p * 4 + 3] === 0 && frames[i][p * 4 + 3] === 0) continue;
      const changed = frames[0].subarray(p * 4, p * 4 + 4).compare(frames[i].subarray(p * 4, p * 4 + 4)) !== 0;
      if (!changed) continue;
      assert.ok(x >= 93 && x < 110 && y >= 37 && y < 53, `${prefix} 대기 프레임 ${i}: 눈 밖의 몸체가 변경됨 (${x},${y})`);
      changedEyePixels++;
    }
  }
  assert.ok(changedEyePixels > 0, `${prefix} 눈 깜빡임이 있어야 함`);
}
console.log("캐릭터 애니메이션 회귀 테스트 통과: 대기 픽셀 안정성·눈 깜빡임·점프 접촉·단발 자세 유지·변신 전환");
