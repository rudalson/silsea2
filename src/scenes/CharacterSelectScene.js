import Phaser from "phaser";
import { GAME_FONT_FAMILY } from "../config/font.js";
import { COLORS, CSS_COLORS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../config/constants.js";
import { CHARACTER_LIST } from "../data/characters.js";
import {
  getCharacterCardLayout,
  getCharacterSelectionAnnouncement,
  moveCharacterSelection
} from "../data/characterSelection.js";
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
    this.createBackButton();

    const layout = getCharacterCardLayout(CHARACTER_LIST.length, { gameWidth: GAME_WIDTH });
    CHARACTER_LIST.forEach((character, index) => {
      const { x, y } = layout[index];
      const card = this.add.rectangle(x, y, 250, 206, COLORS.near, 0.88)
        .setStrokeStyle(5, COLORS.outline)
        .setDepth(2)
        .setInteractive({ useHandCursor: true });
      CharacterAnimationManager.register(this, character);
      const idle = CharacterAnimationManager.getSpec(character, "idle");
      const hasArt = Boolean(idle && this.textures.exists(idle.textureKey));
      const texture = hasArt ? idle.textureKey : AssetManager.ensurePlayerTexture(this, character);
      const portraitScale = hasArt ? 0.72 : 0.82;
      const portrait = this.add.sprite(x, y - 34, texture).setScale(portraitScale).setOrigin(0.5).setDepth(3);
      if (hasArt) CharacterAnimationManager.play(portrait, character, "idle");
      const name = this.add.text(x, y + 40, character.name, {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "22px",
        fontStyle: "800",
        color: CSS_COLORS.white
      }).setOrigin(0.5).setDepth(3);
      const englishName = this.add.text(x, y + 65, character.englishName, {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "13px",
        fontStyle: "800",
        color: CSS_COLORS.collect
      }).setOrigin(0.5).setDepth(3);
      const symbol = character.selectionSymbol === "heart"
        ? "♥"
        : character.selectionSymbol === "star" ? "★" : "•";
      const badge = this.add.text(x, y + 88, `${symbol} ${character.description}`, {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "12px",
        fontStyle: "700",
        color: CSS_COLORS.soft,
        align: "center",
        wordWrap: { width: 226 }
      }).setOrigin(0.5).setDepth(3);
      card.on("pointerover", () => {
        if (this.selected === index) return;
        this.selected = index;
        this.audioManager.playSfx("sfx_ui_move");
        this.renderSelection();
      });
      card.on("pointerdown", () => this.confirmSelection());
      this.cards.push({ card, portrait, portraitScale, name, englishName, badge });
    });

    this.add.text(GAME_WIDTH / 2, 682, "← ↑ ↓ → 선택   ·   Space / Z 결정   ·   Esc 이전 메뉴", {
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
    const navigating = Math.abs(input.moveX) > 0.5 || Math.abs(input.moveY) > 0.5;
    if (navigating && !this.navigationLocked) {
      this.selected = moveCharacterSelection(
        this.selected,
        input.moveX,
        input.moveY,
        CHARACTER_LIST.length
      );
      this.navigationLocked = true;
      this.audioManager.playSfx("sfx_ui_move");
      this.renderSelection();
    }
    if (Math.abs(input.moveX) < 0.2 && Math.abs(input.moveY) < 0.2) this.navigationLocked = false;
    if (input.confirmPressed) this.confirmSelection();
    if (input.pausePressed) this.goBack();
  }

  createBackButton() {
    const button = this.add.text(34, 36, "← 처음으로", {
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
      entry.card.setFillStyle(selected ? COLORS.near : COLORS.near, selected ? 0.96 : 0.78);
      entry.portrait.setScale(entry.portraitScale * (selected ? 1.1 : 0.94)).setAlpha(selected ? 1 : 0.68);
      entry.name.setColor(selected ? CSS_COLORS.collect : CSS_COLORS.white);
      entry.englishName.setAlpha(selected ? 1 : 0.62);
      entry.badge.setAlpha(selected ? 1 : 0.58);
    });
    const announcement = getCharacterSelectionAnnouncement(
      CHARACTER_LIST[this.selected],
      this.selected,
      CHARACTER_LIST.length
    );
    this.registry.set("characterSelectAnnouncement", announcement);
    this.game.canvas?.setAttribute("aria-label", announcement);
  }

  confirmSelection() {
    if (this.starting) return;
    this.starting = true;
    this.audioManager.playSfx("sfx_ui_select", { randomizeRate: false });
    this.registry.set("characterId", CHARACTER_LIST[this.selected].id);
    this.cameras.main.fadeOut(170, 255, 245, 188);
    this.time.delayedCall(180, () => this.scene.start(SCENE_KEYS.STAGE_SELECT));
  }

  goBack() {
    if (this.starting) return;
    this.starting = true;
    this.audioManager.playSfx("sfx_ui_select", { randomizeRate: false });
    this.cameras.main.fadeOut(170, 255, 245, 188);
    this.time.delayedCall(180, () => this.scene.start(SCENE_KEYS.MENU));
  }
}
