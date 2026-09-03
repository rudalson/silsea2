import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { analyzePlaytestSessions } from "../src/systems/PlaytestManager.js";

const args = process.argv.slice(2);
const jsonOutput = args.includes("--json");
const inputPaths = args.filter((arg) => arg !== "--json");
const formatSeconds = (value) => value === null ? "-" : `${value}초`;

if (!inputPaths.length) {
  console.error("사용법: npm run playtest:analyze -- <내보낸-json> [...] [--json]");
  process.exitCode = 1;
} else {
  const sessionsById = new Map();
  for (const inputPath of inputPaths) {
    const absolutePath = resolve(inputPath);
    let parsed;
    try {
      parsed = JSON.parse(await readFile(absolutePath, "utf8"));
    } catch (error) {
      console.error(`플레이테스트 JSON을 읽지 못했습니다: ${absolutePath}`);
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
      continue;
    }

    const candidates = Array.isArray(parsed)
      ? parsed
      : [parsed.currentSession, ...(Array.isArray(parsed.sessions) ? parsed.sessions : []), parsed]
        .filter((candidate) => candidate?.sessionId);
    for (const session of candidates) sessionsById.set(session.sessionId, session);
  }

  const sessions = [...sessionsById.values()];
  const levelIds = [...new Set(sessions.map(({ levelId }) => levelId).filter(Boolean))].sort();
  const result = {
    sessionCount: sessions.length,
    levels: Object.fromEntries(levelIds.map((levelId) => [
      levelId,
      analyzePlaytestSessions(sessions, levelId)
    ]))
  };

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else if (!sessions.length) {
    console.log("분석할 세션이 없습니다.");
  } else {
    console.log(`플레이테스트 ${sessions.length}개 세션을 합쳤습니다.`);
    for (const [levelId, analysis] of Object.entries(result.levels)) {
      console.log(`\n[${levelId}] 완주 ${analysis.completedCount}회 / 고유 테스터 ${analysis.uniqueCompletedTesters}명`);
      console.log(`- 3인 기준: ${analysis.readyForTuning ? "충족" : `${analysis.remainingTesters}명 부족`}`);
      console.log(`- 일반 평균: ${formatSeconds(analysis.modes.normal.averageSeconds)}, HP 손실 ${analysis.modes.normal.averageHpLosses ?? "-"}`);
      console.log(`- 쉬움 평균: ${formatSeconds(analysis.modes.easy.averageSeconds)}, HP 손실 ${analysis.modes.easy.averageHpLosses ?? "-"}`);
      console.log(`- 기믹: 쓰나미 피격 ${analysis.mechanicTotals.tsunamiHits}, 숨 0 ${analysis.mechanicTotals.breathDepletions}, 투사체 방어 ${analysis.mechanicTotals.projectilesGuarded}, 부활 ${analysis.mechanicTotals.respawns}, 비밀 공간 ${analysis.mechanicTotals.secretsFound}`);
      for (const boss of Object.values(analysis.bosses ?? {})) {
        const phaseTimes = Object.entries(boss.averagePhaseSeconds)
          .map(([phase, seconds]) => `P${phase} ${seconds}초`)
          .join(", ");
        console.log(`- 보스 ${boss.key}: 평균 ${boss.averageSeconds}초 (${phaseTimes || "phase 기록 없음"}), 유효 타격 ${boss.validHits}, 실패 밟기 ${boss.failedHits}, 보스방 HP 손실 ${boss.hpLosses}, 랜덤 결과 ${boss.randomResults}`);
      }
      if (analysis.adjustmentCandidates.length) {
        console.log(`- 2명 이상 공통 조정 후보: ${analysis.adjustmentCandidates.map(({ sectionId }) => sectionId).join(", ")}`);
      } else {
        console.log("- 2명 이상 공통 조정 후보: 없음");
      }
    }
  }
}
