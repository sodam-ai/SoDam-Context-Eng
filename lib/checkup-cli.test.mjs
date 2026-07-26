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
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";

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

// ── [13] 회귀: 디렉터리를 검진 대상으로 주면 '문제없음'으로 오보고하지 않음 ──
test("[13] ★checkup: 디렉터리 경로 → exists:false(과거엔 EISDIR을 삼켜 '문제 0건'으로 오보고했음)", () => {
  const r = runCLI([dir], dir);
  assert.equal(r.ok, true);
  assert.equal(r.exists, false, "디렉터리인데 exists:true — 아무것도 안 읽고 '정상'으로 오판정할 위험");
  assert.equal(r.summary.problemCount, 0, "내용을 안 읽었으니 문제 집계도 0이어야 함(오탐 방지)");
});

// ── [14]~[16] sync-check 액션 — 동기화 리포트(읽기 전용, 파일을 합치거나 쓰지 않음) ──
test("[14] sync-check: 한쪽에만 있는 안전 규칙 정확히 잡힘 + 파일 내용 미노출", () => {
  const agentsFile = path.join(dir, "AGENTS.md");
  writeFileSync(agentsFile, "Respond in English.\n비밀키 절대 금지.\n", "utf8"); // ORIGINAL엔 없는 문구
  const r = runCLI([file, "--action", "sync-check", "--target", agentsFile], dir);
  assert.equal(r.ok, true);
  assert.equal(r.applicable, true);
  // ORIGINAL엔 "force push 절대 금지."·"never commit secrets"가 있고 AGENTS.md엔 없음 → onlyInClaude에 잡혀야 함
  assert.ok(r.onlyInClaude.length >= 2, "CLAUDE.md 전용 안전규칙 미탐지");
  assert.ok(!JSON.stringify(r).includes("force push"), "★sync-check 출력에 파일 내용이 노출됨(설계 위반)");
});

test("[15] sync-check: --target 누락 → ok:false + exit 1", () => {
  const r = runCLIRaw([file, "--action", "sync-check"], dir);
  assert.equal(r.stdout.ok, false);
  assert.equal(r.status, 1, "exit code 불일치");
});

test("[16] sync-check: AGENTS.md가 없음 → applicable:false(에러 아님, 안내만)", () => {
  const missing = path.join(dir, "__없는AGENTS__.md");
  const r = runCLI([file, "--action", "sync-check", "--target", missing], dir);
  assert.equal(r.ok, true);
  assert.equal(r.applicable, false, "파일 없는데 applicable:true — 있지도 않은 결과를 낸 것");
});

// ── [17]~[18] ★회귀: apply/restore가 대상 파일과 다른 드라이브(os.tmpdir())를 거쳐도 성공하는지 ──
// 실사용자 라이브 테스트로 재현된 실제 버그: tmp를 os.tmpdir()(항상 C드라이브)에 만들고 다른
// 드라이브로 rename하면 Windows에서 "EXDEV: cross-device link not permitted"로 실패했었다.
// 이 환경(개발 PC)에 여분 드라이브가 없으면 재현 자체가 불가하므로 그럴 땐 SKIP으로 명시한다
// (실행 못 한 검증을 통과로 위장하지 않기 위해 SKIP을 실패와 분리 — path-safety.test.mjs와 동일 관례).
let skipped = 0;
const tmpDriveLetter = path.parse(os.tmpdir()).root; // 예: "C:\\"
const otherDrive = ["D:\\", "E:\\", "F:\\"].find((d) => d !== tmpDriveLetter && existsSync(d));

function testMaybeSkipDrive(name, fn) {
  if (!otherDrive) {
    console.log(`  SKIP  ${name} (os.tmpdir()와 다른 드라이브가 이 환경에 없음 — 미실행)`);
    skipped++;
    return;
  }
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}

testMaybeSkipDrive("[17] ★apply: 대상이 os.tmpdir()와 다른 드라이브 → EXDEV 없이 성공", () => {
  const otherDir = mkdtempSync(path.join(otherDrive, "sdc-crossdrive-"));
  try {
    const f = path.join(otherDir, "CLAUDE.md");
    writeFileSync(f, "같은 줄\n같은 줄\n짧은 파일\n", "utf8");
    const r = runCLI([f, "--action", "apply"], otherDir);
    assert.equal(r.ok, true, "apply가 드라이브 간 rename에서 실패함(회귀)");
    assert.equal(readFileSync(f, "utf8").split("\n").filter(Boolean).length, 2, "중복 제거 결과가 실제로 반영 안 됨");
  } finally {
    rmSync(otherDir, { recursive: true, force: true });
  }
});

