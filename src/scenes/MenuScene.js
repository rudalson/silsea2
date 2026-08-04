import Phaser from "phaser";
import { COLORS, CSS_COLORS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../config/constants.js";
import { AudioManager } from "../systems/AudioManager.js";
import { InputManager } from "../systems/InputManager.js";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.MENU);
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.skyTop);
    this.add.rectangle(GAME_WIDTH / 2, 560, GAME_WIDTH, 320, COLORS.mid);
    this.add.ellipse(240, 510, 760, 260, COLORS.far, 0.85);
    this.add.ellipse(1030, 530, 880, 300, COLORS.far, 0.75);
    this.add.rectangle(GAME_WIDTH / 2, 660, GAME_WIDTH, 120, COLORS.ground);
    this.add.rectangle(GAME_WIDTH / 2, 604, GAME_WIDTH, 12, COLORS.grass);

    this.add.text(GAME_WIDTH / 2, 162, "실세아의 무지개 언덕", {
      fontFamily: "system-ui",
      fontSize: "62px",
      fontStyle: "800",
      color: CSS_COLORS.white,
      stroke: CSS_COLORS.outline,
      strokeThickness: 8
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 238, "PHASE 1 · GRAYBOX", {
      fontFamily: "system-ui",
      fontSize: "22px",
      fontStyle: "700",
      letterSpacing: 5,
      color: CSS_COLORS.collect
    }).setOrigin(0.5);

    const prompt = this.add.text(GAME_WIDTH / 2, 405, "Space / Z / 게임패드 A로 시작", {
      fontFamily: "system-ui",
      fontSize: "25px",
      fontStyle: "700",
      color: CSS_COLORS.near,
      backgroundColor: CSS_COLORS.whiteSoft,
      padding: { x: 24, y: 14 }
    }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.55, duration: 850, yoyo: true, repeat: -1 });

    this.add.text(GAME_WIDTH / 2, 494, "이동  방향키/WASD   ·   점프  Space/Z   ·   디버그  `", {
      fontFamily: "system-ui",
      fontSize: "17px",
      color: CSS_COLORS.white,
      backgroundColor: CSS_COLORS.panelSoft,
      padding: { x: 14, y: 8 }
    }).setOrigin(0.5);

    this.inputManager = new InputManager(this);
    this.audioManager = new AudioManager(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.inputManager.destroy();
      this.audioManager.destroy();
    });
  }

  update() {
    if (this.inputManager.sample().confirmPressed) {
      this.audioManager.playSfx("sfx_ui_select", { randomizeRate: false });
      this.scene.start(SCENE_KEYS.CHARACTER_SELECT);
    }
  }
}
