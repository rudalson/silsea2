# 메롱왕국 왕관 정원 환경 개편

검수일: 2026-10-27

무지개 언덕과 공유하던 초록 나무·덤불·꽃·잔디/주황 흙을 메롱왕국 전용 중경·근경과 석조 지형으로 교체했다. 큰 배경 `bg_merong_far.png`는 그대로 사용한다.

- 분홍·아이보리 회랑과 보라 정자, 덩굴을 중경으로 추가했다.
- 보랏빛 말린 가지와 길게 늘어진 분홍·민트 잎, 왕관 관목을 근경으로 배치했다.
- 바닥과 공중 발판은 분홍·보라 석회암 벽돌과 아이보리 처마띠로 교체했다. 기존 프레임 규격 16종·64px·2px extrusion을 유지했다.
- 왕관 화분 12곳과 정원 등불 5곳, 등불 체크포인트, 석조 다리 세 곳, 입 모양 궁전 아치를 적용했다. 모두 기존 판정과 분리된 시각 장식이며 적과 주인공 뒤에 표시한다.
- 큰 배경은 SHA-256 `B51E9E2114EEB7931EFF87780CC910E5484CF5C1591CEAC2319C8F3D1BDB3E8A`로 작업 전후 동일하다. 무지개 언덕 레벨 정의, 공용 중경·근경, 공용 타일 PNG/JSON과 메롱왕국 충돌 타일맵도 작업 전후 해시가 동일하다.

내장 `image_gen`으로 원화 6개를 제작했다. 원본과 정확한 프롬프트는 `assets/_source/merong-environment/`에 보존한다. `npm run merong:environment`로 재조립할 수 있으며 이 스크립트는 큰 배경을 읽기만 하고 원본 해시를 확인한다.

검증:

- `npm test`, `npm run validate`, `npm run build`, `node scripts/validate-runtime-build.js`, `git diff --check` 통과.
- 환경 전용 검사는 큰 배경 보존·무지개 언덕과 에셋 분리·투명도·중앙 시야·궁전 아치 안쪽 알파·16프레임 아틀라스·로컬 등록·양 난이도 장식을 확인한다. 종합 에셋 검사는 실제 2px extrusion과 모든 지형 프레임도 검사한다.
- 실제 브라우저 보통 모드 COMPLETE: 새 중경·근경·석조 지형·144px 등불 체크포인트·다리·궁전 원화 연결, 좌우 공격·피해 일치, 필드 31.6초·별 65개 무추락 완주, 보스 3단계·사망 후 HP 보존·게이트·임시 저장.
- 실제 브라우저 쉬움 모드 COMPLETE: 같은 새 환경 연결, 좌우 공격·피해 일치, 필드 31.4초·별 67개 무추락 완주, 보스 3단계·HP 보존·게이트·임시 저장.
- 두 완주 검사 및 정원·궁전 화면에서 브라우저 오류·경고 없음. 기존 사용자 진행 기록 보존.

실제 화면:

- `references/merong-environment-welcome.png`: 왕관 화분·등불·석조 바닥·나무가 함께 보이는 시작 구간.
- `references/merong-environment-gameplay.png`: 이전 공격 표현 검수와 같은 위치에서 바뀐 환경 비교.
- `references/merong-environment-palace.png`: 새 궁전 입구.
- `references/merong-environment-preview.png`: 선택 화면용 환경 합성 원본.

완주 재현: `/scripts/merong-runtime.html?visualReview=level-07&debug=1&mute=1` (쉬움은 `&easy=1`).
