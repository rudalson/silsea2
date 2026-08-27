# P5 물에 잠긴 마을 최종 화면 검토

> 상태: 사용자 최종 확인 대기
> 범위: P5 전용 배경·지형·수면 효과·수영 피드백·BGM·스테이지 선택 카드 통합
> 코스 승인: `P5 코스 승인` · 커밋 `0468397` · 화면 교정 `2285c86`
> 앵커 승인: `P5 앵커 승인` · 커밋 `92cf231`

## 반영 방향

쓰나미를 맞던 앞 마을과 다른 장소로 보이되, 재난이 지나간 뒤에도 마을을 벗어나지 못한 흐름을 잇는다. 한 줄의 수면을 기준으로 위쪽에는 고요한 지붕·굴뚝·나무, 아래쪽에는 흐려진 벽·기초·수초·빛결을 배치했다.

- 원경: 옅은 하늘, 단일 수면선, 멀리 잠긴 마을과 수중으로 흐려지는 하부 실루엣
- 중경: 물 밖 지붕과 수중 벽이 함께 보이는 분리된 집 군집
- 근경: 낮은 돌·수초·울타리 끝·기포·수중 빛줄기
- 충돌 지형: 황토색 노출 지붕과 창문을 성기게 배치한 청회색 잠긴 회벽·석재 바닥
- 수면 효과: 4프레임 수면선, 4프레임 빛결, 6프레임 기포
- 캐릭터: 실세아·감자89 기본/유니콘 수영 6프레임. 달리기·구르기 시트를 기반으로 해 물속에서 불필요한 날개가 생기지 않고, 유니콘 뿔은 각 프레임에 합쳐진 채 유지된다.
- 수면 회복: 별도 호흡 시트 대신 수면의 흰 경계·호흡 지점 광택·기포·`숨 회복` HUD로 판독한다.
- 오디오: 경고음을 가리지 않는 84 BPM의 잔잔한 `bgm_submerged`

## 최종 검토 화면

| 구간/모드 | 화면 | 확인 결과 |
|---|---|---|
| 진입 | `references/p5-final-entry.png` | 넓은 노출 지붕, 한 줄 수면, 다른 침수 마을의 원·중·근경이 함께 읽힘 |
| 짧은 잠수 | `references/p5-final-short-swim.png` | 날개 없는 실세아 수영과 수면·빛결·기포, 다음 호흡 지점이 함께 보임 |
| 긴 잠수·유니콘 | `references/p5-final-long-unicorn-swim.png` | 수영 프레임에 합쳐진 뿔이 말과 분리되지 않고 유지됨 |
| 복합 잠수·감자89·숨 0 | `references/p5-final-combination-potato-unicorn.png` | 감자89 유니콘 수영, 빈 숨 게이지와 HP 감소가 같은 화면에서 확인됨 |
| 수면 회복 | `references/p5-final-recovery.png` | 머리가 수면 위에 있을 때 `숨 회복`과 채워지는 게이지가 노출됨 |
| 도형 fallback | `references/p5-final-fallback.png` | 이미지가 없어도 수면 흰 선·호흡 지점·수중 캐릭터·숨 HUD가 유지됨 |
| 스테이지 선택 | `references/p5-final-stage-select.png` | 5번 카드의 잠긴 마을 미리보기·설명·순차 잠금 상태가 잘리지 않음 |

배경 합성은 `references/background-submerged-preview.png`, 지형은 `references/submerged-tileset-preview.png`, 수면 효과는 `references/submerged-effects-preview.png`, 두 캐릭터의 기본/유니콘 24개 수영 프레임은 `references/character-swim-contact-sheet.png`에서 한 번에 확인한다.

## 저장 경로

### 게임 런타임 에셋

- `assets/backgrounds/bg_submerged_far.png`
- `assets/backgrounds/bg_submerged_mid.png`
- `assets/backgrounds/bg_submerged_near.png`
- `assets/backgrounds/stage_preview_submerged.png`
- `assets/tiles/submerged_village_tileset.png`, `assets/tiles/submerged_village_tileset.json`
- `assets/effects/fx_water_surface.png`
- `assets/effects/fx_water_caustics.png`
- `assets/effects/fx_bubble.png`
- `assets/characters/silsea/silsea_swim.png`
- `assets/characters/silsea/silsea_unicorn_swim.png`
- `assets/characters/potato89/potato89_swim.png`
- `assets/characters/potato89/potato89_unicorn_swim.png`
- `assets/audio/bgm/bgm_submerged.wav`

### 재현용 생성 원본

