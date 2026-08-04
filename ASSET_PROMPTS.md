# 에셋 생성 프롬프트

> Phase 3 실행 전용 설계. Phase 0에서는 생성하지 않는다.  
> 모든 행의 상태는 팔레트·Locked Description·스타일 앵커 승인 전까지 `대기`다.

## 고정 상수

`REFERENCE_STYLE`:

> "첨부한 실세아 레퍼런스의 2D 셀 카툰 표현을 따른다. 둥글고 명확한 실루엣, 128px 기준 3~4px의 색상 외곽선, 최대 3톤 셰이딩, 좌상단 광원, 고채도 상호작용 요소와 저채도 배경을 사용하고 그라디언트 셰이딩은 사용하지 않는다."

`NEGATIVE_COMMON`:

> "정면 시점, 3/4 시점, 원근 왜곡, 잘린 신체, 추가 팔다리, 여러 캐릭터, 배경, 텍스트, 숫자, 로고, 워터마크, 복잡한 그림자, 그라디언트, 모션 블러, 프레임 바깥으로 잘린 뿔이나 날개, 프레임마다 달라지는 의상과 얼굴, 사실적 렌더링, 3D 렌더링, 픽셀 아트"

`SILSEA_LOCKED`와 `POTATO89_LOCKED`는 `CHARACTER_BIBLE.md`의 Locked Description을 문자 그대로 삽입한다.

## 생성 규칙

1. `references/mapping.json`의 `styleRefs` 전량을 실제 첨부한다.
2. 캐릭터/적은 승인된 Style Anchor를 추가 첨부한다.
3. 표의 프레임 수만큼 **한 프레임씩 별도 생성**한다. 한 이미지에 여러 포즈를 요청하지 않는다.
4. 캐릭터별 Seed는 전 프레임에서 동일하게 유지한다.
5. 128×128 투명 캔버스, 캐릭터 높이 96px, 발 기준선 16px, 우향 측면을 고정한다.
6. 배경 제거 → 팔레트 양자화 → 중심/발 정렬 → 시트 조립 → 자동 검증 순서를 지킨다.
7. 타일셋은 이미지 생성 모델에 보내지 않는다.

## 캐릭터 프레임 템플릿

```text
[첨부: mapping.json의 styleRefs 전량 + Style Anchor]
[REFERENCE_STYLE]
[LOCKED_DESCRIPTION]

2D 횡스크롤 게임용 캐릭터 스프라이트. 오른쪽을 바라보는 완전한 측면 모습.
현재 자세: [POSE]. 키포즈 역할은 [KEY_POSE].
전신이 모두 보이며 128×128 프레임 중앙 하단, 발 기준선 16px에 정렬한다.
캐릭터 높이는 정확히 96px. 투명 배경, 바닥 그림자와 이펙트 없음.
색상은 data/palette.js에 있는 HEX로만 제한한다.
[NEGATIVE_COMMON]
```

### 캐릭터 작업표

