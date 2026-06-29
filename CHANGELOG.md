# CHANGELOG

모든 주목할 만한 변경사항을 이 파일에 기록합니다.
형식: [버전] — 날짜 / 무엇을 · 왜

---

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
