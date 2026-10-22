import { COLORS } from "../config/constants.js";
import { getTongueBounds, overlapsTongue } from "../data/tongueMechanics.js";

// The rendered shape and collision check share one rectangle, including extension.
export class TongueAttack {
  constructor(scene) {
    this.visual = scene.add.graphics().setDepth(7);
    this.bounds = null;
    this.active = false;
  }

  show(config, { warning = false, extension = 1 } = {}) {
    this.bounds = getTongueBounds(config, extension);
    this.active = !warning;
    const { x, y, width, height } = this.bounds;
    const graphics = this.visual.clear().setVisible(true);
    if (width < 1) return;
    if (warning) {
      graphics.fillStyle(COLORS.collect, 0.24).fillRoundedRect(x, y, width, height, 10);
      graphics.lineStyle(3, COLORS.danger, 1).strokeRoundedRect(x, y, width, height, 10);
      for (let marker = x + 14; marker < x + width - 6; marker += 42) {
        graphics.lineStyle(3, COLORS.white, 1).lineBetween(marker, y + height - 4, marker + 8, y + 4);
      }
    } else {
      graphics.fillStyle(COLORS.collectPink, 1).fillRoundedRect(x, y, width, height, 12);
      graphics.lineStyle(3, COLORS.dangerAlt, 1).strokeRoundedRect(x, y, width, height, 12);
      graphics.lineStyle(3, COLORS.white, 0.7).lineBetween(x + 12, y + 7, x + width - 12, y + 7);
    }
  }

  hits(body) { return this.active && overlapsTongue(body, this.bounds); }
  clear() { this.bounds = null; this.active = false; this.visual.clear().setVisible(false); }
  destroy() { this.visual.destroy(); this.bounds = null; this.active = false; }
}
