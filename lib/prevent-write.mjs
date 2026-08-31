// SoDamContext — prevent-write.mjs
// Phase 2 예방 hook: CLAUDE.md/AGENTS.md에 실제로 쓰기 전, 비밀키·과도한 크기를 미리 막는다.
// PreToolUse(Write|Edit) 훅으로 등록된다(hooks/hooks.json). 새 판정 로직은 만들지 않는다 —
// 검진과 동일한 lib(scan-secrets·checkup-rules)를 그대로 재사용한다(PRD 09_EXTENSIBILITY §1).
// ★T1: 비밀키 값은 여기서도 절대 반환·출력하지 않는다(scanText가 이미 boolean 판정만 함).
// ★이 훅은 보조 안전장치다. 핵심 방어(검진·백업·원자적쓰기)는 checkup-cli.mjs가 이미 담당하므로,
//   이 훅 내부에서 예외가 나면 항상 '통과'(fail-open) — 오작동으로 사용자가 자기 파일을
//   영영 못 고치게 막는 것이 이 훅을 안 만든 것보다 더 나쁘다.

import path from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadSecretPatterns, scanText } from "./scan-secrets.mjs";
import { loadRules, countLines, byteLength } from "./checkup-rules.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultRulesDir = path.join(here, "..", "rules");

// 대상 파일인지(파일명만 확인 — 무관한 파일은 절대 건드리지 않는다).
export function isTargetFile(filePath) {
  const base = path.basename(String(filePath || "")).toLowerCase();
  return base === "claude.md" || base === "agents.md";
}

function guessTarget(filePath) {
  return path.basename(String(filePath || "")).toLowerCase().includes("agents") ? "codex" : "claude";
}

// Write/Edit 도구 입력으로 "쓰기 후 예상 내용"을 예측한다. 예측 불가하면 null(그 경우 항상 허용).
export function predictContent(toolInput) {
  const input = toolInput || {};
  if (typeof input.content === "string") return input.content; // Write 도구
  if (typeof input.old_string === "string" && typeof input.new_string === "string") {
    // Edit 도구: 현재 파일을 읽어 old_string→new_string 치환을 시뮬레이션
    if (!input.file_path || !existsSync(input.file_path)) return null;
    let current;
    try {
      current = readFileSync(input.file_path, "utf8");
    } catch {
      return null;
    }
    if (input.replace_all) return current.split(input.old_string).join(input.new_string);
    const idx = current.indexOf(input.old_string);
    if (idx === -1) return null; // 실제 Edit도 실패할 상황 — 우리가 막을 이유 없음
    return current.slice(0, idx) + input.new_string + current.slice(idx + input.old_string.length);
  }
  return null; // 알 수 없는 도구 입력 형태 — 안전하게 통과
}

// 핵심 판정(순수 함수 — 테스트 가능). 반환: { decision: "allow"|"ask"|"deny", reason }
export function evaluateWrite(toolInput, rulesDir) {
  const dir = rulesDir || defaultRulesDir;
  const filePath = toolInput && toolInput.file_path;
  if (!filePath || !isTargetFile(filePath)) return { decision: "allow", reason: "" };

  const content = predictContent(toolInput);
  if (content === null) return { decision: "allow", reason: "" };

  // 1) 비밀키 사전 차단 — '확정' 등급만(의심 등급은 검진 리포트에서 안내, 여기선 안 막음)
  const patterns = loadSecretPatterns(dir);
  const confirmed = scanText(content, patterns).filter((f) => f.tier === "confirmed");
  if (confirmed.length > 0) {
    return {
      decision: "deny",
      reason:
        `이 내용엔 비밀키로 보이는 값이 있어요(${confirmed.length}건, 예: ${confirmed[0].masked}). ` +
        `비밀키는 설명서에 직접 쓰지 말고 환경변수로 관리해 주세요. 수정 후 다시 시도해 주세요.`,
    };
  }

  // 2) 크기 사전 경고/차단 — 검진과 동일한 thresholds.json 기준(하드코딩 없음)
  const { thresholds } = loadRules(dir);
  const target = guessTarget(filePath);
  if (target === "claude") {
    const lines = countLines(content);
    if (lines >= thresholds.claudeMd.lines_high) {
      return {
        decision: "deny",
        reason: `설명서가 ${lines}줄이 돼요(상한 ${thresholds.claudeMd.lines_high}줄). 너무 길면 AI가 오히려 헷갈려요. 내용을 줄여 주세요. (\`/sodam-context:treat\` 명령을 쓰면 백업 후 안전하게 줄여드려요.)`,
      };
    }
    if (lines >= thresholds.claudeMd.lines_warn) {
      return {
        decision: "ask",
        reason: `설명서가 ${lines}줄이 돼요(권장 ${thresholds.claudeMd.lines_warn}줄). 그래도 이대로 저장할까요?`,
      };
    }
  } else {
    const bytes = byteLength(content);
    if (bytes >= thresholds.agentsMd.bytes_limit) {
      return {
        decision: "deny",
        reason: `코덱스 설명서가 ${bytes}바이트가 돼요(한도 ${thresholds.agentsMd.bytes_limit}바이트). 한글은 글자당 3바이트라 금방 찰 수 있어요. 내용을 줄여 주세요. (\`/sodam-context:treat\` 명령을 쓰면 백업 후 안전하게 줄여드려요.)`,
      };
    }
    if (bytes >= thresholds.agentsMd.bytes_warn) {
      return {
        decision: "ask",
        reason: `코덱스 설명서가 ${bytes}바이트가 돼요(한도 ${thresholds.agentsMd.bytes_limit}에 근접). 그래도 이대로 저장할까요?`,
      };
    }
  }

  return { decision: "allow", reason: "" };
}

// CLI(훅) 직접 실행 — stdin으로 PreToolUse 이벤트 JSON을 받아 stdout으로 판정을 낸다.
const invokedDirect =
  typeof process.argv[1] === "string" && process.argv[1].endsWith("prevent-write.mjs");
if (invokedDirect) {
  let raw = "";
  process.stdin.on("data", (chunk) => (raw += chunk));
  process.stdin.on("end", () => {
    let result;
    try {
      const input = JSON.parse(raw || "{}");
      result = evaluateWrite(input.tool_input || {});
    } catch {
      result = { decision: "allow", reason: "" }; // 훅 내부 오류는 항상 fail-open
    }
    if (result.decision === "allow") {
      process.stdout.write(JSON.stringify({}));
    } else {
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: result.decision, // "deny" | "ask"
            permissionDecisionReason: result.reason,
          },
        })
      );
    }
    process.exit(0);
  });
}