| 에셋 키 | 프레임 | 포즈 지시 | Seed | Anchor | StyleRefs | 상태 |
|---|---:|---|---:|---|---|---|
| `silsea_idle` | 4 | 안정→숨 들이쉼→갈기 반응→복귀 | 190701 | `silsea_anchor.png` | mapping | 2026-08-03 생성·정렬·시트 조립 완료 |
| `silsea_run` | 8 | contact×2→down×2→pass×2→up×2 | 190701 | `silsea_anchor.png` | mapping | 2026-08-03 생성·정렬·시트 조립 완료 |
| `silsea_jump_up` | 2 | 준비 압축→상승 다리 모음 | 190701 | `silsea_anchor.png` | mapping | 2026-08-03 생성·정렬·시트 조립 완료 |
| `silsea_fall` | 2 | 최고점 중립→안전한 낙하 자세 | 190701 | `silsea_anchor.png` | mapping | 2026-08-03 생성·정렬·시트 조립 완료 |
| `silsea_land` | 2 | 80ms 접지 압축→120ms 복귀 | 190701 | `silsea_anchor.png` | mapping | 2026-08-03 생성·정렬·시트 조립 완료 |
| `silsea_hurt` | 2 | 짧은 뒤밀림→회복, 무서운 표정 금지 | 190701 | `silsea_anchor.png` | mapping | 2026-08-03 생성·정렬·시트 조립 완료 |
| `silsea_transform_unicorn` | 6 | 준비→빛 집중→뿔 형성→별 파동→안정→완성 300ms | 190701 | `silsea_anchor.png` | mapping | 2026-08-03 생성·정렬·시트 조립 완료 |
| `silsea_transform_pegasus` | 6 | 준비→등 빛→날개 펼침→첫 날갯짓→안정→완성 300ms | 190701 | `silsea_anchor.png` | mapping | 2026-08-03 생성·정렬·시트 조립 완료 |
| `silsea_transform_alicorn` | 8 | 준비→빛→뿔→날개→무지개 파동→부유→안정→완성 300ms | 190701 | `silsea_anchor.png` | mapping | 2026-08-03 생성·정렬·시트 조립 완료 |
| `silsea_fly` | 6 | 날개 down→contact→up→peak→pass→복귀 | 190701 | `silsea_anchor.png` | mapping | 2026-08-03 생성·정렬·시트 조립 완료 |
| `silsea_victory` | 6 | 놀람→앞발 들기→기쁨→갈기 반동→안정→완성 | 190701 | `silsea_anchor.png` | mapping | 2026-08-03 생성·정렬·시트 조립 완료 |
| `potato89_idle` | 4 | 안정→숨 들이쉼→볼 반동→복귀 | 890089 | `potato89_anchor.png` | mapping | 2026-08-03 생성·정렬·시트 조립 완료 |
| `potato89_roll` | 8 | contact×2→down×2→pass×2→up×2, 통통한 무게감 | 890089 | `potato89_anchor.png` | mapping | 2026-08-03 생성·정렬·시트 조립 완료 |
| `potato89_jump_up` | 2 | 깊은 준비 압축→짧은 다리 모음 | 890089 | `potato89_anchor.png` | mapping | 2026-08-03 생성·정렬·시트 조립 완료 |
| `potato89_fall` | 2 | 최고점 중립→볼·배가 살짝 뜨는 낙하 | 890089 | `potato89_anchor.png` | mapping | 2026-08-03 생성·정렬·시트 조립 완료 |
| `potato89_land` | 2 | 80ms 넓은 접지→120ms 복귀 | 890089 | `potato89_anchor.png` | mapping | 2026-08-03 생성·정렬·시트 조립 완료 |
| `potato89_hurt` | 2 | 짧은 뒤밀림→회복, 귀여움 유지 | 890089 | `potato89_anchor.png` | mapping | 2026-08-03 생성·정렬·시트 조립 완료 |
| `potato89_stomp` | 4 | 다리 모음→하강→강한 접지→복귀 | 890089 | `potato89_anchor.png` | mapping | 2026-08-03 생성·정렬·시트 조립 완료 |
| `potato89_transform_unicorn` | 6 | 통통한 기본형 유지, 뿔만 형성 | 890089 | `potato89_anchor.png` | mapping | 2026-08-03 생성·정렬·시트 조립 완료 |
| `potato89_transform_pegasus` | 6 | 통통한 기본형 유지, 날개만 형성 | 890089 | `potato89_anchor.png` | mapping | 2026-08-03 생성·정렬·시트 조립 완료 |
| `potato89_transform_alicorn` | 8 | 기본형 유지, 뿔+날개+무지개 파동 | 890089 | `potato89_anchor.png` | mapping | 2026-08-03 생성·정렬·시트 조립 완료 |
| `potato89_fly` | 6 | 통통한 체형 유지, 날개 down→contact→up→peak→pass→복귀 | 890089 | `potato89_anchor.png` | mapping | 2026-08-04 생성·정렬·시트 조립 완료 |
| `potato89_victory` | 6 | 놀람→짧은 점프→볼 반동→기쁨→안정→완성 | 890089 | `potato89_anchor.png` | mapping | 2026-08-04 생성·정렬·시트 조립 완료 |

각 행은 실행 시 `에셋키_00`, `에셋키_01`처럼 프레임별 행으로 확장하고, 프롬프트·Seed·Anchor·StyleRefs·채택 상태를 각각 기록한다.

## 적 Locked Description과 템플릿

