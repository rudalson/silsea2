# 테이프 도시 전용 타일

테이프 도시의 공용 잔디·흙 타일을 금빛 접착 리본, 청록 마감 띠, 크림색 종이층으로 교체했습니다. 배경의 금빛 테이프 길과 청록색 지붕에 맞춘 재질입니다.

바닥·단면·좌우 벽·고정 발판·이동 다리·리프트가 같은 16프레임 아틀라스를 사용합니다. 기존 64px 프레임과 이름, 2px 가장자리 확장을 유지합니다. 종이층의 기본/변형 타일은 좌우·상하 경계 픽셀이 맞아 섞어서 반복해도 이음새가 생기지 않습니다.

큰 배경과 공용 타일, 다른 스테이지의 설정, 테이프 도시의 충돌 배치·낭떠러지·감속 구간은 그대로 사용합니다. 스테이지 선택 미리보기는 새 타일을 반영했습니다.

## 실제 게임 화면

![테이프 도시 바닥](../references/tape-tiles-ground-gameplay.png)

![테이프 도시 이동 발판](../references/tape-tiles-moving-gameplay.png)

## 검증

- `npm test`, `npm run validate`, `npm run build`, `npm run validate:runtime` 통과.
- 전용 타일 16프레임, RGBA, 반복 경계, 불투명 바닥, 경사/모서리 투명 영역, 2px 확장, 양 난이도 설정과 이동 발판 연결 확인.
- 배경·공용 타일 PNG/JSON·실제 타일맵의 SHA-256을 검사해 기존 원본과 충돌 배치를 보존했음을 확인.
- 실제 Phaser에서 보통·쉬움 모두 이동 발판 착지와 이동 동기화, 감속 0.6/0.8배, 점프·비행 탈출, 다섯 필드와 두 낭떠러지, 적 접촉/밟기/40점, 보스 세 단계, 부활 후 깎인 HP 유지, 재로드, 게이트와 기록 보존 통과.
- 필드 완주: 보통 38.5초·수집물 93개, 쉬움 38.1초·수집물 92개. 최종 두 브라우저 탭의 콘솔 오류·경고 없음.
- [보통 기록](../references/tape-tiles-runtime-normal.txt), [쉬움 기록](../references/tape-tiles-runtime-easy.txt).

재현: `npm run dev` 후 `/scripts/tape-runtime.html?visualReview=level-08&debug=1&mute=1`의 검증 버튼을 누릅니다. 쉬움은 `&easy=1`을 추가합니다. 검증 진입점만 타이머 기반 60 FPS를 사용합니다.

촬영은 `debug=1`을 빼고 `&tapePreview=ground` 또는 `&tapePreview=moving`을 사용합니다. 실제 로드된 타일과 발판을 정지해 확인하는 화면입니다.

## 생성 원본과 재조립

내장 `image_gen`으로 생성한 두 재질 원본 및 정확한 프롬프트: [원화 안내](../assets/_source/tape-tiles/README.md), [프롬프트](../assets/_source/tape-tiles/prompts.json).

재조립: `node scripts/build-tape-tiles.js`. 게임용 결과는 `assets/tiles/tape_tileset.png` 및 `.json`, 배경 합성 미리보기는 `references/tape-environment-preview.png`입니다.
