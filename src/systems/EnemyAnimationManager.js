import { getEnemyAnimationSpec, getEnemySequenceNames } from "../data/enemyAnimations.js";

export class EnemyAnimationManager {
  static register(scene, enemyType) {
    for (const sequence of getEnemySequenceNames(enemyType)) {
      const spec = getEnemyAnimationSpec(enemyType, sequence);
      if (!spec || !scene.textures.exists(spec.textureKey) || scene.anims.exists(spec.key)) continue;
      scene.anims.create({
        key: spec.key,
        frames: spec.durations.map((duration, frame) => ({
          key: spec.textureKey,
          frame,
          duration: Math.max(0, duration - 1)
        })),
        frameRate: 1000,
        repeat: spec.repeat
      });
    }
  }

  static getSpec(enemyType, sequence) {
    return getEnemyAnimationSpec(enemyType, sequence);
  }

  static play(sprite, sequence, ignoreIfPlaying = true) {
    const enemyType = sprite.getData("type") ?? sprite.getData("key");
    const spec = EnemyAnimationManager.getSpec(enemyType, sequence);
    if (!spec || !sprite.scene.anims.exists(spec.key)) return null;
    sprite.play(spec.key, ignoreIfPlaying);
    return spec;
  }
}
