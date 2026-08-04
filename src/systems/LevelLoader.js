import { COLORS, CSS_COLORS, EVENTS } from "../config/constants.js";
import { ENEMY_DEFINITIONS } from "../data/enemies.js";
import { ITEM_DEFINITIONS } from "../data/items.js";
import { AssetManager } from "./AssetManager.js";
import { EnemyAnimationManager } from "./EnemyAnimationManager.js";

const ITEM_SCALES = Object.freeze({
  star: 0.65,
  percent_small: 0.7,
  percent_large: 0.68,
  horn: 0.65,
  wings: 0.68,
  alicorn: 0.68
});

const BACKGROUND_LAYERS = Object.freeze({
  far: { depth: -30 },
  mid: { depth: -20 },
  near: { depth: -10 }
});

export class LevelLoader {
  constructor(scene, level, objectiveManager) {
    this.scene = scene;
    this.level = level;
    this.objectiveManager = objectiveManager;
    this.created = [];
    this.terrainBodies = null;
    this.checkpointZones = [];
    this.collectibles = [];
    this.enemies = [];
    this.hazards = [];
    this.gate = null;
    this.boss = null;
    this.bossHitLocked = false;
    this.tilemap = null;
    this.backgroundLayers = [];
    this.backgroundMood = null;
  }

  build() {
    this.tilemap = this.scene.cache.json.get(this.level.assets.tilemapKey);
    if (!this.tilemap) throw new Error(`Tiled JSON을 찾을 수 없습니다: ${this.level.assets.tilemapKey}`);

    this.scene.physics.world.setBounds(0, 0, this.level.world.width, this.level.world.height + 256);
    this.createBackground();
    this.createTerrain();
    if (this.scene.registry.get("debugEnabled")) this.createSectionMarkers();
    this.createCheckpoints();
    this.createItemMarkers();
    this.createEnemyMarkers();
    this.createHazards();
    this.createBoss();

    if (!this.boss) this.spawnGate();
    return this;
  }

  createBackground() {
    const { width, height } = this.level.world;
    const initialMood = this.level.sections[0]?.mood ?? "normal";
    const keys = this.level.assets.backgrounds?.[initialMood];
    const canUseImages = keys && Object.keys(BACKGROUND_LAYERS).every(
      (layer) => keys[layer] && this.scene.textures.exists(keys[layer])
    );

    if (canUseImages) {
      this.backgroundLayers = Object.entries(BACKGROUND_LAYERS).map(([layer, config]) => {
        const image = this.track(this.scene.add.tileSprite(width / 2, height / 2, width * 1.2, height, keys[layer]));
        image.setScrollFactor(this.level.parallax[layer], 0).setDepth(config.depth);
        return { layer, image };
      });
      this.backgroundMood = initialMood;
      return;
    }

    const far = this.track(this.scene.add.rectangle(width / 2, height * 0.56, width * 1.15, height * 0.56, COLORS.far, 1));
    far.setScrollFactor(this.level.parallax.far, 0.2).setDepth(-30);

    const mid = this.track(this.scene.add.rectangle(width / 2, height * 0.7, width * 1.1, height * 0.34, COLORS.mid, 0.9));
    mid.setScrollFactor(this.level.parallax.mid, 0.5).setDepth(-20);

    for (let x = 480; x < width; x += 960) {
      const hill = this.track(this.scene.add.ellipse(x, height * 0.64, 620, 240, COLORS.bgMid ?? COLORS.mid, 0.7));
      hill.setScrollFactor(this.level.parallax.mid, 0.55).setDepth(-19);
    }

    const near = this.track(this.scene.add.rectangle(width / 2, height - 30, width, 120, COLORS.near, 0.35));
    near.setScrollFactor(this.level.parallax.near, 1).setDepth(-10);
  }

