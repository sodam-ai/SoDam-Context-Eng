// SoDamContext — health-score.mjs
// Phase 3 '건강점수(참고용)' — 낯선 다수 베타 데이터로 "정식화"된 공식이 아니라, 완전히
// 투명한 감점식(가중치는 rules/thresholds.json 데이터, 09_EXTENSIBILITY §1 원칙).
// 2026-07-15 확정: 이 저장소는 PRIVATE·본인 전용 유지 — 그래서 참고 지표로 도입하되,
// 절대 "검증됨"으로 단언하지 않고 항상 "참고용(검증 전)"으로 표기한다(07_SECURITY §2.8).
//
// 새 파일 내용을 읽지 않는다 — checkupFile()이 이미 계산해 둔 findings 개수·심각도만
// 집계한다(T1과 무관, 원본 열람 없음).

const DEFAULT_CFG = { start: 100, penalty_high: 15, penalty_medium: 5, min: 0 };

function countBySeverity(findings) {
  let high = 0;
  let medium = 0;
  for (const f of findings || []) {
    if (f && f.severity === "높음") high++;
    else medium++;
  }
  return { high, medium };
}

/**
 * checkupFile() 결과(secret/rules/suspects의 findings)로부터 참고용 점수를 계산한다.
 * @param {object} result checkupFile()이 만든 result 객체(freshness 계산 이전이어도 무방)
 * @param {object} [thresholds] rules/thresholds.json 파싱 결과(loadRules().thresholds)
 * @returns {{ score: number, label: string, breakdown: object }}
 */
export function computeHealthScore(result, thresholds) {
  const cfg = { ...DEFAULT_CFG, ...(thresholds && thresholds.healthScore ? thresholds.healthScore : {}) };

  const secretCounts = countBySeverity(result?.secret?.findings);
  const ruleCounts = countBySeverity(result?.rules?.findings);
  const suspectCounts = countBySeverity(result?.suspects?.findings);

  const highCount = secretCounts.high + ruleCounts.high + suspectCounts.high;
  const mediumCount = secretCounts.medium + ruleCounts.medium + suspectCounts.medium;

  let score = cfg.start - highCount * cfg.penalty_high - mediumCount * cfg.penalty_medium;
  score = Math.max(cfg.min, Math.min(cfg.start, score));

  return {
    score,
    label: "참고용(검증 전)",
    breakdown: {
      highCount,
      mediumCount,
      start: cfg.start,
      penaltyHigh: cfg.penalty_high,
      penaltyMedium: cfg.penalty_medium,
    },
  };
}
