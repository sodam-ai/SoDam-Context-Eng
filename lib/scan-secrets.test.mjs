// SoDamContext — scan-secrets.test.mjs
// 비밀키 검사 단위 테스트. `node lib/scan-secrets.test.mjs` 로 실행.
// ★ T1 안전 검증 포함: finding 객체에 비밀 '값' 필드가 절대 없어야 한다.

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanText, maskSecretsInLines, loadSecretPatterns } from "./scan-secrets.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const rulesDir = path.join(here, "..", "rules");

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

// ── 모의 패턴 (실제 JSON 파일 불필요 — 격리 테스트) ──────────
const MOCK_PATTERNS = [
  {
    id: "test_confirmed",
    label: "테스트 확정 키",
    tier: "confirmed",
    masked: "TEST_KEY_…REDACTED",
    re: /TEST_KEY_[A-Z0-9]{8}/,
  },
  {
    id: "test_suspect",
    label: "테스트 의심 키",
    tier: "suspect",
    masked: "MAYBE_KEY_…REDACTED",
    re: /MAYBE_KEY_[a-z0-9]{6}/,
  },
];

const REAL_SECRET = "TEST_KEY_ABCD1234";  // 실제 패턴 일치 (가짜 값)
const REAL_SUSPECT = "MAYBE_KEY_abc123";

// ── 기본 동작 ─────────────────────────────────────────────────
console.log("\n[scanText — 기본 동작]");

test("비밀키 없는 텍스트 → 빈 배열", () => {
  const r = scanText("일반 텍스트입니다\n아무 키도 없어요", MOCK_PATTERNS);
  assert.deepEqual(r, []);
});

test("확정 패턴 감지 → finding 1건", () => {
  const r = scanText(`일반 줄\n${REAL_SECRET}\n마지막 줄`, MOCK_PATTERNS);
  assert.equal(r.length, 1);
});

test("의심 패턴 감지 → finding 1건", () => {
  const r = scanText(`${REAL_SUSPECT}`, MOCK_PATTERNS);
  assert.equal(r.length, 1);
});

test("두 패턴 모두 포함 → finding 2건", () => {
  const text = `${REAL_SECRET}\n${REAL_SUSPECT}`;
  const r = scanText(text, MOCK_PATTERNS);
  assert.equal(r.length, 2);
});

// ── finding 구조 검증 ─────────────────────────────────────────
console.log("\n[scanText — finding 구조]");

test("finding에 필수 필드 있음: tier, severity, confidence, label, masked, line", () => {
  const r = scanText(REAL_SECRET, MOCK_PATTERNS);
  assert.equal(r.length, 1);
  const f = r[0];
  for (const field of ["tier", "severity", "confidence", "label", "masked", "line"]) {
    assert.ok(field in f, `필드 누락: ${field}`);
  }
});

test("tier=confirmed → severity='높음', confidence='확정'", () => {
  const r = scanText(REAL_SECRET, MOCK_PATTERNS);
  assert.equal(r[0].tier, "confirmed");
  assert.equal(r[0].severity, "높음");
  assert.equal(r[0].confidence, "확정");
});

test("tier=suspect → severity='보통', confidence='의심'", () => {
  const r = scanText(REAL_SUSPECT, MOCK_PATTERNS);
  assert.equal(r[0].tier, "suspect");
  assert.equal(r[0].severity, "보통");
  assert.equal(r[0].confidence, "의심");
});

test("줄 번호 1-indexed: 2번째 줄 감지 → line=2", () => {
  const r = scanText(`정상 줄\n${REAL_SECRET}`, MOCK_PATTERNS);
  assert.equal(r[0].line, 2);
});

// ── ★ T1 안전 검증 (가장 중요) ───────────────────────────────
console.log("\n[scanText — T1 안전: 비밀 값 미포함 검증]");

const FORBIDDEN_FIELDS = ["value", "raw", "secret", "original", "match", "text", "content", "captured"];

test("★ T1: finding에 비밀 값 필드가 없어야 함", () => {
  const r = scanText(REAL_SECRET, MOCK_PATTERNS);
  assert.equal(r.length, 1);
  const f = r[0];
  for (const field of FORBIDDEN_FIELDS) {
    assert.ok(!(field in f), `T1 위반: finding에 '${field}' 필드가 있음 — 값 유출 위험`);
  }
});

test("★ T1: masked에 실제 비밀 값이 포함되지 않아야 함", () => {
  const r = scanText(REAL_SECRET, MOCK_PATTERNS);
  assert.equal(r.length, 1);
  // REAL_SECRET = "TEST_KEY_ABCD1234" — ABCD1234 부분이 masked에 없어야 함
  assert.ok(!r[0].masked.includes("ABCD1234"), `T1 위반: masked에 실제 값 포함됨 — '${r[0].masked}'`);
});

test("★ T1: masked에 'REDACTED'가 포함돼야 함 (마스킹 표시)", () => {
  const r = scanText(REAL_SECRET, MOCK_PATTERNS);
  assert.ok(r[0].masked.includes("REDACTED"), `masked에 'REDACTED' 없음: '${r[0].masked}'`);
});

test("finding 객체의 키가 정확히 6개 (추가 필드 없음)", () => {
  const r = scanText(REAL_SECRET, MOCK_PATTERNS);
  const keys = Object.keys(r[0]);
  assert.equal(keys.length, 6, `finding 필드 수 이상: [${keys.join(", ")}]`);
});

// ── 엣지 케이스 ───────────────────────────────────────────────
console.log("\n[scanText — 엣지 케이스]");

