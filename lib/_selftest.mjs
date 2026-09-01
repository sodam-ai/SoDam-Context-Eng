// SoDamContext — _selftest.mjs
// M0 검진 엔진 + 비밀키 스캐너를 '실제 동작'으로 검사한다.
// ★정정(2026-09-01): 예전엔 .gitignore로 배포 제외됐으나, package.json의 "selftest" 스크립트가
// 이 파일을 가리키는 채로 공개돼 있어 실제로는 이 파일이 없는 모든 사용자에게 `npm run selftest`가
// 깨진 명령이었다(원격 저장소에 파일 자체가 없었음, 실측 확인). 다른 lib/*.test.mjs와 동일하게
// 정식 커밋으로 전환.
// ★최우선 검증(T1): 비밀키 스캔 결과(JSON) 어디에도 '원문 값'이 들어가지 않는다.
// 주의: 아래 키들은 전부 '가짜'(형식만 흉내). 진짜 키 아님.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSecretPatterns, scanText, scanFile } from "./scan-secrets.mjs";
import { loadRules, runRuleChecks, byteLength, listAiSuspectChecks } from "./checkup-rules.mjs";
import { verifyIntake } from "./intake-verify.mjs";
import { collectCodexChain, checkCodexBudget } from "./codex-merge.mjs";
import { backupFile, restoreBackup } from "./backup.mjs";
import { loadSafeKeywords, isSafeLine, generateTreatPreview } from "./treat.mjs";
import { verifyTreatment } from "./treat-verify.mjs";
import os from "node:os";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";

const here = path.dirname(fileURLToPath(import.meta.url));
const rulesDir = path.join(here, "..", "rules");

