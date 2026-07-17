// SoDamContext — checkup-rules.test.mjs
// 결정론 검진 함수 단위 테스트. `node lib/checkup-rules.test.mjs` 로 실행.

import assert from "node:assert/strict";
import { countLines, byteLength, checkSize, checkLintLeakage, checkJitViolation, runRuleChecks, runHintSuspectChecks, listHintlessAiChecks } from "./checkup-rules.mjs";

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

// ── runHintSuspectChecks + listHintlessAiChecks (hint_keyword '의심' 탐지) ──
console.log("\n[runHintSuspectChecks]");

const MOCK_SUSPECT_RULES = {
  checkupRules: {
    checks: [
      { id: "init_fossilization", kind: "ai_suspect", name: "낡음", why: "낡음 이유", hint_keywords: ["TODO", "add your"] },
      { id: "conflicting", kind: "ai_suspect", name: "모순", why: "모순 이유" }, // hint_keywords 없음 → 소개만
      { id: "size", kind: "rule" }, // ai_suspect 아님 → 무시
    ],
  },
  thresholds: THRESH,
};

test("hint 키워드 매칭 → '의심' finding(검사별 1건·줄번호 집계)", () => {
  const text = "정상 줄\nTODO: 나중에 채우기\n일반 줄";
  const r = runHintSuspectChecks(text, MOCK_SUSPECT_RULES);
  assert.equal(r.length, 1);
  assert.equal(r[0].id, "init_fossilization");
  assert.equal(r[0].confidence, "의심");
  assert.deepEqual(r[0].lines, [2]);
});

test("hint 없으면 → 빈 배열(오탐 안 냄)", () => {
  const r = runHintSuspectChecks("깨끗한 설명서\n한국어로 답해주세요", MOCK_SUSPECT_RULES);
  assert.deepEqual(r, []);
});

test("★T1: hit은 우리 상수 키워드 — 사용자 내용 미유출", () => {
  const text = "add your secret-value-xyz here";
  const r = runHintSuspectChecks(text, MOCK_SUSPECT_RULES);
  assert.equal(r.length, 1);
  assert.ok(["TODO", "add your"].includes(r[0].hit), "hit이 상수 목록 밖");
  assert.ok(!JSON.stringify(r).includes("secret-value-xyz"), "★사용자 내용 유출(T1 위반)");
});

console.log("\n[listHintlessAiChecks]");
test("hint_keywords 없는 ai_suspect만 반환('소개만' 대상)", () => {
  const ids = listHintlessAiChecks(MOCK_SUSPECT_RULES).map((c) => c.id);
  assert.ok(ids.includes("conflicting"), "hintless 항목 누락");
  assert.ok(!ids.includes("init_fossilization"), "hint 있는 항목이 잘못 포함됨");
  assert.ok(!ids.includes("size"), "ai_suspect 아닌 항목 포함됨");
});

// ── checkJitViolation ────────────────────────────────────────
console.log("\n[checkJitViolation]");

const JIT_THRESH = { jitViolation: { fence_lines_high: 15 } };

test("코드블록 없음 → 빈 배열", () => {
  const r = checkJitViolation("일반 텍스트\n또 다른 줄", JIT_THRESH);
  assert.deepEqual(r, []);
});

test("짧은 코드블록(임계 이하) → 빈 배열", () => {
  const fence = ["```", "line1", "line2", "```"].join("\n");
  const r = checkJitViolation(fence, JIT_THRESH);
  assert.deepEqual(r, []);
});

test("긴 코드블록(임계 초과) → finding 1건, 확정/보통", () => {
  const body = Array.from({ length: 20 }, (_, i) => `code line ${i}`).join("\n");
  const text = "설명\n```js\n" + body + "\n```\n끝";
  const r = checkJitViolation(text, JIT_THRESH);
  assert.equal(r.length, 1);
  assert.equal(r[0].id, "jit_violation");
  assert.equal(r[0].confidence, "확정");
  assert.equal(r[0].severity, "보통");
  assert.equal(r[0].line, 2);
});

test("여러 코드블록 중 하나만 초과 → finding 1건만", () => {
  const shortFence = "```\nshort\n```";
  const longBody = Array.from({ length: 20 }, (_, i) => `L${i}`).join("\n");
  const text = shortFence + "\n일반 텍스트\n```\n" + longBody + "\n```";
  const r = checkJitViolation(text, JIT_THRESH);
  assert.equal(r.length, 1);
});

test("★닫는 ``` 없이 파일 끝까지 이어짐(임계 초과) → 안전하게 집계(크래시 없음)", () => {
  const body = Array.from({ length: 20 }, (_, i) => `L${i}`).join("\n");
  const text = "```\n" + body;
  assert.doesNotThrow(() => checkJitViolation(text, JIT_THRESH));
  const r = checkJitViolation(text, JIT_THRESH);
  assert.equal(r.length, 1);
});

test("★닫는 ``` 없이 파일 끝까지 이어지고 파일이 개행으로 끝날 때, 끝의 빈 줄을 내용으로 잘못 세지 않음(경계값 off-by-one 회귀 방지)", () => {
  const body = Array.from({ length: 15 }, (_, i) => `L${i}`).join("\n");
  const text = "```\n" + body + "\n"; // 정확히 임계값(15)줄 + 흔한 trailing newline
  const r = checkJitViolation(text, JIT_THRESH);
  assert.deepEqual(r, [], "실제 내용은 15줄(임계 이하)인데 trailing newline을 내용으로 오산해 finding이 생김");
});

test("thresholds.jitViolation 없어도 기본값(15)으로 동작", () => {
  const body = Array.from({ length: 20 }, (_, i) => `L${i}`).join("\n");
  const text = "```\n" + body + "\n```";
  assert.doesNotThrow(() => checkJitViolation(text, {}));
  const r = checkJitViolation(text, {});
  assert.equal(r.length, 1);
});

test("★구조 신호만 — 코드 내용 원문이 finding에 유출되지 않음(T1 취지 일관)", () => {
  const body = Array.from({ length: 20 }, () => "SECRET_MARKER_XYZ").join("\n");
  const text = "```\n" + body + "\n```";
  const r = checkJitViolation(text, JIT_THRESH);
  assert.ok(!JSON.stringify(r).includes("SECRET_MARKER_XYZ"), "코드 내용이 finding에 유출됨");
});

// ── 결과 출력 ─────────────────────────────────────────────────
console.log(`\n결과: ${passed} 통과 / ${failed} 실패 / 총 ${passed + failed}\n`);
if (failed > 0) process.exit(1);
