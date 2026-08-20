# CHANGELOG

모든 주목할 만한 변경사항을 이 파일에 기록합니다.
형식: [버전] — 날짜 / 무엇을 · 왜

---

## [Unreleased]

### 수정 (2026-08-19)
- **처방(treat) 미리보기가 삭제 예정 줄에 비밀키 원문을 그대로 담던 문제(T1 원칙 위반 소지)**:
  `generateTreatPreview()`의 `removedItems`는 중복 제거로 삭제되는 줄의 원문을 그대로 저장했는데,
  그 줄이 비밀키였다면 사람이 읽는 미리보기 요약에 원문이 노출될 latent 위험이 있었음. `treat.mjs`에
  `maskIfSecret()`/`SECRET_LINE_PLACEHOLDER`를 추가해 비밀키 패턴에 매칭되는 줄은 마스킹 문구로
  대체하고, `checkup-cli.mjs`의 `preview`/`apply` 두 액션 모두 `loadSecretPatterns()`로 이 패턴을
  전달하도록 배선.
- **Harness로 백업한 파일을 이 도구의 `--action restore`로 되돌릴 수 없던 문제**: `backup.mjs`는
  Harness(`sodamharness`)가 설치돼 있으면 백업 생성을 위임하지만, 되돌리기(`restoreBackup()`)는
  2026-07-13에 고친 "임의 파일 읽기" 취약점 재발 방지를 위해 항상 자체 백업 폴더만 신뢰해 거부됐음
  (PRD 재감사 중 `lib/backup.mjs` 대조로 발견). 검증 안 된 외부 CLI에 경로를 그대로 넘겨 되돌리기까지
  위임하면 같은 취약점이 다른 경로로 재발할 수 있어 기능은 바꾸지 않고, `backup`/`apply` 응답과
  되돌리기 실패 메시지에 "Harness 백업은 Harness로 복구" 안내를 추가.
- **같은 파일을 1초 안에 두 번 백업하면 이전 백업이 조용히 덮어써지던 문제**(`07_SECURITY.md` §2.4
  "충돌 방지" Must 요구사항 미구현 — 대조 감사로 발견): 타임스탬프를 밀리초 단위로 바꾸고, 그래도
  겹치면 번호를 붙이는 `uniqueBackupPath()` 추가.

### 테스트
- 신규 회귀 테스트 4건(`checkup-cli.test.mjs` [26] + 신설 `backup.test.mjs` 3건, stamp를 고정해
  충돌을 결정적으로 재현). 전체 `npm test` 164→**168 PASS**(0 FAIL). `package.json`에
  `backup.test.mjs` 등록.

### 문서
- `.PRD/02_DATA_MODEL.md`·`05_AUDIT_AND_DECISIONS.md`·`11_DOCS_README_GUIDE.md`·
  `RESEARCH_SOURCES.md`에 위 발견 내용 반영(★정정), `CHECKPOINT.md`에 경위 기록.

---

## [0.1.1] — 2026-08-17

### 수정
- **README.md·README.html·README.en.md·README.en.html·codex/README.ko.md의 PRIVATE 오표기 정정**
  (`942c23b`, 2026-08-14): 저장소가 2026-08-13 PUBLIC으로 전환됐음에도 이 5개 문서는 "이 저장소는
  비공개(PRIVATE)라서..."라는 옛 문구를 그대로 갖고 있었음. clone이 필요한 진짜 이유(스크립트 파일
  단독 다운로드 링크 부재)로 문구를 정정하고, "PUBLIC 저장소"로 정확히 표기.

### 문서 · 버전
- CHECKPOINT.md·CHANGELOG.md·릴리즈 태그가 위 수정 커밋(`942c23b`)을 반영하지 못한 채 뒤처져
  있던 것을 재동기화(이 항목 자체). 코드 변경 없음.
- **`package.json`·`.claude-plugin/plugin.json`의 `version`을 `0.1.0`→`0.1.1`로 동기화**
  (`af66912`): GitHub 릴리즈 태그(`v0.1.1`)와 매니페스트 버전이 어긋나 있던 것을 정정. 코드가
  버전 문자열을 참조하는 로직이 없음을 확인(`treat.mjs`의 `plugin.json` 읽기는 `name` 필드만
  사용) — 동작 영향 0. `v0.1.1` 태그는 이 커밋을 포함하도록 재발행함(직전 태그는 발행 수 분
  이내·외부 참조 없음을 확인 후 이동 — 이미 배포돼 시간이 지난 태그였다면 이동하지 않고 새
  patch 버전을 따로 냈을 것).

---

## [0.1.0] — 2026-08-13

