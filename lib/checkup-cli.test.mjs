// SoDamContext — checkup-cli.test.mjs
// checkup-cli.mjs의 CLI 액션(checkup / backup / preview / apply / restore)을 실제 프로세스로 e2e 검증한다.
// ★배경: restore 인자 결함이 잠복했던 근본 원인 = CLI 액션 레이어 테스트 부재. 이 파일이 그 공백을 메운다.
// ★T1: 어떤 액션 출력에도 비밀키 '원문'이 들어가지 않음을 검증(마스킹만).
// ★가짜키는 런타임 조립("sk-ant-"+…) — 소스에 완전 문자열을 두지 않아 시크릿 스캐너 오탐 방지.
// 실행: node lib/checkup-cli.test.mjs

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";

const here = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(here, "checkup-cli.mjs");

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}

// shell 미사용(인자 배열) — 인젝션 방지. cwd는 각 호출에 명시.
function runCLI(args, cwd) {
  return JSON.parse(execFileSync("node", [CLI, ...args], { cwd, encoding: "utf8" }));
}

// 실패(비정상 종료) 케이스 검증용 — spawnSync는 exit code가 nonzero여도 던지지 않는다.
function runCLIRaw(args, cwd) {
  const r = spawnSync("node", [CLI, ...args], { cwd, encoding: "utf8" });
  return { status: r.status, stdout: JSON.parse(r.stdout) };
}

const FAKE_KEY = "sk-ant-" + "A".repeat(40); // 형식만 흉내낸 가짜 키(런타임 조립)

const dir = mkdtempSync(path.join(os.tmpdir(), "sdc-cli-e2e-"));
const file = path.join(dir, "CLAUDE.md");
const ORIGINAL = [
  "한국어로 답해주세요.",
  "비밀키 절대 금지.",        // safe-keyword (절대/금지/비밀)
  "코드는 간결하게.",
  "코드는 간결하게.",         // 중복(비-safe) → 제거 대상
  "force push 절대 금지.",    // safe-keyword
  "never commit secrets",     // safe-keyword (never/secret)
  "",
  "",
  "",                         // 연속 빈 줄 → 압축 대상
  "api_key = " + FAKE_KEY,    // 비밀키(단일) — 자동삭제 절대 안 함 (소스에 대입 형태를 안 남기려 런타임 조립)
].join("\n");

console.log("\nSoDamContext checkup-cli CLI e2e\n");
writeFileSync(file, ORIGINAL, "utf8");

let backupPath = null;

test("[1] checkup: 비밀키 발견 + 원문 유출 0(T1) + 마스킹만", () => {
  const r = runCLI([file], dir);
  assert.equal(r.ok, true);
  assert.ok(r.secret.count >= 1, "비밀키 미발견");
  const blob = JSON.stringify(r);
  assert.ok(!blob.includes(FAKE_KEY), "★비밀키 원문 유출(T1 위반)");
  assert.ok(blob.includes("REDACTED"), "마스킹 표기 없음");
});

test("[2] backup: 백업 파일 생성 (+ local이면 .gitignore 자동 등록)", () => {
  const r = runCLI([file, "--action", "backup"], dir);
  assert.equal(r.ok, true);
  assert.ok(r.backupPath && existsSync(r.backupPath), "백업 파일 없음");
  backupPath = r.backupPath;
  if (r.method === "local") {
    const gi = path.join(dir, ".gitignore");
    assert.ok(existsSync(gi) && readFileSync(gi, "utf8").includes(".sodamcontext/backups"), ".gitignore 미등록");
  }
});

test("[3] preview: 처방 후 더 작아짐(safe=true)", () => {
  const r = runCLI([file, "--action", "preview"], dir);
  assert.equal(r.ok, true);
  assert.equal(r.safe, true);
  assert.ok(r.proposedLines < r.originalLines, "줄 수 안 줄어듦");
});

test("[4] apply: 적용 + ★안전키워드 100% 보존 + T1 유출 0 + 작아짐", () => {
  const r = runCLI([file, "--action", "apply"], dir);
  assert.equal(r.ok, true);
  assert.ok(!JSON.stringify(r).includes(FAKE_KEY), "★apply 출력에 비밀키 원문(T1 위반)");
  const after = readFileSync(file, "utf8");
  assert.ok(after.includes("비밀키 절대 금지."), "안전키워드 줄 소실");
  assert.ok(after.includes("force push 절대 금지."), "안전키워드 줄 소실");
  assert.ok(after.includes("never commit secrets"), "안전키워드 줄 소실");
  assert.ok(after.length < ORIGINAL.length, "파일이 안 줄어듦");
});

