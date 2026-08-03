# 레벨 데이터 스키마

> 2026-08-03 사용자 승인 · Schema version 1  
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
| `schemaVersion` | number | 예 | `1` |
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

### `hazards[]`

- `spike_pumpkin`: `x`, `y`.
- `pit`: `xStart`, `xEnd`, `respawnX`.
- 모든 `respawnX`는 안전한 바닥 위이며 위험 구간 바깥이어야 한다.

### `objectives`

객체 안에 `required`와 `optional` 배열을 둔다. 목표 하나의 공통 필드는 `type`; 선택 목표는 `reward`를 가진다.

```js
const handlers = {
  defeat_boss: (ctx, o) => ctx.defeatedBosses.includes(o.target),
  reach_gate: (ctx) => ctx.gateEntered,
  collect_stars: (ctx, o) => ctx.starCount >= o.count,
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

## 자동 검증

| 검사 | 실패 기준 |
|---|---|
| 필수 필드·타입 | 누락 또는 타입 불일치 |
| id/order | 레지스트리 안에서 중복 |
| world/tilemap | 크기 불일치, tileSize가 64가 아님 |
| 좌표 | world 경계 밖 |
| section | 빈 구간, 겹침, 역방향, world 미포함 |
| boss | 2개 이상, 미정의 key, hp/phases 누락 |
| 체크포인트 | 아래에 충돌 바닥 타일이 없음 |
| pit respawn | pit 안 또는 바닥 없음 |
| 에셋 | manifest에 없는 키, 없는 tilemap 파일 |
| 타입 | 미등록 enemy/item/hazard 타입 |
| objectives | 미등록 handler 타입 |
| 참조 분리 | level 데이터에 `references/` 경로 포함 |

`npm run validate`는 레벨 검증 실패 시 빌드를 중단한다.

## Phase 1 구조 검수

1. 짧은 도형 맵 `level-02.js`와 tilemap을 추가한다.
2. 레지스트리에 2줄만 추가한다.
3. `scenes/`와 `systems/`의 diff가 없는지 확인한다.
4. 스테이지 선택에 자동 표시되고 시작·목표 판정·클리어가 되는지 확인한다.
5. 실패하면 Phase 2 전에 구조를 리팩터링한다.
