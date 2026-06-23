// SoDamContext — checkup-rules.mjs
// 검진의 '규칙 확정' 부분. 규칙이 명확한 항목만 결정론으로 판정한다(리포트에 "확정" 표시).
// 애매한 항목(모순·낡음·맥락없는참조 등)은 여기서 판정하지 않고 'AI 의심'으로 넘긴다(M1, 스킬).
// 모든 임계 수치는 rules/thresholds.json 한 곳에서 읽는다(하드코딩 금지 — PRD 05_AUDIT D2).

import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export function loadRules(rulesDir) {
  const dir = rulesDir || path.join(here, "..", "rules");
  const checkupRules = JSON.parse(readFileSync(path.join(dir, "checkup-rules.json"), "utf8"));
  const thresholds = JSON.parse(readFileSync(path.join(dir, "thresholds.json"), "utf8"));
  return { checkupRules, thresholds };
}

// 줄 수 세기 (끝의 빈 줄 하나는 편집기 관습상 안 센다)
export function countLines(text) {
  if (!text) return 0;
  const arr = String(text).replace(/\r\n/g, "\n").split("\n");
  if (arr.length && arr[arr.length - 1] === "") arr.pop();
  return arr.length;
}

// UTF-8 바이트 길이 (코덱스 32KiB 한도용. 한글 1자=3바이트)
export function byteLength(text) {
  return Buffer.byteLength(String(text || ""), "utf8");
}

function mkFinding(id, severity, message, line) {
  return { id, kind: "rule", confidence: "확정", severity, message, line };
}

// 크기 검진: 파일 종류에 따라 줄 수(claude) 또는 바이트(codex)로 잰다. (PRD B3 파일별 단위)
// 반환: finding 또는 null
export function checkSize(text, metric, thresholds) {
  if (metric === "lines") {
    const lines = countLines(text);
    const { lines_warn, lines_high } = thresholds.claudeMd;
    if (lines >= lines_high)
      return mkFinding("size", "높음", `설명서가 ${lines}줄로 꽤 길어요(${lines_high}줄 이상). 줄일수록 AI가 더 또렷하게 이해해요.`, lines);
    if (lines >= lines_warn)
      return mkFinding("size", "보통", `설명서가 ${lines}줄이에요(${lines_warn}줄을 넘으면 점검 권장).`, lines);
    return null;
  }
  if (metric === "bytes") {
    const bytes = byteLength(text);
    const { bytes_warn, bytes_limit } = thresholds.agentsMd;
    if (bytes >= bytes_limit)
      return mkFinding("size", "높음", `코덱스 설명서가 ${bytes}바이트로 한도(${bytes_limit})를 넘었어요. 한글은 글자당 3바이트라 글자 수가 적어도 용량이 클 수 있어요.`, null);
    if (bytes >= bytes_warn)
      return mkFinding("size", "보통", `코덱스 설명서가 ${bytes}바이트예요(한도 ${bytes_limit}에 근접).`, null);
    return null;
  }
  return null;
}

// 린트 중복: 린터가 이미 하는 형식 규칙을 설명서에 또 적었는지. (smells 62%로 최다)
// 반환: findings 배열(줄 번호 포함). 매칭된 키워드는 우리 목록의 상수라 사용자 내용 유출 없음.
export function checkLintLeakage(text, keywords) {
  const lines = String(text || "").split(/\r?\n/);
  const kw = (keywords || []).map((k) => k.toLowerCase());
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const low = lines[i].toLowerCase();
    const hit = kw.find((k) => low.includes(k));
    if (hit) {
      out.push(mkFinding("lint_leakage", "보통", `이 줄은 린터(자동 형식 검사)가 이미 하는 내용일 수 있어요 (감지 단어: "${hit}").`, i + 1));
    }
  }
  return out;
}

// 규칙 확정 검진을 한 번에 실행. target: "claude" | "codex"
// 반환: { findings, lines, bytes }
export function runRuleChecks(text, target, rules) {
  const { checkupRules, thresholds } = rules;
  const findings = [];
  const metric = target === "codex" ? "bytes" : "lines";

  const sizeFinding = checkSize(text, metric, thresholds);
  if (sizeFinding) findings.push(sizeFinding);

  const lintCheck = (checkupRules.checks || []).find((c) => c.id === "lint_leakage" && c.kind === "rule");
  if (lintCheck) findings.push(...checkLintLeakage(text, lintCheck.keywords));

  return { findings, lines: countLines(text), bytes: byteLength(text) };
}

// 'AI 의심'으로 넘길 항목 목록(스킬이 판단). M0에선 실행하지 않고 목록만 제공.
export function listAiSuspectChecks(rules) {
  return (rules.checkupRules.checks || []).filter((c) => c.kind === "ai_suspect");
}
