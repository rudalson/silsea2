# S1 비밀 공간 회색 상자 검수

> 상태: 구현·자동 검사·고정 화면 검수·사용자 승인 완료
> 기준일: 2026-09-03

## 확인할 규칙

- 별 궤적이 필수 진행로가 아닌 상단·우회 공간으로 이어지는가
- 구역 진입 시 이름, 발견 보너스 `+200`, `1/1` 진행이 명확한가
- 대형 퍼센트가 공간 안의 물리 보상으로 보이는가
- 같은 공간을 다시 지나도 발견 점수가 중복 지급되지 않는가
- 비밀 공간을 찾지 않아도 보스와 게이트를 완료할 수 있는가

## 고정 상태 화면

| 레벨 | 화면 | 검수 주소의 핵심 파라미터 |
|---|---|---|
| `level-01` 회복길 하늘 정원 | [화면](./should1-secret-level01.png) | `visualReview=level-01&section=recovery&secret=secret_sky_garden&debug=1` |
| `level-02` 별나무 꼭대기 | [화면](./should1-secret-level02.png) | `visualReview=level-02&section=star_tree&secret=secret_star_tree_crown&debug=1` |
| `level-03` 안개 속 등불길 | [화면](./should1-secret-level03.png) | `visualReview=level-03&section=mist_application&secret=secret_mist_lantern&effects=reduced&debug=1` |
| `level-04` 파도 위 지붕 전망대 | [화면](./should1-secret-level04.png) | `visualReview=level-04&section=tsunami_high&secret=secret_tsunami_rooftop&debug=1` |
| `level-05` 잠긴 마을 종탑 | [화면](./should1-secret-level05.png) | `visualReview=level-05&section=submerged_recovery&secret=secret_sunken_tower&debug=1` |

청록 사각형과 `SECRET` 라벨은 `debug=1`에서만 보인다. 정상 플레이에서는 별과 대형 퍼센트만 단서로 남는다. 다섯 화면 모두 `find_secrets` 완료와 콘솔 warning/error 0건을 확인했다.
대표 화면에서는 대형 퍼센트를 동시에 얻어도 비밀 공간 이름·`+200`·`1/1` 토스트가 먼저 유지되는 것도 확인했다.

## 자동 결과

- `npm run test`: 구역 밖 미발견, 최초 1회 200점, 재진입 중복 방지, `find_secrets` 완료 통과
- `npm run validate`: 다섯 레벨의 구역 범위·고유 ID·별 단서·대형 퍼센트·목표 count 통과
- `npm run test:release`: 프로덕션 빌드와 로컬 런타임 에셋 270개 검증 통과
- `fallback=1`: 신규 전용 에셋 없이 기존 도형 fallback 경로 사용

브라우저 검수 중 `level-01` 생성자가 정의되지 않은 `scene`을 참조하는 기존 감자 대왕 회귀를 발견해 `this.scene`으로 수정했다. 수정 뒤 레벨 1과 다섯 비밀 공간 화면에서 오류가 재발하지 않았다.

## 승인 게이트

2026-09-03 사용자가 `S1 비밀공간 승인`으로 배치·200점 보너스·발견 문구를 승인했다. 키보드·게임패드 실제 진입 검사는 미실시 상태로 별도 기록하며, S2 결과 연출 단계에서 회귀 여부를 다시 확인한다.
