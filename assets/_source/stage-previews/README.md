# 스테이지 선택 일러스트

별빛 숲, 안개 골짜기, 쓰나미 마을, 물에 잠긴 마을의 선택 카드용 원본입니다. 내장 `image_gen` 도구로 생성했습니다. 별빛 숲과 안개 골짜기는 `assets/backgrounds/stage_preview_rainbow_hill.png`, 두 마을은 개선된 `assets/backgrounds/stage_preview_mist.png`를 화풍 참조로 사용했습니다. 플레이 중 배경 레이어와는 별도로 관리합니다.

- `starlight-storybook.png` → `assets/backgrounds/stage_preview_starlight.png`
- `mist-storybook.png` → `assets/backgrounds/stage_preview_mist.png`
- `tsunami-storybook.png` → `assets/backgrounds/stage_preview_tsunami.png`
- `submerged-storybook.png` → `assets/backgrounds/stage_preview_submerged.png`

`scripts/build-storybook-stage-previews.js`의 `buildStorybookStagePreview`가 1280×720 PNG를 만듭니다. 각 스테이지의 에셋 빌드 및 안개 색감 보정 스크립트에서도 호출하므로 재빌드할 때 유지됩니다. 색상 양자화를 적용하지 않습니다.

## 별빛 숲 생성 프롬프트

Use case: illustration-story. Asset type: finished 16:9 full-bleed stage-selection landscape illustration for a young children's 2D adventure game, 1280x720 preferred. Create a replacement for the Starlight Forest stage. Input image 1 is STYLE REFERENCE ONLY: match its friendly rounded contours, clean colored outlines, soft cel shading, inviting bright children's storybook game illustration and simple readable composition. Scene: an open welcoming forest clearing with a gently winding golden path, plump rounded mint and turquoise trees, warm buttery yellow crescent moon and large softly sparkling stars, small glowing star-shaped flowers among pink and yellow meadow flowers. Lavender/periwinkle early evening sky, luminous pastel foliage with soft warm highlights, comfortably bright enough to explore. Keep twilight/starlight identity while avoiding dark navy expanses, murky shadows, gnarled branches, eyes, scary silhouettes. Landscape should read clearly at thumbnail size with a few large forms. Foreground grassy ledge along bottom, clear center path, balanced trees framing sides, soft distant hills. No characters, text, labels, numbers, borders, UI, logos, watermark. Produce one polished illustration, not a collage.

## 안개 골짜기 생성 프롬프트

Use case: illustration-story. Asset type: finished 16:9 full-bleed stage-selection landscape illustration for a young children's 2D adventure game, 1280x720 preferred. Create a replacement for the Mist Valley stage. Input image 1 is STYLE REFERENCE ONLY: match its friendly rounded contours, clean colored outlines, soft cel shading, inviting bright children's storybook game illustration and simple readable composition. Scene: a welcoming sunlit green valley with big softly rounded grassy hills, a clear turquoise stream winding through the valley, a small rounded wooden footbridge in the middle distance, soft cream-white cottony mist ribbons hugging the lower slopes while leaving the path and hills clearly visible. Puffy clouds in a luminous blue sky. Mint, fresh apple green, pale aqua and warm cream with small pink and yellow foreground flowers. Rounded bushes framing the sides, a simple grassy ledge along the bottom like the reference. Give mist a cozy airy cloud-like softness, cheerful morning light and readable outlines. A few large forms legible at small thumbnail size. Preserve mist-valley identity, no rainbow or moon; avoid towering jagged karst mountains, sharp rocks, dense fog, murky dark bushes, dithering or speckled textures. No characters, text, labels, numbers, borders, UI, logos, watermark. Produce one polished illustration, not a collage.
