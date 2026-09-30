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
    const reviewUnlockAll = this.registry.get("stageSelectReviewUnlockAll") === true;
    this.cameras.main.setBackgroundColor(COLORS.skyTop);
    this.selected = Math.max(0, LEVELS.findIndex((level) => level.id === this.registry.get("levelId")));
    this.inputManager = new InputManager(this);
    this.audioManager = new AudioManager(this);
    this.cards = [];

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "bg_stage_select_calm").setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    const heading = this.add.graphics().setDepth(2);
    heading.fillStyle(COLORS.outline, 0.16);
    heading.fillRoundedRect(410, 31, 460, 106, 30);
    heading.fillStyle(COLORS.storybookButtonInner, 0.92);
    heading.fillRoundedRect(410, 25, 460, 106, 30);
    heading.lineStyle(2, COLORS.white, 0.95);
    heading.strokeRoundedRect(410, 25, 460, 106, 30);
    this.add.text(GAME_WIDTH / 2, 54, "✦  WORLD MAP  ✦", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "15px",
      fontStyle: "800",
      letterSpacing: 3,
      color: CSS_COLORS.near
    }).setOrigin(0.5).setDepth(3);
    this.add.text(GAME_WIDTH / 2, 95, "스테이지 선택", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "39px",
      fontStyle: "800",
      color: CSS_COLORS.near
    }).setOrigin(0.5).setDepth(3);
    this.createBackButton();

    LEVELS.forEach((level, index) => {
      const progress = progressManager.get(level.id);
      const unlocked = reviewUnlockAll || progressManager.isUnlocked(level, LEVELS);
      const container = this.add.container(GAME_WIDTH / 2, 0).setDepth(2);
      const children = [];
      const add = (object) => {
        children.push(object);
        return object;
      };
      const card = add(this.add.graphics());
      const previewFrame = add(this.add.rectangle(0, 291, 322, 182, COLORS.white, 0.96))
        .setStrokeStyle(2, COLORS.white, 0.96);
      const previewKey = level.assets.preview;
      const hasPreview = Boolean(previewKey && this.textures.exists(previewKey));
      const preview = hasPreview
        ? add(this.add.image(0, 291, previewKey)).setDisplaySize(310, 170)
        : add(this.add.rectangle(0, 291, 310, 170, COLORS.nightVeil, 0.98));
      const fallbackStart = children.length;
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
      if (level.visualTheme === "submerged-graybox" && !hasPreview) {
        add(this.add.rectangle(0, 332, 304, 94, COLORS.collectBlue, 0.5));
        add(this.add.rectangle(0, 286, 304, 6, COLORS.white, 0.92));
        add(this.add.rectangle(-100, 262, 72, 48, COLORS.near, 0.96)).setStrokeStyle(3, COLORS.outline);
        add(this.add.triangle(-100, 230, -46, 32, 0, 0, 46, 32, COLORS.dangerAlt, 0.9))
          .setStrokeStyle(3, COLORS.outline);
        add(this.add.rectangle(82, 270, 92, 32, COLORS.near, 0.94)).setStrokeStyle(3, COLORS.outline);
        add(this.add.circle(22, 332, 8, COLORS.white, 0.78));
        add(this.add.circle(38, 314, 5, COLORS.white, 0.72));
        add(this.add.triangle(92, 324, 0, 20, 16, 0, 32, 20, COLORS.collect, 0.94));
      }
      if (level.visualTheme === "rainbow-relay-graybox" && !hasPreview) {
        add(this.add.rectangle(-110, 348, 84, 48, COLORS.ground, 0.98));
        add(this.add.rectangle(-110, 322, 84, 8, COLORS.grass, 1));
        add(this.add.rectangle(110, 348, 96, 48, COLORS.ground, 0.98));
        add(this.add.rectangle(110, 322, 96, 8, COLORS.grass, 1));
        add(this.add.ellipse(-38, 326, 58, 18, COLORS.white, 0.96)).setStrokeStyle(2, COLORS.outline);
        [-4, 12, 28, 44].forEach((x) => {
          add(this.add.rectangle(x, 326, 14, 14, COLORS.ground, 1)).setStrokeStyle(2, COLORS.outline);
        });
        [[-92, 286], [-58, 266], [-20, 252], [20, 250], [58, 266], [88, 288]].forEach(([x, y]) => {
          add(this.add.star(x, y, 5, 4, 10, COLORS.collect, 0.98)).setStrokeStyle(2, COLORS.outline);
        });
        const gate = add(this.add.graphics());
        [[34, COLORS.collectPink], [27, COLORS.collect], [20, COLORS.collectBlue]].forEach(([radius, color]) => {
          gate.lineStyle(6, color, 1);
          gate.beginPath();
          gate.arc(110, 320, radius, Math.PI, Math.PI * 2, false);
          gate.strokePath();
          gate.lineBetween(110 - radius, 320, 110 - radius, 350);
          gate.lineBetween(110 + radius, 320, 110 + radius, 350);
        });
      }
      const fallbackArt = this.add.container(0, -23, children.splice(fallbackStart));
      add(fallbackArt);
      const lockedOverlay = add(this.add.rectangle(0, 291, 310, 170, COLORS.outline, 0.64)).setVisible(!unlocked);
      const lockedLabel = add(this.add.text(0, 291, "잠김\n이전 스테이지를 먼저 클리어하세요", {
        align: "center",
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "17px",
        fontStyle: "800",
        color: CSS_COLORS.white,
        backgroundColor: CSS_COLORS.panelSoft,
        padding: { x: 10, y: 7 }
      })).setOrigin(0.5).setVisible(!unlocked);
      const order = add(this.add.text(-126, 187, String(level.order).padStart(2, "0"), {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "21px",
        fontStyle: "900",
        color: CSS_COLORS.near
      })).setOrigin(0.5);
      const progressLabel = add(this.add.text(107, 187,
        unlocked ? progress.cleared ? "클리어" : "도전 가능" : "잠김", {
          fontFamily: GAME_FONT_FAMILY,
          fontSize: "14px",
          fontStyle: "800",
          color: CSS_COLORS.near
        })).setOrigin(0.5);
      const title = add(this.add.text(0, 412, level.name, {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "28px",
        fontStyle: "800",
        color: CSS_COLORS.near
      })).setOrigin(0.5);
      const description = add(this.add.text(0, 448, level.description ?? (index === 0 ? "무지개 길을 따라 첫 모험!" : "새로운 모험이 기다리고 있어요"), {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "16px",
        fontStyle: "700",
        color: CSS_COLORS.near,
        wordWrap: { width: 308 }
      })).setOrigin(0.5);
      const status = add(this.add.text(0, 481, unlocked
        ? progress.cleared ? `최고 점수  ${progress.bestScore.toLocaleString()}` : "새로운 모험이 기다려요"
        : "이전 스테이지 클리어 필요", {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "15px",
        fontStyle: "700",
        color: CSS_COLORS.near
      })).setOrigin(0.5);
      const action = add(this.add.graphics());
      const actionLabel = add(this.add.text(0, 527, "", {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "19px",
        fontStyle: "800",
        color: CSS_COLORS.white
      })).setOrigin(0.5);
      const cardHit = add(this.add.zone(0, 366, 348, 408).setInteractive({ useHandCursor: true }));
      container.add(children);
      const drawCard = (selected, hovered = false) => {
        const canStart = selected && unlocked;
        card.clear();
        card.fillStyle(COLORS.outline, 0.2);
        card.fillRoundedRect(-174, 168, 348, 408, 22);
        card.fillStyle(COLORS.storybookButtonInner, selected ? 0.98 : 0.93);
        card.fillRoundedRect(-174, 162, 348, 408, 22);
        card.lineStyle(selected ? 4 : 2, selected ? COLORS.collect : COLORS.white, 1);
        card.strokeRoundedRect(-174, 162, 348, 408, 22);
        card.fillStyle(COLORS.white, 0.62);
        card.fillRoundedRect(-165, 389, 330, 171, 15);
        card.fillStyle(selected ? COLORS.collect : COLORS.white, selected ? 0.96 : 0.88);
        card.fillRoundedRect(-151, 172, 52, 30, 12);
        card.fillStyle(unlocked ? COLORS.white : COLORS.soft, 0.9);
        card.fillRoundedRect(53, 172, 107, 30, 12);
        action.clear();
        action.fillStyle(COLORS.outline, selected ? 0.28 : 0.12);
        action.fillRoundedRect(-136, 505, 272, 52, 22);
        action.fillStyle(canStart
          ? hovered ? COLORS.nightCanopy : COLORS.near
          : COLORS.white, canStart ? 1 : 0.58);
        action.fillRoundedRect(-136, 501, 272, 52, 22);
        action.lineStyle(2, canStart ? COLORS.collect : COLORS.near, canStart ? 1 : 0.24);
        action.strokeRoundedRect(-136, 501, 272, 52, 22);
        actionLabel.setText(selected
          ? unlocked ? "이 스테이지 시작  →" : "잠긴 스테이지"
          : "선택해서 보기");
        actionLabel.setColor(canStart ? CSS_COLORS.white : CSS_COLORS.near);
        actionLabel.setAlpha(canStart ? 1 : selected ? 0.58 : 0.7);
      };
      cardHit.on("pointerover", () => drawCard(index === this.selected, true));
      cardHit.on("pointerout", () => drawCard(index === this.selected));
      cardHit.on("pointerdown", () => {
        if (this.selected === index) {
          this.confirmStage();
        } else {
          this.selectStage(index);
        }
      });
      this.cards.push({
        container,
        card,
        cardHit,
        drawCard,
        previewFrame,
        preview,
        order,
        progressLabel,
        title,
        description,
        status,
        actionLabel,
        lockedOverlay,
        lockedLabel,
        unlocked
      });
    });

    this.createNavButtons();

    this.pageIndicator = this.add.text(GAME_WIDTH / 2, 628, "", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "15px",
      fontStyle: "800",
      color: CSS_COLORS.near
    }).setOrigin(0.5).setDepth(4);

    this.createDotIndicators();
    this.setupWheelControl();

    const hintBar = this.add.graphics().setDepth(3);
    hintBar.fillStyle(COLORS.storybookButtonInner, 0.88);
    hintBar.fillRoundedRect(338, 653, 604, 46, 22);
    hintBar.lineStyle(2, COLORS.white, 0.92);
    hintBar.strokeRoundedRect(338, 653, 604, 46, 22);
    this.add.text(GAME_WIDTH / 2, 676, "← → 이동    ·    Space / Z 시작    ·    Esc 돌아가기", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "17px",
      fontStyle: "700",
      color: CSS_COLORS.near
    }).setOrigin(0.5).setDepth(4);
    this.renderSelection();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.inputManager.destroy();
      this.audioManager.destroy();
    });
  }

  createNavButtons() {
    const createButton = (x, symbol, direction) => {
      const buttonContainer = this.add.container(x, 370).setDepth(5);
      const shadow = this.add.circle(0, 5, 29, COLORS.outline, 0.2);
      const bg = this.add.circle(0, 0, 29, COLORS.storybookButtonInner, 0.96)
        .setStrokeStyle(3, COLORS.white, 0.96);
      const label = this.add.text(symbol === "←" ? -1 : 1, -2, symbol, {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "31px",
        fontStyle: "900",
        color: CSS_COLORS.near
      }).setOrigin(0.5);
      buttonContainer.add([shadow, bg, label]);

      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerover", () => {
        bg.setScale(1.08).setFillStyle(COLORS.white).setStrokeStyle(3, COLORS.collect);
        label.setScale(1.08);
      });
      bg.on("pointerout", () => {
        bg.setScale(1).setFillStyle(COLORS.storybookButtonInner, 0.96).setStrokeStyle(3, COLORS.white, 0.96);
        label.setScale(1);
      });
      bg.on("pointerdown", () => {
        this.navigate(direction);
      });
      return buttonContainer;
    };

    this.leftNavButton = createButton(43, "←", -1);
    this.rightNavButton = createButton(GAME_WIDTH - 43, "→", 1);
  }

  createDotIndicators() {
    const count = LEVELS.length;
    const dotSpacing = 26;
    const startX = GAME_WIDTH / 2 - ((count - 1) * dotSpacing) / 2;
    this.dots = [];
    for (let i = 0; i < count; i += 1) {
      const dotX = startX + i * dotSpacing;
      const hitArea = this.add.circle(dotX, 606, 9, COLORS.storybookButtonInner, 0.94)
        .setStrokeStyle(2, COLORS.near, 0.48)
        .setDepth(5)
        .setInteractive({ useHandCursor: true });
      hitArea.on("pointerover", () => {
        if (i !== this.selected) hitArea.setScale(1.3);
      });
      hitArea.on("pointerout", () => hitArea.setScale(i === this.selected ? 1.18 : 1));
      hitArea.on("pointerdown", () => {
        this.selectStage(i);
      });
      this.dots.push(hitArea);
    }
  }

  setupWheelControl() {
    this.lastWheelTime = 0;
    this.input.on("wheel", (pointer, currentlyOver, deltaX, deltaY) => {
      const now = this.time.now;
      if (now - this.lastWheelTime < 220) return;
      const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
      if (Math.abs(delta) < 8) return;
      this.lastWheelTime = now;
      this.navigate(delta > 0 ? 1 : -1);
    });
  }

  navigate(direction) {
    if (this.starting) return;
    this.selected = Phaser.Math.Wrap(this.selected + direction, 0, LEVELS.length);
    this.audioManager.playSfx("sfx_ui_move");
    this.renderSelection();
  }

  selectStage(index) {
    if (this.starting || this.selected === index) return;
    this.selected = Phaser.Math.Wrap(index, 0, LEVELS.length);
    this.audioManager.playSfx("sfx_ui_move");
    this.renderSelection();
  }

  update() {
    const input = this.inputManager.sample();
    if (Math.abs(input.moveX) > 0.5 && !this.axisLocked) {
      this.navigate(Math.sign(input.moveX));
      this.axisLocked = true;
    }
    if (Math.abs(input.moveX) < 0.2) this.axisLocked = false;
    if (input.confirmPressed) this.confirmStage();
    if (input.pausePressed) this.goBack();
  }

  createBackButton() {
    const face = this.add.graphics().setDepth(4);
    const draw = (hovered) => {
      face.clear();
      face.fillStyle(COLORS.outline, 0.2);
      face.fillRoundedRect(32, 20, 204, 46, 23);
      face.fillStyle(hovered ? COLORS.nightCanopy : COLORS.near, 0.96);
      face.fillRoundedRect(32, 15, 204, 46, 23);
      face.lineStyle(2, COLORS.white, 0.88);
      face.strokeRoundedRect(32, 15, 204, 46, 23);
    };
    draw(false);
    this.add.text(134, 38, "←  캐릭터 선택", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "18px",
      fontStyle: "800",
      color: CSS_COLORS.white
    }).setOrigin(0.5).setDepth(5);
    this.add.zone(134, 38, 204, 46).setDepth(6).setInteractive({ useHandCursor: true })
      .on("pointerover", () => draw(true))
      .on("pointerout", () => draw(false))
      .on("pointerdown", () => this.goBack());
  }

  renderSelection() {
    this.cards.forEach((entry, index) => {
      const selected = index === this.selected;
      const relative = index - this.selected;
      const visible = Math.abs(relative) <= 1;
      entry.container
        .setX(GAME_WIDTH / 2 + relative * 390)
        .setVisible(visible)
        .setAlpha(selected ? 1 : 0.86);
      if (entry.cardHit.input) entry.cardHit.input.enabled = visible;
      entry.drawCard(selected);
      entry.previewFrame.setStrokeStyle(selected ? 3 : 2, selected ? COLORS.collect : COLORS.white);
      entry.preview
        .setDisplaySize(310, 170)
        .setAlpha(1);
      entry.title.setColor(CSS_COLORS.near);
    });
    this.dots?.forEach((dot, index) => {
      const selected = index === this.selected;
      dot.setFillStyle(selected ? COLORS.collect : COLORS.storybookButtonInner, 1)
        .setStrokeStyle(selected ? 3 : 2, COLORS.near, selected ? 0.9 : 0.65)
        .setScale(selected ? 1.18 : 1);
    });
    this.pageIndicator?.setText(`${String(this.selected + 1).padStart(2, "0")} / ${String(LEVELS.length).padStart(2, "0")}`);
    const level = LEVELS[this.selected];
    this.game.canvas?.setAttribute("aria-label", `스테이지 선택: ${level.name}. ${this.cards[this.selected].unlocked ? "시작 가능" : "잠김"}. ${this.selected + 1}/${LEVELS.length}`);
  }

  confirmStage() {
    if (this.starting) return;
    const level = LEVELS[this.selected];
    if (this.registry.get("stageSelectReviewUnlockAll") !== true && !progressManager.isUnlocked(level, LEVELS)) {
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
