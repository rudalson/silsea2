# C4 실비아 컬러 앵커 검토

> 상태: 실비아 실제 생성 진행 승인 — 2026-09-08 `실비아만 생성 진행`

## 채택 결과

- 접촉 시트: `references/could4-character-contact-sheet-color.png`
- 128×128 컬러 앵커: `references/could4-character-color-anchors/sylvia_anchor_color_v1.png`
- 내장 이미지 생성 원본: `assets/_source/c4/sylvia_anchor_color_generated_v1.png`
- 재현 명령: `npm run c4:color-review`

승인 흑백 앵커의 알파 마스크를 유지해 실루엣·포즈·기준선을 픽셀 단위로 고정했다. 외곽선 `#42474E`, 몸통 `#F1F6FA`, 음영 `#9598A2`, 하이라이트 `#F4FBFD`, 갈기·꼬리 `#DEB5C6/#D294AC/#745767`, 하트 `#E573A0`만 사용한다.

결과는 128×128 투명 PNG, 실측 112×93px, 발 기준선 16px, 좌우 여백 8/8px이며 승인 팔레트 밖의 RGB 색상은 0개다. 이 컬러 앵커를 실비아의 실제 애니메이션 프레임 생성 기준으로 사용한다.
