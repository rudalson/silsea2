# Ocean Dream maturity refresh ??2026-10-09

?ъ슜???붿껌: ?ㅼ뀡?쒕┝???섏젙???좊씪?댄듃泥섎읆 ???깆닕?섍쾶 留뚮뱾怨? ????대?吏? 寃뚯엫 ?ㅽ봽?쇱씠?몄뿉 ?④퍡 ?곸슜?⑸땲??

?댁옣 image_gen?쇰줈 ?먰솕瑜??몄쭛?덉뒿?덈떎. ?섏젙???좊씪?댄듃???묒? 癒몃━? 湲?紐㈑룸떎由? 李⑤텇???몄긽???깆닕??李멸퀬濡??ъ슜?⑸땲?? ?ㅼ뀡?쒕┝??吏꾩＜??紐? 泥?줉/?몃Ⅸ/誘쇳듃鍮?媛덇린? 瑗щ━, ?몃Ⅸ ?? 泥?줉??諛쒓돕怨?議곌컻 臾대뒳???좎??⑸땲??

## ????뚯씪怨??ъ깮??
- ????먰솕: `../character-select-heroes/oceandream.png`
- 湲곕낯?? `oceandream-base-atlas.png`
- ?좊땲肄? `oceandream-unicorn-atlas.png`
- ?섍??섏뒪: `oceandream-pegasus-atlas.png`
- ?뚮━肄? `oceandream-atlas.png`
- 異붿텧 醫뚰몴? 諛곗쑉: `oceandream-frames.json`

`npm run selection:heroes`濡?????대?吏瑜??앹꽦?⑸땲??
`node scripts/build-celestial-assets.js oceandream`?쇰줈 40媛??고????쒗듃? 62媛?湲곕낯 ?숈옉 ?꾨젅?? ?듭빱瑜??ъ깮?깊빀?덈떎.

寃???대?吏??`references/oceandream-poses.png`, `references/oceandream-forms.png`, `references/oceandream-maturity-comparison.png`?낅땲??

## 寃利?寃곌낵

`npm test`, `npm run validate`, `npm run build`, `npm run validate:runtime`, `git diff --check`瑜??듦낵?덉뒿?덈떎. 罹먮┃???좏깮 ?붾㈃?먯꽌 ??????대?吏? ?湲??ㅽ봽?쇱씠?멸? ?④퍡 ?쒖떆?섎뒗 寃껋쓣 ?뺤씤?덉뒿?덈떎.

## Hero prompt

Use case: precise-object-edit. Asset type: transparent pony game character selection hero. Image 1 EDIT TARGET Ocean Dream; image 2 APPROVED mature Sunlight, reference for age, anatomy and maturity ONLY. Redraw Ocean Dream to match the elegant young adult maturity and proportions of image 2: head one third smaller relative to body, less oversized more almond shaped eyes, longer graceful neck, slightly elongated torso, long slender legs and slightly elongated muzzle, gentle confident CLOSED-MOUTH smile. Preserve Ocean Dream identity exactly: pearl ivory coat, flowing rich ocean blue/turquoise/seafoam striped curled mane and tail, azure eyes, seafoam turquoise hooves, recognizable pale aqua scallop seashell mark on flank. Do NOT use Sunlight orange/gold colors. No horns or wings, no accessories. Full body right-facing three-quarter profile, one forehoof raised, same polished storybook cartoon cel shading and dark blue outlines. Entire pony visible with generous true transparent alpha margins, no ground shadow, text or background. Clearly older sister young adult like approved Sunlight, still friendly and charming, no foal/chibi proportions.

## Base atlas prompt

