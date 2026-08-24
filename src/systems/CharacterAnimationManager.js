import {
  getCharacterAnimationSpec,
  getCharacterAnimationVariants,
  getCharacterSequenceNames
} from "../data/characterAnimations.js";

export class CharacterAnimationManager {
  static register(scene, character) {
    for (const sequence of getCharacterSequenceNames(character.id)) {
      for (const variant of getCharacterAnimationVariants()) {
        const spec = getCharacterAnimationSpec(character.id, sequence, variant);
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
  }

  static getSpec(character, sequence, variant = "base") {
    return getCharacterAnimationSpec(character.id, sequence, variant);
  }

  static hasSequence(scene, character, sequence) {
    const spec = CharacterAnimationManager.getSpec(character, sequence);
    return Boolean(spec && scene.textures.exists(spec.textureKey));
  }

  static play(sprite, character, sequence, ignoreIfPlaying = true, variant = "base") {
    const spec = CharacterAnimationManager.getSpec(character, sequence, variant);
    if (!spec || !sprite.scene.anims.exists(spec.key)) return null;
    sprite.play(spec.key, ignoreIfPlaying);
    return spec;
  }
}
