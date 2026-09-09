# G7 최종 게이트·아이템 출시 검수

> 상태: 자동 회귀·고정 브라우저 검수 완료, 사용자 최종 승인 대기
> 기준일: 2026-09-09
> 승인 범위: G0 요구사항부터 G6 전 레벨 통합까지 승인된 동작만 포함

## 최종 구현 결과

- 뿔·날개·알리콘은 기존 원화를 유지하면서 공통 후광·부유·외곽 반짝임·낙하 글리터를 사용한다.
- 실제 게이트는 등장 중 충돌을 받지 않고 `active`가 된 뒤 직접 진입해야만 필수 `reach_gate`와 클리어를 완료한다.
- 실제 게이트는 `level-01`~`level-05` 지상 5곳, `level-06` 공중 1곳이다.
- 공중 게이트는 192×24 고정 발판, 별 안내점 3개, 빛기둥, `cp_relay_finish` 회복 체크포인트와 220px 카메라 큐를 사용한다.
- 장난 게이트는 `level-02/glow_canopy`에 한 번만 배치하며 접근하면 무해하게 사라진다. 실제 게이트·보스·회복·제한 시간 마감 구간에는 남지 않는다.

## 출시 흐름 증거

| 흐름 | 확인 근거 | 결과 |
|---|---|---|
| 시작과 세 변신 아이템 | 실제 6개 레벨의 배치 종류 합집합과 `ITEM_PRESENTATIONS` 연결 검사, G2 브라우저 승인 | 통과 |
| 다섯 보스 / 무보스 목표 | 보스 key와 `defeat_boss`, 모든 레벨의 단일 `reach_gate` 계약 검사 | 통과 |
| 실제 게이트 직접 진입 | G3 실제 충돌로 `GameScene → ClearScene` 전환 승인, 등장 중 충돌 거부·활성 뒤 1회 진입 검사 | 통과 |
| 결과 화면 | `clearReview` 고정 결과 화면과 선택 목표·스티커·다음 스테이지 동작 검사 | 통과 |
| 진행 저장·다음 레벨 해금 | `ProgressManager.complete()` 뒤 다음 순번 해금, 6레벨 뒤 `null` 종료를 `test-final-gate-flow.js`에서 검사 | 통과 |
| 접근성·fallback | 쉬움·효과 약하게·fallback·음소거 공중 게이트, 기존 입력 코드 경로와 무음 진행 검사 | 통과 |

## 최종 브라우저 검수 주소

개발 서버 포트가 다르면 호스트와 포트만 바꾼다.

- 아이템 3종: `/?visualReview=level-01&itemReview=1&mute=1`
- 운영 장난 게이트: `/?visualReview=level-02&section=glow_canopy&offset=400&gateReview=integration&mute=1`
- 실제 지상 게이트: `/?visualReview=level-04&section=boss_hula&offset=1600&gateReview=integration&mute=1`
- 실제 공중 게이트: `/?visualReview=level-06&section=relay_finish&offset=80&gateReview=integration&mute=1`
- 효과 약하게·fallback 공중 게이트: `/?visualReview=level-06&section=relay_finish&offset=80&gateReview=integration&easy=1&effects=reduced&fallback=1&mute=1`
- 결과 화면: `/?clearReview=level-01&character=silsea&elapsed=184.2&score=1720&achieved=collect_stars,no_damage&mute=1`
- 다음 레벨 해금 카드: `/?visualReview=stage-select&stage=level-02&unlock=1&mute=1`

## 자동 검증

```text
npm run test
npm run validate
npm run build
npm run test:soak
npm run test:release
git diff --check
```

`npm run test`에는 여섯 레벨의 `목표 → 실제 게이트 → 진행 저장 → 다음 레벨 해금` 순서를 검증하는 `scripts/test-final-gate-flow.js`가 포함된다.

2026-09-09 브라우저 검수에서는 결과 화면에 기록 184.2초·점수 1720·선택 목표 2개·스티커 3개가 표시됐고, “다음 스테이지 시작” 클릭 뒤 접근성 상태가 `별빛 숲 시작. 실세아 선택됨.`으로 바뀌었다. 이어서 `level-02` 해금 카드와 `level-06` 공중 게이트 `active/stable`, 충돌 zone·발판·체크포인트·카메라 큐를 확인했으며 warning/error는 0건이었다.

## 관찰 결과와 제한

- G3~G6 고정 검수와 사용자 승인 과정에서 실제 게이트 오인 또는 공중 게이트 도달 불가 문제는 보고되지 않았다.
- 고정 검수에서 기능 정지나 도달 불가 문제는 없었지만, 인간 플레이의 20초 정체 기준은 실제 관찰 세션 없이는 판정하지 않는다.
- 실제 게임패드 장치 완주와 `final-child-01`~`final-child-03` 어린이 3명의 여섯 레벨 18개 세션은 수행하지 않았다.
- 프로덕션 빌드는 통과하지만 Phaser 청크 약 1.20MB 때문에 Vite의 500kB 초과 권고가 남는다. 현재 기능·로컬 자산 검증을 막는 오류는 아니며 후속 로딩 최적화 후보로 보존한다.
- 미실시 세션은 [FINAL_PLAYTEST_GUIDE.md](./FINAL_PLAYTEST_GUIDE.md)와 [FINAL_PLAYTEST_OBSERVATION_SHEET.md](./FINAL_PLAYTEST_OBSERVATION_SHEET.md)에 빈 체크박스로 보존한다.
- 두 명 이상에게 같은 오인·정체가 반복됐다는 실제 관찰 자료가 없으므로 G7에서 높이·빛·안내·장난 빈도를 추가 조정하지 않았다.

## 최종 승인 게이트

사용자 승인 전에는 G7 체크박스와 최종 커밋을 완료하지 않는다. 승인 문구:

`G7 최종 승인.`
