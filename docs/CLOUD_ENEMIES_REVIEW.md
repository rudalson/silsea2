# 구름 코스 전용 적과 고유 공격

검수일: 2026-10-24

- 재채기 구름양: 구름 털·민트 목도리·금빛 뿔과 발굽. 1.4초 예고 후 이동하며 커지는 돌풍을 발사한다. 피해를 받으면 양에서 멀어지는 바람 방향으로 밀린다. 점프·날개 방어 가능. 쉬움은 긴 예고와 작고 느린 돌풍.
- 우산 오리: 파랑·크림 우산과 라벤더 망토. 1.5초 예고 뒤 고정한 세 줄에 0.3초 간격으로 비를 내린다. 플레이어를 추적하지 않고 비줄기 사이에 44px 캐릭터가 피할 틈을 둔다. 쉬움은 긴 예고와 느린 빗방울 한 줄.
- 우산과 양털에 맞는 개별 충돌 영역을 적용했다. 기존 감자 두 자리를 교체하고 쉬움의 두 번째 적 제거를 유지한다. 각 60점, 6상태 20프레임. 내장 image_gen의 원화·정확한 프롬프트·배율·알파 크롭은 assets/_source/cloud-enemies에 보존한다.

검증:

- 여섯 신규 적을 포함한 npm test, npm run validate, npm run build, node scripts/validate-runtime-build.js, git diff --check 통과.
- 돌풍의 이동·확대·쉬움 감소와 고정된 비 세 줄·순차 낙하·쉬움 한 줄·44px 플레이어의 사이 회피를 자동 검사했다. 전체 고유 공격의 방향 잠금·연속 충돌·예고·정지·취소·RGBA·양 난이도 배치를 함께 확인했다.
- 브라우저 고유 공격 검사 COMPLETE: 두 원화 로드, 각 고유 공격의 실제 피해와 바람 방향 밀림, 예고 고정, 밟기 60점과 중복 지급 방지, 일시정지와 공격 정리, 처치 진행을 보존하는 재로드.
- 전체 구름 코스 브라우저 검사 COMPLETE: 46.2초·별 107개로 다섯 필드 구간 무추락 완주. 빈 비행 게이지 회복·변신 없는 상승기류 통과, 재로드, 보스 돌풍과 반대 입력·날개 방어·실패 복귀·일시정지·3단계 실제 점프 처치·최종 게이트·임시 저장을 확인했다. 기존 사용자 기록은 보존했으며 브라우저 오류·경고는 없었다.

재조립: npm run cloud:enemies
미리보기: references/cloud-enemies-preview.png, references/cloud-enemies-review.png
실제 공격 검사: /scripts/themed-enemies-runtime.html?visualReview=level-11&section=sky_walk&offset=1900&debug=1&mute=1
전체 완주 검사: /scripts/cloud-runtime.html?visualReview=level-11&debug=1&mute=1
