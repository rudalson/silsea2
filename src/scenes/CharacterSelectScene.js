import Phaser from "phaser";
import { GAME_FONT_FAMILY } from "../config/font.js";
import { COLORS, CSS_COLORS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../config/constants.js";
import { CHARACTER_LIST } from "../data/characters.js";
import { AssetManager } from "../systems/AssetManager.js";
import { AudioManager } from "../systems/AudioManager.js";
import { CharacterAnimationManager } from "../systems/CharacterAnimationManager.js";
import { InputManager } from "../systems/InputManager.js";

export class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.CHARACTER_SELECT);
  }

  create() {
    this.starting = false;
    this.cameras.main.setBackgroundColor(COLORS.near);
    this.selected = Math.max(0, CHARACTER_LIST.findIndex((character) => character.id === this.registry.get("characterId")));
    this.inputManager = new InputManager(this);
    this.audioManager = new AudioManager(this);
    this.cards = [];

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "bg_character_select").setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.outline, 0.1);
    this.add.rectangle(GAME_WIDTH / 2, 96, 510, 106, COLORS.near, 0.84)
      .setStrokeStyle(4, COLORS.collect, 0.9)
      .setDepth(2);
    this.add.text(GAME_WIDTH / 2, 69, "CHARACTER SELECT", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "16px",
      fontStyle: "800",
      letterSpacing: 4,
      color: CSS_COLORS.collect
    }).setOrigin(0.5).setDepth(3);
    this.add.text(GAME_WIDTH / 2, 111, "누구와 달릴까요?", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "40px",
      fontStyle: "800",
      color: CSS_COLORS.white,
      stroke: CSS_COLORS.outline,
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(3);

    CHARACTER_LIST.forEach((character, index) => {
      const x = GAME_WIDTH / 2 + (index - 0.5) * 360;
      const card = this.add.rectangle(x, GAME_HEIGHT / 2 + 31, 314, 406, COLORS.near, 0.88)
        .setStrokeStyle(5, COLORS.outline)
        .setDepth(2)
        .setInteractive({ useHandCursor: true });
      CharacterAnimationManager.register(this, character);
      const idle = CharacterAnimationManager.getSpec(character, "idle");
      const hasArt = Boolean(idle && this.textures.exists(idle.textureKey));
      const texture = hasArt ? idle.textureKey : AssetManager.ensurePlayerTexture(this, character);
      const portrait = this.add.sprite(x, GAME_HEIGHT / 2 - 18, texture).setScale(1.65).setOrigin(0.5).setDepth(3);
      if (hasArt) CharacterAnimationManager.play(portrait, character, "idle");
      const name = this.add.text(x, GAME_HEIGHT / 2 + 149, character.name, {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "27px",
        fontStyle: "800",
        color: CSS_COLORS.white
      }).setOrigin(0.5).setDepth(3);
      const badge = this.add.text(x, GAME_HEIGHT / 2 + 187, index === 0 ? "빠르고 용감한 친구" : "튼튼하고 다정한 친구", {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "16px",
        fontStyle: "700",
        color: CSS_COLORS.soft
      }).setOrigin(0.5).setDepth(3);
      card.on("pointerover", () => {
        if (this.selected === index) return;
        this.selected = index;
        this.audioManager.playSfx("sfx_ui_move");
        this.renderSelection();
      });
      card.on("pointerdown", () => this.confirmSelection());
      this.cards.push({ card, portrait, name, badge });
    });

    this.add.text(GAME_WIDTH / 2, 650, "← → 선택   ·   Space / Z 결정   ·   카드를 클릭해 바로 시작", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "19px",
      fontStyle: "700",
      color: CSS_COLORS.soft
    }).setOrigin(0.5).setDepth(3);
    this.renderSelection();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.inputManager.destroy();
      this.audioManager.destroy();
    });
  }

  update() {
    const input = this.inputManager.sample();
    if (Math.abs(input.moveX) > 0.5 && !this.axisLocked) {
      this.selected = Phaser.Math.Wrap(this.selected + Math.sign(input.moveX), 0, CHARACTER_LIST.length);
      this.axisLocked = true;
      this.audioManager.playSfx("sfx_ui_move");
      this.renderSelection();
    }
    if (Math.abs(input.moveX) < 0.2) this.axisLocked = false;
    if (input.confirmPressed) this.confirmSelection();
  }

  renderSelection() {
    this.cards.forEach((entry, index) => {
      const selected = index === this.selected;
      entry.card.setStrokeStyle(selected ? 8 : 4, selected ? COLORS.collect : COLORS.outline);
      entry.card.setFillStyle(selected ? COLORS.near : COLORS.near, selected ? 0.96 : 0.78);
      entry.portrait.setScale(selected ? 1.8 : 1.55).setAlpha(selected ? 1 : 0.68);
      entry.name.setColor(selected ? CSS_COLORS.collect : CSS_COLORS.white);
      entry.badge.setAlpha(selected ? 1 : 0.58);
    });
  }

  confirmSelection() {
    if (this.starting) return;
    this.starting = true;
    this.audioManager.playSfx("sfx_ui_select", { randomizeRate: false });
    this.registry.set("characterId", CHARACTER_LIST[this.selected].id);
    this.cameras.main.fadeOut(170, 255, 245, 188);
    this.time.delayedCall(180, () => this.scene.start(SCENE_KEYS.STAGE_SELECT));
  }
}