let pass = 0;
let fail = 0;
function check(name, cond, detail) {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}   ${detail || ""}`);
  }
}

console.log("SoDamContext M0 자가 테스트\n");

const patterns = loadSecretPatterns(rulesDir);
const rules = loadRules(rulesDir);

// ── 비밀키 스캐너 (가짜 키) ──
const FAKE_ANTHROPIC = "sk-ant-" + "A".repeat(40);
const FAKE_AWS = "AKIA" + "ABCDEFGHIJKLMNOP"; // AKIA + 16자
const FAKE_PW_VALUE = "supersecret123";

console.log("[1] 비밀키 스캐너");
{
  const f = scanText(`줄1\nkey = ${FAKE_ANTHROPIC}\n줄3`, patterns);
  check("Anthropic 형식 키 → 발견(확정)", f.some((x) => x.confidence === "확정"), JSON.stringify(f));
  const blob = JSON.stringify(f);
  check("★결과에 비밀키 원문 0건 (T1)", !blob.includes(FAKE_ANTHROPIC) && !blob.includes("A".repeat(40)), blob);
  check("마스킹 표시만 노출(…REDACTED)", f.some((x) => String(x.masked).includes("REDACTED")), JSON.stringify(f));
  check("줄 번호 보고(2번째 줄)", f.some((x) => x.line === 2), JSON.stringify(f));
}
{
  const f = scanText(`AWS = ${FAKE_AWS}`, patterns);
  check("AWS 형식 키 → 발견(확정)", f.some((x) => x.confidence === "확정"), JSON.stringify(f));
  check("★AWS 원문 유출 0", !JSON.stringify(f).includes(FAKE_AWS), JSON.stringify(f));
}
{
  const f = scanText(`password = ${FAKE_PW_VALUE}`, patterns);
  check("password 대입 → 의심", f.some((x) => x.confidence === "의심"), JSON.stringify(f));
  check("★의심 값 원문 유출 0", !JSON.stringify(f).includes(FAKE_PW_VALUE), JSON.stringify(f));
}
{
  const f = scanText("그냥 평범한 한국어 설명서입니다. 한국어로 답해주세요.", patterns);
  check("비밀키 없는 글 → 0건", f.length === 0, JSON.stringify(f));
}
{
  const r = scanFile(path.join(rulesDir, "__없는파일__.json"), patterns);
  check("없는 파일 → ok·found:false", r.ok === true && r.found === false, JSON.stringify(r));
}

// ── 크기(군더더기/크기) ──
console.log("\n[2] 크기 검진");
{
  const big = Array.from({ length: 320 }, (_, i) => `규칙 ${i}`).join("\n");
  const r = runRuleChecks(big, "claude", rules);
  check("320줄 CLAUDE.md → 군더더기(높음)", r.findings.some((x) => x.id === "size" && x.severity === "높음"), JSON.stringify(r.findings.slice(0, 1)));
}
{
  const mid = Array.from({ length: 230 }, (_, i) => `규칙 ${i}`).join("\n");
  const r = runRuleChecks(mid, "claude", rules);
  check("230줄 → 군더더기(보통)", r.findings.some((x) => x.id === "size" && x.severity === "보통"), JSON.stringify(r.findings.slice(0, 1)));
}
{
  const small = "한국어로 답해주세요.\n비밀키 절대 금지.";
  const r = runRuleChecks(small, "claude", rules);
  check("짧고 깨끗한 글 → 크기 문제 없음", !r.findings.some((x) => x.id === "size"), JSON.stringify(r.findings));
}
{
  const koreanBig = "가".repeat(12000); // 12000자 × 3바이트 = 36000 > 32768
  const r = runRuleChecks(koreanBig, "codex", rules);
  check("한글 12000자(>32KiB) → 코덱스 크기 경고(높음)", r.findings.some((x) => x.id === "size" && x.severity === "높음"), JSON.stringify({ bytes: r.bytes }));
  check("한글 3바이트 계산 확인", byteLength("가") === 3, String(byteLength("가")));
}

// ── 린트 중복 ──
console.log("\n[3] 린트 중복");
{
  const t = "한국어로 답해.\n변수명은 camelCase로.\n세미콜론을 꼭 붙여.";
  const r = runRuleChecks(t, "claude", rules);
  const lint = r.findings.filter((x) => x.id === "lint_leakage");
  check("린트 키워드(변수명/세미콜론) → 2건 이상", lint.length >= 2, JSON.stringify(lint));
}
{
  const t = "이 프로젝트는 가계부 앱이에요.\n사용자 데이터는 안전하게 다뤄요.";
  const r = runRuleChecks(t, "claude", rules);
  check("형식 얘기 없는 글 → 린트 0건", r.findings.filter((x) => x.id === "lint_leakage").length === 0, JSON.stringify(r.findings));
}

// ── 데이터 주도 구조 ──
console.log("\n[4] 데이터 주도 구조");
{
  const ai = listAiSuspectChecks(rules);
  check("AI 의심 항목 7종 이상 로드", ai.length >= 7, String(ai.length));
  const aiIds = ai.map((x) => x.id);
  check("확장 3종(예시·자동생성·bloat) 모두 ai_suspect로 로드", ["no_examples", "auto_unrefined", "bloat"].every((id) => aiIds.includes(id)), JSON.stringify(aiIds));
  check(
    "jit_violation은 2026-07-16부터 확정 rule로 승격(더 이상 ai_suspect 아님)",
    !aiIds.includes("jit_violation") && (rules.checkupRules.checks || []).some((c) => c.id === "jit_violation" && c.kind === "rule"),
    JSON.stringify(rules.checkupRules.checks.find((c) => c.id === "jit_violation"))
  );
}

// ── 문진 생성물 검증(intake-verify) — 쓰기 전 안전 게이트 ──
console.log("\n[6] 문진 생성물 검증");
{
  const good = "# 우리 가계부 앱\n한국어로 답해주세요.\n비밀번호는 코드에 쓰지 마세요.";
  const r = verifyIntake(good, "claude");
  check("깨끗한 작은 설명서 → safe:true", r.safe === true, JSON.stringify(r));
}
{
  const withKey = `# 앱 설명서\napi_key = ${FAKE_ANTHROPIC}`;
  const r = verifyIntake(withKey, "claude");
  check("★생성물에 비밀키 → safe:false(쓰기 차단)", r.safe === false && r.secretCount >= 1, JSON.stringify(r));
  check("★검증 결과에 비밀키 원문 0건 (T1)", !JSON.stringify(r).includes(FAKE_ANTHROPIC), JSON.stringify(r));
}
{
  const tooLong = Array.from({ length: 250 }, (_, i) => `규칙 ${i}`).join("\n");
  const r = verifyIntake(tooLong, "claude");
  check("250줄 → safe:false(너무 김)", r.safe === false && r.sizeOk === false, JSON.stringify({ lines: r.lines }));
}

