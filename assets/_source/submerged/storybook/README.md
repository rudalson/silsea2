# 물에 잠긴 마을 동화풍 배경 원본

- 작업일: 2026-09-13
- 생성 도구: Codex 내장 image_gen
- 화풍 참조: `assets/backgrounds/stage_preview_submerged.png`
- 목적: 선택 화면과 어울리는 맑은 청록빛 물, 따뜻한 지붕색, 산호·수초를 실제 잠수 구간에 적용합니다.

## 원본과 런타임 배치

| 원본 | 역할 | 2048×720 런타임 배치 |
|---|---|---|
| bg_submerged_far.png | 하늘·수면·먼 수중 마을 | 원본 수면 위치 286/743을 실제 수면 y=320에 정렬 |
| bg_submerged_mid.png | 크림색 벽과 주황·청록 지붕의 잠긴 집 | 투명 여백 정리 후 폭 1024, 비율 유지, 기초 y=610; 좌우 반전한 두 묶음 |
| bg_submerged_near.png | 낮은 산호·수초·둥근 바위·모래 | 하단 y=560~720, 높이 160 |

중경 집의 크기를 낮추고 집 사이를 비워 원경과 헤엄치는 공간이 보이게 했습니다. 런타임은 기존 LevelLoader의 좌우 반전 반복을 사용합니다.

생성 결과의 중경·근경은 실제 알파 대신 체크 무늬가 그려진 RGB로 반환되었습니다. 통합 스크립트는 외곽과 연결된 중성색 매트와 알려진 상단 빈 영역만 제거하고 그림 내부의 크림색 벽·돌 색상을 보존합니다. 크기 조정에서 부드러운 알파 경계를 생성합니다. 배경에는 기존 제한 팔레트 양자화나 강제 톤 치환을 적용하지 않습니다.

기존 지형·충돌·수면선·빛결·기포·수영·호흡 규칙은 유지합니다.

## 재생성

```sh
node scripts/build-submerged-assets.js
npm run validate
npm test
npm run build
npm run validate:runtime
```

배경 통합 구현: `scripts/build-submerged-backgrounds.js`. 전체 P5 에셋 파이프라인인 `npm run submerged:assets`에서도 같은 배경 빌더를 사용합니다.

## 실제 게임 검수

- `references/submerged-storybook-runtime.png`: 짧은 잠수 구간, 수면·집·산호·플레이어와 지형의 겹침 확인
- `references/submerged-storybook-long-runtime.png`: 긴 잠수 구간, 이동 위치에 따른 배경 구성 확인
- `references/background-submerged-preview.png`: 배경 3레이어 합성 참고
- 에셋 규격·명도·투명 영역, 레벨·게임 테스트, 프로덕션 빌드 및 런타임 패키지 검증 통과

## 생성 프롬프트

### far

```text
Use case: illustration-story. Create a production parallax background for Submerged Village, a gentle cheerful children's side-scrolling swimming game. Use attached existing stage-card illustration as STYLE reference: rounded cream cottages with orange/teal tiled roofs and circular windows, crystal-clear turquoise water, soft warm sunlight, lime moss, coral pink sea plants, rounded rocks, inviting polished storybook cel painting with clean colored contours. Bright readable full color, not gloomy. Single ultra-wide panorama 2048x720, ratio2.84:1. No text, UI, characters, collectibles, treasure, enemies, playable platforms, soil cutaway, pixel art, dithering, scratchy texture, posterization, realistic disaster or wreckage. OPAQUE FAR LAYER, cross-section of a flooded coastal village. Upper 44 percent clear cyan sky with a few puffy cream clouds and distant gentle mint hills, two tiny orange cottage roof tips just above the water. Water begins at EXACTLY 44 percent down the canvas (y320 of720), calm almost horizontal transition, no big white wave; runtime draws the water surface. Lower 56 percent spacious luminous transparent-looking turquoise underwater world, subtle soft sun shafts descending from surface, pale blue distant village silhouettes and small rounded boulders near the very bottom, pale warm sandy seabed at bottom. Keep underwater middle area open and bright so nearer houses and swimming characters read clearly. No foreground houses, no large plants, no large bubbles. Continuous level sea surface across both edges, no diagonal shore or perspective path.
```

### mid

```text
Use case: illustration-story. Create a production parallax background for Submerged Village, a gentle cheerful children's side-scrolling swimming game. Use attached existing stage-card illustration as STYLE reference: rounded cream cottages with orange/teal tiled roofs and circular windows, crystal-clear turquoise water, soft warm sunlight, lime moss, coral pink sea plants, rounded rocks, inviting polished storybook cel painting with clean colored contours. Bright readable full color, not gloomy. Single ultra-wide panorama 2048x720, ratio2.84:1. No text, UI, characters, collectibles, treasure, enemies, playable platforms, soil cutaway, pixel art, dithering, scratchy texture, posterization, realistic disaster or wreckage. MID LAYER on real transparent alpha background, no sky, water fill or waterline. Three separated low groups of charming FULLY SUBMERGED cottages, distributed across width with large transparent gaps between groups (at least 40 percent of width open). Small cream walls, rounded orange and teal tile roofs, round blue windows and wooden doors, moss at stone foundations, tiny coral clumps and sea grass. Sunlit watercolor turquoise accents on roof edges and light caustic flecks across facades, but preserve warm cream and terracotta color rather than opaque blue overlay. All houses entirely in LOWER HALF of canvas with a common horizontal foundation baseline at 90% height. Top 50% EMPTY actual transparent alpha. No tall towers, houses no higher than one-third canvas height. No continuous wall or land strip joining clusters, transparent around and between structures, no checkerboard or white matte. No stairs/path coming toward camera. Frame side-on from a swimming character's view.
```

### near

```text
Use case: illustration-story. Create a production parallax background for Submerged Village, a gentle cheerful children's side-scrolling swimming game. Use attached existing stage-card illustration as STYLE reference: rounded cream cottages with orange/teal tiled roofs and circular windows, crystal-clear turquoise water, soft warm sunlight, lime moss, coral pink sea plants, rounded rocks, inviting polished storybook cel painting with clean colored contours. Bright readable full color, not gloomy. Single ultra-wide panorama 2048x720, ratio2.84:1. No text, UI, characters, collectibles, treasure, enemies, playable platforms, soil cutaway, pixel art, dithering, scratchy texture, posterization, realistic disaster or wreckage. NEAR LAYER on real transparent alpha background. A sparse LOW continuous border of smooth rounded sea rocks with fresh lime moss, small graceful emerald seaweed clumps and friendly salmon-pink/peach rounded coral fingers. Tiny cream seashells, pastel aqua leaves, pale sandy patches. All decoration in BOTTOM 22% of canvas, upper78% empty actual transparent. Keep plants SHORT, never tall kelp crossing the play area. Open spaces between clumps, clean soft silhouette without heavy black outlines. Bottom edge has gentle sandy/rock base across width. No sky, water plane, wave, houses or bubbles. NO checkerboard painted backdrop, no white matte. Luminous underwater sunlight, soft clean cel shading, no blur over illustration.
```
