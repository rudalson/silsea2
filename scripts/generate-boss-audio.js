import { BOSS_SFX_KEYS } from "../src/data/bossAudio.js";
import { generateSfx } from "./generate-audio.js";

console.log(`보스 효과음 생성 완료: ${generateSfx(BOSS_SFX_KEYS)}개 WAV (기존 음악·효과음 보존)`);