아래 2026-07-16~2026-07-27 사이에 누적된 "[Unreleased]" 표기 10개 항목은
[GitHub Release v0.1.0](https://github.com/sodam-ai/SoDam-Context-Eng/releases/tag/v0.1.0)
(pre-release)으로 이 날짜에 한 번에 발행되었습니다. 개별 날짜 표기는 작업 이력 추적용으로
그대로 유지합니다(구조 변경 없음).

---

## [Unreleased] — 2026-07-27

### 기능 (2026-08-03 추가)
- **깊은 검진(`/sodam-context:checkup-deep`) 신설**: 규칙만으로 못 잡는 모순·맥락없는 참조·예시
  부재·부풀림 등 5종을 AI가 직접 판단하는 기능. `commands/checkup-deep.md` 신설, `checkup-cli.mjs`에
  `--action deep-scan` 추가, `scan-secrets.mjs`에 `maskSecretsInLines()` 신규(비밀키 줄을 마스킹한
  뒤에만 AI에게 전달 — T1 "원본 미열람" 원칙 유지, `07_SECURITY.md §2.3` "부득이 읽으면 마스킹"
  조항 근거). 항상 "의심" 톤 고정, 원문 인용 금지, 실행 전 매번 사용자 동의 필수.
- **구현 중 자체 발견한 보안 결함 수정**: `deep-scan` 액션에 `isSensitiveWritePath()` 검사가 빠져
  있어 `.ssh`·`.aws` 등 자격증명 폴더도 그대로 읽어 AI에게 전달될 수 있었음(T3와 동일 결함
  클래스가 `backup` 아닌 `deep-scan` 경로에도 있었던 것). `checkup-cli.test.mjs`·`scan-secrets.test.mjs`에
  회귀테스트 추가.
- 전체 회귀: `npm test` 152→**162 PASS**(0 FAIL) · `selftest` **60 PASS**(0 FAIL, 변동 없음).

### 문서 (2026-08-04 추가)
- **README(한/영, md+html) "깊은 검진" 기능 반영**: 위 `checkup-deep` 신규 기능을 사용자 문서
  4개 파일(`README.md`/`README.en.md`/`README.html`/`README.en.html`) 전부에 동기화 반영.

### 문서 (2026-08-02 추가)
- **README(한/영, md+html) "제거(Uninstall)" 섹션 신규 추가**: `01_PRD.md §5`·`11_DOCS_README_GUIDE.md §1`이
  Must로 요구하는 "제거 방법 + 백업 보존/삭제 선택" 항목이 README.md·README.en.md 어디에도 없었던 걸
  발견(GUIDE.md 통합 이전부터 원래 없었음, git 이력으로 확인). `3-3. 제거(Uninstall) 방법`(영문:
  `3-3. Uninstalling`) 신설 — 클로드코드(`/plugin uninstall`)·코덱스(폴더 삭제)·백업 폴더
  보존/삭제 선택지를 명시. HTML 4종은 `pandoc -f gfm`으로 재생성(첫 시도 시 `-f gfm` 플래그 누락으로
  목차 앵커 ID·따옴표·lang 속성이 원본과 달라지는 회귀를 자체 발견·재수정, 단어 단위 diff로 신규 섹션
  외 100% 동일함을 확인 후 확정).

### 수정
- **`checkup-cli.mjs` 알 수 없는 `--action` 값 조용한 폴백**: `--action`에 오타 등 인식 못 하는 값을
  주면 에러 없이 **기본 검진 경로로 조용히 폴백**하던 결함 — 처방·백업을 요청한 줄 알았는데 실제로는
  아무 조치도 일어나지 않는 위험한 착각을 유발할 수 있었음. `--action` **미지정**(기존 검진, 변경 없음)
  과 **알 수 없는 값**(신규: 명확한 에러 메시지 + `exit 1`)을 분기 분리해 수정.
- **`intake-verify.mjs` CLI가 실패해도 exit 0 반환**: 파일 인자 누락·파일 읽기 실패로 `ok:false`를
  반환하는 두 경로 모두 **`exit 0`**이었음 — 2026-07-11에 `checkup-cli.mjs`에서 이미 고친 것과 동일한
  결함 클래스가 형제 파일에 남아 있었음(당시 전수 점검이 이 파일까지 미치지 못함). 두 분기에
  `process.exit(1)` 추가.
- **`checkup-cli.mjs` backup 액션이 대상 경로의 민감 여부를 검사하지 않음(T3)**: `apply` 액션엔 이미
  있는 `isSensitiveWritePath()` 검사가 `backup` 액션엔 빠져 있어, `.ssh`·`.aws` 같은 자격증명 폴더를
  backup 대상으로 지정해도 그대로 읽어 `.sodamcontext/backups/`에 평문 복사됐음(07_SECURITY 위협
  T3, §2.3·§2.7 Must 요구사항). 동일 검사를 backup 핸들러에 추가하고 거부 시 `exit 1`.

### 테스트
- 블랙박스 QA 배터리(정상 8·잘못된입력 6·경계값 8·실패 3·보안/성능 3 = 28개 시나리오)를 처음 실행해
  위 2건을 발견. `checkup-cli.test.mjs`에 회귀테스트 2건 추가, `intake-verify.mjs`용 자동 테스트가
  이번까지 **0건**이었던 공백을 메우기 위해 `intake-verify.test.mjs` 신규 생성(4건) — `package.json`
  test 스크립트에 등록.
- 이어진 별도 QA 라운드(함수 직접 호출로 `isSensitiveWritePath()` 실제 동작 검증)에서 backup 경로
  검사 누락(T3)을 추가 발견 — `checkup-cli.test.mjs`에 `[21]` 회귀테스트 1건 추가.
- 전체 회귀: `npm test` 145→151→**152 PASS**(0 FAIL) · `selftest` **60 PASS**(0 FAIL, 변동 없음) · QA
  배터리 재실행 **28 PASS**(0 FAIL), 회귀 0.

### 보안
- **처방 적용(apply)이 백업 절차 없이 호출되면 백업 없이 원본을 덮어쓰던 결함**: `commands/treat.md`의
  "백업 먼저" 지시(프롬프트)에만 의존하고 있었고, `apply` 코드 자체는 `backupFile()`을 호출하지
  않았음(08_DEEP_RESEARCH_FINDINGS.md A3 "프롬프트 지시는 준수를 보장하지 않는다" 원칙 위반). 백업을
  apply 코드 내부로 옮겨 fail-closed로 강제.
- **원자적 쓰기 3곳(apply·backupLocal·restoreBackup) 임시파일 고아 결함**: rename 실패 시 임시파일이
  폴더에 그대로 남던 문제 수정.

### 문서
- README/GUIDE(한/영, md+html)에 누락돼 있던 위 백업 강제화 내용·정확한 테스트 개수(152→153) 반영.
- **`GUIDE.md`·`GUIDE.en.md`·`GUIDE.html`·`GUIDE.en.html` 제거**: README(한/영, md+html)가 설치·빠른
  시작·사용법·문제 대처까지 이미 전부 포함하고 있어 별도 왕초보 가이드를 유지할 필요가 없다고 판단,
  중복 문서를 정리. README·`codex/README.ko.md`에 남아 있던 GUIDE 참조도 함께 제거.

### 테스트
- 전체 회귀: `npm test` **153 PASS**(0 FAIL, apply 자동 백업 회귀테스트 1건 추가) · `selftest`
  **60 PASS**(0 FAIL, 변동 없음).

---

## [Unreleased] — 2026-07-26

### 수정
- **`treat.mjs` 줄수 표시 off-by-one 버그(뒤늦은 기록)**: `checkup`은 파일을 196줄, `treat`(preview/apply)는
  같은 파일을 197줄로 서로 다르게 보고하던 결함(`7eb8497`, 2026-07-18 커밋됨). `checkup-rules.mjs`의
  `countLines()`(트레일링 개행을 줄로 안 세는 공식 기준)를 `treat.mjs`가 재사용하지 않고
  `content.split("\n").length`를 직접 써서 항상 1 더 많이 보고했음. `countLines()` import로 교체해 통일.
  **이 항목은 커밋 당시 CHANGELOG에 기록되지 않아 이번에 소급 기록함**(회귀테스트는 아래 참조).
- **`commands/checkup.md` 참고 점수 표시 자기모순**: 17·49행은 "참고 점수를 문제 개수 뒤에 보조로
  표시하라"는데, 리포트 예시 61행은 "점수는 일부러 안 보여드려요(과장 방지)"로 정반대였음(`3946d78`,
  2026-07-15에서 표시 규칙만 추가하고 예시는 Phase1 시절 문구로 방치 → `0ba89ff`가 그대로 이관, 11일간
  라이브 상태). 61행을 실제 값으로 교체 — 점수 60점은 손계산이 아니라 `computeHealthScore()`를 직접
  호출해 검증(예시 findings 구성: 높음 2건·보통 2건 → 100-2×15-2×5=60, 실행 결과와 일치 확인).
