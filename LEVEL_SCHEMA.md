# 레벨 데이터 스키마

> Schema version 1 사용자 승인 · 2026-08-03
> Schema version 2 확장 설계·P1 런타임 구현 승인 · 2026-08-25
> 목표: 레벨 파일 1개와 레지스트리 2줄만 추가해 새 스테이지를 선택·플레이할 수 있게 한다.

## 불변 원칙

- `GameScene`은 `levelId`만 받으며 특정 레벨명과 배치를 알지 못한다.
- 보스는 별도 Scene이 아니라 `sections[].type: "boss"`다. `BossScene.js`를 만들지 않는다.
- 지형은 Tiled JSON/TMJ, 오브젝트 배치는 레벨 데이터, 적 행동은 `data/enemies.js`에 둔다.
- 모든 배치 좌표는 픽셀 단위 절대 좌표다. 타일 인덱스와 섞지 않는다.
- 에셋은 `assets`를 재귀적으로 읽어 manifest 키 또는 파일 경로를 동적 로드한다.
- 목표는 `ObjectiveManager` 핸들러 테이블로 판정하고 Scene에서 `if/switch`하지 않는다.

## 파일 위치

```text
src/data/levels/index.js
src/data/levels/level-01.js
src/data/levels/level-02.js
src/data/schema/levelSchema.js
src/data/enemies.js
src/data/items.js
src/systems/LevelLoader.js
src/systems/ObjectiveManager.js
src/systems/ProgressManager.js
assets/levels/level-01/tilemap.json
scripts/validate-levels.js
```

Phase 0의 팔레트는 지시서에 따라 `data/palette.js`에 두며, Phase 1 프로젝트 셸을 만들 때 단일 원천을 유지한 채 `src/data/palette.js`에서 재수출한다.

## 최상위 스키마

| 필드 | 타입 | 필수 | 규칙 |
|---|---|---|---|
| `schemaVersion` | number | 예 | 런타임은 `1`, `2`를 허용하며 신규 확장 레벨은 `2` |
| `id` | string | 예 | kebab-case, 전체 레지스트리에서 고유 |
| `name` | string | 예 | 표시명 |
| `order` | number | 예 | 양의 정수, 전체 고유 |
| `assets` | object | 예 | 동적 로드 정보 |
| `world` | object | 예 | `width`, `height`, `tileSize: 64` |
| `parallax` | object | 예 | `sky`, `far`, `mid`, `near` 계수 |
| `player` | object | 예 | `spawn: {x,y}` |
| `sections` | array | 예 | x축 전체를 빈틈·겹침 없이 덮음 |
| `cameraCues` | array | 아니오 | 위험/목적지 선행 카메라 데이터 |
| `checkpoints` | array | 예 | 시작점 제외 체크포인트 목록 |
| `enemies` | array | 예 | 행동 키+배치만 |
| `items` | array | 예 | 아이템 타입+배치/패턴만 |
| `hazards` | array | 예 | 위험 타입+배치만 |
| `objectives` | object | 예 | `required`, `optional` 배열 |
| `difficulty` | object | 예 | `easyMode` 차분 |

## Schema version 2 확장

P0에서 아래 구조를 승인했고 P1에서 파서·검증기·런타임 연결을 구현했다. 기존 version 1 레벨 원본은 변경하지 않고 정규화 결과만 런타임에 전달한다.

### 최상위 추가 필드

| 필드 | 타입 | version 2 | 규칙 |
|---|---|---|---|
| `progression` | object | 필수 | `direction`은 `right` 또는 `left` |
| `exit` | object | 필수 | 게이트 `x`, 선택 `y`, 플레이어 이동 방향인 `enterFrom` |
| `environment` | object | 필수 | 사용하지 않으면 `{}`. 광역 환경 장치만 포함 |

