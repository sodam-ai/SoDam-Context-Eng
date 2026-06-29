# SoDamContext — AI 지침서 (Codex · AGENTS.md)

> 이 파일은 **코덱스(Codex)** 가 이 플러그인을 만들거나 고칠 때 읽는 "AI 사용설명서"입니다.  
> 클로드코드용은 `CLAUDE.md`를 참조하세요.

---

## 이 도구가 하는 일

**SoDamContext**는 코드를 모르는 사람도 AI(클로드코드·코덱스)가 내 프로젝트를 잘 이해하도록 도와주는 도구입니다.

- `CLAUDE.md`(클로드코드용)와 `AGENTS.md`(코덱스용)를 **건강하게 만들고·점검하고·고쳐줍니다**
- 대상: 코드를 한 번도 안 짜본 완전 초보자 · 한국어 우선
- 형태: 클로드코드 플러그인 + 코덱스 스킬

---

## 역할 (코덱스가 이 도구로 할 수 있는 것)

| 역할 | 명령어/스킬 |
|------|------------|
| AI 사용설명서 만들기 (문진) | `sodam-context-intake` 스킬 |
| AI 사용설명서 건강검진 | `sodam-context-checkup` 스킬 |
| 발견된 문제 안전하게 고치기 (처방) | `sodam-context-treat` 스킬 |

---

## 절대 하지 마 (DO NOT)

1. **사용자 동의 없이 파일을 고치지 마.** 항상 백업 먼저, 미리보기 먼저, 동의 받은 후에만 실행.
2. **비밀키를 자동으로 삭제하지 마.** 오탐 위험이 있으니 발견 → 경고 → 사용자가 결정.
3. **설명서를 키우지 마.** 이 도구의 목적은 "작게". 처방 후 더 커지면 실패.
4. **안전·금지 규칙을 지우지 마.**  
   `금지` · `never` · `must` · `항상` · `secret` · `절대` · `반드시` · `하지 마` · `금함` · `forbidden` 이 포함된 줄은 건드리지 마.
5. **플러그인 폴더 밖(`../`) 파일을 참조하지 마.** 캐시 복사 시 경로가 깨짐.
6. **비밀키 값을 읽거나 출력하지 마.** "있다·없다·몇 번째 줄"만, 값은 항상 마스킹(`…REDACTED`).
7. **외부로 데이터를 보내지 마.** 100% 로컬 도구. 네트워크 전송 0.
8. **전문 용어를 기본 화면에 그대로 노출하지 마.** "CLAUDE.md" → "AI 사용설명서", "왜?"에만 진짜 용어.
9. **매니페스트에 광범위 권한을 선언하지 마.** `Bash(*)` · `bypassPermissions` · 동적 백틱 사용 금지.
10. **"100% 안전"이라고 표현하지 마.** 도구의 한계를 정직하게 알려줘.

---

## 항상 해 (ALWAYS DO)

- **바꾸기 전에 미리보기(전/후)를 보여줘**
- **고치기 전에 백업을 만들어** (`.sodamcontext/backups/`)
- **에러는 초보자도 알아듣는 쉬운 한국어로** 설명해
- **"왜?"를 물으면 진짜 이유와 출처**를 알려줘
- **만든 설명서는 200줄 이하, 비밀키 0건**으로 유지해 (Anthropic 권장)
- **스킬 본문은 짧게, 중요한 지시는 맨 위에** (압축 시 위쪽이 먼저 살아남음)
- **오탐이 있을 수 있는 항목은 "의심"으로만** 표시해 (확정 아님)

---

## 기술 구조 (코덱스가 알아야 할 것)

```
SoDamContext/
├── .claude-plugin/plugin.json    ← 플러그인 메타데이터 (수정 금지)
├── commands/                     ← 슬래시 명령어 (/sodam-context:*)
│   ├── checkup.md                ← /sodam-context:checkup
│   ├── intake.md                 ← /sodam-context:intake
│   └── treat.md                  ← /sodam-context:treat
├── skills/                       ← 클로드코드·코덱스 공통 스킬
│   ├── sodam-context-intake/SKILL.md
│   ├── context-checkup/SKILL.md
│   └── context-treat/SKILL.md
├── lib/                          ← 번들 스크립트 (Node.js ESM)
│   ├── checkup-rules.mjs         ← 규칙 기반 검진 로직
│   ├── scan-secrets.mjs          ← 비밀키 탐지 (값 미출력)
│   └── intake-verify.mjs         ← 생성 텍스트 안전 검증
├── rules/                        ← 설정 파일 (JSON)
│   ├── checkup-rules.json        ← 검진 항목 정의
│   ├── thresholds.json           ← 임계 수치 (하드코딩 금지)
│   └── secret-patterns.json      ← 비밀키 패턴
├── AGENTS.md                     ← 이 파일 (코덱스용)
├── CLAUDE.md                     ← 클로드코드용 (첫 줄 @AGENTS.md)
├── LICENSE                       ← Apache-2.0
└── NOTICE                        ← 의존성 고지
```

### 핵심 원칙 (코덱스용 요약)

- **규칙으로 확실한 것**: 줄 수(군더더기), 키워드 매칭(린트 중복) → `lib/checkup-rules.mjs` 사용
- **AI 판단이 필요한 것**: 모순·낡음·새는 전문지식·맥락없는 참조 → "의심" 톤으로만 표시
- **비밀키**: `lib/scan-secrets.mjs` — 값은 절대 읽지 않고 있다·없다만
- **백업**: `.sodamcontext/backups/` — `.gitignore` 자동 추가, 타임스탬프 파일명
- **임계 수치**: `rules/thresholds.json` 에서만 읽음 (코드에 하드코딩 금지)

---

## 사용하는 스킬

코덱스에서 이 도구의 스킬을 쓰려면 `.agents/skills/` 또는 프로젝트 폴더의 `skills/` 아래 SKILL.md 파일을 배치하세요:

| 스킬 이름 | 파일 위치 | 언제 씀 |
|-----------|-----------|---------|
| `sodam-context-intake` | `skills/sodam-context-intake/SKILL.md` | AI 사용설명서 처음 만들 때 |
| `sodam-context-checkup` | `skills/context-checkup/SKILL.md` | 건강검진 할 때 |
| `sodam-context-treat` | `skills/context-treat/SKILL.md` | 문제 고칠 때 |

---

## 한계 (정직 고지)

- 이 도구는 **"100% 정확"을 보장하지 않습니다.** "의심" 항목은 오탐이 있을 수 있어요.
- 코덱스 `AGENTS.md`는 **32KiB(32,768바이트)** 까지만 읽혀요. 한글 1자 = 3바이트.
- 비밀키 탐지는 **정규식 기반**이라 새로운 패턴은 놓칠 수 있어요.
- `@로 가져오기`는 토큰을 줄이지 않아요. `@파일`도 시작할 때 전체 로딩됩니다.

---

## 라이선스

Apache-2.0 — SoDam AI Studio, 2026