- **`codex/README.ko.md` 코덱스 온보딩 결함 2건**: ① 설치 2단계 폴더 구조 예시가 `0ba89ff`(2026-07-18)로
  git에서 완전히 삭제된 `skills/`를 여전히 안내 — 신규 사용자가 `git clone`해도 없는 폴더(`commands/`로
  교체). ② 3단계 "AGENTS.md 만드는 법" 템플릿(신규 사용자가 그대로 복사해 쓰는 내용)이 삭제된 스킬 이름
  (`sodam-context-checkup`·`treat`·`intake`)을 나열하고 있었고 **`sync`가 4개 명령 중 유일하게 통째로
  빠져** 있었음(4단계 "스킬 호출하기" 표에서도 동일하게 누락) — 코덱스는 슬래시 명령이 없어 AGENTS.md
  서술이 곧 "AI가 뭘 할 수 있는지"의 전부라 `01_PRD §5` "클로드코드+코덱스 둘 다 작동" 기준을 코덱스
  쪽에서 무력화하는 결함이었음. 실제 파일 위치(`commands/*.md`) 기준 서술로 교체 + 두 표 모두 sync 추가.

### 테스트
- **`treat.test.mjs` countLines 회귀테스트 공백 메우기**: `23차 세션`이 남긴 항목 이행. `originalLines`/
  `proposedLines`가 `checkup-rules.mjs`의 `countLines()`와 일치하는지 검증하는 테스트 3개 추가(트레일링
  개행 있음/없음, 실제 처방 후 `proposedLines`). **재현 검증**: `git show 0ba89ff:lib/treat.mjs`(수정
  전 버전)를 격리 실행해 `originalLines=4` vs `countLines()=3`로 위 버그가 실제 재현됨을 확인 — 새
  테스트가 장식이 아니라 이 버그를 실제로 잡아낸다는 것을 실측으로 증명.
- 전체 회귀: `npm test` 142→**145 PASS**(0 FAIL) · `selftest` **60 PASS**(0 FAIL), 회귀 0.

---

## [Unreleased] — 2026-07-17

### 추가
- **슬래시 명령어 4종 추가** (`commands/checkup.md`·`intake.md`·`treat.md`·`sync.md`): 지금까지 스킬 4개(자연어 트리거)만 있고 `commands/` 폴더가 비어있어 `/`를 쳐도 짧은 명령이 안 떴음. 이미 설치된 다른 플러그인(SoDam-Reverse)의 `commands/*.md` 실제 예시로 파일명=슬래시 명령 이름 규칙을 확인한 뒤, 각 파일이 해당 스킬(`sodam-context-checkup`/`intake`/`treat`/`sync`)을 그대로 위임 호출하도록 얇게 작성(로직 중복 없음). 기존 자연어 트리거는 그대로 유지.
- **검증(5단계)**: ①파일 존재·명명 확인 ②frontmatter(`description`)·본문 유효성 파싱 확인 ③각 명령이 참조하는 스킬명이 실제 `skills/` 폴더와 정확히 일치 확인 ④검증된 동작 사례(SoDam-Reverse `re-ping.md`)와 구조(frontmatter+본문) 일치 확인 ⑤`npm test`(142 PASS)·`selftest`(60 PASS) 무회귀 + `git status`로 변경 범위 확인. **라이브 확인 완료(2026-07-18)**: 실제 새 세션에서 `/sodam-context:sync`가 기존 `/sodam-context-sync`와 나란히 뜨고, 각자 다른 description으로 정확히 구분 표시됨을 사용자가 직접 확인. 이후 플러그인 제거→마켓플레이스 재등록→재설치→`/reload-plugins`(완전 재설치 경로)까지 거친 뒤에도 `sync`·`treat`·`intake` 3개(신구 형태 모두) 정상 표시 재확인(`checkup`은 화면 스크롤로 안 보였을 뿐 동일 구조).