- `sections[].xStart/xEnd`는 진행 방향과 관계없이 항상 0부터 `world.width`까지 오름차순으로 저장한다.
- `progression.direction: "left"`인 레벨은 `player.spawn.x > exit.x`여야 한다.
- `exit.enterFrom`은 게이트가 놓인 쪽이 아니라 플레이어가 게이트에 들어갈 때의 이동 방향이다. 일반 레벨은 `right`, 역방향 레벨은 `left`다.
- 게이트는 `exit` 좌표를 사용하고, 보스가 없는 레벨도 동일한 규칙으로 생성한다.

### version 1 호환 정규화

`normalizeLevelDefinition()`이 단일 호환 지점이다. version 1 원본 데이터는 고치지 않고 런타임에 전달하기 전에 아래 기본값을 주입한다.

```js
{
  progression: { direction: "right" },
  exit: { x: level.world.width - 180, enterFrom: "right" },
  environment: {}
}
```

- 허용 버전은 `SUPPORTED_LEVEL_SCHEMA_VERSIONS = [1, 2]`로 명시한다.
- `assertLevelShape()`는 원본 버전별 필수 필드를 검사하고, 런타임과 `scripts/validate-levels.js`는 같은 정규화 결과를 사용한다.
- version 2 전용 필드는 version 2 파일에만 요구한다.

### `environment`

모든 하위 필드는 선택이다. 하나의 발판에 붙는 이동·상승기류·붕괴 장치는 계속 지형 데이터가 맡고, 구간 전체와 플레이어 상태에 영향을 주는 장치만 여기에 둔다.

| 필드 | 핵심 데이터 | 규칙 |
|---|---|---|
| `tsunami` | `direction`, `firstWarning`, `telegraph`, `interval`, `speedMultiplier`, `duration`, `shelterGrace`, `damage`, `respawnGrace`, `pauseEnemiesDuringWave` | 진행 방향과 같아야 하며 피해는 HP 단위 |
| `waterZones` | `id`, `xStart`, `xEnd`, `surfaceY`, `bottomY` | 영역은 world 안에 있고 물 바닥은 충돌 지형이어야 함 |
| `breath` | `depleteSeconds`, `refillSeconds`, `damageInterval`, `warningRatio`, `surfaceMargin`, `underwaterPhysics` | `waterZones`가 있을 때 필수 |
| `mist` | `fadeMs`, `defaultVisibilityRadius`, `reducedDensityMultiplier`, `reducedRadiusBonus`, `zones`, `guides` | 각 영역에 `beacon`과 `breeze` 단서를 모두 두고 수치는 승인 범위를 지킴 |
| `lasers` | `switches[]`, `beams[]`와 빔의 `switchId` | 연결 ID는 같은 레벨의 스위치만 참조하고 상태는 레벨 밖으로 전달하지 않음 |

#### `environment.mist`

```js
mist: {
  fadeMs: 700,
  defaultVisibilityRadius: 430,
  reducedDensityMultiplier: 0.55,
  reducedRadiusBonus: 70,
  zones: [
    { id: "mist_intro", label: "소개", xStart: 640, xEnd: 1664, density: 0.26, visibilityRadius: 430 }
  ],
  guides: [
    { id: "beacon_intro", kind: "beacon", x: 1320, y: 340 },
    { id: "breeze_intro", kind: "breeze", x: 1520, y: 410, delay: 160 }
  ]
}
```

- `zones`는 겹치지 않고 world 안에 있어야 하며 `density`는 `0.1~0.72`, `visibilityRadius`는 `240~540` 범위다.
- `reducedDensityMultiplier`는 `0.4~0.8`, `reducedRadiusBonus`는 `40~140` 범위다.
- 모든 안개 영역에는 밝기·형태 단서 `beacon`과 밝기·움직임 단서 `breeze`가 각각 하나 이상 있어야 한다.
- 쉬운 모드의 `mist.densityMultiplier`는 `0.65~1`, `mist.radiusMultiplier`는 `1~1.35` 범위다.

#### `environment.lasers`

