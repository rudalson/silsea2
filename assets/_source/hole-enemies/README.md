# 구멍 코스 전용 적

내장 `image_gen`으로 생성한 투명 원화 각 8포즈다. 정확한 생성 프롬프트는 `prompts.json`에 있다.

- **굴파기 두더지** (`burrow_mole`): 분홍 코와 고글, 라벤더 목수건을 두른 땅파기 전문가. 1.3초 예고한 지점에 짧은 흙기둥을 솟구치게 한다. 플레이어를 다시 추적하지 않고 표시한 위치에서만 분출하며 바닥 지지 여부를 확인한다. 실제 구멍이나 새 낭떠러지를 만들지 않는다.
- **고리돌 골렘** (`ring_golem`): 속이 빈 분홍 사암 몸통과 보라색 고리 손. 1.15초 예고 후 낮게 돌고리를 굴렸다 되돌려 받는다. 왕복 모두 주의해야 하며 점프나 날개로 피한다. 투사체의 빈 중심에는 충돌 판정을 넣지 않는다.

쉬움에서는 예고가 1.35배 길어지고 흙기둥이 낮고 좁아지며 돌고리의 왕복 거리가 짧아진다.
예고 시 방향·원점·목표 지점을 고정하고 회복·재공격 간격, 화면 밖 취소, 처치·부활·재로드 정리를 적용한다.
기존 감자 두 자리에 배치했으며 쉬움은 두 번째 골렘을 제거한다. 밟기 처치는 각 60점이다.

원화는 대기·눈 깜박임·보행 2포즈·예고·공격·회복·패배 순서다. `npm run hole:enemies`로 알파 영역을 분리해 공통 배율·128px 프레임·112px 발 기준선을 유지한 6상태 10프레임을 각각 만든다.

- 게임 에셋: `assets/enemies/burrow_mole/`, `assets/enemies/ring_golem/`
- 미리보기: `references/hole-enemies-preview.png`, `references/hole-enemies-review.png`
- 자동 검사: `npm run test:themed-enemies`
- 실제 공격 검사: `/scripts/themed-enemies-runtime.html?visualReview=level-10&section=bridge_practice&offset=2080&debug=1&mute=1`