- `assets/_source/submerged/final/bg_submerged_far_generated.png`
- `assets/_source/submerged/final/bg_submerged_mid_generated.png`
- `assets/_source/submerged/final/bg_submerged_near_generated.png`

`npm run submerged:assets`는 생성 원본의 밝은 체크 배경을 정리하고 승인 팔레트로 양자화한 뒤 2048×720 반복 배경·수면 효과·선택 카드·검토 이미지를 다시 만든다. `node scripts/generate-submerged-tiles.js`는 64px·2px extrusion 타일셋을, `node scripts/build-swim-assets.js`는 두 캐릭터의 기본/유니콘 수영 시트를, `npm run audio`는 P5 BGM을 결정적으로 재생성한다.

## 생성 도구와 후처리

- 도구 모드: Codex 내장 이미지 생성 도구(`imagegen`), 기본 built-in 모드, 로컬 CLI 미사용
- 승인된 P5 앵커는 장소·수면 위치·원근 구도의 기준으로, P4 최종 레이어는 프로젝트 화풍·생산 형식의 기준으로만 사용했다.
- 원경·중경·근경 생성 결과는 각각 위의 재현용 원본 경로에 복사했다.
- 중경·근경의 밝은 체크 배경은 `scripts/build-submerged-assets.js`에서 밝고 중성인 픽셀 범위로 판별해 투명도로 바꿨다.
- 최종 PNG는 승인 팔레트로 양자화하고 알파 경계를 정리했으며 2048×720, 좌우 2열 seam 동일 계약을 유지한다.
- 수면·빛결·기포, 타일셋, 수영 시트, 선택 카드는 로컬 결정적 스크립트로 제작했다. 수영 시트는 날개 없는 기존 이동 프레임을 먼저 128px 단위로 추출한 뒤 회전·기포를 합성해 뿔과 몸의 프레임 정렬을 보존한다.

## 최종 프롬프트 세트

### 원경

```text
Use case: stylized-concept
Asset type: final FAR parallax background source for a child-friendly 2D side-scrolling game
Primary request: Create the far background layer for the approved P5 “Submerged Village”, a different quiet village flooded after the tsunami. Image 1 is the approved composition and setting anchor: use its single horizontal waterline, distant rooftops, chimneys, treetops and rounded hills, but do not reproduce the foreground gameplay roofs or lower module strip. Image 2 is a style/production reference only: match its cozy hand-painted cel-cartoon treatment, rounded simplified silhouettes, restrained texture and quiet open gameplay area, but do not copy its coastal land layout.
Scene/backdrop: pale daylight sky above a crisp waterline around 42 percent from the top; very distant flooded village roofs, chimneys, church-like tower silhouettes and treetops emerging above water; below the line, softened ghostlike lower house silhouettes and stone foundations fading into deep teal water with a few broad light shafts.
Composition/framing: wide 16:9 opaque background, edge-to-edge, horizontally repeat-friendly with quiet similar edge values; all landmarks stay distant and low contrast; leave the center play corridor uncluttered.
Style/medium: original cozy 2D cel-cartoon game background, clean dark-teal line accents, two-to-three-tone shapes, no photorealism, no 3D, no pixel art.
Color palette: use only an approximate visual match to #D9F3FA sky, #A8AA96 and #BFC596 distant village, #4691A2 water, #214D59 deep water, #F4FBFD light shafts, #42474E sparse outlines. Final pipeline will quantize exactly.
Lighting/mood: calm, safe, hopeful daylight after a disaster.
Constraints: opaque background; no foreground platforms; no standable roofs; no characters; no animals; no enemies; no collectibles; no gate; no HUD; no UI; no text; no labels; no arrows; no wave wall; no rain; no lightning; no victims; no floating belongings; no severe wreckage; no logos; no watermark.
```

### 중경

