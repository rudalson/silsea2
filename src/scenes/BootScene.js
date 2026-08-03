import Phaser from "phaser";
import { DEBUG_ENABLED, SCENE_KEYS } from "../config/constants.js";
import { CHARACTER_LIST } from "../data/characters.js";
import { LEVELS } from "../data/levels/index.js";

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BOOT);
  }

  create() {
    this.registry.set("characterId", CHARACTER_LIST[0].id);
    this.registry.set("levelId", LEVELS[0].id);
    this.registry.set("debugEnabled", DEBUG_ENABLED);
    this.registry.set("easyMode", false);
    this.scene.start(SCENE_KEYS.MENU);
  }
}

