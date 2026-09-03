import { DEFAULT_TUNING } from "./characters.js";

export const DEBUG_TUNING_CONTROLS = Object.freeze([
  Object.freeze({ key: "gravity", label: "중력", min: 800, max: 3000, step: 25 }),
  Object.freeze({ key: "jumpVelocity", label: "점프 초기 속도", min: -1000, max: -300, step: 10 }),
  Object.freeze({ key: "jumpCutMultiplier", label: "Jump Cut", min: 0.2, max: 0.8, step: 0.01 }),
  Object.freeze({ key: "acceleration", label: "가속도", min: 500, max: 5000, step: 50 }),
  Object.freeze({ key: "deceleration", label: "감속도", min: 500, max: 6000, step: 50 }),
  Object.freeze({ key: "maxSpeed", label: "최대 이동 속도", min: 160, max: 640, step: 10 }),
  Object.freeze({ key: "airAcceleration", label: "공중 가속도", min: 500, max: 3000, step: 50 }),
  Object.freeze({ key: "coyoteTime", label: "Coyote Time", min: 0, max: 250, step: 5 }),
  Object.freeze({ key: "jumpBuffer", label: "Jump Buffer", min: 0, max: 250, step: 5 })
]);

const controlKeys = DEBUG_TUNING_CONTROLS.map(({ key }) => key);
const pickTuning = (source) => Object.freeze(Object.fromEntries(
  controlKeys.map((key) => [key, source[key]])
));

const definePreset = (id, name, description, values) => Object.freeze({
  id,
  name,
  description,
  values: pickTuning(values)
});

export const DEBUG_TUNING_PRESETS = Object.freeze([
  definePreset(
    "movement_default",
    "이동 기본",
    "승인된 기본 이동값으로 돌아가 회귀를 확인합니다.",
    DEFAULT_TUNING
  ),
  definePreset(
    "beginner",
    "초보",
    "속도를 낮추고 입력 유예와 공중 보정을 늘려 입문 감각을 비교합니다.",
    {
      ...DEFAULT_TUNING,
      gravity: 1700,
      jumpVelocity: -740,
      jumpCutMultiplier: 0.55,
      acceleration: 2800,
      deceleration: 3600,
      maxSpeed: 320,
      airAcceleration: 1400,
      coyoteTime: 180,
      jumpBuffer: 180
    }
  ),
  definePreset(
    "air_control_review",
    "공중 제어 검수",
    "높은 공중 가속도와 약간 긴 입력 유예로 방향 전환을 집중 검수합니다.",
    {
      ...DEFAULT_TUNING,
      gravity: 1800,
      jumpVelocity: -760,
      jumpCutMultiplier: 0.5,
      airAcceleration: 1900,
      coyoteTime: 150,
      jumpBuffer: 150
    }
  )
]);

const presetById = new Map(DEBUG_TUNING_PRESETS.map((preset) => [preset.id, preset]));
const controlByKey = new Map(DEBUG_TUNING_CONTROLS.map((control) => [control.key, control]));

export const getDebugTuningPreset = (id) => presetById.get(id) ?? null;

export function getDebugTuningPresetChanges(current, presetId) {
  const preset = getDebugTuningPreset(presetId);
  if (!preset) throw new Error(`알 수 없는 디버그 튜닝 preset: ${presetId}`);
  return Object.entries(preset.values)
    .filter(([key, value]) => Number(current[key]) !== Number(value))
    .map(([key, value]) => ({
      key,
      label: controlByKey.get(key)?.label ?? key,
      from: Number(current[key]),
      to: Number(value)
    }));
}

export function applyDebugTuningPreset(target, presetId) {
  const preset = getDebugTuningPreset(presetId);
  if (!preset) throw new Error(`알 수 없는 디버그 튜닝 preset: ${presetId}`);
  Object.assign(target, preset.values);
  return target;
}
