// SoDamContext — treat.test.mjs
// 처방 라이브러리 단위 테스트. `node lib/treat.test.mjs` 로 실행.
// ★ T8 방어 검증: safe-keyword 포함 줄은 중복이어도 절대 제거하면 안 된다.

import assert from "node:assert/strict";
import { isSafeLine, generateTreatPreview, formatPreviewSummary } from "./treat.mjs";
import { countLines } from "./checkup-rules.mjs";

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

const SAFE_KW = ["금지", "never", "must", "항상", "secret", "절대", "반드시", "forbidden"];

// ── isSafeLine ────────────────────────────────────────────────
console.log("\n[isSafeLine]");

test("안전 키워드 포함 줄 → true", () => {
  assert.ok(isSafeLine("이건 절대 하면 안 됩니다", SAFE_KW));
});

test("대소문자 무관: 'NEVER' → true", () => {
  assert.ok(isSafeLine("NEVER do this", SAFE_KW));
});

test("대소문자 무관: 'Must' → true", () => {
  assert.ok(isSafeLine("Must include tests", SAFE_KW));
});

test("안전 키워드 없는 줄 → false", () => {
  assert.ok(!isSafeLine("일반적인 코딩 규칙", SAFE_KW));
});

test("빈 줄 → false", () => {
  assert.ok(!isSafeLine("", SAFE_KW));
});

test("키워드 배열 비면 → false", () => {
  assert.ok(!isSafeLine("secret key here", []));
});

// ── generateTreatPreview — 중복 제거 ─────────────────────────
console.log("\n[generateTreatPreview — 중복 제거]");

test("중복 없는 파일 → removedCount=0, safe=false (줄어들지 않음)", () => {
  const content = "줄 하나\n줄 둘\n줄 셋";
  const r = generateTreatPreview(content, SAFE_KW);
  assert.equal(r.removedCount, 0);
  assert.equal(r.safe, false);
});

test("중복 줄 있으면 → 두 번째 이후 제거됨", () => {
  const content = "중복 줄\n다른 줄\n중복 줄\n마지막";
  const r = generateTreatPreview(content, SAFE_KW);
  assert.ok(r.removedCount > 0, "중복이 제거되지 않음");
  assert.ok(r.shrunk, "파일이 줄어들지 않음");
  assert.equal(r.safe, r.shrunk);
});

test("removedItems에 제거된 줄 정보 있음", () => {
  const content = "A줄\nB줄\nA줄";
  const r = generateTreatPreview(content, SAFE_KW);
  assert.ok(Array.isArray(r.removedItems));
  assert.ok(r.removedItems.length > 0);
  assert.ok("lineNum" in r.removedItems[0]);
  assert.ok("rule" in r.removedItems[0]);
});

// ── ★ T1 방어 검증 (removedItems 원문 마스킹) ────────────────
// 회귀 배경: formatPreviewSummary()가 removedItems[].content를 그대로 잘라 사람이 읽는
// 요약에 넣는데, generateTreatPreview()가 patterns를 안 받아 비밀키가 든 중복 줄도 원문
// 그대로 담겼다(당장 호출 경로는 없었지만 향후 연결 시 T1 위반이 될 latent 위험).
console.log("\n[generateTreatPreview — ★T1: removedItems 비밀키 마스킹]");

const TEST_SECRET_PATTERNS = [{ re: /sk-test-FAKE[A-Za-z0-9]+/ }];

test("★T1: 비밀키 패턴에 매칭되는 중복 줄은 removedItems에 원문이 아닌 마스킹 문구로 담김", () => {
  // SAFE_KW에 "secret" 키워드가 있어 isSafeLine이 이 줄을 보존 대상으로 오판하지 않도록,
  // 테스트용 가짜 값에는 safe-keyword가 우연히도 포함되지 않는 문자열을 쓴다.
  const content = "OPENAI_API_KEY=sk-test-FAKE1234\n다른 줄\nOPENAI_API_KEY=sk-test-FAKE1234";
  const r = generateTreatPreview(content, SAFE_KW, TEST_SECRET_PATTERNS);
  assert.ok(r.removedItems.length > 0, "중복 줄이 제거 대상으로 안 잡힘");
  const leaked = r.removedItems.some((item) => item.content.includes("sk-test-FAKE1234"));
  assert.ok(!leaked, "removedItems.content에 비밀키 원문이 그대로 남아있음 — T1 위반");
  assert.ok(
    r.removedItems.every((item) => item.content.includes("가려짐")),
    "비밀키 매칭 줄이 마스킹 문구로 대체되지 않음"
  );
});