| 키 | Locked Description | Seed | Anchor |
|---|---|---:|---|
| `raw_potato` | "낮고 둥근 생감자 적으로, 울퉁불퉁한 몸과 작고 짧은 다리, 졸린 큰 눈을 지닌다. 구를 때만 몸이 단단한 타원으로 모이며 무섭기보다 장난스러운 인상이다." | 210101 | `raw_potato_anchor.png` |
| `spike_pumpkin` | "둥근 호박 몸에서 바깥으로 짧은 삼각 가시가 뻗은 고정 위험물이다. 평소에는 웅크리고 경고 중에는 가시와 꼭지가 위로 서며 위험색 면적이 커진다." | 210102 | `spike_pumpkin_anchor.png` |
| `dark_cloud` | "낮고 넓은 먹구름 적으로, 둥근 구름 덩어리 아래에 뾰족한 번개 꼬리가 보인다. 충전 중 내부가 밝아지고 몸이 수축해 공격 시점을 명확하게 알린다." | 210103 | `dark_cloud_anchor.png` |
| `magpie` | "검고 흰 큰 색면과 긴 꼬리, 뾰족한 부리를 가진 둥근 카툰 까치다. 경고 중 날개를 펼쳐 제자리에서 흔들고, 급강하 뒤에는 부리가 바닥에 박힌다." | 210104 | `magpie_anchor.png` |
| `potato_king` | "플레이어보다 크고 무거운 왕관형 감자 보스로, 넓은 감자 몸과 짧고 굵은 다리, 큰 눈썹을 지닌다. 공격 전 몸을 낮추고 위험색 균열이 나타나지만 공포스럽거나 사실적이지 않다." | 210105 | `potato_king_anchor.png` |

```text
[첨부: mapping.json의 styleRefs 전량 + 적 Style Anchor]
[REFERENCE_STYLE]
[ENEMY_LOCKED_DESCRIPTION]
2D 횡스크롤 게임용 적 스프라이트, 완전한 측면, 현재 자세 [POSE].
warning/charge는 기본색 변화와 자세 변화가 동시에 보인다.
128×128 투명 배경, 바닥 그림자·공격 이펙트 없음, data/palette.js 색만 사용.
[NEGATIVE_COMMON]
```

| 에셋 키 | 애니메이션 | Seed | StyleRefs | 상태 |
|---|---|---:|---|---|
| `raw_potato` | idle 2, roll 6, defeated 4 | 210101 | mapping | 2026-08-04 앵커 승인·12프레임 생성·정렬·시트 조립 완료 |
| `spike_pumpkin` | idle 2, warning 2, break 6 | 210102 | mapping | 2026-08-04 앵커 승인·10프레임 생성·정렬·시트 조립 완료 |
| `dark_cloud` | idle 4, charge 4, attack 3, defeated 4 | 210103 | mapping | 2026-08-04 앵커 승인·15프레임 생성·정렬·시트 조립 완료 |
| `magpie` | fly 6, warning 3, dive 4, stunned 4, defeated 4 | 210104 | mapping | 2026-08-04 앵커 승인·21프레임 생성·정렬·시트 조립 완료 |
| `potato_king` | idle 4, jump 4, fall 2, land 4, shoot 4, hurt 3, defeated 8 | 210105 | mapping | 2026-08-04 앵커 승인·29프레임 생성·정렬·시트 조립 완료 |

## 아이템 템플릿과 작업표

```text
[첨부: mapping.json의 styleRefs 전량]
[REFERENCE_STYLE]
2D 횡스크롤 게임용 [ITEM] 아이템, [SILHOUETTE].
정면에 가까운 상징적 도형, 96×96 또는 128×128 투명 배경.
data/palette.js의 collect 색만 사용. 본체 후광, 문자, 숫자, 그림자 없음.
[NEGATIVE_COMMON]
```

| 에셋 키 | 지시 | Seed | StyleRefs | 상태 |
|---|---|---:|---|---|
| `item_star` | 둥근 꼭짓점의 독자적인 5각 별 | 310101 | mapping | 2026-08-04 앵커 승인·제작 완료 |
| `item_percent_small` | 문자 없는 작은 원형 점수 토큰, 안쪽에 두 개의 작은 점과 사선형 홈 | 310102 | mapping | 2026-08-04 앵커 승인·제작 완료 |
| `item_percent_large` | 작은 토큰과 구분되는 큰 이중 원형 테두리 | 310103 | mapping | 2026-08-04 앵커 승인·제작 완료 |
| `item_horn` | 둥근 나선 홈이 있는 짧은 원뿔 | 310104 | mapping | 2026-08-04 앵커 승인·제작 완료 |
| `item_wings` | 좌우가 대칭인 둥근 깃털 날개 한 쌍 | 310105 | mapping | 2026-08-04 앵커 승인·제작 완료 |
| `item_alicorn` | 중앙 뿔과 좌우 날개의 결합 실루엣 | 310106 | mapping | 2026-08-04 앵커 승인·제작 완료 |
| `checkpoint_flag` | 둥근 깃발과 짧은 기둥, 글자 없음 | 310107 | mapping | 2026-08-04 앵커 승인·제작 완료 |
| `rainbow_gate` | 캐릭터가 통과할 넓은 빈 공간이 있는 둥근 아치 | 310108 | mapping | 2026-08-04 앵커 승인·제작 완료 |

