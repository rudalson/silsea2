# Sunlight maturity refresh ??2026-10-09

?ъ슜???붿껌: 臾몃씪?댄듃蹂대떎 ?섏씠媛 留롮? ?좊씪?댄듃瑜??ㅻ퉬?꾩쿂??議곌툑 ???깆닕?섍쾶 議곗젙?섍퀬, ????대?吏? ?ㅽ봽?쇱씠??紐⑤몢 諛섏쁺?⑸땲??

?댁옣 image_gen ?꾧뎄濡??먰솕瑜??몄쭛?덉뒿?덈떎. ?ㅻ퉬?꾨뒗 ?깆닕?꾩? 鍮꾩쑉??李멸퀬?대ŉ, ?좊씪?댄듃???щ┝??紐맞룹＜??湲덉깋 怨깆뒳 媛덇린쨌?몃컯???댟룰툑鍮?諛쒓돕? ?좎??⑸땲?? ????대?吏???묒? 癒몃━? 湲?紐㈑룸떎由щ? 湲곕낯???ㅽ봽?쇱씠?몄뿉 留욎텣 ??蹂???뺥깭瑜??몄쭛?덉뒿?덈떎.

## ????뚯씪怨??ъ깮??
- ????먰솕: `../character-select-heroes/sunlight.png`
- 湲곕낯?? `sunlight-base-atlas.png`
- ?좊땲肄? `sunlight-unicorn-atlas.png`
- ?섍??섏뒪: `sunlight-pegasus-atlas.png`
- ?뚮━肄? `sunlight-atlas.png`
- 異붿텧 醫뚰몴? 諛곗쑉: `sunlight-frames.json`

`npm run selection:heroes`濡?????대?吏瑜??앹꽦?섍퀬,
`node scripts/build-celestial-assets.js sunlight`濡??좊씪?댄듃??40媛??고????쒗듃? 62媛?湲곕낯 ?숈옉 ?꾨젅?? ?듭빱瑜??ъ깮?깊빀?덈떎.

媛??뺥깭??16媛??먰솕 ?ъ쫰??4횞4 ?쒖꽌濡?異붿텧?⑸땲?? 寃???대?吏??`references/sunlight-poses.png`, `references/sunlight-forms.png`,
`references/sunlight-maturity-comparison.png`?낅땲??

## 寃利?寃곌낵

`npm test`, `npm run validate`, `npm run build`, `npm run validate:runtime`, `git diff --check`瑜??듦낵?덉뒿?덈떎. 寃뚯엫??罹먮┃???좏깮 ?붾㈃?먯꽌 ????대?吏? ?湲??ㅽ봽?쇱씠?몃? ?④퍡 ?뺤씤?덇퀬, ?좊씪?댄듃濡?泥??ㅽ뀒?댁???吏꾩엯???뚮젅???ㅽ봽?쇱씠?멸? ?쒖떆?섎뒗 寃껋쓣 ?뺤씤?덉뒿?덈떎.

## Hero prompt

Use case: precise-object-edit. Asset type: transparent character selection hero illustration for a pony platform game. Image 1 is EDIT TARGET Sunlight; image 2 is REFERENCE Sylvia, only for maturity and body proportions. Redraw Sunlight as a slightly more mature young adult pony, about the same maturity as Sylvia: noticeably smaller head relative to torso, less oversized eyes, longer graceful neck and legs, slightly elongated muzzle, confident gentle CLOSED-MOUTH smile. Retain all Sunlight identity: warm ivory cream coat, rich orange and golden-yellow striped flowing curly mane and tail, amber eyes, gold hooves, no horn, no wings. Retain facing right, full body three-quarter profile, one front hoof raised, ornate warm cartoon cel-shaded illustration style and crisp dark brown outlines. Clearly mature silhouette yet still charming and friendly; no wrinkles, no human anatomy, no clothes or accessories. Entire character fully visible with generous transparent margins, no ground shadow, no text, no backdrop. Genuine transparent alpha background. Do not transfer Sylvia's purple or turquoise colors.

## Base atlas ??final prompt