## [Unreleased] — 2026-07-18

### 변경
- **checkup·intake·treat·sync 4종을 "스킬+명령 중복" → "명령 전용"으로 전환**: 사용자가 `/sodam-context-sync`(하이픈, 스킬 자동노출)와 `/sodam-context:sync`(콜론, 명령) 두 형태가 같이 뜨는 걸 원치 않아 하이픈 형태 제거를 요청. 스킬 이름을 유지한 채로는 하이픈 형태를 끌 방법이 없음을 SoDam-Reverse·SoDam-Harness 두 형제 저장소를 직접 대조해 확인(둘 다 "같은 이름의 스킬을 아예 안 둠"으로 회피하고 있었음 — 특별한 설정이 아니라 설계상 제약임을 재확인). 4개 스킬(`skills/sodam-context-{checkup,intake,treat,sync}/SKILL.md`)을 전부 삭제하고, 그 안내문 전문을 `commands/*.md`에 그대로 옮겨 자체 완결형으로 만듦.
- **트레이드오프(사용자에게 명시적으로 고지 후 진행)**: 자연어("설명서 점검해줘")로는 더 이상 자동으로 안 찾아지고, 반드시 `/sodam-context:*` 슬래시 명령을 정확히 입력해야만 작동함. 초보자 대상 "말로만 해도 된다"는 원래 설계 원칙의 일부를 이 4개 기능에 한해 포기하는 결정.
- **회귀 발견·수정(요청 이행 중 발견)**: `skills/*/SKILL.md` 삭제가 **코덱스 지원을 깨뜨림**을 뒤늦게 발견 — `codex/README.ko.md`의 AGENTS.md 예시 템플릿이 삭제된 `skills/.../SKILL.md` 경로를 가리키고 있었음(코덱스는 슬래시 명령이 없어 이 경로 참조가 유일한 진입 수단이었음). `commands/*.md`(새 위치, 같은 내용)로 경로를 정정해 코덱스 지원 복구. README·GUIDE(한/영)·AGENTS.md에 남아있던 하이픈 형태 명령 예시·자연어 트리거 안내(이제 거짓)도 전부 콜론 형태·정정된 설명으로 갱신.
- **검증**: `npm test` 142 PASS·`selftest` 60 PASS 무회귀 유지. 저장소 전체 grep으로 하이픈 형태(`/sodam-context-checkup` 등) 및 삭제된 `skills/.../SKILL.md` 경로 잔여 참조 0건 확인(히스토리 문서인 CHECKPOINT.md·tasks/todo.md·과거 CHANGELOG 항목은 기록 보존 원칙에 따라 의도적으로 손대지 않음).

## [Unreleased] — 2026-07-11

### 수정
- **코덱스 검진의 `CODEX_HOME` 미반영 결함 수정(검진 정확도 핵심)**: `lib/codex-merge.mjs`가 코덱스 글로벌 설명서 위치를 하드코딩된 `<home>/.codex`로만 찾고 있어, `CODEX_HOME` 환경변수로 다른 경로를 쓰는 실제 코덱스 설치(라이브 `codex doctor`로 실측 확인 — `config.toml`도 `CODEX_HOME` 바로 아래 위치)에서는 **엉뚱한 파일을 검진하는 조용한 오류**가 날 수 있었음. `collectCodexChain`에 `codexHome` 옵션 추가(미지정 시 기존 동작 100% 보존) + CLI가 `process.env.CODEX_HOME`을 읽어 전달하도록 수정. `config.toml`의 `model_instructions_file` 감지(B4)도 글로벌 디렉터리가 스캔 대상에서 아예 빠져 있던 것을 함께 수정. TDD로 회귀 테스트 4건 선작성(RED 확인) 후 패치(GREEN), 기존 테스트 전부 무회귀.

### 테스트
- **Windows CRLF 처방 회귀 테스트 추가**: `treat.mjs`의 중복제거·빈줄압축·안전키워드보존 로직이 CRLF(`\r\n`, Windows 기본 줄바꿈)에서도 정상 동작하는지 지금까지 테스트가 전무했음. 실측 확인 결과 기존 코드가 이미 CRLF를 올바르게 보존하고 있었으나(버그 아님), 이 사실을 앞으로도 보장하도록 영구 회귀 테스트로 고정(`selftest [8.6]`).

### 검증
- `_selftest.mjs` 51→**59 PASS**(CODEX_HOME 4건 + CRLF 4건) · 추적 `npm test` 67 PASS 유지, 0 FAIL. 실제 이 PC의 `CODEX_HOME`(`~/.codex_runtime`) 환경에서 CLI 라이브 재현으로 수정 전/후 차이 확인.

---

## [Unreleased] — 2026-07-11 (2차)

### 추가
- **민감 경로 최소 방어선(`lib/path-safety.mjs`, 07_SECURITY §2.2 Must)**: `apply`·`restore`(쓰기 액션)가 홈 폴더 루트·자격증명 폴더(`.ssh`·`.aws`·`.gnupg`·`.docker`)·시스템 폴더(`C:\Windows` 등)·드라이브 루트에 쓰려 하면 실행 전 차단. 지금까지 이 방어는 클로드코드 세션의 외부 Harness 훅에만 의존했는데, 코덱스·CLI 단독 실행 환경엔 그 방어가 전혀 없었음(실측 코드검토로 발견). **AppData\Roaming 전체 차단 같은 과잉 차단은 의도적으로 피함**(다른 SoDam 프로젝트의 실측 교훈 반영) — 자격증명 하위 폴더만 선별 차단.

