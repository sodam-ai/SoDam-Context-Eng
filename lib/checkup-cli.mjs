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
import { existsSync, readFileSync, writeFileSync, renameSync, statSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadSecretPatterns, scanFile, maskSecretsInLines } from "./scan-secrets.mjs";
import { loadRules, runRuleChecks, runHintSuspectChecks, listHintlessAiChecks } from "./checkup-rules.mjs";
import { backupFile } from "./backup.mjs";
import { loadSafeKeywords, generateTreatPreview } from "./treat.mjs";
import { verifyTreatment } from "./treat-verify.mjs";
import { isSensitiveWritePath } from "./path-safety.mjs";
import { checkSync } from "./sync-check.mjs";
import { restoreBackup } from "./backup.mjs";
import { getFreshness, recordCheckup } from "./checkup-freshness.mjs";
import { computeHealthScore } from "./health-score.mjs";
import { recordHistory } from "./checkup-history.mjs";
import { isTargetFile } from "./prevent-write.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const rulesDir = path.join(here, "..", "rules");

function guessTarget(filePath) {
  return path.basename(filePath).toLowerCase().includes("agents") ? "codex" : "claude";
}

// ★수정(회귀 발견): existsSync는 디렉터리에도 true를 반환한다. 이후 readFileSync가 EISDIR로
// 실패하면 조용히 catch돼 text=""로 남아, 디렉터리를 "문제 0건(정상)"으로 오보고했다.
// 파일인지까지 확인해 디렉터리는 "파일없음"과 동일하게(문진 안내 경로로) 처리한다.
function isReadableFile(filePath) {
  try {
    return existsSync(filePath) && statSync(filePath).isFile();
  } catch {
    return false;
  }
}

