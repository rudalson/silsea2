import { EVENTS } from "../config/constants.js";
import { FORMS } from "../data/gameplay.js";

const DEFAULT_SETTINGS = Object.freeze({
  muted: false,
  sfxVolume: 0.72,
  bgmVolume: 0.46
});

const ITEM_SFX = Object.freeze({
  percent_small: "sfx_percent_small",
  percent_large: "sfx_percent_large"
});

export const STAR_PITCH_SEMITONES = Object.freeze([0, 2, 4, 5, 7, 9]);
export const STAR_PITCH_RATES = Object.freeze(
  STAR_PITCH_SEMITONES.map((semitones) => 2 ** (semitones / 12))
);
export const BGM_CROSSFADE_MS = 480;
export const ALICORN_LAYER_FADE_IN_MS = 120;
export const ALICORN_LAYER_KEY = "bgm_alicorn_layer";

const ALICORN_LAYER_VOLUME = 0.52;
const ALICORN_LAYER_EXIT_FADE_MS = 180;

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value)));

export class AudioManager {
  constructor(scene, { random = Math.random, maxSameFrame = 2 } = {}) {
    this.scene = scene;
    this.random = random;
    this.maxSameFrame = maxSameFrame;
    this.sameFramePlays = new Map();
    this.loops = new Map();
    this.bgmLayers = new Map();
    this.desiredBgmLayers = new Map();
    this.fadingBgm = new Set();
    this.starStep = 0;
    this.currentBgm = null;
    this.currentBgmKey = null;
    this.desiredBgm = null;
    this.settings = {
      muted: this.readSetting("audioMuted", DEFAULT_SETTINGS.muted),
      sfxVolume: this.readSetting("sfxVolume", DEFAULT_SETTINGS.sfxVolume),
      bgmVolume: this.readSetting("bgmVolume", DEFAULT_SETTINGS.bgmVolume)
    };
    this.bindSceneEvents();
    this.applyMute();
  }

  readSetting(key, fallback) {
    const value = this.scene.registry?.get?.(key);
    return value === undefined ? fallback : value;
  }

  bindSceneEvents() {
    this.handlers = [
      [EVENTS.ITEM_COLLECTED, ({ type } = {}) => {
        if (type === "star") {
          this.playStar();
          return;
        }
        const key = ITEM_SFX[type];
        if (key) this.playSfx(key);
      }],
      [EVENTS.COMBO_CHANGED, ({ combo } = {}) => {
        if (!combo) this.resetStarSequence();
      }],
      [EVENTS.CHECKPOINT, () => this.playSfx("sfx_checkpoint", { randomizeRate: false })],
      [EVENTS.PLAYER_HIT, ({ hp } = {}) => this.playSfx(hp <= 0 ? "sfx_hp_zero" : "sfx_player_hurt")],
      [EVENTS.PLAYER_RESPAWNED, () => this.playSfx("sfx_respawn", { randomizeRate: false })],
      [EVENTS.FORM_CHANGED, ({ form, emphasize } = {}) => {
        if (emphasize && form !== "base") this.playSfx(`sfx_transform_${form}`, { randomizeRate: false });
        if (form === FORMS.ALICORN) {
          this.playBgmLayer(ALICORN_LAYER_KEY, {
            volume: ALICORN_LAYER_VOLUME,
            fadeInMs: ALICORN_LAYER_FADE_IN_MS
          });
        } else {
          this.stopBgmLayer(ALICORN_LAYER_KEY, { fadeOutMs: ALICORN_LAYER_EXIT_FADE_MS });
        }
      }],
      [EVENTS.FORM_WARNING, ({ remaining } = {}) => {
        this.playSfx("sfx_alicorn_warning", { randomizeRate: false });
        this.stopBgmLayer(ALICORN_LAYER_KEY, {
          fadeOutMs: Math.max(ALICORN_LAYER_EXIT_FADE_MS, Number(remaining) || ALICORN_LAYER_EXIT_FADE_MS)
        });
      }],
      [EVENTS.BOSS_HIT, () => this.playSfx("sfx_boss_hit")],
      [EVENTS.BOSS_DEFEATED, () => this.playSfx("sfx_boss_defeat", { randomizeRate: false })]
    ];
    for (const [event, handler] of this.handlers) this.scene.events?.on?.(event, handler);
  }

