import { COLORS } from "../config/constants.js";

// Keep each silhouette recognizable when its painted texture is unavailable.
export function createCollectibleFallback(scene, theme, x, y, alpha = 1) {
  const g = scene.add.graphics().setPosition(x, y).setDepth(4).setAlpha(alpha);
  g.fillStyle(theme.color).lineStyle(3, COLORS.outline);
  const polygon = points => { const vertices = points.map(([x, y]) => ({ x, y })); g.fillPoints(vertices, true).strokePoints(vertices, true); };
  switch (theme.shape) {
    case "crown":
      polygon([[-24, -12], [-13, -3], [0, -25], [13, -3], [24, -12], [19, 19], [-19, 19]]);
      g.fillStyle(COLORS.collectPink).fillCircle(0, 6, 6); break;
    case "ribbon":
      polygon([[-24, -24], [17, -24], [25, -13], [3, 0], [25, 13], [18, 24], [-24, 24], [-26, 13], [-7, 1], [-26, -12]]);
      g.lineStyle(3, COLORS.white).lineBetween(-13, -18, 14, -18); break;
    case "note":
      g.fillCircle(-16, 16, 10).fillCircle(14, 12, 10);
      g.fillRect(-9, -24, 6, 39).fillRect(21, -28, 6, 39).fillRect(-9, -28, 36, 8); break;
    case "ring":
      g.lineStyle(12, COLORS.outline).strokeCircle(0, 0, 21);
      g.lineStyle(8, theme.color).strokeCircle(0, 0, 21); break;
    case "drop":
      polygon([[0, -29], [-20, 1], [-23, 12], [-16, 24], [0, 29], [16, 24], [23, 12], [20, 1]]);
      g.fillStyle(COLORS.white, 0.8).fillEllipse(-8, 5, 5, 13); break;
  }
  return g;
}
