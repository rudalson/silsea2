# C2 결과 화면 스티커 — 흑백 앵커 검수

> 상태: 사용자 앵커 승인 완료
> 작성일: 2026-09-07
> 선행 승인: `C2 규칙 승인`, `C2 배치 승인`
> 승인 기록: 2026-09-07 `C2 앵커 승인`

## 검수 파일

- 생성 원본: `references/could2-sticker-anchor-contact-sheet.png` — 2172×724
- 정규 흑백 앵커: `references/could2-sticker-anchor.png` — 2172×724
- 25% 축소본: `references/could2-sticker-anchor-25.png` — 543×181
- 25% 이진 실루엣: `references/could2-sticker-anchor-silhouette-25.png` — 543×181
- 재현 스크립트: `scripts/build-c2-sticker-anchor-review.js`

## 형태 잠금 후보

왼쪽부터 다음 순서를 사용한다.

1. 무지개 클리어 — 세 겹의 둥근 아치와 양 끝 구름
2. 별 수집가 — 굵고 둥근 5각 별
3. 비밀 탐험가 — 큰 원형 머리와 긴 홈의 열쇠구멍
4. 번개 질주 — 양쪽 날개, 원형 시계, 짧은 두 시곗바늘
5. 완벽한 모험 — 넓은 방패 외곽 안의 큰 하트

다섯 아이콘은 동일한 시각 무게와 여백을 가지며 문자·숫자·이모지에 의존하지 않는다. 25% 축소와 흑백 임계값 `220` 이진화에서도 각 외곽 형태와 내부 기호가 분리된다.

## 생성·검증 기록

- 생성 방식: OpenAI 내장 `imagegen`
- 후처리: Sharp로 흑백 정규화, 25% Lanczos 축소, 임계값 220 이진화
- 흑백 검사: RGB 채널 최대 편차 0
- 자동 계약: 고정 슬롯 화면 경계·금지 영역 비충돌, reduced 무이동·무스케일 100ms, 기존 SFX 최대 3회 통과
- 프로젝트 실행: `npm run test`, `npm run validate`, `npm run build`, `git diff --check` 통과

## 최종 컬러 제작 시 잠글 불변 조건

- 위 다섯 실루엣과 좌우 순서를 바꾸지 않는다.
- 결과 화면의 반지름 35px 원형 배지 안에서 판독되도록 바깥 여백을 유지한다.
- 승인된 프로젝트 팔레트의 노랑·파랑·분홍·초록·빨강 계열만 사용한다.
- 글자, 숫자, 그라디언트, 그림자, 3D, 배경 장면과 새 장식을 추가하지 않는다.
- 최종 컬러 시트는 한 번 생성하고 128×128 PNG 5종으로 분리한다.

## 생성 프롬프트

```text
Use case: stylized-concept
Asset type: game UI achievement sticker silhouette anchor contact sheet for a child-friendly 2D platformer
Primary request: exactly five distinct black-and-white achievement sticker icon silhouettes in one horizontal row: rounded three-band rainbow with clouds, bold five-point star, unmistakable keyhole, winged round clock, heart shield
Style/medium: crisp flat vector-like black ink, chunky rounded children's cel-cartoon game UI, strong silhouette, consistent heavy outline
Composition/framing: five equal cells, exact requested order, one centered icon per cell, identical scale and generous padding, readable at 25%
Constraints: pure black and white only; exactly five icons; no text, letters, numbers, labels, emoji, color, gradients, shadows, texture, 3D, mockup, background scene, or watermark
```

## 승인 문구

다섯 실루엣과 최종 컬러 방향은 다음 문구로 승인되었다.

`C2 앵커 승인`