  has(key) {
    try {
      return Boolean(this.scene?.cache?.audio?.exists?.(key));
    } catch {
      return false;
    }
  }

  play(key, config = {}) {
    return this.playSfx(key, config);
  }

  playSfx(key, config = {}) {
    if (this.settings.muted || !this.has(key) || !this.canPlayThisFrame(key)) return null;
    const {
      volume = 1,
      rate,
      randomizeRate = true,
      ...soundConfig
    } = config;
    const playbackRate = rate ?? (randomizeRate ? 0.95 + this.random() * 0.1 : 1);
    try {
      return this.scene.sound?.play?.(key, {
        ...soundConfig,
        volume: clamp01(volume) * this.settings.sfxVolume,
        rate: playbackRate
      }) ?? null;
    } catch {
      return null;
    }
  }

  playStar(config = {}) {
    const step = Math.min(this.starStep, STAR_PITCH_RATES.length - 1);
    this.starStep = Math.min(step + 1, STAR_PITCH_RATES.length - 1);
    return this.playSfx("sfx_star", {
      ...config,
      rate: STAR_PITCH_RATES[step],
      randomizeRate: false
    });
  }

  resetStarSequence() {
    this.starStep = 0;
  }

  playLoop(key, config = {}) {
    if (this.loops.has(key)) return this.loops.get(key);
    if (this.settings.muted || !this.has(key)) return null;
    try {
      const sound = this.scene.sound?.add?.(key, {
        ...config,
        loop: true,
        volume: clamp01(config.volume ?? 1) * this.settings.sfxVolume,
        rate: config.rate ?? 1
      });
      if (!sound || sound.play?.() === false) {
        sound?.destroy?.();
        return null;
      }
      this.loops.set(key, sound);
      return sound;
    } catch {
      return null;
    }
  }

  stopLoop(key) {
    const sound = this.loops.get(key);
    if (!sound) return;
    sound.stop?.();
    sound.destroy?.();
    this.loops.delete(key);
  }

  playBgm(key, { loop = key !== "bgm_clear", volume = 1, fadeMs = 0 } = {}) {
    if (!this.has(key)) return null;
    this.desiredBgm = { key, loop, volume, fadeMs };
    if (this.currentBgmKey === key && this.currentBgm?.isPlaying) return this.currentBgm;
    if (this.settings.muted) {
      this.stopBgm({ keepDesired: true });
      return null;
    }

    const previous = this.currentBgm;
    try {
      const targetVolume = clamp01(volume) * this.settings.bgmVolume;
      const sound = this.scene.sound?.add?.(key, {
        loop,
        volume: fadeMs > 0 ? 0 : targetVolume
      });
      if (!sound || sound.play?.() === false) {
        sound?.destroy?.();
        return null;
      }
      this.currentBgm = sound;
      this.currentBgmKey = key;
      if (previous && previous !== sound) {
        this.fadingBgm.add(previous);
        this.fadeSound(previous, 0, fadeMs, () => {
          this.fadingBgm.delete(previous);
          this.releaseSound(previous);
        });
      }
      if (fadeMs > 0) this.fadeSound(sound, targetVolume, fadeMs);
      return sound;
    } catch {
      return null;
    }
  }

  transitionBgm(key, config = {}) {
    return this.playBgm(key, { ...config, fadeMs: config.fadeMs ?? BGM_CROSSFADE_MS });
  }

  playBgmLayer(key, { volume = 1, fadeInMs = 0 } = {}) {
    if (!this.has(key)) return null;
    const config = { key, volume: clamp01(volume), fadeInMs };
    this.desiredBgmLayers.set(key, config);
    const existing = this.bgmLayers.get(key);
    if (existing) {
      existing.stopping = false;
      existing.volume = config.volume;
      this.fadeSound(existing.sound, config.volume * this.settings.bgmVolume, fadeInMs);
      return existing.sound;
    }
    if (this.settings.muted) return null;

    try {
      const targetVolume = config.volume * this.settings.bgmVolume;
      const sound = this.scene.sound?.add?.(key, {
        loop: true,
        volume: fadeInMs > 0 ? 0 : targetVolume
      });
      if (!sound || sound.play?.() === false) {
        sound?.destroy?.();
        return null;
      }
      this.bgmLayers.set(key, { sound, volume: config.volume, stopping: false });
      if (fadeInMs > 0) this.fadeSound(sound, targetVolume, fadeInMs);
      return sound;
    } catch {
      return null;
    }
  }

