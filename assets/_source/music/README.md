# N4 피아노 나라 원화

스케치의 둥근 건반 몸체·안경·음표와 하프를 바탕으로 이 대화의 built-in imagegen으로 제작했다.
`music-poses.png`는 대기·예고·공격·약점·피격·패배 6포즈, `kingdom.png`는 피아노 나라 배경 원본이다.
정확한 프롬프트는 `prompts.json`, 공통 배율과 추출 좌표는 `frames.json`에 보존한다.
`npm run music:assets`로 상태별 128px RGBA 시트·배경·미리보기를 재생성한다. 상태별로 현재 단일 포즈를 사용한다.
공격 음표·정지 신호·실제 건반 지형 표시는 코드가 담당한다. 세 전용 신호음은 `npm run music:audio`로 재생성한다.
