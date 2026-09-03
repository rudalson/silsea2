import { EVENTS } from "../config/constants.js";
import { getNormalizedProgress, getProgressionDirection } from "../data/schema/levelSchema.js";

export const PLAYTEST_STORAGE_KEY = "silsea:playtests:v2";
export const PLAYTEST_LEGACY_STORAGE_KEY = "silsea:playtests:v1";
export const PLAYTEST_SCHEMA_VERSION = 2;
export const PLAYTEST_STALL_SECONDS = 20;
export const PLAYTEST_DURATION_TARGETS = Object.freeze({
  normal: Object.freeze({ minSeconds: 360, maxSeconds: 540 }),
  easy: Object.freeze({ minSeconds: 300, maxSeconds: 480 })
});

const MAX_STORED_SESSIONS = 24;
const MAX_EVENTS_PER_SESSION = 320;
const PROGRESS_RESET_DISTANCE = 96;
let memoryReports = [];

const clone = (value) => JSON.parse(JSON.stringify(value));
const roundSeconds = (value) => Math.round(Math.max(0, Number(value) || 0) * 10) / 10;

export const sanitizeTesterId = (value) => {
  const normalized = String(value ?? "anonymous")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return normalized || "anonymous";
};

const parseReports = (value) => {
  try {
    const parsed = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const readReports = (storage) => {
  try {
    const current = parseReports(storage?.getItem(PLAYTEST_STORAGE_KEY));
    const legacy = parseReports(storage?.getItem(PLAYTEST_LEGACY_STORAGE_KEY));
    const reports = [...new Map([...legacy, ...current].map((report) => [report.sessionId, report])).values()];
    return reports.length ? reports : [...memoryReports];
  } catch {
    return [...memoryReports];
  }
};

const writeReports = (storage, reports) => {
  memoryReports = reports;
  try {
    storage?.setItem(PLAYTEST_STORAGE_KEY, JSON.stringify(reports));
  } catch {
    // Memory reports remain available when browser storage is blocked.
  }
};

export function analyzePlaytestSessions(sessions, levelId) {
  const reports = sessions.filter((report) => !levelId || report.levelId === levelId);
  const completed = reports.filter(({ completed: value }) => value);
  const testerIds = new Set(completed.map(({ testerId }) => testerId));
  const modeSummary = Object.fromEntries(Object.entries(PLAYTEST_DURATION_TARGETS).map(([mode, target]) => {
    const modeReports = completed.filter((report) => report.mode === mode);
    const durations = modeReports.map(({ durationSeconds }) => durationSeconds);
    const hpLosses = modeReports.map((report) => Number(report.metrics?.hpLosses) || 0);
    return [mode, {
      ...target,
      count: modeReports.length,
      averageSeconds: durations.length
        ? roundSeconds(durations.reduce((total, value) => total + value, 0) / durations.length)
        : null,
      averageHpLosses: hpLosses.length
        ? roundSeconds(hpLosses.reduce((total, value) => total + value, 0) / hpLosses.length)
        : null,
      withinTarget: modeReports.length > 0
        && durations.every((duration) => duration >= target.minSeconds && duration <= target.maxSeconds)
    }];
  }));

  const mechanicTotals = reports.reduce((totals, report) => {
    totals.tsunamiHits += Number(report.metrics?.tsunamiHits) || 0;
    totals.breathDepletions += Number(report.metrics?.breathDepletions) || 0;
    totals.projectilesGuarded += Number(report.metrics?.projectilesGuarded) || 0;
    totals.respawns += Number(report.metrics?.respawns) || 0;
    totals.bossHits += Number(report.metrics?.bossHits) || 0;
    totals.bossFailedHits += Number(report.metrics?.bossFailedHits) || 0;
    totals.bossHpLosses += Number(report.metrics?.bossHpLosses) || 0;
    totals.randomResults += (report.events ?? []).filter(({ type }) => type === "random_boss_result").length;
    return totals;
  }, {
    tsunamiHits: 0,
    breathDepletions: 0,
    projectilesGuarded: 0,
    respawns: 0,
    bossHits: 0,
    bossFailedHits: 0,
    bossHpLosses: 0,
    randomResults: 0
  });

  const hotspots = new Map();
  for (const report of reports) {
    for (const event of report.events ?? []) {
      if (!["hit", "fall", "stall"].includes(event.type) || !event.sectionId) continue;
      const entry = hotspots.get(event.sectionId) ?? {
        sectionId: event.sectionId,
        hits: 0,
        falls: 0,
        stalls: 0,
        affectedTesters: new Set()
      };
      if (event.type === "hit") entry.hits += 1;
      if (event.type === "fall") entry.falls += 1;
      if (event.type === "stall") entry.stalls += 1;
      entry.affectedTesters.add(report.testerId);
      hotspots.set(event.sectionId, entry);
    }
  }

  const hotspotSummary = [...hotspots.values()]
    .map((entry) => ({
      sectionId: entry.sectionId,
      hits: entry.hits,
      falls: entry.falls,
      stalls: entry.stalls,
      affectedTesters: entry.affectedTesters.size,
      needsAdjustment: entry.affectedTesters.size >= 2
    }))
    .sort((left, right) => (
      Number(right.needsAdjustment) - Number(left.needsAdjustment)
      || right.affectedTesters - left.affectedTesters
      || (right.hits + right.falls + right.stalls) - (left.hits + left.falls + left.stalls)
    ));

  const bossEntries = new Map();
  for (const report of completed) {
    const key = report.boss?.key;
    if (!key) continue;
    const entry = bossEntries.get(key) ?? {
      key,
      sessionCount: 0,
      encounterSeconds: 0,
      phaseSeconds: {},
      validHits: 0,
      failedHits: 0,
      hpLosses: 0,
      randomResults: 0
    };
    entry.sessionCount += 1;
    for (const [phase, seconds] of Object.entries(report.boss?.phaseSeconds ?? {})) {
      const value = Math.max(0, Number(seconds) || 0);
      entry.encounterSeconds += value;
      entry.phaseSeconds[phase] = (entry.phaseSeconds[phase] ?? 0) + value;
    }
    entry.validHits += Number(report.metrics?.bossHits) || 0;
    entry.failedHits += Number(report.metrics?.bossFailedHits) || 0;
    entry.hpLosses += Number(report.metrics?.bossHpLosses) || 0;
    entry.randomResults += (report.events ?? []).filter(({ type }) => type === "random_boss_result").length;
    bossEntries.set(key, entry);
  }
  const bosses = Object.fromEntries([...bossEntries.entries()].sort().map(([key, entry]) => [key, {
    key,
    sessionCount: entry.sessionCount,
    averageSeconds: roundSeconds(entry.encounterSeconds / entry.sessionCount),
    averagePhaseSeconds: Object.fromEntries(Object.entries(entry.phaseSeconds).map(([phase, seconds]) => [
      phase,
      roundSeconds(seconds / entry.sessionCount)
    ])),
    validHits: entry.validHits,
    failedHits: entry.failedHits,
    hpLosses: entry.hpLosses,
    randomResults: entry.randomResults
  }]));

  return {
    levelId: levelId ?? null,
    sessionCount: reports.length,
    completedCount: completed.length,
    uniqueCompletedTesters: testerIds.size,
    remainingTesters: Math.max(0, 3 - testerIds.size),
    readyForTuning: testerIds.size >= 3,
    durationCoverageComplete: modeSummary.normal.count > 0 && modeSummary.easy.count > 0,
    durationPass: modeSummary.normal.withinTarget && modeSummary.easy.withinTarget,
    modes: modeSummary,
    mechanicTotals,
    bosses,
    hotspots: hotspotSummary,
    adjustmentCandidates: hotspotSummary.filter(({ needsAdjustment }) => needsAdjustment)
  };
}

export class PlaytestManager {
  constructor(scene, player, {
    enabled = false,
    testerId = "anonymous",
    level,
    characterId,
    easyMode = false,
    persistIncomplete = true,
    storage = globalThis.localStorage,
    now = () => Date.now()
  } = {}) {
    this.scene = scene;
    this.player = player;
    this.enabled = Boolean(enabled && level);
    this.level = level;
    this.storage = storage;
    this.now = now;
    this.persistIncompleteOnDestroy = Boolean(persistIncomplete);
    this.finalized = false;
    this.lastElapsed = 0;
    this.currentSectionId = null;
    this.spawnX = level?.player?.spawn?.x ?? player?.x ?? 0;
    this.progressionDirection = getProgressionDirection(level);
    this.progressAnchor = getNormalizedProgress(player?.x ?? this.spawnX, this.spawnX, level);
    this.lastProgressAt = 0;
    this.stallArmed = true;
    this.breathDepleted = false;
    this.bossPhaseSeconds = {};
    this.handlers = [];

    if (!this.enabled) return;
    const timestamp = this.now();
    this.report = {
      schemaVersion: PLAYTEST_SCHEMA_VERSION,
      sessionId: `${sanitizeTesterId(testerId)}-${timestamp}`,
      testerId: sanitizeTesterId(testerId),
      levelId: level.id,
      characterId,
      mode: easyMode ? "easy" : "normal",
      progressionDirection: this.progressionDirection,
      startedAt: new Date(timestamp).toISOString(),
      completed: false,
      durationSeconds: 0,
      score: 0,
      achieved: [],
      boss: {
        key: level.sections.find(({ type }) => type === "boss")?.boss?.key ?? null,
        phaseSeconds: {}
      },
      metrics: {
        hits: 0,
        falls: 0,
        respawns: 0,
        checkpoints: 0,
        bossHits: 0,
        bossFailedHits: 0,
        bossHpLosses: 0,
        hpLosses: 0,
        tsunamiHits: 0,
        breathDepletions: 0,
        projectilesGuarded: 0,
        stalls: 0,
        maxProgress: this.progressAnchor,
        maxProgressX: Math.round(player?.x ?? 0)
      },
      sections: {},
      events: []
    };
    this.bindEvents();
  }

  bindEvents() {
    const bind = (event, handler) => {
      this.scene.events.on(event, handler);
      this.handlers.push([event, handler]);
    };
    bind(EVENTS.PLAYER_HIT, (details = {}) => {
      if (!this.enabled || this.finalized) return;
      this.recordOutcome("hit", "hits", details);
      this.report.metrics.hpLosses += 1;
      if (this.getSectionAt(this.player?.x)?.type === "boss") this.report.metrics.bossHpLosses += 1;
      if (details.type === "tsunami") this.report.metrics.tsunamiHits += 1;
    });
    bind(EVENTS.PLAYER_FELL, (details = {}) => {
      if (!this.enabled || this.finalized) return;
      this.recordOutcome("fall", "falls", details);
      this.report.metrics.hpLosses += Math.max(0, Number(details.hpLost) || 0);
    });
    bind(EVENTS.PLAYER_RESPAWNED, (details = {}) => this.recordOutcome("respawn", "respawns", details));
    bind(EVENTS.CHECKPOINT, (details = {}) => this.recordOutcome("checkpoint", "checkpoints", { id: details.id }));
    bind(EVENTS.BOSS_HIT, (details = {}) => this.recordOutcome("boss_hit", "bossHits", details));
    bind(EVENTS.BOSS_HIT_ATTEMPT, (details = {}) => (
      this.recordOutcome("boss_hit_attempt", "bossFailedHits", details)
    ));
    bind(EVENTS.BOSS_DEFEATED, (details = {}) => this.recordEvent("boss_defeated", details));
    bind(EVENTS.RANDOM_BOSS_RESULT, (details = {}) => this.recordEvent("random_boss_result", details));
    bind(EVENTS.RANDOM_BOSS_REPLAY, (details = {}) => this.recordEvent("random_boss_replay", details));
    bind(EVENTS.RANDOM_BOSS_ATTACK, (details = {}) => this.recordEvent("random_boss_attack", details));
    bind(EVENTS.BREATH_CHANGED, (details = {}) => {
      if (!this.enabled || this.finalized) return;
      const depleted = Boolean(details.depleted);
      if (depleted && !this.breathDepleted) {
        this.report.metrics.breathDepletions += 1;
        this.recordEvent("breath_depleted", details);
      }
      this.breathDepleted = depleted;
    });
    bind(EVENTS.PROJECTILE_GUARDED, (details = {}) => {
      if (!this.enabled || this.finalized) return;
      this.report.metrics.projectilesGuarded += 1;
      this.recordEvent("projectile_guarded", details);
    });
  }

  update(elapsedSeconds, player = this.player) {
    if (!this.enabled || this.finalized || !player) return;
    const elapsed = Math.max(this.lastElapsed, Number(elapsedSeconds) || 0);
    const section = this.getSectionAt(player.x);
    const sectionId = section?.id ?? "unknown";
    const delta = Math.max(0, elapsed - this.lastElapsed);
    if (this.currentSectionId) this.ensureSection(this.currentSectionId).seconds += delta;

    if (section?.type === "boss") {
      const boss = this.scene.levelLoader?.boss;
      const bossKey = boss?.getData?.("key") ?? section.boss?.key ?? this.report.boss.key;
      const phase = String(boss?.getData?.("phase") ?? 1);
      this.report.boss.key = bossKey;
      this.bossPhaseSeconds[phase] = (this.bossPhaseSeconds[phase] ?? 0) + delta;
      this.report.boss.phaseSeconds[phase] = roundSeconds(this.bossPhaseSeconds[phase]);
    }

    if (sectionId !== this.currentSectionId) {
      this.currentSectionId = sectionId;
      const stats = this.ensureSection(sectionId);
      stats.entries += 1;
      this.progressAnchor = getNormalizedProgress(player.x, this.spawnX, this.level);
      this.lastProgressAt = elapsed;
      this.stallArmed = true;
      this.recordEvent("section_enter", { sectionId });
    }

    const stats = this.ensureSection(sectionId);
    const progress = getNormalizedProgress(player.x, this.spawnX, this.level);
    stats.maxProgress = Math.max(stats.maxProgress, Math.round(progress));
    stats.maxProgressX = Math.max(stats.maxProgressX, Math.round(player.x));
    this.report.metrics.maxProgress = Math.max(this.report.metrics.maxProgress, Math.round(progress));
    this.report.metrics.maxProgressX = Math.max(this.report.metrics.maxProgressX, Math.round(player.x));
    if (progress >= this.progressAnchor + PROGRESS_RESET_DISTANCE) {
      this.progressAnchor = progress;
      this.lastProgressAt = elapsed;
      this.stallArmed = true;
    } else if (this.stallArmed && elapsed - this.lastProgressAt >= PLAYTEST_STALL_SECONDS) {
      this.stallArmed = false;
      this.report.metrics.stalls += 1;
      stats.stalls += 1;
      this.recordEvent("stall", { secondsWithoutProgress: PLAYTEST_STALL_SECONDS });
    }
    this.lastElapsed = elapsed;
  }

  recordOutcome(eventType, metric, details = {}) {
    if (!this.enabled || this.finalized) return;
    this.report.metrics[metric] += 1;
    const stats = this.ensureSection(this.currentSectionId ?? this.getSectionAt(this.player?.x)?.id ?? "unknown");
    if (eventType === "hit") stats.hits += 1;
    if (eventType === "fall") stats.falls += 1;
    this.recordEvent(eventType, details);
  }

  recordEvent(type, details = {}) {
    if (!this.enabled || this.finalized || this.report.events.length >= MAX_EVENTS_PER_SESSION) return;
    const sectionId = details.sectionId
      ?? this.currentSectionId
      ?? this.getSectionAt(this.player?.x)?.id
      ?? "unknown";
    this.report.events.push({
      type,
      elapsedSeconds: roundSeconds(this.lastElapsed),
      x: Math.round(this.player?.x ?? 0),
      y: Math.round(this.player?.y ?? 0),
      sectionId,
      details: { ...details, sectionId: undefined }
    });
    const last = this.report.events.at(-1);
    if (last.details.sectionId === undefined) delete last.details.sectionId;
  }

  complete({ elapsedSeconds, score, achieved = [] }) {
    if (!this.enabled || this.finalized) return null;
    this.update(elapsedSeconds, this.player);
    this.report.completed = true;
    this.report.durationSeconds = roundSeconds(elapsedSeconds);
    this.report.score = Math.round(Number(score) || 0);
    this.report.achieved = [...achieved];
    this.report.finishedAt = new Date(this.now()).toISOString();
    this.recordEvent("completed", { score: this.report.score });
    this.finalized = true;
    return this.persistAndBuildBundle();
  }

  persistIncomplete() {
    if (!this.enabled || this.finalized || this.lastElapsed < 5) return null;
    this.report.completed = false;
    this.report.durationSeconds = roundSeconds(this.lastElapsed);
    this.report.finishedAt = new Date(this.now()).toISOString();
    this.recordEvent("abandoned");
    this.finalized = true;
    return this.persistAndBuildBundle();
  }

  persistAndBuildBundle() {
    const reports = readReports(this.storage)
      .filter(({ sessionId }) => sessionId !== this.report.sessionId);
    reports.push(clone(this.report));
    const stored = reports.slice(-MAX_STORED_SESSIONS);
    writeReports(this.storage, stored);
    return {
      schemaVersion: PLAYTEST_SCHEMA_VERSION,
      exportedAt: new Date(this.now()).toISOString(),
      currentSession: clone(this.report),
      sessions: clone(stored),
      analysis: analyzePlaytestSessions(stored, this.report.levelId)
    };
  }

  getSectionAt(x) {
    return this.level?.sections?.find((section) => x >= section.xStart && x < section.xEnd)
      ?? this.level?.sections?.at(-1)
      ?? null;
  }

  ensureSection(sectionId) {
    const id = sectionId ?? "unknown";
    this.report.sections[id] ??= {
      entries: 0,
      seconds: 0,
      hits: 0,
      falls: 0,
      stalls: 0,
      maxProgress: 0,
      maxProgressX: 0
    };
    return this.report.sections[id];
  }

  destroy() {
    if (this.enabled && !this.finalized && this.persistIncompleteOnDestroy) this.persistIncomplete();
    for (const [event, handler] of this.handlers) this.scene.events.off(event, handler);
    this.handlers.length = 0;
  }
}

export function downloadPlaytestBundle(bundle) {
  if (!bundle || typeof document === "undefined") return false;
  const testerId = sanitizeTesterId(bundle.currentSession?.testerId);
  const levelId = bundle.currentSession?.levelId ?? "level";
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `silsea-playtest-${levelId}-${testerId}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
  return true;
}
