import { generateBgm } from "./generate-bgm.js";
import { EXPANSION_BGM_KEYS } from "../src/data/expansionAudio.js";

console.log(`신규 코스 BGM 생성 완료: ${generateBgm(EXPANSION_BGM_KEYS)}개 OGG (기존 음악·효과음 보존)`);
