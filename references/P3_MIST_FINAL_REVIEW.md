# P3 안개 골짜기 최종 화면 검토

> 상태: 사용자 최종 승인 완료 — 2026-08-26
> 범위: P3 전용 아트·오디오·스테이지 선택 카드 통합
> 코스 승인: 2026-08-26 `P3 코스 승인`
> 앵커 승인: 2026-08-26 `P3 앵커 승인` · 커밋 `2367e9b`
> 제외 범위: 중간 보스는 별도 영상과 승인 전까지 포함하지 않음

## 이번에 반영한 방향

안개 골짜기를 무지개 언덕의 색상 변형이나 별빛 숲의 낮 버전이 아닌 독립된 장소로 만들었다.

- 원경: 옅은 하늘과 깊이별로 겹치는 둥근 산봉우리·세로 계곡 벽
- 중경: 안개 사이로 솟은 암벽 첨탑과 나선형 불빛이 남는 돌 비콘
- 근경: 어두운 암석·청록 이끼·낮은 관목·안개와 굽은 바람 리본
- 충돌 지형: 밝은 이끼 윗면과 어두운 암석 단면을 가진 전용 64px 타일
- 환경 효과: 반복 안개층, 플레이어 주변 걷힘 고리, 고정 비콘, 움직이는 바람·잎 단서
- 오디오: 공포보다 호기심과 길 찾기에 집중한 88 BPM `bgm_mist`
- 선택 카드: 실제 최종 배경 3레이어를 합성한 `stage_preview_mist`

## 최종 검토 화면

| 구간/모드 | 화면 | 확인 결과 |
|---|---|---|
| 소개 | `references/p3-final-intro.png` | 옅은 안개에서 계곡·지형·첫 비콘과 바람 단서가 판독됨 |
| 조합 | `references/p3-final-combination.png` | 62% 짙은 안개에서도 플레이어 주변 시야와 두 진행 단서가 함께 유지됨 |
| 회복 | `references/p3-final-recovery.png` | 안개가 18%로 걷히며 넓은 지면과 게이트 방향이 다시 열림 |
| 화면 효과 약하게 | `references/p3-final-reduced.png` | 조합 구간이 34.1%·350px로 완화되고 핵심 단서가 유지됨 |
| 도형 fallback | `references/p3-final-fallback.png` | 이미지가 없어도 안개 경계·단서 형태·이름과 충돌 지형이 판독됨 |
| 스테이지 선택 | `references/p3-final-stage-select.png` | 3번 카드가 최종 계곡·안개·근경 실루엣을 보여줌 |

합성 배경은 `references/background-mist-preview.png`, 효과 모듈은 `references/mist-effects-preview.png`, 지형 모듈은 `references/mist-tileset-preview.png`에서 확인할 수 있다.

## 최종 저장 경로

### 게임 런타임 에셋

- `assets/backgrounds/bg_mist_far.png`
- `assets/backgrounds/bg_mist_mid.png`
- `assets/backgrounds/bg_mist_near.png`
- `assets/backgrounds/stage_preview_mist.png`
- `assets/tiles/mist_tileset.png`
- `assets/tiles/mist_tileset.json`
- `assets/effects/fx_mist_bank.png`
- `assets/effects/fx_mist_clear.png`
- `assets/effects/fx_mist_beacon.png`
- `assets/effects/fx_mist_breeze.png`
- `assets/audio/bgm/bgm_mist.wav`

### 재현용 생성 원본

- `assets/_source/mist/bg_mist_far_generated.png`
- `assets/_source/mist/bg_mist_mid_generated.png`
- `assets/_source/mist/bg_mist_near_generated.png`

`npm run mist:assets`는 위 생성 원본을 승인 팔레트로 정규화하고 반복 배경·타일셋·효과·선택 카드·검토 이미지를 다시 만든다. `npm run audio`는 결정적 합성 규칙으로 `bgm_mist.wav`를 재생성한다.

## 생성 도구와 후처리