// ── 코덱스 병합 체인(codex-merge) — 단일파일 아닌 체인 전체·바이트 ──
console.log("\n[7] 코덱스 병합 체인");
{
  const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "sdc-codex-"));
  const sub = path.join(tmpRoot, "sub");
  mkdirSync(sub, { recursive: true });
  writeFileSync(path.join(tmpRoot, "AGENTS.md"), "상위", "utf8"); // '상위'=6바이트(한글3배)
  writeFileSync(path.join(sub, "AGENTS.md"), "하위둘", "utf8"); // '하위둘'=9바이트
  const noHome = path.join(tmpRoot, "__no_home__"); // 존재 안 함 → 글로벌 0
  const chain = collectCodexChain(sub, { homeDir: noHome, gitRoot: tmpRoot });
  check("체인 파일 2개 수집(글로벌 제외)", chain.count === 2, JSON.stringify(chain.files.map((f) => f.scope)));
  check("주입 순서: 상위(ancestor)→하위(cwd)", chain.files[0].scope === "ancestor" && chain.files[1].scope === "cwd", JSON.stringify(chain.files.map((f) => f.scope)));
  check("한글 바이트 합산(6+9=15)", chain.totalBytes === 15, String(chain.totalBytes));
  check("★반환에 파일 '내용' 필드 없음(T1)", !JSON.stringify(chain).includes("상위") && !JSON.stringify(chain).includes("하위둘"), JSON.stringify(chain));
  check("예산 초과/이하 판정", checkCodexBudget(40000, 32768).overLimit === true && checkCodexBudget(1000, 32768).overLimit === false, "budget");
  rmSync(tmpRoot, { recursive: true, force: true });
}

// ── B4: config.toml model_instructions_file 감지 (PRD 08 B4) ──
console.log("\n[8] config.toml 감지 (PRD 08 B4)");
{
  // config.toml에 model_instructions_file 있는 경우
  const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "sdc-toml-"));
  const sub = path.join(tmpRoot, "sub");
  mkdirSync(sub, { recursive: true });
  writeFileSync(path.join(tmpRoot, "config.toml"), '[codex]\nmodel_instructions_file = "MY_INSTRUCTIONS.md"\n', "utf8");
  writeFileSync(path.join(sub, "AGENTS.md"), "테스트", "utf8");
  const noHome = path.join(tmpRoot, "__no_home__");
  const chain = collectCodexChain(sub, { homeDir: noHome, gitRoot: tmpRoot });
  check("config.toml 감지: found=true", chain.configOverride?.found === true, JSON.stringify(chain.configOverride));
  check("config.toml 감지: 디렉터리 반환", typeof chain.configOverride?.dir === "string", JSON.stringify(chain.configOverride));
  check("config.toml 감지: 키명 반환", chain.configOverride?.key === "model_instructions_file", JSON.stringify(chain.configOverride));
  check("★config.toml 값(파일명) 미포함 (T1)", !JSON.stringify(chain).includes("MY_INSTRUCTIONS.md"), JSON.stringify(chain).slice(0, 300));
  check("AGENTS 파일 수집 계속 정상 동작", chain.count >= 1, String(chain.count));
  rmSync(tmpRoot, { recursive: true, force: true });
}
{
  // config.toml 없는 경우 → configOverride null
  const tmpRoot2 = mkdtempSync(path.join(os.tmpdir(), "sdc-toml2-"));
  writeFileSync(path.join(tmpRoot2, "AGENTS.md"), "테스트", "utf8");
  const noHome2 = path.join(tmpRoot2, "__no_home__");
  const chain2 = collectCodexChain(tmpRoot2, { homeDir: noHome2 });
  check("config.toml 없음 → configOverride null", chain2.configOverride === null, JSON.stringify(chain2.configOverride));
  rmSync(tmpRoot2, { recursive: true, force: true });
}

