import { EVENTS } from "../config/constants.js";

export class CheckpointManager {
  constructor(scene, spawn) {
    this.scene = scene;
    this.start = { ...spawn };
    this.current = { id: "start", ...spawn };
    this.activated = new Set();
    this.respawning = false;
  }

  activate(checkpoint) {
    if (this.activated.has(checkpoint.id)) return false;
    this.activated.add(checkpoint.id);
    this.current = { id: checkpoint.id, x: checkpoint.x, y: checkpoint.y };
    this.scene.events.emit(EVENTS.CHECKPOINT, checkpoint);
    return true;
  }

  respawn(player) {
    if (this.respawning) return;
    this.respawning = true;
    player.body.enable = false;
    player.setVelocity(0, 0);
    player.setAlpha(0.25);

    this.scene.time.delayedCall(180, () => {
      player.setPosition(this.current.x, this.current.y - 2);
      player.setVelocity(0, 0);
      player.body.enable = true;
      this.scene.tweens.add({
        targets: player,
        alpha: 1,
        duration: 420,
        ease: "Sine.Out",
        onComplete: () => {
          this.respawning = false;
        }
      });
    });
  }
}