Use case: precise-object-edit. Asset type: transparent game animation atlas. Image 1 EDIT TARGET Ocean Dream base atlas; image 2 APPROVED mature Sunlight hero, exact age/anatomy reference ONLY. Make ALL sixteen Ocean Dream sprites visibly mature like image2: head about one THIRD smaller relative to body than current foal design, standing legs about 35 percent longer, long graceful neck, slender elongated torso, slightly elongated muzzle, less oversized calm almond-shaped azure eyes. Match approved Sunlight's young adult silhouette, do not just stretch the source. Retain pearl ivory coat, rich ocean blue/turquoise/seafoam striped curled flowing mane/tail, seafoam hooves and aqua scallop seashell flank mark; no orange/gold. All sprites face right. No horn, no wings. EXACTLY 16 isolated full-body sprites in 4 columns x 4 rows. Exact poses: row1 standing, standing BOTH eyes closed blink, landing crouch, hurt; row2 four distinct sequential gallop strides with different joint positions; row3 rising jump forelegs tucked, falling legs reaching down, airborne forelegs tucked, airborne stretched horizontal; row4 horizontal swim A, horizontal swim B, rearing celebration, braced defense. Same mature character proportions and colors in EVERY pose. Clean dark blue outlines, crisp cartoon cel shading. All hooves/ears/tails fully visible, generous outer margins and transparent gutters between cells, no overlaps, no text, no shadows or detached effects. TRUE transparent alpha. Clearly older sister young adult proportions, never chibi or baby.

## Unicorn atlas prompt

Use case: precise-object-edit. EDIT TARGET approved mature Ocean Dream base 4x4 game atlas. ONLY add ONE SHORT delicate pearl/seafoam spiral unicorn horn naturally attached to the forehead in EACH of all sixteen poses. Horn length about HALF the ear height; full pointed tip surrounded by transparent margin, never cut off. Retain EXACT mature young adult small head, long graceful neck and slender long legs, slightly elongated body/muzzle, pearl coat, ocean blue/turquoise/seafoam curls, azure eyes, aqua scallop seashell flank mark, seafoam hooves. Same 16 poses, proportions, scale and positions. All right-facing. The second standing pose must show both eyes shut for blink. No wings. Genuine transparent alpha, preserve 4x4 grid and isolated characters, generous transparent gutters and outer margins, complete silhouettes, no glitter, text, shadow or new objects.

## Pegasus atlas prompt

Use case: precise-object-edit. EDIT TARGET approved mature Ocean Dream base 4x4 atlas. Add attached pearl/seafoam/ocean-blue feathered PEGASUS wings to each of the sixteen sprites. Preserve EXACT mature young adult body proportions: smaller head, long neck, slim long legs, elongated torso; preserve pearl coat, ocean blue/turquoise/seafoam curled mane/tail, azure eyes, aqua scallop seashell flank mark, turquoise hooves. No horns. Retain 16 right-facing poses and their 4x4 grid positions and scale. Wings folded during standing/crouch/hurt in row1 and gallop row2, tucked in row3 col1 jump and col2 fall; row3 col3 wings fully UP, row3 col4 wings HORIZONTAL, row4 col1 wings DOWN for three DISTINCT wingbeats; row4 col2 folded swim, col3 spread rearing victory, col4 curved forward shielding. All feathers connect to body, complete silhouettes. Enough transparent gutters so wings NEVER touch neighboring sprites; generous outer transparency, every wingtip/hoof/ear/tail in frame. Second standing pose has eyes closed. No chibi anatomy, no sun symbols, no detached sparkles, no text/shadows/background. True transparent alpha.

## Alicorn atlas prompt

Use case: precise-object-edit. EDIT TARGET approved mature Ocean Dream PEGASUS atlas. ONLY add one SHORT slender pearl/seafoam spiral unicorn horn naturally connected to the forehead in EVERY one of all sixteen sprites, producing ALICORN form. Horn length about HALF the ear height, all pointed tips complete with transparent surrounding space. Retain ALL mature young adult anatomy, small head, long neck/long slender legs, elongated torso, pearl coat, ocean blue/turquoise/seafoam curls, azure eyes, seafoam hooves, aqua scallop seashell mark. Keep all wings and wingbeat positions, poses, scale, locations and 4x4 grid exactly unchanged. No clipped tips or overlaps. Generous transparent gutters and outer margin. Genuine transparent alpha, no text/shadows or detached sparkle marks.
