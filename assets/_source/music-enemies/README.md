# 피아노 나라 전용 적

내장 `image_gen`으로 생성한 투명 원화다. 정확한 최초 생성·배치 보정 프롬프트를 `prompts.json`에 보존한다.

- **건반 도깨비** (`piano_imp`): 자두색 그랜드피아노 몸통과 건반, 라벤더 손, 금빛 발. 건반을 내려쳐 두 번 튀는 음표 2개를 시차로 쏜다. 음표는 예고 방향을 유지하며 점프나 날개로 피한다.
- **박자 부엉이** (`metronome_owl`): 호두나무 메트로놈 몸통과 황금 추, 라벤더 날개. 추를 당겨 예고한 다음 짧은 부채꼴 궤도로 바깥을 휩쓸고 돌아온다. 추는 날개로 막을 수 없고 점프로 넘는다.

각 최종 원화는 대기·눈 깜박임·보행 2포즈·예고·공격·회복·패배의 8포즈다.
`piano_imp-poses-v1.png`는 초기 원화, `piano_imp-poses.png`는 셀 여백과 잘린 손을 보정한 최종 원화다.
`metronome_owl-poses.png`는 최종 부엉이 원화다.

`npm run music:enemies`는 알파로 분리한 8개 몸체를 공통 배율·128×128 프레임·112px 발 기준선으로 조립한다.
셀 경계를 넘은 날개를 잘라내지 않도록 연결된 알파 영역을 분리하며, 각 적은 대기 2·보행 4·예고/공격/회복/패배 각 1의 총 10프레임을 사용한다.

공격 표시는 `sampleThemedAttack()`의 동일한 궤적·크기를 사용해 예고하고 충돌을 판정한다.
두 적 모두 1초 이상의 예고, 방향 고정, 회복과 재공격 간격, 화면 밖 공격 취소, 처치·부활·재로드 정리를 적용한다.
쉬움에서는 예고가 길어지고, 도깨비는 느린 음표 1개만 쏘며, 부엉이의 추 범위가 짧아진다. 피아노 나라의 5초 정지 신호 중에는 공격을 취소한다.
원래 감자 두 자리에 배치했으며 쉬움에서는 두 번째 부엉이를 제거한다. 밟기 처치는 각 60점이다.

- 게임 에셋: `assets/enemies/piano_imp/`, `assets/enemies/metronome_owl/`
- 미리보기: `references/music-enemies-preview.png`, `references/music-enemies-review.png`
- 자동 검사: `npm run test:themed-enemies`
- 실제 공격 검사: `/scripts/themed-enemies-runtime.html?visualReview=level-09&section=melody_paths&offset=700&debug=1&mute=1`
