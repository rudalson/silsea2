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

    for (const item of this.level.items) {
      if (item.type === "star") {
        createStar(item.x, item.y);
        continue;
      }
      if (item.type === "star_arc") {
        for (let index = 0; index < item.count; index += 1) {
          const angle = Math.PI + (Math.PI * index) / Math.max(1, item.count - 1);
          createStar(item.x + Math.cos(angle) * item.radius, item.y + Math.sin(angle) * item.radius, 0.78);
        }
        continue;
      }

      const definition = ITEM_DEFINITIONS[item.type];
      const marker = this.track(this.scene.add.circle(item.x, item.y - 44, 24, definition?.color ?? COLORS.collect));
      marker.setStrokeStyle(4, COLORS.outline).setDepth(4);
      const label = this.track(
        this.scene.add.text(item.x, item.y - 86, item.type, {
          fontFamily: "system-ui",
          fontSize: "13px",
          color: CSS_COLORS.near,
          backgroundColor: CSS_COLORS.whiteSoft,
          padding: { x: 6, y: 3 }
        })
      );
      label.setOrigin(0.5).setDepth(5);
    }
  }

  createEnemyMarkers() {
    for (const enemy of this.level.enemies) {
      const definition = ENEMY_DEFINITIONS[enemy.type];
      const marker = this.track(this.scene.add.ellipse(enemy.x, enemy.y - 28, 58, 54, definition?.color ?? COLORS.danger));
      marker.setStrokeStyle(4, COLORS.outline).setDepth(3);
      const label = this.track(
        this.scene.add.text(enemy.x, enemy.y - 70, `${enemy.type}\n(Phase 2)`, {
          align: "center",
          fontFamily: "system-ui",
          fontSize: "12px",
          color: CSS_COLORS.white,
          backgroundColor: CSS_COLORS.dangerMedium,
          padding: { x: 5, y: 3 }
        })
      );
      label.setOrigin(0.5).setDepth(4);
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
    boss.setData({ key: section.boss.key, hp: section.boss.hp, maxHp: section.boss.hp, section });
    this.boss = boss;
    this.track(boss);
    const label = this.track(
      this.scene.add.text(x, y - 176, `임시 보스 · HP ${section.boss.hp}\n머리를 3번 밟으세요`, {
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
    if (!this.boss?.active || this.bossHitLocked) return false;
    this.bossHitLocked = true;
    const hp = this.boss.getData("hp") - 1;
    this.boss.setData("hp", hp);
    const label = this.boss.getData("label");
    label?.setText(hp > 0 ? `임시 보스 · HP ${hp}\n다시 머리를 밟으세요` : "임시 보스 격파!");
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
