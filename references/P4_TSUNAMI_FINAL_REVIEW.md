# P4 쓰나미 마을 최종 화면 검토

> 상태: 사용자 최종 승인 완료 — 2026-08-27
> 범위: P4 전용 아트·오디오·스테이지 선택 카드 통합
> 코스 승인: `P4 코스 승인` · 커밋 `50b8ecb`
> 앵커 승인: `P4 앵커 승인` · 커밋 `2cc792b`

## 반영 방향

쓰나미 마을을 밝은 해안 풍경으로 유지하되, 빈 마을·바람에 눕는 식생·젖은 석축·오른쪽 경고와 왼쪽으로 이동하는 파도로 재난 진행을 읽게 했다.

- 원경: 왼쪽 언덕 마을과 오른쪽으로 열린 바다, 옅은 해안 하늘
- 중경: 청록 지붕 집과 물에 둘러싸인 석축 섬
- 근경: 왼쪽으로 눕는 관목·난간·젖은 돌과 얕은 물보라
- 충돌 지형: 흰 수선과 젖은 갈색 석축 단면의 전용 64px 타일
- 대피처: 내부가 넓게 열린 집 2종, 돌기반과 바람 식생이 있는 낮은 언덕, 노란 테두리의 높은 지형
- 파도·경고: 8프레임 거품 파도와 왼쪽 화살표+파도 문양 경고
- 오디오: 경고 대역을 비운 112 BPM `bgm_tsunami`, 경고·통과·피격 SFX

## 최종 검토 화면

| 구간/모드 | 화면 | 확인 결과 |
|---|---|---|
| 소개 | `references/p4-final-intro.jpg` | 해안 마을과 낮은 언덕 대피처, 왼쪽 진행 구도가 판독됨 |
| 경고 | `references/p4-final-warning.jpg` | 화면 오른쪽의 왼쪽 화살표·파도 문양과 1.5초 문자가 함께 보임 |
| 열린 집 | `references/p4-final-house.jpg` | 넓은 입구와 어두운 내부가 들어갈 수 있는 대피처로 읽힘 |
| 높은 지형 | `references/p4-final-high.jpg` | 별 수집 동선과 노란 테두리 고지대가 지면 대피와 구분됨 |
| 활성 파도 | `references/p4-final-active.jpg` | 화면 높이 거품 파도가 배경과 플레이어 위에서 판독됨 |
| 피격 | `references/p4-final-hit.jpg` | 플레이어를 통과하는 파도와 HP 1 감소가 같은 화면에 확인됨 |
| 도형 fallback | `references/p4-final-fallback.jpg` | 이미지 없이도 열린 집·안전 판정·방향·남은 시간이 유지됨 |
| 스테이지 선택 | `references/p4-final-stage-select.jpg` | 잠긴 4번 카드에서도 마을·집·파도 실루엣과 이름이 노출됨 |

합성 배경은 `references/background-tsunami-preview.png`, 대피처·파도·경고는 `references/tsunami-effects-preview.png`, 지형은 `references/village-tileset-preview.png`에서 확인한다.

## 저장 경로

### 게임 런타임 에셋

- `assets/backgrounds/bg_tsunami_far.png`
- `assets/backgrounds/bg_tsunami_mid.png`
- `assets/backgrounds/bg_tsunami_near.png`
- `assets/backgrounds/stage_preview_tsunami.png`
- `assets/tiles/village_tileset.png`, `assets/tiles/village_tileset.json`
- `assets/environment/shelter_house_open.png`
- `assets/environment/shelter_house_weathered.png`
- `assets/environment/shelter_hill.png`
- `assets/effects/fx_tsunami_wave.png`
- `assets/effects/fx_tsunami_warning.png`
- `assets/audio/bgm/bgm_tsunami.wav`
- `assets/audio/sfx/sfx_tsunami_warning.wav`
- `assets/audio/sfx/sfx_tsunami_pass.wav`
- `assets/audio/sfx/sfx_tsunami_hit.wav`

### 재현용 생성 원본

- `assets/_source/tsunami/final/bg_tsunami_far_generated.png`
- `assets/_source/tsunami/final/bg_tsunami_mid_generated.png`
- `assets/_source/tsunami/final/bg_tsunami_near_generated.png`
- `assets/_source/tsunami/final/shelter_house_open_generated.png`
- `assets/_source/tsunami/final/shelter_house_weathered_generated.png`
- `assets/_source/tsunami/final/shelter_hill_generated.png`

`npm run tsunami:assets`는 생성 원본을 승인 팔레트로 정규화하고 반복 배경·대피처·파도·경고·선택 카드·타일셋·검토 이미지를 다시 만든다. `npm run audio`는 결정적 합성 규칙으로 P4 오디오를 재생성한다.

