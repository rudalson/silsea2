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
    const container = this.game.canvas.parentElement;
    container.dataset.startScreen = "true";
    this.scale.getParentBounds();
    this.scale.refresh();
    this.cameras.main.setBackgroundColor(COLORS.storybookBg);
    const artwork = this.createStorybookCover();
    this.createStorybookStartButton(artwork);

    this.inputManager = new InputManager(this);
    this.audioManager = new AudioManager(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      delete container.dataset.startScreen;
      this.scale.getParentBounds();
      this.scale.refresh();
      this.inputManager.destroy();
      this.audioManager.destroy();
    });
  }

  update() {
    if (this.inputManager.sample().confirmPressed) {
      this.startAdventure();
    }
  }

  createStorybookCover() {
    // The supplied cover already contains the title, frame, bows and characters.
    // Fit the complete illustration without cropping or stretching its artwork.
    const source = this.textures.exists("bg_intro")
      ? this.textures.get("bg_intro").getSourceImage()
      : { width: 2034, height: 1362 };
    const scale = Math.min(GAME_WIDTH / source.width, GAME_HEIGHT / source.height);
    const width = source.width * scale;
    const height = source.height * scale;
    const bounds = { x: (GAME_WIDTH - width) / 2, y: (GAME_HEIGHT - height) / 2, width, height };

    if (this.textures.exists("bg_intro")) {
      this.textures.get("bg_intro").setFilter(Phaser.Textures.FilterMode.LINEAR);
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "bg_intro").setScale(scale);
    } else {
      this.add.text(bounds.x + width / 3, bounds.y + height * 0.43, "실세아와\n구운감자의\n모험", {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: "42px",
        color: CSS_COLORS.storybookHeading,
        align: "center"
      }).setOrigin(0.5);
    }
    return bounds;
  }

  createStorybookStartButton(artwork) {
    // Keep the controls below the gold frame and to the left of the pony.
    const x = artwork.x + artwork.width * 0.315;
    const y = artwork.y + artwork.height * 0.64;
    const button = this.add.container(x, y).setDepth(5).setSize(224, 60)
      .setInteractive({ useHandCursor: true });
    const art = this.add.graphics();
    const label = this.add.text(-10, -1, "모험 시작", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "28px",
      color: CSS_COLORS.storybookLabel
    }).setOrigin(0.5);
    const arrow = this.add.text(78, -1, "▶", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "17px",
      color: CSS_COLORS.storybookArrow
    }).setOrigin(0.5);
    const draw = (hovered = false) => {
      art.clear();
      art.fillStyle(COLORS.storybookButtonShadow, 0.18);
      art.fillRoundedRect(-112, -26, 224, 60, 25);
      art.fillStyle(hovered ? COLORS.storybookButtonHover : COLORS.storybookButtonNormal, 0.98);
      art.fillRoundedRect(-112, -30, 224, 60, 25);
      art.lineStyle(2, COLORS.storybookButtonBorder, 1);
      art.strokeRoundedRect(-112, -30, 224, 60, 25);
      art.lineStyle(1, COLORS.storybookButtonInner, 0.95);
      art.strokeRoundedRect(-106, -24, 212, 48, 20);
    };
    draw();
    button.add([art, label, arrow]);
    button.on("pointerover", () => draw(true));
    button.on("pointerout", () => draw(false));
    button.on("pointerdown", () => this.startAdventure());

    this.add.text(x, y + 48, "클릭 또는 Enter / Space", {
      fontFamily: GAME_FONT_FAMILY,
      fontSize: "15px",
      color: CSS_COLORS.storybookCaption,
      stroke: CSS_COLORS.storybookCaptionStroke,
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(5);
  }

  startAdventure() {
    if (this.starting) return;
    this.starting = true;
    this.audioManager.playSfx("sfx_ui_select", { randomizeRate: false });
    this.cameras.main.fadeOut(180, 255, 245, 232);
    this.time.delayedCall(190, () => this.scene.start(SCENE_KEYS.CHARACTER_SELECT));
  }
}
