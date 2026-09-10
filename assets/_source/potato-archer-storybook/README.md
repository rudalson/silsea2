# 감자 궁수 동화풍 원본

- 생성: 내장 image_gen 도구, 2026-09-10.
- idle.png를 캐릭터 기준으로 사용해 aim/shoot/defeated 자세를 개별 편집했습니다.
- 둥근 황금색 감자, 큰 갈색 눈, 분홍 볼, 초록 잎 모자와 나무 활을 통일했습니다.
- 생성된 idle의 실제 알파는 보존합니다. 나머지 원본의 불투명 회색 체크 배경은 빌드에서 연결 영역을 판별해 제거합니다. 흰 눈과 하이라이트는 보존합니다.
- 재생성: `npm run archer:assets`. `npm run p6:assets`도 같은 빌더를 호출합니다.
- 출력: `assets/enemies/potato_archer/`의 128×128 프레임 12개 및 시트 4개. 미리보기: `references/potato-archer-storybook-preview.png`.
- 기존 발사 자세의 고정 atlas crop이 몸 왼쪽을 잘랐으므로, 자세별 전체 실루엣 경계로 정규화하고 좌우 최소 8px, 발 아래 16px의 여백을 확보합니다.
- 프레임 수, 애니메이션 키/타이밍, 충돌 영역과 화살 동작은 기존 값을 사용합니다.

## 최종 프롬프트

### idle.png

Create a single isolated adorable potato archer GAME SPRITE as a PNG WITH GENUINE ALPHA TRANSPARENCY. No background pixels, no checkerboard pattern, no gray squares, no backdrop or scenery. Subject: round chubby golden honey-tan potato, subtle freckles, tiny stubby feet, tiny arms, big shiny dark brown eyes looking RIGHT, rosy peach cheeks, small smile, a fresh mint-green leaf worn like a tilted beret, holding a small curved brown wooden bow upright on its RIGHT. Idle ready pose, 3/4 side view facing RIGHT. Charming young children's storybook style, clean dark-brown outlines, soft cel shading, clear simple shapes readable at 96 pixels tall. Complete rounded LEFT body outline must be fully visible and smoothly curved, no cropping anywhere. Character centered in a square transparent canvas, generous empty transparent margin at least 15% on EVERY side, includes entire leaf, feet, hands, bow. No arrows in this idle pose, no effects, no ground shadow, no text, logos, labels, frame. ONE character only, NOT a sprite sheet. Actual transparent alpha PNG, as a clean game cutout.

### aim.png

Edit this exact transparent potato archer sprite into its AIM pose. Preserve exact character identity, honey-gold potato shape, large friendly eyes, rosy cheeks, oversized green leaf beret, feet, style, colors, scale, facing RIGHT and body position. Change only arms, bow string and facial concentration: hold wooden bow on the RIGHT, pull bowstring back toward mouth with other hand, a small cartoon arrow nocked horizontally pointing RIGHT with rounded pale tip. Cute focused expression, no anger, both eyes remain big and friendly. Keep entire potato LEFT contour round and visible. Character, bow and arrow fully within canvas, leave at least 12% transparent margin all around. Do not crop arrow tip. Actual PNG alpha transparency MUST be preserved, no painted checkerboard or solid background, no scenery, floor shadow, text, effects, frame or watermark. Single isolated character, same canvas dimensions.

### shoot.png

Edit this exact cute potato archer into the SHOOT / RELEASE key pose. Preserve character identity, proportions, leaf beret, warm golden potato, freckles, rosy cheeks, eyes, shading and facing RIGHT. Bow on the RIGHT, string has just been released and is straight between the two tips, free hand drawn back near cheek with open little fingers, happy focused small open smile. No arrow remaining on the string, no flying projectile or detached effects (game provides projectile). Full rounded left body contour, leaf, feet, bow completely visible. Same scale and canvas. Generous transparent margins all sides. Isolated character on genuine transparent PNG alpha background, no checkerboard, no solid backdrop, no floor shadow, text or scenery.

### defeated.png

Edit this exact cute potato archer into a gentle DEFEATED pose for a young children's game. Same identity, honey-gold potato skin and freckles, big shiny brown eyes, blush cheeks, oversized green leaf beret, wooden bow, style and right-facing view. Potato sits down with tiny feet pointing forward, body slightly squashed and leaf tilted, surprised little o-shaped mouth, playful harmless expression. Bow lowered and leaning beside it on the RIGHT, not broken. No injury, tears, skulls, X eyes, stars or detached effects. Show full rounded LEFT body curve and all extremities, no crop. All artwork fully within canvas with large margins, same canvas dimensions as reference. Single isolated transparent PNG cutout with actual alpha, NO checkerboard or colored background, no ground shadow, no scene, no text or frame.
