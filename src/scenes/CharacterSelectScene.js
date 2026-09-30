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
    this.add.text(GAME_WIDTH / 2, 61, "CHARACTER SELECT", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "16px",
      fontStyle: "800",
      letterSpacing: 4,
      color: CSS_COLORS.collect,
      stroke: CSS_COLORS.outline,
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(3);
    this.add.text(GAME_WIDTH / 2, 104, "누구와 달릴까요?", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "38px",
      fontStyle: "800",
      color: CSS_COLORS.white,
      stroke: CSS_COLORS.outline,
      strokeThickness: 7
    }).setOrigin(0.5).setDepth(3);
    this.createBackButton();

    // One large character and a row of small portraits leave the storybook
    // background visible even as the roster grows.
    this.add.ellipse(425, 337, 322, 306, COLORS.white, 0.19)
      .setStrokeStyle(3, COLORS.collect, 0.58).setDepth(1);
    this.add.ellipse(425, 454, 258, 31, COLORS.outline, 0.27).setDepth(1);
    this.add.text(725, 247, "CHOOSE YOUR FRIEND", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "17px",
      fontStyle: "800",
      letterSpacing: 3,
      color: CSS_COLORS.collect,
      stroke: CSS_COLORS.outline,
      strokeThickness: 5
    }).setDepth(3);
    this.add.rectangle(760, 284, 72, 3, COLORS.collect, 0.9).setDepth(3);
    this.featuredName = this.add.text(725, 296, "", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "50px",
      fontStyle: "800",
      color: CSS_COLORS.white,
      stroke: CSS_COLORS.outline,
      strokeThickness: 8
    }).setDepth(3);
    this.featuredEnglishName = this.add.text(728, 363, "", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "21px",
      fontStyle: "800",
      color: CSS_COLORS.collect,
      stroke: CSS_COLORS.outline,
      strokeThickness: 5
    }).setDepth(3);
    this.featuredDescription = this.add.text(728, 404, "", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "23px",
      fontStyle: "700",
      color: CSS_COLORS.white,
      stroke: CSS_COLORS.outline,
      strokeThickness: 6,
      wordWrap: { width: 440 }
    }).setDepth(3);
    this.createPillButton({
      x: 849, y: 466, width: 278, height: 60,
      label: "✦  이 친구로 달리기  →",
      kind: "start",
      onClick: () => this.confirmSelection()
    });

    for (const [direction, x, arrow] of [[-1, 170, "◀"], [1, 1110, "▶"]]) {
      const control = this.add.text(x, 345, arrow, {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "48px",
        color: CSS_COLORS.white,
        stroke: CSS_COLORS.outline,
        strokeThickness: 7
      }).setOrigin(0.5).setDepth(4).setInteractive({ useHandCursor: true });
      control.on("pointerover", () => control.setColor(CSS_COLORS.collect));
      control.on("pointerout", () => control.setColor(CSS_COLORS.white));
      control.on("pointerdown", () => this.changeSelection(direction));
    }

    const layout = getCharacterCardLayout(CHARACTER_LIST.length, {
      gameWidth: GAME_WIDTH,
      firstRowY: 562,
      columnGap: 132,
      columns: CHARACTER_LIST.length
    });
    this.portraitTextures = new Map();
    CHARACTER_LIST.forEach((character, index) => {
      const { x, y } = layout[index];
      const ring = this.add.ellipse(x, y, 102, 102, COLORS.near, 0.63)
        .setStrokeStyle(2, COLORS.white, 0.8).setDepth(2)
        .setInteractive({ useHandCursor: true });
      CharacterAnimationManager.register(this, character);
      const idle = CharacterAnimationManager.getSpec(character, "idle");
      const hasArt = Boolean(idle && this.textures.exists(idle.textureKey));
      const texture = hasArt ? idle.textureKey : AssetManager.ensurePlayerTexture(this, character);
      const heroKey = `character_select_hero_${character.id}`;
      const heroTexture = this.textures.exists(heroKey) ? heroKey : texture;
      if (heroTexture === heroKey) this.textures.get(heroKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
      this.portraitTextures.set(character.id, { texture, hasArt, heroTexture });
      const portrait = this.add.sprite(x, y, texture).setScale(0.76).setOrigin(0.5).setDepth(3);
      if (hasArt) CharacterAnimationManager.play(portrait, character, "idle");
      const name = this.add.text(x, y + 69, character.name, {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "16px",
        fontStyle: "800",
        color: CSS_COLORS.white,
        stroke: CSS_COLORS.outline,
        strokeThickness: 4
      }).setOrigin(0.5).setDepth(3);
      ring.on("pointerover", () => this.selectCharacter(index));
      ring.on("pointerdown", () => this.selectCharacter(index));
      this.cards.push({ ring, portrait, name, y });
    });

    const first = CHARACTER_LIST[this.selected];
    const firstArt = this.portraitTextures.get(first.id);
    this.featured = this.add.image(425, 326, firstArt.heroTexture)
      .setDisplaySize(350, 350).setDepth(3);
    this.add.text(GAME_WIDTH / 2, 686, "← ↑ ↓ → 친구 선택   ·   Space / Z 시작   ·   Esc 이전 메뉴", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "18px",
      fontStyle: "700",
      color: CSS_COLORS.white,
      stroke: CSS_COLORS.outline,
      strokeThickness: 5
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
      const direction = Math.abs(input.moveX) >= Math.abs(input.moveY) ? input.moveX : input.moveY;
      this.changeSelection(direction);
      this.navigationLocked = true;
    }
    if (Math.abs(input.moveX) < 0.2 && Math.abs(input.moveY) < 0.2) this.navigationLocked = false;
    if (input.confirmPressed) this.confirmSelection();
    if (input.pausePressed) this.goBack();
  }

  createBackButton() {
    this.createPillButton({
      x: 121, y: 38, width: 182, height: 48,
      label: "←  처음으로",
      kind: "back",
      onClick: () => this.goBack()
    });
  }

  createPillButton({ x, y, width, height, label, kind, onClick }) {
    const radius = height / 2;
    const left = x - width / 2, top = y - height / 2;
    const shadow = this.add.graphics().setDepth(3);
    shadow.fillStyle(COLORS.outline, 0.34);
    shadow.fillRoundedRect(left + 2, top + 5, width, height, radius);
    const face = this.add.graphics().setDepth(4);
    const isStart = kind === "start";
    const draw = (hovered) => {
      face.clear();
      face.fillStyle(isStart ? (hovered ? COLORS.white : COLORS.storybookButtonInner) : COLORS.near, isStart ? 1 : (hovered ? 0.98 : 0.86));
      face.fillRoundedRect(left, top, width, height, radius);
      face.lineStyle(isStart ? 3 : 2, isStart ? COLORS.collect : COLORS.white, isStart ? 1 : 0.9);
      face.strokeRoundedRect(left, top, width, height, radius);
      face.fillStyle(COLORS.white, isStart ? 0.45 : 0.16);
      face.fillRoundedRect(left + 12, top + 6, width - 24, 8, 4);
    };
    draw(false);
    const text = this.add.text(x, y, label, {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: isStart ? "22px" : "18px",
      fontStyle: "800",
      color: isStart ? CSS_COLORS.near : CSS_COLORS.white
    }).setOrigin(0.5).setDepth(5);
    const hit = this.add.zone(x, y, width, height).setDepth(6).setInteractive({ useHandCursor: true });
    hit.on("pointerover", () => { draw(true); text.setScale(1.04); });
    hit.on("pointerout", () => { draw(false); text.setScale(1); });
    hit.on("pointerdown", onClick);
    return hit;
  }

  changeSelection(direction) {
    const next = moveCharacterSelection(this.selected, direction, 0, CHARACTER_LIST.length);
    this.selectCharacter(next);
  }

  selectCharacter(index) {
    if (index === this.selected || this.starting) return;
    this.selected = index;
    this.audioManager.playSfx("sfx_ui_move");
    this.renderSelection();
  }

  renderSelection() {
    this.cards.forEach((entry, index) => {
      const selected = index === this.selected;
      entry.ring.setStrokeStyle(selected ? 5 : 2, selected ? COLORS.collect : COLORS.white, selected ? 1 : 0.8);
      entry.ring.setFillStyle(selected ? COLORS.white : COLORS.near, selected ? 0.42 : 0.63);
      entry.ring.setScale(selected ? 1.15 : 1).setY(entry.y - (selected ? 5 : 0));
      entry.portrait.setScale(selected ? 0.9 : 0.76).setY(entry.y - (selected ? 5 : 0))
        .setAlpha(selected ? 1 : 0.86);
      entry.name.setColor(selected ? CSS_COLORS.collect : CSS_COLORS.white);
    });
    const character = CHARACTER_LIST[this.selected];
    const art = this.portraitTextures.get(character.id);
    this.featured.setTexture(art.heroTexture).setDisplaySize(350, 350);
    this.featuredName.setText(character.name);
    this.featuredEnglishName.setText(`${character.englishName}   ·   ${String(this.selected + 1).padStart(2, "0")} / ${String(CHARACTER_LIST.length).padStart(2, "0")}`);
    this.featuredDescription.setText(character.description);
    const announcement = getCharacterSelectionAnnouncement(
      character,
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
