# P2 별빛 숲 최종 화면 검토

> 상태: 사용자 최종 승인 완료 — 2026-08-25
> 범위: P2 전용 아트·오디오·스테이지 선택 카드 통합
> 앵커 승인: 2026-08-25 사용자의 “다음 단계 진행”

## 이번에 반영한 방향

별빛 숲을 무지개 언덕의 야간 색상 변형이 아닌 독립된 스테이지로 보이게 만들었다.

- 원경: 짙은 남색 밤하늘, 왼쪽 위 초승달, 성긴 별
- 중경: 화면을 세로로 나누는 길고 둥근 나무줄기와 수관
- 근경: 낮은 관목·뿌리·바위·별꽃
- 충돌 지형: 밝은 달빛 윗면과 짙은 뿌리 단면을 가진 전용 64px 타일
- 종료 랜드마크: 멀리서도 식별되는 큰 별나무
- 보조 장식: 달빛 가지, 반딧불, 별꽃
- 오디오: 밝은 주제를 유지한 부드러운 밤 분위기의 `bgm_starlight`

## 최종 검토 화면

| 구간 | 화면 | 확인 결과 |
|---|---|---|
| 시작 | `references/p2-final-start.png` | 초승달·세로 숲·달빛 지형이 첫 화면부터 판독됨 |
| 중간 | `references/p2-final-mid.png` | 이동·붕괴 발판, 캐릭터, 수집물이 어두운 배경과 분리됨 |
| 종료 | `references/p2-final-end.png` | 큰 별나무가 게이트 방향 랜드마크로 읽힘 |
| 스테이지 선택 | `references/p2-final-stage-select.png` | 별빛 숲 카드가 실제 최종 구도를 보여줌 |
| 클리어 | `references/p2-final-clear.png` | 실제 게이트 충돌 뒤 `실세아 · 별빛 숲` ClearScene으로 전환됨 |

합성 에셋 미리보기는 `references/background-starlight-preview.png`, 지형 모듈은 `references/starlight-tileset-preview.png`에서 확인할 수 있다.

## 최종 저장 경로

### 게임 런타임 에셋

- `assets/backgrounds/bg_starlight_far.png`
- `assets/backgrounds/bg_starlight_mid.png`
- `assets/backgrounds/bg_starlight_near.png`
- `assets/backgrounds/stage_preview_starlight.png`
- `assets/tiles/starlight_tileset.png`
- `assets/tiles/starlight_tileset.json`
- `assets/decorations/decor_star_tree.png`
- `assets/decorations/decor_moon_branch.png`
- `assets/decorations/decor_firefly.png`
- `assets/decorations/decor_star_flower.png`
- `assets/audio/bgm/bgm_starlight.wav`

### 재현용 생성 원본

- `assets/_source/starlight/bg_starlight_far_generated.png`
- `assets/_source/starlight/bg_starlight_mid_generated.png`
- `assets/_source/starlight/bg_starlight_near_generated.png`
- `assets/_source/starlight/starlight_decor_generated.png`

`npm run starlight:assets`는 위 생성 원본을 승인 팔레트로 정규화하고, 반복 배경·타일셋·장식·미리보기를 다시 만든다.

## 생성 도구와 후처리

- 도구 모드: Codex 내장 이미지 생성 도구(`imagegen`), 로컬 CLI 미사용
- 생성 결과가 투명 배경 대신 체크무늬 픽셀을 포함해, `scripts/build-starlight-assets.js`에서 밝은 중성 체크무늬를 제거했다.
- 최종 PNG는 승인 팔레트로 양자화하고 투명도 경계를 이진화해 브라우저 보간 시 다른 색이 섞이지 않게 했다.
- 배경은 2048×720 좌우 반복, 타일은 기존 64px·2px extrusion 계약을 유지한다.
- 타일셋은 승인된 프로젝트 타일 규격을 기반으로 `scripts/generate-starlight-tiles.js`에서 달빛 윗면과 뿌리 결을 결정적으로 생성한다.

## 최종 프롬프트 세트

### 원경

```text
Create a final 2D cel-cartoon platformer FAR background layer for the approved Starlight Forest anchor. Use the supplied approved grayscale anchor for composition and the supplied normal background only as the project's rounded-shape and clean-outline style reference. Wide seamless-looking landscape, dark navy sky #172447, distant forest silhouettes #214D59, a warm crescent moon in the upper left, and sparse small stars. Keep the gameplay corridor quiet and highly readable. No foreground trunks, platforms, characters, enemies, collectibles, UI, text, logo, watermark, photorealism, 3D, painterly texture, or pixel art.
```

### 중경

```text
Create a final 2D cel-cartoon transparent MID background layer for the approved Starlight Forest anchor. Tall vertical rounded tree trunks and cloud-like canopies should divide the screen rhythmically while leaving a clear horizontal gameplay corridor. Use only #193A3E, #214D59, #285144, and #45494B with bold simple silhouettes and restrained two-tone shading. No sky, moon, stars, ground, platforms, foreground bushes, characters, enemies, collectibles, UI, text, logo, watermark, photorealism, 3D, painterly texture, or pixel art.
```

### 근경

```text
Create a final 2D cel-cartoon transparent NEAR foreground layer for the approved Starlight Forest anchor. Keep all vegetation within the bottom 28 percent: rounded bushes, dark roots, small rocks, and a few star-shaped flowers. Use #285144, #193A3E, #45494B, #DCEB85, and #F5DF4F. The result must frame the route without covering the player or collision surfaces. No sky, tall trees, platforms, characters, enemies, collectibles, UI, text, logo, watermark, photorealism, 3D, painterly texture, or pixel art.
```

### 장식 시트

```text
Create a transparent 2x2 sprite decoration sheet for the approved Starlight Forest stage in the project's rounded 2D cel-cartoon style. Top left: monumental star-shaped tree landmark with a dark trunk and pale yellow-green glowing crown. Top right: crescent-moon branch decoration. Bottom left: a small readable firefly cluster. Bottom right: a compact star-flower cluster. Isolate every decoration with generous spacing and complete uncropped silhouettes. Use only #172447, #193A3E, #214D59, #285144, #45494B, #FFF6D8, #DCEB85, #F5DF4F, and #3DBFE3. No scene background, terrain strip, characters, enemies, UI, text, labels, logo, watermark, photorealism, 3D, painterly texture, or pixel art.
```

## 자동·런타임 확인

- 전용 배경·장식의 크기, 투명도, 승인 팔레트 검사 통과
- 두 타일셋의 64px frame 계약, 충돌 프레임, 2px extrusion, 반복 경계 검사 통과
- manifest·mapping·실제 런타임 파일 일치 검사 통과
- Chrome 런타임에서 `level-02`, `starlight_tileset`, `bgm_starlight`, 장식 배치 6개와 필수 텍스처 로드를 확인
- Vite 오류 오버레이와 페이지 오류 없음

## 사용자 최종 확인 게이트

다음 세 항목을 확인한다.

- 별빛 숲이 무지개 언덕의 단순 색상 변형이 아닌 독립된 장소로 보이는가
- 밤 배경에서도 캐릭터, 발판 윗면, 수집물과 위험물이 선명한가
- 종료 지점의 큰 별나무와 스테이지 선택 카드가 적절한가

최종 게이트는 2026-08-25 사용자의 `P2 최종 승인`으로 통과했다. P2 변경을 커밋한 뒤 P3 안개 골짜기 회색 상자로 이동한다.