### 수정
- **CLI exit code 불일치 수정**: `checkup-cli.mjs`가 파일 경로 없이 실행되면 `ok:false`인데도 exit code가 0이었음(다른 4개 실패 경로는 전부 1) → exit 1로 통일. 스크립트/CI가 exit code만으로 성공·실패를 오판할 위험 제거.

### 테스트
- `path-safety.test.mjs` 신규 10개 PASS + `checkup-cli.test.mjs`에 실패 경계값 3종([8]파일누락 exit code·[9]restore target누락·[10]apply대상없음) + 민감경로 CLI e2e 2종([11][12]) 추가. 추적 `npm test` 67→**82 PASS**, `selftest` 59 PASS 유지. 회귀 0.

### 추가
- **검진 탐지 심화(hint_keyword '의심' 탐지)**: `낡음(/init 그대로)·자동생성 미정제·스킬누수`를 규칙 데이터(`hint_keywords`)로
  결정론 탐지해 **"의심"**으로 보고(줄번호·감지 표현). 기존엔 "이런 것도 볼 수 있어요"라고 소개만 하던 항목을 실제로 잡음.
  데이터 주도(코드 변경 없이 JSON으로 확장)·**T1 안전**(사용자 내용 미노출). 모순·맹목참조 등 6종은 계속 '소개만'(깊은 AI 판정=Phase 3).

### 수정
- **처방 되돌리기(restore) 인자 오류 수정**: `sodam-context-treat` 스킬의 `restore` 명령 인자 순서가 코드와 반대여서
  되돌리기가 원본을 복구하지 못하고 백업을 덮어쓸 수 있었음 → 코드 계약(첫 인자=원본 파일, `--target`=백업)에 맞게 교정(e2e 검증 통과).
- **코덱스 실행 경로 안내 추가**: 3개 스킬 + `codex/README.ko.md`에 코덱스용 실행경로(`${CLAUDE_PLUGIN_ROOT}` 대신 저장소 루트 `lib/…`)
  명시 → 코덱스에서도 스킬 실행 가능(클로드코드 명령은 불변=회귀0). 도구는 실행 폴더·환경변수와 무관하게 `rules/`를 찾아 동작함을 실증.
- **코덱스 설치 문서 모순 수정**: 코덱스 설치를 GUIDE 2-B는 "`.agents/skills`에 스킬만 복사"로, `codex/README.ko.md`는 "저장소 통째 clone→루트 실행"으로
  서로 다르게 안내했고, 전자는 `lib`·`rules`가 빠져 첫 실행에서 `Cannot find module` 실패했음 → GUIDE 2-B(한·영)·README 코덱스 줄(한·영)을 검증된 clone-후-루트-실행 방식으로 통일(코드 무변경, Claude 경로 불변).
- **문서 정합성**: `AGENTS.md` 구조 설명을 실제 구조로 갱신(없는 `commands/` 제거), 루트 `CLAUDE.md`(첫 줄 `@AGENTS.md`) 추가.

### 보안
- **배포 전 자체 보안 스캔(도그푸딩)**: 도구 자신의 스캐너로 배포 대상 전체(git 추적+신규)를 점검해 **확정(진짜) 비밀키 0건** 확인.
  대입-형태 오탐 2건(test 더미 템플릿 `api_key=…`·문서 필드명 `secret:{…}`)은 소스에서 정리. 스캐너 자기 테스트(`scan-secrets.test.mjs`)의 픽스처는 의도상 유지(잡히는 게 정상 동작).
- **자기 도그푸딩(checkup)**: 도구 자신의 `AGENTS.md`(118줄)·`CLAUDE.md`가 자기 기준으로 **문제 0**임을 실증(제품이 자기 설명서를 건강하게 유지).

### 문서
- **사용자 문서 전면 재작성(현재 개발 기준)**: README·GUIDE(한·영)를 목차·설치·사전준비물·실행·사용·작동·명령어·업데이트 요약(토글)·파일위치·워크플로우·아키텍처·보안/데이터 흐름·문제대처·FAQ·라이선스 전 항목으로 확장. 왕초보(컴퓨터·AI 처음) 눈높이 + 정직 표기(처방=신규/실파일 e2e 사람게이트, 예방·동기화=예정, 코덱스=PC 전용·휴대폰 아님).
- **HTML 문서 생성(md↔html 내용 동일)**: `README.html`·`README.en.html`·`GUIDE.html`·`GUIDE.en.html`을 각 md에서 pandoc으로 생성(동일 소스 → 내용 동일 보장). 목차 앵커 100% 일치·`<details>` 토글 파싱 검증 통과. PDF 4개는 이미 제거됨(md↔pdf 불일치 원천 제거).
- **라이선스 엄격 반영**: Apache-2.0·명목적 상표(Claude/Codex)·무보증·생성물 사용자 귀속·공개 전 법무검토 고지 유지.

### 테스트
- **CLI e2e 회귀 테스트 추가**(`lib/checkup-cli.test.mjs`): checkup/backup/preview/apply/restore 전체 체인을 실제 프로세스로 검증(6/6) —
  restore 결함이 잠복했던 원인(=CLI 액션 레이어 무테스트)을 근본 차단. `npm test`로 추적 테스트 4종(67개: checkup-rules 25·scan-secrets 15·treat 20·checkup-cli 7) 일괄 실행하도록 스크립트 추가.

---

## [Unreleased] — 2026-07-12

