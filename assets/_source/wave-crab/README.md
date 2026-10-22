# 파도 집게게

스테이지 4 쓰나미 마을의 감자 대신 쓰는 낮고 넓은 게 적입니다. `patrol.png`와 `warning.png`는 built-in image_gen으로 생성한 투명 원화입니다. 쓰나미 마을 미리보기는 팔레트와 동화풍 채색의 참고 이미지이며, 경고 포즈는 같은 게 원화를 편집해 두 집게를 높이 들도록 만들었습니다.

원화 프롬프트 요약: *A single low, wide coral-orange and teal coastal crab, facing left, short legs and two pincers, clean plum outline, fairytale cartoon 2D game sprite on genuine transparency.* 경고 포즈는 원래 얼굴·등껍질·색을 유지하면서 두 집게만 위로 든 상태입니다.

`npm run wave-crab:assets`로 128×128px 프레임의 대기·옆걸음·경고·돌진·회복·퇴장 시트를 재생성합니다. 모든 프레임은 y=112 접지선을 공유합니다. 팔레트 양자화 없이 원화 색과 알파를 유지합니다.
