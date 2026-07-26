// SoDamContext — intake-verify.mjs
// 문진(intake)이 '생성한 설명서 내용'을 파일로 쓰기 '전에' 안전한지 결정론으로 검증한다.
// (무거운/안전 검증은 SKILL의 AI 판단이 아니라 번들 스크립트로 — PRD 04_PROJECT_SPEC:132, 07 §2.3)
// ★재사용만: scan-secrets(비밀키)·checkup-rules(줄수/바이트). 새 탐지 로직 0건.
// ★생성물 불변: 비밀키 0건 + 작게(claude=줄수 권장 이하 / codex=바이트 한도 이하). 위반 시 safe:false → 쓰기 금지.

import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadSecretPatterns, scanText } from "./scan-secrets.mjs";
import { loadRules, countLines, byteLength } from "./checkup-rules.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const rulesDir = path.join(here, "..", "rules");

// 생성 텍스트를 검증. target: "claude"(줄수) | "codex"(바이트)
// 반환: { safe, secretCount, lines, bytes, sizeOk, issues:[] }  ← 원문/비밀값 필드 없음(T1)
export function verifyIntake(text, target, opts) {
  const o = opts || {};
  const patterns = o.patterns || loadSecretPatterns(rulesDir);
  const rules = o.rules || loadRules(rulesDir);
  const issues = [];

  // 1) 비밀키 0건 (있으면 생성 중단 — 사용자가 답에 키를 적었을 수 있음)
  const secrets = scanText(String(text == null ? "" : text), patterns);
  if (secrets.length > 0) {
    issues.push(`비밀키로 보이는 게 ${secrets.length}건 있어요 — 설명서엔 키를 넣지 마세요`);
  }

  // 2) 작게 (목적: 작은 설명서 — 01:94 "200줄 이하". 파일 종류별 단위 — 02:43/B3)
  const lines = countLines(text);
  const bytes = byteLength(text);
  let sizeOk = true;
  if (target === "codex") {
    const limit = rules.thresholds.agentsMd.bytes_limit;
    if (bytes > limit) { sizeOk = false; issues.push(`${bytes}바이트로 한도(${limit})를 넘었어요 — 더 짧게`); }
  } else {
    const warn = rules.thresholds.claudeMd.lines_warn;
    if (lines > warn) { sizeOk = false; issues.push(`${lines}줄로 권장(${warn}줄)을 넘었어요 — 더 짧게`); }
  }

  return { safe: secrets.length === 0 && sizeOk, secretCount: secrets.length, lines, bytes, sizeOk, issues };
}

// CLI 직접 실행: node intake-verify.mjs <막 만든 파일> [--target claude|codex]
// 문진 스킬이 '쓰기 전' 임시 파일을 검증할 때 사용. (값은 출력 안 함 — T1)
const invokedDirect =
  typeof process.argv[1] === "string" && process.argv[1].endsWith("intake-verify.mjs");
if (invokedDirect) {
  const file = process.argv[2];
  const ti = process.argv.indexOf("--target");
  const target =
    ti >= 0 ? process.argv[ti + 1] : String(file || "").toLowerCase().includes("agents") ? "codex" : "claude";
  if (!file) {
    console.log(JSON.stringify({ ok: false, error: "검증할 파일 경로를 지정해 주세요" }, null, 2));
    process.exit(1);
  } else {
    let text = "";
    let read = true;
    try {
      text = readFileSync(path.resolve(process.cwd(), file), "utf8");
    } catch {
      read = false;
    }
    if (!read) {
      console.log(JSON.stringify({ ok: false, error: "파일을 읽을 수 없어요" }, null, 2));
      process.exit(1);
    } else {
      console.log(JSON.stringify({ ok: true, target, ...verifyIntake(text, target) }, null, 2));
    }
  }
}
