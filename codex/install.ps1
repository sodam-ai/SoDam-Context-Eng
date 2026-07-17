# SoDamContext — Codex 원클릭 설치 스크립트 (Windows PowerShell)
# codex/README.ko.md의 수동 설치 단계를 그대로 자동화합니다(새 설치 방식 아님).
# 이 스크립트는 실행 정책을 절대 변경하지 않습니다 — 차단되면 README.ko.md의 안내를 따르세요.

$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "`n▶ $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  [주의] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "  [오류] $msg" -ForegroundColor Red }

Write-Host "=== SoDamContext Codex 설치 스크립트 ===" -ForegroundColor Magenta
Write-Host "(codex/README.ko.md 수동 설치와 동일한 단계를 자동으로 진행합니다)"

# 1) 준비물 확인 (README.ko.md '준비물 확인' 표와 동일)
Write-Step "1/4 준비물 확인 (Node.js, Git)"
$nodeOk = $null -ne (Get-Command node -ErrorAction SilentlyContinue)
$gitOk  = $null -ne (Get-Command git -ErrorAction SilentlyContinue)
if (-not $nodeOk) {
  Write-Err "Node.js가 없습니다. https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행하세요."
  exit 1
}
if (-not $gitOk) {
  Write-Err "Git이 없습니다. https://git-scm.com 에서 설치한 뒤 다시 실행하세요."
  exit 1
}
Write-Ok "Node.js, Git 확인됨"

# 2) 저장소 받기 — 이미 있으면 덮어쓰지 않고 업데이트 여부만 물음(README.ko.md FAQ '업데이트=git pull'과 동일)
Write-Step "2/4 저장소 준비"
$repoUrl = "https://github.com/sodam-ai/SoDam-Context-Eng.git"
$targetDir = "SoDam-Context-Eng"

if (Test-Path (Join-Path $targetDir ".git")) {
  Write-Host "  이미 받아둔 폴더가 있어요. 최신으로 업데이트할까요? (y/n): " -NoNewline -ForegroundColor Yellow
  $ans = Read-Host
  if ($ans -eq "y") {
    Push-Location $targetDir
    git pull
    Pop-Location
    Write-Ok "업데이트 완료"
  } else {
    Write-Host "  건너뜁니다(기존 폴더 그대로 둠)."
  }
} else {
  git clone $repoUrl $targetDir
  if ($LASTEXITCODE -ne 0) {
    Write-Err "저장소 받기 실패(git clone 오류, 위 메시지 참고). 같은 이름의 무관한 폴더가 있는지 확인해 주세요."
    exit 1
  }
  Write-Ok "저장소 받기 완료"
}

Set-Location $targetDir

# 3) AGENTS.md 확인/생성 — 이미 있으면 절대 건드리지 않음(자동 덮어쓰기 금지 원칙)
Write-Step "3/4 AGENTS.md 확인"
if (Test-Path "AGENTS.md") {
  Write-Ok "AGENTS.md가 이미 있어요(그대로 둡니다)"
} else {
  Write-Host "  AGENTS.md가 없어요. 만들까요? (y/n): " -NoNewline -ForegroundColor Yellow
  $ans = Read-Host
  if ($ans -eq "y") {
    $template = @'
# SoDamContext — Codex 설정

이 프로젝트에는 AI 사용설명서(AGENTS.md·CLAUDE.md) 건강검진 스킬이 있습니다.

## 사용 가능한 스킬

- `sodam-context-checkup` — 설명서 건강검진 (commands/checkup.md)
- `sodam-context-treat` — 발견한 문제 처방 (commands/treat.md)
- `sodam-context-intake` — 설명서 초기 생성 (commands/intake.md)
'@
    Set-Content -Path "AGENTS.md" -Value $template -Encoding UTF8
    Write-Ok "AGENTS.md 생성 완료"
  } else {
    Write-Warn "AGENTS.md 없이는 Codex가 스킬을 자동으로 못 찾을 수 있어요."
  }
}

# 4) 완료 안내
Write-Step "4/4 설치 완료"
Write-Host ""
Write-Ok "설치가 끝났습니다!"
Write-Host ""
Write-Host "  다음 단계:" -ForegroundColor Cyan
Write-Host "  1. 이 폴더에서 Codex를 실행하세요: $((Get-Location).Path)"
Write-Host "  2. Codex 대화창에 이렇게 말해보세요: 내 AGENTS.md 건강검진 해줘"
Write-Host ""
Write-Host "  자세한 안내: codex/README.ko.md" -ForegroundColor DarkGray
