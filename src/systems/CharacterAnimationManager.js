import {
  getCharacterAnimationSpec,
  getCharacterSequenceNames
} from "../data/characterAnimations.js";

export class CharacterAnimationManager {
  static register(scene, character) {
    for (const sequence of getCharacterSequenceNames(character.id)) {
      const spec = getCharacterAnimationSpec(character.id, sequence);
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

  static getSpec(character, sequence) {
    return getCharacterAnimationSpec(character.id, sequence);
  }

  static hasSequence(scene, character, sequence) {
    const spec = CharacterAnimationManager.getSpec(character, sequence);
    return Boolean(spec && scene.textures.exists(spec.textureKey));
  }

  static play(sprite, character, sequence, ignoreIfPlaying = true) {
    const spec = CharacterAnimationManager.getSpec(character, sequence);
    if (!spec || !sprite.scene.anims.exists(spec.key)) return null;
    sprite.play(spec.key, ignoreIfPlaying);
    return spec;
  }
}
