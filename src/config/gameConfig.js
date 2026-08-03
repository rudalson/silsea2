import Phaser from "phaser";
import { CSS_COLORS, DEBUG_ENABLED, GAME_HEIGHT, GAME_WIDTH } from "./constants.js";
import { BootScene } from "../scenes/BootScene.js";
import { PreloadScene } from "../scenes/PreloadScene.js";
import { MenuScene } from "../scenes/MenuScene.js";
import { CharacterSelectScene } from "../scenes/CharacterSelectScene.js";
import { StageSelectScene } from "../scenes/StageSelectScene.js";
import { GameScene } from "../scenes/GameScene.js";
import { UIScene } from "../scenes/UIScene.js";
import { ClearScene } from "../scenes/ClearScene.js";

export const gameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: CSS_COLORS.skyTop,
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: DEBUG_ENABLED
    }
  },
  dom: {
    createContainer: true
  },
  input: {
    gamepad: true
  },
  scene: [
    BootScene,
    PreloadScene,
    MenuScene,
    CharacterSelectScene,
    StageSelectScene,
    GameScene,
    UIScene,
    ClearScene
  ]
};
