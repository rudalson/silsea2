import Phaser from "phaser";
import { COLORS, CSS_COLORS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../config/constants.js";
import { getLevel } from "../data/levels/index.js";
import { assertLevelShape } from "../data/schema/levelSchema.js";
import { AssetManager } from "../systems/AssetManager.js";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.PRELOAD);
  }

  init(data) {
    this.levelId = data.levelId ?? this.registry.get("levelId");
    this.level = getLevel(this.levelId);
    assertLevelShape(this.level);
  }

  preload() {
    this.cameras.main.setBackgroundColor(COLORS.near);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.near);
    this.add.circle(120, 114, 160, COLORS.collectBlue, 0.16);
    this.add.circle(GAME_WIDTH - 80, GAME_HEIGHT - 92, 240, COLORS.collectPink, 0.12);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 174, GAME_WIDTH, 188, COLORS.mid, 0.22);

    const hasUiArt = this.textures.exists("ui_hud_frame");
    if (hasUiArt) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 12, "ui_hud_frame").setScale(0.5);
      const percentCoin = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 152, "ui_hud_percent").setScale(0.15);
      this.tweens.add({ targets: percentCoin, y: percentCoin.y - 8, duration: 700, yoyo: true, repeat: -1 });
    } else {
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 12, 660, 250, COLORS.near, 0.94)
        .setStrokeStyle(4, COLORS.collect);
    }

    const barBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 48, 430, 28, COLORS.outline, 0.92).setOrigin(0.5);
    const barInset = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 48, 418, 16, COLORS.mid, 0.9).setOrigin(0.5);
    const bar = this.add.rectangle(GAME_WIDTH / 2 - 209, GAME_HEIGHT / 2 + 48, 0, 16, COLORS.collect, 1).setOrigin(0, 0.5);
    const usingFallback = Boolean(this.registry.get("forceAssetFallback"));
    const label = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 50,
      usingFallback ? `${this.level.name} 도형·무음 모드 준비 중` : `${this.level.name} 준비 중`,
      {
        fontFamily: "system-ui",
        fontSize: "28px",
        fontStyle: "700",
        color: CSS_COLORS.white,
        stroke: CSS_COLORS.panel,
        strokeThickness: 6
      }
    ).setOrigin(0.5);
    const status = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 89, "무지개 마법을 모으는 중…", {
      fontFamily: "system-ui",
      fontSize: "15px",
      fontStyle: "700",
      color: CSS_COLORS.soft
    }).setOrigin(0.5);

    this.load.on(Phaser.Loader.Events.PROGRESS, (progress) => {
      bar.width = 418 * progress;
      status.setText(progress >= 1 ? "출발 준비 완료!" : `무지개 마법 ${Math.round(progress * 100)}%`);
    });
    this.load.on(Phaser.Loader.Events.LOAD_ERROR, (file) => {
      label.setText(`Fallback 준비: ${file.key}`);
    });
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      barBg.setStrokeStyle(2, COLORS.collectBlue);
      barInset.setFillStyle(COLORS.mid, 1);
    });
    AssetManager.queueCharacterAssets(this, this.registry.get("characterId"));
    AssetManager.queueEnemyAssets(this, this.level);
    AssetManager.queueLevelAssets(this, this.level);
  }

  create() {
    this.scene.start(SCENE_KEYS.GAME, { levelId: this.levelId });
  }
}