// ── [8.5] CODEX_HOME 오버라이드 (실측 발견: 하드코딩 <home>/.codex는 CODEX_HOME 무시 → 검진 오탐 위험) ──
console.log("\n[8.5] CODEX_HOME 오버라이드");
{
  // codexHome을 명시하면 <home>/.codex가 아니라 codexHome 자체를 글로벌로 본다
  const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "sdc-codexhome-"));
  const fakeHome = path.join(tmpRoot, "fake_home"); // <home>/.codex 자리 — 여기엔 아무것도 없음
  const customCodexHome = path.join(tmpRoot, "custom_codex_runtime"); // CODEX_HOME이 가리키는 실제 위치
  mkdirSync(customCodexHome, { recursive: true });
  writeFileSync(path.join(customCodexHome, "AGENTS.md"), "커스텀글로벌", "utf8"); // 15바이트
  const chain = collectCodexChain(tmpRoot, { homeDir: fakeHome, codexHome: customCodexHome });
  check("CODEX_HOME 지정 시 그 경로에서 글로벌 AGENTS.md 발견", chain.files.some((f) => f.scope === "global" && f.path === path.join(customCodexHome, "AGENTS.md")), JSON.stringify(chain.files));
  check("<home>/.codex(무관 경로)는 무시됨", !chain.files.some((f) => f.path.includes("fake_home")), JSON.stringify(chain.files));

  // codexHome 위치의 config.toml도 감지되어야 함(기존엔 글로벌 dir이 detectConfigToml 스캔 목록에서 아예 빠져있었음)
  writeFileSync(path.join(customCodexHome, "config.toml"), '[codex]\nmodel_instructions_file = "X.md"\n', "utf8");
  const chain2 = collectCodexChain(tmpRoot, { homeDir: fakeHome, codexHome: customCodexHome });
  check("CODEX_HOME 위치의 config.toml도 감지됨(기존엔 미탐지)", chain2.configOverride?.found === true, JSON.stringify(chain2.configOverride));

  // codexHome 미지정(undefined) → 기존 동작(<home>/.codex) 그대로 보존 — 회귀 방지
  const chain3 = collectCodexChain(tmpRoot, { homeDir: fakeHome });
  check("codexHome 미지정 시 기존 동작(homeDir/.codex) 보존", chain3.files.every((f) => f.scope !== "global"), JSON.stringify(chain3.files));
  rmSync(tmpRoot, { recursive: true, force: true });
}

// ── [8.6] Windows CRLF 처방 보존 (실측 확인: 기존 커버리지 0이던 지점) ──
console.log("\n[8.6] CRLF(Windows 줄바꿈) 처방 보존");
{
  const crlf = "규칙1\r\n규칙1\r\n절대 force push 금지.\r\n\r\n\r\n\r\n규칙2\r\n";
  const r = generateTreatPreview(crlf, ["절대", "force push"]);
  check("CRLF 유지(모든 줄이 \\r로 끝남, 마지막 빈 요소 제외)", r.proposed.split("\n").every((l, i, a) => i === a.length - 1 || l.endsWith("\r")), JSON.stringify(r.proposed));
  check("CRLF에서도 중복 줄 정상 제거", r.removedItems.some((x) => x.rule === "duplicate"), JSON.stringify(r.removedItems));
  check("CRLF에서도 안전키워드 줄 보존", r.proposed.includes("절대 force push 금지."), r.proposed);
  check("CRLF 연속 빈 줄도 정상 압축", r.proposed.split("\r\n").filter((l) => l === "").length < crlf.split("\r\n").filter((l) => l === "").length, JSON.stringify(r.proposed));
}