- 도구 모드: Codex 내장 이미지 생성 도구(`imagegen`), 기본 built-in 모드, 로컬 CLI 미사용
- 최종 원경·중경·근경은 승인된 P3 흑백 앵커의 형태와 프로젝트의 둥근 2D 셀 카툰 화풍만 참조했다.
- 중경 생성 원본의 시각적 체크무늬는 `scripts/build-mist-assets.js`에서 배경색으로 판별해 투명도로 변환했다.
- 최종 PNG는 승인 팔레트로 양자화하고 알파 경계를 정리했으며, 2048×720 좌우 반복과 2px 경계 계약을 유지한다.
- 타일셋은 기존 64px·2px extrusion 계약을 유지하면서 `scripts/generate-mist-tiles.js`에서 암석 균열·이끼·안개 점을 결정적으로 생성한다.
- 비콘의 노란빛과 바람의 청록빛은 진행 단서에만 사용하며, 형태와 움직임만으로도 서로 구분된다.

## 최종 프롬프트 세트

### 원경

```text
Use case: stylized-concept
Create a final 2D cel-cartoon FAR background layer for the approved Misty Valley anchor. Use the approved P3 grayscale anchor for composition, and the supplied daytime and Starlight Forest backgrounds only as references for the project's rounded shapes, controlled outlines, and limited value groups. Wide 16:9 pale mist sky with layered rounded mountain silhouettes and tall distant valley spires. Use #D9F3FA, #F4FBFD, #F1F6FA, #A8AA96, #9598A2, and #42474E. Keep the horizontal gameplay corridor quiet and readable. Opaque background. No platforms, foreground rocks, characters, enemies, boss, collectibles, beacons, breeze arrows, UI, text, logo, watermark, photorealism, 3D, painterly texture, or pixel art.
```

### 중경

```text
Use case: stylized-concept
Create a final transparent 2D cel-cartoon MID background layer for the approved Misty Valley anchor. Build separate rounded rock spires and valley walls with fog pockets between them, plus three tall stone beacon towers whose warm spiral lights remain visible above the mist. Follow the selected far layer for depth and the Starlight Forest transparent layer only for clean isolated layout. Use #9598A2, #A8AA96, #42474E, #F4FBFD, #F1F6FA, #FFF6D8, and #F5DF4F. Leave generous transparent sky and a clear gameplay corridor. No ground strip, collision platforms, foreground shrubs, characters, enemies, boss, collectibles, UI, text, logo, watermark, photorealism, 3D, painterly texture, or pixel art.
```

### 근경

```text
Use case: stylized-concept
Create a final transparent 2D cel-cartoon NEAR foreground layer for the approved Misty Valley anchor. Keep all scenery within the bottom 24 percent: dark rounded rocks, pale moss, compact shrubs, low rolling fog banks, and a few curved cyan wind ribbons with small drifting leaf shapes. Use #45494B, #42474E, #CDE5B9, #F4FBFD, #F1F6FA, and #3DBFE3. Frame the route without covering the player or collision surfaces. No sky, tall cliffs, tall beacons, platforms, characters, enemies, boss, collectibles, UI, text, logo, watermark, photorealism, 3D, painterly texture, or pixel art.
```

## 자동·런타임 확인

- 전용 배경·효과의 크기, 투명도, 승인 팔레트, 좌우 반복 경계 검사 통과
- `mist_tileset`의 64px frame 계약, 필수 충돌 프레임, 2px extrusion 검사 통과
- manifest 149키·mapping·실제 런타임 파일·레벨 참조 일치 검사 통과
- SFX 33종·BGM 6종의 파일·디코딩 계약과 `bgm_mist` 연결 검사 통과
- `npm run test`, `npm run build`, 구조·레벨·mapping·asset 검증 통과
- 실제 브라우저에서 소개·조합·회복·효과 감소·fallback·스테이지 선택 화면 확인
- 모든 검토 탭에 처리되지 않은 콘솔 경고·오류 없음

## 사용자 최종 확인 게이트

다음 네 항목을 확인한다.

- 안개 골짜기가 앞선 두 스테이지의 단순 색상 변형이 아닌 독립된 계곡으로 보이는가
- 짙은 조합 안개에서도 플레이어와 발판, 돌 비콘과 바람 리본이 판독되는가
- 효과 감소 모드와 도형 fallback의 정보량이 충분한가
- BGM 방향과 3번 스테이지 선택 카드가 안개 골짜기에 어울리는가

최종 게이트는 2026-08-26 사용자의 `P3 최종 승인`으로 통과했다. P3 변경을 완료 커밋한 뒤 P4 쓰나미 마을 회색 상자로 이동한다.
