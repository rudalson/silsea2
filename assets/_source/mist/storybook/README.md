# 안개 골짜기 동화풍 배경

2026-09-12 사용자 요청에 따라 내장 `image_gen` 도구로 제작했습니다. 화풍 참조는 기존 `assets/backgrounds/stage_preview_mist.png`입니다.

- `bg_mist_far.png`: 맑은 청록 하늘, 크림색 구름, 먼 연두 언덕과 골짜기 안개.
- `bg_mist_mid.png`: 둥근 초록 언덕과 나무, 골짜기 사이의 얇은 안개.
- `bg_mist_near.png`: 낮은 덤불, 분홍·노랑·하늘색 꽃, 둥근 이끼 바위.

`npm run mist:assets`로 `assets/backgrounds/bg_mist_{far,mid,near}.png`와 합성 미리보기를 재생성합니다. 런타임 배경은 2048×720 RGBA입니다. 원본의 풍부한 색상을 유지하고, 기존의 제한 팔레트 양자화·알파 이진화·반대쪽 경계 복사는 적용하지 않습니다. 좌우 반전 반복은 기존 LevelLoader를 사용합니다.

생성 도구의 투명 PNG 재요청도 실제 알파를 제공하지 않아, 최종 원본은 첫 생성본을 보관합니다. 중경·전경의 회색 체크무늬는 무지개 언덕 빌더와 같은 방식으로 상단과 연결된 중성색 매트만 제거합니다. 내부 바위·꽃·안개 색은 보존하고 리사이즈 과정의 부드러운 알파를 유지합니다. 알파가 있는 새 원본으로 교체하면 매트 제거를 건너뜁니다.

중경은 y=300부터 배치합니다. 전경은 원본 비율을 유지해 폭 1024px로 맞춘 뒤 y=430에 원본과 좌우 반전본을 이어 붙입니다. 꽃을 지면 위에 두면서 낭떠러지에서 잘리지 않도록 아래쪽 안개 색을 y=720까지 연장합니다. 선택 카드는 기존 동화풍 원화를 계속 사용합니다.

## 최종 생성 프롬프트

### far

Use case: illustration-story. Create a production parallax background layer for Mist Valley, a cheerful children's side-scrolling platform game. Style reference: attached existing stage preview; match rounded storybook cel illustration, clean colored contours, luminous mint/lime greens, cyan sky, cream mist, soft painterly shading like a polished children's picture book. Output one ultra-wide landscape 2048x720 (2.84:1). No text, UI, characters, collectibles, platforms, soil cutaway, scary or gloomy shapes. No dithering, grain, pixel art, posterization or chalk texture. Lighting upper left. OPAQUE FAR LAYER. Broad clear turquoise-blue sky fills upper 60 percent, a few large smooth fluffy cream-white clouds. Lower 40 percent gentle distant overlapping rounded mint and pale jade hills, thin pearly white mist ribbons nestled BETWEEN hills, small distant rounded tree groups. Airy warm morning, colored hills visible distinctly through gaps in mist. No tall foreground trees, flowers, bridge, paths, or foreground objects. Quiet spacious panorama, hills rather than sharp vertical mountains. Left and right edges similar sky and hill heights for horizontal repeated scrolling.

### mid

Use case: illustration-story. Create a production parallax background layer for Mist Valley, a cheerful children's side-scrolling platform game. Style reference: attached existing stage preview; match rounded storybook cel illustration, clean colored contours, luminous mint/lime greens, cyan sky, cream mist, soft painterly shading like a polished children's picture book. Output one ultra-wide landscape 2048x720 (2.84:1). No text, UI, characters, collectibles, platforms, soil cutaway, scary or gloomy shapes. No dithering, grain, pixel art, posterization or chalk texture. Lighting upper left. MIDGROUND LAYER on real transparent alpha background, NO painted sky or white matte. A wide horizontal row of rounded lush jade and apple-green hills with small clumps of plump round-canopy trees, warm golden sunlit tops, turquoise shadows. All scenery contained in LOWER 60 percent; upper 40 percent entirely transparent. Hills at varying heights, generous open valley gaps with a FEW thin silky cream mist wisps nestled low between hills, not a white blanket. No dominant large tree in middle, no tall pillars or towers. Bottom foliage gently fills to bottom edge. Match the attached reference's inviting green valley. True transparency surrounding silhouettes and between trees; preserve soft alpha on mist edges. No ground platform, no river or path aimed at camera.

### near

Use case: illustration-story. Create a production parallax background layer for Mist Valley, a cheerful children's side-scrolling platform game. Style reference: attached existing stage preview; match rounded storybook cel illustration, clean colored contours, luminous mint/lime greens, cyan sky, cream mist, soft painterly shading like a polished children's picture book. Output one ultra-wide landscape 2048x720 (2.84:1). No text, UI, characters, collectibles, platforms, soil cutaway, scary or gloomy shapes. No dithering, grain, pixel art, posterization or chalk texture. Lighting upper left. NEAR FOREGROUND LAYER on real transparent alpha background, no white matte. Only a LOW horizontal border of rounded mint and emerald leafy shrubs, a few large friendly five-petal blush-pink, pale-blue and buttery-yellow flowers, rounded pale mossy stones and small ferns. The vegetation band fills ONLY bottom 25 percent, upper 75 percent ENTIRELY transparent and empty. Friendly clean scalloped shapes with gentle teal outlines, soft sunny lime highlights, no black or brown masses. Sparse cream mist curls hugging a few stones at the very bottom, never obscuring plants. Continuous low vegetation along width, no trees, no tall flowers. Actual alpha transparency around all foliage. Horizontal scrolling strip.
