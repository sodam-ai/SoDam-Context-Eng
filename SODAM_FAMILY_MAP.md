# SoDam 가족 번들 통합 명세 (Family Bundle Map)

> PRD 05 F1 "번들 통합 명세(형제 충돌 차단)" 이행 문서.
> SoDam 6개 형제 프로젝트의 역할 경계·API 계약·버전 호환 규칙을 정의합니다.
> **⚠️ 임시 파일**: 정본 경로는 `D:\AI_Dev_Work\2026y\SoDam_Family\SODAM_FAMILY_MAP.md` (PRD 09 §9)
> 이 파일은 Context-Eng 참조용 사본 — 수정 시 정본도 함께 수정할 것.

---

## 1. 가족 역할 경계 (침범 절대 금지)

| 프로젝트 | 핵심 책임 | 절대 침범 금지 |
|---------|---------|------------|
| 🛡️ Harness | 안전 게이트·백업·권한 체크 | 컨텍스트 진단·처방 |
| 📄 Context | CLAUDE.md·AGENTS.md 건강검진·처방 | 주기 스케줄링·오케스트레이션 |
| 🔁 Loop | 정기 작업·훅 반복·스케줄 관리 | 컨텍스트 파일 직접 수정 |
| 🧭 Agentic | 계획·검토·서브에이전트 오케스트레이션 | 안전 게이트 우회 |
| ✍️ Prompt | 프롬프트 품질 지원 (PRD 작성 중) | Context 문진(intake) 기능 중복 |
| 🔍 Reverse | 기존 설명서 역공학 분석 (PRD 작성 중) | Context 검진(checkup) 기능 중복 |

---

## 2. 핵심 API 계약 (v0.1.x 기준)

### SoDam-Context
```bash
# 검진
node lib/checkup-cli.mjs <파일경로> [--target claude|codex]
# 반환: { ok, file, target, secret: { found, count }, rules: { findings, lines, bytes }, summary: { problemCount } }
# ★T1: 파일 내용 미출력 — 경로·줄 수·개수만

# 처방 미리보기
node lib/checkup-cli.mjs <파일경로> --action preview
# 반환: { ok, originalLines, proposedLines, removedCount, shrunk, safe }

# 처방 적용 (사용자 확인 후에만 호출)
node lib/checkup-cli.mjs <파일경로> --action apply
# 반환: { ok, appliedPath, originalLines, proposedLines, removedCount }
# 실패: exit 1 + { ok: false, error: string }
```

### SoDam-Harness (예정 인터페이스 — Phase 2 확정 전 변경 가능)
```bash
sodamharness backup <파일경로>
# 예상 반환: { ok: boolean, backupPath: string, timestamp: string }
# 실패: exit 1 + { ok: false, error: string }
```

### SoDam-Loop (예정)
```bash
# sodamloop schedule <job-id> <cron-expr>
# 예상 반환: { ok: boolean, jobId: string, nextRun: string }
```

---

## 3. 공유 상수 (형제 간 동기화 필수)

| 상수 | Context 파일 | 설명 | 변경 시 영향 |
|------|------------|------|-----------|
| safe-keywords | `rules/safe-keywords.json` | 처방 절대 삭제 금지 키워드 | Harness 보안게이트와 동일 목록 유지 필수 |
| secret-patterns | `rules/secret-patterns.json` | 비밀키 감지 패턴 | Harness 스캔과 불일치 시 오탐·미탐 발생 |
| thresholds | `rules/thresholds.json` | 크기 한도 (CLAUDE.md ≤200줄, AGENTS.md ≤32KiB) | Loop 예방 훅과 동기화 필요 |

---

## 4. semver 호환 규칙

```
Major (x.0.0): 다른 형제 모두 호환성 검증 필수, marketplace.json 동시 업데이트
Minor (0.x.0): 기능 추가·하위 호환 유지, 개별 배포 가능
Patch (0.0.x): 버그 수정, 독립 배포 가능
```

**주의 케이스**:
- 공유 상수(safe-keywords, secret-patterns) 변경 → Minor 이상, 모든 형제에 공지
- API 시그니처 변경 → Major, 영향받는 형제 사전 협의 필수
- CLAUDE.md 줄 수 한도 변경 → thresholds.json + Loop 예방 훅 동시 업데이트

---

## 5. 의존 방향 (단방향, 순환 금지)

```
Harness (L0) ← 기반, 모든 형제가 의존 가능
    ↑
Context (L1) ← Harness 없을 때 독립 폴백 내장
    ↑
Loop (L2)    ← Context 이벤트 수신 → 정기 점검 스케줄
Agentic (L2) ← Context 리포트 소비 → 개선 계획 생성
    ↑
Prompt (L3), Reverse (L3) ← PRD 설계 중
```

**순환 금지**: `Context → Harness` 허용. `Harness → Context` 금지.

---

## 6. 버전 현황 (2026-06-28)

| 프로젝트 | 현재 버전 | Phase | AI 작업 상태 | 남은 블로커 |
|---------|---------|-------|------------|-----------|
| Harness | 0.1.0 | 1 완료 | ✅ | 사람 smoke test |
| Context | 0.1.0 | 1 완료 | ✅ | 사람 e2e·베타·법무 |
| Loop | 0.1.0-phase1a | 1a 완료 | ✅ | Stop훅 라이브 검증 |
| Agentic | 0.1.0 | init-mvp | ✅ | F2/F3/F4 라이브 검증 |
| Prompt | 0.0.0 | PRD 작성 중 | — | PRD 완성 후 착수 |
| Reverse | 0.0.0 | PRD 작성 중 | — | PRD 완성 후 착수 |

---

> 최종 수정: 2026-06-28
