# 무지개 언덕 배경 원본

내장 `image_gen`으로 생성·편집했습니다. `npm run rainbow:assets`로 일반·협곡·보스 배경 9개와 미리보기를 재생성합니다.

- `far.png`: 일곱 색 무지개 하늘, 일반/보스 구간.
- `pit.png`: 밝은 구름 계곡 하늘, 협곡 구간.
- `mid.png`: 실제 알파를 보존하는 나무 레이어. 전체 실루엣을 가로 1908, 세로 360px로 배치하고 뿌리를 y=586에 맞춥니다.
- `near.png`: 첫 꽃덤불 원본이자 후속 편집 참조.
- `near-extended.png`: 최종 꽃덤불. 꽃은 위쪽, 잎은 화면 아래 끝까지 연결합니다. 생성 결과의 중성 회색 체크무늬는 외부와 연결된 영역만 빌드 시 투명화합니다. 최종 배치는 y=460~720입니다.

색상 양자화·블러·외곽 그림자를 추가하지 않습니다. 런타임은 원본과 반전본을 교차하므로 같은 쪽 가장자리끼리 연결됩니다. 반대쪽 가장자리 픽셀을 복사하지 않아 수직 띠를 방지합니다. 재생성 중 개발 서버가 불완전한 PNG를 읽지 않도록 완성 파일을 교체합니다.

출력: `assets/backgrounds/bg_{normal,pit,boss}_{far,mid,near}.png`. 미리보기: `references/background-{normal,pit,boss}-preview.png`, `references/background-mood-contact-sheet.png`.

## 생성 프롬프트

### Far

Use case: illustration-story. Create a polished FAR BACKGROUND panorama for Rainbow Hill, a young children's side-scrolling platform game. Wide 2048x720 landscape. Sunny clear pale cyan sky occupying upper two thirds, a few separate plump cream-white clouds with subtle peach undersides, one large graceful rainbow centered horizontally with its arch crest around y=210 and feet hidden behind low distant hills around y=590. Rainbow has SEVEN distinct continuous clean equal-width color bands in correct outer-to-inner order: coral red, tangerine orange, sunny yellow, fresh green, sky blue, indigo blue, violet. No white gaps or muddy bands. Low rolling mint and turquoise distant hills restricted to bottom quarter, softly rounded outlines. Friendly polished children's storybook game illustration with saturated pastel colors, restrained smooth cel shading, clearly separated solid shapes and crisp colored contours. Airy simple composition leaves gameplay readable. Left and right margins are quiet cyan sky and low matching hills, no objects cut across edges. No close trees, bushes, flowers, platforms, soil, characters, stars, glitter, text, UI or borders. NO dark cast shadows, blur, bloom, haze, painterly grain, pixelation, dithering or texture noise. Full bleed opaque background. The art must feel welcoming and cheerful, richer and more skillfully drawn than primitive flat shapes.

### Mid

Use case: illustration-story. Create a TRANSPARENT PNG MIDGROUND game scenery layer for Rainbow Hill, a cheerful children's side-scrolling platformer. Wide canvas 2048x720. GENUINE alpha transparency, no opaque background or drawn checkerboard. Four separate friendly rounded deciduous trees, spaced airy with wide completely transparent gaps. Tree canopy tops at y=240 to 330, ALL tree roots at y=590. Place trees around x=250,760,1350,1820; varied size, tallest 370px. Keep every silhouette fully contained with at least 70px clear margin at left and right, top 220px empty, bottom 100px empty. Trees have plump apple-green and mint foliage, sunny lemon-lime highlights, layered soft turquoise-green shadows INSIDE foliage only; smooth warm caramel trunks with simple rounded branches. Small round bushes at bases only. Polished adorable storybook game art, clean confident colored outlines, smooth cel shading with simple large forms, solid opaque object interiors. Clearly distinguish light canopy tops, greener lower lobes, brown branches. No black outlines, no dark gray shadows, NO drop shadow, NO halo, NO translucent duplicate outline or shadow outside objects. No rainbow, sky, hills, clouds, flowers, soil, ground, platforms, characters, face, text, UI, borders, sparkle or haze. Crisp transparent cutouts, no soft fuzzy outer glow. Not a labeled sprite sheet, one airy scenery layer.

### Near

Use case: illustration-story. A polished TRANSPARENT PNG NEAR BACKGROUND vegetation strip for a sunny children's Rainbow Hill side-scrolling game, wide 2048x720 canvas. ACTUAL alpha transparency, no background color, no checkerboard. Only a LOW cheerful border of plump rounded mint-green and turquoise bushes with fresh lime highlights, with small clusters of simple round-petal pink, yellow and sky-blue flowers. All artwork restricted to bottom 180px of the 720px canvas; top 540px COMPLETELY EMPTY TRANSPARENT. Modest detail, varied low bush heights, no tall plants. Rounded clearly separated shapes, crisp clean teal colored contours, smooth warm cel shading, opaque interiors, adorable storybook art. Contours must be single sharp clean edges, no surrounding drop shadows, no haze, blur, glow, semi-transparent halo or dark external shadow. Bushes fill entire width along bottom, low even edges compatible with mirrored repetition. No trees, trunks, rainbow, sky, clouds, hills, soil, path, ground strip, platforms, characters, faces, text, UI or borders. This is a single horizontal foliage layer, not a collage or labeled sprite sheet.

### Pit

Use case: illustration-story. FAR BACKGROUND panorama for the sunny ravine section of Rainbow Hill, young children's side-scrolling platform game. Wide 2048x720 full bleed opaque. Match a cheerful polished storybook game: crisp simple big rounded shapes, gentle cel shading, clear edges, bright cyan sky and cream white cotton clouds. Open sky covers upper 65 percent. Bottom third: low distant mint rolling hills on left and right surrounding a broad airy cloud-filled dip through the center, soft rounded pale peach rock faces with grassy lime tops, cozy floating cloud banks low in the dip. A small clear seven-color rainbow between distant hills, clean red orange yellow green blue indigo violet bands in order, no merged bands. Gentle playful flying adventure, no danger or dark atmosphere. Keep all large landscape forms below y=450; leave center sky calm and uncluttered. Left/right edges simple compatible heights for mirrored repetition. No close trees, bushes, flowers, solid ground strip, platforms, characters, text, UI, borders, particles. No black outlines, dark gray shadows, blur, glow, haze, realistic textures, dithering, grain or pixelation.

### Near extension — 최종 편집

Edit this transparent game foliage layer. Preserve its cheerful rounded mint/turquoise/lime bushes, clean teal outlines and pink/yellow/blue five-petal flowers. Change layout: upper 62% of entire wide canvas completely transparent. Along bottom 38%, create a continuous full-width bank of bushes; tallest rounded tops begin at 62% canvas height. Put ALL the flowers HIGH on the bush tops, between 66% and 76% of canvas height, so the flowers remain visible above the game's floor. Crucially, extend the rich opaque mint/turquoise foliage naturally DOWNWARD right to bottom edge, filling the lower part with big rounded leaf lobes. No horizontal exposed bottom edge, no gap under foliage. No tall stems. No ground, platform, soil, sky, clouds or scenery. Preserve actual alpha transparency above foliage; NO opaque backdrop or checkerboard. Crisp single outer boundaries, opaque interiors, no shadow outside silhouette, no fuzz or outer glow. Wide PNG with genuine alpha. Flowers on the UPPER rim of the bushes, lower foliage simple calm opaque mint/turquoise leaf forms to bottom edge.

