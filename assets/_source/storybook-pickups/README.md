# 동화풍 수집물·체크포인트·생감자

2026-09-19 사용자 제공 게임 화면의 풀컬러 배경에 맞춰 built-in image_gen으로 뿔·별·생감자를 생성했다. 2026-09-20에는 같은 방식으로 percent.png, wings.png, checkpoint.png를 추가해 형광색과 과도한 내부 장식을 줄였다. 최초 원화는 prompts.json, 이번 아이템 원화는 item-refresh-prompts.json에 생성 프롬프트를 보관한다. horn.png는 외부 후광을 제거한 최종 원화, potato-defeated.png는 감은 눈과 놀란 입의 별도 표정이다. 모든 원화는 RGBA 투명 배경이다.

재생성: npm run storybook:pickups

Sharp는 알파 바운드 자르기, 크기 조정, 회전·눌림 애니메이션 포즈 조립, 시트 패킹에만 사용한다. 원화 팔레트 양자화·색 치환을 적용하지 않는다. 128px 아이템/프레임과 기존 manifest 키, 대기 2·이동 6·퇴장 4 프레임, 16px 접지 기준선을 유지한다. 퍼센트 토큰은 같은 원화에서 작은 68×68px와 큰 92×92px로 만들며, 날개는 96×62px, 체크포인트는 82×96px 실루엣으로 배치한다. 이동은 얼굴이 읽히는 좌우 흔들림이며 쓰러짐은 별도 표정에 점진적 기울기와 눌림을 적용한다. 외곽 알파·여백·실루엣·프레임 정합성은 npm run validate:assets로 검증한다. references/storybook-potato-animation.png와 references/storybook-item-refresh.png에서 결과를 확인할 수 있다.