  stopBgmLayer(key, { fadeOutMs = 0, keepDesired = false } = {}) {
    if (!keepDesired) this.desiredBgmLayers.delete(key);
    const entry = this.bgmLayers.get(key);
    if (!entry) return;
    entry.stopping = true;
    this.fadeSound(entry.sound, 0, fadeOutMs, () => {
      if (!entry.stopping) return;
      this.releaseSound(entry.sound);
      if (this.bgmLayers.get(key) === entry) this.bgmLayers.delete(key);
    });
  }

  stopAllBgmLayers({ keepDesired = false } = {}) {
    for (const key of [...this.bgmLayers.keys()]) this.stopBgmLayer(key, { keepDesired });
    if (!keepDesired) this.desiredBgmLayers.clear();
  }

  stopBgm({ keepDesired = false } = {}) {
    this.releaseSound(this.currentBgm);
    for (const sound of this.fadingBgm) this.releaseSound(sound);
    this.fadingBgm.clear();
    this.currentBgm = null;
    this.currentBgmKey = null;
    if (!keepDesired) this.desiredBgm = null;
  }

  setMuted(value) {
    this.settings.muted = Boolean(value);
    this.scene.registry?.set?.("audioMuted", this.settings.muted);
    this.applyMute();
    if (!this.settings.muted) {
      if (!this.currentBgm && this.desiredBgm) this.playBgm(this.desiredBgm.key, this.desiredBgm);
      for (const config of this.desiredBgmLayers.values()) this.playBgmLayer(config.key, config);
    }
  }

  setSfxVolume(value) {
    this.settings.sfxVolume = clamp01(value);
    this.scene.registry?.set?.("sfxVolume", this.settings.sfxVolume);
    for (const sound of this.loops.values()) sound.setVolume?.(this.settings.sfxVolume);
  }

  setBgmVolume(value) {
    this.settings.bgmVolume = clamp01(value);
    this.scene.registry?.set?.("bgmVolume", this.settings.bgmVolume);
    const baseVolume = clamp01(this.desiredBgm?.volume ?? 1) * this.settings.bgmVolume;
    this.scene.tweens?.killTweensOf?.(this.currentBgm);
    this.currentBgm?.setVolume?.(baseVolume);
    for (const entry of this.bgmLayers.values()) {
      if (entry.stopping) continue;
      this.scene.tweens?.killTweensOf?.(entry.sound);
      entry.sound.setVolume?.(entry.volume * this.settings.bgmVolume);
    }
  }

  applyMute() {
    if (this.scene.sound) this.scene.sound.mute = this.settings.muted;
    if (this.settings.muted) {
      for (const key of [...this.loops.keys()]) this.stopLoop(key);
    }
  }

  canPlayThisFrame(key) {
    const frame = this.scene.game?.loop?.frame ?? Math.floor(this.scene.time?.now ?? 0);
    const record = this.sameFramePlays.get(key);
    if (!record || record.frame !== frame) {
      this.sameFramePlays.set(key, { frame, count: 1 });
      return true;
    }
    if (record.count >= this.maxSameFrame) return false;
    record.count += 1;
    return true;
  }

  getSnapshot() {
    return {
      ...this.settings,
      currentBgmKey: this.currentBgmKey,
      activeBgmLayers: [...this.bgmLayers.keys()],
      activeLoops: [...this.loops.keys()],
      starStep: this.starStep
    };
  }

  destroy() {
    for (const [event, handler] of this.handlers ?? []) this.scene.events?.off?.(event, handler);
    for (const key of [...this.loops.keys()]) this.stopLoop(key);
    this.stopAllBgmLayers();
    this.stopBgm();
    this.sameFramePlays.clear();
    this.scene = null;
  }

  fadeSound(sound, volume, duration, onComplete) {
    if (!sound) {
      onComplete?.();
      return null;
    }
    this.scene.tweens?.killTweensOf?.(sound);
    if (!(duration > 0) || !this.scene.tweens?.add) {
      sound.setVolume?.(volume);
      onComplete?.();
      return null;
    }
    return this.scene.tweens.add({
      targets: sound,
      volume,
      duration,
      ease: "Linear",
      onComplete
    });
  }

  releaseSound(sound) {
    if (!sound) return;
    this.scene?.tweens?.killTweensOf?.(sound);
    sound.stop?.();
    sound.destroy?.();
  }
}
