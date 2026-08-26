# P3 안개 골짜기 흑백 아트 앵커 검토

> 상태: 2026-08-26 사용자 승인 완료
> 범위: P3 최종 컬러 에셋 제작 전 배경·지형·안개 효과·길 찾기 단서의 형태 승인
> 주의: 아래 이미지는 방향을 잠그기 위한 흑백 콘셉트다. 게임 에셋·manifest에 등록하지 않았으며 중간 보스와 최종 BGM을 포함하지 않는다.

## 확인할 방향

안개 골짜기는 기존 무지개 언덕의 색상 변형이나 별빛 숲의 낮 버전이 아니라 다음 실루엣으로 구분한다.

1. 원경: 깊이별로 겹치는 둥근 산봉우리와 세로로 긴 계곡 벽
2. 플레이 지형: 윗면이 선명한 넓은 암석 지면과 작은 부유 암석 발판
3. 안개: 지면 아래와 계곡 사이를 낮게 흐르되 충돌 윗면을 덮지 않는 반복 안개층
4. 고정 단서: 안개 위로 솟고 나선형 불빛이 남는 돌 비콘
5. 이동 단서: 굽은 바람 리본과 반복되는 잎 모양 움직임
6. 회복 구간: 오른쪽 끝에서 안개와 산 밀도가 낮아지고 길이 넓어지는 밝은 개방부

승인된 소개→연습→응용→조합→회복의 농도 변화는 런타임 안개 레이어가 담당한다. 배경 그림 자체는 길을 가리거나 거짓 발판처럼 보이지 않게 하고, 실제 충돌 지형은 배경보다 더 어둡고 외곽선을 선명하게 유지한다.

## 검토 이미지

- 전체 흑백 앵커: `references/p3-mist-anchor-contact-sheet.png`
- 25% 축소 확인: `references/p3-mist-anchor-preview-25.png`
- 25% 이진 실루엣: `references/p3-mist-anchor-silhouette-25.png`
- 승인된 회색 상자 비교: `references/p3-graybox-intro.png`, `references/p3-graybox-combination.png`, `references/p3-graybox-recovery.png`

전체 앵커의 위쪽은 왼쪽에서 오른쪽으로 이어지는 플레이 파노라마다. 아래쪽은 넓은 암석 지면, 소형 발판, 반복 안개층, 안개 걷힘 고리, 돌 비콘, 바람 리본 모듈이다. 25% 축소와 이진 시트에서도 계곡 벽·충돌 지형·비콘은 독립된 덩어리로 읽히며, 바람 리본은 선과 잎의 반복으로 비콘과 구분된다.

## 최종 컬러 적용안

새 HEX를 추가하지 않고 `data/palette.js`에서 이미 승인된 색만 사용한다.

| 역할 | 제안 팔레트 |
|---|---|
| 안개 낀 하늘 | `#D9F3FA` |
| 먼 산과 옅은 계곡 벽 | `#A8AA96` |
| 중경 암벽 | `#9598A2` |
| 근경·충돌 암석 | `#45494B` |
| 환경 외곽선 | `#42474E` |
| 안개 기본/그림자 | `#F4FBFD`, `#F1F6FA` |
| 발판 위 이끼 보조색 | `#CDE5B9` |
| 비콘 중심/후광 | `#FFF6D8`, `#F5DF4F` |
| 바람 리본 | `#3DBFE3` |

비콘의 노란빛과 바람의 청록빛은 진행 단서에만 사용한다. 두 단서는 색을 제거해도 높이·형태·움직임이 달라야 하며, 수집물과 겹쳐 보이지 않도록 별 모양을 사용하지 않는다.

## 생성 기록

- 생성 방식: Codex 내장 이미지 생성 도구(기본 built-in 모드)
- 생성 원본 보관: `assets/_source/mist/p3_mist_anchor_generated.png`
- 참조 입력: `references/p3-graybox-intro.png`, `references/p3-graybox-combination.png`, `references/p3-graybox-recovery.png`, `references/p2-starlight-anchor-contact-sheet.png`, `references/background-normal-preview.png`
- 참조 역할: P3 화면 3장은 코스 높이·안개 진행 구조, P2 앵커와 기존 배경은 접촉 시트 구성·둥근 외곽선·명암 가독성만 참고
- 후처리: 생성 원본은 변경하지 않고 `scripts/build-p3-anchor-review.js`로 완전한 회색조 접촉 시트, 25% 축소본, 명암 기준 이진 실루엣 검토본 생성
- 최종 입력 프롬프트:

```text
Use case: stylized-concept
Asset type: grayscale game environment concept anchor contact sheet for an original child-friendly 2D side-scrolling platformer stage
Primary request: Design the visual language for “Misty Valley” while preserving the approved graybox course readability. The stage should feel like a distinct high valley filled with rolling fog, not a recolor of the rainbow hills and not the moonlit forest.
Input images: Images 1–3 are layout and visibility-structure references only; ignore and do not reproduce their character, enemies, stars, rainbow gate, HUD, labels, colors, or existing rainbow-hill scenery. Image 4 is a contact-sheet layout and grayscale readability reference only. Image 5 is a style reference only for rounded cel-cartoon shapes, bold readable outlines, limited value groups, and child-friendly clarity; do not copy its composition.
Scene/backdrop: layered distant mountain silhouettes and rounded steep valley walls, winding ravine path, low drifting fog banks, a few tall beacon landmarks visible above fog, and a visibly calmer opening at the recovery endpoint
Subject: one continuous gameplay environment panorama plus isolated reusable environment modules
Style/medium: clean grayscale 2D cel-cartoon game concept art, bold controlled outlines, restrained two-to-three-tone shading, simple rounded shapes, production-oriented rather than painterly
Composition/framing: landscape 3:2 contact sheet. Upper roughly 70 percent: one continuous wide 16:9 side-scrolling gameplay panorama with a clear horizontal traversal corridor. Read from left to right as open introduction, progressively denser and more layered fog through practice/application/combination, then a visibly open recovery area at the far right. Use rock ledges, short elevated platforms, and valley-wall silhouettes consistent with a platforming course, without showing literal UI overlays. Keep beacons tall and readable above the fog; show wind direction through curved drifting breeze ribbons or repeated leaf-like motion marks, not through text or UI arrows. Lower roughly 30 percent: an orderly strip of six isolated reusable modules on a plain light-gray background—broad rocky ground ledge, small elevated stone platform, soft repeating fog bank, circular mist-clearing halo, tall beacon landmark, and curved breeze-ribbon cue. Give every module generous separation.
Lighting/mood: mysterious but safe and inviting, soft diffused light, never horror
Color palette: strict grayscale only with clear value separation between far background, fog, and collision surfaces
Constraints: silhouettes must remain readable at 25 percent scale; collision surfaces must be darker and crisper than background fog; both beacon and breeze cue must remain recognizable without color; no characters; no animals; no enemies; no boss; no collectibles; no stars; no moon; no rainbow; no gates; no buildings; no UI; no HUD; no text; no labels; no logos; no watermark; no photorealism; no 3D; no pixel art; no painterly texture; do not copy supplied compositions
```

## 승인 기록

- 2026-08-26 사용자가 `P3 앵커 승인`으로 계곡·암석 지형·안개·비콘·바람 단서와 컬러 적용 방향을 승인했다.
- 최종 배경 3레이어·64px 타일셋·안개 효과·BGM·선택 카드 제작과 게임 연결을 진행한다.
- 중간 보스는 별도 영상과 승인 전까지 포함하지 않는다.
