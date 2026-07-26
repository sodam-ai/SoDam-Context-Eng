// SoDamContext — intake-verify.test.mjs
// intake-verify.mjs의 CLI 진입점(subprocess exit code)을 e2e 검증한다.
// ★배경(2026-07-26 QA 배터리로 발견): verifyIntake() 함수 로직은 _selftest.mjs가 검증해 왔지만,
// CLI 래퍼(인자 누락·파일 읽기 실패 시 exit code)는 자동 테스트가 전혀 없어 ok:false인데도
// exit 0을 반환하던 결함이 그동안 걸리지 않았다. checkup-cli.mjs가 2026-07-11에 같은 종류의
// 결함을 고친 전례와 동일 기준으로 맞춤.
// 실행: node lib/intake-verify.test.mjs

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";

const here = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(here, "intake-verify.mjs");

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}

function runCLI(args, cwd) {
  return JSON.parse(execFileSync("node", [CLI, ...args], { cwd, encoding: "utf8" }));
}

// spawnSync는 exit code가 nonzero여도 던지지 않는다(실패 케이스 검증용).
function runCLIRaw(args, cwd) {
  const r = spawnSync("node", [CLI, ...args], { cwd, encoding: "utf8" });
  return { status: r.status, stdout: JSON.parse(r.stdout) };
}

const dir = mkdtempSync(path.join(os.tmpdir(), "sdc-intake-verify-e2e-"));
const goodFile = path.join(dir, "draft.md");
writeFileSync(goodFile, "이건 테스트 프로젝트\n한국어로 답해\n", "utf8");

console.log("\n[intake-verify CLI — 정상]");

test("정상: 안전한 초안 → ok:true, safe:true, exit 0", () => {
  const r = runCLI([goodFile], dir);
  assert.equal(r.ok, true);
  assert.equal(r.safe, true);
});

console.log("\n[intake-verify CLI — ★회귀: 실패 시 exit code]");

test("★회귀: 파일 경로 인자 누락 → ok:false + exit 1(이전엔 exit 0이었음)", () => {
  const r = runCLIRaw([], dir);
  assert.equal(r.stdout.ok, false);
  assert.equal(r.status, 1, "exit code 불일치 — ok:false인데 exit 0으로 되돌아감(회귀)");
});

test("★회귀: 존재하지 않는 파일 → ok:false + exit 1(이전엔 exit 0이었음)", () => {
  const missing = path.join(dir, "없는파일.md");
  const r = runCLIRaw([missing], dir);
  assert.equal(r.stdout.ok, false);
  assert.equal(r.status, 1, "exit code 불일치 — ok:false인데 exit 0으로 되돌아감(회귀)");
});

console.log("\n[intake-verify CLI — 예외/T1]");

test("비밀키 포함 초안 → safe:false, 원문 미노출(T1)", () => {
  const secretFile = path.join(dir, "with-key.md");
  const fakeKey = "sk-ant-" + "B".repeat(40); // 형식만 흉내낸 가짜 키(런타임 조립, 소스에 완전문자열 없음)
  writeFileSync(secretFile, `여기 키가 있어요: ${fakeKey}\n`, "utf8");
  const raw = execFileSync("node", [CLI, secretFile], { cwd: dir, encoding: "utf8" });
  const r = JSON.parse(raw);
  assert.equal(r.safe, false);
  assert.ok(!raw.includes(fakeKey), "원문 비밀키가 CLI 출력에 노출됨(T1 위반)");
});

rmSync(dir, { recursive: true, force: true });
console.log(`\n결과: ${passed} 통과 / ${failed} 실패 / 총 ${passed + failed}\n`);
if (failed > 0) process.exit(1);
