import Phaser from "phaser";
import { DEBUG_ENABLED, SCENE_KEYS } from "../config/constants.js";
import { CHARACTER_LIST } from "../data/characters.js";
import { FORMS } from "../data/gameplay.js";
import { LEVELS, getLevel } from "../data/levels/index.js";
import { AssetManager } from "../systems/AssetManager.js";

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BOOT);
  }

  init() {
    const query = new URLSearchParams(window.location.search);
    this.registry.set("forceAssetFallback", query.get("fallback") === "1");
  }

  preload() {
    AssetManager.queueUiAssets(this);
    AssetManager.queueAudioAssets(this);
    AssetManager.queueCharacterPortraits(this);
    AssetManager.queueManifestAsset(this, "bg_intro");
    AssetManager.queueManifestAsset(this, "bg_character_select");
    AssetManager.queueManifestAsset(this, "bg_stage_select_calm");
    for (const level of LEVELS) {
      if (level.assets.preview) AssetManager.queueManifestAsset(this, level.assets.preview);
    }
  }

  create() {
    const query = new URLSearchParams(window.location.search);
    const requestedCharacter = query.get("character");
    const playtestEnabled = query.get("playtest") === "1";
    const playtestTesterId = query.get("tester") ?? "anonymous";
    const characterId = CHARACTER_LIST.some(({ id }) => id === requestedCharacter)
      ? requestedCharacter
      : CHARACTER_LIST[0].id;
    const requestedReviewLevel = query.get("visualReview");
    const stageSelectReview = requestedReviewLevel === "stage-select";
    const reviewLevel = LEVELS.find(({ id }) => id === requestedReviewLevel) ?? null;
    const p1TestLevel = query.get("p1test") === "1" ? getLevel("p1-environment-test") : null;
    const directLevel = reviewLevel ?? p1TestLevel;
    const levelId = directLevel?.id ?? LEVELS[0].id;
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
    this.registry.set("visualReviewPresentation", Boolean(reviewLevel && query.get("presentation") === "1"));
    this.registry.set("debugEnabled", DEBUG_ENABLED);
    this.registry.set("easyMode", query.get("easy") === "1");
    this.registry.set("playtestEnabled", playtestEnabled);
    this.registry.set("playtestTesterId", playtestTesterId);
    this.registry.set("screenShakeEnabled", true);
    this.registry.set("screenEffectStrength", query.get("effects") === "reduced" ? "reduced" : "normal");
    this.registry.set("audioMuted", false);
    this.registry.set("sfxVolume", 0.72);
    this.registry.set("bgmVolume", 0.46);
    if (stageSelectReview) {
      this.scene.start(SCENE_KEYS.STAGE_SELECT);
      return;
    }
    if (directLevel) {
      this.scene.start(SCENE_KEYS.PRELOAD, { levelId });
      return;
    }
    this.scene.start(SCENE_KEYS.MENU);
  }
}