// ── [9] backup.mjs — 원자적 쓰기 · .gitignore · fail-closed ──
console.log("\n[9] backup.mjs");
{
  const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "sdc-backup-"));
  const srcFile = path.join(tmpRoot, "CLAUDE.md");
  // 안전키워드 포함 내용으로 원본 작성
  writeFileSync(srcFile, "한국어로 답해주세요.\n비밀키 절대 금지.\nforce push 금지.", "utf8");

  const result = await backupFile(srcFile, { projectRoot: tmpRoot, useHarness: false });

  check("백업 method=local", result.method === "local", JSON.stringify(result));
  check("백업 파일 생성됨", result.backupPath !== null && existsSync(result.backupPath), String(result.backupPath));
  check("백업 내용 일치", readFileSync(result.backupPath, "utf8") === readFileSync(srcFile, "utf8"), "content");
  check(".gitignore 자동 생성됨", existsSync(path.join(tmpRoot, ".gitignore")), "gitignore");
  check(".gitignore에 backups 경로 포함", readFileSync(path.join(tmpRoot, ".gitignore"), "utf8").includes(".sodamcontext/backups"), "gitignore content");

  // restoreBackup 테스트
  writeFileSync(srcFile, "변경된 내용", "utf8");
  restoreBackup(result.backupPath, srcFile);
  check("restoreBackup 원본 복원", readFileSync(srcFile, "utf8") === "한국어로 답해주세요.\n비밀키 절대 금지.\nforce push 금지.", "restored");

  rmSync(tmpRoot, { recursive: true, force: true });
}
{
  // 존재하지 않는 파일 → throw (fail-closed)
  let threw = false;
  try {
    await backupFile("/절대/없는/파일.md", { useHarness: false });
  } catch {
    threw = true;
  }
  check("★ 없는 파일 백업 → throw (fail-closed)", threw, "must throw");
}

// ── [10] treat.mjs + treat-verify.mjs — 안전키워드 보존 · 중복제거 ──
console.log("\n[10] treat.mjs + treat-verify.mjs");
{
  const keywords = ["금지", "절대", "never", "must", "force push", "critical"];

  // 중복 줄 제거 확인
  const content = [
    "한국어로 답해주세요.",
    "비밀키 절대 금지.",         // safe line
    "한국어로 답해주세요.",       // 중복 → 제거 대상
    "코드는 간결하게.",
    "코드는 간결하게.",           // 중복 → 제거 대상
    "force push 절대 금지.",     // safe line (절대 + force push)
  ].join("\n");

  const preview = generateTreatPreview(content, keywords);

  check("treat: 중복 2건 제거됨", preview.removedCount >= 2, String(preview.removedCount));
  check("treat: 처방 후 줄 수 감소", preview.proposedLines < preview.originalLines, `${preview.proposedLines} < ${preview.originalLines}`);
  check("treat: safe=true (크기 감소)", preview.safe === true, JSON.stringify(preview.safe));

  // 안전키워드 줄 보존 확인
  check("★ 안전키워드 줄 treat 제외 (절대)", preview.proposed.includes("비밀키 절대 금지."), "must contain");
  check("★ 안전키워드 줄 treat 제외 (force push)", preview.proposed.includes("force push 절대 금지."), "must contain");

  // treat-verify: 안전키워드 100% 보존
  const verify = verifyTreatment(content, preview.proposed, keywords);
  check("★ verifyTreatment: safe=true (안전키워드 보존)", verify.safe === true, JSON.stringify(verify));
  check("verifyTreatment: missingSafeLines 없음", verify.missingSafeLines.length === 0, JSON.stringify(verify.missingSafeLines));
}
{
  // 처방 후 더 커지는 경우 → safe=false
  const small = "한국어로 답해주세요.";
  const preview2 = generateTreatPreview(small, []);
  check("treat: 이미 최적화된 파일 → safe=false", preview2.safe === false, JSON.stringify(preview2.safe));
}
{
  // verifyTreatment: 안전키워드 줄이 사라지면 safe=false
  const keywords2 = ["금지"];
  const orig = "비밀키 절대 금지.\n중복줄.\n중복줄.";
  const badProposed = "중복줄."; // 안전키워드 줄 누락
  const verify2 = verifyTreatment(orig, badProposed, keywords2);
  check("★ verifyTreatment: 안전키워드 누락 → safe=false", verify2.safe === false, JSON.stringify(verify2.safe));
  check("★ verifyTreatment: missingSafeLines 존재", verify2.missingSafeLines.length > 0, JSON.stringify(verify2.missingSafeLines));
}

console.log(`\n결과: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