  setBackgroundMood(mood) {
    if (!mood || mood === this.backgroundMood || !this.backgroundLayers.length) return false;
    const keys = this.level.assets.backgrounds?.[mood] ?? this.level.assets.backgrounds?.normal;
    if (!keys || this.backgroundLayers.some(({ layer }) => !keys[layer] || !this.scene.textures.exists(keys[layer]))) {
      return false;
    }
    for (const { layer, image } of this.backgroundLayers) image.setTexture(keys[layer]);
    this.backgroundMood = mood;
    return true;
  }

  createTerrain() {
    this.terrainBodies = this.scene.physics.add.staticGroup();
    const tilesetKey = this.level.assets.tileset;
    const useTileset = Boolean(tilesetKey && this.scene.textures.exists(tilesetKey));
    for (const object of this.getTerrainObjects()) {
      const color = object.type === "platform" ? COLORS.ground : COLORS.ground;
      const rectangle = this.scene.add.rectangle(
        object.x + object.width / 2,
        object.y + object.height / 2,
        object.width,
        object.height,
        color,
        useTileset ? 0 : 1
      );
      if (!useTileset) rectangle.setStrokeStyle(4, COLORS.outline, 1);
      rectangle.setDepth(0);
      this.scene.physics.add.existing(rectangle, true);
      this.terrainBodies.add(rectangle);

      if (useTileset) {
        this.createTerrainTiles(object, tilesetKey);
      } else {
        const grass = this.track(
          this.scene.add.rectangle(object.x + object.width / 2, object.y + 6, object.width - 4, 12, COLORS.grass)
        );
        grass.setDepth(1);
      }
    }
  }

