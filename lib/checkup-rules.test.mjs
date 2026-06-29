// SoDamContext — checkup-rules.test.mjs
// 결정론 검진 함수 단위 테스트. `node lib/checkup-rules.test.mjs` 로 실행.

import assert from "node:assert/strict";
import { countLines, byteLength, checkSize, checkLintLeakage, runRuleChecks } from "./checkup-rules.mjs";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (e) {
    console.error(`  FAIL  ${name}`);
    console.error(`        ${e.message}`);
    failed++;
  }
}

// ── countLines ────────────────────────────────────────────────
console.log("\n[countLines]");

test("빈 문자열 → 0", () => {
  assert.equal(countLines(""), 0);
});

test("줄 하나 → 1", () => {
  assert.equal(countLines("hello"), 1);
});

test("줄 3개 → 3", () => {
  assert.equal(countLines("a\nb\nc"), 3);
});

test("끝 빈 줄 무시 (편집기 관습)", () => {
  assert.equal(countLines("a\nb\nc\n"), 3);
});

test("CRLF 줄 바꿈 정규화", () => {
  assert.equal(countLines("a\r\nb\r\nc"), 3);
});

// ── byteLength ────────────────────────────────────────────────
console.log("\n[byteLength]");

test("ASCII 1글자 = 1바이트", () => {
  assert.equal(byteLength("A"), 1);
});

test("한글 1글자 = 3바이트", () => {
  assert.equal(byteLength("가"), 3);
});

test("빈 문자열 = 0바이트", () => {
  assert.equal(byteLength(""), 0);
});

// ── checkSize (lines) ─────────────────────────────────────────
console.log("\n[checkSize — lines]");

const THRESH = {
  claudeMd: { lines_warn: 200, lines_high: 300 },
  agentsMd: { bytes_warn: 26214, bytes_limit: 32768 },
};

test("199줄 → null (정상)", () => {
  const text = Array(199).fill("x").join("\n");
  assert.equal(checkSize(text, "lines", THRESH), null);
});

test("200줄 → 보통(warn)", () => {
  const text = Array(200).fill("x").join("\n");
  const r = checkSize(text, "lines", THRESH);
  assert.ok(r !== null, "finding이 null이면 안 됨");
  assert.equal(r.severity, "보통");
  assert.equal(r.id, "size");
  assert.equal(r.kind, "rule");
  assert.equal(r.confidence, "확정");
});

test("300줄 → 높음(high)", () => {
  const text = Array(300).fill("x").join("\n");
  const r = checkSize(text, "lines", THRESH);
  assert.ok(r !== null);
  assert.equal(r.severity, "높음");
});

// ── checkSize (bytes) ─────────────────────────────────────────
console.log("\n[checkSize — bytes]");

test("26213바이트 → null (정상)", () => {
  const text = "A".repeat(26213);
  assert.equal(checkSize(text, "bytes", THRESH), null);
});

test("26214바이트 → 보통(warn)", () => {
  const text = "A".repeat(26214);
  const r = checkSize(text, "bytes", THRESH);
  assert.ok(r !== null);
  assert.equal(r.severity, "보통");
});

test("32768바이트 → 높음(high)", () => {
  const text = "A".repeat(32768);
  const r = checkSize(text, "bytes", THRESH);
  assert.ok(r !== null);
  assert.equal(r.severity, "높음");
});

// ── checkLintLeakage ──────────────────────────────────────────
console.log("\n[checkLintLeakage]");

const LINT_KW = ["prettier", "eslint", "들여쓰기", "세미콜론"];

test("린트 키워드 없는 줄 → 빈 배열", () => {
  const r = checkLintLeakage("함수는 30줄 이내로 작성한다", LINT_KW);
  assert.deepEqual(r, []);
});

test("'prettier' 감지 → finding 1건", () => {
  const r = checkLintLeakage("prettier로 포맷을 맞춰주세요", LINT_KW);
  assert.equal(r.length, 1);
  assert.equal(r[0].id, "lint_leakage");
  assert.equal(r[0].line, 1);
});

test("대소문자 무관 감지 (Prettier → 감지)", () => {
  const r = checkLintLeakage("Prettier 사용 필수", LINT_KW);
  assert.equal(r.length, 1);
});

test("줄 번호 정확 (3번째 줄에 eslint)", () => {
  const text = "규칙 1\n규칙 2\neslint 설정 따를 것";
  const r = checkLintLeakage(text, LINT_KW);
  assert.equal(r.length, 1);
  assert.equal(r[0].line, 3);
});

test("여러 줄 여러 키워드 → 각각 finding", () => {
  const text = "prettier 사용\n일반 줄\n들여쓰기 2칸";
  const r = checkLintLeakage(text, LINT_KW);
  assert.equal(r.length, 2);
});

// ── runRuleChecks (모의 rules 객체) ──────────────────────────
console.log("\n[runRuleChecks]");

const MOCK_RULES = {
  checkupRules: {
    checks: [
      { id: "lint_leakage", kind: "rule", metric: "keyword", keywords: ["prettier", "eslint"] },
    ],
  },
  thresholds: THRESH,
};

test("claude 타겟: 정상 크기 + 린트 없음 → findings 빈 배열", () => {
  const text = "짧은 파일\n내용 없음";
  const r = runRuleChecks(text, "claude", MOCK_RULES);
  assert.deepEqual(r.findings, []);
  assert.ok(r.lines > 0);
  assert.ok(r.bytes > 0);
});

test("claude 타겟: prettier 포함 → lint_leakage finding 1건", () => {
  const text = "prettier 설정 따를 것";
  const r = runRuleChecks(text, "claude", MOCK_RULES);
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].id, "lint_leakage");
});

// ── 결과 출력 ─────────────────────────────────────────────────
console.log(`\n결과: ${passed} 통과 / ${failed} 실패 / 총 ${passed + failed}\n`);
if (failed > 0) process.exit(1);
