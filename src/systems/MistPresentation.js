import { GAME_HEIGHT, GAME_WIDTH } from "../config/constants.js";
import { getMistDensityAt } from "../data/environment.js";

// Small canvas, native gradients: soft edges without a hard geometry mask or
// a full-resolution texture upload. All mist art also works in asset fallback.
export class MistPresentation {
  constructor(scene, zones) {
    this.scene = scene;
    this.zones = zones;
    this.textureKey = "runtime-storybook-mist";
    this.texture = scene.textures.createCanvas(this.textureKey, 640, 360);
    this.texture.setFilter(0); // LINEAR, independent of the game's pixel-art filter.
    this.context = this.texture.getContext();
    // Most fog belongs between the scenery and the route. A lighter veil also
    // passes in front, keeping the village misty while preserving silhouettes.
    this.backgroundOverlay = scene.add.image(0, 0, this.textureKey)
      .setOrigin(0).setScrollFactor(0).setDepth(-9)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.overlay = scene.add.image(0, 0, this.textureKey)
      .setOrigin(0).setScrollFactor(0).setDepth(18)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.motionTime = 0;
    this.opacity = 1;
  }

  ribbon(view, time, band, row) {
    const ctx = this.context;
    const points = [];
    for (let x = -40; x <= GAME_WIDTH + 40; x += 40) {
      const worldX = view.x + x - time * band.speed;
      const phase = worldX / 260 + row * 2.1;
      points.push({
        x,
        y: band.y - view.y + Math.sin(phase) * band.sway
          + Math.sin(worldX / 117 + row * 1.7) * 11,
        height: band.height * (0.82 + Math.sin(worldX / 190 + row) * 0.18)
      });
    }
    // Nested low-opacity ribbons feather both edges. Their changing width and
    // wavy centre follow the valley, with no ellipses or player-centred opening.
    ctx.fillStyle = `rgba(242,250,240,${band.alpha / 16})`;
    for (let layer = 0; layer < 16; layer += 1) {
      const inset = 1 - layer / 20;
      ctx.beginPath();
      points.forEach((point, index) => {
        const y = point.y - point.height * inset;
        if (index === 0) ctx.moveTo(point.x, y);
        else ctx.lineTo(point.x, y);
      });
      for (let index = points.length - 1; index >= 0; index -= 1) {
        const point = points[index];
        ctx.lineTo(point.x, point.y + point.height * inset);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  update(delta, { view, reduced, densityMultiplier, forceClear }) {
    if (!reduced) this.motionTime += Math.max(0, delta);
    const blend = 1 - Math.exp(-Math.max(0, delta) / 400);
    this.opacity += ((forceClear ? 0 : 1) - this.opacity) * blend;
    this.backgroundOverlay.setAlpha(this.opacity);
    this.overlay.setAlpha(this.opacity * 0.28);
    const ctx = this.context;
    ctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // A permanent atmospheric veil softens the sky and distant hills even in
    // the introduction and recovery areas. Zone density adds to this base.
    const veil = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    veil.addColorStop(0, "rgba(215,235,240,0.56)");
    veil.addColorStop(0.48, "rgba(226,241,240,0.48)");
    veil.addColorStop(0.78, "rgba(234,247,239,0.56)");
    veil.addColorStop(1, "rgba(232,247,241,0.42)");
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const time = this.motionTime / 1000;
    const bands = [
      { y: 160, height: 74, sway: 22, alpha: 0.32, speed: 7 },
      { y: 300, height: 88, sway: 33, alpha: 0.44, speed: -10 },
      { y: 420, height: 76, sway: 28, alpha: 0.54, speed: 9 },
      { y: 540, height: 62, sway: 24, alpha: 0.58, speed: 13 },
      { y: 675, height: 95, sway: 20, alpha: 0.4, speed: -6 }
    ];
    bands.forEach((band, row) => this.ribbon(view, time, band, row));

    // Ambient haze covers the whole village; denser banks follow the world
    // and blend softly across gameplay zone boundaries.
    ctx.globalCompositeOperation = "destination-in";
    const density = ctx.createLinearGradient(0, 0, GAME_WIDTH, 0);
    for (let index = 0; index <= 32; index += 1) {
      const ratio = index / 32;
      const alpha = Math.min(1, 0.72
        + getMistDensityAt(view.x + ratio * GAME_WIDTH, this.zones) * 0.45)
        * (reduced ? densityMultiplier : 1);
      density.addColorStop(ratio, `rgba(255,255,255,${alpha})`);
    }
    ctx.fillStyle = density;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.globalCompositeOperation = "source-over";
    this.texture.refresh();
  }

  destroy() {
    this.overlay.destroy();
    this.backgroundOverlay.destroy();
    this.scene.textures.remove(this.textureKey);
  }
}
