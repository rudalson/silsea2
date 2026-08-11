import { COLORS, CSS_COLORS } from "../config/constants.js";

const MOVING_PLATFORM_DEPTH = 2;
const UPDRAFT_DEPTH = 1;
const CRUMBLE_PLATFORM_DEPTH = 2;

const isInside = (body, area) => (
  body.right >= area.x
  && body.left <= area.x + area.width
  && body.bottom >= area.y
  && body.top <= area.y + area.height
);

export const getUpdraftVelocity = (currentVelocity, liftSpeed, liftAcceleration, delta) => Math.min(
  currentVelocity,
  Math.max(-liftSpeed, currentVelocity - (liftAcceleration * delta) / 1000)
);

export class TerrainMechanicsManager {
  constructor(scene, player, config = {}) {
    this.scene = scene;
    this.player = player;
    this.created = [];
    this.interactions = [];
    this.movingPlatforms = [];
    this.updrafts = [];
    this.crumblePlatforms = [];

    for (const platform of config.movingPlatforms ?? []) this.createMovingPlatform(platform);
    for (const updraft of config.updrafts ?? []) this.createUpdraft(updraft);
    for (const platform of config.crumblePlatforms ?? []) this.createCrumblePlatform(platform);
  }

  createMovingPlatform(config) {
    const centerX = config.x + config.width / 2;
    const centerY = config.y + config.height / 2;
    const platform = this.track(
      this.scene.add.rectangle(centerX, centerY, config.width, config.height, COLORS.white, 0.001)
    );
    this.scene.physics.add.existing(platform);
    platform.body.setAllowGravity(false);
    platform.body.setImmovable(true);
    platform.body.setFriction(1, 1);
    platform.body.pushable = false;
    platform.setDepth(MOVING_PLATFORM_DEPTH);

    const visual = this.track(this.createCloudVisual(centerX, centerY, config.width, config.height));
    const axis = config.axis === "y" ? "y" : "x";
    const distance = Number(config.distance);
    const speed = Number(config.speed);
    const velocity = Math.sign(distance) * speed;
    if (axis === "x") platform.body.setVelocityX(velocity);
    else platform.body.setVelocityY(velocity);

    const entry = {
      id: config.id,
      platform,
      visual,
      axis,
      start: axis === "x" ? centerX : centerY,
      end: (axis === "x" ? centerX : centerY) + distance,
      speed,
      direction: 1
    };
    this.movingPlatforms.push(entry);
    this.interactions.push(this.scene.physics.add.collider(this.player, platform));
  }

  createCloudVisual(x, y, width, height) {
    const container = this.scene.add.container(x, y).setDepth(MOVING_PLATFORM_DEPTH);
    const base = this.scene.add.ellipse(0, 2, width, height, COLORS.white, 0.96);
    base.setStrokeStyle(3, COLORS.collectBlue, 0.72);
    const puffWidth = Math.max(28, width * 0.27);
    const puffHeight = Math.max(22, height * 1.12);
    const puffs = [-0.32, 0, 0.32].map((offset, index) => {
      const puff = this.scene.add.ellipse(
        width * offset,
        index === 1 ? -height * 0.34 : -height * 0.18,
        puffWidth * (index === 1 ? 1.16 : 1),
        puffHeight * (index === 1 ? 1.12 : 0.94),
        COLORS.white,
        0.98
      );
      puff.setStrokeStyle(2, COLORS.collectBlue, 0.58);
      return puff;
    });
    const glow = this.scene.add.ellipse(0, height * 0.2, width * 0.78, height * 0.46, COLORS.collect, 0.2);
    container.add([glow, base, ...puffs]);
    return container;
  }

