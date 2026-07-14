// SoDamContext — health-score.test.mjs
// computeHealthScore()가 완전히 투명하게(입력 findings 개수·심각도만으로) 계산되는지,
// 항상 "참고용(검증 전)" 라벨을 붙이는지, 범위(0~start)를 벗어나지 않는지 검증한다.
// 실행: node lib/health-score.test.mjs

import assert from "node:assert/strict";
import { computeHealthScore } from "./health-score.mjs";

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}

const cfg = { thresholds: { healthScore: { start: 100, penalty_high: 15, penalty_medium: 5, min: 0 } } };

console.log("\nSoDamContext health-score 유닛테스트\n");

test("[1] 문제 0건 → 만점(start), 라벨은 항상 '참고용(검증 전)'", () => {
  const result = { secret: { findings: [] }, rules: { findings: [] }, suspects: { findings: [] } };
  const r = computeHealthScore(result, cfg.thresholds);
  assert.equal(r.score, 100);
  assert.equal(r.label, "참고용(검증 전)");
  assert.equal(r.breakdown.highCount, 0);
  assert.equal(r.breakdown.mediumCount, 0);
});

test("[2] '높음' 1건 → penalty_high(15)만큼 감점", () => {
  const result = {
    secret: { findings: [{ severity: "높음" }] },
    rules: { findings: [] },
    suspects: { findings: [] },
  };
  const r = computeHealthScore(result, cfg.thresholds);
  assert.equal(r.score, 85);
  assert.equal(r.breakdown.highCount, 1);
});

test("[3] '보통' 2건 → penalty_medium(5)×2만큼 감점", () => {
  const result = {
    secret: { findings: [] },
    rules: { findings: [{ severity: "보통" }, { severity: "보통" }] },
    suspects: { findings: [] },
  };
  const r = computeHealthScore(result, cfg.thresholds);
  assert.equal(r.score, 90);
  assert.equal(r.breakdown.mediumCount, 2);
});

test("[4] secret·rules·suspects 세 출처 findings를 모두 합산", () => {
  const result = {
    secret: { findings: [{ severity: "높음" }] },
    rules: { findings: [{ severity: "보통" }] },
    suspects: { findings: [{ severity: "보통" }, { severity: "보통" }] },
  };
  const r = computeHealthScore(result, cfg.thresholds);
  // 높음 1건(-15) + 보통 3건(-5×3=-15) = 100-30=70
  assert.equal(r.score, 70);
  assert.equal(r.breakdown.highCount, 1);
  assert.equal(r.breakdown.mediumCount, 3);
});

test("[5] ★많은 문제로 계산상 음수가 되어도 min(0) 아래로 안 내려감", () => {
  const findings = Array.from({ length: 20 }, () => ({ severity: "높음" }));
  const result = { secret: { findings }, rules: { findings: [] }, suspects: { findings: [] } };
  const r = computeHealthScore(result, cfg.thresholds);
  assert.equal(r.score, 0, "0 미만으로 내려가면 안 됨(음수 점수 금지)");
});

test("[6] ★thresholds.healthScore가 없어도 예외 없이 기본값으로 동작", () => {
  const result = { secret: { findings: [{ severity: "높음" }] }, rules: { findings: [] }, suspects: { findings: [] } };
  assert.doesNotThrow(() => computeHealthScore(result, {}));
  assert.doesNotThrow(() => computeHealthScore(result, undefined));
  const r = computeHealthScore(result, undefined);
  assert.equal(r.score, 85, "기본 penalty_high=15가 적용돼야 함");
});

test("[7] ★findings 필드 자체가 없어도(빈 result) 예외 없이 만점", () => {
  assert.doesNotThrow(() => computeHealthScore({}, cfg.thresholds));
  const r = computeHealthScore({}, cfg.thresholds);
  assert.equal(r.score, 100);
});

test("[8] breakdown이 실제 계산 근거를 그대로 노출(투명성 — 블랙박스 아님)", () => {
  const result = { secret: { findings: [{ severity: "높음" }] }, rules: { findings: [{ severity: "보통" }] }, suspects: { findings: [] } };
  const r = computeHealthScore(result, cfg.thresholds);
  assert.deepEqual(r.breakdown, {
    highCount: 1,
    mediumCount: 1,
    start: 100,
    penaltyHigh: 15,
    penaltyMedium: 5,
  });
});

console.log(`\n결과: ${passed} 통과 / ${failed} 실패 / 총 ${passed + failed}\n`);
if (failed > 0) process.exit(1);
