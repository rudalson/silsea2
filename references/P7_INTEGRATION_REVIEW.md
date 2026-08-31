# P7 전체 아트·오디오 통합 검토

> 상태: 사용자 최종 승인 완료 — 2026-08-31 (`P7 최종 승인`)
> 범위: P2~P6 승인본 보존, 공통 연결 보완, 5개 스테이지 정합성·성능·fallback 감사
> 제외: 중간 보스는 별도 영상·규칙 승인 전까지 계속 보류

## 이번 통합에서 마무리한 내용

- P2~P6 승인 에셋은 다시 생성하지 않았다.
- 수집물 후광과 플레이어 접지 그림자를 공통 팔레트의 코드 효과로 연결했다.
- 초상화는 승인된 두 캐릭터의 idle 시트를 재사용하고, 상태·게이지·패널·버튼·접근성 UI는 실제 코드 구현으로 매핑했다.
- 별도 공용 꽃·풀·돌·표지 4종은 현재 스테이지에 필수 배치가 없고 승인 앵커도 없으므로 새로 만들지 않았다. 승인된 스테이지별 전경·타일·장식이 같은 역할을 담당한다.
- `validate:integration`을 추가해 5개 스테이지의 필수 시각 슬롯, 모든 레벨 에셋 키, 필드·보스·클리어 BGM, 런타임 오디오 호출 키, 경고 시각과 SFX 시작 순서, 정상/fallback 진입점을 한 번에 검사한다.
- P6 화살 풀을 60분 등가 부하 검사에 포함했다.

## 스테이지별 대표 화면

각 스테이지는 4장 이상이며, 해당 단계에서 승인된 최종 화면을 재사용했다. 무지개 언덕은 P7 현재 빌드에서 새로 캡처했다.

### 1. 무지개 언덕

| 장면 | 화면 |
|---|---|
| 첫 수집 경로 | [level01-tutorial.png](p7-runtime/level01-tutorial.png) |
| 유니콘 정원 | [level01-unicorn-garden.png](p7-runtime/level01-unicorn-garden.png) |
| 페가수스 협곡 | [level01-ravine.png](p7-runtime/level01-ravine.png) |
| 감자 대왕 | [04-boss.png](runtime-visual-review/04-boss.png) |
| 도형·무음 fallback | [level01-fallback.png](p7-runtime/level01-fallback.png) |

### 2. 별빛 숲

| 장면 | 화면 |
|---|---|
| 시작 | [p2-final-start.png](p2-final-start.png) |
| 중간 | [p2-final-mid.png](p2-final-mid.png) |
| 별나무 종료 | [p2-final-end.png](p2-final-end.png) |
| 클리어 | [p2-final-clear.png](p2-final-clear.png) |
| 스테이지 선택 | [p2-final-stage-select.png](p2-final-stage-select.png) |
| 도형·무음 fallback | [level02-fallback.png](p7-runtime/level02-fallback.png) |

### 3. 안개 골짜기

| 장면 | 화면 |
|---|---|
| 소개 | [p3-final-intro.png](p3-final-intro.png) |
| 짙은 안개 조합 | [p3-final-combination.png](p3-final-combination.png) |
| 회복 | [p3-final-recovery.png](p3-final-recovery.png) |
| 화면 효과 약하게 | [p3-final-reduced.png](p3-final-reduced.png) |
| 도형·무음 fallback | [p3-final-fallback.png](p3-final-fallback.png) |
| 스테이지 선택 | [p3-final-stage-select.png](p3-final-stage-select.png) |

### 4. 쓰나미 마을

| 장면 | 화면 |
|---|---|
| 소개 | [p4-final-intro.jpg](p4-final-intro.jpg) |
| 오른쪽 경고·왼쪽 진행 | [p4-final-warning.jpg](p4-final-warning.jpg) |
| 열린 집 대피 | [p4-final-house.jpg](p4-final-house.jpg) |
| 활성 파도 | [p4-final-active.jpg](p4-final-active.jpg) |
| 도형·무음 fallback | [p4-final-fallback.jpg](p4-final-fallback.jpg) |
| 스테이지 선택 | [p4-final-stage-select.jpg](p4-final-stage-select.jpg) |

### 5. 물에 잠긴 마을

