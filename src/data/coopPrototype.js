export const COOP_PLAYER_IDS = Object.freeze(["p1", "p2"]);

export const COOP_PLAYERS = Object.freeze([
  Object.freeze({ id: "p1", index: 0, label: "P1 실세아", characterId: "silsea", spawnOffsetX: -48 }),
  Object.freeze({ id: "p2", index: 1, label: "P2 감자", characterId: "potato89", spawnOffsetX: 48 })
]);

export const COOP_RULES = Object.freeze({
  warningHorizontal: 820,
  warningVertical: 360,
  rejoinHorizontal: 1000,
  rejoinVertical: 480,
  rejoinDelayMs: 1000,
  rejoinInvulnerableMs: 1200,
  rejoinBehindDistance: 96,
  respawnDelayMs: 700,
  respawnOffsets: Object.freeze({ p1: -48, p2: 48 })
});

export const COOP_POWERUP_TYPES = Object.freeze(["horn", "wings", "alicorn"]);

const getPlayerOrder = (id) => Math.max(0, COOP_PLAYER_IDS.indexOf(id));

export const isCoopPlayerAvailable = (player) => Boolean(
  player
  && player.active !== false
  && player.connected !== false
  && !player.respawning
);

export function getCoopCameraTarget(players, fallback = { x: 0, y: 0 }) {
  const active = players.filter(isCoopPlayerAvailable);
  if (active.length === 0) return { ...fallback };
  return {
    x: active.reduce((sum, player) => sum + Number(player.x), 0) / active.length,
    y: active.reduce((sum, player) => sum + Number(player.y), 0) / active.length
  };
}

export function getCoopSeparation(players, {
  direction = "right",
  cameraX = getCoopCameraTarget(players).x,
  exceededForMs = 0
} = {}) {
  const active = players.filter(isCoopPlayerAvailable);
  if (active.length < 2) {
    return {
      horizontal: 0,
      vertical: 0,
      warning: false,
      shouldRejoin: false,
      trailingPlayerId: null
    };
  }

  const [first, second] = active;
  const horizontal = Math.abs(Number(first.x) - Number(second.x));
  const vertical = Math.abs(Number(first.y) - Number(second.y));
  const progressSign = direction === "left" ? -1 : 1;
  const firstProgress = Number(first.x) * progressSign;
  const secondProgress = Number(second.x) * progressSign;
  let trailing = firstProgress < secondProgress ? first : secondProgress < firstProgress ? second : null;
  if (!trailing) {
    const firstCameraDistance = Math.abs(Number(first.x) - Number(cameraX));
    const secondCameraDistance = Math.abs(Number(second.x) - Number(cameraX));
    trailing = firstCameraDistance > secondCameraDistance
      ? first
      : secondCameraDistance > firstCameraDistance
        ? second
        : active.slice().sort((a, b) => getPlayerOrder(b.id) - getPlayerOrder(a.id))[0];
  }
  const warning = horizontal > COOP_RULES.warningHorizontal || vertical > COOP_RULES.warningVertical;
  const beyondRejoin = horizontal > COOP_RULES.rejoinHorizontal || vertical > COOP_RULES.rejoinVertical;
  return {
    horizontal,
    vertical,
    warning,
    shouldRejoin: beyondRejoin && exceededForMs >= COOP_RULES.rejoinDelayMs,
    trailingPlayerId: warning ? trailing.id : null
  };
}

export function selectCoopTarget(candidates, source, lockedId = null) {
  const active = candidates.filter(isCoopPlayerAvailable);
  const locked = active.find(({ id }) => id === lockedId);
  if (locked) return locked;
  return active
    .map((candidate) => ({
      candidate,
      distanceSquared: (Number(candidate.x) - Number(source.x)) ** 2
        + (Number(candidate.y) - Number(source.y)) ** 2
    }))
    .sort((a, b) => a.distanceSquared - b.distanceSquared
      || getPlayerOrder(a.candidate.id) - getPlayerOrder(b.candidate.id))[0]?.candidate ?? null;
}

const isInsideZone = (player, zone) => (
  Number(player.x) >= Number(zone.x) - Number(zone.width) / 2
  && Number(player.x) <= Number(zone.x) + Number(zone.width) / 2
  && Number(player.y) >= Number(zone.y) - Number(zone.height) / 2
  && Number(player.y) <= Number(zone.y) + Number(zone.height) / 2
);

export function canCompleteCoopGate(players, zone) {
  return COOP_PLAYER_IDS.every((id) => {
    const player = players.find((candidate) => candidate.id === id);
    return isCoopPlayerAvailable(player) && isInsideZone(player, zone);
  });
}

export function resolveCoopCollectibleClaim(type, touchingPlayerIds = []) {
  const ownerId = COOP_PLAYER_IDS.find((id) => touchingPlayerIds.includes(id)) ?? null;
  return {
    ownerId,
    shared: !COOP_POWERUP_TYPES.includes(type),
    kind: COOP_POWERUP_TYPES.includes(type) ? "personal_powerup" : "shared_progress"
  };
}
