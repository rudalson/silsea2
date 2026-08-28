# 이미지 에셋 목록

> 제작에 들어간 키는 `references/mapping.json`에 동일한 이름으로 등록한다. 확장 계획 키는 각 회색 상자 승인 뒤 등록한다.
> 우선순위: M=Must, S=Should, C=Could. Must 검증 전 Should/Could를 제작하지 않는다.

## 공통 제작 규격

- 캐릭터/적: 투명 PNG, 128×128 프레임, 우향 기준, 프레임별 duration manifest.
- 아이템: 96×96 또는 128×128 투명 PNG, 화면 표시 48~72px.
- 배경: 높이 720px 이상, 폭 2048/3072px, seamless.
- 타일: 64px 그리드, 코드 생성, 2px extrude.
- 효과와 그림자는 본체에서 분리한다.

## 캐릭터

| 키 | 우선 | 프레임 | 용도 |
|---|---|---:|---|
| `silsea_idle` | M | 4 | 기본 대기 |
| `silsea_run` | M | 8 | contact/down/pass/up 달리기 |
| `silsea_jump_up` | M | 2 | 점프 상승 |
| `silsea_fall` | M | 2 | 낙하 |
| `silsea_land` | M | 2 | 착지 |
| `silsea_hurt` | M | 2 | 피격 |
| `silsea_transform_unicorn` | M | 6 | 뿔 추가 변신 |
| `silsea_transform_pegasus` | M | 6 | 날개 추가 변신 |
| `silsea_transform_alicorn` | M | 8 | 뿔+날개 피버 변신 |
| `silsea_fly` | M | 6 | 비행 |
| `silsea_victory` | M | 6 | 클리어 |
| `potato89_idle` | M | 4 | 기본 대기 |
| `potato89_roll` | M | 8 | 구르기/달리기 |
| `potato89_jump_up` | M | 2 | 점프 상승 |
| `potato89_fall` | M | 2 | 낙하 |
| `potato89_land` | M | 2 | 착지 |
| `potato89_hurt` | M | 2 | 피격 |
| `potato89_stomp` | M | 4 | 밟기 강조 |
| `potato89_transform_unicorn` | M | 6 | 뿔 추가 변신 |
| `potato89_transform_pegasus` | M | 6 | 날개 추가 변신 |
| `potato89_transform_alicorn` | M | 8 | 뿔+날개 피버 변신 |
| `potato89_fly` | M | 6 | 비행 |
| `potato89_victory` | M | 6 | 클리어 |

## 적과 보스

| 키 | 우선 | 애니메이션/프레임 |
|---|---|---|
| `raw_potato` | M | idle 2, roll 6, defeated 4 |
| `spike_pumpkin` | M | idle 2, warning 2, break 6 |
| `dark_cloud` | M | idle 4, charge 4, attack 3, defeated 4 |
| `magpie` | M | fly 6, warning 3, dive 4, stunned 4, defeated 4 |
| `potato_king` | M | idle 4, jump 4, fall 2, land 4, shoot 4, hurt 3, defeated 8 |

## 아이템과 진행 오브젝트

| 키 | 우선 | 크기 | 실루엣 |
|---|---|---:|---|
| `item_star` | M | 96 | 5각 별 |
| `item_percent_small` | M | 96 | 작은 원 토큰 |
| `item_percent_large` | M | 128 | 큰 이중 원 토큰 |
| `item_horn` | M | 96 | 나선 원뿔 |
| `item_wings` | M | 96 | 깃털 날개 한 쌍 |
| `item_alicorn` | M | 128 | 뿔+날개 |
| `checkpoint_flag` | M | 128 | 둥근 깃발 |
| `rainbow_gate` | M | 128 | 큰 아치 |

## 배경

