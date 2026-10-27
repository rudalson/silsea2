import { COLORS } from "../config/constants.js";

export const STICKY_TAPE_TEXTURE = "fx_sticky_tape";

// Only the adhesive center stretches; the painted curls keep their proportions.
// The painting's footprint stays inside the existing friction rectangle.
export function createStickyTapeVisual(scene, zone) {
  if (scene.textures?.exists(STICKY_TAPE_TEXTURE)) {
    const height = 40, cap = Math.min(64, zone.width / 3);
    const parts = [
      scene.add.image(0, 0, STICKY_TAPE_TEXTURE, "left").setOrigin(0).setDisplaySize(cap, height),
      scene.add.image(cap, 0, STICKY_TAPE_TEXTURE, "body").setOrigin(0).setDisplaySize(zone.width - cap * 2, height),
      scene.add.image(zone.width - cap, 0, STICKY_TAPE_TEXTURE, "right").setOrigin(0).setDisplaySize(cap, height)
    ];
    return scene.add.container(zone.x, zone.y + zone.height - height, parts).setDepth(3);
  }
  // The asset fallback also uses material cues, without a sign or hatch marks.
  const visual = scene.add.graphics().setDepth(3), y = zone.y + zone.height / 2;
  visual.fillStyle(COLORS.collect, 0.8).fillEllipse(zone.x + zone.width / 2, y, zone.width, zone.height + 2);
  visual.lineStyle(2, COLORS.white, 0.8).lineBetween(zone.x + 22, y - 3, zone.x + zone.width - 22, y - 3);
  for (const x of [zone.x + 12, zone.x + zone.width - 12]) {
    visual.fillStyle(COLORS.collectBlue).fillEllipse(x, y - 5, 24, 20);
    visual.fillStyle(COLORS.collectPink).fillEllipse(x, y - 5, 12, 10);
  }
  return visual;
}
