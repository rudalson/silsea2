# S2 선택 목표 결과 축하 연출 검수

> 상태: 구현·자동 검사·고정 화면 검수·사용자 승인 완료
> 기준일: 2026-09-03

## 확인할 규칙

- 이번 플레이에 달성한 선택 목표만 레벨 설정 순서대로 나타나는가
- 별·비밀·시간·무피해를 색 없이도 아이콘·이름·조건·체크 표식으로 구분할 수 있는가
- 카드는 최대 3개이며 4개를 달성하면 전체 개수와 추가 달성 사실을 잃지 않는가
- 목표를 달성하지 못한 화면도 벌처럼 보이지 않고 다음 도전을 안내하는가
- 카드 연출이 점수·최고 기록·기존 `achieved` 저장을 다시 변경하지 않는가

## 고정 상태 화면

| 상태 | 화면 | 검수 주소의 핵심 파라미터 |
|---|---|---|
| 4개 달성 최종 화면 | [화면](./should2-objectives-normal.png) | `clearReview=level-01&achieved=collect_stars,find_secrets,clear_time,no_damage` |
| 순차 공개 중간 프레임 | [화면](./should2-objectives-sequence.png) | `clearReview=level-03&achieved=collect_stars,find_secrets,no_damage` |
| 효과 약하게·음소거·fallback | [화면](./should2-objectives-reduced-fallback.png) | `clearReview=level-05&character=potato89&effects=reduced&mute=1&fallback=1` |
| 달성 목표 0개 | [화면](./should2-objectives-empty.png) | `clearReview=level-02&achieved=` |

4개 달성 화면은 `선택 목표 4개 달성 · 대표 3개`로 전체 수를 보존한다. 순차 중간 프레임에서는 첫째·둘째 카드만 보이고 셋째 자리가 아직 비어 있어 260ms 간격 공개가 확인된다. 효과 약하게 상태는 이동·확대 없이 180ms 간격 페이드만 사용한다.

## 데이터·접근성

- `objectivePresentation.js`가 4종의 아이콘·제목·조건 문구를 소유하고 `ClearScene`은 이를 읽기만 한다.
- 클리어 화면 진입 시 숨김 상태 문구에 레벨·캐릭터·기록·점수와 달성 목표 전체의 제목·조건을 한 번에 제공한다.
- 색 테두리는 보조 정보이며 각 카드의 아이콘, 제목, 조건과 `✓ 목표 달성 N/3`가 핵심 상태를 중복 전달한다.
- 기존 `ProgressManager`의 `achieved: string[]` 저장 형식과 합집합 동작은 바꾸지 않았다.

## 자동·브라우저 결과

- `npm run test`: 표시 순서, 최대 3개, 추가 1개, 알 수 없는/중복 type 무시, 0개 상태 통과
- `npm run validate`: 모든 레벨 선택 목표의 결과 카드 정의와 기존 구조·에셋 정합성 통과
- `npm run test:release`: 프로덕션 빌드와 로컬 런타임 에셋 270개 검증 통과
- 네 브라우저 상태 모두 콘솔 warning/error 0건

## 미실시 항목

- 키보드로 `다음 스테이지 시작`과 `스테이지 선택` 재진입
- 실제 게임패드로 두 재진입 경로 확인

## 승인 게이트

2026-09-03 사용자가 `S2 결과연출 승인`으로 카드 순서·문구·260/180ms 간격과 최대 3개 규칙을 승인했다. 키보드·실제 게임패드 재진입은 미실시 상태로 별도 기록하며 S3 이후 회귀 검사에서 다시 확인한다.
