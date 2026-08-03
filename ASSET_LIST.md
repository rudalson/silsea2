# 이미지 에셋 목록

> 모든 키는 `references/mapping.json`에 동일한 이름으로 등록한다.  
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

## 제작 순서

1. 공용 팔레트와 캐릭터 Locked Description 승인.
2. 캐릭터별 우향 contact pose 앵커 1장 생성 및 승인.
3. 캐릭터 나머지 프레임.
4. 적·아이템·UI.
5. 배경 3무드×3레이어.
6. 코드 생성 타일과 장식.
7. 효과.
8. 팔레트 양자화, 정렬, 스프라이트 시트 조립, 자동 검증.
