# SoDamContext — Codex 수동 설치 가이드 (한국어)

Codex(OpenAI)에서 SoDamContext 스킬을 사용하려면  
Claude Code와 달리 플러그인 마켓이 없어서 **직접 파일을 복사**해야 합니다.

이 문서는 개발 경험이 없어도 따라할 수 있도록 단계별로 안내합니다.

---

## 준비물 확인

설치 전에 아래 두 가지가 준비돼 있는지 확인하세요.

| 준비물 | 확인 방법 | 필요 버전 |
|--------|-----------|-----------|
| **Node.js** | 터미널에서 `node --version` 입력 | v18 이상 |
| **Git** | 터미널에서 `git --version` 입력 | 아무 버전 |

Node.js가 없으면 → https://nodejs.org 에서 LTS 버전 설치 후 진행하세요.

---

## 설치 단계

### 1단계 — 저장소 받기

터미널(명령 프롬프트)을 열고 원하는 폴더로 이동한 뒤 아래 명령어를 입력하세요:

```bash
git clone https://github.com/sodam-ai/SoDam-Context-Eng.git
cd SoDam-Context-Eng
```

> 이미 받아둔 폴더가 있다면 그 폴더로 이동하면 됩니다.

---

### 2단계 — Codex에서 프로젝트 루트 열기

Codex 에이전트를 시작할 때 반드시 **프로젝트 루트 폴더**에서 실행해야 합니다.

```
sodam-context-eng/   ← 여기서 실행 (이 폴더가 루트)
├── AGENTS.md
├── skills/
├── lib/
└── ...
```

> ⚠️ 중요: `lib/` 안의 코드가 `./lib/...` 상대 경로로 동작하기 때문에,
> 루트가 아닌 다른 폴더에서 실행하면 "파일을 찾을 수 없어요" 오류가 납니다.

---

### 3단계 — AGENTS.md 확인

Codex는 프로젝트 루트의 `AGENTS.md` 파일을 자동으로 읽습니다.  
이미 `AGENTS.md`가 있으면 바로 스킬을 쓸 수 있습니다.

없다면 아래 내용으로 `AGENTS.md` 파일을 만드세요:

```markdown
# SoDamContext — Codex 설정

이 프로젝트에는 AI 사용설명서(AGENTS.md·CLAUDE.md) 건강검진 스킬이 있습니다.

## 사용 가능한 스킬

- `sodam-context-checkup` — 설명서 건강검진 (skills/sodam-context-checkup/SKILL.md)
- `sodam-context-treat` — 발견한 문제 처방 (skills/sodam-context-treat/SKILL.md)
- `sodam-context-intake` — 설명서 초기 생성 (skills/sodam-context-intake/SKILL.md)
```

---

### 4단계 — 스킬 호출하기

Codex 대화창에서 아래처럼 말하면 됩니다:

| 원하는 작업 | 입력 예시 |
|-------------|-----------|
| 설명서 건강검진 | "내 AGENTS.md 건강검진 해줘" |
| 발견한 문제 처방 | "설명서 고쳐줘" 또는 "처방해줘" |
| 설명서 새로 만들기 | "AI 사용설명서 처음부터 만들어줘" |

---

## 동작 방식

SoDamContext 스킬은 내부적으로 Node.js를 사용합니다.

```
Codex → SKILL.md 읽기 → node -e "..." 실행 → 결과 분석 → 리포트 출력
```

모든 처리는 **로컬에서만** 이루어집니다. 외부 서버로 데이터를 보내지 않습니다.

---

## 자주 묻는 질문

**Q. "Cannot find module './lib/checkup-rules.mjs'" 오류가 나요.**  
→ 프로젝트 루트(`sodam-context-eng/`)가 아닌 다른 폴더에서 실행하고 있을 가능성이 높아요.  
현재 위치를 `pwd`(Mac/Linux) 또는 `cd`(Windows) 명령으로 확인하고 루트로 이동하세요.

**Q. node 명령어를 찾을 수 없다고 해요.**  
→ Node.js가 설치되지 않았거나, 설치 후 터미널을 재시작하지 않은 경우입니다.  
nodejs.org에서 LTS 버전을 설치하고 터미널을 닫았다가 다시 열어 보세요.

**Q. Claude Code와 동시에 사용할 수 있나요?**  
→ 네. 같은 프로젝트에서 Claude Code는 `CLAUDE.md`를, Codex는 `AGENTS.md`를 각각 읽어요.  
두 파일이 공존해도 문제없습니다.

**Q. 설치 후 업데이트하려면 어떻게 해요?**  
→ 프로젝트 폴더에서 `git pull` 을 실행하면 최신 스킬로 업데이트됩니다.

---

## Claude Code 사용자라면

Claude Code에서는 Codex와 달리 플러그인 마켓에서 설치할 수 있습니다.

자세한 내용은 프로젝트 루트의 `README.md` 또는 `GUIDE.md`를 참고하세요.