| 장면 | 화면 |
|---|---|
| 진입·수면선 | [p5-final-entry.png](p5-final-entry.png) |
| 짧은 잠수 | [p5-final-short-swim.png](p5-final-short-swim.png) |
| 긴 잠수·유니콘 | [p5-final-long-unicorn-swim.png](p5-final-long-unicorn-swim.png) |
| 수면 회복 | [p5-final-recovery.png](p5-final-recovery.png) |
| 도형·무음 fallback | [p5-final-fallback.png](p5-final-fallback.png) |
| 스테이지 선택 | [p5-final-stage-select.png](p5-final-stage-select.png) |

## 스테이지 선택→플레이→클리어 흐름

[p7-stage-flow-review.mp4](p7-stage-flow-review.mp4)은 별빛 숲의 실제 승인 런타임 화면을 스테이지 선택→시작→중간→종료→클리어 순서로 묶은 12초·1280×720·30fps 검토 영상이다. 화면 전환 순서를 빠르게 검토하는 자료이며 실시간 조작 녹화는 아니다. 실제 연속 조작·완주 영상과 저사양 기기 FPS 기록은 P8 수동 플레이테스트에서 함께 남긴다.

## 오디오 연결과 동기화

| 신호 | 코드 기준 | 결과 |
|---|---|---|
| 필드→보스→필드 | 섹션 변경 프레임에 480ms 크로스페이드 | 통과 |
| 레이저 | 점선 예고 표시와 `sfx_laser_warning` 같은 상태 전환 | 통과 |
| 쓰나미 | `WARNING` 상태·방향 이벤트와 경고음 같은 호출 경로 | 통과 |
| 먹구름 | 색상·애니메이션 예고 뒤 충전음 같은 호출 경로 | 통과 |
| 보스 | 점프·위험색 예고와 보스 경고음 같은 호출 경로 | 통과 |
| 무음 fallback | 오디오 키가 없거나 강제 fallback이어도 예외 없이 진행 | 통과 |

오디오 51개는 전부 로컬 22050Hz mono 16-bit PCM WAV이며, 외부 URL은 없다.

## 에셋 보고서와 접촉 시트

- [전체 HTML 에셋 보고서](asset-report.html): 시각 에셋 144개, 역할 실루엣 80개
- [캐릭터 기본 동작](character-idle-jump-fall-contact-sheet.png), [달리기·구르기](character-run-roll-contact-sheet.png), [수영](character-swim-contact-sheet.png)
- [P2 별빛 숲 앵커](p2-starlight-anchor-contact-sheet.png), [P3 안개 앵커](p3-mist-anchor-contact-sheet.png), [P4 쓰나미 앵커](p4-tsunami-anchor-contact-sheet.png), [P5 침수 앵커](p5-submerged-anchor-contact-sheet.png)
- [P6 공용 전투 최종 시트](p6-final-assets-contact-sheet.png)

## 자동 검증 결과

- `npm run validate`: 레벨·구조·핵심 규칙·매핑·에셋·P7 통합 검사 통과
- manifest 195개(시각 144·오디오 51), mapping 133개(직결 97·그룹 8·코드 24·선택 장식 보류 4), 런타임 파일 200개
- 캐릭터 110프레임·46시트, 적 92프레임·22시트, 타일셋 5개, 배경 18개, 환경 효과 7개 규격·팔레트·알파·seam 검사 통과
- `npm run test` 통과
- `npm run test:soak` 통과: 60분 등가, 모든 풀 거부 0, 재시작 2,000회, GC 뒤 heap +0.04 MiB
- `npm run build`, `npm run validate:runtime` 통과: 로컬 이미지·오디오 15.95 MiB, 외부 URL 0개
- 상세 예산은 [PERFORMANCE_SOAK_REPORT.md](../PERFORMANCE_SOAK_REPORT.md)에 기록했다.

## 사용자 확인 게이트

- 다섯 스테이지가 같은 캐릭터·HUD·선·팔레트 규칙을 공유하는 한 게임으로 보이는가.
- 무지개 언덕의 밝은 녹색, 별빛 숲의 남색, 안개 골짜기의 회청색, 쓰나미 마을의 해안 청록, 물에 잠긴 마을의 수면선만으로 장소가 구분되는가.
- 가시·낙뢰·레이저·안개 단서·쓰나미 방향·숨 게이지가 서로 혼동되지 않는가.
- 새 수집물 후광과 접지 그림자가 캐릭터·아이템 판독을 돕고 과하지 않은가.

2026-08-31 사용자가 **`P7 최종 승인`**이라고 명시했다. P2~P6 승인본, 공통 연결, 에셋·오디오 매핑, 성능 예산과 정상/fallback 경로를 P7 승인본으로 잠근다. 다음 단계는 별도 요청이 있을 때 P8 통합 검증·플레이테스트로 시작한다.