### 수정
- **`checkupFile` 디렉터리 입력 오보고**: `existsSync`는 디렉터리에도 `true`를 반환하는데, 그 뒤 `readFileSync`의 `EISDIR` 에러가 조용히 삼켜져 디렉터리를 "문제 0건(정상)"으로 **거짓 보고**하고 있었음(실측 재현). `statSync().isFile()` 확인을 추가해 디렉터리는 파일없음과 동일하게(문진 안내 경로로) 처리.
- **`treat.mjs` 빈줄 압축 임계값 불일치**: 문서(README·GUIDE·SKILL.md)와 코드 주석은 전부 "연속 3개 이상만 압축"이라고 적혀 있었는데, 실제 `collapseBlankLines`는 "연속 2개부터" 압축하고 있었음(처방 라운드트립에서 실측 재현). 게다가 이 불일치를 잡아냈어야 할 기존 테스트가 `assert.ok(r.shrunk || !r.shrunk)`(항상 참, 무의미)로 무력화된 채 방치돼 있었던 것도 함께 발견. run-length 방식으로 재구현(문서와 일치하도록 1~2개는 보존, 3개 이상만 압축) + 무력화된 assert를 실제 검증으로 교체.

### 보안
- **`path-safety.mjs` 심볼릭 링크 우회(부분 해소)**: 문자열 기반 판정이라 `.ssh` 등 민감 경로를 심볼릭 링크로 우회할 수 있음을 실측 재현. `fs.realpathSync` 기반 해석을 추가(실패 시 기존 동작으로 안전 폴백). 표준 API(Node `fs.symlinkSync`)로 만든 링크는 차단 확인. ⚠️ Git Bash `ln -s`가 만드는 특정 링크 유형은 이 환경에서 여전히 우회됨(Windows 정션 인식의 한계로 추정) — 외부 의존성 없이는 근본 해결이 어려워 낮은 우선순위로 보류(대상 사용자층 특성상 공격 현실성 낮음).

### 추가
- **Phase 2 — 예방(prevention) hook**(`lib/prevent-write.mjs` + `hooks/hooks.json`): 설명서 저장 시도를 가로채 확정 비밀키·상한 초과(200~300줄대)는 차단(deny), 권장선 근접(200~299줄)은 확인만(ask) 요청. 새 판정 로직 없이 기존 `scan-secrets.mjs`·`checkup-rules.mjs`를 재사용(데이터 주도 원칙 준수). fail-open 설계(훅 내부 오류 시 항상 허용 — 핵심 방어는 이미 `checkup-cli.mjs`가 별도로 담당하므로 훅 오류로 사용자가 파일을 영영 못 고치는 위험을 피함). ⚠️ 부품 단위(단위테스트+CLI 프로토콜 수동검증)로는 정확성 확인됨, **실제 저장 화면에서 확인창이 뜨는지는 아직 라이브 미검증**(Claude Code 자체의 훅 디스패치 계층 문제로 추정, 이 저장소 코드 범위 밖).
- **Phase 2 — 두 설명서 동기화 확인**(`lib/sync-check.mjs` + `skills/sodam-context-sync`): `CLAUDE.md`↔`AGENTS.md`를 자동으로 합치지 않고, 안전·금지 키워드가 포함된 줄이 한쪽에만 있으면 줄 번호로 알려주는 "리포트 전용" 방식으로 구현. PRD 원안의 `@import` 방식은 이 프로젝트 자신의 근거 문서(08_DEEP_RESEARCH_FINDINGS.md A1: "@import는 절약이 아니라 정리일 뿐")와 정면 충돌해 재설계함.

### 수정
- **`apply`·`restore`의 드라이브 간 EXDEV 실패**: 임시 파일을 `os.tmpdir()`(Windows에서 항상 C드라이브)에 만든 뒤 다른 드라이브의 대상 파일로 `rename`하려다 `EXDEV: cross-device link not permitted`로 실패하던 결함. 실사용자가 D드라이브에서 되돌리기(restore)를 실행하다 실제로 마주침. `backup.mjs`에 이미 있던 올바른 패턴(tmp를 대상과 같은 폴더에 생성)을 재사용하도록 `checkup-cli.mjs`를 수정(코드 중복 제거 겸함).

### 문서
- **예방 hook·동기화 상태 문구 정직화**: 예방 hook을 두고 "준비 중"과 "자동으로 막아요"가 같은 문서 안에서 서로 모순되던 것을 "코드는 완성, 실제 발동은 검증 중"으로 통일. 동기화는 실사용자 라이브 검증이 끝나 "작동" 목록으로 이동. README 명령어 표에 누락돼 있던 `/sodam-context-sync` 행 추가.

### 검증
- 이 날짜의 변경을 거치며 `npm test` 82 → 85(3버그 수정) → 104(예방 hook) → 112(동기화) → 117(EXDEV 수정) PASS, `selftest` 59 PASS 유지, 매 단계 회귀 0 확인.

---

## [Unreleased] — 2026-07-13

### 보안
- **`restore --target` 임의 파일 읽기 취약점(발견·수정·2차 강화)**: `.sodamcontext/backups/` 밖의 임의 파일(예: 가짜 개인키 흉내 파일)을 검증 없이 그대로 `CLAUDE.md`/`AGENTS.md`에 복사하는 결함을 실제 공격 시나리오로 재현. 1차 수정(`isBackupPath` substring 검사)을 배포하자마자 자동 보안 리뷰가 "그 이름의 폴더를 아무 데나 만들면 우회 가능"한 anchored-안 된 검사임을 지적 — 즉시 대상 파일의 진짜 백업 폴더 하나에만 anchoring + `realpathSync` 기반 심볼릭 링크 우회 차단으로 재수정. 공격 재현 → 차단 확인, 정상 복원은 계속 작동 확인.

### 문서
- **README·GUIDE(한/영, md+html) 전면 최신화**: 이날까지의 실제 코드 상태(보안 수정·EXDEV 수정·테스트 82→118 확대)를 반영. 왕초보 가이드(GUIDE)에 빠져 있던 동기화(sync) 사용 단계를 신규 6-B단계로 추가(문진·검진·처방 3개만 안내하고 있었는데 실제론 sync까지 4개 기능이 작동 중이었던 누락).