퍼센트 토큰의 두 점과 사선 홈은 실제 문자 글리프가 아니라 단순 도형으로 제작해 AI 생성 문자 문제를 피한다.

## 배경 템플릿과 작업표

```text
[첨부: mapping.json의 styleRefs 전량]
[REFERENCE_STYLE]
2D 횡스크롤 플랫폼 게임용 [LAYER] 배경 레이어, 무드 [MOOD].
완전한 측면, 약한 원근, [ELEMENTS]. 명도 [RANGE], 캐릭터보다 낮은 채도.
near 레이어는 오브젝트를 하단 25%에만 배치한다.
캐릭터·적·플랫폼·충돌 지형·문자·UI 없음. 중앙 플레이 영역은 단순하게.
좌우 seamless, 폭 [2048/3072]px, 높이 720px 이상.
```

| 에셋 키 | 지시 | Seed | StyleRefs | 상태 |
|---|---|---:|---|---|
| `bg_normal_far` | 밝은 먼 산·구름·희미한 무지개, 명도 70~85% | 410101 | mapping | 2026-08-04 생성·검증·통합 완료 |
| `bg_normal_mid` | 둥근 언덕과 큰 나무 덩어리, 명도 55~70% | 410102 | mapping | 2026-08-04 앵커 승인·통합 완료 |
| `bg_normal_near` | 하단 풀·꽃 덩어리, 명도 45~60% | 410103 | mapping | 2026-08-04 생성·검증·통합 완료 |
| `bg_pit_far` | 넓고 비어 보이는 차가운 하늘과 먼 절벽, 명도 70~85% | 410201 | mapping | 2026-08-04 생성·검증·통합 완료 |
| `bg_pit_mid` | 간격이 넓은 나무·바위 덩어리, 명도 55~70% | 410202 | mapping | 2026-08-04 생성·검증·통합 완료 |
| `bg_pit_near` | 하단 가장자리 풀과 작은 바위만, 명도 45~60% | 410203 | mapping | 2026-08-04 생성·검증·통합 완료 |
| `bg_boss_far` | 어두운 구름과 먼 거목 실루엣, 명도 60~75% | 410301 | mapping | 2026-08-04 생성·보정·검증·통합 완료 |
| `bg_boss_mid` | 넓은 전투 공간을 비우는 수직 나무 랜드마크, 명도 45~60% | 410302 | mapping | 2026-08-04 생성·검증·통합 완료 |
| `bg_boss_near` | 낮고 단순한 하단 식생, 명도 40~55% | 410303 | mapping | 2026-08-04 생성·검증·통합 완료 |

## 타일과 장식

- `grass_tileset`: 이미지 생성 프롬프트 없음. `generate-tiles.js`가 팔레트로 생성한다. 2026-08-04 16종·64px·2px extrude 제작 및 통합 완료.

| 에셋 키 | 프롬프트 차분 | Seed | StyleRefs | 상태 |
|---|---|---:|---|---|
| `decor_flower` | 하단용 둥근 꽃 장식 한 송이, 투명 배경 | 510101 | mapping | 대기 |
| `decor_grass` | 짧고 둥근 풀 덤불 한 덩이, 투명 배경 | 510102 | mapping | 대기 |
| `decor_rock` | 낮고 둥근 바위 하나, 투명 배경 | 510103 | mapping | 대기 |
| `decor_sign` | 문자 없는 둥근 화살표형 나무 표지, 투명 배경 | 510104 | mapping | 대기 |

## 효과 작업표

효과는 가능하면 Phaser Graphics와 파티클로 생성한다. 이미지가 필요한 경우만 아래 프롬프트를 사용한다.

