# C2 결과 화면 업적 스티커 — 최종 검수

> 상태: 사용자 최종 승인 완료 — 2026-09-07 `C2 최종 승인`
> 작성일: 2026-09-07
> 선행 승인: `C2 규칙 승인`, `C2 배치 승인`, `C2 앵커 승인`

## 최종 결과

| 스티커 | texture key | 조건 | 최종 색상 |
|---|---|---|---|
| 무지개 클리어 | `ui_result_sticker_clear` | 항상 | 노랑·파랑·분홍 아치, 흰 구름 |
| 별 수집가 | `ui_result_sticker_collect` | `collect_stars` | 노란 5각 별 |
| 비밀 탐험가 | `ui_result_sticker_secret` | `find_secrets` | 파란 열쇠구멍 |
| 번개 질주 | `ui_result_sticker_speed` | `clear_time` | 초록 날개, 흰 시계, 분홍 바늘 |
| 완벽한 모험 | `ui_result_sticker_perfect` | `no_damage` | 노란 방패 테두리, 흰 내부, 빨간 하트 |

모든 런타임 파일은 128×128 RGBA PNG이며 모서리가 투명하다. 원형 결과 배지 안에서 64×64로 표시하고, 에셋이 없거나 `fallback=1`이면 같은 슬롯의 코드 도형을 사용한다.

## 생성·후처리

- 생성 방식: OpenAI 내장 `imagegen` 정밀 오브젝트 편집
- 편집 입력: 승인된 `references/could2-sticker-anchor.png`
- 채택 원본: `assets/_source/c2/c2_result_stickers_generated_v1.png` — 최초 결과 1회 채택
- 후처리: `scripts/build-c2-result-stickers.js`
- 처리 내용: 연결된 체크 배경 제거, 기호 5개 자동 분리, 승인 팔레트 양자화, 투명 여백, 128×128 정렬
- 최종 접촉 시트: `references/could2-sticker-final-contact-sheet.png`

### 최종 생성 프롬프트

```text
Use case: precise-object-edit
Asset type: final game UI achievement sticker symbol sheet for a child-friendly 2D platformer
Input images: Image 1 is the user-approved black-and-white silhouette anchor and the edit target
Primary request: Colorize exactly the five approved symbols while preserving their exact left-to-right order, identity, proportions, and chunky rounded silhouettes: rainbow with two clouds; five-point star; keyhole; winged clock; heart shield. Remove only the square panel frames and surrounding sheet background, leaving the five symbols isolated on a genuinely transparent background.
Style/medium: crisp flat 2D cel-cartoon game UI, clean dark outline, no texture
Composition/framing: one horizontal row, five equal invisible cells, one centered symbol per cell, identical scale and generous transparent padding, no overlap
Color palette: use only dark outline #45494B, white #F4FBFD, yellow #F5DF4F, blue #3DBFE3, pink #E573A0, green #51CE87, red #D1333D
Constraints: change only color and background treatment; preserve the approved silhouettes and order; exactly five symbols; no panels, badge backgrounds, text, labels, emoji, gradients, shadows, texture, 3D, mockup, extra decoration, or watermark
```

## 브라우저 검수

- 정상 컬러 최대 5개: `http://127.0.0.1:5173/?clearReview=level-01&achieved=collect_stars,find_secrets,clear_time,no_damage&elapsed=555&score=900`
- reduced+fallback 최대 5개: 위 주소에 `&effects=reduced&fallback=1` 추가
- 음소거: 정상 주소에 `&mute=1` 추가
- 목표 0·1·3·4개 조합에서 기본 1개부터 최대 5개까지 기존 목표 카드와 함께 판독됨
- 실세아·89% 구운 감자를 번갈아 사용해 `level-01`~`level-06` 결과 요약 확인
- 마지막 레벨은 단일 스테이지 선택 버튼을 유지함
- 포인터 다음 스테이지는 다음 GameScene까지, 마지막 단일 복귀 버튼은 결과 화면 밖 다음 장면까지 이동함
- 정상·reduced·fallback·음소거에서 접근성 결과 요약 일치, 브라우저 warning/error 0건

## 자동 검증

- 목표 입력 결정성·중복 제거·알 수 없는 값 제거·최대 5개·입력 불변성
- 고정 슬롯 중복·1280×720 경계·텍스트/카드/버튼 금지 영역 비충돌
- reduced 위치·회전·스케일 정지와 100ms 페이드, 기존 SFX 최대 3회
- 128×128 RGBA, 투명 모서리, 승인 팔레트, 실루엣 크기
- manifest·mapping·Boot preload·정상/fallback 분기
- `npm run test`, `npm run validate`, `npm run build`, `git diff --check`

## 미실시 범위

- 실제 키보드로 Space/Z 다음 단계와 Esc 스테이지 선택 복귀
- 실제 게임패드로 두 복귀 경로 확인
- 어린이 무설명 플레이

자동 브라우저의 순간 키 입력은 `InputManager`의 프레임 단위 `isDown` 폴링을 안정적으로 재현하지 못해 실제 키보드 완료로 기록하지 않았다. 위 항목은 최종 승인으로도 수행 완료 처리하지 않는다.

## 승인 문구

최종 색상·배치·fallback·접근성 결과와 명시된 미실시 범위를 승인하려면 다음 문구를 사용한다.

`C2 최종 승인`

## 승인 기록

- 2026-09-07 사용자 `C2 최종 승인`
- 실제 키보드·게임패드·어린이 무설명 플레이는 수행 완료로 바꾸지 않고 미실시 상태를 유지한다.
