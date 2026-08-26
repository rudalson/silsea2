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
      const progress = progressManager.get(level.id);
      const unlocked = progressManager.isUnlocked(level, LEVELS);
      const container = this.add.container(GAME_WIDTH / 2, 0).setDepth(2);
      const children = [];
      const add = (object) => {
        children.push(object);
        return object;
      };
      const card = add(this.add.rectangle(0, 370, 350, 390, COLORS.near, 0.9))
        .setStrokeStyle(5, COLORS.outline)
        .setInteractive({ useHandCursor: true });
      const previewFrame = add(this.add.rectangle(0, 314, 312, 176, COLORS.outline, 0.95))
        .setStrokeStyle(3, COLORS.collect, 0.95);
      const previewKey = level.assets.preview;
      const hasPreview = Boolean(previewKey && this.textures.exists(previewKey));
      const preview = hasPreview
        ? add(this.add.image(0, 314, previewKey)).setDisplaySize(304, 168)
        : add(this.add.rectangle(0, 314, 304, 168, COLORS.nightVeil, 0.98));
      if (level.visualTheme === "starlit-forest" && !hasPreview) {
        add(this.add.circle(96, 260, 26, COLORS.white, 0.92));
        add(this.add.ellipse(-92, 334, 116, 112, COLORS.nightCanopy, 0.98));
        add(this.add.ellipse(-34, 326, 126, 126, COLORS.near, 0.98));
        add(this.add.rectangle(-62, 352, 24, 52, COLORS.nightTrunk, 0.98));
        add(this.add.rectangle(0, 354, 304, 42, COLORS.ground, 0.96));
        add(this.add.star(-76, 278, 5, 5, 13, COLORS.collect, 0.94));
        add(this.add.star(18, 298, 5, 4, 10, COLORS.collectBlue, 0.94));
        add(this.add.star(70, 338, 5, 4, 10, COLORS.collectPink, 0.92));
      }
      if (level.visualTheme === "mist-valley" && !hasPreview) {
        add(this.add.rectangle(0, 348, 304, 58, COLORS.ground, 0.96));
        add(this.add.ellipse(-92, 324, 132, 66, COLORS.soft, 0.72));
        add(this.add.ellipse(24, 302, 176, 82, COLORS.white, 0.5));
        add(this.add.ellipse(104, 340, 116, 58, COLORS.soft, 0.68));
        add(this.add.rectangle(-48, 330, 7, 70, COLORS.collect, 0.86));
        add(this.add.star(-48, 284, 4, 6, 15, COLORS.collect, 0.95));
        add(this.add.triangle(60, 310, 0, 0, 34, 17, 0, 34, COLORS.collectBlue, 0.96))
          .setStrokeStyle(2, COLORS.white, 0.9);
      }
      if (["tsunami-graybox", "tsunami-village"].includes(level.visualTheme) && !hasPreview) {
        add(this.add.rectangle(0, 348, 304, 58, COLORS.ground, 0.96));
        add(this.add.rectangle(54, 307, 92, 82, COLORS.near, 0.9)).setStrokeStyle(3, COLORS.collect);
        add(this.add.triangle(54, 260, -60, 48, 0, 0, 60, 48, COLORS.dangerAlt, 0.95))
          .setStrokeStyle(3, COLORS.outline);
        add(this.add.ellipse(-98, 326, 118, 76, COLORS.grass, 0.94));
        add(this.add.rectangle(128, 310, 34, 154, COLORS.collectBlue, 0.82)).setStrokeStyle(4, COLORS.white);
        add(this.add.triangle(98, 310, 44, 0, 0, 24, 44, 48, COLORS.white, 0.9));
      }
      const lockedOverlay = add(this.add.rectangle(0, 314, 304, 168, COLORS.outline, 0.62)).setVisible(!unlocked);
      const lockedLabel = add(this.add.text(0, 314, "잠김\n이전 스테이지를 먼저 클리어하세요", {
        align: "center",
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "17px",
        fontStyle: "800",
        color: CSS_COLORS.white,
        backgroundColor: CSS_COLORS.panelSoft,
        padding: { x: 10, y: 7 }
      })).setOrigin(0.5).setVisible(!unlocked);
      const order = add(this.add.text(-128, 220, String(level.order).padStart(2, "0"), {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "31px",
        fontStyle: "900",
        color: CSS_COLORS.collect,
        backgroundColor: CSS_COLORS.panelSoft,
        padding: { x: 10, y: 5 }
      })).setOrigin(0.5);
      const title = add(this.add.text(0, 433, level.name, {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "27px",
        fontStyle: "800",
        color: CSS_COLORS.white
      })).setOrigin(0.5);
      const description = add(this.add.text(0, 470, level.description ?? (index === 0 ? "무지개 길을 따라 첫 모험!" : "새로운 모험이 기다리고 있어요"), {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "15px",
        fontStyle: "700",
        color: CSS_COLORS.soft
      })).setOrigin(0.5);
      const status = add(this.add.text(0, 516, unlocked
        ? progress.cleared ? `✓ 클리어 · BEST ${progress.bestScore}` : "새 스테이지"
        : "잠김 · 이전 스테이지 클리어 필요", {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: unlocked ? "17px" : "15px",
        fontStyle: "700",
        color: progress.cleared ? CSS_COLORS.collect : CSS_COLORS.soft
      })).setOrigin(0.5);
      container.add(children);
      card.on("pointerover", () => {
        if (this.selected === index) return;
        this.selected = index;
        this.audioManager.playSfx("sfx_ui_move");
        this.renderSelection();
      });
      card.on("pointerdown", () => this.confirmStage());
      this.cards.push({
        container,
        card,
        previewFrame,
        preview,
        order,
        title,
        description,
        status,
        lockedOverlay,
        lockedLabel,
        unlocked
      });
    });

    this.pageIndicator = this.add.text(GAME_WIDTH / 2, 594, "", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "22px",
      fontStyle: "800",
      color: CSS_COLORS.collect,
      backgroundColor: CSS_COLORS.panelSoft,
      padding: { x: 13, y: 5 }
    }).setOrigin(0.5).setDepth(4);
    this.add.text(GAME_WIDTH / 2, 650, "← → 선택   ·   Space / Z 시작   ·   Esc 캐릭터 선택", {
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
      const relative = index - this.selected;
      const visible = Math.abs(relative) <= 1;
      entry.container
        .setX(GAME_WIDTH / 2 + relative * 390)
        .setVisible(visible)
        .setAlpha(selected ? 1 : 0.7);
      if (entry.card.input) entry.card.input.enabled = visible;
      entry.card.setStrokeStyle(selected ? 8 : 4, selected ? COLORS.collect : COLORS.outline);
      entry.card.setScale(selected ? 1.05 : 1);
      entry.previewFrame.setStrokeStyle(selected ? 5 : 3, selected ? COLORS.collect : COLORS.outline).setAlpha(selected ? 1 : 0.72);
      entry.preview
        .setDisplaySize(selected ? 310 : 292, selected ? 171 : 161)
        .setAlpha(selected ? 1 : 0.72);
      entry.order.setAlpha(selected ? 1 : 0.7);
      entry.title.setColor(selected ? CSS_COLORS.collect : CSS_COLORS.white);
      entry.description.setAlpha(selected ? 1 : 0.62);
    });
    this.pageIndicator?.setText(LEVELS.map((_, index) => index === this.selected ? "●" : "○").join("  "));
  }

  confirmStage() {
    if (this.starting) return;
    const level = LEVELS[this.selected];
    if (!progressManager.isUnlocked(level, LEVELS)) {
      this.audioManager.playSfx("sfx_ui_move", { randomizeRate: false });
      const status = document.querySelector("#game-status");
      if (status) status.textContent = `${level.name}은 아직 잠겨 있습니다. 이전 스테이지를 먼저 클리어하세요.`;
      return;
    }
    this.starting = true;
    this.audioManager.playSfx("sfx_ui_select", { randomizeRate: false });
    const levelId = level.id;
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
