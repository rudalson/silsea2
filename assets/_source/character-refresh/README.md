# 실비아 다색 외형 수정

2026-09-11 사용자 요청. 실세아의 기존 흰색 털·분홍 갈기는 유지하고 실비아만 수정한다.

- 생성 방식: 내장 imagegen 편집 도구.
- 입력: 기존 56개 키포즈를 8열로 모은 `sylvia-before.png`와 짧은 갈기의 중간 생성본 `sylvia-generated.png`.
- 채택 원본: `sylvia-colorful-generated.png`.
- 프레임 순서: `sylvia-frames.json`.
- 뿔 원형: 기존 변신 프레임에서 보존한 `sylvia-horn.png`.
- 재생성: `node scripts/build-sylvia-refresh.js`, `node scripts/build-unicorn-sheets.js`, `node scripts/build-swim-assets.js` 순서로 실행한다.
- 흰 배경 분리, 128×128 프레임·96px 높이·16px 기준선 정렬, 전용 팔레트 정리 후 런타임 시트를 조립한다.

## 최종 생성 프롬프트

Edit this game sprite atlas: keep exactly the same 56 horse sprites, their distinct animation poses and locations, 8 columns by 7 populated rows, with the bottom eighth row empty. Keep the short swept-back angular mane, sturdy friendly young male pony anatomy and confident kind expression. Change ONLY character coloring consistently across all sprites to a gorgeous colorful pastel fantasy pony. Coat luminous light lavender (#D8C5F0) with purple shadows; hair has clearly distinct broad mint turquoise, sky blue and violet streaks, with a little pink at the tips, flowing tail with the same multicolor streaks. Hooves lavender-purple, eyes bright teal. Keep all outlines clean dark blue-purple, all pose differences, closed eyes where present, horn and wings only on the original transformation sprites. No accessories or clothes, no new characters. Do not change the sprite count, cell positions, pose layout or margins. Output square 2048x2048. IMPORTANT: remove the baked gray checkerboard completely. Use a perfectly flat solid PURE WHITE #FFFFFF background, no checkerboard, no shadow, no texture anywhere outside the sprites. All coat and wing fill should remain visibly lavender so the white background can be keyed out. Row 8 must be pure white and empty. 2D crisp game cel-shaded style. This character is Sylvia, the male friend of Silsea; only Sylvia's atlas is being edited.
