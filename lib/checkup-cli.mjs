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
import { existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { loadSecretPatterns, scanFile } from "./scan-secrets.mjs";
import { loadRules, runRuleChecks, listAiSuspectChecks } from "./checkup-rules.mjs";
import { backupFile } from "./backup.mjs";
import { loadSafeKeywords, generateTreatPreview } from "./treat.mjs";
import { verifyTreatment } from "./treat-verify.mjs";

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
  (async () => {
    const file = process.argv[2];
    const ti = process.argv.indexOf("--target");
    const target = ti >= 0 ? process.argv[ti + 1] : undefined;
    const ai = process.argv.indexOf("--action");
    const action = ai >= 0 ? process.argv[ai + 1] : undefined;

    if (!file) {
      console.log(JSON.stringify({ ok: false, error: "검진할 파일 경로를 지정해 주세요" }, null, 2));
      return;
    }

    const abs = path.resolve(process.cwd(), file);

    if (action === "backup") {
      try {
        const result = await backupFile(abs);
        // T1 안전: 경로·결과만 출력, 파일 내용 미출력
        console.log(JSON.stringify({ ok: true, ...result }, null, 2));
      } catch (e) {
        console.log(JSON.stringify({ ok: false, error: e.message }, null, 2));
        process.exit(1);
      }

    } else if (action === "preview") {
      try {
        const content = readFileSync(abs, "utf8");
        const keywords = loadSafeKeywords(rulesDir);
        const preview = generateTreatPreview(content, keywords);
        // T1 안전: 줄 내용 미출력 (줄 수·개수만)
        console.log(JSON.stringify({
          ok: true,
          file: abs,
          originalLines: preview.originalLines,
          proposedLines: preview.proposedLines,
          removedCount: preview.removedCount,
          shrunk: preview.shrunk,
          safe: preview.safe,
        }, null, 2));
      } catch (e) {
        console.log(JSON.stringify({ ok: false, error: e.message }, null, 2));
        process.exit(1);
      }

    } else if (action === "apply") {
      try {
        const content = readFileSync(abs, "utf8");
        const keywords = loadSafeKeywords(rulesDir);
        const preview = generateTreatPreview(content, keywords);

        if (!preview.safe) {
          console.log(JSON.stringify({
            ok: false,
            error: "처방 결과 파일이 더 작아지지 않아요 — 처방이 필요 없거나 이미 최적화됐어요",
            shrunk: preview.shrunk,
          }, null, 2));
          process.exit(1);
        }

        // T8 회귀검증: 안전키워드 100% 보존
        const verify = verifyTreatment(content, preview.proposed, keywords);
        if (!verify.safe) {
          console.log(JSON.stringify({
            ok: false,
            error: "안전키워드 보존 검증 실패 — 처방을 중단해요",
            missingSafeCount: verify.missingSafeLines.length,
          }, null, 2));
          process.exit(1);
        }

        // 원자적 쓰기: tmp → rename (쓰기 중 종료 시 원본 보존)
        const tmp = path.join(tmpdir(), `sodam-treat-${Date.now()}.tmp`);
        writeFileSync(tmp, preview.proposed, "utf8");
        renameSync(tmp, abs);

        // T1 안전: 파일 내용 미출력 (경로·줄 수만)
        console.log(JSON.stringify({
          ok: true,
          appliedPath: abs,
          originalLines: preview.originalLines,
          proposedLines: preview.proposedLines,
          removedCount: preview.removedCount,
        }, null, 2));
      } catch (e) {
        console.log(JSON.stringify({ ok: false, error: e.message }, null, 2));
        process.exit(1);
      }

    } else if (action === "restore") {
      try {
        if (!target) {
          console.log(JSON.stringify({ ok: false, error: "--target <백업파일경로>를 지정해 주세요" }, null, 2));
          process.exit(1);
        }
        const backupAbs = path.resolve(process.cwd(), target);
        if (!existsSync(backupAbs)) {
          console.log(JSON.stringify({ ok: false, error: `백업 파일을 찾을 수 없어요: ${backupAbs}` }, null, 2));
          process.exit(1);
        }
        // 원자적 복구: backup → tmp → rename (T1 안전: 내용 미출력)
        const tmp = path.join(tmpdir(), `sodam-restore-${Date.now()}.tmp`);
        const backupContent = readFileSync(backupAbs, "utf8");
        writeFileSync(tmp, backupContent, "utf8");
        renameSync(tmp, abs);
        console.log(JSON.stringify({
          ok: true,
          restoredPath: abs,
          fromBackup: backupAbs,
        }, null, 2));
      } catch (e) {
        console.log(JSON.stringify({ ok: false, error: e.message }, null, 2));
        process.exit(1);
      }

    } else {
      // 기존 checkup 경로 — --action 없으면 100% 이전 동작 유지
      console.log(JSON.stringify({ ok: true, ...checkupFile(abs, target) }, null, 2));
    }
  })();
}
