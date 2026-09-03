# 최종 어린이 플레이테스트 가이드

> 상태: 실행 준비 완료 · 2026-09-03 사용자 미실시 예외 승인 · 향후 재개 가능
> 범위: Phase 1·2·4에 남은 어린이 3명 검증을 현재 다섯 레벨과 다섯 보스 기준으로 한 번에 수행

## 1. 기존 기록과 구분

`test_json/`의 `child-01` 파일은 2026-08-31 P10~P13 보스 통합 전에 수집되어 현재 보스전의 phase·실패 밟기·HP 손실을 포함하지 않는다. 역사 자료로 보존하되 이번 최종 게이트의 완료 세션으로 세지 않는다. 새 기록은 `final-child-01`~`final-child-03` ID를 사용한다.

실명·나이·연락처는 기록하지 않는다. 테스트 ID와 관찰에 필요한 게임 행동만 저장한다.

## 2. 실행과 담당 설정

```bash
npm run dev
```

개발 서버 주소가 `http://localhost:5173`이 아니라면 아래 경로 앞의 호스트와 포트만 바꾼다.

| 테스터 | 캐릭터 | 모드·입력·접근성 | 권장 레벨 순서 |
|---|---|---|---|
| `final-child-01` | 실세아 | 일반·키보드·기본 효과/소리 | 01 → 02 → 03 → 04 → 05 |
| `final-child-02` | 감자89 | 일반·게임패드·흔들림 Off | 03 → 04 → 05 → 01 → 02 |
| `final-child-03` | 실세아 | 쉬움·키보드·효과 약하게·음소거 | 05 → 01 → 02 → 03 → 04 |

아래 주소는 레벨을 바로 시작하고 플레이테스트 기록을 켠다.

| 레벨 / 보스 | `final-child-01` | `final-child-02` | `final-child-03` |
|---|---|---|---|
| `level-01` 감자 대왕 | `?playtest=1&tester=final-child-01&character=silsea&level=level-01` | `?playtest=1&tester=final-child-02&character=potato89&level=level-01&shake=0` | `?playtest=1&tester=final-child-03&character=silsea&level=level-01&easy=1&effects=reduced&mute=1` |
| `level-02` 랜덤 대왕 | `?playtest=1&tester=final-child-01&character=silsea&level=level-02` | `?playtest=1&tester=final-child-02&character=potato89&level=level-02&shake=0` | `?playtest=1&tester=final-child-03&character=silsea&level=level-02&easy=1&effects=reduced&mute=1` |
| `level-03` 투명 대왕 | `?playtest=1&tester=final-child-01&character=silsea&level=level-03` | `?playtest=1&tester=final-child-02&character=potato89&level=level-03&shake=0` | `?playtest=1&tester=final-child-03&character=silsea&level=level-03&easy=1&effects=reduced&mute=1` |
| `level-04` 훌라후프 대왕 | `?playtest=1&tester=final-child-01&character=silsea&level=level-04` | `?playtest=1&tester=final-child-02&character=potato89&level=level-04&shake=0` | `?playtest=1&tester=final-child-03&character=silsea&level=level-04&easy=1&effects=reduced&mute=1` |
| `level-05` 물 대왕 | `?playtest=1&tester=final-child-01&character=silsea&level=level-05` | `?playtest=1&tester=final-child-02&character=potato89&level=level-05&shake=0` | `?playtest=1&tester=final-child-03&character=silsea&level=level-05&easy=1&effects=reduced&mute=1` |

게임패드는 페이지를 연 뒤 아무 버튼이나 한 번 눌러 활성화한다. 테스트 중 입력 방식·캐릭터·난이도·효과 설정을 바꾸지 않는다.

## 3. 관찰 규칙

1. 이동, 점프, 능력, 진행 방향, 환경 기믹과 보스 공략법을 말로 설명하지 않는다.
2. 각 레벨의 처음 3분은 안전 문제가 없는 한 개입하지 않는다.
3. 20초 이상 멈춤, 같은 방향으로 세 번 이상 되돌아감, 같은 보스 공격에서 세 번 이상 실패한 순간만 객관적으로 기록한다.
4. 질문을 받으면 정답 대신 “화면에서 힌트를 찾아볼까?”까지만 말하고 개입 시각과 이유를 적는다.
5. 강제 종료가 필요하면 그대로 닫는다. 5초 이상 진행한 미완주도 다음 실행 때 로컬 기록에 보존된다.
6. 랜덤 대왕에서는 나온 결과 순서와 안전하게 코스로 돌아왔는지, 나머지 보스에서는 예고를 보고 회피·약점 밟기를 이해했는지 적는다.

관찰 메모는 [FINAL_PLAYTEST_OBSERVATION_SHEET.md](./FINAL_PLAYTEST_OBSERVATION_SHEET.md)에 기록한다.

## 4. 저장과 분석

각 완주 뒤 클리어 화면에서 `E` 또는 결과 저장 버튼을 눌러 JSON을 받는다. 15회가 한 브라우저의 최근 24개 보존 범위 안에 들어가므로 중간에 저장소를 지우지 않는다. 여러 장치를 사용했다면 각 장치의 마지막 JSON을 모두 모은다.

```bash
npm run playtest:analyze -- "결과/final-child-01.json" "결과/final-child-02.json" "결과/final-child-03.json"
```

분석기는 레벨별 완주자·전체 시간·HP 손실·공통 정체뿐 아니라 보스 key, 평균 보스전 시간, phase별 평균 시간, 유효 타격, 실패 밟기, 보스방 HP 손실과 랜덤 결과를 출력한다. 기계 판독용 결과는 끝에 `--json`을 붙인다.

## 5. 판정 게이트

- 다섯 레벨 각각 서로 다른 테스트 ID 3명의 완주가 있어야 한다.
- 각 레벨에 일반 2회와 쉬움 1회, 실세아와 감자89, 키보드와 게임패드가 포함되어야 한다.
- 전체 목표는 일반 6~9분, 쉬움 5~8분이다. 각 보스전 phase 합계는 최초 기준 60~90초로 비교하되 판독성과 재미를 우선한다.
- 두 명 이상이 같은 section에서 피격·추락·20초 정체하거나 같은 보스 신호를 반복 오해하면 해당 예고·속도·약점 시간만 조정하고 영향 레벨을 재시험한다.
- 쉬운 모드는 phase나 기믹을 생략하지 않으면서 일반보다 실패 밟기·보스방 HP 손실·정체가 줄어야 한다.
- 흔들림 Off, 효과 약하게, 음소거 상태에서도 방향·위험·약점이 색이나 소리 하나에만 의존하지 않아야 한다.

15개 JSON과 관찰표가 모이기 전에는 실제 플레이테스트 항목을 완료로 표시하지 않는다. 2026-09-03 사용자가 `최종 플레이테스트 미실시 예외 승인`을 명시했으므로 Phase 4 게이트는 승인 종료하되, 미실시 항목은 수행 완료로 바꾸지 않는다. 향후 테스트를 재개하면 이 가이드와 새 JSON을 그대로 사용한다.