  createUpdraft(config) {
    const centerX = config.x + config.width / 2;
    const centerY = config.y + config.height / 2;
    const container = this.track(this.scene.add.container(centerX, centerY).setDepth(UPDRAFT_DEPTH));
    const column = this.scene.add.rectangle(0, 0, config.width, config.height, COLORS.collectBlue, 0.1);
    column.setStrokeStyle(3, COLORS.white, 0.42);
    const arrows = Array.from({ length: 4 }, (_, index) => {
      const arrow = this.scene.add.triangle(0, 0, 0, 22, 14, 0, 28, 22, COLORS.white, 0.74);
      arrow.setStrokeStyle(2, COLORS.collectBlue, 0.68);
      arrow.setScale(1.1 + index * 0.08);
      return arrow;
    });
    const label = this.scene.add.text(0, config.height / 2 - 22, "↑ 바람", {
      fontFamily: "system-ui",
      fontSize: "15px",
      fontStyle: "700",
      color: CSS_COLORS.white,
      backgroundColor: CSS_COLORS.panelSoft,
      padding: { x: 7, y: 3 }
    });
    label.setOrigin(0.5, 1);
    container.add([column, ...arrows, label]);

    this.updrafts.push({
      ...config,
      container,
      arrows,
      liftSpeed: Number(config.liftSpeed),
      liftAcceleration: Number(config.liftAcceleration ?? 980)
    });
  }

  createCrumblePlatform(config) {
    const centerX = config.x + config.width / 2;
    const centerY = config.y + config.height / 2;
    const platform = this.track(
      this.scene.add.rectangle(centerX, centerY, config.width, config.height, COLORS.collect, 0.001)
    );
    this.scene.physics.add.existing(platform, true);
    platform.setDepth(CRUMBLE_PLATFORM_DEPTH);

    const visual = this.track(this.createCrumbleVisual(centerX, centerY, config.width, config.height));
    const entry = {
      ...config,
      platform,
      visual,
      state: "ready",
      collapseAt: 0,
      respawnAt: 0,
      armedAt: 0
    };
    this.crumblePlatforms.push(entry);
    this.interactions.push(
      this.scene.physics.add.collider(this.player, platform, () => this.armCrumblePlatform(entry))
    );
  }

  createCrumbleVisual(x, y, width, height) {
    const container = this.scene.add.container(x, y).setDepth(CRUMBLE_PLATFORM_DEPTH);
    const segmentWidth = width / 3;
    const segments = Array.from({ length: 3 }, (_, index) => {
      const segment = this.scene.add.rectangle(
        -width / 2 + segmentWidth * (index + 0.5),
        0,
        segmentWidth - 4,
        height,
        COLORS.collect,
        0.96
      );
      segment.setStrokeStyle(3, COLORS.outline, 0.72);
      return segment;
    });
    const cracks = [
      this.scene.add.triangle(-width * 0.18, 2, 0, 0, 13, -height * 0.42, 8, height * 0.42, COLORS.outline, 0.56),
      this.scene.add.triangle(width * 0.2, -1, 0, 0, 11, height * 0.42, 17, -height * 0.4, COLORS.outline, 0.56)
    ];
    container.add([...segments, ...cracks]);
    return container;
  }

  armCrumblePlatform(entry) {
    if (entry.state !== "ready" || this.scene.time.now < entry.armedAt) return;
    const playerBody = this.player.body;
    const platformBody = entry.platform.body;
    const landedOnTop = playerBody.velocity.y >= -20 && playerBody.bottom <= platformBody.top + 20;
    if (!landedOnTop) return;
    entry.state = "warning";
    entry.collapseAt = this.scene.time.now + entry.crumbleDelayMs;
  }

  update(time, delta) {
    if (!this.player?.body?.enable) return;
    this.updateMovingPlatforms();
    this.updateUpdrafts(time, delta);
    this.updateCrumblePlatforms(time);
  }

  updateMovingPlatforms() {
    for (const entry of this.movingPlatforms) {
      const coordinate = entry.platform[entry.axis];
      const low = Math.min(entry.start, entry.end);
      const high = Math.max(entry.start, entry.end);
      const movingTowardEnd = entry.direction > 0;
      const reachedEnd = movingTowardEnd
        ? (entry.end >= entry.start ? coordinate >= high : coordinate <= low)
        : (entry.end >= entry.start ? coordinate <= low : coordinate >= high);
      if (reachedEnd) entry.direction *= -1;

      const velocity = Math.sign(entry.end - entry.start) * entry.direction * entry.speed;
      if (entry.axis === "x") entry.platform.body.setVelocity(velocity, 0);
      else entry.platform.body.setVelocity(0, velocity);
      entry.visual.setPosition(entry.platform.x, entry.platform.y);
    }
  }

