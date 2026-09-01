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

// ★수정(2026-09-01, CI에서 실측 발견): 아래 테스트들이 Windows 스타일 home 리터럴을
// 쓰면서도 `platform: "win32"`를 명시하지 않아, `isSensitiveWritePath`가 기본값인
// `process.platform`을 썼다. 이 개발 PC(Windows)에서는 우연히 일치해 항상 통과했지만,
// CI를 Linux(ubuntu-latest)에서 처음 돌려보니 8/12건이 FAIL로 드러났다 — 실제 함수
// 결함이 아니라 "테스트가 실행 환경에 우연히 의존"하던 결함(플랫폼 주입 설계의 목적을
// 테스트 자신이 못 지킨 경우). 전부 `platform: "win32"`를 명시해 환경 무관하게 고정.
const home = "C:\\Users\\테스트유저";

test("[1] 홈 디렉터리 루트 자체 → 민감(차단)", () => {
  assert.equal(isSensitiveWritePath(home, { homeDir: home, platform: "win32" }).sensitive, true);
});

test("[2] .ssh 하위 파일 → 민감(차단)", () => {
  const p = path.win32.join(home, ".ssh", "id_rsa");
  assert.equal(isSensitiveWritePath(p, { homeDir: home, platform: "win32" }).sensitive, true);
});

test("[3] .aws 하위 파일 → 민감(차단)", () => {
  const p = path.win32.join(home, ".aws", "credentials");
  assert.equal(isSensitiveWritePath(p, { homeDir: home, platform: "win32" }).sensitive, true);
});

test("[4] .gnupg 하위 파일 → 민감(차단)", () => {
  const p = path.win32.join(home, ".gnupg", "secring.gpg");
  assert.equal(isSensitiveWritePath(p, { homeDir: home, platform: "win32" }).sensitive, true);
});

test("[5] 일반 프로젝트 폴더의 CLAUDE.md → 안전(허용)", () => {
  const p = path.win32.join(home, "Documents", "내프로젝트", "CLAUDE.md");
  assert.equal(isSensitiveWritePath(p, { homeDir: home, platform: "win32" }).sensitive, false);
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
  const p = path.win32.join(home, "AppData", "Roaming", "claude-code", "CLAUDE.md");
  assert.equal(isSensitiveWritePath(p, { homeDir: home, platform: "win32" }).sensitive, false, "과차단 발생 — Harness의 예전 실수 재발");
});

test("[9] 드라이브 루트 자체(C:\\) → 민감(차단)", () => {
  assert.equal(isSensitiveWritePath("C:\\", { homeDir: home, platform: "win32" }).sensitive, true);
});

test("[10] reason 필드 존재(사용자에게 이유 설명용)", () => {
  const r = isSensitiveWritePath(path.win32.join(home, ".ssh", "x"), { homeDir: home, platform: "win32" });
  assert.equal(typeof r.reason, "string");
  assert.ok(r.reason.length > 0);
});

// ── [13]~[19] ★2026-09-01 신규: POSIX(Mac/Linux) 쪽은 지금까지 테스트가 0건이었음 ──
// 위 [1]~[10]이 Windows만 다뤄, path-safety.mjs의 POSIX_SYSTEM(/etc·/usr 등) 분기는
// 실제로 한 번도 검증된 적이 없었다(07_SECURITY §2.2 Must 요구사항인데도). 아직 Mac/Linux
// 실기 검증(사람 게이트, 12_BETA_TEST_PROTOCOL.md)은 못 하지만, 로직 자체는 이렇게
// platform 옵션 주입으로 지금 바로 검증할 수 있다 — CI(ubuntu-latest)로도 매번 확인됨.
const posixHome = "/home/테스트유저";

test("[13] POSIX: 홈 디렉터리 루트 자체 → 민감(차단)", () => {
  assert.equal(isSensitiveWritePath(posixHome, { homeDir: posixHome, platform: "linux" }).sensitive, true);
});

test("[14] POSIX: .ssh 하위 파일 → 민감(차단)", () => {
  const p = path.posix.join(posixHome, ".ssh", "id_rsa");
  assert.equal(isSensitiveWritePath(p, { homeDir: posixHome, platform: "linux" }).sensitive, true);
});

test("[15] POSIX: .aws 하위 파일 → 민감(차단)", () => {
  const p = path.posix.join(posixHome, ".aws", "credentials");
  assert.equal(isSensitiveWritePath(p, { homeDir: posixHome, platform: "linux" }).sensitive, true);
});

test("[16] POSIX: 일반 프로젝트 폴더의 CLAUDE.md → 안전(허용)", () => {
  const p = path.posix.join(posixHome, "projects", "내프로젝트", "CLAUDE.md");
  assert.equal(isSensitiveWritePath(p, { homeDir: posixHome, platform: "linux" }).sensitive, false);
});

test("[17] POSIX: 시스템 폴더(/etc) → 민감(차단)", () => {
  const p = "/etc/passwd";
  assert.equal(isSensitiveWritePath(p, { homeDir: posixHome, platform: "linux" }).sensitive, true);
});

test("[18] POSIX: 시스템 폴더(/usr) → 민감(차단)", () => {
  const p = "/usr/local/bin/x";
  assert.equal(isSensitiveWritePath(p, { homeDir: posixHome, platform: "linux" }).sensitive, true);
});

test("[19] ★회귀(2026-09-01 CI 실측 발견): platform 시뮬레이션이 실제 실행 OS와 달라도 절대경로 판정이 흔들리지 않음", () => {
  // 이 테스트 파일 전체가 실제로 어느 OS에서 돌든(Windows든 Linux든) 아래 두 판정은
  // 항상 같은 결과가 나와야 한다 — 예전엔 ambient path 모듈 때문에 실행 OS에 따라
  // 결과가 달라졌음(로컬 Windows에선 우연히 통과, CI Linux에선 전부 FAIL).
  const win = isSensitiveWritePath("C:\\Users\\x\\.ssh\\id_rsa", { homeDir: "C:\\Users\\x", platform: "win32" });
  const posix = isSensitiveWritePath("/home/x/.ssh/id_rsa", { homeDir: "/home/x", platform: "linux" });
  assert.equal(win.sensitive, true, "win32 시뮬레이션이 실행 OS에 따라 흔들림");
  assert.equal(posix.sensitive, true, "linux 시뮬레이션이 실행 OS에 따라 흔들림");
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
