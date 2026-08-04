import Phaser from "phaser";
import { DEBUG_ENABLED, SCENE_KEYS } from "../config/constants.js";
import { CHARACTER_LIST } from "../data/characters.js";
import { LEVELS } from "../data/levels/index.js";
import { AssetManager } from "../systems/AssetManager.js";

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BOOT);
  }

  preload() {
    AssetManager.queueAudioAssets(this);
    AssetManager.queueCharacterPortraits(this);
  }

  create() {
    this.registry.set("characterId", CHARACTER_LIST[0].id);
    this.registry.set("levelId", LEVELS[0].id);
    this.registry.set("debugEnabled", DEBUG_ENABLED);
    this.registry.set("easyMode", false);
    this.registry.set("screenShakeEnabled", true);
    this.registry.set("audioMuted", false);
    this.registry.set("sfxVolume", 0.72);
    this.registry.set("bgmVolume", 0.46);
    this.scene.start(SCENE_KEYS.MENU);
  }
}
