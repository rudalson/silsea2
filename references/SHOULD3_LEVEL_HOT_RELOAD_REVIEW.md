# Should S3 레벨 데이터 핫 리로드 검수

> 상태: 사용자 승인 완료
> 검수일: 2026-09-03
> 승인 문구: `S3 핫리로드 승인`

## 검수 주소

```text
http://localhost:4173/?visualReview=level-02&section=star_tree&offset=320&form=alicorn&easy=1&debug=1
```

포트는 개발 서버가 출력한 값에 맞춘다. 화면 오른쪽 디버그 패널의 `레벨 데이터 다시 읽기` 버튼과 바로 아래 상태 문구를 확인한다.

## 확정 동작

1. `src/data/levels/level-02.js`처럼 현재 레벨 모듈을 저장하면 게임은 즉시 바뀌지 않고 `새 데이터 준비됨 · revision N`을 표시한다.
2. 버튼을 누르면 먼저 스키마, 동일 레벨 ID, 양수 월드 크기, 월드 안의 section 범위, 기존과 같은 에셋 키와 로드된 tilemap을 확인한다.
3. 유효한 데이터만 새 런타임으로 교체한다. 플레이어 위치·속도·캐릭터·HP·변신·난이도와 점수·목표·체크포인트·수집/처치/비밀 진행은 유지한다.
4. 잘못된 데이터는 `적용하지 않음 · <원인>`을 표시하고 현재 레벨 객체와 플레이 상태를 그대로 둔다.
5. 에셋 키와 tilemap 변경은 핫 리로드하지 않는다. 이 변경은 전체 레벨 재시작 후 적용한다.
6. 개발 모듈 구독과 제어기는 `GameScene` 종료 때 해제하며, 프로덕션 빌드에는 Vite HMR 런타임을 넣지 않는다.
7. 진행 중인 보스의 부분 HP·phase·공격 순서는 새 보스 정의를 바로 확인할 수 있도록 초기화한다. 이미 격파한 보스와 열린 게이트는 유지한다.

## 확인 결과

| 항목 | 결과 | 근거 |
|---|---|---|
| 실제 파일 변경 감지 | 통과 | 설명 문자열 임시 변경 저장 후 revision 1 준비 상태 확인 |
| 유효 데이터 적용 | 통과 | `x=5312`, `y=448`, 알리콘, 쉬운 모드와 점수 250 유지 |
| 원본 복원 재감지 | 통과 | 임시 설명 변경 원복 후 revision 2 적용 |
| 무효 데이터 격리 | 통과 | `world.width=-1`에서 적용 거부, 현재 x/y/점수 유지 |
| 복구 | 통과 | `world.width=8192` 원복 후 revision 4 적용 |
| 실제 GameScene 연속 재로드 | 통과 | 총 103회 성공, Object Pool `0/0/26`, FX `0/86/380`, console warning/error 0건 |
| 제어기 수명주기 | 통과 | 단위 검사 100회, 오류 시 active state 보존, dispose 뒤 재실행 차단 |
| 프로덕션 격리 | 통과 | 빌드 JS에 `/@vite/client`, `createHotContext` 없음 |

임시 설명과 잘못된 월드 크기 변경은 모두 원복했다. `src/data/levels/level-02.js`에는 검수용 diff가 남아 있지 않다.

## 화면 근거

- `should3-hot-reload-before.png`: 적용 전 플레이 상태
- `should3-hot-reload-ready.png`: 실제 파일 저장을 감지한 준비 상태
- `should3-hot-reload-applied.png`: 유효 데이터 적용과 플레이 상태 보존
- `should3-hot-reload-error.png`: 잘못된 데이터 거부와 기존 실행본 보존
- `should3-hot-reload-100.png`: 추가 100회 적용 뒤 계측과 오류 0건

## 자동 검증

```bash
npm run test
npm run validate
npm run test:release
git diff --check
```

`npm run test`는 제어기의 연속 100회, 실패 보존과 dispose를 확인한다. `npm run validate`는 HMR 경계·상태 UI·GameScene 교체와 종료 정리를 검사한다. `npm run test:release`는 실제 production 번들에 개발용 HMR 코드가 포함되지 않았는지 확인한다.

## 승인 게이트

준비 상태, 명시적 적용, 보존 상태와 오류 격리를 확인해 2026-09-03 `S3 핫리로드 승인`으로 승인했다. 다음 단계는 S4 디버그 패널 preset이다.