test("빈 문자열 → 빈 배열", () => {
  assert.deepEqual(scanText("", MOCK_PATTERNS), []);
});

test("패턴 배열 비어있으면 → 빈 배열", () => {
  assert.deepEqual(scanText(REAL_SECRET, []), []);
});

test("CRLF 줄 바꿈도 처리 (Windows 호환)", () => {
  const r = scanText(`정상\r\n${REAL_SECRET}\r\n끝`, MOCK_PATTERNS);
  assert.equal(r.length, 1);
  assert.equal(r[0].line, 2);
});

// ── ★C-G2(2026-08-31 실측 발견·수정): allowlist — 예시/플레이스홀더 오탐 방지 ──
console.log("\n[scanText — ★C-G2: allowlist(예시 마커) 오탐 방지]");

const MOCK_PATTERNS_WITH_ALLOWLIST = Object.assign([...MOCK_PATTERNS], {
  allowlist: [{ id: "test_example_marker", re: /EXAMPLE/i }],
});

test("★C-G2: 확정 패턴이 매칭돼도 같은 줄에 allowlist 마커가 있으면 finding 제외", () => {
  const r = scanText(`${REAL_SECRET} — 이건 EXAMPLE 값이에요`, MOCK_PATTERNS_WITH_ALLOWLIST);
  assert.deepEqual(r, []);
});

test("★C-G2: allowlist 마커가 없는 줄은 그대로 확정 처리(과도한 면제 아님)", () => {
  const r = scanText(REAL_SECRET, MOCK_PATTERNS_WITH_ALLOWLIST);
  assert.equal(r.length, 1);
});

test("★C-G2: patterns.allowlist가 없으면(일반 배열) 기존과 동일하게 동작(하위호환)", () => {
  const r = scanText(REAL_SECRET, MOCK_PATTERNS); // .allowlist 미부착
  assert.equal(r.length, 1);
});

test("★C-G2(실제 rules/secret-patterns.json 연동): AWS 공식 EXAMPLE 키 → finding 0건", () => {
  const patterns = loadSecretPatterns(rulesDir);
  const j = (...p) => p.join("");
  const line = `AWS 키 형식 예시: ${j("AK", "IA", "IOSF", "ODNN", "7", "EXAMPLE")}`;
  assert.deepEqual(scanText(line, patterns), []);
});

test("★C-G2(실제 rules/secret-patterns.json 연동) 회귀 확인: 마커 없는 실제형 키는 여전히 확정 탐지", () => {
  const patterns = loadSecretPatterns(rulesDir);
  const j = (...p) => p.join("");
  const line = j("sk", "-ant-", "api03-", "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8");
  const r = scanText(line, patterns);
  assert.equal(r.length, 1, "allowlist가 과도하게 넓어져 진짜 형태의 키까지 눈감아줌(회귀)");
  assert.equal(r[0].tier, "confirmed");
});

// ── maskSecretsInLines (Phase 3 "AI 판단 강화"용) ───────────────
console.log("\n[maskSecretsInLines — 줄 단위 마스킹]");

test("비밀키 없는 텍스트 → 100% 그대로 통과(마스킹 0건)", () => {
  const text = "일반 설명 줄 1\n일반 설명 줄 2\n일반 설명 줄 3";
  const r = maskSecretsInLines(text, MOCK_PATTERNS);
  assert.equal(r.maskedText, text);
  assert.equal(r.maskedLineCount, 0);
});

test("확정 패턴이 든 줄 → 해당 줄 전체가 가려짐", () => {
  const text = `정상 줄\n${REAL_SECRET}\n마지막 줄`;
  const r = maskSecretsInLines(text, MOCK_PATTERNS);
  assert.equal(r.maskedLineCount, 1);
  const lines = r.maskedText.split("\n");
  assert.equal(lines[0], "정상 줄");
  assert.equal(lines[2], "마지막 줄");
  assert.ok(lines[1].includes("가려짐"));
});

test("★ T1: 마스킹 후 결과 텍스트에 원문 비밀 값이 남지 않아야 함", () => {
  const text = `설명\n${REAL_SECRET}\n${REAL_SUSPECT}\n끝`;
  const r = maskSecretsInLines(text, MOCK_PATTERNS);
  assert.equal(r.maskedLineCount, 2);
  assert.ok(!r.maskedText.includes("ABCD1234"), "T1 위반: 마스킹 후에도 확정 키 원문 조각이 남음");
  assert.ok(!r.maskedText.includes("abc123"), "T1 위반: 마스킹 후에도 의심 키 원문 조각이 남음");
});

test("여러 줄이 매칭돼도 각 줄이 독립적으로 가려짐(줄 수 유지)", () => {
  const text = `${REAL_SECRET}\n일반 줄\n${REAL_SECRET}`;
  const r = maskSecretsInLines(text, MOCK_PATTERNS);
  assert.equal(r.maskedLineCount, 2);
  assert.equal(r.maskedText.split("\n").length, 3);
});

test("패턴 배열이 비어있으면 마스킹 없이 그대로 통과", () => {
  const r = maskSecretsInLines(REAL_SECRET, []);
  assert.equal(r.maskedText, REAL_SECRET);
  assert.equal(r.maskedLineCount, 0);
});

// ── 결과 출력 ─────────────────────────────────────────────────
console.log(`\n결과: ${passed} 통과 / ${failed} 실패 / 총 ${passed + failed}\n`);
if (failed > 0) process.exit(1);
