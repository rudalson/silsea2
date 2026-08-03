# 제작 로드맵

> 현재 단계: Phase 3 Art Integration — 스타일 앵커 승인 대기  
> 규칙: Must 전체가 끝나기 전 Should를 구현하지 않고, Should 전체가 끝나기 전 Could를 구현하지 않는다. 각 Phase는 사람 승인과 커밋 후에만 다음 단계로 간다.

## 현재 게이트

| Phase 0 조건 | 상태 |
|---|---|
| 참조 이미지 8장 전수 분석 | 완료 |
| 2D 셀 카툰 화풍 선택 | 완료 — 2026-08-03 사용자 승인 |
| 공용 팔레트 HEX 사람 확인 | 완료 — 2026-08-03 사용자 승인 |
| 실세아 기본형 무뿔 확인 | 완료 — 2026-08-03 사용자 승인 |
| 두 캐릭터 Locked Description·비율 확인 | 완료 — 2026-08-03 사용자 승인 |
| 레벨 스키마 확인 | 완료 — 2026-08-03 사용자 승인 |
| Phase 0 문서 정합성 검사 | 완료 |

Phase 1 코드는 위 항목과 Phase 0 전체 승인 전까지 작성하지 않는다.

## Must

### Phase 0 — Planning

- [x] `references/REFERENCE_ANALYSIS.md`
- [x] `references/mapping.json`
- [x] `data/palette.js` 후보
- [x] `GAME_DESIGN.md`
- [x] `CHARACTER_BIBLE.md`
- [x] `ART_BIBLE.md`
- [x] `ASSET_LIST.md`
- [x] `ASSET_PROMPTS.md`
- [x] `AUDIO_LIST.md`
- [x] `LEVEL_BEAT_SHEET.md`
- [x] `LEVEL_SCHEMA.md`
- [x] `ROADMAP.md`
- [x] `TEST_CHECKLIST.md`
- [x] `CREDITS.md`
- [x] 팔레트·캐릭터·스키마 사람 승인
- [x] Phase 0 승인 후 커밋 (`1836e3d`)

완료 기준: 네 게이트(전수 분석, 팔레트, 캐릭터 외형, 레벨 스키마)가 승인되고 Phase 0 파일만 커밋된다.

### Phase 1 — Graybox Prototype

- [x] npm/Vite/Phaser 프로젝트 셸, `npm install/dev/build/validate`
- [x] Boot/Menu/CharacterSelect/StageSelect/Game/UI/Clear Scene 셸
- [x] `InputManager`와 키보드·게임패드 입력
- [x] 데이터 기반 두 캐릭터 선택과 동일 조작 수치
- [x] 가속·감속·공중 제어·최대 낙하 속도
- [x] Coyote Time, Jump Buffer, Variable Jump, Fall Gravity, Head Bump Safety
- [x] 코드 Squash & Stretch와 착지 도형 파티클
- [x] Look-Ahead 카메라, 세로 Dead Zone, cue 데이터
- [x] Tiled graybox 지형과 체크포인트·낭떠러지 복귀
- [x] `LevelLoader`, 레벨 레지스트리, 동적 에셋 fallback
- [x] `ObjectiveManager` handler table
- [x] `ProgressManager` 저장/memory fallback
- [x] level-01 시작→도형 보스→게이트→클리어 구현
- [x] `level-02.js` 추가로 확장성 실증
- [x] 디버그 슬라이더, JSON 내보내기, 충돌/FPS/warp/objective 표시
- [x] `validate-levels.js`와 `npm run validate`
- [ ] 설명 없는 어린이 3명 플레이테스트
- [x] Gate 1: 도형만으로 점프가 기분 좋은지 사람 승인 — 2026-08-03 사용자 승인
- [x] Gate 2: level-02가 Scene/System 수정 없이 동작하는지 승인 — 2026-08-03 사용자 승인
- [x] Phase 1 승인 후 커밋 (`feat: complete graybox prototype`)

### Phase 2 — Core Mechanics