test("patterns 없이 호출(기존 호출부 호환) → 여전히 정상 동작(마스킹 없이 원문 유지)", () => {
  const content = "일반 중복 줄\n다른 줄\n일반 중복 줄";
  const r = generateTreatPreview(content, SAFE_KW); // patterns 생략
  assert.equal(r.removedItems[0].content, "일반 중복 줄", "patterns 미전달 시 기존 동작이 깨짐");
});

// ── ★ T8 방어 검증 (핵심 안전 요구사항) ──────────────────────
console.log("\n[generateTreatPreview — ★T8: safe-keyword 줄 보존]");

test("★T8: safe-keyword 줄은 중복이어도 보존", () => {
  // '절대' 키워드 포함 — 중복이어도 제거하면 안 됨
  const content = "절대 하면 안 됨\n다른 줄\n절대 하면 안 됨";
  const r = generateTreatPreview(content, SAFE_KW);
  // safe-keyword 줄은 중복 판정에서 제외 → 모두 proposed에 있어야 함
  const proposedLines = r.proposed.split("\n");
  const safeLineCount = proposedLines.filter((l) => isSafeLine(l, SAFE_KW)).length;
  assert.equal(safeLineCount, 2, `safe-keyword 줄이 ${2 - safeLineCount}개 제거됨 — T8 위반`);
});

test("★T8: 'never' 포함 줄 보존", () => {
  const content = "never hardcode secrets\n일반 줄\nnever hardcode secrets";
  const r = generateTreatPreview(content, SAFE_KW);
  const proposedLines = r.proposed.split("\n");
  const neverLines = proposedLines.filter((l) => l.toLowerCase().includes("never")).length;
  assert.equal(neverLines, 2, `never 줄이 제거됨 — T8 위반`);
});

test("★T8: safe-keyword 줄만 있는 파일 → 아무것도 제거 안 함", () => {
  const content = "항상 테스트를 먼저\n반드시 백업 후\n절대 삭제 금지";
  const r = generateTreatPreview(content, SAFE_KW);
  assert.equal(r.removedCount, 0);
});

// ── generateTreatPreview — 빈 줄 압축 ───────────────────────
console.log("\n[generateTreatPreview — 빈 줄 압축]");

test("★회귀: 연속 2줄 빈 줄 → 그대로 유지(3개 이상만 압축 — README/GUIDE/SKILL.md 명시)", () => {
  const content = "줄 A\n\n\n줄 B";  // 빈 줄 정확히 2개
  const r = generateTreatPreview(content, SAFE_KW);
  const proposedLines = r.proposed.split("\n");
  const blankCount = proposedLines.filter((l) => l.trim() === "").length;
  assert.equal(blankCount, 2, `빈 줄 2개가 압축돼 ${blankCount}개가 됨 — 문서화된 "3개 이상만 압축" 위반`);
});

test("연속 3줄 이상 빈 줄 압축 → shrunk=true", () => {
  const content = "줄 A\n\n\n\n\n줄 B";  // 빈 줄 4개 → 1개로 압축
  const r = generateTreatPreview(content, SAFE_KW);
  assert.ok(r.shrunk, "빈 줄 압축으로 줄어들었어야 함");
  assert.ok(r.safe, "safe는 shrunk와 같아야 함");
});

// ── generateTreatPreview — 반환값 구조 ───────────────────────
console.log("\n[generateTreatPreview — 반환값 구조]");

