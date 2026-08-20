// SoDamContext — backup.test.mjs
// backup.mjs의 충돌 방지 로직(uniqueBackupPath) 단위 검증.
// ★배경: 07_SECURITY.md §2.4 대조 감사로 발견 — 예전 초 단위 타임스탬프는 같은 초 안에
// 재처방하면 이전 백업을 조용히 덮어썼다. checkup-cli.test.mjs [26]은 실제 CLI 흐름에서
// 이 문제가 없는지 확인하지만, 정확히 같은 stamp가 겹치는 경우(진짜 충돌 발생 시점)는
// 프로세스 타이밍에 좌우돼 재현이 불확실하다 — 여기서는 stamp를 직접 고정해 결정적으로 검증.
// 실행: node lib/backup.test.mjs

import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { uniqueBackupPath } from "./backup.mjs";

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}

console.log("\nSoDamContext backup.mjs 단위 테스트\n");

test("uniqueBackupPath: 같은 stamp로 두 번째 호출 시 이미 있는 파일을 피해 다른 경로를 돌려줌", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "sdc-backup-unit-"));
  try {
    const stamp = "2026-08-19T00-00-00-000";
    const p1 = uniqueBackupPath(dir, "AGENTS.md", stamp);
    writeFileSync(p1, "첫 번째", "utf8"); // p1을 실제 "이미 존재하는 백업"으로 만듦
    const p2 = uniqueBackupPath(dir, "AGENTS.md", stamp); // 같은 stamp로 재호출 → 충돌 감지돼야 함
    assert.notEqual(p1, p2, "같은 stamp인데 같은 경로를 돌려줌 — 충돌 방지 실패");
    assert.ok(!existsSync(p2), "새 후보 경로에 이미 파일이 있음(계산 오류)");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("uniqueBackupPath: 연속 충돌도 번호를 늘려가며 전부 회피함(1개도 안 겹침)", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "sdc-backup-unit-"));
  try {
    const stamp = "2026-08-19T00-00-00-000";
    const p1 = uniqueBackupPath(dir, "CLAUDE.md", stamp);
    writeFileSync(p1, "1", "utf8");
    const p2 = uniqueBackupPath(dir, "CLAUDE.md", stamp);
    writeFileSync(p2, "2", "utf8");
    const p3 = uniqueBackupPath(dir, "CLAUDE.md", stamp);
    assert.equal(new Set([p1, p2, p3]).size, 3, "세 경로 중 중복이 있음");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("uniqueBackupPath: 충돌이 없는(정상) 상황엔 불필요한 번호 없이 기본 경로 그대로", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "sdc-backup-unit-"));
  try {
    const p = uniqueBackupPath(dir, "AGENTS.md", "2026-08-19T00-00-00-001");
    assert.equal(p, path.join(dir, "AGENTS.md.2026-08-19T00-00-00-001.bak"), "충돌 없는데 파일명이 바뀜");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

console.log(`\n결과: ${passed} 통과 / ${failed} 실패 / 총 ${passed + failed}\n`);
if (failed > 0) process.exit(1);
