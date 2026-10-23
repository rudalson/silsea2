# 구멍 코스 전용 적과 고유 공격

검수일: 2026-10-24

- 굴파기 두더지: 고글·라벤더 목수건을 쓴 땅파기 캐릭터. 1.3초 동안 고정된 지점을 예고한 뒤 흙기둥을 분출한다. 실제 지형이나 낭떠러지를 생성하지 않고 지지가 있는 바닥만 목표로 잡는다. 쉬움은 낮고 좁은 기둥과 긴 예고.
- 고리돌 골렘: 속이 빈 사암 몸통과 고리 손. 1.15초 예고 후 낮은 돌고리를 굴려 보냈다가 회수한다. 왕복 궤적과 고리의 빈 중심을 충돌 계산에 반영한다. 점프·날개 방어 가능, 쉬움은 짧은 왕복 거리와 긴 예고.
- 원래 감자 두 자리를 교체하고 쉬움의 두 번째 적 제거를 유지했다. 6상태 20프레임, 각 60점. 내장 image_gen 원화·프롬프트·배율과 크롭은 assets/_source/hole-enemies에 보존한다.

검증:

- npm test, npm run validate, npm run build, node scripts/validate-runtime-build.js, git diff --check 통과.
- 자동 검사에서 흙기둥의 고정 목표와 쉬움 크기, 돌고리 복귀와 빈 중심 무피해, 좌우 대칭·예고 고정·큰 delta 충돌·점프 회피·취소·RGBA·양 난이도 배치를 확인했다.
- 브라우저 고유 공격 검사 COMPLETE: 두 적 각각 원화 로드·고유 공격 실제 피해·고정 예고·일시정지·실제 밟기 60점·중복 지급 방지·공격 정리·처치 진행을 보존하는 재로드.

재조립: npm run hole:enemies
미리보기: references/hole-enemies-preview.png, references/hole-enemies-review.png
실제 공격 검사: /scripts/themed-enemies-runtime.html?visualReview=level-10&section=bridge_practice&offset=2080&debug=1&mute=1

브라우저 전체 완주 COMPLETE: 필드 40.7초·별 114개, 고정/임시 구멍 무추락, 개폐·실제 추락·복귀·재로드·보스 좌우 이동과 세 단계 실제 점프·바닥 복구·게이트·임시 저장·사용자 기록 보존 통과.
