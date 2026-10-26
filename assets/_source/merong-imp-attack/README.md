# 메롱 꼬마 풍선 공격 원화

내장 `image_gen` 도구로 기존 메롱 꼬마의 공격용 3포즈를 생성했습니다. 원본은 `poses.png`, 실제 전달한 프롬프트와 참조 파일은 `prompts.json`에 보존합니다. CLI/API 방식은 사용하지 않았습니다.

- 참조: `assets/_source/merong-enemies/imp-poses.png`의 캐릭터 외형·색상·화풍.
- 새 포즈: 볼 부풀리기, 입술을 오므려 풍선 불기, 짧은 혀를 내밀며 장난스러운 웃음.
- 원본 투명 알파를 유지하고 연결된 실루엣 3개를 분리했습니다. 공통 배율·128px 프레임·112px 발 기준선을 사용합니다.
- 기존 대기·보행·패배 시트는 그대로 사용합니다. 새 준비·공격·회복 시트만 추가합니다.
- 풍선과 터지는 혀는 게임의 Graphics로 그리며 실제 충돌 궤적과 같은 데이터를 사용합니다.

재현: `node scripts/build-merong-imp-attack.js`

생성 위치·배율: `frames.json`. 게임용 파일: `assets/enemies/merong_imp/merong_imp_{warning,attack,recover}.png`와 각 상태의 개별 프레임.