test("반환값에 필수 필드 7개 있음", () => {
  const r = generateTreatPreview("테스트", SAFE_KW);
  const required = ["proposed", "originalLines", "proposedLines", "removedCount", "removedItems", "shrunk", "safe"];
  for (const field of required) {
    assert.ok(field in r, `필드 누락: ${field}`);
  }
});

test("harnessAvailable 필드 있음 (boolean)", () => {
  const r = generateTreatPreview("테스트", SAFE_KW);
  assert.ok("harnessAvailable" in r);
  assert.equal(typeof r.harnessAvailable, "boolean");
});

test("safe === shrunk (fail-safe: 작아져야만 적용)", () => {
  const content = "동일한 줄\n동일한 줄";  // 중복 → shrunk
  const r = generateTreatPreview(content, SAFE_KW);
  assert.equal(r.safe, r.shrunk);
});

// ── generateTreatPreview — originalLines/proposedLines = countLines() 일치 ──
// ★회귀(7eb8497): 트레일링 개행 파일에서 split("\n").length가 만드는 빈 요소를
// 그대로 세어 checkup-rules.mjs의 countLines()(공식 기준)보다 항상 1 더 많이 보고했다.
console.log("\n[generateTreatPreview — checkup-rules.countLines()와 표시값 일치]");

test("★회귀: 트레일링 개행 파일 → originalLines가 countLines()와 일치", () => {
  const content = "줄 A\n줄 B\n줄 C\n"; // 개행으로 끝남 — split("\n")은 4개(마지막 "")를 만듦
  const r = generateTreatPreview(content, SAFE_KW);
  assert.equal(r.originalLines, countLines(content), "originalLines가 countLines() 기준과 어긋남(off-by-one 재발)");
});

test("★회귀: 트레일링 개행 없는 파일 → originalLines가 countLines()와 일치", () => {
  const content = "줄 A\n줄 B\n줄 C"; // 개행 없이 끝남
  const r = generateTreatPreview(content, SAFE_KW);
  assert.equal(r.originalLines, countLines(content));
});

test("★회귀: 처방으로 줄어든 뒤 proposedLines도 countLines(proposed)와 일치", () => {
  const content = "중복 줄\n다른 줄\n중복 줄\n마지막\n"; // 중복 제거 발생 + 트레일링 개행
  const r = generateTreatPreview(content, SAFE_KW);
  assert.ok(r.removedCount > 0, "이 테스트는 실제 처방(중복 제거)이 일어나야 의미 있음");
  assert.equal(r.proposedLines, countLines(r.proposed), "proposedLines가 countLines(proposed)와 어긋남(off-by-one 재발)");
});

// ── formatPreviewSummary ──────────────────────────────────────
console.log("\n[formatPreviewSummary]");

test("safe=false → '작아지지 않아요' 메시지 반환", () => {
  const summary = formatPreviewSummary({ safe: false });
  assert.ok(summary.includes("작아지지"), `예상 메시지 없음: '${summary}'`);
});

test("safe=true → 줄 수 변화 포함한 요약 반환", () => {
  const preview = {
    safe: true,
    originalLines: 100,
    proposedLines: 80,
    removedCount: 20,
    removedItems: [],
  };
  const summary = formatPreviewSummary(preview);
  assert.ok(summary.includes("100"), "원본 줄 수 없음");
  assert.ok(summary.includes("80"), "처방 후 줄 수 없음");
});

test("safe=true, 제거 항목 있으면 목록에 포함", () => {
  const preview = {
    safe: true,
    originalLines: 10,
    proposedLines: 9,
    removedCount: 1,
    removedItems: [{ lineNum: 5, rule: "duplicate", content: "중복 줄입니다" }],
  };
  const summary = formatPreviewSummary(preview);
  assert.ok(summary.includes("5"), "줄 번호 없음");
  assert.ok(summary.includes("duplicate"), "규칙 이름 없음");
});

// ── 결과 출력 ─────────────────────────────────────────────────
console.log(`\n결과: ${passed} 통과 / ${failed} 실패 / 총 ${passed + failed}\n`);
if (failed > 0) process.exit(1);