| 키 | 우선 | 무드 | 레이어 |
|---|---|---|---|
| `bg_normal_far` | M | 일반 | far |
| `bg_normal_mid` | M | 일반 | mid |
| `bg_normal_near` | M | 일반 | near |
| `bg_pit_far` | M | 낭떠러지 | far |
| `bg_pit_mid` | M | 낭떠러지 | mid |
| `bg_pit_near` | M | 낭떠러지 | near |
| `bg_boss_far` | M | 보스룸 | far |
| `bg_boss_mid` | M | 보스룸 | mid |
| `bg_boss_near` | M | 보스룸 | near |

하늘 `sky`는 이미지 에셋이 아니라 코드 그라디언트이므로 목록과 매핑에서 제외한다.

## 타일과 장식

| 키 | 우선 | 제작 방식/내용 |
|---|---|---|
| `grass_tileset` | M | 코드 생성: 중앙, 모서리, 안쪽 모서리, 낭떠러지, 발판, 흙, 잔디, 경사 |
| `decor_flower` | S | 하단 장식, 충돌 없음 |
| `decor_grass` | S | 하단 장식, 충돌 없음 |
| `decor_rock` | S | 하단 장식, 충돌 없음 |
| `decor_sign` | S | 문자 없는 방향 표지 |

## 효과

| 키 | 우선 | 용도 |
|---|---|---|
| `fx_shadow_oval` | M | 캐릭터/적 공용 발 그림자 |
| `fx_dust` | M | 착지 먼지 |
| `fx_item_glow` | M | 아이템 후광 |
| `fx_magnet_trail` | M | 자석 별 궤적 |
| `fx_transform_flash` | M | 변신 플래시·별 입자 |
| `fx_alicorn_overlay` | M | 무지개 피버 오버레이 |
| `fx_attack_marker` | M | 까치·번개 지면 표식 |
| `fx_lightning` | M | 먹구름 번개 |
| `fx_quake_wave` | M | 보스 착지 지진 |
| `fx_weakpoint_star` | M | 보스 약점 표시 |
| `fx_stolen_percent` | M | 까치에게서 회수할 점수 조각 |

## UI

| 키 | 우선 | 용도 |
|---|---|---|
| `ui_portrait_silsea` | M | 캐릭터 선택/HUD |
| `ui_portrait_potato89` | M | 캐릭터 선택/HUD |
| `ui_form_base` | M | 기본형 상태 |
| `ui_form_unicorn` | M | 유니콘 상태 |
| `ui_form_pegasus` | M | 페가수스 상태 |
| `ui_form_alicorn` | M | 알리콘 상태 |
| `ui_hp` | M | HP 아이콘 |
| `ui_flight_gauge` | M | 비행 게이지 프레임 |
| `ui_fever_gauge` | M | 알리콘 남은 시간 |
| `ui_boss_hp` | M | 보스 HP 프레임 |
| `ui_panel` | M | 공용 둥근 패널 9-slice |
| `ui_button` | M | 공용 버튼 9-slice |
| `ui_pause` | M | 일시정지 아이콘 |
| `ui_accessibility` | S | 접근성 메뉴 아이콘 모음 |

## 신규 스테이지 확장 에셋

> 확장 P0 승인 · 2026-08-25 / 현재 상태: P2·P3·P4·P5 최종 승인 완료 · P6 최종 에셋 제작·등록 완료, 최종 승인 대기
> 아래 키는 발주 단위를 잠근 계획 키다. 회색 상자와 흑백 앵커 승인 전에는 이미지 생성·manifest·mapping 등록을 하지 않는다.

### 캐릭터

| 키 | 우선 | 프레임 | 제작 게이트 |
|---|---|---:|---|
| `silsea_swim`, `silsea_unicorn_swim` | M | 각 6 | 제작·등록·최종 승인 완료 |
| `potato89_swim`, `potato89_unicorn_swim` | M | 각 6 | 제작·등록·최종 승인 완료 |
| `silsea_breathe` | C | 2 | 코드 피드백만으로 수면 회복이 읽히지 않을 때 |
| `potato89_breathe` | C | 2 | 코드 피드백만으로 수면 회복이 읽히지 않을 때 |
| `silsea_wing_guard` | S | 4 | 제작·등록 완료, 최종 승인 대기 |
| `potato89_wing_guard` | S | 4 | 제작·등록 완료, 최종 승인 대기 |

