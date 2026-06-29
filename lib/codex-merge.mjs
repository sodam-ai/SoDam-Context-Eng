// SoDamContext — codex-merge.mjs
// 코덱스(AGENTS.md)는 '단일 파일'이 아니라 '병합 체인'을 읽는다 → 검진도 체인 전체를 봐야 정확. (PRD 02:71, 08_DEEP B1·B2)
//  실제 주입 순서 = 글로벌(~/.codex/AGENTS{,.override}.md) → Git root에서 cwd까지 각 폴더의 AGENTS{,.override}.md,
//  nearest(cwd)가 뒤=가장 강함. 크기 예산 32KiB(바이트), 한글 1자=3바이트.
// ★T1: 출력/반환에 파일 '내용'을 절대 넣지 않는다(경로·바이트·개수·우리 메시지만) → 비밀키 유출 0.
// ★읽기 전용. 디렉터리 walk는 stopDir(git root)/maxDepth로 제한 → 폴더 밖으로 안 나간다.

import path from "node:path";
import os from "node:os";
import { existsSync, statSync, readFileSync } from "node:fs";

const FALLBACK_NAMES = ["AGENTS.md", "AGENTS.override.md"]; // 코덱스 기본 + override
const MAX_DEPTH = 40;
export const DEFAULT_LIMIT = 32768; // project_doc_max_bytes 기본 32KiB

function bytesOf(file) {
  try { return statSync(file).size; } catch { return 0; }
}

// startDir에서 stopDir(또는 루트)까지 '위로' 디렉터리 목록 (startDir 먼저 → 위로)
function dirsUpward(startDir, stopDir) {
  const out = [];
  let cur = path.resolve(startDir);
  const stop = stopDir ? path.resolve(stopDir) : null;
  for (let i = 0; i < MAX_DEPTH; i++) {
    out.push(cur);
    if (stop && stop === cur) break;
    const parent = path.dirname(cur);
    if (parent === cur) break; // 파일시스템 루트 도달
    cur = parent;
  }
  return out;
}

// B4(PRD 08): config.toml의 model_instructions_file 키 감지 — 읽기 전용.
// ★T1: 파일 내용 전체 및 키 값(지정된 파일 경로)은 반환하지 않는다. 감지 여부·디렉터리·키명만.
function detectConfigToml(dirs) {
  for (const d of dirs) {
    const toml = path.join(d, "config.toml");
    if (!existsSync(toml)) continue;
    try {
      const content = readFileSync(toml, "utf8");
      if (content.includes("model_instructions_file")) {
        return { found: true, dir: d, key: "model_instructions_file" };
      }
    } catch { /* 읽기 실패 → 건너뜀 */ }
  }
  return null;
}

// 코덱스 병합 체인에서 '존재하는' AGENTS 파일을 주입 순서대로 수집한다.
// opts: { homeDir, gitRoot } — 둘 다 선택(없으면 글로벌/정지점 생략).
// 반환: { files:[{path,bytes,scope}], totalBytes, count }  ← 내용 필드 없음(T1)
export function collectCodexChain(startDir, opts) {
  const o = opts || {};
  const home = o.homeDir === undefined ? os.homedir() : o.homeDir;
  const startAbs = path.resolve(startDir);
  const files = [];

  // 1) 글로벌(~/.codex) — 가장 먼저(가장 약함)
  if (home) {
    for (const n of FALLBACK_NAMES) {
      const f = path.join(home, ".codex", n);
      if (existsSync(f)) files.push({ path: f, bytes: bytesOf(f), scope: "global" });
    }
  }
  // 2) Git root → cwd (root 먼저, cwd 마지막=가장 강함)
  const dirs = dirsUpward(startAbs, o.gitRoot).reverse();
  for (const d of dirs) {
    for (const n of FALLBACK_NAMES) {
      const f = path.join(d, n);
      if (existsSync(f)) files.push({ path: f, bytes: bytesOf(f), scope: d === startAbs ? "cwd" : "ancestor" });
    }
  }

  const totalBytes = files.reduce((s, x) => s + x.bytes, 0);
  const configOverride = detectConfigToml(dirs); // B4: config.toml 감지
  return { files, totalBytes, count: files.length, configOverride };
}

// 합산 바이트가 예산을 넘는지 판정. 반환: { overLimit, nearLimit, totalBytes, limit, warn }
export function checkCodexBudget(totalBytes, limit, warn) {
  const lim = limit || DEFAULT_LIMIT;
  const w = warn || Math.round(lim * 0.8);
  return { overLimit: totalBytes > lim, nearLimit: totalBytes > w && totalBytes <= lim, totalBytes, limit: lim, warn: w };
}

// CLI: node codex-merge.mjs <시작폴더> [--gitroot <경로>] [--limit <바이트>]
//   (검진 스킬이 git root를 구해 --gitroot로 넘기면 더 정확. 없으면 루트까지 훑음.)
const invokedDirect =
  typeof process.argv[1] === "string" && process.argv[1].endsWith("codex-merge.mjs");
if (invokedDirect) {
  const start = process.argv[2] || process.cwd();
  const gi = process.argv.indexOf("--gitroot");
  const gitRoot = gi >= 0 ? process.argv[gi + 1] : undefined;
  const li = process.argv.indexOf("--limit");
  const limit = li >= 0 ? Number(process.argv[li + 1]) : DEFAULT_LIMIT;
  const chain = collectCodexChain(path.resolve(process.cwd(), start), { gitRoot });
  const budget = checkCodexBudget(chain.totalBytes, limit);
  console.log(JSON.stringify({ ok: true, ...chain, ...budget }, null, 2));
}