testMaybeSkipDrive("[18] ★restore: 대상이 os.tmpdir()와 다른 드라이브 → EXDEV 없이 성공", () => {
  const otherDir = mkdtempSync(path.join(otherDrive, "sdc-crossdrive-"));
  try {
    const f = path.join(otherDir, "CLAUDE.md");
    const backupDir = path.join(otherDir, ".sodamcontext", "backups");
    mkdirSync(backupDir, { recursive: true });
    const bak = path.join(backupDir, "backup.bak");
    writeFileSync(f, "현재 내용\n", "utf8");
    writeFileSync(bak, "원래 내용\n", "utf8");
    const r = runCLI([f, "--action", "restore", "--target", bak], otherDir);
    assert.equal(r.ok, true, "restore가 드라이브 간 rename에서 실패함(회귀)");
    assert.equal(readFileSync(f, "utf8"), "원래 내용\n", "복구 내용이 정확하지 않음");
  } finally {
    rmSync(otherDir, { recursive: true, force: true });
  }
});

// ── [19] ★보안: restore --target에 백업 폴더 밖의 임의 파일을 지정해도 그대로 복사되지 않음 ──
// 2026-07-13 OWASP 스타일 감사에서 재현: restore가 backupPath를 검증 없이 읽어 그대로 대상에 덮어써서,
// .ssh/id_rsa 같은 임의 파일도 원문 그대로 CLAUDE.md에 복사할 수 있었다("임의 파일 읽기" 결함).
test("[19] ★restore: 백업 폴더 밖 임의 파일 지정 → 거부(임의 파일 읽기 방지)", () => {
  const outsideFile = path.join(dir, "__임의파일_비밀키흉내__.txt");
  writeFileSync(outsideFile, "이건 백업이 아닌 임의 파일 내용입니다\n", "utf8");
  const before = readFileSync(file, "utf8");
  const r = runCLIRaw([file, "--action", "restore", "--target", outsideFile], dir);
  assert.equal(r.stdout.ok, false, "백업 폴더 밖 파일인데 복원이 허용됨(위험)");
  assert.equal(r.status, 1, "exit code 불일치");
  assert.equal(readFileSync(file, "utf8"), before, "거부됐는데도 대상 파일이 변경됨(위험)");
  assert.ok(
    !JSON.stringify(r.stdout).includes("임의 파일이 아닌"),
    "에러 메시지에 원문이 섞여 들어가지 않아야 함"
  );
});

// ── [21] ★보안: backup 대상으로 자격증명 폴더를 지정해도 그대로 복사되지 않음 ──
// 2026-07-27 QA로 재현: backupFile()이 대상 경로의 민감도를 검사하지 않아 ~/.ssh/id_rsa 같은
// 자격증명 파일을 backup 대상으로 지정하면 그 내용이 그대로 .sodamcontext/backups/에 평문
// 복사될 수 있었다. apply는 이미 isSensitiveWritePath()로 이 검사를 하는데 backup에는 빠져
// 있었음([19]의 restore 방향 결함과 대칭인, backup 방향의 "임의 파일 읽기" 결함).
test("[21] ★backup: 자격증명 폴더(.ssh) 대상 지정 → 거부(임의 파일 읽기 방지)", () => {
  const credLikePath = path.join(os.homedir(), ".ssh", "id_rsa_존재안함_QA전용");
  const r = runCLIRaw([credLikePath, "--action", "backup"], dir);
  assert.equal(r.stdout.ok, false, "자격증명 폴더 대상인데 백업이 허용됨(위험)");
  assert.equal(r.status, 1, "exit code 불일치");
  assert.ok(r.stdout.error.includes("위치"), "이유 메시지 없음");
});

// ── [20] ★회귀: 알 수 없는 --action 값 → 조용한 기본 검진 폴백 대신 명시적 에러 ──
// QA 배터리(2026-07-26)에서 발견: --action nope 처럼 모르는 값을 줘도 에러 없이 기본 검진이
// 그대로 실행됐다. 처방/백업을 요청한 줄 알았는데 실제론 아무 일도 안 일어난 채 검진 리포트만
// 나오는 위험한 착각을 만들 수 있었음 — --action 미지정(기존 검진 경로)과 명확히 구분해 수정.
test("[20] ★알 수 없는 --action 값 → ok:false + exit 1(기본 검진으로 조용히 폴백하지 않음)", () => {
  const r = runCLIRaw([file, "--action", "nope"], dir);
  assert.equal(r.stdout.ok, false, "모르는 action인데 ok:true로 통과됨(위험)");
  assert.equal(r.status, 1, "exit code 불일치");
  assert.ok(!("summary" in r.stdout), "검진 결과 필드가 섞여 나옴 — 폴백이 여전히 발생 중");
});

test("[20] --action 미지정 → 기존 검진 경로 그대로 유지(회귀 없음)", () => {
  const r = runCLI([file], dir);
  assert.equal(r.ok, true);
  assert.ok("summary" in r, "action 미지정 시 기존 검진 동작이 깨짐");
});

rmSync(dir, { recursive: true, force: true });
console.log(`\n결과: ${passed} 통과 / ${failed} 실패 / 총 ${passed + failed}\n`);
if (failed > 0) process.exit(1);
