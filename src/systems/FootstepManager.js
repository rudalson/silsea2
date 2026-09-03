import {
  FOOTSTEP_SFX,
  FOOTSTEP_VOLUME,
  isFootstepContact,
  resolveFootstepSurface
} from "../data/footsteps.js";

const getAnimationFrame = (player) => {
  const frame = player?.anims?.currentFrame?.textureFrame ?? player?.frame?.name;
  const number = Number(frame);
  return Number.isInteger(number) ? number : null;
};

export class FootstepManager {
  constructor(player, audioManager, tilemap) {
    this.player = player;
    this.audioManager = audioManager;
    this.tilemap = tilemap;
    this.lastContactFrame = null;
    this.lastSurface = null;
    this.lastSfxKey = null;
    this.playedCount = 0;
    this.requestedCount = 0;
    this.status = "idle";
  }

  update(now, ability = { mode: "normal" }) {
    const body = this.player?.body;
    const frame = getAnimationFrame(this.player);
    const grounded = Boolean(body?.enable && (body.blocked?.down || body.touching?.down));
    const locked = now < (this.player?.animationLockedUntil ?? 0)
      || now < (this.player?.controlLockedUntil ?? 0);
    const surface = grounded
      ? resolveFootstepSurface(this.tilemap, this.player.x, body.bottom)
      : null;
    this.lastSurface = surface;

    const contact = isFootstepContact({
      sequence: this.player?.currentVisualSequence,
      frame,
      grounded,
      abilityMode: ability?.mode,
      velocityX: body?.velocity?.x,
      locked
    });

    if (!contact) {
      this.lastContactFrame = null;
      this.status = ability?.mode === "swim"
        ? "swim-suppressed"
        : !grounded
          ? "air-suppressed"
          : locked
            ? "locked-suppressed"
            : "waiting-contact";
      return false;
    }
    if (this.lastContactFrame === frame) {
      this.status = "duplicate-suppressed";
      return false;
    }
    this.lastContactFrame = frame;

    const key = FOOTSTEP_SFX[surface];
    if (!key) {
      this.status = "surface-missing";
      return false;
    }

    this.lastSfxKey = key;
    this.requestedCount += 1;
    const sound = this.audioManager?.playSfx(key, { volume: FOOTSTEP_VOLUME });
    if (sound) {
      this.playedCount += 1;
      this.status = "played";
      return true;
    }
    this.status = "silent-fallback";
    return false;
  }

  getSnapshot() {
    return {
      surface: this.lastSurface,
      sfxKey: this.lastSfxKey,
      playedCount: this.playedCount,
      requestedCount: this.requestedCount,
      status: this.status
    };
  }

  destroy() {
    this.player = null;
    this.audioManager = null;
    this.tilemap = null;
  }
}
