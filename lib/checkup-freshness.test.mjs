// SoDamContext — checkup-freshness.test.mjs
// getFreshness/recordCheckup이 안전하게(부가기능 실패가 검진을 막지 않게) 동작하는지,
// T1처럼 파일 '내용'이 아니라 경로+시각만 저장하는지 검증한다.
// 실행: node lib/checkup-freshness.test.mjs

import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { getFreshness, recordCheckup } from "./checkup-freshness.mjs";

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}

function mkTempProject() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "sdc-freshness-"));
  mkdirSync(path.join(dir, ".git")); // findGitRoot가 여기를 프로젝트 루트로 인식하게
  return dir;
}

console.log("\nSoDamContext checkup-freshness 유닛테스트\n");

test("[1] 기록이 전혀 없으면(첫 검진) previousCheckupAt=null·stale=false", () => {
  const dir = mkTempProject();
  try {
    const file = path.join(dir, "CLAUDE.md");
    writeFileSync(file, "내용\n", "utf8");
    const r = getFreshness(file, 30);
    assert.equal(r.previousCheckupAt, null);
    assert.equal(r.daysSinceLastCheckup, null);
    assert.equal(r.stale, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("[2] recordCheckup 직후 getFreshness → daysSinceLastCheckup=0, stale=false", () => {
  const dir = mkTempProject();
  try {
    const file = path.join(dir, "CLAUDE.md");
    writeFileSync(file, "내용\n", "utf8");
    recordCheckup(file);
    const r = getFreshness(file, 30);
    assert.notEqual(r.previousCheckupAt, null);
    assert.equal(r.daysSinceLastCheckup, 0);
    assert.equal(r.stale, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("[3] ★40일 전 기록 + staleDays=30 → stale=true, 정확한 일수 계산", () => {
  const dir = mkTempProject();
  try {
    const file = path.join(dir, "CLAUDE.md");
    writeFileSync(file, "내용\n", "utf8");
    const stateDir = path.join(dir, ".sodamcontext");
    mkdirSync(stateDir, { recursive: true });
    const oldIso = new Date(Date.now() - 40 * 86400000).toISOString();
    writeFileSync(
      path.join(stateDir, "last-checkup.json"),
      JSON.stringify({ [file]: oldIso }, null, 2),
      "utf8"
    );
    const r = getFreshness(file, 30);
    assert.equal(r.previousCheckupAt, oldIso);
    assert.equal(r.daysSinceLastCheckup, 40);
    assert.equal(r.stale, true, "40일 지났고 기준이 30일이면 stale이어야 함");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("[4] 20일 전 기록 + staleDays=30 → stale=false(아직 기준 미달)", () => {
  const dir = mkTempProject();
  try {
    const file = path.join(dir, "CLAUDE.md");
    writeFileSync(file, "내용\n", "utf8");
    const stateDir = path.join(dir, ".sodamcontext");
    mkdirSync(stateDir, { recursive: true });
    const oldIso = new Date(Date.now() - 20 * 86400000).toISOString();
    writeFileSync(
      path.join(stateDir, "last-checkup.json"),
      JSON.stringify({ [file]: oldIso }, null, 2),
      "utf8"
    );
    const r = getFreshness(file, 30);
    assert.equal(r.daysSinceLastCheckup, 20);
    assert.equal(r.stale, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("[5] ★손상된 상태 파일(깨진 JSON) → 예외 없이 안전 폴백(fail-safe)", () => {
  const dir = mkTempProject();
  try {
    const file = path.join(dir, "CLAUDE.md");
    writeFileSync(file, "내용\n", "utf8");
    const stateDir = path.join(dir, ".sodamcontext");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(path.join(stateDir, "last-checkup.json"), "{이건 깨진 JSON", "utf8");
    assert.doesNotThrow(() => getFreshness(file, 30));
    const r = getFreshness(file, 30);
    assert.equal(r.previousCheckupAt, null);
    assert.equal(r.stale, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("[6] recordCheckup이 다른 파일의 기존 기록을 지우지 않음(멀티 파일 상태 무결성)", () => {
  const dir = mkTempProject();
  try {
    const fileA = path.join(dir, "CLAUDE.md");
    const fileB = path.join(dir, "AGENTS.md");
    writeFileSync(fileA, "A\n", "utf8");
    writeFileSync(fileB, "B\n", "utf8");
    recordCheckup(fileA);
    recordCheckup(fileB);
    const rA = getFreshness(fileA, 30);
    const rB = getFreshness(fileB, 30);
    assert.notEqual(rA.previousCheckupAt, null, "A 기록이 B 기록에 덮어써지면 안 됨");
    assert.notEqual(rB.previousCheckupAt, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("[7] ★상태 파일에는 경로·ISO타임스탬프 문자열만 있고 다른 필드가 없음(T1과 무관함을 구조로 확인)", () => {
  const dir = mkTempProject();
  try {
    const file = path.join(dir, "CLAUDE.md");
    writeFileSync(file, "비밀-같은-내용\n", "utf8");
    recordCheckup(file);
    const raw = readFileSync(path.join(dir, ".sodamcontext", "last-checkup.json"), "utf8");
    assert.ok(!raw.includes("비밀-같은-내용"), "상태 파일에 대상 파일 내용이 섞여 들어가면 안 됨");
    const parsed = JSON.parse(raw);
    const keys = Object.keys(parsed);
    assert.equal(keys.length, 1);
    assert.equal(keys[0], file);
    assert.equal(typeof parsed[file], "string");
    assert.ok(!Number.isNaN(Date.parse(parsed[file])), "값은 파싱 가능한 ISO 타임스탬프여야 함");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("[8] .git 없는 폴더(파일 자체 폴더로 폴백)에서도 예외 없이 기록·조회 가능", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "sdc-freshness-nogit-"));
  try {
    const file = path.join(dir, "CLAUDE.md");
    writeFileSync(file, "내용\n", "utf8");
    assert.doesNotThrow(() => recordCheckup(file));
    const r = getFreshness(file, 30);
    assert.equal(r.daysSinceLastCheckup, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

console.log(`\n결과: ${passed} 통과 / ${failed} 실패 / 총 ${passed + failed}\n`);
if (failed > 0) process.exit(1);
