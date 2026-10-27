# 끈끈한 테이프 원화

- `original.png`: 내장 `image_gen`으로 생성한 투명 원본. 테이프 도시 원경과 테이프 수집물은 화풍·재질 참조로만 사용했습니다.
- `prompt.txt`: 실제 생성 프롬프트 전체.
- `node scripts/build-sticky-tape.js`: 투명 여백을 정리하고 384×40 PNG 및 3프레임 JSON을 생성합니다. 원본 알파를 유지합니다.
- 출력: `assets/effects/fx_sticky_tape.png`, `fx_sticky_tape.json`.
- 양끝 64px는 고정 비율로 표시하고 접착제 중앙만 길이에 맞춰 늘립니다. 필드와 보스 설치물에 공용으로 적용합니다.
- 기존 구간 위치·크기·감속 수치·점프 탈출 규칙은 보존합니다. 안내 문구와 사선 표시는 제거했습니다.
