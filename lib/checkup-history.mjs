// SoDamContext — checkup-history.mjs
// 건강점수 산식 정식화(Phase 3, 05_AUDIT_AND_DECISIONS.md E1)를 위한 실사용 이력 축적.
// 낯선 베타 테스터를 모집하는 대신, 본인이 실제로 여러 프로젝트에 반복 사용하며 자연히
// 쌓이는 실제 점수·문제유형 분포를 로컬에만 기록해 나중에 산식 튜닝 근거로 쓴다.
//
// 저장하는 것은 점수·카테고리 id·개수뿐(파일 내용·비밀키 값 없음) — T1과 무관.
// 저장 위치는 backup.mjs·checkup-freshness.mjs와 동일한 ".sodamcontext/" 규칙 재사용.
// 형식은 JSON Lines(한 줄=한 번의 검진) — 매번 전체를 다시 쓰지 않고 끝에 한 줄만
// 덧붙이므로, 이력이 아무리 쌓여도 기존 줄이 손상될 위험이 적다(append-only).

import path from "node:path";
import { existsSync, readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { findGitRoot } from "./backup.mjs";

const STATE_SUBDIR = ".sodamcontext";
const HISTORY_FILE = "checkup-history.jsonl";

function historyFilePath(absFilePath) {
  const fileDir = path.dirname(absFilePath);
  const projectRoot = findGitRoot(fileDir) || fileDir;
  return path.join(projectRoot, STATE_SUBDIR, HISTORY_FILE);
}

/**
 * 이번 검진 결과 요약 한 줄을 이력에 덧붙인다(부가기능 — 실패해도 조용히 무시,
 * 핵심 검진 결과를 막지 않는다). 파일 원문·비밀키 값은 절대 담지 않는다.
 * @param {string} absFilePath
 * @param {{ score: number, highCount: number, mediumCount: number, problemCount: number, findingIds: string[] }} summary
 */
export function recordHistory(absFilePath, summary) {
  try {
    const histPath = historyFilePath(absFilePath);
    mkdirSync(path.dirname(histPath), { recursive: true });
    const entry = {
      at: new Date().toISOString(),
      file: absFilePath,
      score: summary?.score ?? null,
      highCount: summary?.highCount ?? 0,
      mediumCount: summary?.mediumCount ?? 0,
      problemCount: summary?.problemCount ?? 0,
      findingIds: Array.isArray(summary?.findingIds) ? summary.findingIds : [],
    };
    appendFileSync(histPath, JSON.stringify(entry) + "\n", "utf8");
  } catch {
    // 조용히 무시 — 부가기능 실패가 핵심 검진을 막지 않음
  }
}

/**
 * 지금까지 쌓인 이력 전체를 읽는다(산식 튜닝 분석용). 손상된 줄은 건너뛰고
 * 나머지는 그대로 반환한다(fail-safe — 한 줄 손상이 전체 이력을 무효화하지 않음).
 * @param {string} absFilePath
 * @returns {Array<object>}
 */
export function readHistory(absFilePath) {
  try {
    const histPath = historyFilePath(absFilePath);
    if (!existsSync(histPath)) return [];
    const raw = readFileSync(histPath, "utf8");
    const lines = raw.split("\n").filter((l) => l.trim().length > 0);
    const out = [];
    for (const line of lines) {
      try {
        out.push(JSON.parse(line));
      } catch {
        // 손상된 줄은 건너뜀
      }
    }
    return out;
  } catch {
    return [];
  }
}
