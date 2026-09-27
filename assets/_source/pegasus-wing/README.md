# 페가수스 접힌 날개

`folded-wing.png`는 대기·이동 중 몸통 옆에 붙는 날개 원화다. 아이템 그림인 `item_wings.png`는 수집물에만 사용한다. 비행·방어 동작은 기존 캐릭터별 완성 프레임에 날개가 포함되어 있으므로 추가 날개를 그리지 않는다.

Built-in `image_gen`으로 생성한 최종 프롬프트:

> Use case: stylized-concept. Asset type: a single reusable attachment sprite for a bright children's 2D side-scrolling pony game, displayed small (about 36x30 pixels) on the visible side of a pony's upper back while standing and running. Produce exactly ONE isolated, side-view FOLDED feathered pegasus wing, facing right. The small rounded shoulder/root is at the UPPER RIGHT of the wing, while three or four soft, layered flight feathers sweep gently BACKWARD to the LEFT and slightly DOWN; compact horizontal silhouette. Pearl white and warm cream feathers, pale blush-pink underside/shading, fine plum or warm mauve smooth contour, sunny soft cel shading consistent with a polished storybook pony sprite. Wing occupies most of canvas, no big margins. Genuine transparent alpha outside the wing. No horse/body/pony, no second wing, no clasp/jewelry, no floating feathers, no icon design, no halo, no background, no checkerboard, no text, no shadow.

`node scripts/build-pegasus-wing.js`가 투명 영역을 자르고 64×48 프레임에 배치하여 `assets/effects/fx_pegasus_folded_wing.png`를 만든다.
