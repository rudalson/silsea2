# Should S5 지형별 발소리 검수

> 상태: 구현·자동/브라우저 검증·사용자 청취 승인 완료
> 승인 문구: `S5 발소리 승인`

## 승인 대상

| 표면 | Tiled 키 | WAV | 대표 위치 |
|---|---|---|---|
| 잔디 | `grass` | `assets/audio/sfx/sfx_footstep_grass.wav` | level-01 일반 지면 |
| 흙 | `dirt` | `assets/audio/sfx/sfx_footstep_dirt.wav` | level-02 일반 지면 |
| 돌 | `stone` | `assets/audio/sfx/sfx_footstep_stone.wav` | level-03 일반 지면, level-04 보스룸 |
| 나무 | `wood` | `assets/audio/sfx/sfx_footstep_wood.wav` | 각 레벨의 platform·지붕 |
| 얕은 물 | `shallow_water` | `assets/audio/sfx/sfx_footstep_shallow_water.wav` | level-04 마을 지면 |

## 런타임 판정

1. 현재 발 위치 아래 24px 안의 가장 가까운 Tiled terrain 오브젝트를 찾는다.
2. 오브젝트 `surface`가 있으면 우선하고, 없으면 타입에 맞는 레이어 `groundSurface` 또는 `platformSurface`를 사용한다.
3. 달리기 애니메이션의 0·4번 접촉 프레임이며 접지·수평 속도 40px/s 이상일 때만 재생을 요청한다.
4. 점프·낙하·수영·피격/조작 잠금·같은 접촉 프레임 반복 update는 억제한다.
5. `AudioManager`가 SFX 음량·음소거·누락 파일 무음 fallback·동일 키 프레임당 최대 2회를 최종 적용한다.

## 브라우저 확인 주소

- 잔디: `http://localhost:4173/?visualReview=level-01&section=intro&offset=240&debug=1`
- 흙: `http://localhost:4173/?visualReview=level-02&section=moonlit_trail&offset=240&debug=1`
- 돌: `http://localhost:4173/?visualReview=level-03&section=mist_intro&offset=240&debug=1`
- 얕은 물: `http://localhost:4173/?visualReview=level-04&section=tsunami_intro&offset=240&debug=1`
- 나무: `http://localhost:4173/?visualReview=level-01&section=tutorial&offset=820&debug=1`

디버그 패널의 `발소리 <surface> <횟수>회 (<상태>)`가 표면 판정과 재생·억제 결과를 보여 준다.

## 승인 체크리스트

- [x] 잔디·흙·돌·나무·얕은 물이 서로 구분되고 전체적으로 가볍고 낮은 음량이다.
- [x] 달리는 속도와 접촉 박자가 자연스럽고 한 접촉에 여러 번 겹쳐 들리지 않는다.
- [x] 점프·낙하·수영·피격 중 발소리가 들리지 않는다. (단위 검사와 점프·수영 브라우저 상태 확인)
- [x] 게임 SFX 음량과 음소거 설정을 따른다. (`AudioManager` 공용 경로와 단위 검사)
- [x] 디버그 표면·재생 횟수·상태가 실제 동작과 일치한다.
- [x] Vite 오류 오버레이가 없고 자동 검증과 프로덕션 빌드가 통과한다.

## 승인 기록

2026-09-04 브라우저 확인: 잔디 3회, 흙 8회, 돌 4회, 나무 2회, 얕은 물 1회 재생 증가를 확인했다. 점프는 `air-suppressed`, 수중은 `swim-suppressed`, Vite 오류 오버레이는 0건이었다.

2026-09-04 사용자 `S5 발소리 승인`으로 5종 청취와 S5 최종 승인을 완료했다.
