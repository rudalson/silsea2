# 쓰나미 마을 동화풍 배경

2026-09-13 사용자 요청으로 선택 화면 썸네일 `assets/backgrounds/stage_preview_tsunami.png`를 화풍 참조로 삼아 내장 `image_gen`으로 제작했습니다.

- `bg_tsunami_far.png`: 맑은 청록 하늘, 크림색 구름, 먼 등대와 반짝이는 바다.
- `bg_tsunami_mid.png`: 주황·청록 지붕, 둥근 창문, 크림색 벽, 나무·석축·작은 부두가 있는 해안 마을.
- `bg_tsunami_near.png`: 낮은 초록 덤불, 분홍·노랑·파랑 꽃과 해변 돌.

`npm run tsunami:assets`로 런타임 `assets/backgrounds/bg_tsunami_{far,mid,near}.png`와 합성 미리보기를 재생성합니다. 배경 조립은 `scripts/build-tsunami-backgrounds.js`가 담당합니다. 기존 선택 카드, 실제 파도, 대피처, 지형과 판정은 유지합니다.

배경은 2048×720 RGBA로 원화 색상을 보존합니다. 팔레트 양자화·색상 치환·알파 이진화·반대쪽 가장자리 복사는 적용하지 않습니다. 런타임의 좌우 반전 반복을 그대로 사용합니다. 중경은 원본 비율을 유지한 채 폭 2048px, 하단 y=602에 배치하며, 가장자리의 나무가 잘린 것처럼 보이지 않게 좌우 여백을 추가하지 않습니다. 전경은 꽃이 지면 위에 보이도록 1024×160으로 맞춰 y=450에 두 장을 반전 연결합니다.

중경·전경 생성물은 투명 PNG 요청에도 실제 알파 대신 회색 체크무늬를 포함했습니다. 원본을 보관하고, 빌더에서 바깥 가장자리와 연결된 중성색 매트만 제거합니다. 내부 크림색 벽·꽃·돌을 보존하고 리사이즈의 부드러운 경계색을 유지합니다. 원본의 명확한 상단 빈 영역에서 고립된 매트 잔여물도 제거합니다. 실제 알파가 있는 새 원본은 이 과정을 건너뜁니다.

## 최종 생성 프롬프트

### far

Use case: illustration-story. Production parallax scenery for a cheerful children's side-scrolling game, Tsunami Village. Use attached stage-selection illustration as STYLE reference: warm cream cottages, terracotta orange and teal tiled roofs, plump rounded bright green trees, cyan sea, buttery clouds, clean colored outlines, soft polished cel shading. Match its appealing storybook artwork. Single ultra-wide 2048x720 landscape image, ratio 2.84:1. No text, lettering, UI, characters, items, platforms, soil cutaway, floating islands, pixel art, dithering, scratchy grain, posterization or realistic destruction. Upper-left sunlight. Side-on layered panorama, no camera-facing road. OPAQUE FAR BACKGROUND. Spacious rich cyan morning sky occupying the upper 60%, several fluffy large smooth cream clouds. In the bottom 40%, sparkling turquoise bay with simple gentle white horizontal surf lines, pale mint rounded coastal hills and two tiny distant lighthouse silhouettes. Ocean stretches across the width with distant headlands. Friendly, sunny, open and luminous, not gloomy. Quiet large shapes behind gameplay. No large wave or curling wave, no houses in foreground, no large trees or flowers. Left/right edges same sky and sea horizon heights for horizontal scrolling.

### mid

Use case: illustration-story. Production parallax scenery for a cheerful children's side-scrolling game, Tsunami Village. Use attached stage-selection illustration as STYLE reference: warm cream cottages, terracotta orange and teal tiled roofs, plump rounded bright green trees, cyan sea, buttery clouds, clean colored outlines, soft polished cel shading. Match its appealing storybook artwork. Single ultra-wide 2048x720 landscape image, ratio 2.84:1. No text, lettering, UI, characters, items, platforms, soil cutaway, floating islands, pixel art, dithering, scratchy grain, posterization or realistic destruction. Upper-left sunlight. Side-on layered panorama, no camera-facing road. MIDGROUND on actual transparent alpha background. Upper 35% entirely empty transparent space. Three separated clusters of cozy cream seaside cottages with rounded terracotta-orange and teal roofs, round blue windows, wood doors, white daisies in window boxes, short cream stone retaining walls, small round trees and grass hummocks. View buildings from the side, at a slight illustrative angle, no converging path. Buildings form a varied low horizontal coastal village silhouette, with generous transparent open gaps between clusters to show sea from another layer. All structures rooted near bottom edge; tallest roofs no higher than 35% from top. A small wooden jetty in one gap. No sky, no ocean painted behind houses, no large tree canopy across top. True alpha outside silhouettes, NO checkerboard backdrop, NO white matte. Building facades stay opaque cream. No tall towers except one small rounded cottage turret.

### near

Use case: illustration-story. Production parallax scenery for a cheerful children's side-scrolling game, Tsunami Village. Use attached stage-selection illustration as STYLE reference: warm cream cottages, terracotta orange and teal tiled roofs, plump rounded bright green trees, cyan sea, buttery clouds, clean colored outlines, soft polished cel shading. Match its appealing storybook artwork. Single ultra-wide 2048x720 landscape image, ratio 2.84:1. No text, lettering, UI, characters, items, platforms, soil cutaway, floating islands, pixel art, dithering, scratchy grain, posterization or realistic destruction. Upper-left sunlight. Side-on layered panorama, no camera-facing road. NEAR FOREGROUND on actual transparent alpha background. A LOW continuous horizontal border of soft rounded emerald and apple-green coastal shrubs, a few pink/yellow/blue five-petal flowers, smooth warm cream beach pebbles and small tufts of beach grass. All plants in bottom 30%, upper 70% completely empty transparent. Tops of bushes vary gently, no tall tree. Bottom edge filled with foliage across entire width, no transparent gaps at bottom, no soil and no flat platform. Clean charming round silhouettes, soft green outlines, sunny lime highlights. Keep this border sparse and low to frame gameplay. True alpha outside silhouettes, NO checkerboard drawing, NO white matte. No signs, buildings, water waves, shipwrecks, debris, fallen tree trunk or fence.