### 검증
- `npm test` **118 PASS**(0 FAIL) · `selftest` **59 PASS** — 이 세션 구간 최종 회귀 0. `npm audit`(락파일 신규 생성 후 실행) 0 vulnerabilities. `git ls-files` 전체 대상 실제 시크릿 패턴 스캔 0건.

---

## [Unreleased] — 2026-07-15

### 추가
- **Phase 3 — 정기 점검 알림(좁은 범위)**(`lib/checkup-freshness.mjs`): 마지막 검진 이후 며칠 지났는지 계산해
  검진 리포트에 포함. **능동 알림·백그라운드 스케줄링은 만들지 않음**(`SODAM_FAMILY_MAP.md §1`이 "주기
  스케줄링·오케스트레이션"을 SoDamLoop 소유로 명시 — Context는 checkup이 **실행되는 시점**에만 비교).
  저장하는 것은 절대경로별 "마지막 검진 시각" 문자열뿐(파일 내용 아님, T1 무관). 기준 일수(기본 30일)는
  `rules/thresholds.json`에 데이터로 분리(`09_EXTENSIBILITY §1` 원칙). `backup.mjs`의 `findGitRoot`를
  export해 재사용 — 백업과 동일한 ".sodamcontext/ 위치 규칙"을 새로 만들지 않음.

### 테스트
- `lib/checkup-freshness.test.mjs` 신규 8개(첫 검진·기록 직후·경계값 stale 판정·손상된 상태파일 fail-safe·
  멀티파일 상태 무결성·T1 구조 검증·`.git` 없는 폴백 등) + 실제 CLI 라이브 재실행으로 1차(기록 없음)→2차
  (`daysSinceLastCheckup:0`) 전환 눈으로 확인. 전체 회귀 `npm test` 118→**126 PASS**(0 FAIL)·`selftest`
  **59 PASS** 유지, 회귀 0.

### 추가
- **Phase 3 — 건강점수(참고용)**(`lib/health-score.mjs`): 낯선 다수 베타 데이터로 "정식화"된 공식이
  아니라 **완전히 투명한 감점식**(확정 문제 1건당 -15점, 의심 1건당 -5점, 100점 만점·0점 하한 — 가중치는
  `rules/thresholds.json`에 데이터로 분리). 화면에는 항상 **"참고용(검증 전)"** 라벨을 함께 표시하고
  근거(`breakdown`)를 "왜?"로 그대로 공개(07_SECURITY §2.8 "검증 없이 표시 금지" 준수 — 검증 안 됐다고
  정직하게 밝히는 방식). 새 파일 내용을 읽지 않고 이미 계산된 findings 개수만 집계(T1 무관).
  2026-07-15 "이 저장소는 PRIVATE·본인 전용 유지" 확정에 따라, 다수 낯선 사용자 대상 검증 없이도
  참고 지표로 도입.

### 테스트
- `lib/health-score.test.mjs` 신규 8개(경계값 감점 계산·0점 하한·설정 누락 시 기본값 폴백·투명성
  검증 등) + 실제 CLI 라이브 검증(린트중복 1건 → 100-5=95점 정확히 일치) 확인. 전체 회귀 `npm test`
  126→**134 PASS**(0 FAIL)·`selftest` **59 PASS** 유지, 회귀 0.

## [Unreleased] — 2026-07-16

### 추가
- **코덱스 원클릭 설치 스크립트**(`codex/install.ps1`, Phase 2 마지막 항목): Node·Git 확인 →
  저장소 clone(또는 이미 있으면 `git pull` 업데이트 여부 확인) → `AGENTS.md` 확인/생성까지 자동화.
  `codex/README.ko.md`의 기존 수동 설치 단계를 그대로 자동화한 것(새 설치 방식 도입 아님). 실행 정책은
  절대 변경하지 않음. 실제 라이브 실행으로 PRIVATE 저장소 clone 성공까지 확인.
- **검진 — "통째 붙여넣기(JIT 위반)" 확정 판정으로 승격**(`lib/checkup-rules.mjs` `checkJitViolation`):
  Phase 3 "모순/낡음 AI 판단 강화" 5개 하위 항목(모순·맥락없는참조·통째붙여넣기·예시없음·부풀림) 중
  유일하게, 코드블록(```)의 **길이**라는 구조적 신호만으로 T1과 무관하게 결정론 판정이 가능함을 확인해
  구현. 코드블록이 15줄(기본값, `rules/thresholds.json`으로 조정 가능)을 넘으면 "의심"이 아니라 "확정"
  findings로 리포트에 포함되고, `aiSuspectQueue`(AI가 더 봐야 할 목록)에서는 빠짐. 나머지 4개 항목은
  진짜 의미 판단이 필요해 여전히 T1 충돌로 보류(별도 설계 논의 필요, 이번엔 손대지 않음).

### 수정
- `lib/_selftest.mjs`: 위 승격에 맞춰 "확장 4종이 전부 ai_suspect"라던 낡은 assertion을 "3종은
  ai_suspect·jit_violation은 rule"로 정정(실제 버그 은폐가 아니라 의도된 설계 변경 반영).
- **`checkJitViolation` 경계값 off-by-one 버그**(QA 재검증 중 발견, 2026-07-16): 닫는 ` ``` `가 없어
  파일 끝까지 이어지는 코드블록에서, 줄 분리를 `text.split(/\r?\n/)`로 직접 처리해 파일이 개행으로
  끝날 때 생기는 빈 문자열 하나를 내용 줄로 잘못 세고 있었음(예: 실제 내용 15줄인데 16줄로 오산해
  임계값 15줄 경계에서 거짓 양성 발생). 같은 파일의 `countLines`가 이미 "끝의 빈 줄 하나는 안 센다"는
  동일한 규칙을 쓰고 있었는데 `checkJitViolation`만 그 관례를 안 따른 게 원인 — `countLines`와 동일한
  정규화(`replace(/\r\n/g,"\n").split("\n")` 후 마지막 빈 줄 pop)로 맞춰 수정.

### 테스트
- `lib/checkup-rules.test.mjs`에 `checkJitViolation` 신규 7개(코드블록 없음·임계 이하·임계 초과·
  다중블록 중 1개만 초과·닫는 표시 없이 파일 끝까지 이어짐(fail-safe)·설정 누락 시 기본값·T1 취지
  일관성 확인) 추가 + 실제 CLI 라이브 검증(20줄 코드블록 → 확정 finding 1건, 참고점수 100→95점,
  aiSuspectQueue에서 제외 확인). 전체 회귀 `npm test` 134→**141 PASS**(0 FAIL)·`selftest`
  59→**60 PASS**(회귀로 1건 발견→원인분석→수정→재검증 완료), 최종 회귀 0.
- **위 off-by-one 버그 회귀 테스트 1건 추가**(2026-07-16 QA 재검증): 닫는 표시 없는 코드블록이
  정확히 임계값(15줄) + trailing newline으로 끝나는 경우를 재현해 고정. `npm test`
  141→**142 PASS**(0 FAIL), 최종 회귀 0.

## [0.1.0] — 2026-06-28

### 추가
- **검진(checkup)**: 10종 데이터 주도 규칙으로 AI 사용설명서 자동 점검
  - 확정 6종(크기·린트중복·스킬중복·충돌·초기화화석·맹목참조) + 의심 4종(JIT위반·예시부재·자동생성미정제·bloat)
  - 비밀키 T1 안전 설계: AI가 원본 파일 직접 미열람, CLI JSON 메타만 사용, 값 절대 미출력
- **문진(intake)**: 5가지 질문 인터뷰 → CLAUDE.md + AGENTS.md 자동 생성
  - 사용자 확인 후에만 쓰기(Fail-Closed), 생성 전 비밀키·크기 안전 검증
- **처방(treat)**: 문제 있는 줄 정리 — 5단계 안전 프로토콜
  - 백업 먼저 → 미리보기 → T8 안전키워드 회귀검증 → 원자적 쓰기(tmp→rename)
  - Fail-Closed: 백업 실패 즉시 중단, 사용자 "네" 후에만 실제 적용
  - 안전키워드(금지/never/must/항상/secret 포함 줄) 100% 보존 보장
  - 비고: 현재 독립 백업(`.sodamcontext/backups/`), Harness 통합은 Phase 2 예정
- **코덱스(Codex) 지원**:
  - 병합체인(`codex-merge.mjs`): 글로벌~cwd 전체 AGENTS.md 합산·32KiB 한도 판정
  - config.toml 감지(B4): `model_instructions_file` 키 자동 탐지 → "AGENTS.md 직접 수정은 헛처방" 경고
  - 수동 설치 가이드(2-B단계): `.agents/skills/` 복사 방법 안내
- **사용자 문서**: README·GUIDE 한/영 + PDF 4쌍 (왕초보 단계별 가이드)
- **라이선스**: Apache 2.0 전문(LICENSE) + 저작권·상표·보증없음 고지(NOTICE)

### 설계 원칙
- T1 안전: 비밀키 값 읽지 않음·마스킹만(`sk-ant-…REDACTED`)·자동삭제 없음
- Fail-Closed: 사용자 "네" 전에 파일 쓰기 절대 금지
- 점수 숨김: "문제 ○건"으로만 표시 (검증 안 된 점수 과장 방지)
- 데이터 주도: 검진 규칙은 `rules/*.json` — 코드 변경 없이 JSON만 수정

### Phase 2 상태 (2026-07-17 갱신 — 이 절은 "이 릴리스에서 바뀐 것"이 아니라 현재 진행 상태 요약이라, 사실과 어긋난 항목은 그때그때 갱신함)
- ~~Harness 통합 처방~~ → **폐기, 독립 방식으로 확정**: 이후 결정(PRE-4)으로 백업·되돌리기는 처음부터 독립 실행(`backup.mjs`)으로 구현됨. Harness 위임은 불필요 판단해 채택하지 않음(미착수 아니라 계획 변경).
- ~~예방(prevention) hook: 200줄 초과·비밀키 진입 시 사전 차단~~ → **✅ 코드 완료 + 라이브 검증 완료**(2026-07-17): 완전히 새로운 세션에서 CLAUDE.md를 252줄로 늘리는 실제 Write를 시도한 원본 세션 기록(jsonl)을 직접 확인 — `prevent-write.mjs`가 실제로 호출돼(exitCode 0) `permissionDecision:"ask"`, `"설명서가 252줄이 돼요(권장 200줄). 그래도 이대로 저장할까요?"`를 정확히 반환했고, `permissionMode:"default"`(자동승인 아님)로 진짜 승인 절차를 거침. SoDamHarness의 별도 백업 확인 훅과도 충돌 없이 함께 작동함을 확인. 여러 세션에 걸쳐 미해결이었던 "라이브에서 예방훅이 실제로 뜨는가" 질문이 이번에 최초로 명확한 증거로 해소됨(직전 대화 텍스트만으로는 승인창이 안 보였던 게 오판의 원인이었음 — 원본 세션 로그로 재확인 후 정정).
- 생존 진단(A2): `/compact` 후 rules 소실 경고 — 미착수(변동 없음).
- ~~CLAUDE.md ↔ AGENTS.md 동기화~~ → **✅ 완료**(2026-07-12, 위 항목 참고. 실사용자 라이브 검증까지 끝남).
- 초보자 베타 검증: 직접 체험 — 사람이 진행 필요(변동 없음, 유일하게 남은 헤드라인 성공기준).