  createTerrainTiles(object, tilesetKey) {
    const tileSize = this.level.world.tileSize;
    const columns = Math.ceil(object.width / tileSize);
    const rows = Math.ceil(object.height / tileSize);
    const platform = object.type === "platform";

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const isLeft = column === 0;
        const isRight = column === columns - 1;
        let frame;
        if (platform) {
          frame = isLeft ? "platform_left" : isRight ? "platform_right" : "platform_mid";
        } else if (row === 0) {
          frame = isLeft ? "grass_top_left" : isRight ? "grass_top_right" : "grass_top";
        } else {
          frame = isLeft ? "dirt_left" : isRight ? "dirt_right" : (column + row) % 3 === 0 ? "dirt_variant" : "dirt";
        }

        const width = Math.min(tileSize, object.width - column * tileSize);
        const height = Math.min(tileSize, object.height - row * tileSize);
        const tile = this.track(
          this.scene.add.image(object.x + column * tileSize, object.y + row * tileSize, tilesetKey, frame)
        );
        tile.setOrigin(0, 0).setDisplaySize(width, height).setDepth(0);
      }
    }
  }

  createSectionMarkers() {
    for (const section of this.level.sections) {
      const line = this.track(this.scene.add.rectangle(section.xStart + 2, 120, 4, 160, COLORS.collectBlue, 0.35));
      line.setDepth(-5);
      const label = this.track(
        this.scene.add.text(section.xStart + 18, 66, `${section.id}\n${section.type}`, {
          fontFamily: "system-ui",
          fontSize: "18px",
          fontStyle: "700",
          color: CSS_COLORS.white,
          backgroundColor: CSS_COLORS.panelSoft,
          padding: { x: 8, y: 5 }
        })
      );
      label.setDepth(5);
    }
  }

  createCheckpoints() {
    for (const checkpoint of this.level.checkpoints) {
      const key = this.level.assets.objects?.checkpoint;
      let visuals;
      if (key && this.scene.textures.exists(key)) {
        const flag = this.track(this.scene.add.image(checkpoint.x, checkpoint.y - 48, key));
        flag.setDepth(3).setAlpha(0.82);
        visuals = [flag];
      } else {
        const pole = this.track(this.scene.add.rectangle(checkpoint.x, checkpoint.y - 54, 8, 108, COLORS.outline));
        const flag = this.track(
          this.scene.add.triangle(checkpoint.x + 27, checkpoint.y - 92, 0, 0, 58, 18, 0, 36, COLORS.collectBlue)
        );
        pole.setDepth(3);
        flag.setDepth(3);
        visuals = [pole, flag];
      }
      const zone = this.scene.add.zone(checkpoint.x, checkpoint.y - 48, 64, 112);
      this.scene.physics.add.existing(zone, true);
      this.checkpointZones.push({ zone, data: checkpoint, visuals });
    }
  }

  createItemMarkers() {
    const createVisual = (type, x, y, alpha = 1) => {
      const key = this.level.assets.objects?.items?.[type];
      if (key && this.scene.textures.exists(key)) {
        const image = this.track(this.scene.add.image(x, y, key));
        image.setScale(ITEM_SCALES[type] ?? 0.65).setAlpha(alpha).setDepth(4);
        return image;
      }
      if (type === "star") {
        const star = this.track(this.scene.add.star(x, y, 5, 8, 18, COLORS.collect, alpha));
        star.setStrokeStyle(3, COLORS.outline).setDepth(4);
        return star;
      }
      const definition = ITEM_DEFINITIONS[type];
      const marker = this.track(this.scene.add.circle(x, y, 24, definition?.color ?? COLORS.collect, alpha));
      marker.setStrokeStyle(4, COLORS.outline).setDepth(4);
      return marker;
    };

    const register = (id, type, x, y, visuals) => {
      const zone = this.track(this.scene.add.zone(x, y, 48, 48));
      this.scene.physics.add.existing(zone, true);
      const collectible = { id, type, x, y, zone, visuals, active: true, magnetizing: false };
      this.collectibles.push(collectible);
      return collectible;
    };

    for (const item of this.level.items) {
      if (item.type === "star") {
        register(item.id, "star", item.x, item.y, [createVisual("star", item.x, item.y)]);
        continue;
      }
      if (item.type === "star_arc") {
        for (let index = 0; index < item.count; index += 1) {
          const angle = Math.PI + (Math.PI * index) / Math.max(1, item.count - 1);
          const x = item.x + Math.cos(angle) * item.radius;
          const y = item.y + Math.sin(angle) * item.radius;
          register(`${item.id}-${index}`, "star", x, y, [createVisual("star", x, y, 0.78)]);
        }
        continue;
      }

      const visualY = item.y - 44;
      register(item.id, item.type, item.x, visualY, [createVisual(item.type, item.x, visualY)]);
    }
  }

  createEnemyMarkers() {
    for (const enemy of this.level.enemies) {
      const definition = ENEMY_DEFINITIONS[enemy.type];
      EnemyAnimationManager.register(this.scene, enemy.type);
      const idle = EnemyAnimationManager.getSpec(enemy.type, "idle");
      const usesArt = Boolean(idle && this.scene.textures.exists(idle.textureKey));
      const marker = usesArt
        ? this.track(this.scene.physics.add.sprite(enemy.x, enemy.y, idle.textureKey))
        : this.track(this.scene.add.ellipse(enemy.x, enemy.y - 28, 58, 54, definition?.color ?? COLORS.danger));
      if (usesArt) {
        marker.setOrigin(0.5, 112 / 128).setDepth(3);
        marker.body.setSize(50, 46, false);
        marker.body.setOffset(39, 112 - 46);
      } else {
        marker.setStrokeStyle(4, COLORS.outline).setDepth(3);
        this.scene.physics.add.existing(marker);
        marker.body.setSize(50, 46, true);
      }
      marker.body.setAllowGravity(enemy.type === "raw_potato");
      marker.setDataEnabled();
      marker.setData({
        ...enemy,
        spawnX: enemy.x,
        spawnY: marker.y,
        state: "idle",
        stateUntil: 0,
        activeAttack: false,
        usesArt
      });
      if (usesArt) EnemyAnimationManager.play(marker, enemy.type === "raw_potato" ? "move" : "idle");
      const label = this.track(
        this.scene.add.text(enemy.x, enemy.y - 70, enemy.type, {
          align: "center",
          fontFamily: "system-ui",
          fontSize: "12px",
          color: CSS_COLORS.white,
          backgroundColor: CSS_COLORS.dangerMedium,
          padding: { x: 5, y: 3 }
        })
      );
      label.setOrigin(0.5).setDepth(4).setVisible(!usesArt);
      marker.setData("label", label);
      this.enemies.push(marker);
    }
  }

  createHazards() {
    for (const hazard of this.level.hazards.filter((candidate) => candidate.type === "spike_pumpkin")) {
      EnemyAnimationManager.register(this.scene, hazard.type);
      const idle = EnemyAnimationManager.getSpec(hazard.type, "idle");
      const usesArt = Boolean(idle && this.scene.textures.exists(idle.textureKey));
      const marker = usesArt
        ? this.track(this.scene.add.sprite(hazard.x, hazard.y, idle.textureKey))
        : this.track(this.scene.add.triangle(hazard.x, hazard.y, 0, 52, 28, 0, 56, 52, COLORS.danger));
      if (usesArt) marker.setOrigin(0.5, 112 / 128).setDepth(3);
      else marker.setOrigin(0.5, 1).setStrokeStyle(4, COLORS.outline).setDepth(3);
      this.scene.physics.add.existing(marker, true);
      marker.body.setSize(48, 48, false);
      if (usesArt) marker.body.setOffset(40, 112 - 48);
      marker.setDataEnabled();
      marker.setData({ ...hazard, destroyed: false, usesArt });
      if (usesArt) EnemyAnimationManager.play(marker, "idle");
      this.hazards.push(marker);
    }
  }

  createBoss() {
    const section = this.level.sections.find((candidate) => candidate.type === "boss");
    if (!section?.boss) return;
    EnemyAnimationManager.register(this.scene, section.boss.key);
    const idle = EnemyAnimationManager.getSpec(section.boss.key, "idle");
    const usesArt = Boolean(idle && this.scene.textures.exists(idle.textureKey));
    const key = usesArt ? idle.textureKey : `graybox-${section.boss.key}`;
    if (!usesArt) AssetManager.ensurePlaceholder(this.scene, key, { width: 150, height: 150, color: COLORS.dangerAlt });
    const x = section.xEnd - 560;
    const y = this.findSafeY(x);
    const boss = this.scene.physics.add.sprite(x, y, key);
    boss.setOrigin(0.5, usesArt ? 112 / 128 : 1).setImmovable(true).setDepth(4);
    if (usesArt) boss.setScale(1.5);
    boss.body.setAllowGravity(false);
    if (usesArt) {
      boss.body.setSize(82, 78, false);
      boss.body.setOffset(23, 112 - 78);
    } else {
      boss.body.setSize(118, 118, true);
    }
    boss.setDataEnabled();
    boss.setData({
      key: section.boss.key,
      hp: section.boss.hp,
      maxHp: section.boss.hp,
      phase: 1,
      vulnerable: false,
      section,
      usesArt,
      type: section.boss.key
    });
    if (usesArt) EnemyAnimationManager.play(boss, "idle");
    this.boss = boss;
    this.track(boss);
    const label = this.track(
      this.scene.add.text(x, y - 176, `감자 대왕 · HP ${section.boss.hp}\n공격 예고 뒤 반짝이는 약점을 밟으세요`, {
        align: "center",
        fontFamily: "system-ui",
        fontSize: "18px",
        fontStyle: "700",
        color: CSS_COLORS.collect,
        backgroundColor: CSS_COLORS.panel,
        padding: { x: 10, y: 6 }
      })
    );
    label.setOrigin(0.5).setDepth(5).setVisible(!usesArt);
    boss.setData("label", label);
  }

  hitBoss(player) {
    if (!this.boss?.active || this.bossHitLocked || !this.boss.getData("vulnerable")) return false;
    this.bossHitLocked = true;
    const hp = this.boss.getData("hp") - 1;
    this.boss.setData("hp", hp);
    this.boss.setData("phase", Math.min(3, this.boss.getData("maxHp") - hp + 1));
    this.boss.setData("vulnerable", false);
    const label = this.boss.getData("label");
    label?.setText(hp > 0 ? `감자 대왕 · HP ${hp}\n공격 예고 뒤 약점을 노리세요` : "감자 대왕 격파!");
    player.setVelocityY(-520);
    this.boss.setTintFill(COLORS.collect);
    this.scene.events.emit(EVENTS.BOSS_HIT, { hp, maxHp: this.boss.getData("maxHp") });

    this.scene.time.delayedCall(220, () => {
      if (this.boss?.active) this.boss.clearTint();
      this.bossHitLocked = false;
    });

    if (hp <= 0) {
      const key = this.boss.getData("key");
      this.objectiveManager.markBossDefeated(key);
      this.scene.events.emit(EVENTS.BOSS_DEFEATED, key);
      this.boss.body.enable = false;
      this.boss.setData("defeated", true);
      this.spawnGate();
    }
    return true;
  }

  spawnGate() {
    if (this.gate) return this.gate;
    const x = this.level.world.width - 180;
    const y = this.findSafeY(x);
    const key = this.level.assets.objects?.gate;
    let arch;
    let label = null;
    if (key && this.scene.textures.exists(key)) {
      arch = this.track(this.scene.add.image(x, y - 81, key));
      arch.setScale(1.45).setDepth(3);
    } else {
      arch = this.track(this.scene.add.rectangle(x, y - 82, 116, 164, COLORS.collectBlue, 0.28));
      arch.setStrokeStyle(12, COLORS.collect).setDepth(3);
      label = this.track(
        this.scene.add.text(x, y - 190, "무지개 게이트", {
          fontFamily: "system-ui",
          fontSize: "20px",
          fontStyle: "700",
          color: CSS_COLORS.collect,
          backgroundColor: CSS_COLORS.panel,
          padding: { x: 10, y: 5 }
        })
      );
      label.setOrigin(0.5).setDepth(5);
    }
    const zone = this.scene.add.zone(x, y - 70, 92, 140);
    this.scene.physics.add.existing(zone, true);
    this.gate = { zone, arch, label };
    return this.gate;
  }

  getTerrainObjects() {
    return this.tilemap.layers.find((layer) => layer.type === "objectgroup" && layer.name === "terrain")?.objects ?? [];
  }

  findSafeY(x) {
    const surfaces = this.getTerrainObjects()
      .filter((object) => x >= object.x && x <= object.x + object.width)
      .map((object) => object.y);
    return surfaces.length ? Math.min(...surfaces) : this.level.player.spawn.y;
  }

  findNearestSafePoint(x) {
    const surfaces = this.getTerrainObjects().map((object) => ({
      x: Math.max(object.x + 48, Math.min(x, object.x + object.width - 48)),
      y: object.y,
      distance: x < object.x ? object.x - x : x > object.x + object.width ? x - object.x - object.width : 0
    }));
    surfaces.sort((left, right) => left.distance - right.distance || left.y - right.y);
    return surfaces[0] ?? { ...this.level.player.spawn };
  }

  getSection(id) {
    return this.level.sections.find((section) => section.id === id) ?? null;
  }

  getSectionAt(x) {
    return this.level.sections.find((section) => x >= section.xStart && x < section.xEnd) ?? this.level.sections.at(-1);
  }

  track(object) {
    this.created.push(object);
    return object;
  }

  destroy() {
    for (const checkpoint of this.checkpointZones) checkpoint.zone.destroy();
    this.checkpointZones.length = 0;
    this.collectibles.length = 0;
    this.enemies.length = 0;
    this.hazards.length = 0;
    this.gate?.zone.destroy();
    this.gate = null;
    this.terrainBodies?.clear(true, true);
    this.terrainBodies?.destroy(true);
    this.terrainBodies = null;
    for (const object of this.created) {
      if (object?.active || object?.scene) object.destroy();
    }
    this.created.length = 0;
    this.backgroundLayers.length = 0;
    this.backgroundMood = null;
    this.boss = null;
  }
}
