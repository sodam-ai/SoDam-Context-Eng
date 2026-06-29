// SoDamContext — treat.mjs
// 처방 라이브러리: 안전키워드 보존 + 처방 규칙 + 미리보기 생성 (PRD 01/02/03/04/07)
// ★ 이 파일은 파일을 직접 쓰지 않는다 — 미리보기만 반환, 쓰기는 SKILL에서 사용자 확인 후
// ★ T8 방어: safe-keywords 포함 줄은 절대 처방 대상에서 제외
// ★ fail-safe: 처방 후 크기가 더 커지면 거부
// ★ 비밀키 자동삭제 금지 (오탐 위험 — 사용자가 직접 결정)

import path from "node:path";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";

// ── Harness 생존 감지 (인라인 — 크로스레포 import 없음, fail-closed) ────────
function detectHarness() {
  try {
    const pluginsDir = path.join(homedir(), ".claude", "plugins");
    if (!existsSync(pluginsDir)) return false;
    for (const entry of readdirSync(pluginsDir)) {
      const dir = path.join(pluginsDir, entry);
      try { if (!statSync(dir).isDirectory()) continue; } catch { continue; }
      for (const pj of [
        path.join(dir, ".claude-plugin", "plugin.json"),
        path.join(dir, "plugin.json"),
      ]) {
        if (!existsSync(pj)) continue;
        try {
          const j = JSON.parse(readFileSync(pj, "utf8"));
          if (j && j.name === "sodam-harness") return true;
        } catch { /* 깨진 매니페스트 무시 */ }
      }
    }
    return false;
  } catch {
    return false; // 감지 오류 → fail-closed
  }
}

// ── safe-keywords 로드 ───────────────────────────────────────────────────
export function loadSafeKeywords(rulesDir) {
  try {
    const raw = readFileSync(path.join(rulesDir, "safe-keywords.json"), "utf8");
    const data = JSON.parse(raw);
    return (data.keywords || []).map((k) => k.toLowerCase());
  } catch {
    // 파일 없으면 빈 배열 (처방 규칙만 적용)
    return [];
  }
}

// 줄이 safe-keyword를 포함하는지 확인 (T8 방어)
export function isSafeLine(line, keywords) {
  const lower = line.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

// ── 처방 규칙 ────────────────────────────────────────────────────────────

/**
 * Rule 1: 정확히 중복된 줄 제거 (첫 번째 등장 보존)
 * safe-keyword 포함 줄은 무조건 보존.
 */
function deduplicateLines(lines, keywords) {
  const seen = new Set();
  const result = [];
  const removed = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 빈 줄 / safe 줄은 중복 판정 제외 (항상 보존)
    if (trimmed === "" || isSafeLine(line, keywords)) {
      result.push(line);
      continue;
    }

    if (seen.has(trimmed)) {
      removed.push({ lineNum: i + 1, content: line, rule: "duplicate" });
    } else {
      seen.add(trimmed);
      result.push(line);
    }
  }

  return { lines: result, removed };
}

/**
 * Rule 2: 연속 3줄 이상 빈 줄 → 최대 1줄로 압축
 * (safe-keyword와 무관 — 빈 줄은 내용 없음)
 */
function collapseBlankLines(lines) {
  const result = [];
  let blankCount = 0;
  let removedCount = 0;

  for (const line of lines) {
    if (line.trim() === "") {
      blankCount++;
      if (blankCount <= 1) {
        result.push(line);
      } else {
        removedCount++;
      }
    } else {
      blankCount = 0;
      result.push(line);
    }
  }

  return { lines: result, removedBlankCount: removedCount };
}

// ── 메인 처방 함수 ────────────────────────────────────────────────────────

/**
 * 처방 미리보기를 생성합니다. 파일을 직접 쓰지 않습니다.
 *
 * @param {string} content 원본 파일 내용
 * @param {string[]} keywords safe-keywords (isSafeLine에 사용)
 * @returns {{
 *   proposed: string,         // 처방 후 전체 내용
 *   originalLines: number,    // 원본 줄 수
 *   proposedLines: number,    // 처방 후 줄 수
 *   removedCount: number,     // 제거된 줄 수
 *   removedItems: Array,      // 제거된 항목 상세
 *   shrunk: boolean,          // 처방 후 더 작아졌는지
 *   safe: boolean,            // 처방 적용 가능 여부 (크기 감소 확인)
 *   harnessAvailable: boolean // SoDamHarness 설치 감지 — 호출자가 백업 방식 결정에 사용
 * }}
 */
export function generateTreatPreview(content, keywords) {
  const originalLines = content.split("\n");

  // Rule 1: 중복 줄 제거
  const step1 = deduplicateLines(originalLines, keywords);

  // Rule 2: 연속 빈 줄 압축
  const step2 = collapseBlankLines(step1.lines);

  const proposed = step2.lines.join("\n");
  const removedItems = step1.removed;
  const removedCount = removedItems.length + step2.removedBlankCount;

  const shrunk = proposed.length < content.length || step2.lines.length < originalLines.length;
  const safe = shrunk; // 처방 후 크기가 줄었을 때만 적용 허용

  return {
    proposed,
    originalLines: originalLines.length,
    proposedLines: step2.lines.length,
    removedCount,
    removedItems,
    shrunk,
    safe,
    harnessAvailable: detectHarness(),
  };
}

/**
 * 처방 후 미리보기를 사람이 읽을 한국어 요약으로 변환합니다.
 */
export function formatPreviewSummary(preview) {
  if (!preview.safe) {
    return "처방 결과 파일이 더 작아지지 않아요 — 처방이 필요 없거나 이미 최적화됐을 수 있어요.";
  }

  const lines = [
    `처방 미리보기: ${preview.originalLines}줄 → ${preview.proposedLines}줄 (${preview.removedCount}건 정리)`,
  ];

  if (preview.removedItems.length > 0) {
    lines.push("\n제거 예정:");
    for (const item of preview.removedItems.slice(0, 10)) {
      lines.push(`  ${item.lineNum}번째 줄 [${item.rule}]: ${item.content.trim().slice(0, 60)}`);
    }
    if (preview.removedItems.length > 10) {
      lines.push(`  … 외 ${preview.removedItems.length - 10}건`);
    }
  }

  lines.push("\n고치기 전에 백업부터 뜨고, 무엇을 바꿀지 확인해 드릴게요.");
  return lines.join("\n");
}
