import { PotatoKingBehavior } from "./PotatoKingBehavior.js";
import { TrainingDummyBehavior } from "./TrainingDummyBehavior.js";
import { HulaKingBehavior } from "./HulaKingBehavior.js";
import { InvisibleKingBehavior } from "./InvisibleKingBehavior.js";
import { WaterKingBehavior } from "./WaterKingBehavior.js";
import { RandomKingBehavior } from "./RandomKingBehavior.js";
import { BOSS_BEHAVIOR_TYPES } from "../../data/bossBehaviorTypes.js";

const BOSS_BEHAVIORS = Object.freeze({
  potato_king: PotatoKingBehavior,
  training_dummy: TrainingDummyBehavior,
  hula_king: HulaKingBehavior,
  invisible_king: InvisibleKingBehavior,
  water_king: WaterKingBehavior,
  random_king: RandomKingBehavior
});

export { BOSS_BEHAVIOR_TYPES };

for (const key of BOSS_BEHAVIOR_TYPES) {
  if (!BOSS_BEHAVIORS[key]) throw new Error(`보스 행동 구현이 없습니다: ${key}`);
}

export const createBossBehavior = (key, context) => {
  const Behavior = BOSS_BEHAVIORS[key];
  if (!Behavior) throw new Error(`등록되지 않은 보스 행동입니다: ${key}`);
  return new Behavior(context);
};