Use case: precise-object-edit. Image 1 is edit target sprite atlas, image 2 is APPROVED mature Sunlight character design to MATCH EXACTLY in all sprites. Change each pony in image 1 to have image 2's mature proportions: much smaller head, longer neck, slim elongated torso and long slender legs. Current atlas looks too baby-like. Each sprite's head excluding mane should be about one THIRD smaller relative to its body than now, and standing legs should be about 35 percent longer. Use the long graceful neck and calm more almond-shaped eyes of image 2, not the foal's oversized round head/eyes. Sunlight must read as an older sister pony, like an elegant young adult. Preserve ivory coat, orange and golden-yellow curled mane and tail, amber eyes, gold hooves, brown outlines. Keep recognizable Sunlight hair. No horns, no wings. Render EXACTLY sixteen distinct complete isolated sprites, 4 columns x 4 rows, all facing right. Pose order exactly image1: standing, blinking, crouch, hurt; four gallop phases; rising, falling, forelegs-tucked airborne, horizontal airborne; horizontal swim A, swim B, rearing victory, braced guard. Match approved image2 body and face across ALL 16 sprites, including jump/run. This is a proportion redesign, not only stretching the source image. Increase transparent gutters so no sprites touch or cross cells, keep all ears/hooves/tails in frame. Crisp cartoon cel shading. Genuine transparent alpha. No text or background, no floor shadows, no detached effects. Make the anatomy visibly more mature exactly like image2.

## Unicorn atlas prompt

Use case: precise-object-edit. Edit target is this APPROVED mature Sunlight animation atlas. Add ONE small elegant ivory/gold spiral unicorn horn emerging naturally from the forehead in EACH of the 16 poses. Keep her long neck, long slender legs, small adult head, orange/gold curly mane/tail, cream coat, amber eyes, gold hooves EXACTLY. Preserve all 16 poses and their locations in the 4x4 grid, colors, sizes, outlines, expression and transparency. Do not make her chibi or younger. NO wings. Only add the attached horns; do not redesign anything else. Ensure the second standing sprite has BOTH eyes closed for blinking. All complete silhouettes isolated, no detached glitter, no text/shadows, genuine transparent alpha.

## Pegasus atlas prompt

Use case: precise-object-edit. Edit target is this APPROVED mature Sunlight animation atlas. Add naturally attached elegant cream/gold feathered PEGASUS wings to EACH of the 16 poses. Small gold sun emblems at feather tips are her identity. Retain the mature long neck and slender legs, smaller adult head, cream body, rich orange/gold curly mane/tail, amber eyes, gold hooves, SAME scale/positions and exactly the same poses as source. Preserve exact 4x4 pose grid and character identity, no horns. Wings folded in row1 and galloping row2; row3 col1,col2 mostly tucked, col3 spread fully UPWARD, col4 stretched horizontally; row4 col1 wing flapped DOWNWARD, col2 folded swimming, col3 spread rearing victory, col4 curved forward as shield. Three clearly DISTINCT wingbeat positions at row3col3, row3col4 and row4col1. All wings must connect to body, no detached feathers or sparkles. Keep transparent gutters so wings never touch other sprites. Whole hooves/tail/ears/wings fit in each cell. The second standing sprite has BOTH eyes closed for blinking. No younger/chibi proportions. Genuine transparent alpha, no text, no shadows.

## Unicorn horn correction

undefined

## Alicorn atlas prompt

Use case: precise-object-edit. Edit target: approved mature Sunlight PEGASUS 4x4 atlas. Add one SHORT delicate ivory/gold spiral unicorn horn naturally connected to the forehead in every one of the sixteen sprites, creating ALICORN form. Horn length is about HALF the ear height, no oversized horns. All tips complete with transparent margin, never cut at canvas edge. Preserve EXACTLY all mature Sunlight body proportions, long neck and slim long legs, smaller head, colors, orange/gold curly hair, amber eyes, golden hooves, wing positions and gold sun motifs, poses and locations. Preserve all 16 sprites and all three distinct wingbeat positions. True transparent alpha. No text, no floor shadow or detached sparkles. Generous transparent outer padding and cell gutters; no sprite overlaps or touches another. Change only addition of short horns.
