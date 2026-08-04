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
    const barBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 520, 26, COLORS.outline).setOrigin(0.5);
    const bar = this.add.rectangle(GAME_WIDTH / 2 - 252, GAME_HEIGHT / 2, 0, 14, COLORS.collect).setOrigin(0, 0.5);
    const label = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 58, `${this.level.name} 준비 중`, {
      fontFamily: "system-ui",
      fontSize: "26px",
      fontStyle: "700",
      color: CSS_COLORS.white
    }).setOrigin(0.5);

    this.load.on(Phaser.Loader.Events.PROGRESS, (progress) => {
      bar.width = 504 * progress;
    });
    this.load.on(Phaser.Loader.Events.LOAD_ERROR, (file) => {
      label.setText(`Fallback 준비: ${file.key}`);
    });
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      barBg.setStrokeStyle(2, COLORS.collectBlue);
    });
    AssetManager.queueCharacterAssets(this, this.registry.get("characterId"));
    AssetManager.queueEnemyAssets(this, this.level);
    AssetManager.queueLevelAssets(this, this.level);
  }

  create() {
    this.scene.start(SCENE_KEYS.GAME, { levelId: this.levelId });
  }
}
