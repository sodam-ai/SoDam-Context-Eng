// SoDamContext — path-safety.test.mjs
// isSensitiveWritePath 단위 테스트. Harness 미설치 환경(코덱스·CLI 단독)에서
// apply/restore 쓰기 전 최소 방어선(07_SECURITY §2.2 Must)이 실제로 작동하는지 검증.

import assert from "node:assert/strict";
import path from "node:path";
import { isSensitiveWritePath } from "./path-safety.mjs";

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}

console.log("\nSoDamContext path-safety\n");

const home = "C:\\Users\\테스트유저";

test("[1] 홈 디렉터리 루트 자체 → 민감(차단)", () => {
  assert.equal(isSensitiveWritePath(home, { homeDir: home }).sensitive, true);
});

test("[2] .ssh 하위 파일 → 민감(차단)", () => {
  const p = path.join(home, ".ssh", "id_rsa");
  assert.equal(isSensitiveWritePath(p, { homeDir: home }).sensitive, true);
});

test("[3] .aws 하위 파일 → 민감(차단)", () => {
  const p = path.join(home, ".aws", "credentials");
  assert.equal(isSensitiveWritePath(p, { homeDir: home }).sensitive, true);
});

test("[4] .gnupg 하위 파일 → 민감(차단)", () => {
  const p = path.join(home, ".gnupg", "secring.gpg");
  assert.equal(isSensitiveWritePath(p, { homeDir: home }).sensitive, true);
});

test("[5] 일반 프로젝트 폴더의 CLAUDE.md → 안전(허용)", () => {
  const p = path.join(home, "Documents", "내프로젝트", "CLAUDE.md");
  assert.equal(isSensitiveWritePath(p, { homeDir: home }).sensitive, false);
});

test("[6] Windows 시스템 폴더(C:\\Windows) → 민감(차단)", () => {
  const p = "C:\\Windows\\System32\\config.md";
  assert.equal(isSensitiveWritePath(p, { homeDir: home, platform: "win32" }).sensitive, true);
});

test("[7] Windows Program Files → 민감(차단)", () => {
  const p = "C:\\Program Files\\SomeApp\\CLAUDE.md";
  assert.equal(isSensitiveWritePath(p, { homeDir: home, platform: "win32" }).sensitive, true);
});

test("[8] ★AppData\\Roaming 전체는 과차단 금지(Harness 실측 교훈) — 일반 하위 폴더는 허용", () => {
  const p = path.join(home, "AppData", "Roaming", "claude-code", "CLAUDE.md");
  assert.equal(isSensitiveWritePath(p, { homeDir: home, platform: "win32" }).sensitive, false, "과차단 발생 — Harness의 예전 실수 재발");
});

test("[9] 드라이브 루트 자체(C:\\) → 민감(차단)", () => {
  assert.equal(isSensitiveWritePath("C:\\", { homeDir: home, platform: "win32" }).sensitive, true);
});

test("[10] reason 필드 존재(사용자에게 이유 설명용)", () => {
  const r = isSensitiveWritePath(path.join(home, ".ssh", "x"), { homeDir: home });
  assert.equal(typeof r.reason, "string");
  assert.ok(r.reason.length > 0);
});

console.log(`\n결과: ${passed} 통과 / ${failed} 실패 / 총 ${passed + failed}\n`);
if (failed > 0) process.exit(1);
