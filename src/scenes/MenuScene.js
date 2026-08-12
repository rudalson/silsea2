import Phaser from "phaser";
import { GAME_FONT_FAMILY } from "../config/font.js";
import { COLORS, CSS_COLORS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../config/constants.js";
import { AudioManager } from "../systems/AudioManager.js";
import { InputManager } from "../systems/InputManager.js";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.MENU);
  }

  create() {
    this.starting = false;
    this.cameras.main.setBackgroundColor(COLORS.skyTop);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "bg_intro").setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.outline, 0.1);
    this.add.ellipse(156, 618, 250, 56, COLORS.outline, 0.18).setDepth(2);
    this.add.ellipse(1124, 618, 250, 56, COLORS.outline, 0.18).setDepth(2);

    const titlePanel = this.add.rectangle(GAME_WIDTH / 2, 151, 700, 178, COLORS.near, 0.86)
      .setStrokeStyle(4, COLORS.collect, 0.92)
      .setDepth(3);
    titlePanel.setScale(0.94);
    this.tweens.add({ targets: titlePanel, scale: 1, duration: 540, ease: "Back.Out" });

    this.add.text(GAME_WIDTH / 2, 91, "SILSEA'S RAINBOW HILL", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "17px",
      fontStyle: "800",
      letterSpacing: 4,
      color: CSS_COLORS.collect
    }).setOrigin(0.5).setDepth(4);

    this.add.text(GAME_WIDTH / 2, 148, "실세아의 무지개 언덕", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "58px",
      fontStyle: "800",
      color: CSS_COLORS.white,
      stroke: CSS_COLORS.outline,
      strokeThickness: 8
    }).setOrigin(0.5).setDepth(4);

    this.add.text(GAME_WIDTH / 2, 205, "별을 모아 무지개 언덕의 길을 밝혀요!", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "20px",
      fontStyle: "700",
      color: CSS_COLORS.soft
    }).setOrigin(0.5).setDepth(4);

    const silsea = this.add.image(160, 556, "silsea_idle", 0).setScale(1.78).setDepth(3);
    const potato = this.add.image(1120, 564, "potato89_idle", 0).setScale(1.72).setFlipX(true).setDepth(3);
    this.tweens.add({ targets: silsea, y: 544, angle: -2, duration: 1020, yoyo: true, repeat: -1, ease: "Sine.InOut" });
    this.tweens.add({ targets: potato, y: 551, angle: 2, duration: 940, yoyo: true, repeat: -1, ease: "Sine.InOut", delay: 160 });

    const startButton = this.add.rectangle(GAME_WIDTH / 2, 410, 398, 78, COLORS.collect, 0.96)
      .setStrokeStyle(5, COLORS.outline, 0.96)
      .setInteractive({ useHandCursor: true })
      .setDepth(4);
    const startLabel = this.add.text(GAME_WIDTH / 2, 410, "모험 시작  ▶", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "31px",
      fontStyle: "700",
      color: CSS_COLORS.outline
    }).setOrigin(0.5).setDepth(5);
    startButton.on("pointerover", () => startButton.setFillStyle(COLORS.white, 0.98));
    startButton.on("pointerout", () => startButton.setFillStyle(COLORS.collect, 0.96));
    startButton.on("pointerdown", () => this.startAdventure());
    this.tweens.add({ targets: [startButton, startLabel], scale: 1.04, duration: 760, yoyo: true, repeat: -1, ease: "Sine.InOut" });

    this.add.text(GAME_WIDTH / 2, 499, "방향키 / WASD 이동   ·   Space / Z 점프", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "18px",
      fontStyle: "700",
      color: CSS_COLORS.white,
      backgroundColor: CSS_COLORS.panelSoft,
      padding: { x: 14, y: 8 }
    }).setOrigin(0.5).setDepth(4);

    for (const [x, y, delay] of [[330, 298, 0], [950, 284, 220], [836, 348, 450], [450, 346, 680]]) {
      const sparkle = this.add.star(x, y, 4, 5, 13, COLORS.collect, 0.9).setDepth(4);
      this.tweens.add({ targets: sparkle, scale: 1.55, alpha: 0.12, angle: 48, duration: 920, yoyo: true, repeat: -1, delay });
    }

    this.inputManager = new InputManager(this);
    this.audioManager = new AudioManager(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.inputManager.destroy();
      this.audioManager.destroy();
    });
  }

  update() {
    if (this.inputManager.sample().confirmPressed) {
      this.startAdventure();
    }
  }

  startAdventure() {
    if (this.starting) return;
    this.starting = true;
    this.audioManager.playSfx("sfx_ui_select", { randomizeRate: false });
    this.cameras.main.fadeOut(180, 255, 245, 188);
    this.time.delayedCall(190, () => this.scene.start(SCENE_KEYS.CHARACTER_SELECT));
  }
}