- [x] 유니콘 자석과 가시 호박 파괴
- [x] 페가수스 10초 비행, 3초 지상 회복, 활공 전환
- [x] 알리콘 12초 피버, 종료 3초 예고, 안전 착지
- [x] 별·퍼센트·콤보·카운트업 점수
- [x] HP·피격·2초 무적·체크포인트 부활·완화된 점수 손실
- [x] 데굴데굴 생감자·가시 호박·먹구름·까치 행동과 예고
- [x] 까치 점수 절도와 회수 아이템
- [x] 보스 section과 HP 3·3단계·약점·게이트
- [x] 화면 밖 공격 비활성화
- [x] `defeat_boss`, `reach_gate`, `collect_stars` handler
- [x] 첫 60초 스크립트와 전체 텐션 비트 구현
- [x] 고정 Seed 랜덤 테스트
- [x] Object Pool로 탄환·번개·회수 아이템 누적 방지
- [ ] 이미지/오디오 없는 fallback 완주
- [x] 모든 레벨/구조/Core Mechanics 검증 통과
- [ ] 어린이 3명 플레이테스트, 2명 이상 동일 정체 지점 수정
- [x] Phase 2 사용자 승인 후 커밋 (`feat: complete core gameplay`) — 2026-08-03

> 어린이 3명 플레이테스트와 fallback 수동 완주는 실제 수행 전까지 미완료로 유지한다. 사용자의 명시적 다음 단계 요청에 따라 Phase 3의 승인용 앵커 제작까지만 진행한다.

### Phase 3 — Art Integration

- [ ] 선택 팔레트 추출 보고서와 양자화 도구
- [ ] 캐릭터 contact pose 앵커 생성(지정 refs 전량 첨부)
- [ ] 두 앵커 사람 승인
- [ ] 캐릭터 프레임 1프레임 1생성·정렬·시트 조립
- [ ] 적·아이템·배경·UI·효과 생성
- [ ] 64px 코드 생성 타일셋과 2px extrude
- [ ] 일반/낭떠러지/보스 배경 3레이어 seamless
- [ ] 프레임 duration 애니메이션 등록
- [ ] 변신·자석·착지 파티클 통합
- [ ] `mapping.json`/manifest/실제 파일 1:1 정합성
- [ ] `validate-assets.js`와 HTML 썸네일·흑백 대비 보고서
- [ ] 발 기준선 ±2px, 높이 ±5%, 팔레트 외 5% 이하
- [ ] 전체 스크린샷 화풍 육안 승인
- [ ] 모든 validate 통과와 Phase 3 커밋

### Phase 4 — Polish

- [ ] AudioManager와 필수 SFX/BGM/무음 fallback
- [ ] 별 6단계 상승 음계와 동시 재생 제한
- [ ] 변신 정지·플래시·카메라 강조
- [ ] 약한 흔들림과 접근성 On/Off
- [ ] 일시정지·볼륨·음소거·조작 안내·쉬운 모드
- [ ] 보스 BGM 전환과 알리콘 레이어
- [ ] 성능·메모리·Object Pool 장시간 테스트
- [ ] 1280×720 반응형/새로고침/오프라인 에셋 검증
- [ ] README와 알려진 제한·에셋 교체·2P 확장 기록
- [ ] 어린이 3명 최종 플레이테스트
- [ ] 최종 승인과 Phase 4 커밋

## Should — 모든 Must 완료 후

- [ ] 비밀 공간과 별 배치 기반 발견 보상 강화
- [ ] 선택 목표 결과의 세부 축하 연출
- [ ] 레벨 데이터 핫 리로드의 편의 기능 강화
- [ ] 디버그 패널 preset 불러오기
- [ ] 발소리와 지형별 가벼운 음색 차이
- [ ] 추가 배경 장식 4종

## Could — Must와 Should 완료 후

- [ ] 추가 짧은 챌린지 레벨
- [ ] 사진 모드 또는 결과 화면 스티커
- [ ] 로컬 2P 프로토타입
- [ ] 추가 캐릭터 외형 슬롯

## 커밋 계획

| 시점 | 커밋 메시지 예시 |
|---|---|
| Phase 0 승인 | `docs: lock phase 0 game plan` |
| Phase 1 승인 | `feat: complete graybox prototype` |
| Phase 2 승인 | `feat: complete core gameplay` |
| Phase 3 승인 | `feat: integrate approved art assets` |
| Phase 4 승인 | `feat: polish and complete game` |

커밋은 각 게이트가 실제로 통과한 뒤에만 수행한다.
