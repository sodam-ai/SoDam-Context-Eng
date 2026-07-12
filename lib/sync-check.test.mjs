// SoDamContext — sync-check.test.mjs
// checkSync()가 안전 규칙(safe-keywords) 줄만 비교하고, 파일 '내용'은 절대 반환하지 않는지 검증한다.
// 실행: node lib/sync-check.test.mjs

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkSync } from "./sync-check.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const rulesDir = path.join(here, "..", "rules");

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}

console.log("\nSoDamContext sync-check 유닛테스트\n");

test("[1] 양쪽에 동일한 안전 규칙 → onlyInClaude/onlyInAgents 둘 다 비어있음", () => {
  const claude = "한국어로 답해줘.\n절대 force push 금지.\n";
  const agents = "Respond in Korean.\n절대 force push 금지.\n";
  const r = checkSync(claude, agents, rulesDir);
  assert.deepEqual(r.onlyInClaude, []);
  assert.deepEqual(r.onlyInAgents, []);
  assert.equal(r.claudeSafeCount, 1);
  assert.equal(r.agentsSafeCount, 1);
});

test("[2] CLAUDE.md에만 있는 안전 규칙 → onlyInClaude에 줄번호로 잡힘", () => {
  const claude = "코드는 간결하게.\n비밀키 절대 금지.\n";
  const agents = "Keep code concise.\n";
  const r = checkSync(claude, agents, rulesDir);
  assert.deepEqual(r.onlyInClaude, [2]);
  assert.deepEqual(r.onlyInAgents, []);
});

test("[3] AGENTS.md에만 있는 안전 규칙 → onlyInAgents에 줄번호로 잡힘", () => {
  const claude = "코드는 간결하게.\n";
  const agents = "Keep it concise.\nnever commit secrets\n";
  const r = checkSync(claude, agents, rulesDir);
  assert.deepEqual(r.onlyInClaude, []);
  assert.deepEqual(r.onlyInAgents, [2]);
});

test("[4] 안전 키워드 없는 줄은 완전히 무시(노이즈 0) — 산문이 아무리 달라도 무관", () => {
  const claude = "이 프로젝트는 온라인 서점입니다.\n장바구니와 결제 기능이 있습니다.\n리액트를 씁니다.\n";
  const agents = "This is a completely different description written in English about something else entirely.\n";
  const r = checkSync(claude, agents, rulesDir);
  assert.deepEqual(r.onlyInClaude, []);
  assert.deepEqual(r.onlyInAgents, []);
  assert.equal(r.claudeSafeCount, 0);
  assert.equal(r.agentsSafeCount, 0);
});

test("[5] 한쪽 파일이 빈 내용 → 다른 쪽 안전 규칙 전부 'only'로 잡힘", () => {
  const claude = "";
  const agents = "절대 금지: 프로덕션 DB 직접 수정.\nmust use parameterized queries\n";
  const r = checkSync(claude, agents, rulesDir);
  assert.deepEqual(r.onlyInClaude, []);
  assert.deepEqual(r.onlyInAgents, [1, 2]);
});

test("[6] 목록기호(-/*/숫자.)·대소문자 차이만 있으면 같은 줄로 인식(오탐 방지)", () => {
  const claude = "- 절대 Force Push 금지\n";
  const agents = "1. 절대 force push 금지\n";
  const r = checkSync(claude, agents, rulesDir);
  assert.deepEqual(r.onlyInClaude, []);
  assert.deepEqual(r.onlyInAgents, []);
});

test("[7] ★반환값에 파일 내용(원문) 자체가 없음 — 줄번호·개수만", () => {
  const secretPhrase = "이 문장은-절대-반환되면-안됨";
  const claude = `금지: ${secretPhrase}\n`;
  const agents = "";
  const r = checkSync(claude, agents, rulesDir);
  const blob = JSON.stringify(r);
  assert.ok(!blob.includes(secretPhrase), "★파일 내용이 반환값에 노출됨(설계 위반)");
  assert.deepEqual(Object.keys(r).sort(), ["agentsSafeCount", "claudeSafeCount", "onlyInAgents", "onlyInClaude"]);
});

test("[8] rules 폴더에 safe-keywords.json이 없어도 예외 없이 안전하게 빈 결과(loadSafeKeywords의 fail-safe 재확인)", () => {
  const r = checkSync("절대 이거 하지마\n", "그건 하지마세요\n", path.join(here, "__없는폴더__"));
  assert.deepEqual(r.onlyInClaude, []);
  assert.deepEqual(r.onlyInAgents, []);
  assert.equal(r.claudeSafeCount, 0, "키워드 목록이 비면 safe-keyword 매칭도 0건이어야 함");
});

console.log(`\n결과: ${passed} 통과 / ${failed} 실패 / 총 ${passed + failed}\n`);
if (failed > 0) process.exit(1);
