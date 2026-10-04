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
    this.overlay = scene.add.image(0, 0, this.textureKey)
      .setOrigin(0).setScrollFactor(0).setDepth(18)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.motionTime = 0;
    this.opacity = 1;
  }

  puff(x, y, width, height, alpha, erase = false) {
    const ctx = this.context;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(width, height);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    const color = erase ? "255,255,255" : "246,252,239";
    gradient.addColorStop(0, `rgba(${color},${alpha})`);
    gradient.addColorStop(0.38, `rgba(${color},${alpha * 0.86})`);
    gradient.addColorStop(0.72, `rgba(${color},${alpha * 0.36})`);
    gradient.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }

  update(delta, { view, player, radius, reduced, densityMultiplier, forceClear }) {
    if (!reduced) this.motionTime += Math.max(0, delta);
    const blend = 1 - Math.exp(-Math.max(0, delta) / 400);
    this.opacity += ((forceClear ? 0 : 1) - this.opacity) * blend;
    this.overlay.setAlpha(this.opacity);
    const ctx = this.context;
    ctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Long, uneven ribbons sit mostly among the hills and along the ground.
    // Anchor them to the valley so moving the camera doesn't move the fog.
    ctx.fillStyle = "rgba(238,251,244,0.16)";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const time = this.motionTime / 1000;
    const spacing = 470;
    const bands = [
      { y: 270, width: 420, height: 76, alpha: 0.28, speed: 7 },
      { y: 420, width: 350, height: 95, alpha: 0.48, speed: -10 },
      { y: 574, width: 400, height: 74, alpha: 0.66, speed: 13 },
      { y: 704, width: 480, height: 110, alpha: 0.42, speed: -6 }
    ];
    bands.forEach((band, row) => {
      const drift = time * band.speed;
      const first = Math.floor((view.x - drift - row * 153) / spacing);
      for (let index = first - 1; index <= first + 4; index += 1) {
        const phase = index * 2.37 + row * 1.8;
        const x = index * spacing + row * 153 + drift - view.x;
        const y = band.y - view.y + Math.sin(phase) * 28
          + Math.sin(time * 0.45 + phase) * 9;
        const width = band.width * (1 + Math.sin(phase * 1.3) * 0.17);
        this.puff(x, y, width, band.height, band.alpha);
        this.puff(x + width * 0.32, y - 23, width * 0.6, band.height * 0.72, band.alpha * 0.55);
      }
    });

    // Density follows the world, feathered across zone boundaries. Approaching
    // fog can be seen ahead before the player reaches its gameplay zone.
    ctx.globalCompositeOperation = "destination-in";
    const density = ctx.createLinearGradient(0, 0, GAME_WIDTH, 0);
    for (let index = 0; index <= 32; index += 1) {
      const ratio = index / 32;
      const alpha = getMistDensityAt(view.x + ratio * GAME_WIDTH, this.zones)
        * (reduced ? densityMultiplier : 1);
      density.addColorStop(ratio, `rgba(255,255,255,${alpha})`);
    }
    ctx.fillStyle = density;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Overlapping feathered openings keep the route readable without a visible
    // circular spotlight or the former mistClear ring around the character.
    ctx.globalCompositeOperation = "destination-out";
    const x = player.x - view.x;
    const y = player.y - view.y - 28;
    this.puff(x - radius * 0.12, y + 20, radius * 1.1, radius * 0.7, 0.98, true);
    this.puff(x + radius * 0.38, y - 34, radius * 0.92, radius * 0.56, 0.92, true);
    this.puff(x - radius * 0.4, y - 55, radius * 0.78, radius * 0.5, 0.86, true);
    ctx.globalCompositeOperation = "source-over";
    this.texture.refresh();
  }

  destroy() {
    this.overlay.destroy();
    this.scene.textures.remove(this.textureKey);
  }
}
