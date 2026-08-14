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

    this.createStorybookTitle();

    const silsea = this.add.image(160, 556, "silsea_idle", 0).setScale(1.78).setDepth(3);
    const potato = this.add.image(1120, 564, "potato89_idle", 0).setScale(1.72).setFlipX(true).setDepth(3);
    this.tweens.add({ targets: silsea, y: 544, angle: -2, duration: 1020, yoyo: true, repeat: -1, ease: "Sine.InOut" });
    this.tweens.add({ targets: potato, y: 551, angle: 2, duration: 940, yoyo: true, repeat: -1, ease: "Sine.InOut", delay: 160 });

    this.createStorybookStartButton();

    const controlsPanel = this.add.graphics().setDepth(4);
    controlsPanel.fillStyle(COLORS.near, 0.9);
    controlsPanel.fillRoundedRect(GAME_WIDTH / 2 - 182, 477, 364, 42, 18);
    controlsPanel.lineStyle(2, COLORS.white, 0.78);
    controlsPanel.strokeRoundedRect(GAME_WIDTH / 2 - 182, 477, 364, 42, 18);
    this.add.text(GAME_WIDTH / 2, 498, "방향키 / WASD 이동   ·   Space / Z 점프", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "18px",
      fontStyle: "700",
      color: CSS_COLORS.white
    }).setOrigin(0.5).setDepth(5);

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

  createStorybookTitle() {
    const title = this.add.container(GAME_WIDTH / 2, 145).setDepth(3).setScale(0.94);
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.outline, 0.38);
    panel.fillRoundedRect(-356, -106, 712, 220, 28);
    panel.fillStyle(COLORS.near, 0.94);
    panel.fillRoundedRect(-350, -112, 700, 208, 22);
    panel.lineStyle(5, COLORS.collect, 0.98);
    panel.strokeRoundedRect(-350, -112, 700, 208, 22);
    panel.lineStyle(2, COLORS.white, 0.7);
    panel.strokeRoundedRect(-334, -96, 668, 176, 16);

    const ribbon = this.add.graphics();
    ribbon.fillStyle(COLORS.collect, 0.96);
    ribbon.fillRoundedRect(-190, -88, 380, 40, 14);
    ribbon.lineStyle(3, COLORS.outline, 0.88);
    ribbon.strokeRoundedRect(-190, -88, 380, 40, 14);

    const english = this.add.text(0, -68, "SILSEA'S RAINBOW HILL", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "16px",
      fontStyle: "800",
      letterSpacing: 4,
      color: CSS_COLORS.outline
    }).setOrigin(0.5);
    const heading = this.add.text(0, 2, "실세아의 무지개 언덕", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "54px",
      fontStyle: "800",
      color: CSS_COLORS.white,
      stroke: CSS_COLORS.outline,
      strokeThickness: 8
    }).setOrigin(0.5);
    const subtitle = this.add.text(0, 70, "별을 모아 무지개 언덕의 길을 밝혀요!", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "20px",
      fontStyle: "700",
      color: CSS_COLORS.soft
    }).setOrigin(0.5);
    const stars = [
      this.add.star(-292, 46, 4, 4, 12, COLORS.collect, 0.96),
      this.add.star(292, 46, 4, 4, 12, COLORS.collect, 0.96)
    ];
    title.add([panel, ribbon, english, heading, subtitle, ...stars]);
    this.tweens.add({ targets: title, scale: 1, duration: 540, ease: "Back.Out" });
  }

  createStorybookStartButton() {
    const button = this.add.container(GAME_WIDTH / 2, 410).setDepth(5).setSize(424, 96).setInteractive({ useHandCursor: true });
    const art = this.add.graphics();
    const label = this.add.text(0, -4, "모험 시작", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "31px",
      fontStyle: "800",
      color: CSS_COLORS.outline
    }).setOrigin(0.5);
    const arrow = this.add.text(132, -4, "▶", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "25px",
      fontStyle: "800",
      color: CSS_COLORS.outline
    }).setOrigin(0.5);
    const leftStar = this.add.star(-167, 0, 5, 6, 14, COLORS.collect, 0.98);
    const rightStar = this.add.star(167, 0, 5, 6, 14, COLORS.collect, 0.98);
    const draw = (hovered = false) => {
      art.clear();
      art.fillStyle(COLORS.outline, 0.35);
      art.fillRoundedRect(-206, -38, 412, 82, 16);
      art.fillStyle(hovered ? COLORS.collect : COLORS.white, 0.98);
      art.fillRoundedRect(-200, -44, 400, 72, 12);
      art.lineStyle(5, COLORS.outline, 0.96);
      art.strokeRoundedRect(-200, -44, 400, 72, 12);
      art.lineStyle(3, hovered ? COLORS.white : COLORS.collect, 0.94);
      art.strokeRoundedRect(-188, -32, 376, 48, 8);
      const labelColor = hovered ? CSS_COLORS.white : CSS_COLORS.outline;
      label.setColor(labelColor);
      arrow.setColor(labelColor);
    };
    draw();
    button.add([art, leftStar, rightStar, label, arrow]);
    button.on("pointerover", () => draw(true));
    button.on("pointerout", () => draw(false));
    button.on("pointerdown", () => this.startAdventure());
    this.tweens.add({ targets: button, scale: 1.035, duration: 760, yoyo: true, repeat: -1, ease: "Sine.InOut" });
  }

  startAdventure() {
    if (this.starting) return;
    this.starting = true;
    this.audioManager.playSfx("sfx_ui_select", { randomizeRate: false });
    this.cameras.main.fadeOut(180, 255, 245, 188);
    this.time.delayedCall(190, () => this.scene.start(SCENE_KEYS.CHARACTER_SELECT));
  }
}
