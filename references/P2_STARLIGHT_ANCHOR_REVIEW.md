# P2 별빛 숲 흑백 앵커 검토

> 상태: 사용자 확인 중
> 범위: P2 최종 컬러 에셋 제작 전 형태·구도 승인
> 주의: 아래 이미지는 방향을 잠그기 위한 흑백 콘셉트다. 아직 게임 에셋으로 등록하지 않았으며 최종 배경·타일·장식이 아니다.

## 확인할 방향

별빛 숲은 기존 무지개 언덕의 색만 어둡게 바꾼 화면이 아니라 다음 네 가지 실루엣으로 구분한다.

1. 원경: 왼쪽 위 초승달과 완만하게 겹치는 숲 능선
2. 중경: 화면을 세로로 나누는 길고 둥근 나무줄기와 수관
3. 플레이 지형: 넓은 지면, 떠 있는 달빛 나뭇가지, 뿌리 절벽
4. 종료 랜드마크: 오른쪽 끝에서 멀리서도 알아보는 큰 별 모양 나무

주인공과 발판의 외곽선은 배경보다 밝고 단순하게 유지한다. 별나무는 길 안내용 랜드마크이며, 별 수집물이나 무지개 게이트를 가리지 않도록 실제 플레이 배경에서는 뒤쪽 레이어에 둔다.

## 검토 이미지

- 전체 흑백 앵커: `references/p2-starlight-anchor-contact-sheet.png`
- 25% 축소 확인: `references/p2-starlight-anchor-preview-25.png`
- 25% 이진 실루엣: `references/p2-starlight-anchor-silhouette-25.png`
- 현재 회색 상자 비교: `references/p2-level02-graybox-start.png`, `references/p2-level02-graybox-mid.png`, `references/p2-level02-graybox-end.png`

전체 앵커의 위쪽은 플레이 배경 구도, 아래쪽은 지면·나뭇가지·뿌리 절벽·달 장식 가지·관목/바위·반딧불/별꽃 모듈이다. 25% 이진 시트에서도 초승달, 세로 나무, 별나무, 발판 모듈이 서로 다른 덩어리로 읽힌다.

## 최종 컬러 적용안

새 HEX를 추가하지 않고 `data/palette.js`에서 이미 승인된 색만 쓴다.

| 역할 | 승인 팔레트 |
|---|---|
| 밤하늘 | `#172447` |
| 원경 숲 | `#214D59` |
| 중경 나무 | `#193A3E` |
| 근경·지형 | `#285144` |
| 환경 외곽선 | `#45494B` |
| 달빛 기본색 | `#FFF6D8` |
| 발판 윗면·달빛 보조색 | `#DCEB85` |
| 별·별꽃 중심 | `#F5DF4F` |
| 반딧불 보조광 | `#3DBFE3` |

배경은 밤색 3단계로 깊이를 만들고, 충돌 가능한 발판 윗면에만 밝은 달빛 띠를 둔다. 노란색과 청록색은 수집물·반딧불·별꽃에 제한해 진행 경로의 시각 신호를 보존한다.

## 생성 기록

- 생성 방식: Codex 내장 이미지 생성 도구
- 참조 입력: `references/bg_normal_mid_anchor-preview.png`, `references/background-normal-preview.png`, `references/grass-tileset-preview.png`
- 후처리: 원본 변경 없이 25% 축소본과 명암 기준 이진 실루엣 검토본만 기계적으로 생성
- 최종 입력 프롬프트:

```text
Create a clean grayscale concept anchor contact sheet for an original side-scrolling 2D cel-cartoon children's platformer stage called Starlight Forest. Use the supplied project images only as style references for rounded shapes, bold readable outlines, restrained two-to-three-tone shading, and child-friendly clarity; do not copy their composition. Landscape 3:2 canvas. The upper roughly 70 percent is one continuous 16:9 gameplay panorama: a crescent moon in the upper left, layered distant forest hills, tall vertical tree trunks and rounded canopies in the middle distance, readable branch platforms and ground silhouettes, and a monumental star-shaped tree landmark at the far right endpoint. Keep a clear horizontal gameplay corridor and strong separation between background and collision surfaces. The lower roughly 30 percent is an orderly strip of isolated reusable modules on a plain background: broad ground platform, floating moonlit branch platform, cliff/root edge, crescent-moon branch decoration, bush-and-rock cluster, and small firefly plus star-flower decorations. Strict grayscale only. No characters, enemies, collectibles, UI, text, labels, logos, watermarks, photorealism, 3D rendering, painterly texture, or pixel art. Preserve generous transparent-looking spacing around every lower module and make every silhouette readable at 25 percent scale.
```

## 사용자 확인 게이트

다음 네 항목을 함께 확인한다.

- 전체 파노라마가 ‘별빛 숲’으로 보이는가
- 오른쪽 별나무가 종료 지점 랜드마크로 적절한가
- 아래 지형·장식 모듈의 역할이 흑백에서도 구분되는가
- 위 승인 팔레트 적용안으로 최종 컬러 제작을 진행해도 되는가

문제가 없다면 `P2 앵커 승인`이라고 답한다. 바꾸고 싶은 부분이 있으면 `별나무를 작게`, `달을 오른쪽으로`, `발판을 더 굵게`처럼 항목을 지정한다. 승인 뒤에만 최종 배경 3레이어·64px 타일셋·장식 3종 제작과 게임 연결을 시작한다.
