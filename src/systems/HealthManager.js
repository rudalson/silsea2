import { COLORS, EVENTS } from "../config/constants.js";
import { CORE_RULES } from "../data/gameplay.js";

export class HealthManager {
  constructor(scene, player, checkpointManager, scoreManager, objectiveManager, transformationManager) {
    this.scene = scene;
    this.player = player;
    this.checkpointManager = checkpointManager;
    this.scoreManager = scoreManager;
    this.objectiveManager = objectiveManager;
    this.transformationManager = transformationManager;
    this.maxHp = player.character.physics.maxHp ?? CORE_RULES.maxHp;
    this.hp = this.maxHp;
    this.invulnerableUntil = 0;
    this.emitHp();
  }

  takeDamage(sourceX = this.player.x, { steal = false } = {}) {
    const now = this.scene.time.now;
    if (this.transformationManager.invulnerable || now < this.invulnerableUntil) return false;

    this.hp -= 1;
    this.objectiveManager.recordDamage();
    this.invulnerableUntil = now + CORE_RULES.invulnerableMs;
    this.player.controlLockedUntil = now + CORE_RULES.hurtLockMs;
    this.player.playHurtAnimation?.();
    const direction = this.player.x < sourceX ? -1 : 1;
    this.player.setVelocity(direction * 300, -260);
    this.player.setTintFill(COLORS.danger);
    this.scene.time.delayedCall(110, () => this.player?.active && this.player.clearTint());
    this.scene.events.emit(EVENTS.PLAYER_HIT, { hp: Math.max(0, this.hp), steal });

    if (this.hp <= 0) this.reviveAtCheckpoint();
    this.emitHp();
    return true;
  }

  handleFall() {
    if (this.checkpointManager.respawning) return;
    const now = this.scene.time.now;
    if (!this.transformationManager.invulnerable) {
      this.hp -= 1;
      this.objectiveManager.recordDamage();
    }
    if (this.hp <= 0) {
      this.hp = this.maxHp;
      this.scoreManager.loseOnRespawn();
    }
    this.invulnerableUntil = now + CORE_RULES.invulnerableMs;
    this.checkpointManager.respawn(this.player);
    this.emitHp();
  }

  reviveAtCheckpoint() {
    this.hp = this.maxHp;
    this.scoreManager.loseOnRespawn();
    this.checkpointManager.respawn(this.player);
  }

  update(now) {
    if (!this.player?.active) return;
    if (now < this.invulnerableUntil && !this.checkpointManager.respawning) {
      this.player.setAlpha(Math.floor(now / 90) % 2 ? 0.38 : 1);
    } else if (!this.checkpointManager.respawning) {
      this.player.setAlpha(1);
    }
  }

  isInvulnerable() {
    return this.transformationManager.invulnerable || this.scene.time.now < this.invulnerableUntil;
  }

  emitHp() {
    this.scene.events.emit(EVENTS.PLAYER_HP_CHANGED, { hp: Math.max(0, this.hp), maxHp: this.maxHp });
  }
}
