import Phaser from "phaser";
import { GAME_FONT_FAMILY } from "../config/font.js";
import { COLORS, CSS_COLORS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../config/constants.js";
import { LEVELS } from "../data/levels/index.js";
import { AudioManager } from "../systems/AudioManager.js";
import { InputManager } from "../systems/InputManager.js";
import { progressManager } from "../systems/ProgressManager.js";

export class StageSelectScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.STAGE_SELECT);
  }

  create() {
    this.starting = false;
    this.cameras.main.setBackgroundColor(COLORS.skyTop);
    this.selected = Math.max(0, LEVELS.findIndex((level) => level.id === this.registry.get("levelId")));
    this.inputManager = new InputManager(this);
    this.audioManager = new AudioManager(this);
    this.cards = [];

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "bg_stage_select_calm").setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.outline, 0.08);
    this.add.rectangle(GAME_WIDTH / 2, 90, 484, 106, COLORS.near, 0.85)
      .setStrokeStyle(4, COLORS.collect, 0.9)
      .setDepth(2);
    this.add.text(GAME_WIDTH / 2, 63, "WORLD MAP", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "16px",
      fontStyle: "800",
      letterSpacing: 4,
      color: CSS_COLORS.collect
    }).setOrigin(0.5).setDepth(3);
    this.add.text(GAME_WIDTH / 2, 105, "스테이지 선택", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "42px",
      fontStyle: "800",
      color: CSS_COLORS.white,
      stroke: CSS_COLORS.outline,
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(3);
    this.createBackButton();

    LEVELS.forEach((level, index) => {
      const x = GAME_WIDTH / 2 + (index - (LEVELS.length - 1) / 2) * 390;
      const progress = progressManager.get(level.id);
      const card = this.add.rectangle(x, 370, 350, 390, COLORS.near, 0.9)
        .setStrokeStyle(5, COLORS.outline)
        .setDepth(2)
        .setInteractive({ useHandCursor: true });
      const previewFrame = this.add.rectangle(x, 314, 312, 176, COLORS.outline, 0.95)
        .setStrokeStyle(3, COLORS.collect, 0.95)
        .setDepth(3);
      const previewKey = level.assets.preview;
      const hasPreview = Boolean(previewKey && this.textures.exists(previewKey));
      const preview = hasPreview
        ? this.add.image(x, 314, previewKey).setDisplaySize(304, 168).setDepth(4)
        : this.add.rectangle(x, 314, 304, 168, COLORS.nightVeil, 0.98).setDepth(4);
      if (level.visualTheme === "starlit-forest" && !hasPreview) {
        this.add.circle(x + 96, 260, 26, COLORS.white, 0.92).setDepth(5);
        this.add.ellipse(x - 92, 334, 116, 112, COLORS.nightCanopy, 0.98).setDepth(5);
        this.add.ellipse(x - 34, 326, 126, 126, COLORS.near, 0.98).setDepth(5);
        this.add.rectangle(x - 62, 352, 24, 52, COLORS.nightTrunk, 0.98).setDepth(5);
        this.add.rectangle(x, 354, 304, 42, COLORS.ground, 0.96).setDepth(5);
        this.add.star(x - 76, 278, 5, 5, 13, COLORS.collect, 0.94).setDepth(6);
        this.add.star(x + 18, 298, 5, 4, 10, COLORS.collectBlue, 0.94).setDepth(6);
        this.add.star(x + 70, 338, 5, 4, 10, COLORS.collectPink, 0.92).setDepth(6);
      }
      if (level.visualTheme === "mist-valley" && !hasPreview) {
        this.add.rectangle(x, 348, 304, 58, COLORS.ground, 0.96).setDepth(5);
        this.add.ellipse(x - 92, 324, 132, 66, COLORS.soft, 0.72).setDepth(5);
        this.add.ellipse(x + 24, 302, 176, 82, COLORS.white, 0.5).setDepth(5);
        this.add.ellipse(x + 104, 340, 116, 58, COLORS.soft, 0.68).setDepth(5);
        this.add.rectangle(x - 48, 330, 7, 70, COLORS.collect, 0.86).setDepth(6);
        this.add.star(x - 48, 284, 4, 6, 15, COLORS.collect, 0.95).setDepth(6);
        this.add.triangle(x + 60, 310, 0, 0, 34, 17, 0, 34, COLORS.collectBlue, 0.96)
          .setStrokeStyle(2, COLORS.white, 0.9)
          .setDepth(6);
      }
      const order = this.add.text(x - 128, 220, String(level.order).padStart(2, "0"), {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "31px",
        fontStyle: "900",
        color: CSS_COLORS.collect,
        backgroundColor: CSS_COLORS.panelSoft,
        padding: { x: 10, y: 5 }
      }).setOrigin(0.5).setDepth(6);
      const title = this.add.text(x, 433, level.name, {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "27px",
        fontStyle: "800",
        color: CSS_COLORS.white
      }).setOrigin(0.5).setDepth(4);
      const description = this.add.text(x, 470, level.description ?? (index === 0 ? "무지개 길을 따라 첫 모험!" : "새로운 모험이 기다리고 있어요"), {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "15px",
        fontStyle: "700",
        color: CSS_COLORS.soft
      }).setOrigin(0.5).setDepth(4);
      const status = this.add.text(x, 516, progress.cleared ? `✓ 클리어 · BEST ${progress.bestScore}` : "새 스테이지", {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "17px",
        fontStyle: "700",
        color: progress.cleared ? CSS_COLORS.collect : CSS_COLORS.soft
      }).setOrigin(0.5).setDepth(4);
      card.on("pointerover", () => {
        if (this.selected === index) return;
        this.selected = index;
        this.audioManager.playSfx("sfx_ui_move");
        this.renderSelection();
      });
      card.on("pointerdown", () => this.confirmStage());
      this.cards.push({ card, previewFrame, preview, order, title, description, status });
    });

    this.add.text(GAME_WIDTH / 2, 640, "← → 선택   ·   Space / Z 시작   ·   Esc 캐릭터 선택", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "18px",
      fontStyle: "700",
      color: CSS_COLORS.white,
      backgroundColor: CSS_COLORS.panelSoft,
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5);
    this.renderSelection();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.inputManager.destroy();
      this.audioManager.destroy();
    });
  }

  update() {
    const input = this.inputManager.sample();
    if (Math.abs(input.moveX) > 0.5 && !this.axisLocked) {
      this.selected = Phaser.Math.Wrap(this.selected + Math.sign(input.moveX), 0, LEVELS.length);
      this.axisLocked = true;
      this.audioManager.playSfx("sfx_ui_move");
      this.renderSelection();
    }
    if (Math.abs(input.moveX) < 0.2) this.axisLocked = false;
    if (input.confirmPressed) this.confirmStage();
    if (input.pausePressed) this.goBack();
  }

  createBackButton() {
    const button = this.add.text(34, 36, "← 캐릭터 선택", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "18px",
      fontStyle: "800",
      color: CSS_COLORS.white,
      backgroundColor: CSS_COLORS.panelSoft,
      padding: { x: 14, y: 9 }
    }).setOrigin(0, 0.5).setDepth(4).setInteractive({ useHandCursor: true });
    button.on("pointerover", () => button.setScale(1.06).setColor(CSS_COLORS.collect));
    button.on("pointerout", () => button.setScale(1).setColor(CSS_COLORS.white));
    button.on("pointerdown", () => this.goBack());
  }

  renderSelection() {
    this.cards.forEach((entry, index) => {
      const selected = index === this.selected;
      entry.card.setStrokeStyle(selected ? 8 : 4, selected ? COLORS.collect : COLORS.outline);
      entry.card.setScale(selected ? 1.05 : 1).setAlpha(selected ? 1 : 0.7);
      entry.previewFrame.setStrokeStyle(selected ? 5 : 3, selected ? COLORS.collect : COLORS.outline).setAlpha(selected ? 1 : 0.72);
      entry.preview
        .setDisplaySize(selected ? 310 : 292, selected ? 171 : 161)
        .setAlpha(selected ? 1 : 0.72);
      entry.order.setAlpha(selected ? 1 : 0.7);
      entry.title.setColor(selected ? CSS_COLORS.collect : CSS_COLORS.white);
      entry.description.setAlpha(selected ? 1 : 0.62);
    });
  }

  confirmStage() {
    if (this.starting) return;
    this.starting = true;
    this.audioManager.playSfx("sfx_ui_select", { randomizeRate: false });
    const levelId = LEVELS[this.selected].id;
    this.registry.set("levelId", levelId);
    this.cameras.main.fadeOut(170, 255, 245, 188);
    this.time.delayedCall(180, () => this.scene.start(SCENE_KEYS.PRELOAD, { levelId }));
  }

  goBack() {
    if (this.starting) return;
    this.starting = true;
    this.audioManager.playSfx("sfx_ui_select", { randomizeRate: false });
    this.cameras.main.fadeOut(170, 255, 245, 188);
    this.time.delayedCall(180, () => this.scene.start(SCENE_KEYS.CHARACTER_SELECT));
  }
}
