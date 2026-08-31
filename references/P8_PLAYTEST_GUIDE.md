# P8 어린이 플레이테스트 가이드

목표는 `level-02` 별빛 숲, `level-03` 안개 골짜기, `level-04` 쓰나미 마을, `level-05` 물에 잠긴 마을을 서로 다른 어린이 3명이 설명 없이 완주하는지 확인하는 것이다. 실명·나이·연락처는 기록하지 않고 `child-01`~`child-03`만 사용한다.

12회 진행 여부와 관찰 메모는 [P8_OBSERVATION_SHEET.md](./P8_OBSERVATION_SHEET.md)에 기록한다.

## 1. 실행

```bash
npm run dev
```

개발 서버가 표시한 주소가 `http://localhost:5173`이라면 아래 표를 그대로 사용한다. 주소가 다르면 호스트와 포트만 바꾼다.

| 테스터 | 입력·설정 | 별빛 숲 | 안개 골짜기 | 쓰나미 마을 | 물에 잠긴 마을 |
|---|---|---|---|---|---|
| child-01 | 일반·키보드 | `?playtest=1&tester=child-01&level=level-02` | `?playtest=1&tester=child-01&level=level-03` | `?playtest=1&tester=child-01&level=level-04` | `?playtest=1&tester=child-01&level=level-05` |
| child-02 | 일반·게임패드·흔들림 Off | `?playtest=1&tester=child-02&level=level-02&shake=0` | `?playtest=1&tester=child-02&level=level-03&shake=0` | `?playtest=1&tester=child-02&level=level-04&shake=0` | `?playtest=1&tester=child-02&level=level-05&shake=0` |
| child-03 | 쉬움·효과 약하게 | `?playtest=1&tester=child-03&level=level-02&easy=1&effects=reduced` | `?playtest=1&tester=child-03&level=level-03&easy=1&effects=reduced` | `?playtest=1&tester=child-03&level=level-04&easy=1&effects=reduced` | `?playtest=1&tester=child-03&level=level-05&easy=1&effects=reduced&mute=1` |

게임패드는 페이지를 연 뒤 아무 버튼이나 한 번 눌러 연결 상태를 확인한다. `child-03`의 마지막 코스는 음소거 상태로 시작해 시각 신호만으로도 진행 가능한지 함께 확인한다.

## 2. 관찰 규칙

1. 조작법·대피처·수면·진행 방향을 말로 설명하지 않는다. 화면에 표시되는 안내만 제공한다.
2. 각 코스의 처음 3분은 위험하지 않은 한 개입하지 않는다.
3. “재미있니?” 대신 멈춘 위치, 되돌아간 횟수, 잘못 이해한 신호를 적는다.
4. 대피처, 수면으로 올라오는 지점, 역방향 전환에서 20초 이상 멈추면 화면 위치와 추정 원인만 기록한다.
5. 강제 종료가 필요하면 그대로 닫는다. 5초 이상 진행한 미완주 세션도 다음 시작 때 로컬 기록에 남는다.

## 3. 결과 저장

각 코스를 완주한 뒤 클리어 화면에서 `E` 또는 결과 저장 버튼을 누른다. 내려받은 파일명은 `silsea-playtest-<level>-<tester>.json` 형식이다. 같은 브라우저에서 계속 테스트하면 파일 안에 최근 24개 세션이 함께 들어가므로 중복 파일이 있어도 괜찮다.

모든 장치의 JSON을 한 폴더에 모은 뒤 다음처럼 분석한다.

```bash
npm run playtest:analyze -- "결과/child-01.json" "결과/child-02.json" "결과/child-03.json"
```

기계 판독용 결과가 필요하면 끝에 `--json`을 붙인다.

## 4. 승인 판정

- 각 레벨의 `고유 테스터`가 3명이어야 한다.
- 각 레벨에 일반과 쉬운 모드 완주가 모두 있어야 한다.
- 일반 6~9분, 쉬움 5~8분 범위와 모드별 평균 HP 손실을 비교한다.
- `2명 이상 공통 조정 후보`가 있으면 해당 구간을 수정하고 영향받은 코스를 다시 테스트한다.
- 쓰나미 마을은 쓰나미 피격과 부활 좌표, 물에 잠긴 마을은 숨 0과 수면 복귀, 투사체 코스는 방어 횟수가 실제 관찰과 맞는지 확인한다.
- 키보드, 게임패드, 흔들림 Off, 효과 약하게, 음소거가 각각 정상이어야 한다.

완료 JSON과 관찰 메모가 모이기 전에는 P8 최종 승인을 기록하거나 완료 커밋을 만들지 않는다.