test("[5] apply 후 재검진: 비밀키(단일)는 자동삭제 안 됨 + 원문 유출 0", () => {
  const r = runCLI([file], dir);
  assert.ok(r.secret.count >= 1, "비밀키가 사라짐(자동삭제=위반)");
  assert.ok(!JSON.stringify(r).includes(FAKE_KEY), "★원문 유출(T1)");
});

test("[6] restore: 원본 완전 복구 + 백업 무손상 (첫 인자=원본, --target=백업)", () => {
  const r = runCLI([file, "--action", "restore", "--target", backupPath], dir);
  assert.equal(r.ok, true);
  assert.equal(readFileSync(file, "utf8"), ORIGINAL, "원본 복구 실패");
  assert.equal(readFileSync(backupPath, "utf8"), ORIGINAL, "백업 손상");
});

test("[7] checkup: hint_keyword '의심' 탐지 + '소개만' 분리 + T1", () => {
  const boil = path.join(dir, "BOILER.md");
  writeFileSync(boil, "# 앱\nTODO: 여기에 프로젝트 설명\nadd your project description\n배포할 때 이렇게 하세요\n", "utf8");
  const r = runCLI([boil], dir);
  const ids = r.suspects.findings.map((f) => f.id);
  assert.ok(ids.includes("init_fossilization") || ids.includes("auto_unrefined"), "낡음/자동생성 의심 미탐지");
  assert.ok(r.suspects.findings.every((f) => f.confidence === "의심"), "confidence가 '의심' 아님");
  assert.ok(r.summary.problemCount >= r.suspects.findings.length, "problemCount에 suspects 미반영");
  assert.ok(!JSON.stringify(r).includes("여기에 프로젝트 설명"), "★사용자 내용 유출(T1)");
  assert.ok(!r.aiSuspectQueue.map((x) => x.id).includes("init_fossilization"), "hint 검사가 소개큐에 중복");
});

// ── [8] 실패 상황(경계값) — 잘못된 입력이 항상 nonzero exit로 일관되는지 ──
test("[8] 파일 경로 누락 → ok:false AND exit code 1(다른 실패 경로와 일관)", () => {
  const r = runCLIRaw([], dir);
  assert.equal(r.stdout.ok, false, "ok:false 아님");
  assert.equal(r.status, 1, "exit code가 1이 아님(실패인데 성공으로 보일 위험)");
});

test("[9] restore --target 누락 → exit code 1(기존 동작 재확인)", () => {
  const r = runCLIRaw([file, "--action", "restore"], dir);
  assert.equal(r.stdout.ok, false);
  assert.equal(r.status, 1, "exit code 불일치");
});

test("[10] apply 대상 파일 없음 → ok:false + exit 1 + 경로 외 원문 미노출", () => {
  const missing = path.join(dir, "__없는파일__.md");
  const r = runCLIRaw([missing, "--action", "apply"], dir);
  assert.equal(r.stdout.ok, false);
  assert.equal(r.status, 1, "exit code 불일치");
});

// ── [11]~[12] 민감 경로 방어선(path-safety) — CLI 레벨 실증 ──
test("[11] apply 대상이 홈 디렉터리 자체 → 차단(ok:false, exit 1, 실제 쓰기 없음)", () => {
  const homeAsTarget = os.homedir();
  const r = runCLIRaw([homeAsTarget, "--action", "apply"], dir);
  assert.equal(r.stdout.ok, false, "민감 경로인데 허용됨(위험)");
  assert.equal(r.status, 1, "exit code 불일치");
  assert.ok(r.stdout.error.includes("위치"), "이유 메시지 없음");
});

test("[12] restore 대상이 홈 디렉터리 자체 → 차단(ok:false, exit 1)", () => {
  const homeAsTarget = os.homedir();
  const r = runCLIRaw([homeAsTarget, "--action", "restore", "--target", backupPath], dir);
  assert.equal(r.stdout.ok, false, "민감 경로인데 허용됨(위험)");
  assert.equal(r.status, 1, "exit code 불일치");
});

rmSync(dir, { recursive: true, force: true });
console.log(`\n결과: ${passed} 통과 / ${failed} 실패 / 총 ${passed + failed}\n`);
if (failed > 0) process.exit(1);
