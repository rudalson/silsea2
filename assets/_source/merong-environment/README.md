# 메롱왕국 전용 왕관 정원

내장 `image_gen`으로 만든 새 환경 원화 6개다. 정확한 프롬프트와 유지한 기존 이미지의 SHA-256은 `prompts.json`에 보존한다.

- `mid.png`: 분홍·아이보리 석조 회랑과 보라 정자, 덩굴. 투명 중경.
- `near.png`: 보랏빛 말린 가지와 늘어진 분홍·민트 잎, 왕관 모양 관목. 투명 근경.
- `stone.png`: 분홍·보라 석회암 벽의 불투명 반복 재질.
- `planter.png`: 왕관 관목과 길게 말린 잎이 있는 석조 화분.
- `lantern.png`: 왕관 지붕과 혀 모양 술 장식의 등불. 배경 소품 및 체크포인트.
- `palace.png`: 중앙 통로까지 투명한 입 모양 왕관 궁전 아치.

`npm run merong:environment`는 알파를 유지해 중경·근경을 2048×720으로 정규화하고, 소품의 투명 여백을 크롭·축소한다. 석조 재질에 코드로 정렬한 아이보리 처마띠를 조합해 기존 16개 지형 프레임 규격과 2px extrusion을 맞춘다. 실제 발판·낭떠러지·적·아이템·체크포인트 판정 좌표는 그대로 사용한다.

출력은 `assets/backgrounds/bg_merong_mid.png`, `bg_merong_near.png`, `stage_preview_merong.png`, `assets/tiles/merong_tileset.*`, `assets/decorations/decor_merong_*.png`다. 원경 `assets/backgrounds/bg_merong_far.png`는 읽기만 하며 해시가 달라지면 조립을 중단한다. 다른 스테이지의 공용 에셋은 덮어쓰지 않는다.

합성 미리보기: `references/merong-environment-preview.png`. 단독 검사: `node scripts/test-merong-environment.js`.