```js
lasers: {
  switches: [
    { id: "laser_switch_application", x: 5144, y: 430 }
  ],
  beams: [
    {
      id: "laser_application",
      switchId: "laser_switch_application",
      x: 5304,
      yStart: 284,
      yEnd: 576,
      startDelayMs: 0,
      warningMs: 900,
      activeMs: 1400,
      restMs: 1200
    }
  ]
}
```

- `switches[].id`와 `beams[].id`는 각 목록에서 고유해야 한다.
- 모든 빔의 `switchId`는 같은 레벨의 `switches[].id`를 참조해야 한다.
- 빔의 `yStart < yEnd`이고 좌표는 world 안이어야 하며 `warningMs`, `activeMs`, `restMs`는 양수다.
- 쉬운 모드는 `warningMultiplier 1~1.6`, `activeMultiplier 0.75~1`, `restMultiplier 1~1.8` 범위에서만 주기를 완화한다.
- 궁수 투사체 쉬운 모드는 `speedMultiplier 0.7~1`, `telegraphMultiplier 1~1.5`, `cooldownMultiplier 1~1.5`, `maxActive 1~4` 범위다.

`interval`은 `{ min, max }`, `underwaterPhysics`는 `gravityMultiplier`, `maxFallSpeed`, `horizontalSpeedMultiplier`, `strokeVelocity`, `strokeCooldown`을 가진다. 일반·쉬운 모드 기준값과 허용 clamp는 `STAGE_EXPANSION_PLAN.md` 3·4장을 따른다.

### 확장 예시

```js
export default {
  schemaVersion: 2,
  id: "level-04",
  name: "쓰나미 마을",
  order: 4,
  progression: { direction: "left" },
  player: { spawn: { x: 12000, y: 512 } },
  exit: { x: 180, y: 512, enterFrom: "left" },
  environment: {
    tsunami: {
      direction: "left",
      firstWarning: 6,
      telegraph: 1.5,
      interval: { min: 9, max: 12 },
      speedMultiplier: 1.15,
      duration: 2.5,
      shelterGrace: 0.25,
      damage: 1,
      respawnGrace: 3,
      pauseEnemiesDuringWave: true
    }
  }
};
```

예시는 새 필드의 단위와 방향만 보여준다. 실제 좌표·section·대피처 배치는 P4 회색 상자 승인 뒤 확정한다.

## 확정 예시

