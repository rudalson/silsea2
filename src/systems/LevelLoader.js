import { COLORS, CSS_COLORS, EVENTS } from "../config/constants.js";
import { ENEMY_DEFINITIONS } from "../data/enemies.js";
import { ITEM_DEFINITIONS } from "../data/items.js";
import { AssetManager } from "./AssetManager.js";

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
  }

  build() {
    this.tilemap = this.scene.cache.json.get(this.level.assets.tilemapKey);
    if (!this.tilemap) throw new Error(`Tiled JSON을 찾을 수 없습니다: ${this.level.assets.tilemapKey}`);

    this.scene.physics.world.setBounds(0, 0, this.level.world.width, this.level.world.height + 256);
    this.createBackground();
    this.createTerrain();
    this.createSectionMarkers();
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

  createTerrain() {
    this.terrainBodies = this.scene.physics.add.staticGroup();
    for (const object of this.getTerrainObjects()) {
      const color = object.type === "platform" ? COLORS.ground : COLORS.ground;
      const rectangle = this.scene.add.rectangle(
        object.x + object.width / 2,
        object.y + object.height / 2,
        object.width,
        object.height,
        color
      );
      rectangle.setStrokeStyle(4, COLORS.outline, 1).setDepth(0);
      this.scene.physics.add.existing(rectangle, true);
      this.terrainBodies.add(rectangle);

      const grass = this.track(
        this.scene.add.rectangle(object.x + object.width / 2, object.y + 6, object.width - 4, 12, COLORS.grass)
      );
      grass.setDepth(1);
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
      const pole = this.track(this.scene.add.rectangle(checkpoint.x, checkpoint.y - 54, 8, 108, COLORS.outline));
      const flag = this.track(
        this.scene.add.triangle(checkpoint.x + 27, checkpoint.y - 92, 0, 0, 58, 18, 0, 36, COLORS.collectBlue)
      );
      pole.setDepth(3);
      flag.setDepth(3);
      const zone = this.scene.add.zone(checkpoint.x, checkpoint.y - 48, 64, 112);
      this.scene.physics.add.existing(zone, true);
      this.checkpointZones.push({ zone, data: checkpoint, visuals: [pole, flag] });
    }
  }

  createItemMarkers() {
    const createStar = (x, y, alpha = 1) => {
      const star = this.track(this.scene.add.star(x, y, 5, 8, 18, COLORS.collect, alpha));
      star.setStrokeStyle(3, COLORS.outline).setDepth(4);
      return star;
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
        register(item.id, "star", item.x, item.y, [createStar(item.x, item.y)]);
        continue;
      }
      if (item.type === "star_arc") {
        for (let index = 0; index < item.count; index += 1) {
          const angle = Math.PI + (Math.PI * index) / Math.max(1, item.count - 1);
          const x = item.x + Math.cos(angle) * item.radius;
          const y = item.y + Math.sin(angle) * item.radius;
          register(`${item.id}-${index}`, "star", x, y, [createStar(x, y, 0.78)]);
        }
        continue;
      }

      const definition = ITEM_DEFINITIONS[item.type];
      const visualY = item.y - 44;
      const marker = this.track(this.scene.add.circle(item.x, visualY, 24, definition?.color ?? COLORS.collect));
      marker.setStrokeStyle(4, COLORS.outline).setDepth(4);
      const label = this.track(
        this.scene.add.text(item.x, visualY - 42, item.type, {
          fontFamily: "system-ui",
          fontSize: "13px",
          color: CSS_COLORS.near,
          backgroundColor: CSS_COLORS.whiteSoft,
          padding: { x: 6, y: 3 }
        })
      );
      label.setOrigin(0.5).setDepth(5);
      register(item.id, item.type, item.x, visualY, [marker, label]);
    }
  }

  createEnemyMarkers() {
    for (const enemy of this.level.enemies) {
      const definition = ENEMY_DEFINITIONS[enemy.type];
      const marker = this.track(this.scene.add.ellipse(enemy.x, enemy.y - 28, 58, 54, definition?.color ?? COLORS.danger));
      marker.setStrokeStyle(4, COLORS.outline).setDepth(3);
      this.scene.physics.add.existing(marker);
      marker.body.setSize(50, 46, true);
      marker.body.setAllowGravity(enemy.type === "raw_potato");
      marker.setDataEnabled();
      marker.setData({
        ...enemy,
        spawnX: enemy.x,
        spawnY: enemy.y - 28,
        state: "idle",
        stateUntil: 0,
        activeAttack: false
      });
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
      label.setOrigin(0.5).setDepth(4);
      marker.setData("label", label);
      this.enemies.push(marker);
    }
  }

  createHazards() {
    for (const hazard of this.level.hazards.filter((candidate) => candidate.type === "spike_pumpkin")) {
      const marker = this.track(
        this.scene.add.triangle(hazard.x, hazard.y, 0, 52, 28, 0, 56, 52, COLORS.danger)
      );
      marker.setOrigin(0.5, 1).setStrokeStyle(4, COLORS.outline).setDepth(3);
      this.scene.physics.add.existing(marker, true);
      marker.body.setSize(48, 48, true);
      marker.setDataEnabled();
      marker.setData({ ...hazard, destroyed: false });
      this.hazards.push(marker);
    }
  }

  createBoss() {
    const section = this.level.sections.find((candidate) => candidate.type === "boss");
    if (!section?.boss) return;
    const key = `graybox-${section.boss.key}`;
    AssetManager.ensurePlaceholder(this.scene, key, { width: 150, height: 150, color: COLORS.dangerAlt });
    const x = section.xEnd - 560;
    const y = this.findSafeY(x);
    const boss = this.scene.physics.add.sprite(x, y, key);
    boss.setOrigin(0.5, 1).setImmovable(true).setDepth(4);
    boss.body.setAllowGravity(false);
    boss.body.setSize(118, 118, true);
    boss.setDataEnabled();
    boss.setData({
      key: section.boss.key,
      hp: section.boss.hp,
      maxHp: section.boss.hp,
      phase: 1,
      vulnerable: false,
      section
    });
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
    label.setOrigin(0.5).setDepth(5);
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
      this.boss.disableBody(true, true);
      this.spawnGate();
    }
    return true;
  }

  spawnGate() {
    if (this.gate) return this.gate;
    const x = this.level.world.width - 180;
    const y = this.findSafeY(x);
    const arch = this.track(this.scene.add.rectangle(x, y - 82, 116, 164, COLORS.collectBlue, 0.28));
    arch.setStrokeStyle(12, COLORS.collect).setDepth(3);
    const label = this.track(
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
    this.boss = null;
  }
}
