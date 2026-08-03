import Phaser from "phaser";
import { COLORS, CSS_COLORS, GAME_WIDTH, SCENE_KEYS } from "../config/constants.js";
import { LEVELS } from "../data/levels/index.js";
import { InputManager } from "../systems/InputManager.js";
import { progressManager } from "../systems/ProgressManager.js";

export class StageSelectScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.STAGE_SELECT);
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.skyTop);
    this.selected = Math.max(0, LEVELS.findIndex((level) => level.id === this.registry.get("levelId")));
    this.inputManager = new InputManager(this);
    this.cards = [];

    this.add.text(GAME_WIDTH / 2, 88, "스테이지 선택", {
      fontFamily: "system-ui",
      fontSize: "46px",
      fontStyle: "800",
      color: CSS_COLORS.white,
      stroke: CSS_COLORS.outline,
      strokeThickness: 6
    }).setOrigin(0.5);

    LEVELS.forEach((level, index) => {
      const x = GAME_WIDTH / 2 + (index - (LEVELS.length - 1) / 2) * 390;
      const progress = progressManager.get(level.id);
      const card = this.add.rectangle(x, 360, 330, 360, COLORS.mid, 0.92).setStrokeStyle(5, COLORS.outline);
      const order = this.add.text(x, 258, String(level.order).padStart(2, "0"), {
        fontFamily: "system-ui",
        fontSize: "72px",
        fontStyle: "900",
        color: CSS_COLORS.near
      }).setOrigin(0.5);
      const title = this.add.text(x, 377, level.name, {
        fontFamily: "system-ui",
        fontSize: "25px",
        fontStyle: "800",
        color: CSS_COLORS.white
      }).setOrigin(0.5);
      const status = this.add.text(x, 450, progress.cleared ? `✓ 클리어 · BEST ${progress.bestScore}` : "새 스테이지", {
        fontFamily: "system-ui",
        fontSize: "16px",
        color: progress.cleared ? CSS_COLORS.collect : CSS_COLORS.soft
      }).setOrigin(0.5);
      this.cards.push({ card, order, title, status });
    });

    this.add.text(GAME_WIDTH / 2, 626, "← → 선택   ·   Space / Z 시작", {
      fontFamily: "system-ui",
      fontSize: "20px",
      color: CSS_COLORS.white,
      backgroundColor: CSS_COLORS.panelSoft,
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5);
    this.renderSelection();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.inputManager.destroy());
  }

  update() {
    const input = this.inputManager.sample();
    if (Math.abs(input.moveX) > 0.5 && !this.axisLocked) {
      this.selected = Phaser.Math.Wrap(this.selected + Math.sign(input.moveX), 0, LEVELS.length);
      this.axisLocked = true;
      this.renderSelection();
    }
    if (Math.abs(input.moveX) < 0.2) this.axisLocked = false;
    if (input.confirmPressed) {
      const levelId = LEVELS[this.selected].id;
      this.registry.set("levelId", levelId);
      this.scene.start(SCENE_KEYS.PRELOAD, { levelId });
    }
  }

  renderSelection() {
    this.cards.forEach((entry, index) => {
      const selected = index === this.selected;
      entry.card.setStrokeStyle(selected ? 8 : 4, selected ? COLORS.collect : COLORS.outline);
      entry.card.setScale(selected ? 1.05 : 1).setAlpha(selected ? 1 : 0.7);
    });
  }
}