```js
export default {
  schemaVersion: 1,
  id: "level-01",
  name: "무지개 언덕",
  order: 1,

  assets: {
    tilemap: "assets/levels/level-01/tilemap.json",
    tileset: "grass_tileset",
    backgrounds: {
      normal: { far: "bg_normal_far", mid: "bg_normal_mid", near: "bg_normal_near" },
      pit:    { far: "bg_pit_far",    mid: "bg_pit_mid",    near: "bg_pit_near" },
      boss:   { far: "bg_boss_far",   mid: "bg_boss_mid",   near: "bg_boss_near" }
    },
    bgm: { field: "bgm_field", boss: "bgm_boss", clear: "bgm_clear" }
  },

  world: { width: 12288, height: 720, tileSize: 64 },
  parallax: { sky: 0.02, far: 0.08, mid: 0.20, near: 0.45 },
  player: { spawn: { x: 128, y: 512 } },

  sections: [
    { id: "tutorial", type: "normal", xStart: 0, xEnd: 2048, mood: "normal" },
    { id: "unicorn", type: "normal", xStart: 2048, xEnd: 4096, mood: "normal" },
    { id: "pegasus", type: "normal", xStart: 4096, xEnd: 7168, mood: "pit" },
    { id: "alicorn", type: "normal", xStart: 7168, xEnd: 9216, mood: "normal" },
    { id: "recovery", type: "normal", xStart: 9216, xEnd: 10240, mood: "normal" },
    {
      id: "boss",
      type: "boss",
      xStart: 10240,
      xEnd: 12288,
      mood: "boss",
      lockCamera: true,
      bgm: "boss",
      boss: { key: "potato_king", hp: 3, phases: ["p1", "p2", "p3"] }
    }
  ],

  cameraCues: [
    { id: "cue_first_hazard", xStart: 1800, xEnd: 2300, lookAhead: 160, targetX: 2360 },
    { id: "cue_long_pit", xStart: 6200, xEnd: 7000, lookAhead: 180, targetX: 7080 }
  ],

  checkpoints: [
    { id: "cp1", x: 3904, y: 512 },
    { id: "cp2", x: 7104, y: 512 },
    { id: "cp3", x: 9984, y: 512 }
  ],

  enemies: [
    { id: "e_intro_potato", type: "raw_potato", x: 1152, y: 512, patrol: 192 },
    { id: "e_cloud_01", type: "dark_cloud", x: 5632, y: 240, triggerX: 5248 },
    { id: "e_magpie_01", type: "magpie", x: 6400, y: 192, triggerX: 6080 }
  ],

  items: [
    { id: "star_intro", type: "star", x: 384, y: 480 },
    { id: "horn_intro", type: "horn", x: 1664, y: 480 },
    { id: "magnet_arc", type: "star_arc", x: 2112, y: 448, count: 9, radius: 144 },
    { id: "wings_intro", type: "wings", x: 4352, y: 480 },
    { id: "alicorn_intro", type: "alicorn", x: 7424, y: 480 }
  ],

  hazards: [
    { id: "pumpkin_intro", type: "spike_pumpkin", x: 2688, y: 512 },
    { id: "pit_short", type: "pit", xStart: 5120, xEnd: 5376, respawnX: 4992 },
    { id: "pit_long", type: "pit", xStart: 6592, xEnd: 7104, respawnX: 6464 }
  ],

  objectives: {
    required: [
      { type: "defeat_boss", target: "potato_king" },
      { type: "reach_gate" }
    ],
    optional: [
      { type: "collect_stars", count: 50, reward: 500 },
      { type: "clear_time", seconds: 420, reward: 300 },
      { type: "no_damage", reward: 1000 }
    ]
  },

  difficulty: {
    easyMode: {
      extraCheckpoints: [{ id: "cp_easy", x: 6080, y: 512 }],
      removeEnemies: ["e_cloud_01"],
      player: { extraHp: 2, flightDrainMultiplier: 0.65 },
      boss: { telegraphMultiplier: 1.35 },
      pitScoreLoss: 0
    }
  }
};
```

예시 좌표는 스키마 형태와 section 연속성을 검토하기 위한 Phase 0 초안이다. 실제 Tiled 바닥과 도달 가능성은 Phase 1 graybox에서 검증 후 데이터만 조정한다.

## 하위 타입

### `assets`

- `tilemap`: 저장소 내부 파일 경로.
- 나머지 문자열 leaf: `assets/manifest.json` 키.
- `AssetManager`는 객체/배열을 재귀 순회하고 중복 키를 한 번만 로드한다.
- 참조 이미지 경로는 절대 포함하지 않는다.

### `sections[]`

공통 필드: `id`, `type`, `xStart`, `xEnd`, `mood`.