```text
Use case: stylized-concept
Asset type: final transparent MID parallax background source for a child-friendly 2D side-scrolling game
Primary request: Create only the middle-distance scenery layer for the approved P5 “Submerged Village”. Image 1 is the approved anchor: use its quiet flooded-village identity, rooftops and chimneys above one waterline, softened lower walls below it. Do not reproduce its foreground gameplay roofs, water fill, floor, or module strip. Image 2 is a style/production reference only: match its separated transparent scenery clusters, cozy cel-cartoon linework and restrained detail, but design a different village.
Subject: five separated clusters of distant cream village houses and sloped ochre roofs; each cluster begins around the central waterline, with rooftops/chimneys/treetops above and faded blue-green walls, windows and stone foundation fragments extending a short distance below; generous gaps between clusters.
Composition/framing: wide 16:9 canvas with genuinely transparent background; scenery occupies mainly the middle band from about 28 to 75 percent height; no continuous strip, no filled sky, no filled water; keep the gameplay corridor and bottom clear; horizontally repeat-friendly with sparse quiet edges.
Style/medium: original cozy 2D cel-cartoon game layer, controlled #42474E-like outlines, two-to-three-tone shading, simplified rounded child-friendly architecture.
Color palette: approximate #FFF6D8 walls, #D09A4E and #5D4326 roofs/wood, #A8AA96 and #BFC596 distance, #4691A2 and #214D59 submerged fade, #F4FBFD highlights. Final pipeline will quantize exactly.
Lighting/mood: calm safe daylight, slightly desaturated underwater portions.
Constraints: transparent background and preserved alpha; isolated middle-distance clusters only; no foreground standable roofs; no collision platforms; no full-screen water rectangle; no characters; no animals; no enemies; no collectibles; no UI; no text; no labels; no wave; no victims; no debris; no severe damage; no logos; no watermark; no photorealism; no 3D; no pixel art.
```

### 근경

```text
Use case: stylized-concept
Asset type: final transparent NEAR parallax decoration layer source for a child-friendly 2D side-scrolling game
Primary request: Create only low foreground accents for the approved P5 “Submerged Village”. Image 1 is the approved anchor: derive its underwater bubbles, soft downward light shafts, submerged plants and stone-edge mood, without reproducing gameplay roofs, buildings, water fill, or module strip. Image 2 is a style/production reference only: match its separated low clusters and controlled cel-cartoon detail, but replace tsunami spray and wind-bent shrubs with calm underwater motifs.
Subject: six separated low clusters of rounded submerged stones, sparse ribbon-like aquatic plants, short broken fence tips almost buried in water, small bubble trails, thin pale caustic arcs and narrow downward light streaks; clusters vary in width and remain low.
Composition/framing: wide 16:9 canvas with genuinely transparent background; all opaque scenery confined to the bottom 22 percent, with only a few very faint light streaks reaching at most 48 percent height; generous transparent gaps; horizontally repeat-friendly quiet edges; never cover the player route or collision surfaces.
Style/medium: original cozy 2D cel-cartoon game layer, clean controlled outlines and simplified two-to-three-tone shapes.
Color palette: approximate #214D59 deep teal, #4691A2 water teal, #A8AA96 submerged stone, #BFC596 plants, #F4FBFD bubbles and caustics, #42474E sparse outlines. Final pipeline will quantize exactly.
Lighting/mood: quiet underwater shimmer, safe and hopeful.
Constraints: transparent background and preserved alpha; isolated low decoration clusters only; no filled sky; no full-screen water; no continuous ground strip; no houses; no standable roofs; no platforms; no characters; no animals; no enemies; no collectibles; no UI; no text; no labels; no wave; no debris; no victims; no logos; no watermark; no photorealism; no 3D; no pixel art.
```

## 자동·런타임 확인

- `npm run test`, `npm run build`, `npm run validate` 통과
- manifest 176개(시각 132·오디오 44), mapping 125개, 런타임 파일 181개 정합성 검사 통과
- 캐릭터 110프레임·시트 44개, 타일셋 5개, 배경 18개, 환경 효과 7개, 오디오 44개 규격·팔레트·알파·seam·WAV 검사 통과
- 5개 타일셋의 64px frame·2px extrusion과 P5 전용 2048×720 배경의 투명도·좌우 seam 검사 통과
- 실제 브라우저에서 진입·짧은 잠수·유니콘 긴 잠수·감자89 숨 0 피해·수면 회복·fallback·5번 선택 카드를 확인함
- 최종 검토한 모든 화면에서 브라우저 경고·오류가 없음을 확인함
- 프로덕션 빌드의 Phaser 청크 크기 경고는 기존 비차단 경고이며 빌드는 정상 완료됨

## 사용자 최종 확인 게이트

- 쓰나미를 맞던 앞 마을과 다른, 파도가 지나간 뒤의 고요한 침수 마을로 보이는가
- 수면 위 지붕과 수중 통로·단단한 바닥·다음 호흡 지점이 한눈에 구분되는가
- 실세아·감자89의 수영이 날개 없는 수중 동작으로 읽히고 유니콘 뿔이 모든 프레임에서 몸에 붙어 있는가
- 숨 부족·숨 0 HP 피해·수면 회복이 그림과 HUD만으로 이해되는가
- BGM과 5번 선택 카드가 앞 스테이지에서 이어지는 분위기에 어울리는가

최종 게이트는 사용자의 `P5 최종 승인` 뒤 통과 처리하고 P5 최종 통합 변경을 완료 커밋한다.
