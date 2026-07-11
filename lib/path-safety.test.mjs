// SoDamContext — path-safety.test.mjs
// isSensitiveWritePath 단위 테스트. Harness 미설치 환경(코덱스·CLI 단독)에서
// apply/restore 쓰기 전 최소 방어선(07_SECURITY §2.2 Must)이 실제로 작동하는지 검증.

import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
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

// [11][12] 심볼릭 링크 우회 방어 — 실제 파일시스템에 링크를 만들어야 하므로
// 환경(권한·OS)에 따라 생성이 안 될 수 있다. 그럴 땐 실패로 세지 않고 명시적으로 건너뛴다
// (실행 못 한 검증을 통과로 위장하지 않기 위해 SKIP을 별도 카운트로 분리).
let skipped = 0;
function testMaybeSkip(name, setupFn) {
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), "sodam-symlink-test-"));
  try {
    const created = setupFn(tmpBase);
    if (!created) {
      console.log(`  SKIP  ${name} (이 환경에서 심볼릭 링크 생성 불가 — 권한 부족 추정, 미실행)`);
      skipped++;
      return;
    }
    try {
      created();
      console.log(`  PASS  ${name}`);
      passed++;
    } catch (e) {
      console.error(`  FAIL  ${name}\n        ${e.message}`);
      failed++;
    }
  } finally {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  }
}

testMaybeSkip("[11] ★심볼릭 링크로 자격증명 폴더 우회 시도 → 실제 링크면 차단", (tmpBase) => {
  const fakeHome = path.join(tmpBase, "fakehome");
  const credDir = path.join(fakeHome, ".ssh");
  fs.mkdirSync(credDir, { recursive: true });
  fs.writeFileSync(path.join(credDir, "id_rsa_fake"), "fake");
  const linkPath = path.join(fakeHome, "innocent_looking_folder");
  try {
    fs.symlinkSync(credDir, linkPath, "junction");
  } catch {
    try { fs.symlinkSync(credDir, linkPath, "dir"); } catch { return null; }
  }
  const st = fs.lstatSync(linkPath);
  if (!st.isSymbolicLink()) return null; // 이 OS/권한에서 진짜 symlink가 안 만들어짐 → SKIP
  return () => {
    const r = isSensitiveWritePath(path.join(linkPath, "id_rsa_fake"), { homeDir: fakeHome, platform: process.platform });
    assert.equal(r.sensitive, true, "심볼릭 링크로 연결된 자격증명 폴더를 못 잡음(우회 가능)");
  };
});

testMaybeSkip("[12] 심볼릭 링크가 안전한 곳을 가리키면 여전히 허용(과차단 회귀 방지)", (tmpBase) => {
  const fakeHome = path.join(tmpBase, "fakehome2");
  const safeDir = path.join(fakeHome, "Documents", "프로젝트");
  fs.mkdirSync(safeDir, { recursive: true });
  fs.writeFileSync(path.join(safeDir, "CLAUDE.md"), "안전한 내용");
  const linkPath = path.join(fakeHome, "shortcut");
  try {
    fs.symlinkSync(safeDir, linkPath, "junction");
  } catch {
    try { fs.symlinkSync(safeDir, linkPath, "dir"); } catch { return null; }
  }
  const st = fs.lstatSync(linkPath);
  if (!st.isSymbolicLink()) return null;
  return () => {
    const r = isSensitiveWritePath(path.join(linkPath, "CLAUDE.md"), { homeDir: fakeHome, platform: process.platform });
    assert.equal(r.sensitive, false, "안전한 위치를 가리키는 링크인데 과차단됨");
  };
});

console.log(`\n결과: ${passed} 통과 / ${failed} 실패 / ${skipped} 미실행(SKIP) / 총 ${passed + failed + skipped}\n`);
if (skipped > 0) {
  console.log(`⚠️ ${skipped}건은 이 환경(권한·OS)에서 심볼릭 링크를 만들 수 없어 검증하지 못했습니다(통과로 위장하지 않음).\n`);
}
if (failed > 0) process.exit(1);
