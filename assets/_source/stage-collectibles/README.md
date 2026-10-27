# 스테이지별 수집물 원화

내장 `image_gen`으로 각 아이템을 별도로 생성했습니다. 기존 `assets/items/item_star.png`는 화풍·부드러운 하이라이트의 참조로만 사용했고 원본은 변경하지 않았습니다. 정확한 요청은 `prompts.json`에 보존했습니다.

| 스테이지 | 새 수집물 | 생성 원본 / 게임용 PNG |
|---|---|---|
| 메롱 왕국 | 왕관 보석 | `item_merong_crown.png` |
| 테이프 도시 | 테이프 조각 | `item_tape_ribbon.png` |
| 피아노 나라 | 음표 보석 | `item_music_note.png` |
| 구멍 코스 | 고리 보석 | `item_hole_ring.png` |
| 구름 코스 | 빗방울 보석 | `item_cloud_drop.png` |

이 폴더에는 생성 원본을 저장하고 게임용 투명 PNG는 `assets/items/`, 검증 기준본은 `assets/_anchor/`에 같은 이름으로 보존합니다. 고리의 중앙도 실제 투명 알파입니다.

재조립: `node scripts/build-stage-collectibles.js`. 원본을 투명 실루엣으로 자른 뒤 비율을 유지해 최대 72×70px로 줄이고 기존 수집물과 같은 128×128px 프레임 중앙에 배치합니다. 실제 크기는 `frames.json`에 기록합니다. 금빛 테두리·진한 외곽선·반짝임을 공통으로 사용해 작은 화면에서도 수집물임을 알아볼 수 있게 했습니다.

게임 규칙은 `star` 수집과 같은 점수·콤보·자석·목표 판정을 유지합니다. 앞의 다섯 스테이지는 기존 별을 사용합니다.
