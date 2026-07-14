// SoDamContext — checkup-freshness.mjs
// Phase 3 '정기 점검 알림' — 좁은 범위로 구현: SoDamLoop의 영역(주기 스케줄링·능동 알림)은
// 건드리지 않는다(SODAM_FAMILY_MAP.md §1 "주기 스케줄링·오케스트레이션"은 Context가 안 하는 일).
// 백그라운드 타이머·훅·알림 0개 — checkup이 "실행되는 시점"에만 마지막 검진 이후 며칠 지났는지
// 비교해 리포트에 포함한다.
//
// 저장하는 것은 절대경로별 "마지막 검진 시각" 문자열뿐(파일 내용 아님) — T1과 무관.
// 상태 파일 위치는 backup.mjs와 동일한 ".sodamcontext/" 규칙을 재사용(findGitRoot 공유).

import path from "node:path";
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { findGitRoot } from "./backup.mjs";

const STATE_SUBDIR = ".sodamcontext";
const STATE_FILE = "last-checkup.json";

function stateFilePath(absFilePath) {
  const fileDir = path.dirname(absFilePath);
  const projectRoot = findGitRoot(fileDir) || fileDir;
  return path.join(projectRoot, STATE_SUBDIR, STATE_FILE);
}

function loadState(statePath) {
  try {
    if (!existsSync(statePath)) return {};
    const raw = JSON.parse(readFileSync(statePath, "utf8"));
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  } catch {
    return {}; // 손상돼도 "기록 없음"으로 안전 폴백 — 검진 자체를 막지 않음
  }
}

/**
 * 마지막 검진 이후 며칠 지났는지 계산한다(부가 정보 — 실패해도 검진 결과에 영향 없음).
 * @param {string} absFilePath 검진 대상 파일의 절대경로
 * @param {number} staleDays 이 값(일) 이상 지나면 stale로 표시
 * @returns {{ previousCheckupAt: string|null, daysSinceLastCheckup: number|null, stale: boolean }}
 */
export function getFreshness(absFilePath, staleDays) {
  try {
    const statePath = stateFilePath(absFilePath);
    const state = loadState(statePath);
    const prev = state[absFilePath];
    if (typeof prev !== "string") {
      return { previousCheckupAt: null, daysSinceLastCheckup: null, stale: false };
    }
    const prevMs = Date.parse(prev);
    if (Number.isNaN(prevMs)) {
      return { previousCheckupAt: null, daysSinceLastCheckup: null, stale: false };
    }
    const days = Math.max(0, Math.floor((Date.now() - prevMs) / 86400000));
    return { previousCheckupAt: prev, daysSinceLastCheckup: days, stale: days >= staleDays };
  } catch {
    return { previousCheckupAt: null, daysSinceLastCheckup: null, stale: false };
  }
}

/**
 * 이번 검진 시각을 기록한다(다음 검진의 비교 기준이 됨). 부가기능이므로 실패해도 조용히
 * 무시한다(fail-safe — 기록 실패가 핵심 검진 결과를 막으면 안 됨). 원자적 쓰기(임시파일→rename).
 * @param {string} absFilePath
 */
export function recordCheckup(absFilePath) {
  try {
    const statePath = stateFilePath(absFilePath);
    mkdirSync(path.dirname(statePath), { recursive: true });
    const state = loadState(statePath);
    state[absFilePath] = new Date().toISOString();
    const tmpPath = statePath + ".tmp";
    writeFileSync(tmpPath, JSON.stringify(state, null, 2), "utf8");
    renameSync(tmpPath, statePath);
  } catch {
    // 조용히 무시 — 부가기능 실패가 핵심 검진을 막지 않음
  }
}
