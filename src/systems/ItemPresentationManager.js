import Phaser from "phaser";
import { COLORS, CSS_COLORS } from "../config/constants.js";
import {
  TRANSFORMATION_ITEM_TYPES,
  getItemPresentation,
  isItemEffectVisible
} from "../data/itemPresentation.js";

const TWINKLE_OFFSETS = Object.freeze([
  Object.freeze({ x: -34, y: -28 }),
  Object.freeze({ x: 34, y: -8 }),
  Object.freeze({ x: -20, y: 30 })
]);

const REVIEW_LABELS = Object.freeze({ horn: "뿔", wings: "날개", alicorn: "뿔 + 날개" });

export class ItemPresentationManager {
  constructor(scene, collectibles, particleEffects, { reviewMode = null } = {}) {
    this.scene = scene;
    this.particleEffects = particleEffects;
    this.entries = new Map();
    this.reviewMode = reviewMode;
    this.currentStrength = "normal";
    for (const collectible of collectibles ?? []) this.register(collectible);
  }

  register(collectible) {
    if (!TRANSFORMATION_ITEM_TYPES.includes(collectible?.type)) return null;
    const halo = this.scene.add.circle(collectible.x, collectible.y, 34, COLORS.white, 0.04)
      .setStrokeStyle(2, COLORS.white, 0.48)
      .setDepth(3);
    const twinkles = TWINKLE_OFFSETS.map(({ x, y }, index) => this.scene.add.star(
      collectible.x + x,
      collectible.y + y,
      4,
      2.2,
      index === 0 ? 7 : 5,
      COLORS.white,
      0.8
    ).setDepth(5));
    const label = this.reviewMode && collectible.id.startsWith("item-review-")
      ? this.scene.add.text(collectible.x, collectible.y + 58, REVIEW_LABELS[collectible.type], {
          fontFamily: "sans-serif",
          fontSize: "18px",
          fontStyle: "bold",
          color: CSS_COLORS.white,
          stroke: CSS_COLORS.outline,
          strokeThickness: 4
        }).setOrigin(0.5).setDepth(6)
      : null;
    const entry = {
      collectible,
      halo,
      twinkles,
      label,
      nextGlitterAt: 0,
      visible: false
    };
    this.entries.set(collectible.id, entry);
    return entry;
  }

  update(time, cameraView, strength = "normal") {
    this.currentStrength = strength === "reduced" ? "reduced" : "normal";
    for (const entry of this.entries.values()) {
      const { collectible, halo, twinkles, label } = entry;
      const settings = getItemPresentation(collectible.type, strength);
      const visible = isItemEffectVisible(collectible, cameraView);
      entry.visible = visible;
      halo.setVisible(visible);
      label?.setVisible(visible);
      for (const [index, twinkle] of twinkles.entries()) {
        twinkle.setVisible(visible && index < settings.twinkleCount);
      }
      if (!visible) continue;

      const phase = ((time + settings.phaseMs) % settings.cycleMs) / settings.cycleMs;
      const pulse = (Math.sin(phase * Math.PI * 2) + 1) / 2;
      halo.setPosition(collectible.x, collectible.y)
        .setScale(0.92 + pulse * 0.16)
        .setAlpha(settings.strength === "reduced" ? 0.18 : 0.18 + pulse * 0.34);
      label?.setPosition(collectible.x, collectible.y + 58);
      for (const [index, twinkle] of twinkles.entries()) {
        const offset = TWINKLE_OFFSETS[index];
        const twinklePhase = (phase + index / twinkles.length) % 1;
        const alpha = Math.max(0.08, Math.sin(twinklePhase * Math.PI) ** 2);
        twinkle.setPosition(collectible.x + offset.x, collectible.y + offset.y)
          .setScale(0.7 + alpha * 0.45)
          .setAngle(time * 0.04 * (index % 2 ? -1 : 1))
          .setAlpha(alpha);
      }

      if (time < entry.nextGlitterAt) continue;
      this.particleEffects?.emitItemGlitter(
        collectible.type,
        collectible.x + Phaser.Math.Between(-18, 18),
        collectible.y + 12,
        settings.glitterCount
      );
      entry.nextGlitterAt = time + settings.glitterIntervalMs * settings.intervalMultiplier;
    }
  }

  collect(id) {
    const entry = this.entries.get(id);
    if (!entry) return;
    this.particleEffects?.clearItemGlitter(entry.collectible.type);
    this.destroyEntry(entry);
    this.entries.delete(id);
  }

  getSnapshot() {
    const entries = [...this.entries.values()].map(({ collectible, visible }) => ({
      id: collectible.id,
      type: collectible.type,
      active: collectible.active,
      effectsVisible: visible
    }));
    return {
      reviewMode: this.reviewMode,
      strength: this.currentStrength,
      types: [...new Set(entries.map(({ type }) => type))],
      entries
    };
  }

  destroyEntry({ halo, twinkles, label }) {
    halo?.destroy();
    for (const twinkle of twinkles ?? []) twinkle.destroy();
    label?.destroy();
  }

  destroy() {
    for (const entry of this.entries.values()) this.destroyEntry(entry);
    this.entries.clear();
    this.scene = null;
    this.particleEffects = null;
  }
}
