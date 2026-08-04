import Phaser from "phaser";
import { COLORS, CSS_COLORS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../config/constants.js";
import { getCharacter } from "../data/characters.js";
import { getLevel, getNextLevel } from "../data/levels/index.js";
import { AssetManager } from "../systems/AssetManager.js";
import { AudioManager } from "../systems/AudioManager.js";
import { InputManager } from "../systems/InputManager.js";

export class ClearScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.CLEAR);
  }

  init(data) {
    this.result = data;
  }

  create() {
    const level = getLevel(this.result.levelId);
    const next = getNextLevel(level.id);
    const character = getCharacter(this.result.characterId);
    this.cameras.main.setBackgroundColor(COLORS.near);
    this.inputManager = new InputManager(this);
    this.audioManager = new AudioManager(this);
    this.audioManager.playBgm(level.assets.bgm.clear, { loop: false });

    for (let index = 0; index < 34; index += 1) {
      const colors = [COLORS.collect, COLORS.collectBlue, COLORS.collectPink];
      const dot = this.add.circle(
        Phaser.Math.Between(40, GAME_WIDTH - 40),
        Phaser.Math.Between(20, GAME_HEIGHT - 20),
        Phaser.Math.Between(3, 9),
        colors[index % colors.length],
        0.8
      );
      this.tweens.add({ targets: dot, y: dot.y + Phaser.Math.Between(24, 80), duration: 900 + index * 24, yoyo: true, repeat: -1 });
    }

    this.add.text(GAME_WIDTH / 2, 104, "STAGE CLEAR!", {
      fontFamily: "system-ui",
      fontSize: "58px",
      fontStyle: "900",
      color: CSS_COLORS.collect,
      stroke: CSS_COLORS.outline,
      strokeThickness: 8
    }).setOrigin(0.5);

    const texture = AssetManager.ensurePlayerTexture(this, character);
    this.add.image(GAME_WIDTH / 2, 290, texture).setScale(1.9).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 410, `${character.name} · ${level.name}`, {
      fontFamily: "system-ui",
      fontSize: "27px",
      fontStyle: "800",
      color: CSS_COLORS.white
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 472, `기록  ${this.result.elapsed.toFixed(1)}초    ·    점수  ${this.result.score}%`, {
      fontFamily: "system-ui",
      fontSize: "20px",
      color: CSS_COLORS.soft
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 552, next ? `다음 스테이지: ${next.name}` : "모든 Graybox 스테이지 완료", {
      fontFamily: "system-ui",
      fontSize: "18px",
      color: CSS_COLORS.collectBlue
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 632, "Space / Z로 스테이지 선택으로", {
      fontFamily: "system-ui",
      fontSize: "19px",
      fontStyle: "700",
      color: CSS_COLORS.near,
      backgroundColor: CSS_COLORS.whiteSoft,
      padding: { x: 18, y: 10 }
    }).setOrigin(0.5);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.inputManager.destroy();
      this.audioManager.destroy();
    });
  }

  update() {
    if (this.inputManager.sample().confirmPressed) {
      this.audioManager.playSfx("sfx_ui_select", { randomizeRate: false });
      this.scene.start(SCENE_KEYS.STAGE_SELECT);
    }
  }
}
