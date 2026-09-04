import { COLORS, CSS_COLORS, EVENTS, GAME_HEIGHT } from "../config/constants.js";
import { GAME_FONT_FAMILY } from "../config/font.js";
import {
  createBossEventPayload,
  requireBossDefinition,
  resolveBossPhase,
  resolveBossSpawnX
} from "../data/bossDefinitions.js";
import { ENEMY_DEFINITIONS } from "../data/enemies.js";
import { ITEM_DEFINITIONS } from "../data/items.js";
import { AssetManager } from "./AssetManager.js";
import { EnemyAnimationManager } from "./EnemyAnimationManager.js";

const ITEM_SCALES = Object.freeze({
  star: 0.75,
  percent_small: 0.75,
  percent_large: 0.75,
  horn: 0.75,
  wings: 0.75,
  alicorn: 0.75
});

const BACKGROUND_LAYERS = Object.freeze({
  far: { depth: -30 },
  mid: { depth: -20 },
  near: { depth: -10 }
});
const BACKGROUND_TILE_OVERLAP = 4;
const GATE_VISUALS = Object.freeze({
  archScale: 1.45,
  glowScale: 1.6,
  hoverDistance: 8,
  hoverDurationMs: 920,
  hoverPauseMs: 620,
  sparkleOffsets: Object.freeze([
    Object.freeze({ x: -82, y: -50, size: 8, delay: 0 }),
    Object.freeze({ x: 78, y: -86, size: 10, delay: 190 }),
    Object.freeze({ x: -68, y: 42, size: 7, delay: 390 }),
    Object.freeze({ x: 86, y: 30, size: 8, delay: 570 })
  ])
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
    this.createAtmosphere();
    this.createDecorations();
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
        const tiles = this.createMirroredBackgroundTiles(layer, keys[layer], config.depth, width, height);
        return { layer, tiles };
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

  createAtmosphere() {
    if (this.level.visualTheme !== "starlit-forest") return;
    const farKey = this.level.assets.backgrounds?.normal?.far;
    if (farKey && this.scene.textures.exists(farKey)) return;
    this.createStarlitForestAtmosphere();
  }

  createDecorations() {
    const assetKeys = this.level.assets.decorations ?? {};
    for (const decoration of this.level.decorations ?? []) {
      const key = assetKeys[decoration.asset];
      if (!key || !this.scene.textures.exists(key)) continue;
      const image = this.track(this.scene.add.image(decoration.x, decoration.y, key));
      image
        .setOrigin(0.5, 1)
        .setDisplaySize(decoration.width, decoration.height)
        .setDepth(decoration.depth ?? -4)
        .setAlpha(decoration.alpha ?? 1)
        .setScrollFactor(decoration.scrollFactor ?? 1)
        .setFlipX(Boolean(decoration.flipX));
      if (decoration.asset === "firefly") image.setBlendMode("ADD");
      if (decoration.float) {
        this.scene.tweens.add({
          targets: image,
          y: decoration.y - 10,
          alpha: { from: 0.48, to: decoration.alpha ?? 0.9 },
          duration: 940,
          delay: decoration.delay ?? 0,
          yoyo: true,
          repeat: -1
        });
      }
    }
  }

  createStarlitForestAtmosphere() {
    const { width, height } = this.level.world;
    const nightVeil = this.track(this.scene.add.rectangle(width / 2, height / 2, width, height, COLORS.nightVeil, 0.62));
    nightVeil.setDepth(-9);

    for (let segment = 0; segment <= width; segment += 2048) {
      const moonGlow = this.track(this.scene.add.circle(segment + 570, 152, 92, COLORS.collectBlue, 0.13));
      const moon = this.track(this.scene.add.circle(segment + 570, 152, 52, COLORS.white, 0.9));
      moonGlow.setDepth(-8);
      moon.setDepth(-8);
    }

    for (let index = 0; index < Math.ceil(width / 128); index += 1) {
      const x = 64 + index * 128 + ((index * 37) % 52);
      const y = 54 + ((index * 83) % 310);
      const color = index % 5 === 0 ? COLORS.collect : index % 3 === 0 ? COLORS.collectBlue : COLORS.white;
      const star = this.track(this.scene.add.star(x, y, 4, 2, 6, color, 0.72));
      star.setDepth(-7);
      this.scene.tweens.add({
        targets: star,
        alpha: { from: 0.28, to: 0.92 },
        scale: { from: 0.76, to: 1.18 },
        duration: 860 + (index % 6) * 170,
        delay: (index % 7) * 90,
        yoyo: true,
        repeat: -1
      });
    }

    for (let index = 0; index < Math.ceil(width / 384); index += 1) {
      const x = 168 + index * 384;
      const trunkHeight = 180 + (index % 3) * 48;
      const trunk = this.track(this.scene.add.rectangle(x, 576 - trunkHeight / 2, 54, trunkHeight, COLORS.nightTrunk, 0.94));
      trunk.setDepth(-6);
      const canopyColor = index % 2 === 0 ? COLORS.nightCanopy : COLORS.near;
      const canopyA = this.track(this.scene.add.ellipse(x - 34, 360 - (index % 3) * 18, 180, 132, canopyColor, 0.96));
      const canopyB = this.track(this.scene.add.ellipse(x + 40, 330 - (index % 2) * 24, 164, 144, canopyColor, 0.96));
      canopyA.setDepth(-6);
      canopyB.setDepth(-6);
      const glow = this.track(this.scene.add.circle(x + 46, 450 - (index % 2) * 22, 8, COLORS.collectBlue, 0.8));
      glow.setDepth(-5);
      this.scene.tweens.add({ targets: glow, alpha: 0.24, duration: 700 + (index % 4) * 120, yoyo: true, repeat: -1 });
    }
  }

  setBackgroundMood(mood) {
    if (!mood || mood === this.backgroundMood || !this.backgroundLayers.length) return false;
    const keys = this.level.assets.backgrounds?.[mood] ?? this.level.assets.backgrounds?.normal;
    if (!keys || this.backgroundLayers.some(({ layer }) => !keys[layer] || !this.scene.textures.exists(keys[layer]))) {
      return false;
    }
    for (const { layer, tiles } of this.backgroundLayers) {
      for (const image of tiles) image.setTexture(keys[layer]);
    }
    this.backgroundMood = mood;
    return true;
  }

  createMirroredBackgroundTiles(layer, textureKey, depth, worldWidth, worldHeight) {
    const source = this.scene.textures.get(textureKey)?.getSourceImage();
    const tileWidth = source?.width ?? 2048;
    const tileHeight = source?.height ?? GAME_HEIGHT;
    const tiles = [];

    // 원본과 좌우 반전본을 교차하면 맞닿는 두 가장자리가 같은 픽셀이 된다.
    // 각 타일을 4px 겹쳐 그려 소수점 카메라 이동·텍스처 필터링으로 생기는
    // 1px 수직 틈도 가린다. 원본의 가장자리 픽셀은 후처리 단계에서 동일하다.
    for (let index = -1; index * tileWidth < worldWidth + tileWidth; index += 1) {
      const image = this.track(this.scene.add.image(
        index * tileWidth + tileWidth / 2,
        GAME_HEIGHT / 2,
        textureKey
      ));
      image
        // 배경 원본은 2048×720으로 제작되었다. 월드 높이(768)에 맞춰
        // 늘리면 배경만 흐려지므로, 화면 높이 그대로 표시한다.
        .setDisplaySize(tileWidth + BACKGROUND_TILE_OVERLAP, tileHeight)
        .setFlipX(Math.abs(index) % 2 === 1)
        .setScrollFactor(this.level.parallax[layer], 0)
        .setDepth(depth);
      tiles.push(image);
    }

    return tiles;
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
    const waterFloor = this.level.visualTheme === "submerged-village" && object.name?.includes("_water_floor");

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const isLeft = column === 0;
        const isRight = column === columns - 1;
        let frame;
        if (waterFloor) {
          frame = isLeft ? "dirt_left" : isRight ? "dirt_right" : (column * 2 + row) % 5 === 0 ? "dirt_variant" : "dirt";
        } else if (platform) {
          frame = isLeft ? "platform_left" : isRight ? "platform_right" : "platform_mid";
        } else if (row === 0) {
          frame = isLeft ? "grass_top_left" : isRight ? "grass_top_right" : "grass_top";
        } else {
          frame = isLeft ? "dirt_left" : isRight ? "dirt_right" : (column * 2 + row) % 5 === 0 ? "dirt_variant" : "dirt";
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
          fontFamily: GAME_FONT_FAMILY,
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
    const createVisuals = (type, x, y, alpha = 1) => {
      const glow = this.track(this.scene.add.ellipse(x, y + 2, 58, 30, COLORS.collect, 0.18 * alpha));
      glow.setStrokeStyle(2, COLORS.white, 0.34 * alpha).setDepth(3);
      const key = this.level.assets.objects?.items?.[type];
      if (key && this.scene.textures.exists(key)) {
        const image = this.track(this.scene.add.image(x, y, key));
        image.setScale(ITEM_SCALES[type] ?? 0.65).setAlpha(alpha).setDepth(4);
        return [glow, image];
      }
      if (type === "star") {
        const star = this.track(this.scene.add.star(x, y, 5, 8, 18, COLORS.collect, alpha));
        star.setStrokeStyle(3, COLORS.outline).setDepth(4);
        return [glow, star];
      }
      const definition = ITEM_DEFINITIONS[type];
      const marker = this.track(this.scene.add.circle(x, y, 24, definition?.color ?? COLORS.collect, alpha));
      marker.setStrokeStyle(4, COLORS.outline).setDepth(4);
      return [glow, marker];
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
        register(item.id, "star", item.x, item.y, createVisuals("star", item.x, item.y));
        continue;
      }
      if (item.type === "star_arc") {
        for (let index = 0; index < item.count; index += 1) {
          const angle = Math.PI + (Math.PI * index) / Math.max(1, item.count - 1);
          const x = item.x + Math.cos(angle) * item.radius;
          const y = item.y + Math.sin(angle) * item.radius;
          register(`${item.id}-${index}`, "star", x, y, createVisuals("star", x, y, 0.78));
        }
        continue;
      }

      const visualY = item.y - 44;
      register(item.id, item.type, item.x, visualY, createVisuals(item.type, item.x, visualY));
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
        : enemy.type === "potato_archer"
          ? this.track(this.scene.add.rectangle(enemy.x, enemy.y - 34, 54, 68, definition?.color ?? COLORS.danger))
          : this.track(this.scene.add.ellipse(enemy.x, enemy.y - 28, 58, 54, definition?.color ?? COLORS.danger));
      if (usesArt) {
        marker.setOrigin(0.5, 112 / 128).setDepth(3);
        const isRawPotato = enemy.type === "raw_potato";
        const isPotatoArcher = enemy.type === "potato_archer";
        const bodyWidth = isRawPotato ? 38 : isPotatoArcher ? 52 : 50;
        const bodyHeight = isRawPotato ? 36 : isPotatoArcher ? 52 : 46;
        if (isRawPotato) marker.setScale(0.72);
        if (isPotatoArcher) marker.setScale(0.82);
        marker.body.setSize(bodyWidth, bodyHeight, false);
        marker.body.setOffset((128 - bodyWidth) / 2, 112 - bodyHeight);
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
        usesArt,
        fallbackColor: definition?.color ?? COLORS.danger
      });
      if (usesArt) EnemyAnimationManager.play(marker, enemy.type === "raw_potato" ? "move" : "idle");
      const label = this.track(
        this.scene.add.text(enemy.x, enemy.y - 70, enemy.type, {
          align: "center",
          fontFamily: GAME_FONT_FAMILY,
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
      // 가시 전체가 위험 영역임을 보이도록, 호박 몸통과 양옆 가시까지 포함한다.
      marker.body.setSize(84, 58, false);
      if (usesArt) marker.body.setOffset((128 - 84) / 2, 112 - 58);
      marker.setDataEnabled();
      marker.setData({ ...hazard, destroyed: false, usesArt });
      if (usesArt) EnemyAnimationManager.play(marker, "idle");
      this.hazards.push(marker);
    }
  }

  createBoss() {
    const section = this.level.sections.find((candidate) => candidate.type === "boss");
    if (!section?.boss) return;
    const definition = requireBossDefinition(section.boss.key);
    EnemyAnimationManager.register(this.scene, definition.key);
    const idle = EnemyAnimationManager.getSpec(definition.key, "idle");
    const usesArt = Boolean(idle && this.scene.textures.exists(idle.textureKey));
    const render = usesArt ? definition.render.art : definition.render.fallback;
    if (!render) throw new Error(`보스 렌더링 정의가 없습니다: ${definition.key}`);
    const textureKey = usesArt ? idle.textureKey : `graybox-${definition.key}`;
    if (!usesArt) AssetManager.ensurePlaceholder(this.scene, textureKey, definition.render.placeholder);
    const x = resolveBossSpawnX(section, this.level.progression?.direction, definition);
    const y = Number.isFinite(section.boss.spawn?.y) ? section.boss.spawn.y : this.findSafeY(x);
    const maxHp = section.boss.hp ?? definition.defaultHp;
    const phaseCount = section.boss.phases?.length ?? maxHp;
    const boss = this.scene.physics.add.sprite(x, y, textureKey);
    boss.setOrigin(render.origin.x, render.origin.y).setScale(render.scale).setImmovable(true).setDepth(4);
    boss.body.setAllowGravity(false);
    boss.body.setSize(render.body.width, render.body.height, render.body.center ?? false);
    if (Number.isFinite(render.body.offsetX) && Number.isFinite(render.body.offsetY)) {
      boss.body.setOffset(render.body.offsetX, render.body.offsetY);
    }
    boss.setDataEnabled();
    boss.setData({
      key: definition.key,
      displayName: definition.displayName,
      behavior: definition.behavior,
      completion: section.boss.completion ?? definition.completion,
      hp: maxHp,
      maxHp,
      phase: 1,
      phaseCount,
      vulnerable: false,
      section,
      usesArt,
      type: definition.key
    });
    if (usesArt) EnemyAnimationManager.play(boss, "idle");
    this.boss = boss;
    this.track(boss);
    const label = this.track(
      this.scene.add.text(x, y - 176, `${definition.displayName} · HP ${maxHp}\n${definition.copy.intro}`, {
        align: "center",
        fontFamily: GAME_FONT_FAMILY,
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
    this.boss.setData("phase", resolveBossPhase(
      this.boss.getData("maxHp"),
      hp,
      this.boss.getData("phaseCount")
    ));
    this.boss.setData("vulnerable", false);
    const definition = requireBossDefinition(this.boss.getData("key"));
    const displayName = this.boss.getData("displayName");
    const label = this.boss.getData("label");
    label?.setText(hp > 0 ? `${displayName} · HP ${hp}\n${definition.copy.hit}` : `${displayName} 격파!`);
    player.setVelocityY(-520);
    this.boss.setTintFill(COLORS.collect);
    const payload = createBossEventPayload({
      key: this.boss.getData("key"),
      displayName,
      hp,
      maxHp: this.boss.getData("maxHp"),
      levelId: this.level.id,
      levelName: this.level.name,
      completion: this.boss.getData("completion")
    });
    this.scene.events.emit(EVENTS.BOSS_HIT, payload);

    this.scene.time.delayedCall(220, () => {
      if (this.boss?.active) this.boss.clearTint();
      this.bossHitLocked = false;
    });

    if (hp <= 0) {
      this.boss.body.enable = false;
      this.boss.setData("defeated", true);
      this.spawnGate();
      this.objectiveManager.markBossDefeated(payload.key);
      this.scene.events.emit(EVENTS.BOSS_DEFEATED, payload);
    }
    return true;
  }

  spawnGate() {
    if (this.gate) return this.gate;
    const x = this.level.exit?.x ?? this.level.world.width - 180;
    const y = this.level.exit?.y ?? this.findSafeY(x);
    const archY = y - 81;
    const key = this.level.assets.objects?.gate;
    let arch;
    let glow;
    let label = null;
    let archFinalScale = 1;
    if (key && this.scene.textures.exists(key)) {
      archFinalScale = GATE_VISUALS.archScale;
      glow = this.track(this.scene.add.image(x, archY, key));
      glow
        .setScale(GATE_VISUALS.glowScale)
        .setTint(COLORS.white)
        .setAlpha(0)
        .setBlendMode("ADD")
        .setDepth(2);
      arch = this.track(this.scene.add.image(x, archY, key));
      arch.setScale(archFinalScale * 0.78).setAlpha(0).setDepth(3);
    } else {
      glow = this.track(this.scene.add.ellipse(x, archY, 152, 188, COLORS.collectBlue, 0));
      glow.setStrokeStyle(10, COLORS.white, 0.75).setAlpha(0).setDepth(2);
      arch = this.track(this.scene.add.rectangle(x, y - 82, 116, 164, COLORS.collectBlue, 0));
      arch.setStrokeStyle(12, COLORS.collect).setScale(0.78).setAlpha(0).setDepth(3);
      label = this.track(
        this.scene.add.text(x, y - 190, "무지개 게이트", {
          fontFamily: GAME_FONT_FAMILY,
          fontSize: "20px",
          fontStyle: "700",
          color: CSS_COLORS.collect,
          backgroundColor: CSS_COLORS.panel,
          padding: { x: 10, y: 5 }
        })
      );
      label.setOrigin(0.5).setAlpha(0).setDepth(5);
    }

    const sparkles = GATE_VISUALS.sparkleOffsets.map((sparkle) => {
      const star = this.track(
        this.scene.add.star(x + sparkle.x, archY + sparkle.y, 4, sparkle.size * 0.28, sparkle.size, COLORS.white, 0)
      );
      star.setStrokeStyle(2, COLORS.collectBlue, 0.9).setScale(0.45).setDepth(5);
      return { star, delay: sparkle.delay };
    });
    const zone = this.scene.add.zone(x, y - 76, 164, 188);
    this.scene.physics.add.existing(zone, true);
    const floatingTargets = [glow, arch, label, ...sparkles.map(({ star }) => star)].filter(Boolean);
    const tweens = [
      this.scene.tweens.add({
        targets: arch,
        alpha: 1,
        scale: archFinalScale,
        duration: 420,
        ease: "Back.Out"
      }),
      this.scene.tweens.add({
        targets: glow,
        alpha: { from: 0, to: 0.3 },
        duration: 460,
        yoyo: true,
        repeat: -1,
        repeatDelay: 180,
        ease: "Sine.InOut"
      }),
      this.scene.tweens.add({
        targets: floatingTargets,
        y: `-=${GATE_VISUALS.hoverDistance}`,
        delay: 240,
        duration: GATE_VISUALS.hoverDurationMs,
        hold: 150,
        yoyo: true,
        repeat: -1,
        repeatDelay: GATE_VISUALS.hoverPauseMs,
        ease: "Sine.InOut"
      })
    ];

    if (label) {
      tweens.push(this.scene.tweens.add({ targets: label, alpha: 1, duration: 260, delay: 160 }));
    }
    for (const { star, delay } of sparkles) {
      tweens.push(this.scene.tweens.add({
        targets: star,
        alpha: { from: 0, to: 1 },
        scale: { from: 0.45, to: 1.12 },
        angle: 45,
        duration: 280,
        delay,
        hold: 110,
        yoyo: true,
        repeat: -1,
        repeatDelay: 420 + delay,
        ease: "Sine.InOut"
      }));
    }

    this.gate = { zone, arch, glow, label, sparkles: sparkles.map(({ star }) => star), tweens };
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

  findSurfaceBelow(x, y) {
    const surfaces = this.getTerrainObjects()
      .filter((object) => x >= object.x && x <= object.x + object.width && object.y >= y - 24)
      .map((object) => object.y);
    return surfaces.length ? Math.min(...surfaces) : null;
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
    const sections = this.level.sections;

    // 시작 지점보다 왼쪽으로 잠시 벗어나도 마지막(보스) 섹션으로
    // fallback되지 않도록, 시작 이전 좌표는 첫 번째 섹션으로 처리한다.
    if (x < sections[0]?.xStart) {
      return sections[0] ?? null;
    }

    return sections.find((section) => x >= section.xStart && x < section.xEnd) ?? sections.at(-1) ?? null;
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
    for (const tween of this.gate?.tweens ?? []) tween.stop();
    this.gate?.zone.destroy();
    this.gate = null;
    if (this.terrainBodies?.world?.bodies) {
      this.terrainBodies.destroy(true);
    }
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