  updateUpdrafts(time, delta) {
    const playerBody = this.player.body;
    for (const updraft of this.updrafts) {
      const active = isInside(playerBody, updraft);
      if (active) {
        const nextVelocity = getUpdraftVelocity(
          playerBody.velocity.y,
          updraft.liftSpeed,
          updraft.liftAcceleration,
          delta
        );
        this.player.setVelocityY(nextVelocity);
      }
      updraft.container.setAlpha(active ? 1 : 0.76);
      updraft.arrows.forEach((arrow, index) => {
        const progress = (time * 0.00034 + index / updraft.arrows.length) % 1;
        arrow.y = updraft.height / 2 - 44 - progress * (updraft.height - 76);
        arrow.x = Math.sin(time * 0.003 + index * 1.7) * updraft.width * 0.18;
        arrow.setAlpha(0.3 + Math.sin(progress * Math.PI) * 0.64);
      });
    }
  }

  updateCrumblePlatforms(time) {
    for (const entry of this.crumblePlatforms) {
      if (entry.state === "warning") {
        const remaining = Math.max(0, entry.collapseAt - time);
        const pulse = Math.floor(remaining / 90) % 2 === 0 ? 1 : 0.5;
        entry.visual.setAlpha(pulse);
        entry.visual.setAngle(Math.sin(time * 0.04) * 1.8);
        if (time >= entry.collapseAt) this.collapsePlatform(entry, time);
      } else if (entry.state === "collapsed" && time >= entry.respawnAt) {
        this.restorePlatform(entry, time);
      }
    }
  }

  collapsePlatform(entry, time) {
    entry.state = "collapsed";
    entry.respawnAt = time + entry.respawnMs;
    entry.platform.body.enable = false;
    entry.visual.setVisible(false).setAngle(0);
    this.createCrumbleFragments(entry);
  }

  createCrumbleFragments(entry) {
    const segmentWidth = entry.width / 3;
    for (let index = 0; index < 3; index += 1) {
      const fragment = this.scene.add.rectangle(
        entry.x + segmentWidth * (index + 0.5),
        entry.y + entry.height / 2,
        segmentWidth - 8,
        entry.height * 0.72,
        COLORS.collect,
        0.9
      );
      fragment.setStrokeStyle(2, COLORS.outline, 0.62).setDepth(CRUMBLE_PLATFORM_DEPTH);
      this.scene.tweens.add({
        targets: fragment,
        x: fragment.x + (index - 1) * 22,
        y: fragment.y + 78 + index * 10,
        angle: (index - 1) * 24,
        alpha: 0,
        duration: 420,
        ease: "Quad.In",
        onComplete: () => fragment.destroy()
      });
    }
  }

  restorePlatform(entry, time) {
    entry.state = "ready";
    entry.armedAt = time + 260;
    entry.platform.body.enable = true;
    entry.platform.body.updateFromGameObject();
    entry.visual.setVisible(true).setAlpha(0.25).setAngle(0);
    this.scene.tweens.add({ targets: entry.visual, alpha: 1, duration: 220, ease: "Sine.Out" });
  }

  getSnapshot() {
    return {
      movingPlatforms: this.movingPlatforms.length,
      updrafts: this.updrafts.length,
      crumblePlatforms: this.crumblePlatforms.length,
      warningCrumblePlatforms: this.crumblePlatforms.filter(({ state }) => state === "warning").length
    };
  }

  track(object) {
    this.created.push(object);
    return object;
  }

  destroy() {
    for (const interaction of this.interactions) interaction?.destroy();
    this.interactions.length = 0;
    for (const object of this.created) {
      if (object?.active || object?.scene) object.destroy();
    }
    this.created.length = 0;
    this.movingPlatforms.length = 0;
    this.updrafts.length = 0;
    this.crumblePlatforms.length = 0;
  }
}
