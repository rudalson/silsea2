# GitHub Wiki 마이그레이션 및 등록 가이드

이 문서는 본 저장소의 `wiki/` 폴더에 작성된 위키 문서들을 실제 GitHub 저장소의 **Wiki 탭**으로 복사 및 등록하는 방법을 설명합니다.

---

## 방법 1: Git CLI를 이용한 초간단 1분 업로드 (권장)

GitHub의 모든 Wiki는 독립된 Git 저장소로 동작합니다. 로컬 터미널에서 위키 저장소를 clone하여 파일을 복사한 뒤 push하면 즉시 반영됩니다.

### 1단계: GitHub 저장소에서 Wiki 기능 활성화
1. GitHub 저장소 웹페이지로 이동합니다.
2. 상단 메뉴의 **Settings** -> **Features** 섹션에서 **Wikis** 항목이 체크되어 있는지 확인합니다.
3. 상단 메뉴에 생긴 **Wiki** 탭을 클릭하고, 첫 페이지 생성(Create the first page) 버튼을 눌러 임의로 저장(Save)합니다. (저장소 생성 트리거)

### 2단계: 위키 Git 저장소 Clone
터미널을 열고 저장소 바깥(예: 임시 폴더 또는 홈 디렉토리)에서 위키 저장소를 clone합니다:

```bash
# 본인의 GitHub 계정 및 저장소 이름으로 변경
git clone https://github.com/<사용자명>/<저장소명>.wiki.git silsea-wiki
cd silsea-wiki
```

### 3단계: `wiki/` 폴더 파일 복사 및 Push
프로젝트의 `wiki/` 폴더 안에 있는 파일들을 clone한 위키 저장소로 복사합니다:

```bash
# Windows PowerShell 예시:
# (현재 위치: silsea-wiki 폴더)
Copy-Item -Path "c:\Users\SSAFY\repo\silsea2\wiki\*.md" -Destination "." -Force

# Git 커밋 및 Push
git add .
git commit -m "docs: import initial project wiki documents"
git push origin master  # 또는 main
```

**완료!** GitHub 저장소의 Wiki 탭을 새로고침하면 `Home.md`와 `_Sidebar.md`가 적용된 깔끔한 공식 위키가 완성됩니다.

---

## 방법 2: GitHub 웹 에디터로 직접 등록

터미널을 사용하지 않고 브라우저에서 직접 등록하려면:
1. GitHub 저장소의 **Wiki** 탭으로 이동합니다.
2. **New Page** 버튼을 누릅니다.
3. 페이지 제목(Page Title)을 파일명(확장자 제외)과 동일하게 입력합니다:
   - `_Sidebar`
   - `Development-Roadmap`
   - `Stage-Expansion-History`
   - `Feature-Expansions`
   - `Performance-and-Testing`
   - `Reviews-Index`
4. 본문 내용에 `wiki/` 폴더의 해당 마크다운 파일 내용을 복사-붙여넣기하고 **Save Page**를 누릅니다.

---

## 🧹 위키 업로드 후 저장소 정리 (선택 사항)

위키로 내용을 모두 업로드한 후 프로젝트 저장소 내부의 용량을 더욱 줄이고 싶다면, 저장소 본체에서 다음 폴더를 완전히 삭제할 수 있습니다:

```bash
# 아카이브 폴더 삭제 (필요한 경우)
git rm -r docs/archive
git commit -m "docs: clean up archived documents after migrating to github wiki"
```

> [!NOTE]
> `references/mapping.json` 및 `references/asset-report.html`은 빌드 및 CI 스크립트가 참조하므로 절대 삭제하지 마십시오.