- 첫 section `xStart`는 0.
- 마지막 `xEnd`는 `world.width`.
- 앞 section `xEnd`와 다음 `xStart`는 같아야 한다.
- `type: "boss"`는 레벨당 최대 하나이며 `boss.key`, `boss.hp`, `boss.phases`가 필수다.
- `boss.key`는 일반 적 타입과 분리된 `bossDefinitions.js` 레지스트리에 등록되어야 하고, 정의의 `behavior`, phase ID, 필수 애니메이션 역할이 실제 구현과 일치해야 한다. 미등록 키나 phase는 fallback으로 바꾸지 않고 검증 오류로 처리한다.
- 공통 선택 필드는 `completion`, `spawn`, `floorY`, `environment.suspend`다. `completion` 기본값은 `level`, `spawn.x/y`가 없으면 진행 방향과 정의의 `edgeOffset`으로 arena 안쪽 위치를 계산한다. 좌향 레벨은 `xStart + edgeOffset`, 우향 레벨은 `xEnd - edgeOffset`이다.
- `boss.environment.suspend`는 보스전 동안 멈출 환경 시스템 이름 배열이다. 현재 채택 값은 `tsunami`, `mist`, `breath`, `lasers`이며 보스 key를 환경 관리자에 하드코딩하지 않는다.
- 행동별 필드는 각 behavior가 소유한다. 투명 대왕은 `anchors`, `maxAnchorRise`, 물 대왕은 `bossPools`, 랜덤 대왕은 `resultDeck`, `maxNonBattle`, `scoreDelta`, 재진입 안전 시간과 `replayCourses`를 사용한다.
- boss section은 `lockCamera: true`로 arena bounds를 잠그며, 보스가 쓰러진 뒤 공격·투사체·접촉 판정을 정리하고 required `defeat_boss`와 `reach_gate`를 차례로 만족시킨다.
- `mood`는 `assets.backgrounds`에 있는 키여야 한다.

### `cameraCues[]`

- Scene 하드코딩을 피하기 위한 선택 데이터다.
- `xStart`, `xEnd`, `lookAhead`, 선택 `targetX/targetY`를 가진다.
- cue가 끝나면 기본 카메라 설정으로 보간 복귀한다.

### `enemies[]`

- 필수: `id`, `type`, `x`, `y`.
- `type`은 `data/enemies.js`의 행동 정의 키여야 한다.
- `patrol`, `triggerX` 등은 해당 행동 정의가 선언한 파라미터만 허용한다.
- 보스 배치는 `enemies`가 아니라 boss section에서 생성한다.

### `items[]`

- 필수: `id`, `type`, 기준 좌표.
- 단일 타입: `star`, `percent_small`, `percent_large`, `horn`, `wings`, `alicorn`.
- 패턴 타입: `star_arc`는 `count`, `radius`; 향후 패턴은 item handler 하나로 추가한다.

### `secrets[]`

- 선택 배열이며 각 항목은 고유한 `id`, 표시용 `name`, `xStart`, `xEnd`, `yTop`, `yBottom`, 양의 정수 `reward`, `guideItemIds[]`, `rewardItemId`를 가진다.
- 네 좌표는 레벨 월드 안의 유효한 직사각형이어야 한다. 플레이어가 처음 진입할 때만 발견으로 기록하고 같은 세션의 재진입은 점수와 목표 진행을 중복 지급하지 않는다.
- `guideItemIds`는 존재하는 `star` 또는 `star_arc` 아이템을 가리키며, `rewardItemId`는 같은 공간의 `percent_large` 아이템을 가리킨다.
- `find_secrets` 선택 목표의 `count`는 해당 레벨의 `secrets` 수를 넘을 수 없다. 비밀 공간 목표는 `objectives.required`에 두지 않는다.

### `hazards[]`

- `spike_pumpkin`: `x`, `y`.
- `pit`: `xStart`, `xEnd`, `respawnX`.
- 모든 `respawnX`는 안전한 바닥 위이며 위험 구간 바깥이어야 한다.

### `objectives`

객체 안에 `required`와 `optional` 배열을 둔다. 목표 하나의 공통 필드는 `type`; 선택 목표는 `reward`를 가진다.

선택 목표 `type`은 `objectivePresentation.js`의 결과 카드 정의도 가져야 한다. 클리어 화면은 현재 플레이의 `achieved` type과 `objectives.optional`을 교차해 표시하므로, 저장 형식은 기존 문자열 배열을 유지하고 카드 표시를 위해 별도 결과 객체를 저장하지 않는다.

