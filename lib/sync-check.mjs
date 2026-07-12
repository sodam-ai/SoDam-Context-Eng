// SoDamContext — sync-check.mjs
// Phase 2 동기화 준비: CLAUDE.md와 AGENTS.md를 "합치지" 않는다 — 읽기 전용 리포트만 낸다.
// 안전·금지 규칙(safe-keywords 포함 줄)이 한쪽 파일에만 있으면 알려준다. 그 반대쪽 AI 도구가
// 그 규칙을 아예 모를 수 있다는 뜻이라, 두 파일 사이에서 가장 위험한 종류의 불일치이기 때문이다.
//
// ★설계 근거(PRD 08_DEEP_RESEARCH_FINDINGS.md A1): "@import는 절약이 아니라 정리일 뿐"
//   (파일도 시작 시 전체 로드됨) — 그래서 이 모듈은 두 파일을 합치는 기능을 만들지 않는다.
//   자동 쓰기도 없다(자동적용 금지 원칙). 사용자가 직접 보고 옮기게 안내만 한다.
// ★의미(뜻) 기반 모순 탐지는 하지 않는다 — 문자열 정규화 비교만(hint_keyword 방식과 동일 철학).
//   "npm 써라" vs "pnpm 써라" 같은 의미 충돌 판정은 Phase 3(AI 판단) 영역으로 남겨둔다.
// ★전 파일 공통 원칙(checkup-rules.mjs와 동일): 반환값에 파일 '내용'을 담지 않는다 — 줄 번호·개수만.

import { loadSafeKeywords, isSafeLine } from "./treat.mjs";

// 목록기호(-·*·>·#·숫자.) 제거 + 대소문자 무시 — 사소한 서식 차이로 인한 오탐 방지.
function normalize(line) {
  return line.trim().replace(/^[-*>#\d.\s]+/, "").toLowerCase();
}

// safe-keyword를 포함한 줄만 뽑아 {lineNum, norm} 목록으로. 정규화 결과가 너무 짧으면(기호만) 제외.
function safeLineIndex(content, keywords) {
  const lines = String(content || "").split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (!isSafeLine(lines[i], keywords)) continue;
    const norm = normalize(lines[i]);
    if (norm.length >= 2) out.push({ lineNum: i + 1, norm });
  }
  return out;
}

/**
 * 두 파일의 안전 규칙(safe-keywords 포함 줄)을 비교해, 한쪽에만 있는 줄 번호를 찾는다.
 * 파일 내용은 정규화 비교에만 쓰고, 반환값에는 절대 담지 않는다.
 *
 * @param {string} claudeContent CLAUDE.md 전체 내용
 * @param {string} agentsContent AGENTS.md 전체 내용
 * @param {string} rulesDir rules/ 폴더 경로
 * @returns {{
 *   onlyInClaude: number[],   // AGENTS.md에는 없는 안전 규칙 줄 번호(CLAUDE.md 기준)
 *   onlyInAgents: number[],   // CLAUDE.md에는 없는 안전 규칙 줄 번호(AGENTS.md 기준)
 *   claudeSafeCount: number,
 *   agentsSafeCount: number,
 * }}
 */
export function checkSync(claudeContent, agentsContent, rulesDir) {
  const keywords = loadSafeKeywords(rulesDir);

  const claudeSafe = safeLineIndex(claudeContent, keywords);
  const agentsSafe = safeLineIndex(agentsContent, keywords);
  const agentsNormSet = new Set(agentsSafe.map((l) => l.norm));
  const claudeNormSet = new Set(claudeSafe.map((l) => l.norm));

  const onlyInClaude = claudeSafe.filter((l) => !agentsNormSet.has(l.norm)).map((l) => l.lineNum);
  const onlyInAgents = agentsSafe.filter((l) => !claudeNormSet.has(l.norm)).map((l) => l.lineNum);

  return {
    onlyInClaude,
    onlyInAgents,
    claudeSafeCount: claudeSafe.length,
    agentsSafeCount: agentsSafe.length,
  };
}
