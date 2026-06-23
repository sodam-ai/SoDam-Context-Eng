// SoDamContext — checkup-cli.mjs
// 한 파일을 검진해 '비밀키 안전 결과 + 규칙 확정 결과 + AI 의심 대기목록'을 JSON으로 낸다.
//
// ★T1 차단 설계: 이 CLI가 파일을 '직접' 읽고 판정한다. 비밀키 '값'은 절대 출력하지 않는다(scan-secrets 보장).
//   슬래시 명령·AI 는 이 JSON만 보고 리포트를 만든다. → 원본 파일(비밀키 포함 가능)을
//   AI 컨텍스트(세션기록 jsonl·AI 서버)로 끌어오지 않는다. 이것이 읽기 유출(T1)을 막는 핵심.
// 출력에는 파일 '내용'이 들어가지 않는다(줄 번호·개수·우리 상수 메시지만).
//
// 사용법: node checkup-cli.mjs <파일경로> [--target claude|codex]

import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadSecretPatterns, scanFile } from "./scan-secrets.mjs";
import { loadRules, runRuleChecks, listAiSuspectChecks } from "./checkup-rules.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const rulesDir = path.join(here, "..", "rules");

function guessTarget(filePath) {
  return path.basename(filePath).toLowerCase().includes("agents") ? "codex" : "claude";
}

export function checkupFile(filePath, target) {
  const exists = existsSync(filePath);
  const rules = loadRules(rulesDir);
  const result = {
    file: filePath,
    target: target || guessTarget(filePath),
    exists,
    secret: { found: false, count: 0, findings: [] },
    rules: { findings: [], lines: 0, bytes: 0 },
    aiSuspectQueue: listAiSuspectChecks(rules).map((c) => ({ id: c.id, name: c.name, why: c.why })),
    summary: { problemCount: 0 },
  };
  if (!exists) return result;

  // 1) 비밀키 안전검사 (값 미열람·마스킹만)
  const patterns = loadSecretPatterns(rulesDir);
  const sec = scanFile(filePath, patterns);
  result.secret = { found: sec.found, count: sec.count, findings: sec.findings };

  // 2) 규칙 확정 검진 — 파일 내용은 이 프로세스 안에서만 쓰고 '내용'은 출력하지 않는다.
  let text = "";
  try {
    text = readFileSync(filePath, "utf8");
  } catch {}
  result.rules = runRuleChecks(text, result.target, rules);

  result.summary.problemCount = result.secret.count + result.rules.findings.length;
  return result;
}

// CLI 직접 실행
const invokedDirect =
  typeof process.argv[1] === "string" && process.argv[1].endsWith("checkup-cli.mjs");
if (invokedDirect) {
  const file = process.argv[2];
  const ti = process.argv.indexOf("--target");
  const target = ti >= 0 ? process.argv[ti + 1] : undefined;
  if (!file) {
    console.log(JSON.stringify({ ok: false, error: "검진할 파일 경로를 지정해 주세요" }, null, 2));
  } else {
    const abs = path.resolve(process.cwd(), file);
    console.log(JSON.stringify({ ok: true, ...checkupFile(abs, target) }, null, 2));
  }
}