```js
const handlers = {
  defeat_boss: (ctx, o) => ctx.defeatedBosses.includes(o.target),
  reach_gate: (ctx) => ctx.gateEntered,
  collect_stars: (ctx, o) => ctx.starCount >= o.count,
  find_secrets: (ctx, o) => ctx.foundSecrets.length >= o.count,
  clear_time: (ctx, o) => ctx.elapsed <= o.seconds,
  no_damage: (ctx) => ctx.damageTaken === 0
};
```

새 목표 타입은 handler 함수 1개와 해당 타입의 스키마만 추가한다.

## 레지스트리

```js
import level01 from "./level-01.js";
import level02 from "./level-02.js";

export const LEVELS = [level01, level02];
export const getLevel = (id) => LEVELS.find((level) => level.id === id);
export const getNextLevel = (id) => {
  const current = getLevel(id);
  return current ? LEVELS.find((level) => level.order === current.order + 1) ?? null : null;
};
```

레벨 추가는 파일 1개, import 1줄, `LEVELS` 항목 1개만 수정한다.

## 진행도

```json
{
  "level-01": {
    "cleared": true,
    "bestScore": 1240,
    "achieved": ["collect_stars"]
  }
}
```

- 저장 키는 schema version을 포함한다.
- 파싱/쓰기 실패 시 메모리 저장소로 fallback한다.
- 스테이지 선택은 `LEVELS`와 진행도만 조합한다.
- 순차 해금은 `order === 1 || 직전 order 레벨의 progress.cleared`로 계산한다. 새 저장 필드를 추가하지 않고 기존 저장 키와 기록을 유지한다.

## 자동 검증

| 검사 | 실패 기준 |
|---|---|
| 필수 필드·타입 | 누락 또는 타입 불일치 |
| id/order | 레지스트리 안에서 중복 |
| world/tilemap | 크기 불일치, tileSize가 64가 아님 |
| 좌표 | world 경계 밖 |
| section | 빈 구간, 겹침, `xStart > xEnd`, world 미포함 |
| boss | 2개 이상, 미정의 key, hp/phases 누락 |
| 체크포인트 | 아래에 충돌 바닥 타일이 없음 |
| pit respawn | pit 안 또는 바닥 없음 |
| 에셋 | manifest에 없는 키, 없는 tilemap 파일 |
| 타입 | 미등록 enemy/item/hazard 타입 |
| objectives | 미등록 handler 타입 |
| 참조 분리 | level 데이터에 `references/` 경로 포함 |

version 2에서는 아래 검사를 추가한다.

| 검사 | 실패 기준 |
|---|---|
| 진행 방향·출구 | `direction` 미지원, 출구가 world 밖, 좌향 spawn이 exit 왼쪽에 있음, 출구 아래 안전 바닥 없음 |
| 적 활성화·계측 | trigger와 진행 거리 계산이 `progression.direction`을 사용하지 않음 |
| 쓰나미 | 진행 방향 불일치, 대피처 판정 영역·충돌 지형 누락, 체크포인트와 생성 영역 겹침 |
| 물·숨 | `surfaceY`가 world 밖, 회복 통로 없음, 침수 구간 안에 `pit` 존재 |
| 잠수 거리 | 최장 연속 잠수 구간을 승인된 숨 시간과 이동 속도로 통과할 수 없음 |
| 레이저 | `switches` ID 중복, 빔 ID 중복, `switchId`가 같은 레벨 스위치를 참조하지 않음, 주기·범위 오류 |
| 쉬운 모드 | 환경 multiplier가 승인 clamp 범위 밖 |

`npm run validate`는 레벨 검증 실패 시 빌드를 중단한다.

## Phase 1 구조 검수

1. 짧은 도형 맵 `level-02.js`와 tilemap을 추가한다.
2. 레지스트리에 2줄만 추가한다.
3. `scenes/`와 `systems/`의 diff가 없는지 확인한다.
4. 스테이지 선택에 자동 표시되고 시작·목표 판정·클리어가 되는지 확인한다.
5. 실패하면 Phase 2 전에 구조를 리팩터링한다.
