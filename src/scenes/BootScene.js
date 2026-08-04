import Phaser from "phaser";
import { DEBUG_ENABLED, SCENE_KEYS } from "../config/constants.js";
import { CHARACTER_LIST } from "../data/characters.js";
import { FORMS } from "../data/gameplay.js";
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
    const query = new URLSearchParams(window.location.search);
    const requestedCharacter = query.get("character");
    const characterId = CHARACTER_LIST.some(({ id }) => id === requestedCharacter)
      ? requestedCharacter
      : CHARACTER_LIST[0].id;
    const requestedReviewLevel = query.get("visualReview");
    const reviewLevel = LEVELS.find(({ id }) => id === requestedReviewLevel) ?? null;
    const levelId = reviewLevel?.id ?? LEVELS[0].id;
    const requestedReviewOffset = query.has("offset") ? Number(query.get("offset")) : null;
    const reviewOffset = Number.isFinite(requestedReviewOffset) && requestedReviewOffset >= 0
      ? requestedReviewOffset
      : null;
    const requestedReviewForm = query.get("form");
    const reviewForm = Object.values(FORMS).includes(requestedReviewForm) ? requestedReviewForm : null;
    const requestedReviewZoom = query.has("zoom") ? Number(query.get("zoom")) : null;
    const reviewZoom = Number.isFinite(requestedReviewZoom)
      ? Math.min(2, Math.max(1, requestedReviewZoom))
      : null;

    this.registry.set("characterId", characterId);
    this.registry.set("levelId", levelId);
    this.registry.set("visualReviewSectionId", reviewLevel ? query.get("section") : null);
    this.registry.set("visualReviewOffset", reviewLevel ? reviewOffset : null);
    this.registry.set("visualReviewForm", reviewLevel ? reviewForm : null);
    this.registry.set("visualReviewAnimation", reviewLevel ? query.get("animation") : null);
    this.registry.set("visualReviewZoom", reviewLevel ? reviewZoom : null);
    this.registry.set("debugEnabled", DEBUG_ENABLED);
    this.registry.set("easyMode", false);
    this.registry.set("screenShakeEnabled", true);
    this.registry.set("audioMuted", false);
    this.registry.set("sfxVolume", 0.72);
    this.registry.set("bgmVolume", 0.46);
    if (reviewLevel) {
      this.scene.start(SCENE_KEYS.PRELOAD, { levelId });
      return;
    }
    this.scene.start(SCENE_KEYS.MENU);
  }
}
