export const CAMERA_SHAKE_PROFILES = Object.freeze({
  enemyDefeat: Object.freeze({ duration: 90, intensity: 0.0014 }),
  lightning: Object.freeze({ duration: 115, intensity: 0.0021 }),
  bossLandLight: Object.freeze({ duration: 100, intensity: 0.002 }),
  bossLand: Object.freeze({ duration: 130, intensity: 0.0028 }),
  bossDefeat: Object.freeze({ duration: 140, intensity: 0.0022 })
});

const MAX_SHAKE_DURATION = 180;
const MAX_SHAKE_INTENSITY = 0.003;

export class CameraEffectsManager {
  constructor(scene) {
    this.scene = scene;
    const stored = scene.registry?.get?.("screenShakeEnabled");
    this.enabled = stored === undefined ? true : Boolean(stored);
  }

  shake(profileKey = "enemyDefeat", overrides = {}) {
    if (!this.enabled) return false;
    const profile = CAMERA_SHAKE_PROFILES[profileKey] ?? CAMERA_SHAKE_PROFILES.enemyDefeat;
    const duration = Math.max(0, Math.min(MAX_SHAKE_DURATION, overrides.duration ?? profile.duration));
    const intensity = Math.max(0, Math.min(MAX_SHAKE_INTENSITY, overrides.intensity ?? profile.intensity));
    if (!duration || !intensity) return false;
    this.scene.cameras.main.shake(duration, intensity);
    return true;
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
    this.scene.registry?.set?.("screenShakeEnabled", this.enabled);
    if (!this.enabled) this.scene.cameras.main.shakeEffect?.reset?.();
    return this.enabled;
  }

  toggle() {
    return this.setEnabled(!this.enabled);
  }

  getSnapshot() {
    return { enabled: this.enabled };
  }

  destroy() {
    this.scene = null;
  }
}