좌향 진행은 기존 우향 프레임을 런타임에서 반전하므로 좌향 달리기·수영 시트를 따로 만들지 않는다.

### 배경과 선택 카드

| 스테이지 | 배경 키 | 선택 카드 | 우선 |
|---|---|---|---|
| 별빛 숲 | `bg_starlight_far`, `bg_starlight_mid`, `bg_starlight_near` | `stage_preview_starlight` | M |
| 안개 골짜기 | `bg_mist_far`, `bg_mist_mid`, `bg_mist_near` | `stage_preview_mist` | M |
| 쓰나미 마을 | `bg_tsunami_far`, `bg_tsunami_mid`, `bg_tsunami_near` | `stage_preview_tsunami` | M |
| 물에 잠긴 마을 | `bg_submerged_far`, `bg_submerged_mid`, `bg_submerged_near` | `stage_preview_submerged` | M |

- 각 배경은 far/mid/near 3레이어, 2048×720 이상, 좌우 seamless로 만든다.
- 선택 카드는 실제 회색 상자 구도를 승인한 뒤 캡처 기반으로 제작한다.
- 스테이지 2~5 배경은 기존 무지개 언덕의 단순 색상 변형으로 만들지 않는다.
- P2 별빛 숲은 승인된 흑백 앵커를 기반으로 배경 3레이어와 `stage_preview_starlight`를 제작·등록했다. 최종 화면은 `references/P2_STARLIGHT_FINAL_REVIEW.md`에서 확인한다.
- P3 안개 골짜기는 2026-08-26 코스·흑백 앵커·최종 화면을 승인했다. 승인 팔레트 기반 배경 3레이어·선택 카드·타일·안개/비콘/바람 효과를 제작·등록했으며 최종 화면은 `references/P3_MIST_FINAL_REVIEW.md`에서 확인한다.
- P4 쓰나미 마을은 역방향 코스와 앵커를 승인·커밋했다. 전용 배경 3레이어·선택 카드·64px 타일·열린 집 2종·언덕·파도/경고 효과를 제작·등록했고, 2026-08-27 `P4 최종 승인`으로 잠갔다.
- P5 물에 잠긴 마을은 코스·흑백 앵커·최종 화면을 승인했다. 전용 배경 3레이어·선택 카드·64px 타일·수면/빛결/기포·두 캐릭터 기본/유니콘 수영 시트를 제작·등록했고 2026-08-28 `P5 최종 승인`으로 잠갔다.

### 타일·장식·환경 효과

| 키 | 우선 | 내용 | 제작 게이트 |
|---|---|---|---|
| `starlight_tileset` | M | 별빛 숲 64px 지형 | 제작·등록 완료 |
| `decor_star_tree` | M | 종료 지점 별나무 랜드마크 | 제작·등록 완료 |
| `decor_moon_branch` | M | 달빛 나뭇가지 | 제작·등록 완료 |
| `decor_firefly` | M | 반딧불 장식 | 제작·등록 완료 |
| `decor_star_flower` | M | 별꽃 장식 | 제작·등록 완료 |
| `mist_tileset` | M | 안개 골짜기 64px 지형 | 제작·등록 완료 |
| `fx_mist_bank` | M | 반복 안개층 | 제작·등록 완료 |
| `fx_mist_clear` | M | 안개 걷힘 효과 | 제작·등록 완료 |
| `fx_mist_beacon` | M | 안개 위로 솟는 나선형 돌 비콘 | 제작·등록 완료 |
| `fx_mist_breeze` | M | 이동 방향을 알리는 바람 리본·잎 단서 | 제작·등록 완료 |
| `village_tileset` | M | 집·길·언덕 64px 지형 | 제작·등록·최종 승인 완료 |
| `shelter_house_open`, `shelter_house_weathered` | M | 입구가 읽히는 열린 집 2종 | 제작·등록·최종 승인 완료 |
| `shelter_hill` | M | 바람 방향이 읽히는 낮은 자연 언덕 | 제작·등록·최종 승인 완료 |
| `fx_tsunami_wave` | M | 화면 높이 파도 8프레임 | 제작·등록·최종 승인 완료 |
| `fx_tsunami_warning` | M | 오른쪽 접근·왼쪽 이동 경고 표식 | 제작·등록·최종 승인 완료 |
| `submerged_village_tileset` | M | 침수 집·수면·바닥 64px 지형 | 제작·등록·최종 승인 완료 |
| `fx_water_surface` | M | 실제 회복 경계를 보여주는 수면 | 제작·등록·최종 승인 완료 |
| `fx_water_caustics` | M | 물속 빛결 | 제작·등록·최종 승인 완료 |
| `fx_bubble` | M | 수중 이동 기포 | 제작·등록·최종 승인 완료 |

