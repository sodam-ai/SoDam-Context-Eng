// SoDamContext — checkup-history.test.mjs
// recordHistory/readHistory가 안전하게(부가기능 실패가 검진을 막지 않게) 동작하는지,
// T1처럼 파일 '내용'이 아니라 점수·카테고리 id·숫자만 저장하는지 검증한다.
// 실행: node lib/checkup-history.test.mjs

import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { recordHistory, readHistory } from "./checkup-history.mjs";

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}

function mkTempProject() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "sdc-history-"));
  mkdirSync(path.join(dir, ".git"));
  return dir;
}

console.log("\nSoDamContext checkup-history 유닛테스트\n");

test("[1] 기록이 전혀 없으면 readHistory가 빈 배열을 돌려줌", () => {
  const dir = mkTempProject();
  try {
    const file = path.join(dir, "CLAUDE.md");
    writeFileSync(file, "내용\n", "utf8");
    assert.deepEqual(readHistory(file), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("[2] recordHistory 1번 → readHistory가 정확히 1건, 필드 전부 일치", () => {
  const dir = mkTempProject();
  try {
    const file = path.join(dir, "CLAUDE.md");
    writeFileSync(file, "내용\n", "utf8");
    recordHistory(file, {
      score: 85,
      highCount: 1,
      mediumCount: 0,
      problemCount: 1,
      findingIds: ["size"],
    });
    const h = readHistory(file);
    assert.equal(h.length, 1);
    assert.equal(h[0].file, file);
    assert.equal(h[0].score, 85);
    assert.equal(h[0].highCount, 1);
    assert.equal(h[0].mediumCount, 0);
    assert.equal(h[0].problemCount, 1);
    assert.deepEqual(h[0].findingIds, ["size"]);
    assert.ok(!Number.isNaN(Date.parse(h[0].at)), "at은 파싱 가능한 ISO 타임스탬프여야 함");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("[3] recordHistory 3번 연속 → 기존 줄을 안 지우고 append만 됨(3건 누적)", () => {
  const dir = mkTempProject();
  try {
    const file = path.join(dir, "CLAUDE.md");
    writeFileSync(file, "내용\n", "utf8");
    recordHistory(file, { score: 100, highCount: 0, mediumCount: 0, problemCount: 0, findingIds: [] });
    recordHistory(file, { score: 95, highCount: 0, mediumCount: 1, problemCount: 1, findingIds: ["lint_leakage"] });
    recordHistory(file, { score: 85, highCount: 1, mediumCount: 1, problemCount: 2, findingIds: ["size", "lint_leakage"] });
    const h = readHistory(file);
    assert.equal(h.length, 3, "3번 기록했으면 3건이어야 함(덮어쓰기 아님)");
    assert.deepEqual(h.map((e) => e.score), [100, 95, 85], "기록 순서 그대로 보존돼야 함");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("[4] ★T1: 이력 파일에 대상 파일의 원문·비밀키 흔적이 전혀 없음(구조로 확인)", () => {
  const dir = mkTempProject();
  try {
    const file = path.join(dir, "CLAUDE.md");
    writeFileSync(file, "비밀-같은-내용-sk-FAKE1234\n", "utf8");
    recordHistory(file, { score: 90, highCount: 0, mediumCount: 1, problemCount: 1, findingIds: ["bloat"] });
    const raw = readFileSync(path.join(dir, ".sodamcontext", "checkup-history.jsonl"), "utf8");
    assert.ok(!raw.includes("비밀-같은-내용"), "이력 파일에 대상 파일 내용이 섞여 들어가면 안 됨");
    const parsed = JSON.parse(raw.trim());
    const keys = Object.keys(parsed).sort();
    assert.deepEqual(keys, ["at", "file", "findingIds", "highCount", "mediumCount", "problemCount", "score"].sort());
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("[5] ★손상된 줄이 섞여 있어도 나머지 줄은 정상 반환(fail-safe)", () => {
  const dir = mkTempProject();
  try {
    const file = path.join(dir, "CLAUDE.md");
    writeFileSync(file, "내용\n", "utf8");
    const stateDir = path.join(dir, ".sodamcontext");
    mkdirSync(stateDir, { recursive: true });
    const good1 = JSON.stringify({ at: new Date().toISOString(), file, score: 100, highCount: 0, mediumCount: 0, problemCount: 0, findingIds: [] });
    const good2 = JSON.stringify({ at: new Date().toISOString(), file, score: 90, highCount: 0, mediumCount: 1, problemCount: 1, findingIds: ["bloat"] });
    writeFileSync(path.join(stateDir, "checkup-history.jsonl"), `${good1}\n{이건 깨진 JSON\n${good2}\n`, "utf8");
    assert.doesNotThrow(() => readHistory(file));
    const h = readHistory(file);
    assert.equal(h.length, 2, "손상된 줄 1개는 건너뛰고 정상 줄 2개만 반환해야 함");
    assert.deepEqual(h.map((e) => e.score), [100, 90]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("[6] recordHistory에 필드가 일부 빠진 summary를 넘겨도 예외 없이 안전 폴백", () => {
  const dir = mkTempProject();
  try {
    const file = path.join(dir, "CLAUDE.md");
    writeFileSync(file, "내용\n", "utf8");
    assert.doesNotThrow(() => recordHistory(file, {}));
    const h = readHistory(file);
    assert.equal(h.length, 1);
    assert.equal(h[0].score, null);
    assert.equal(h[0].highCount, 0);
    assert.deepEqual(h[0].findingIds, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("[7] .git 없는 폴더(파일 자체 폴더로 폴백)에서도 예외 없이 기록·조회 가능", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "sdc-history-nogit-"));
  try {
    const file = path.join(dir, "CLAUDE.md");
    writeFileSync(file, "내용\n", "utf8");
    assert.doesNotThrow(() => recordHistory(file, { score: 100, highCount: 0, mediumCount: 0, problemCount: 0, findingIds: [] }));
    const h = readHistory(file);
    assert.equal(h.length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("[8] 서로 다른 두 파일을 같은 프로젝트에서 기록 → 이력 항목에 file 필드로 구분 가능", () => {
  const dir = mkTempProject();
  try {
    const fileA = path.join(dir, "CLAUDE.md");
    const fileB = path.join(dir, "AGENTS.md");
    writeFileSync(fileA, "A\n", "utf8");
    writeFileSync(fileB, "B\n", "utf8");
    recordHistory(fileA, { score: 100, highCount: 0, mediumCount: 0, problemCount: 0, findingIds: [] });
    recordHistory(fileB, { score: 80, highCount: 1, mediumCount: 0, problemCount: 1, findingIds: ["jit_violation"] });
    const hA = readHistory(fileA);
    assert.equal(hA.length, 2, "같은 .sodamcontext/에 저장되므로 두 파일 기록이 합쳐져 보임");
    const onlyA = hA.filter((e) => e.file === fileA);
    const onlyB = hA.filter((e) => e.file === fileB);
    assert.equal(onlyA.length, 1);
    assert.equal(onlyB.length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

console.log(`\n결과: ${passed} 통과 / ${failed} 실패 / 총 ${passed + failed}\n`);
if (failed > 0) process.exit(1);
