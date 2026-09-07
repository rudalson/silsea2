import { COLORS, EVENTS } from "../config/constants.js";
import { COOP_RULES, resolveCoopCollectibleClaim } from "../data/coopPrototype.js";
import { CORE_RULES, FORMS } from "../data/gameplay.js";
import { TransformationManager } from "./TransformationManager.js";

const ITEM_TO_FORM = Object.freeze({
  horn: FORMS.UNICORN,
  wings: FORMS.PEGASUS,
  alicorn: FORMS.ALICORN
});

export class CoopSessionManager {
  constructor(scene, sessions, levelLoader, objectiveManager, scoreManager, { onStatus = () => {} } = {}) {
    this.scene = scene;
    this.sessions = sessions;
    this.levelLoader = levelLoader;
    this.objectiveManager = objectiveManager;
    this.scoreManager = scoreManager;
    this.onStatus = onStatus;
    this.currentCheckpoint = { id: "start", ...scene.level.player.spawn };
    this.activatedCheckpoints = new Set();

    for (const session of sessions) {
      session.maxHp = session.player.character.physics.maxHp ?? CORE_RULES.maxHp;
      session.hp = session.maxHp;
      session.invulnerableUntil = 0;
      session.respawning = false;
      session.hasConnectedBefore = session.connected;
      session.transformationManager = new TransformationManager(
        scene,
        session.player,
        levelLoader,
        scene.difficulty ?? {}
      );
    }
  }

  setConnection(session, connected, { simulated = false } = {}) {
    if (!session || session.id === "p1" || session.connected === connected) return false;
    session.connected = connected;
    if (!connected) {
      session.player.setVelocity(0, 0).setAlpha(0.45);
      if (session.player.body) session.player.body.moves = false;
      this.onStatus(`${session.label}: 게임패드 연결이 끊겨 대기합니다. P1은 계속 움직일 수 있습니다.`);
      return true;
    }

    if (session.player.body) session.player.body.moves = true;
    session.player.setAlpha(1);
    if (!simulated && session.hasConnectedBefore) this.restoreAtCheckpoint(session, "게임패드 재연결");
    if (!simulated) session.hasConnectedBefore = true;
    return true;
  }

  bind(interactions) {
    for (const checkpoint of this.levelLoader.checkpointZones) {
      for (const session of this.sessions) {
        interactions.push(this.scene.physics.add.overlap(session.player, checkpoint.zone, () => {
          this.activateCheckpoint(checkpoint, session);
        }));
      }
    }
    for (const collectible of this.levelLoader.collectibles) {
      for (const session of this.sessions) {
        interactions.push(this.scene.physics.add.overlap(session.player, collectible.zone, () => {
          this.collect(collectible, session);
        }));
      }
    }
    for (const hazard of this.levelLoader.hazards) {
      for (const session of this.sessions) {
        interactions.push(this.scene.physics.add.overlap(session.player, hazard, () => {
          this.takeDamage(session, hazard.x, "hazard");
        }));
      }
    }
  }

  update(now, delta, inputs) {
    for (const session of this.sessions) {
      const input = inputs[session.id];
      if (!session.connected) continue;
      if (!session.respawning) {
        const ability = session.transformationManager.prepareMovement(input, delta);
        session.player.updateControls(input, now, delta, ability);
      }
      session.transformationManager.update(now);
      if (session.player.y > this.scene.level.world.height + 140 && !session.respawning) {
        this.objectiveManager.recordDamage();
        this.respawn(session, "낭떠러지");
      }
      if (!session.respawning) {
        session.player.setAlpha(
          now < session.invulnerableUntil && Math.floor(now / 90) % 2 ? 0.38 : 1
        );
      }
    }
    this.scoreManager.update(delta);
  }

  restoreAtCheckpoint(session, reason) {
    const x = this.currentCheckpoint.x + COOP_RULES.respawnOffsets[session.id];
    const y = this.currentCheckpoint.y - 2;
    session.player.setPosition(x, y).setVelocity(0, 0);
    session.player.body.enable = true;
    session.player.body.moves = true;
    session.player.body.updateFromGameObject();
    session.hp = session.maxHp;
    session.invulnerableUntil = this.scene.time.now + COOP_RULES.rejoinInvulnerableMs;
    session.respawning = false;
    this.onStatus(`${session.label}: ${reason}, 공유 체크포인트에서 복귀했습니다.`);
  }

  activateCheckpoint(checkpoint, session) {
    if (this.activatedCheckpoints.has(checkpoint.data.id)) return false;
    this.activatedCheckpoints.add(checkpoint.data.id);
    this.currentCheckpoint = { ...checkpoint.data };
    for (const candidate of this.sessions) {
      candidate.hp = candidate.maxHp;
      candidate.transformationManager.restoreFlight();
    }
    for (const visual of checkpoint.visuals) visual.setAlpha(1);
    this.scene.tweens.add({ targets: checkpoint.visuals, scale: 1.16, duration: 110, yoyo: true });
    this.onStatus(`${session.label}: 공유 체크포인트 활성화. 두 플레이어의 체력과 비행이 회복됩니다.`);
    this.scene.events.emit(EVENTS.CHECKPOINT, checkpoint.data);
    return true;
  }

