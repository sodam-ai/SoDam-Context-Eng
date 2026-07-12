// SoDamContext — prevent-write.test.mjs
// Phase 2 예방 hook(prevent-write.mjs)의 순수 판정 함수 단위 테스트.
// ★T1: 비밀키 판정 결과(reason)에 원문이 절대 안 섞이는지 검증.
// 실행: node lib/prevent-write.test.mjs

import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { evaluateWrite, predictContent, isTargetFile } from "./prevent-write.mjs";

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
    console.error(`  FAIL  ${name}\n        ${e.message}`);
    failed++;
  }
}

const FAKE_KEY = "sk-ant-" + "A".repeat(40); // 형식만 흉내낸 가짜 키(런타임 조립, 소스에 완전문자열 안 둠)

console.log("\nSoDamContext prevent-write 단위 테스트\n");

// ── isTargetFile ──────────────────────────────────────────────
test("isTargetFile: CLAUDE.md → true(대소문자 무관)", () => {
  assert.equal(isTargetFile("C:/proj/CLAUDE.md"), true);
  assert.equal(isTargetFile("/home/x/claude.md"), true);
});
test("isTargetFile: AGENTS.md → true", () => {
  assert.equal(isTargetFile("/home/x/AGENTS.md"), true);
});
test("isTargetFile: 무관한 파일 → false", () => {
  assert.equal(isTargetFile("/home/x/README.md"), false);
  assert.equal(isTargetFile("/home/x/notes.txt"), false);
});

// ── evaluateWrite: 무관한 파일 = 항상 allow(과차단 방지) ────────
test("무관한 파일 대상 Write(비밀키 포함이어도) → allow(대상 아님)", () => {
  const r = evaluateWrite({ file_path: "/x/README.md", content: `api_key = ${FAKE_KEY}` }, rulesDir);
  assert.equal(r.decision, "allow");
});

// ── evaluateWrite: 비밀키 사전 차단 ──────────────────────────────
test("CLAUDE.md Write + 확정 비밀키 → deny + reason에 원문 미포함(T1)", () => {
  const content = `# 설명서\napi_key = ${FAKE_KEY}\n`;
  const r = evaluateWrite({ file_path: "/x/CLAUDE.md", content }, rulesDir);
  assert.equal(r.decision, "deny");
  assert.ok(!r.reason.includes(FAKE_KEY), "★reason에 비밀키 원문 유출(T1 위반)");
  assert.ok(r.reason.includes("REDACTED"), "마스킹 표기 없음");
});

test("suspect 등급(generic_assignment)만 있으면 비밀키로 차단 안 함(확정만 차단)", () => {
  const content = `password = "일반텍스트값12345"\n`; // suspect 패턴에 매칭되지만 confirmed 아님
  const r = evaluateWrite({ file_path: "/x/CLAUDE.md", content }, rulesDir);
  assert.notEqual(r.decision, "deny");
});

// ── evaluateWrite: CLAUDE.md 줄수 경고/차단 ──────────────────────
test("CLAUDE.md 150줄(경고선 미만) → allow", () => {
  const content = Array.from({ length: 150 }, (_, i) => `줄 ${i}`).join("\n");
  const r = evaluateWrite({ file_path: "/x/CLAUDE.md", content }, rulesDir);
  assert.equal(r.decision, "allow");
});

test("CLAUDE.md 250줄(200~299 구간) → ask(경고, 차단 아님)", () => {
  const content = Array.from({ length: 250 }, (_, i) => `줄 ${i}`).join("\n");
  const r = evaluateWrite({ file_path: "/x/CLAUDE.md", content }, rulesDir);
  assert.equal(r.decision, "ask");
});

test("CLAUDE.md 320줄(상한 초과) → deny(차단)", () => {
  const content = Array.from({ length: 320 }, (_, i) => `줄 ${i}`).join("\n");
  const r = evaluateWrite({ file_path: "/x/CLAUDE.md", content }, rulesDir);
  assert.equal(r.decision, "deny");
});

// ── evaluateWrite: AGENTS.md 바이트 경고/차단 ────────────────────
test("AGENTS.md 작은 내용 → allow", () => {
  const r = evaluateWrite({ file_path: "/x/AGENTS.md", content: "짧은 내용" }, rulesDir);
  assert.equal(r.decision, "allow");
});

test("AGENTS.md 32768바이트 이상(한도) → deny", () => {
  const content = "가".repeat(11000); // 한글 1자=3바이트 → 33,000바이트
  const r = evaluateWrite({ file_path: "/x/AGENTS.md", content }, rulesDir);
  assert.equal(r.decision, "deny");
});

test("AGENTS.md 26214~32767바이트(경고 구간) → ask", () => {
  const content = "가".repeat(9000); // 27,000바이트
  const r = evaluateWrite({ file_path: "/x/AGENTS.md", content }, rulesDir);
  assert.equal(r.decision, "ask");
});

// ── predictContent: Edit 도구 시뮬레이션 ─────────────────────────
const dir = mkdtempSync(path.join(os.tmpdir(), "sdc-prevent-"));
const file = path.join(dir, "CLAUDE.md");

test("predictContent: Edit(old→new 단일치환) 예측 정확", () => {
  writeFileSync(file, "가나다\n일반 줄\n가나다", "utf8");
  const predicted = predictContent({ file_path: file, old_string: "일반 줄", new_string: "바뀐 줄" });
  assert.equal(predicted, "가나다\n바뀐 줄\n가나다");
});

test("predictContent: replace_all=true → 전체 치환", () => {
  writeFileSync(file, "X\nY\nX", "utf8");
  const predicted = predictContent({ file_path: file, old_string: "X", new_string: "Z", replace_all: true });
  assert.equal(predicted, "Z\nY\nZ");
});

test("predictContent: old_string이 파일에 없음 → null(예측 불가, 안전 통과)", () => {
  writeFileSync(file, "내용", "utf8");
  const predicted = predictContent({ file_path: file, old_string: "없는문자열", new_string: "x" });
  assert.equal(predicted, null);
});

test("evaluateWrite: Edit으로 비밀키 주입 시도 → deny(Edit 경로도 동일 방어)", () => {
  writeFileSync(file, "# 설명서\n기존 줄\n", "utf8");
  const r = evaluateWrite(
    { file_path: file, old_string: "기존 줄", new_string: `api_key = ${FAKE_KEY}` },
    rulesDir
  );
  assert.equal(r.decision, "deny");
  assert.ok(!r.reason.includes(FAKE_KEY), "★Edit 경로 reason에 비밀키 원문 유출(T1 위반)");
});

// ── fail-open 확인 ────────────────────────────────────────────
test("존재하지 않는 파일 + Edit 형태 입력 → allow(fail-open)", () => {
  const r = evaluateWrite(
    { file_path: path.join(dir, "__없음__.md"), old_string: "a", new_string: "b" },
    rulesDir
  );
  assert.equal(r.decision, "allow");
});

test("file_path 누락 → allow(fail-open)", () => {
  const r = evaluateWrite({ content: `api_key = ${FAKE_KEY}` }, rulesDir);
  assert.equal(r.decision, "allow");
});

test("알 수 없는 도구 입력 형태(content도 old_string도 없음) → allow", () => {
  const r = evaluateWrite({ file_path: "/x/CLAUDE.md", some_other_field: 1 }, rulesDir);
  assert.equal(r.decision, "allow");
});

rmSync(dir, { recursive: true, force: true });
console.log(`\n결과: ${passed} 통과 / ${failed} 실패 / 총 ${passed + failed}\n`);
if (failed > 0) process.exit(1);
