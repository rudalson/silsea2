# P14 네 보스 통합 검증 보고서

> 검증일: 2026-09-03
> 상태: 2026-09-03 사용자 `P14 최종 승인` · 중간보스 후속 트랙 종료
> 대상: `level-02` 랜덤 대왕, `level-03` 투명 대왕, `level-04` 훌라후프 대왕, `level-05` 물 대왕

## 결론

네 보스의 데이터·에셋·행동 레지스트리와 프로덕션 번들이 자동 검사를 통과했다. 브라우저 고정 상태 검수에서는 각 보스의 정상 아트, 도형 fallback, 접근성 조합과 격파 뒤 공격 효과 정리를 확인했고 네 보스 모두 콘솔 warning/error가 없었다. 이 검수는 실제 키보드·게임패드 완주나 어린이 플레이테스트를 대신하지 않는다.

## 자동 검사

| 검사 | 결과 | 핵심 수치 |
|---|---|---|
| `npm run spritesheets` | 통과 | 45개 시트, 18개 contact sheet, 유니콘 17개 시트/68프레임, 수영 4×6 |
| `npm run validate` | 통과 | 레벨 5+개발 시험 3, manifest 265, mapping 156, 시각 191, 오디오 74, 런타임 파일 270 |
| `npm run test` | 통과 | P10~P12 회귀, P13 1,000 seed, P14 보스 계측 포함 |
| `npm run test:soak` | 통과 | 216,000프레임, pool 거부 0, Scene 재시작 2,000회, heap delta +0.04MiB |
| `npm run test:release` | 통과 | 프로덕션 로컬 이미지·오디오 270개, 17.43MiB, 외부 URL 0 |

Vite가 Phaser 번들 크기 500kB 초과를 경고하지만 빌드 실패나 런타임 에셋 누락은 아니다. 보스별 Seed 선택, 최대 Object Pool, Scene 재시작 정리는 위 코어·soak·release 게이트에 포함된다.

## 브라우저 상태 검수

| 보스 | 정상 상태 | fallback·접근성 상태 | 격파 뒤 정리 | 콘솔 |
|---|---|---|---|---|
| 훌라후프 대왕 | [약점 화면](./p14-hula-normal.png) | [경고 화면](./p14-hula-fallback.png) | [격파 화면](./p14-hula-defeated.png) | warning/error 0 |
| 투명 대왕 | [기억 화면](./p14-invisible-normal.png) | [오답 공격](./p14-invisible-fallback.png) | [격파 화면](./p14-invisible-defeated.png) | warning/error 0 |
| 물 대왕 | [약점 화면](./p14-water-normal.png) | [출현 경고](./p14-water-fallback.png) | [격파 화면](./p14-water-defeated.png) | warning/error 0 |
| 랜덤 대왕 | [결과 화면](./p14-random-normal.png) | [지상 공격](./p14-random-fallback.png) | [격파 화면](./p14-random-defeated.png) | warning/error 0 |

fallback 검수 조합은 `potato89`, 쉬운 모드, 음소거, 화면 흔들림 Off, 효과 약하게를 함께 사용했다. 훌라후프 보스방의 쓰나미 정지, 물 대왕 보스방의 숨 정지, 약한 효과에서도 투명 대왕의 빛기둥·오답 범위, 랜덤 대왕의 결과 카드와 공격 예고를 고정 상태에서 확인했다. 격파 화면에서는 훌라후프·오답 범위·물방울·랜덤 공격 잔류가 보이지 않았다.

## 플레이테스트 계측

`PlaytestManager` 세션에 다음 값을 추가했다.

- `boss.key`와 phase별 누적 체류시간 `boss.phaseSeconds`
- 유효 타격 `metrics.bossHits`
- 약점이 닫힌 상태에서 시도한 점프 밟기 `metrics.bossFailedHits`
- boss section 안에서 잃은 HP `metrics.bossHpLosses`
- 랜덤 결과·재도전·공격 이벤트와 key를 포함한 격파 이벤트

실패 밟기는 연속 overlap을 한 번의 시도로 세기 위해 250ms 중복 방지를 적용했다. 이전 v1/v2 보고서는 새 필드가 없어도 분석 시 0으로 취급한다.

## 아직 수행하지 않은 항목

- 4개 스테이지 × 일반/쉬움 × 실세아/감자89의 실제 16회 완주
- 키보드와 실제 게임패드 양쪽의 회피·점프 밟기 검증
- fallback·음소거·흔들림 Off·효과 약하게 조합의 시작부터 클리어까지 완주
- 오래된 진행 저장값을 포함한 전체 해금·진입·클리어 실기 회귀
- 어린이 3명의 무설명 플레이와 일반/쉬움 비교
- 보스전 60~90초 목표의 실제 측정

실제 시간 자료가 없으므로 `level-02`~`level-05`의 `clear_time`은 변경하지 않았다. 공통 정체나 난이도 조정 여부도 실제 플레이 자료가 모이기 전에는 판정하지 않는다.

## 최종 게이트

**통과 — 2026-09-03 사용자 `P14 최종 승인`.** 기술 구현·자동 검증·브라우저 고정 상태 검수를 승인 근거로 잠갔다. 위 실기·플레이테스트는 사용자 승인에 따른 미실시 예외로 유지하며 수행 완료로 간주하지 않는다. `test: verify stage midboss expansion` 커밋으로 중간보스 후속 트랙을 닫는다.
