import Phaser from "phaser";
import { COLORS, CSS_COLORS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../config/constants.js";
import { CHARACTER_LIST } from "../data/characters.js";
import { AssetManager } from "../systems/AssetManager.js";
import { InputManager } from "../systems/InputManager.js";

export class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.CHARACTER_SELECT);
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.near);
    this.selected = Math.max(0, CHARACTER_LIST.findIndex((character) => character.id === this.registry.get("characterId")));
    this.inputManager = new InputManager(this);
    this.cards = [];

    this.add.text(GAME_WIDTH / 2, 92, "누구와 달릴까요?", {
      fontFamily: "system-ui",
      fontSize: "44px",
      fontStyle: "800",
      color: CSS_COLORS.white
    }).setOrigin(0.5);

    CHARACTER_LIST.forEach((character, index) => {
      const x = GAME_WIDTH / 2 + (index - 0.5) * 360;
      const card = this.add.rectangle(x, GAME_HEIGHT / 2 + 25, 300, 390, COLORS.bgMid ?? COLORS.mid, 0.85)
        .setStrokeStyle(5, COLORS.outline);
      const texture = AssetManager.ensurePlayerTexture(this, character);
      const portrait = this.add.image(x, GAME_HEIGHT / 2 - 25, texture).setScale(1.65).setOrigin(0.5);
      const name = this.add.text(x, GAME_HEIGHT / 2 + 145, character.name, {
        fontFamily: "system-ui",
        fontSize: "27px",
        fontStyle: "800",
        color: CSS_COLORS.white
      }).setOrigin(0.5);
      this.cards.push({ card, portrait, name });
    });

    this.add.text(GAME_WIDTH / 2, 650, "← → 선택   ·   Space / Z 결정", {
      fontFamily: "system-ui",
      fontSize: "19px",
      color: CSS_COLORS.soft
    }).setOrigin(0.5);
    this.renderSelection();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.inputManager.destroy());
  }

  update() {
    const input = this.inputManager.sample();
    if (Math.abs(input.moveX) > 0.5 && !this.axisLocked) {
      this.selected = Phaser.Math.Wrap(this.selected + Math.sign(input.moveX), 0, CHARACTER_LIST.length);
      this.axisLocked = true;
      this.renderSelection();
    }
    if (Math.abs(input.moveX) < 0.2) this.axisLocked = false;
    if (input.confirmPressed) {
      this.registry.set("characterId", CHARACTER_LIST[this.selected].id);
      this.scene.start(SCENE_KEYS.STAGE_SELECT);
    }
  }

  renderSelection() {
    this.cards.forEach((entry, index) => {
      const selected = index === this.selected;
      entry.card.setStrokeStyle(selected ? 8 : 4, selected ? COLORS.collect : COLORS.outline);
      entry.card.setFillStyle(selected ? COLORS.mid : COLORS.near, selected ? 1 : 0.82);
      entry.portrait.setScale(selected ? 1.8 : 1.55).setAlpha(selected ? 1 : 0.68);
      entry.name.setColor(selected ? CSS_COLORS.collect : CSS_COLORS.white);
    });
  }
}
