export class AudioManager {
  constructor(scene) {
    this.scene = scene;
    this.muted = true;
  }

  play(key, config = {}) {
    if (this.muted || !this.scene.cache.audio.exists(key)) return null;
    return this.scene.sound.play(key, config);
  }

  setMuted(value) {
    this.muted = Boolean(value);
    this.scene.sound.mute = this.muted;
  }

  destroy() {
    this.scene = null;
  }
}

