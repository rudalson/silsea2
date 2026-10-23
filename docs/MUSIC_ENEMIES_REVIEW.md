# 피아노 나라 전용 적과 고유 공격

검수일: 2026-10-24

- 건반 도깨비: 그랜드피아노형 몸체. 1.05초 예고 후 두 번 튀는 음표 2개를 시차 발사한다. 쉬움은 예고 1.35배·느린 음표 1개, 날개 방어 가능.
- 박자 부엉이: 메트로놈 몸체. 1.25초 예고 후 추를 부채꼴 궤도로 내밀었다 회수한다. 쉬움은 예고 1.35배·짧은 궤적, 날개 방어 불가·점프 회피.
- 두 적은 예고 시 방향과 원점을 고정한다. 공격 표시·예고·연속 충돌 검사가 같은 궤적을 샘플링한다. 재공격 전 회복·대기, 화면 밖 공격 취소, 처치·부활·재로드 정리를 적용한다.
- 피아노의 5초 정지 중에는 새 적 공격을 취소한다. 원래 두 감자를 교체하고 쉬움의 두 번째 적 제거를 유지한다. 밟기 처치는 각 60점.
- 내장 image_gen의 투명 원화 각 8포즈를 6상태 10프레임으로 조립했다. 원화·최종 프롬프트·알파 크롭·배율을 assets/_source/music-enemies에 보존한다.

검증:

- npm test, npm run validate, npm run build, node scripts/validate-runtime-build.js, git diff --check 통과.
- 고유 공격 자동 검사: 방향 잠금·좌우 대칭·곡선 경로·큰 delta 연속 충돌·점프 높이 회피·날개 방어·쉬움 예고·정지·화면 밖 취소·RGBA·양 난이도 배치.
- 브라우저 고유 공격 검사 COMPLETE: 원화 2종 로드, 잠긴 예고, 각 공격 종류의 실제 피해, 실제 밟기·60점·중복 방지, 일시정지, 이전 공격 표시 해제와 처치 진행을 보존하는 재로드.

재조립: npm run music:enemies
미리보기: references/music-enemies-preview.png, references/music-enemies-review.png
실제 공격 검사: /scripts/themed-enemies-runtime.html?visualReview=level-09&section=melody_paths&offset=700&debug=1&mute=1

- 브라우저 피아노 나라 완주 COMPLETE: 정지 문 3개, 낭떠러지 2개 무추락, 필드 57.1초·별 94개, 보스 세 단계·재도전·날개 방어·정지 신호·게이트·임시 저장과 사용자 기록 보존 통과. 브라우저 warning/error 0건.
