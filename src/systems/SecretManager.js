import { COLORS, CSS_COLORS, EVENTS } from "../config/constants.js";
import { GAME_FONT_FAMILY } from "../config/font.js";

const contains = (secret, player) => (
  player.x >= secret.xStart
  && player.x <= secret.xEnd
  && player.y >= secret.yTop
  && player.y <= secret.yBottom
);

export class SecretManager {
  constructor(scene, player, scoreManager, objectiveManager, secrets = []) {
    this.scene = scene;
    this.player = player;
    this.scoreManager = scoreManager;
    this.objectiveManager = objectiveManager;
    this.secrets = secrets;
    this.discovered = new Set();
    this.debugVisuals = [];
    this.createDebugVisuals();
  }

  update(player = this.player) {
    if (!player || player.active === false) return;
    for (const secret of this.secrets) {
      if (!this.discovered.has(secret.id) && contains(secret, player)) this.discover(secret);
    }
  }

  discover(secret) {
    if (!secret?.id || this.discovered.has(secret.id)) return false;
    this.discovered.add(secret.id);
    const reward = Math.max(0, Math.round(Number(secret.reward) || 0));
    const awarded = this.scoreManager?.add(reward) ?? reward;
    this.objectiveManager?.findSecret(secret.id);
    this.scene?.events.emit(EVENTS.SECRET_FOUND, {
      id: secret.id,
      name: secret.name,
      reward: awarded,
      found: this.discovered.size,
      total: this.secrets.length
    });
    return true;
  }

  createDebugVisuals() {
    if (!this.scene?.registry?.get?.("debugEnabled")) return;
    for (const secret of this.secrets) {
      const width = secret.xEnd - secret.xStart;
      const height = secret.yBottom - secret.yTop;
      const centerX = secret.xStart + width / 2;
      const centerY = secret.yTop + height / 2;
      const zone = this.scene.add.rectangle(centerX, centerY, width, height, COLORS.collectBlue, 0.08)
        .setStrokeStyle(2, COLORS.collectBlue, 0.75)
        .setDepth(12);
      const label = this.scene.add.text(secret.xStart + 8, secret.yTop + 8, `SECRET · ${secret.name}`, {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "13px",
        color: CSS_COLORS.white,
        backgroundColor: CSS_COLORS.panel,
        padding: { x: 5, y: 3 }
      }).setDepth(13);
      this.debugVisuals.push(zone, label);
    }
  }

  getSnapshot() {
    return {
      found: this.discovered.size,
      total: this.secrets.length,
      ids: [...this.discovered]
    };
  }

  restore(ids = []) {
    const validIds = new Set(this.secrets.map(({ id }) => id));
    this.discovered = new Set(ids.filter((id) => validIds.has(id)));
    return this.getSnapshot();
  }

  destroy() {
    for (const visual of this.debugVisuals) visual.destroy();
    this.debugVisuals.length = 0;
  }
}
