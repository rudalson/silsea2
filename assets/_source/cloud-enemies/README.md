# 구름 코스 전용 적

내장 `image_gen`으로 생성한 투명 원화 각 8포즈다. 최종 생성 프롬프트는 `prompts.json`에 보존한다.

- **재채기 구름양** (`cloud_sheep`): 흰 구름 털, 하늘색 얼굴과 민트 목도리, 금빛 뿔·발굽. 볼을 부풀려 1.4초 예고한 뒤 이동하며 커지는 돌풍을 분다. 돌풍에 맞으면 양에서 멀어지는 방향으로 밀리며, 점프하거나 날개로 막는다.
- **우산 오리** (`umbrella_duck`): 파랑·크림 우산과 라벤더 망토를 두른 오리. 우산을 기울여 1.5초 예고한 다음 고정한 세 줄에 0.3초 간격으로 빗방울을 떨군다. 표시 뒤에 플레이어를 추적하지 않으며 옆걸음으로 비줄기 사이를 피한다. 각 44px 폭 캐릭터가 설 수 있는 틈을 남긴다.

쉬움은 긴 예고·작고 느린 돌풍·느린 빗방울 한 줄이다. 회복·재공격 간격, 화면 밖 취소, 처치·부활·재로드 정리를 적용한다.
우산과 구름 털 실루엣에 맞춰 각각의 몸통 충돌 영역을 설정했다. 기존 감자 두 자리를 교체했으며 쉬움에서는 두 번째 오리를 제거한다. 밟기 처치는 각 60점이다.

원화는 대기·눈 깜박임·보행 2포즈·예고·공격·회복·패배 순서다.
`npm run cloud:enemies`로 연결된 알파 영역을 분리하고 캐릭터별 공통 배율·128px 프레임·112px 발 기준선으로 6상태 10프레임을 조립한다.

- 게임 에셋: `assets/enemies/cloud_sheep/`, `assets/enemies/umbrella_duck/`
- 미리보기: `references/cloud-enemies-preview.png`, `references/cloud-enemies-review.png`
- 자동 검사: `npm run test:themed-enemies`
- 실제 공격 검사: `/scripts/themed-enemies-runtime.html?visualReview=level-11&section=sky_walk&offset=1900&debug=1&mute=1`