export function checkupFile(filePath, target) {
  const exists = isReadableFile(filePath);
  const rules = loadRules(rulesDir);
  const result = {
    file: filePath,
    target: target || guessTarget(filePath),
    exists,
    secret: { found: false, count: 0, findings: [] },
    rules: { findings: [], lines: 0, bytes: 0 },
    suspects: { findings: [] },
    aiSuspectQueue: listHintlessAiChecks(rules).map((c) => ({ id: c.id, name: c.name, why: c.why })),
    freshness: { previousCheckupAt: null, daysSinceLastCheckup: null, stale: false },
    healthScore: { score: null, label: "참고용(검증 전)", breakdown: null },
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

  // hint_keyword 기반 '의심' 탐지(결정론·T1 안전) — 낡음·자동생성미정제·스킬누수
  result.suspects = { findings: runHintSuspectChecks(text, rules) };

  // 3) 정기 점검 알림(Phase 3, 좁은 범위) — 능동 알림 없이 이번 검진 시점에만 비교.
  // 이번 실행 기록(recordCheckup)은 반드시 비교(getFreshness) '다음'에 해야
  // 이번 검진이 스스로를 "0일 전"으로 덮어써 버리지 않는다.
  // ★수정(2026-09-01 실측 발견): CLAUDE.md/AGENTS.md가 아닌 파일(예: 소스 코드)을 실수로
  // 검진 대상으로 넘겨도 freshness·history가 그대로 기록돼, Phase 3 건강점수 정식화용
  // 실사용 데이터가 오염되는 결함이 있었다(실제로 로컬에 오염 데이터 3건 발견). 대상 파일이
  // 아니면 두 기록 모두 건너뛴다 — 핵심 검진(비밀키·규칙) 로직 자체는 그대로 동작.
  const absFilePath = path.resolve(filePath);
  const staleDays = rules.thresholds?.freshness?.stale_days ?? 30;
  const isRecordable = isTargetFile(filePath);
  result.freshness = isRecordable
    ? getFreshness(absFilePath, staleDays)
    : { previousCheckupAt: null, daysSinceLastCheckup: null, stale: false };
  if (isRecordable) recordCheckup(absFilePath);

  result.summary.problemCount =
    result.secret.count + result.rules.findings.length + result.suspects.findings.length;

  // 4) 건강점수(참고용, Phase 3) — 이미 계산된 findings만 집계, 새 파일 열람 없음(T1 무관).
  result.healthScore = computeHealthScore(result, rules.thresholds);

  // 5) 산식 정식화용 실사용 이력 축적(로컬 전용, 부가기능) — 점수·카테고리 id·개수만
  // 기록한다(파일 내용·비밀키 값 없음, T1 무관). 05_AUDIT_AND_DECISIONS.md E1 게이트를
  // 베타 테스터 없이도 시간이 지나며 채울 수 있게 하기 위함.
  // ★대상 파일(CLAUDE.md/AGENTS.md)이 아니면 기록하지 않음 — 위 freshness와 동일한 이유.
  if (isRecordable) {
    recordHistory(absFilePath, {
      score: result.healthScore.score,
      highCount: result.healthScore.breakdown.highCount,
      mediumCount: result.healthScore.breakdown.mediumCount,
      problemCount: result.summary.problemCount,
      // 비밀키 발견은 findings에 카테고리 id가 없으므로(값 자체를 안 담는 별도 구조) 고정 상수
      // "secret"으로 표시한다 — 값 노출 없이도(T1 무관) highCount/mediumCount와 findingIds 길이가
      // problemCount와 항상 일치하게 맞춰, 나중에 "왜 감점됐는지" 분석 시 원인 없는 감점이 안 생긴다.
      findingIds: [
        ...result.secret.findings.map(() => "secret"),
        ...result.rules.findings.map((f) => f.id),
        ...result.suspects.findings.map((f) => f.id),
      ],
    });
  }

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
      process.exit(1);
    }

    const abs = path.resolve(process.cwd(), file);

    if (action === "backup") {
      try {
        // ★수정(QA로 발견): backupFile()은 대상 경로가 민감한지 검사하지 않고 그대로 읽어서
        // 복사한다 — apply는 이미 이 검사를 하는데 backup에는 빠져 있었다. ~/.ssh/id_rsa 같은
        // 자격증명 파일을 backup 대상으로 지정하면 그 내용이 그대로 .sodamcontext/backups/에
        // 평문 복사되는 위험이 있었다(07_SECURITY §2.2 Must "백업 대상 경로... 민감 위치 거부").
        const pathCheck = isSensitiveWritePath(abs);
        if (pathCheck.sensitive) {
          console.log(JSON.stringify({ ok: false, error: `안전을 위해 이 위치는 백업할 수 없어요 — ${pathCheck.reason}` }, null, 2));
          process.exit(1);
        }
        const result = await backupFile(abs);
        // T1 안전: 경로·결과만 출력, 파일 내용 미출력
        // ★수정(07_SECURITY 대조 감사로 발견): Harness로 백업하면(method:"harness") 이 도구의
        // --action restore는 안전상 그 백업을 되돌릴 수 없다(위 restoreBackup 주석 참고) —
        // 조용히 "백업은 됐는데 복구가 안 되는" 상황을 막기 위해 미리 알려준다.
        console.log(JSON.stringify({
          ok: true,
          ...result,
          ...(result.method === "harness"
            ? { note: "Harness로 백업했어요 — 되돌릴 땐 이 도구의 restore 대신 Harness 자체 명령을 사용하세요" }
            : {}),
        }, null, 2));
      } catch (e) {
        console.log(JSON.stringify({ ok: false, error: e.message }, null, 2));
        process.exit(1);
      }

    } else if (action === "preview") {
      try {
        // ★수정(2026-08-20, 실사용 검증 라운드로 발견): backup/restore/deep-scan은 전부 파일
        // 존재를 먼저 확인해 친절한 한국어 메시지로 응답하는데, preview만 이 검사가 빠져 있어
        // 없는 파일을 넘기면 readFileSync의 원본 Node 에러("ENOENT: no such file or directory,
        // open '...'")가 그대로 노출됐다(실제 CLI 실행으로 재현). deep-scan과 동일하게 맞춘다.
        if (!isReadableFile(abs)) {
          console.log(JSON.stringify({ ok: false, error: "처방할 파일을 찾을 수 없어요" }, null, 2));
          process.exit(1);
        }
        const content = readFileSync(abs, "utf8");
        const keywords = loadSafeKeywords(rulesDir);
        const patterns = loadSecretPatterns(rulesDir);
        const preview = generateTreatPreview(content, keywords, patterns);
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
        const pathCheck = isSensitiveWritePath(abs);
        if (pathCheck.sensitive) {
          console.log(JSON.stringify({ ok: false, error: `안전을 위해 이 위치엔 쓰지 않아요 — ${pathCheck.reason}` }, null, 2));
          process.exit(1);
        }
        // ★수정(2026-08-20, 실사용 검증 라운드로 발견): preview와 같은 이유로 apply도 파일 존재
        // 확인이 빠져 있어 없는 파일을 넘기면 원본 Node 에러가 그대로 노출됐다(실제 재현).
        if (!isReadableFile(abs)) {
          console.log(JSON.stringify({ ok: false, error: "처방할 파일을 찾을 수 없어요" }, null, 2));
          process.exit(1);
        }
        const content = readFileSync(abs, "utf8");
        const keywords = loadSafeKeywords(rulesDir);
        const patterns = loadSecretPatterns(rulesDir);
        const preview = generateTreatPreview(content, keywords, patterns);

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

        // ★수정(QA로 발견): apply는 commands/treat.md의 "백업 먼저" 지시(프롬프트)에만 기대고
        // 있었고, 코드 자체는 backupFile()을 호출하지 않았다 — 02_DATA_MODEL.md의 "처방은
        // 반드시 백업 후에만 적용"이라는 불변 규칙이 CLI 레벨에서 강제되지 않아, --action apply를
        // 직접(백업 단계 없이) 호출하면 원본이 백업 없이 그대로 덮어써졌다. 08_DEEP_RESEARCH_
        // FINDINGS.md A3가 "프롬프트 지시는 준수를 보장하지 않는다, 항상 강제할 건 코드로"라고
        // 명시한 원칙 그대로, 백업을 apply 코드 안으로 옮겨 fail-closed로 강제한다.
        const backupResult = await backupFile(abs);

        // 원자적 쓰기: tmp → rename (쓰기 중 종료 시 원본 보존)
        // ★수정(회귀 발견): tmp를 os.tmpdir()(항상 C드라이브)에 만들면, 대상 파일이 다른
        // 드라이브(예: D:)에 있을 때 rename이 "EXDEV: cross-device link not permitted"로
        // 실패했다(실사용자 라이브 테스트로 재현). tmp를 대상과 '같은 폴더'에 만들어
        // 항상 같은 드라이브 안에서 rename이 일어나게 고쳤다(backup.mjs의 기존 패턴과 동일).
        const tmp = abs + ".apply.tmp";
        writeFileSync(tmp, preview.proposed, "utf8");
        // ★수정(QA로 발견): rename이 실패하면(예: 대상 파일 읽기전용·다른 프로그램이 잠금)
        // tmp 파일이 프로젝트 폴더에 고아로 남았다 — 원본은 안 깨지지만 낯선 파일이 남아
        // 초보자를 혼란스럽게 할 수 있었다. rename 실패 시 tmp를 정리하고 원래 에러를 그대로 전달.
        try {
          renameSync(tmp, abs);
        } catch (renameErr) {
          try { unlinkSync(tmp); } catch {}
          throw renameErr;
        }

        // T1 안전: 파일 내용 미출력 (경로·줄 수만)
        console.log(JSON.stringify({
          ok: true,
          appliedPath: abs,
          backupPath: backupResult.backupPath,
          originalLines: preview.originalLines,
          proposedLines: preview.proposedLines,
          removedCount: preview.removedCount,
          ...(backupResult.method === "harness"
            ? { note: "Harness로 백업했어요 — 되돌릴 땐 이 도구의 restore 대신 Harness 자체 명령을 사용하세요" }
            : {}),
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
        const pathCheck = isSensitiveWritePath(abs);
        if (pathCheck.sensitive) {
          console.log(JSON.stringify({ ok: false, error: `안전을 위해 이 위치엔 쓰지 않아요 — ${pathCheck.reason}` }, null, 2));
          process.exit(1);
        }
        const backupAbs = path.resolve(process.cwd(), target);
        if (!existsSync(backupAbs)) {
          console.log(JSON.stringify({ ok: false, error: `백업 파일을 찾을 수 없어요: ${backupAbs}` }, null, 2));
          process.exit(1);
        }
        // 원자적 복구: backup.mjs의 restoreBackup() 재사용(T1 안전: 내용 미출력).
        // ★수정(회귀 발견): 예전엔 여기서 tmp를 os.tmpdir()(C드라이브)에 직접 만들어
        // rename하다가 대상이 다른 드라이브면 "EXDEV" 오류로 실패했다(실사용자 라이브 테스트로
        // 재현). backup.mjs는 이미 tmp를 대상과 같은 폴더에 만드는 올바른 패턴으로 구현돼
        // 있었으므로, 따로 재구현하지 않고 그 함수를 그대로 재사용하도록 고쳤다.
        restoreBackup(backupAbs, abs);
        console.log(JSON.stringify({
          ok: true,
          restoredPath: abs,
          fromBackup: backupAbs,
        }, null, 2));
      } catch (e) {
        console.log(JSON.stringify({ ok: false, error: e.message }, null, 2));
        process.exit(1);
      }

    } else if (action === "sync-check") {
      // 동기화 준비 리포트 — 파일을 합치거나 쓰지 않는다(읽기 전용). 첫 인자=CLAUDE.md, --target=AGENTS.md
      try {
        if (!target) {
          console.log(JSON.stringify({ ok: false, error: "--target에 비교할 AGENTS.md 경로를 지정해 주세요" }, null, 2));
          process.exit(1);
        }
        const otherAbs = path.resolve(process.cwd(), target);
        if (!isReadableFile(abs) || !isReadableFile(otherAbs)) {
          console.log(JSON.stringify({
            ok: true,
            applicable: false,
            reason: "CLAUDE.md와 AGENTS.md가 둘 다 있어야 동기화 점검을 할 수 있어요",
          }, null, 2));
        } else {
          const claudeContent = readFileSync(abs, "utf8");
          const agentsContent = readFileSync(otherAbs, "utf8");
          const result = checkSync(claudeContent, agentsContent, rulesDir);
          // T1/전 파일 공통 원칙: 파일 내용 미출력(줄 번호·개수만)
          console.log(JSON.stringify({ ok: true, applicable: true, ...result }, null, 2));
        }
      } catch (e) {
        console.log(JSON.stringify({ ok: false, error: e.message }, null, 2));
        process.exit(1);
      }

    } else if (action === "deep-scan") {
      // Phase 3 "모순/낡음 AI 판단 강화" 전용 — 명시 동의 후에만 호출되는 별도 경로.
      // 기본 checkup 경로(위)는 이 분기와 무관하게 100% 그대로 유지된다.
      try {
        // ★수정(이번 테스트 라운드로 발견): backup/apply/restore는 모두 isSensitiveWritePath를
        // 파일 존재 확인보다 '먼저' 실행하는데(테스트 [21] 참고), deep-scan만 이 검사가 아예
        // 빠져 있었다 — deep-scan은 default checkup과 달리 파일 내용을 (마스킹 후) 그대로
        // AI에게 넘기므로 같은 검사를 같은 순서로 반드시 거쳐야 한다(신규 로직 아님, 기존 세
        // 액션과 동일하게 맞춤 — 순서까지 맞춰야 존재하지 않는 자격증명 폴더 경로도 "파일없음"이
        // 아니라 "보호 대상"으로 일관되게 응답한다).
        const pathCheck = isSensitiveWritePath(abs);
        if (pathCheck.sensitive) {
          console.log(JSON.stringify({ ok: false, error: `안전을 위해 이 위치는 깊은 검진 대상이 될 수 없어요 — ${pathCheck.reason}` }, null, 2));
          process.exit(1);
        }
        if (!isReadableFile(abs)) {
          console.log(JSON.stringify({ ok: false, error: "검진할 파일을 찾을 수 없어요" }, null, 2));
          process.exit(1);
        }
        const rules = loadRules(rulesDir);
        const patterns = loadSecretPatterns(rulesDir);
        const text = readFileSync(abs, "utf8");
        // ★T1: 반환 전 비밀키로 보이는 줄을 전부 가린다 — 원문 그대로는 절대 나가지 않는다.
        const { maskedText, maskedLineCount } = maskSecretsInLines(text, patterns);
        const hintlessChecks = listHintlessAiChecks(rules).map((c) => ({ id: c.id, name: c.name, why: c.why }));
        console.log(JSON.stringify({ ok: true, maskedText, maskedLineCount, hintlessChecks }, null, 2));
      } catch (e) {
        console.log(JSON.stringify({ ok: false, error: e.message }, null, 2));
        process.exit(1);
      }

    } else if (ai >= 0) {
      // ★수정(QA로 발견): --action이 주어졌는데 위 5개 값 중 어디에도 안 맞으면(오타 등)
      // 조용히 기본 검진으로 폴백하고 있었다 — 백업 등을 요청한 줄 알았는데 실제로는
      // 아무 처방도 안 일어난 채 검진 리포트만 나오는 위험한 착각을 만들 수 있었다.
      // --action 자체를 안 준 경우(기존 검진 경로)와 명확히 구분해 에러로 처리한다.
      console.log(JSON.stringify({ ok: false, error: `알 수 없는 action 값이에요: "${action}"` }, null, 2));
      process.exit(1);
    } else {
      // 기존 checkup 경로 — --action 없으면 100% 이전 동작 유지
      console.log(JSON.stringify({ ok: true, ...checkupFile(abs, target) }, null, 2));
    }
  })();
}