안개·물·쓰나미의 넓은 화면 효과는 작은 반복 텍스처와 코드 파티클을 조합해 성능 예산을 지킨다.

### UI

| 키 | 우선 | 용도 |
|---|---|---|
| `ui_breath_icon` | M | 색만으로 구분하지 않는 숨 식별 아이콘 |
| `ui_breath_frame` | M | 기존 HUD 화풍의 숨 게이지 프레임 |
| `ui_reverse_arrow` | M | 문자 없이 왼쪽 진행을 알리는 시작 안내 |
| `ui_tsunami_warning` | M | 화면 오른쪽의 접근 방향·남은 시간 경고 |

숨 채움 막대와 파도 남은 시간은 코드 도형으로 구현한다. `화면 효과 강도: 약하게`와 화면 흔들림 Off에서도 경고를 판독할 수 있어야 한다.

### P6 Should와 Could

| 키 | 우선 | 구성 | 상태 |
|---|---|---|---|
| `potato_archer` | S | idle 2, aim 3, shoot 3, defeated 4 | 제작·등록 완료, 최종 승인 대기 |
| `projectile_arrow` | S | 화살 1종, 런타임 회전 | 제작·등록 완료, 최종 승인 대기 |
| `laser_emitter` | S | 레이저 발사기 1종 | 제작·등록 완료, 최종 승인 대기 |
| `laser_switch_on` | S | 켜진 스위치 | 제작·등록 완료, 최종 승인 대기 |
| `laser_switch_off` | S | 꺼진 스위치 | 제작·등록 완료, 최종 승인 대기 |
| `fx_laser_beam` | S | 반복 빔 | 제작·등록 완료, 최종 승인 대기 |
| `fx_laser_warning` | S | 발사 예고 | 제작·등록 완료, 최종 승인 대기 |
| `item_air_bubble` | C | 공기주머니 3프레임 또는 코드 도형 | 숨 리듬 보강 필요 시 |

중간 보스 키와 프레임 수는 별도 영상 승인 뒤 추가한다. 외형·패턴을 추측해 선제작하지 않는다.

### Must 제작량 기준선

중간 보스와 P6 Should를 제외하고 배경 4세트·12레이어, 지형 타일 4세트, 선택 카드 4장, 장식·핵심 효과 약 12~14종, 수영 2캐릭터·12프레임, HUD 이미지 4종을 기본 발주량으로 잡는다. 이는 상한이 아니라 중복 제작을 막는 기준선이며 P7에서 승인된 파일을 다시 만들지 않는다.

## 제작 순서

1. 공용 팔레트와 캐릭터 Locked Description 승인.
2. 캐릭터별 우향 contact pose 앵커 1장 생성 및 승인.
3. 캐릭터 나머지 프레임.
4. 적·아이템·UI.
5. 배경 3무드×3레이어.
6. 코드 생성 타일과 장식.
7. 효과.
8. 팔레트 양자화, 정렬, 스프라이트 시트 조립, 자동 검증.

확장 에셋은 P2~P6 각 단계에서 `회색 상자 → 흑백 앵커 → 사용자 승인 → 최종본` 순서로 제작한다. P7은 누락 에셋과 manifest·mapping 연결만 마무리한다.
