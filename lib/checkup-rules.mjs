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

// 통째 붙여넣기(JIT 위반): 코드블록(```)이 길면 의심. 원본 '내용'은 안 보고 블록 '길이'(구조)만
// 재므로 T1과 무관 — PRD Phase3 '모순/낡음 AI 판단 강화' 5종 중 유일하게 결정론 승격 가능한 항목.
// 닫는 ```가 없어 파일 끝까지 이어지는 경우도(오탐 방지용 fail-safe로 무시하지 않고) 안전하게 집계한다.
export function checkJitViolation(text, thresholds) {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  if (lines.length && lines[lines.length - 1] === "") lines.pop(); // countLines와 동일: 끝의 빈 줄 하나는 안 센다
  const limit = thresholds?.jitViolation?.fence_lines_high ?? 15;
  const out = [];
  let fenceStartLine = null; // 1-indexed
  let fenceLineCount = 0;

  function closeFence() {
    if (fenceStartLine !== null && fenceLineCount > limit) {
      out.push(
        mkFinding(
          "jit_violation",
          "보통",
          `${fenceStartLine}번째 줄부터 코드블록이 ${fenceLineCount}줄이나 이어져요(${limit}줄 이상). 통째로 넣지 말고 '파일:줄'로 가리키면 가벼워져요.`,
          fenceStartLine
        )
      );
    }
    fenceStartLine = null;
    fenceLineCount = 0;
  }

  for (let i = 0; i < lines.length; i++) {
    const isFenceMarker = /^\s*```/.test(lines[i]);
    if (isFenceMarker) {
      if (fenceStartLine === null) {
        fenceStartLine = i + 1; // 여는 ``` 자체는 카운트 안 함(내용만)
        fenceLineCount = 0;
      } else {
        closeFence(); // 닫는 ```
      }
    } else if (fenceStartLine !== null) {
      fenceLineCount++;
    }
  }
  closeFence(); // 파일 끝까지 안 닫힌 코드블록도 안전하게 집계

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

  const jitCheck = (checkupRules.checks || []).find((c) => c.id === "jit_violation" && c.kind === "rule");
  if (jitCheck) findings.push(...checkJitViolation(text, thresholds));

  return { findings, lines: countLines(text), bytes: byteLength(text) };
}

// 'AI 의심'으로 넘길 항목 목록(스킬이 판단). 데이터 주도 — 전체 ai_suspect 반환.
export function listAiSuspectChecks(rules) {
  return (rules.checkupRules.checks || []).filter((c) => c.kind === "ai_suspect");
}

// hint_keywords가 없어 규칙으로 못 잡는 ai_suspect(진짜 AI 판단 필요 — '소개만', 깊은 판정은 Phase 3).
export function listHintlessAiChecks(rules) {
  return (rules.checkupRules.checks || []).filter(
    (c) => c.kind === "ai_suspect" && !(Array.isArray(c.hint_keywords) && c.hint_keywords.length > 0)
  );
}

// hint_keyword 기반 '의심' 탐지: ai_suspect 검사 중 hint_keywords가 있는 것만 결정론으로 스캔한다.
// (깊은 AI 판정이 아니라 보일러플레이트/키워드 '대체 판정' — PRD 02:69·02:72 "기본 승격")
// ★T1 안전: 매칭 키워드(hit)는 rules의 '상수' 목록이고, 사용자 파일 내용은 반환하지 않는다(줄번호·우리 상수만).
// 검사별로 1건 집계(줄번호 배열) → 리포트가 "낡음 의심 — 3·7번째 줄" 식으로 깔끔.
export function runHintSuspectChecks(text, rules) {
  const lines = String(text || "").split(/\r?\n/);
  const out = [];
  for (const check of rules.checkupRules.checks || []) {
    if (check.kind !== "ai_suspect") continue;
    const kws = Array.isArray(check.hint_keywords) ? check.hint_keywords : [];
    if (kws.length === 0) continue;
    const low = kws.map((k) => k.toLowerCase());
    const matchedLines = [];
    let hit = null;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].toLowerCase();
      const idx = low.findIndex((kw) => l.includes(kw));
      if (idx >= 0) {
        matchedLines.push(i + 1);
        if (hit === null) hit = kws[idx]; // 원본 대소문자(우리 상수)
      }
    }
    if (matchedLines.length > 0) {
      out.push({
        id: check.id,
        kind: "suspect",
        confidence: "의심",
        severity: "보통",
        name: check.name,
        why: check.why,
        lines: matchedLines,
        hit,
      });
    }
  }
  return out;
}
