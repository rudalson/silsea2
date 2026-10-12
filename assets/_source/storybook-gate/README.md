# 동화풍 무지개 문

2026-10-12 사용자 요청으로 스테이지 마지막 무지개 문을 현재 풀컬러 동화풍 배경에 맞게 다시 그렸다. 원화 `rainbow-gate.png`는 built-in image_gen으로 만든 투명 PNG이며, 기존 `rainbow_gate.png`는 아치 형태, 무지개 언덕 선택 이미지와 체크포인트 깃발은 색과 채색의 참고 자료로 사용했다.

생성 프롬프트:

> Create a single standalone transparent PNG game asset: a clean symmetrical fairy-tale rainbow archway, front view, unmistakable open hollow center and open bottom. Smooth coral, apricot, yellow, mint, sky blue, lavender bands with cream edging and muted plum outline. Charming hand-painted 2D storybook finish, restrained details, absolutely no ground or background, no text, no bloom. The exterior and hollow passage are truly transparent. Use the attached game gate as silhouette reference and storybook stage art as style reference.

재생성: `npm run storybook:gate`. 이 스크립트는 원화의 알파 경계를 잘라 112×104px 아치로 조정하고 128×128px 투명 프레임 중앙에 놓는다. 통과 공간과 기존 에셋 키, 게이트 충돌 판정은 유지한다. 원화 색과 부드러운 가장자리 알파를 보존하며 팔레트 양자화를 적용하지 않는다.