| 에셋 키 | 지시 | Seed | StyleRefs | 상태 |
|---|---|---:|---|---|
| `fx_shadow_oval` | 단색 저불투명 타원, 가장자리 1단계 | 610101 | mapping | 대기 |
| `fx_dust` | 둥근 먼지 입자 4개, 서로 분리 | 610102 | mapping | 완료(코드 파티클) |
| `fx_item_glow` | 중앙이 빈 둥근 빛 링 | 610103 | mapping | 대기 |
| `fx_magnet_trail` | 짧은 곡선 별빛 조각 | 610104 | mapping | 완료(코드 파티클) |
| `fx_transform_flash` | 중앙이 빈 별 파동 조각 | 610105 | mapping | 완료(코드 파티클) |
| `fx_alicorn_overlay` | 화면 타일링 가능한 세 색 무지개 띠, 낮은 불투명도 | 610106 | mapping | 대기 |
| `fx_attack_marker` | 중앙이 빈 위험 링과 아래 방향 삼각형 | 610107 | mapping | 대기 |
| `fx_lightning` | 세 갈래의 굵고 뾰족한 번개 | 610108 | mapping | 대기 |
| `fx_quake_wave` | 낮고 긴 수평 지진 파동 | 610109 | mapping | 대기 |
| `fx_weakpoint_star` | 중앙이 빈 별형 링 | 610110 | mapping | 대기 |
| `fx_stolen_percent` | 작고 둥근 반짝임 점수 조각 | 610111 | mapping | 대기 |

## UI 작업표

```text
[첨부: mapping.json의 styleRefs 전량]
[REFERENCE_STYLE]
2D 게임 UI용 [COMPONENT]. 둥근 실루엣, 3~4px 색상 외곽선,
data/palette.js 색만 사용, 투명 배경, 문자·숫자·로고 없음.
[NEGATIVE_COMMON]
```

| 에셋 키 | 지시 | Seed | StyleRefs | 상태 |
|---|---|---:|---|---|
| `ui_portrait_silsea` | 큰 눈과 분홍 갈기가 보이는 정사각 얼굴, 기본형 뿔 없음 | 710101 | mapping | 대기 |
| `ui_portrait_potato89` | 큰 둥근 얼굴의 갈색 망아지 정사각 얼굴 | 710102 | mapping | 대기 |
| `ui_form_base` | 뿔·날개 없는 둥근 말 머리 실루엣 | 710103 | mapping | 대기 |
| `ui_form_unicorn` | 중앙 뿔 실루엣 | 710104 | mapping | 대기 |
| `ui_form_pegasus` | 좌우 날개 실루엣 | 710105 | mapping | 대기 |
| `ui_form_alicorn` | 뿔+날개 실루엣 | 710106 | mapping | 대기 |
| `ui_hp` | 둥근 심장형 생명 아이콘 | 710107 | mapping | 대기 |
| `ui_flight_gauge` | 날개 끝 장식의 가로 게이지 프레임 | 710108 | mapping | 대기 |
| `ui_fever_gauge` | 별 끝 장식의 가로 게이지 프레임 | 710109 | mapping | 대기 |
| `ui_boss_hp` | 위험색 3칸이 명확한 넓은 프레임 | 710110 | mapping | 대기 |
| `ui_panel` | 둥근 사각 9-slice 패널 | 710111 | mapping | 대기 |
| `ui_button` | 큰 둥근 사각 9-slice 버튼 | 710112 | mapping | 대기 |
| `ui_pause` | 두 개의 둥근 세로 막대 | 710113 | mapping | 대기 |
| `ui_accessibility` | 흔들림·소리·키보드·게임패드·쉬운 모드 실루엣 세트 | 710114 | mapping | 대기 |

## 채택 기록 형식

실행 시 각 프레임을 아래 표로 확장한다.

| 에셋 키 | 프레임 | 프롬프트 | Seed | Anchor | StyleRefs | 상태 |
|---|---:|---|---:|---|---|---|
| `silsea_run_00` | contact | 위 템플릿+접지 포즈 | 190701 | `silsea_anchor.png` | mapping 전량 | 생성 완료 (`assets/characters/silsea/run/`) |

## Style Anchor 승인 후보

| 캐릭터 | 후보 파일 | 생성 방식 | 첨부한 StyleRefs | 후처리 | 상태 |
|---|---|---|---|---|---|
| 실세아 | `assets/_anchor/silsea_anchor.png` | built-in imagegen, 우향 run contact pose | `silsea_run.png`, `silsea_sprite-Photoroom.png` | chroma 제거 → 승인 팔레트 양자화 → 128×128 정렬 → 재양자화 | 2026-08-03 승인 |
| 89% 구운 감자 | `assets/_anchor/potato89_anchor.png` | built-in imagegen, 우향 roll/run contact pose | `silsea_run.png`, `mylittlepony1.webp`, `mario_3.jpg` | chroma 제거 → 승인 팔레트 양자화 → 128×128 정렬 → 재양자화 | 2026-08-03 승인 |