## 생성 도구와 후처리

- 도구 모드: Codex 내장 이미지 생성 도구(`imagegen`), 기본 built-in 모드, 로컬 CLI 미사용
- 원경·중경·근경·집·언덕은 승인된 P4 흑백 앵커와 프로젝트의 기존 최종 레이어를 화풍 참조로 사용했다.
- 중경과 낡은 집 원본의 밝은 체크 배경은 `scripts/build-tsunami-assets.js`에서 색 범위로 판별해 투명도로 바꿨다.
- 최종 PNG는 승인 팔레트로 양자화하고 알파 경계를 정리했으며, 2048×720 좌우 반복 계약을 유지한다.
- 타일셋은 기존 64px·2px extrusion 계약을 유지하고 젖은 석축 무늬를 결정적으로 생성한다.
- 파도와 경고는 작은 반복 시트와 코드 애니메이션을 사용해 흔들림을 끈 상태에서도 방향을 판독하게 했다.

## 최종 프롬프트 세트

### 원경

```text
Create a final 2D FAR background for the approved P4 Tsunami Village anchor. Use a bright pale coastal sky, a quiet hillside village on the left, and open sea toward the right. Match the project's cozy hand-painted side-scrolling game style, rounded shapes, clean dark teal linework, restrained texture, and approved pale sky·sage·sea-teal·cream palette. Keep the gameplay corridor quiet. Opaque 16:9 background. No giant wave, shelters, platforms, characters, enemies, collectibles, UI, text, photorealism, 3D, or pixel art.
```

### 중경

```text
Create a transparent MID background layer for the approved P4 Tsunami Village. Arrange separated coastal village clusters with teal-roof cream houses on irregular stone islands, low seawalls, narrow water gaps, and wind-bent trees. Follow the selected far layer for depth and leave generous transparent sky and a clear gameplay corridor. No continuous ground strip, giant wave, characters, UI, or text.
```

### 근경

```text
Create a transparent NEAR layer for the approved P4 Tsunami Village, keeping all scenery within the bottom 22 percent. Use wind-bent coastal shrubs leaning left, broken low railings, wet rounded stones, puddles, and restrained sea spray in the approved teal·sage·cream palette. Do not cover the player or collision surfaces. No sky, tall houses, platforms, wave wall, characters, UI, or text.
```

### 열린 집과 낡은 집

```text
Create one isolated open-front coastal village shelter house. Use a broad readable entrance, dark safe interior, teal sloped tile roof, cream plaster, warm timber frame, and rounded stone foundation matching the approved P4 anchor. Transparent background. No closed door, character, wave, UI, text, or severe destruction.

Precisely edit the supplied open shelter into a restrained weathered variant. Preserve its broad open front, dimensions, camera, palette, and transparent layout. Add a small roof repair patch, subtle plaster cracks, a slightly irregular foundation, and minor timber wear. Keep it safe and usable.
```

### 낮은 언덕

```text
Create one isolated low broad coastal shelter hill, about 2.1:1 width-to-height. Use an irregular stepped silhouette, rounded stone faces at the base, short wind-bent grass and small shrubs leaning left because the tsunami approaches from the right. Keep a flat ground edge, dark teal linework, pale sage grass, sea-teal stones and cream highlights. Transparent tightly cropped asset. No house, character, wave, text, arrow, border, or outside shadow.
```

## 자동·런타임 확인

- `npm run test`, `npm run build`, `npm run validate` 통과
- manifest 163개(시각 120·오디오 43), mapping 115개, 런타임 파일 167개 정합성 검사 통과
- 4개 타일셋의 64px frame·2px extrusion, 배경 크기·팔레트·투명도·좌우 seam 검사 통과
- SFX 36종·BGM 7종의 로컬 WAV·디코딩 계약과 `bgm_tsunami` 연결 검사 통과
- 실제 브라우저에서 소개·경고·집·고지대·활성·피격·fallback·선택 화면 확인
- 언덕 파일 생성 전 새로고침에서 남은 과거 로딩 오류 2건 뒤, 파일 생성 완료 후 검토한 모든 화면에는 새 경고·오류가 없음을 확인함

## 사용자 최종 확인 게이트

- 독립된 밝은 해안 마을로 보이는가
- 낮은 언덕·열린 집·높은 지형이 서로 다른 대피 방법으로 읽히는가
- 오른쪽 경고와 왼쪽 이동 파도, HP 1 피해가 한눈에 이해되는가
- BGM과 4번 선택 카드가 역방향 재난 추격 분위기에 어울리는가

최종 게이트는 2026-08-27 사용자의 `P4 최종 승인`으로 통과했다. P4 최종 통합 변경을 완료 커밋한다.
