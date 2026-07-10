# CHANGELOG

모든 주목할 만한 변경사항을 이 파일에 기록합니다.
형식: [버전] — 날짜 / 무엇을 · 왜

---

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

### Phase 2 예정
- Harness 통합 처방: 백업·되돌리기를 SoDam-Harness에 위임 (현재는 독립 폴백)
- 예방(prevention) hook: 200줄 초과·비밀키 진입 시 사전 차단
- 생존 진단(A2): `/compact` 후 rules 소실 경고
- CLAUDE.md ↔ AGENTS.md 동기화
- 초보자 베타 검증: 직접 체험 — 사람이 진행 필요
