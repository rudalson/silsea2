# 테이프 도시 필드 적 원화

내장 `image_gen`으로 새로 생성한 투명 PNG 원화다. 금빛 테이프 고리와
크림색 건물·청록 지붕이 있는 테이프 도시 배경에 맞춰 디자인했다.
정확한 생성 프롬프트는 `prompts.json`에 보존한다.

- `rollbug-poses.png`: **테이프 말이**. 종이 심이 보이는 금빛 테이프 몸통, 민트색 손발과 짧은 테이프 꼬리.
- `boxling-poses.png`: **박스 꼬마**. 금빛 테이프로 포장한 크림색 상자, 라벤더색 손발과 청록색 모서리.

각 원화는 대기·눈 깜박임·좌우 보행·어지러움·주저앉기 6포즈다.
`npm run tape:enemies`로 각 적의 대기 2·보행 4·패배 2프레임을 조립한다.
투명 여백을 탐색해 셀을 나누고, 캐릭터별 공통 배율과 128×128 프레임,
발 기준선 112px를 지킨다. 원화 알파를 보존하고 포즈를 늘이거나 회전하지 않는다.
크롭 범위·배율·포즈 순서는 `frames.json`에 기록한다.

테이프 말이는 첫 감자 적 자리, 박스 꼬마는 두 번째 감자 적 자리에 배치했다.
기존 순찰 위치·범위·속도·접촉 피해·밟기 처치·40점과 쉬움의 두 번째 적 제거 규칙을 유지한다.
고유 실루엣에 맞는 몸통 충돌 영역과 오른쪽을 향한 원화 방향을 설정했다.

- 게임 시트/프레임: `assets/enemies/tape_rollbug/`, `assets/enemies/tape_boxling/`
- 캐릭터 미리보기: `references/tape-enemies-preview.png`
- 전체 프레임 검토: `references/tape-enemies-review.png`
- 자동 검사: `npm run test:tape`
- 실제 플레이 검사: `/scripts/tape-runtime.html?visualReview=level-08&debug=1&mute=1`