  collect(collectible, session) {
    if (!collectible?.active) return false;
    const claim = resolveCoopCollectibleClaim(collectible.type, [session.id]);
    collectible.active = false;
    collectible.zone.body.enable = false;
    for (const visual of collectible.visuals) visual.setVisible(false);

    const form = ITEM_TO_FORM[collectible.type];
    if (form) {
      session.transformationManager.setForm(form, false);
      this.onStatus(`${session.label}: ${collectible.type} 변신 아이템 획득. 변신은 이 플레이어에게만 적용됩니다.`);
    } else {
      if (collectible.type === "star") this.objectiveManager.addStars(1);
      const awarded = this.scoreManager.collect(collectible.type, session.transformationManager.scoreMultiplier);
      this.onStatus(`${session.label}: 공유 ${collectible.type} 수집물 획득, ${awarded}점 추가.`);
    }
    this.scene.events.emit(EVENTS.ITEM_COLLECTED, {
      id: collectible.id,
      type: collectible.type,
      playerId: claim.ownerId,
      shared: claim.shared
    });
    return true;
  }

  takeDamage(session, sourceX = session.player.x, type = "contact") {
    const now = this.scene.time.now;
    if (!session.connected
      || session.respawning
      || session.transformationManager.invulnerable
      || now < session.invulnerableUntil) return false;
    session.hp -= 1;
    session.invulnerableUntil = now + CORE_RULES.invulnerableMs;
    session.player.controlLockedUntil = now + CORE_RULES.hurtLockMs;
    session.player.playHurtAnimation?.();
    session.player.setVelocity(session.player.x < sourceX ? -300 : 300, -260);
    session.player.setTintFill(COLORS.danger);
    this.scene.time.delayedCall(110, () => session.player?.active && session.player.clearTint());
    this.objectiveManager.recordDamage();
    this.scene.events.emit(EVENTS.PLAYER_HIT, {
      hp: Math.max(0, session.hp),
      maxHp: session.maxHp,
      playerId: session.id,
      type
    });
    this.onStatus(`${session.label}: 피해를 받았습니다. 체력 ${Math.max(0, session.hp)}/${session.maxHp}.`);
    if (session.hp <= 0) this.respawn(session, type);
    return true;
  }

  respawn(session, reason = "부활", { x = this.currentCheckpoint.x, y = this.currentCheckpoint.y } = {}) {
    if (session.respawning) return false;
    session.respawning = true;
    session.player.body.enable = false;
    session.player.setVelocity(0, 0).setAlpha(0.2);
    this.scoreManager.loseOnRespawn();
    this.onStatus(`${session.label}: ${reason} 때문에 공유 체크포인트로 돌아갑니다.`);
    this.scene.time.delayedCall(COOP_RULES.respawnDelayMs, () => {
      const spawnX = x + COOP_RULES.respawnOffsets[session.id];
      session.player.setPosition(spawnX, y - 2).setVelocity(0, 0);
      session.player.body.enable = true;
      session.player.body.updateFromGameObject();
      session.hp = session.maxHp;
      session.invulnerableUntil = this.scene.time.now + COOP_RULES.rejoinInvulnerableMs;
      session.respawning = false;
      this.scene.events.emit(EVENTS.PLAYER_RESPAWNED, {
        playerId: session.id,
        checkpoint: this.currentCheckpoint.id,
        x: Math.round(session.player.x),
        y: Math.round(session.player.y)
      });
      this.onStatus(`${session.label}: 체력 ${session.hp}으로 복귀했습니다.`);
    });
    return true;
  }

  rejoin(session, leader, safePoint) {
    if (!session || !leader || session.respawning) return false;
    const direction = this.scene.level.progression.direction === "left" ? 1 : -1;
    const preferredX = safePoint?.x ?? leader.player.x + direction * COOP_RULES.rejoinBehindDistance;
    const preferredY = safePoint?.y ?? leader.player.y;
    session.player.setPosition(
      preferredX + COOP_RULES.respawnOffsets[session.id] / 2,
      preferredY - 2
    ).setVelocity(0, 0);
    session.player.body.updateFromGameObject();
    session.invulnerableUntil = this.scene.time.now + COOP_RULES.rejoinInvulnerableMs;
    this.onStatus(`${session.label}: ${leader.label} 근처 안전 지점으로 재합류했습니다.`);
    return true;
  }

  getSnapshot(now = this.scene.time.now) {
    return {
      checkpointId: this.currentCheckpoint.id,
      score: this.scoreManager.score,
      stars: this.objectiveManager.context.starCount,
      players: this.sessions.map((session) => ({
        id: session.id,
        hp: session.hp,
        maxHp: session.maxHp,
        form: session.transformationManager.form,
        flightMs: Math.round(session.transformationManager.flightMs),
        respawning: session.respawning,
        invulnerable: session.transformationManager.invulnerable || now < session.invulnerableUntil
      }))
    };
  }

  destroy() {
    for (const session of this.sessions) session.transformationManager?.destroy();
  }
}
