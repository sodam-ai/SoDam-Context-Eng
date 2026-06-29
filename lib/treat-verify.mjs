// SoDamContext — treat-verify.mjs
// 처방 회귀검증: 처방 전후 안전키워드 100% 보존 확인 (PRD 01 성공기준, 07 T8)
// ★ 처방 적용 직전에 반드시 실행
// ★ safe: false → 처방 중단 (fail-closed)

import { isSafeLine } from "./treat.mjs";

/**
 * 처방 전후 안전키워드 포함 줄이 모두 보존됐는지 검증합니다.
 *
 * @param {string} original 원본 파일 내용
 * @param {string} proposed 처방 후 제안 내용
 * @param {string[]} keywords safe-keywords 배열
 * @returns {{
 *   safe: boolean,              // true = 모든 안전규칙 보존됨 → 처방 적용 가능
 *   originalSafeCount: number,  // 원본의 안전키워드 포함 줄 수
 *   proposedSafeCount: number,  // 처방 후 안전키워드 포함 줄 수
 *   missingSafeLines: string[], // 보존되지 않은 줄 목록 (safe=false 시)
 *   shrunk: boolean             // 처방 후 더 작아졌는지
 * }}
 */
export function verifyTreatment(original, proposed, keywords) {
  const origLines = original.split("\n");
  const propLines = proposed.split("\n");

  // 원본에서 safe-keyword 포함 줄 수집
  const origSafeLines = origLines.filter((l) => isSafeLine(l, keywords));

  // 처방 후에도 모두 존재하는지 확인
  const propSet = new Set(propLines.map((l) => l.trim()));
  const missingSafeLines = origSafeLines.filter((l) => !propSet.has(l.trim()));

  const shrunk = proposed.length < original.length || propLines.length < origLines.length;

  return {
    safe: missingSafeLines.length === 0 && shrunk,
    originalSafeCount: origSafeLines.length,
    proposedSafeCount: propLines.filter((l) => isSafeLine(l, keywords)).length,
    missingSafeLines,
    shrunk,
  };
}
