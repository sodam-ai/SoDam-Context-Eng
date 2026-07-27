// SoDamContext — backup.mjs
// 처방(Treat) 전 파일 백업 라이브러리. (PRD 02, 04, 07 T3/T8)
// ★ fail-closed: 백업 실패 시 반드시 throw — 처방 진행 금지
// ★ 원자적 쓰기: 임시파일 → rename (쓰기 중 종료 시 원본 보존)
// ★ T3 방어: .gitignore 자동 추가 (백업 폴더가 커밋되면 비밀키 유출)
// ★ Harness 감지: sodamharness 있으면 위임, 없으면 자체 폴백

import path from "node:path";
import os from "node:os";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  renameSync,
  appendFileSync,
  realpathSync,
  unlinkSync,
} from "node:fs";
import { spawnSync } from "node:child_process";

const BACKUP_SUBDIR = ".sodamcontext/backups";
const GITIGNORE_ENTRY = ".sodamcontext/backups/\n";

// git root 탐색 (filePath 기준 위로 .git 찾기)
// export: checkup-freshness.mjs가 동일한 ".sodamcontext/ 위치 규칙"을 재사용하기 위함
// (09_EXTENSIBILITY §1 — 같은 판정 로직 중복 구현 금지)
export function findGitRoot(startDir) {
  let cur = path.resolve(startDir);
  for (let i = 0; i < 40; i++) {
    if (existsSync(path.join(cur, ".git"))) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) return null;
    cur = parent;
  }
  return null;
}

// .gitignore에 백업 폴더 등록 (T3 방어)
function ensureGitignore(projectRoot) {
  const gi = path.join(projectRoot, ".gitignore");
  if (existsSync(gi)) {
    const content = readFileSync(gi, "utf8");
    if (content.includes(".sodamcontext/backups")) return; // 이미 등록됨
    appendFileSync(gi, `\n# SoDamContext 백업 (비밀키 포함 가능, 커밋 금지)\n${GITIGNORE_ENTRY}`);
  } else {
    writeFileSync(gi, `# SoDamContext 백업 (비밀키 포함 가능, 커밋 금지)\n${GITIGNORE_ENTRY}`, "utf8");
  }
}

// sodamharness CLI 존재 확인 (크로스플랫폼)
function harnessAvailable() {
  const cmd = process.platform === "win32" ? "where" : "which";
  const r = spawnSync(cmd, ["sodamharness"], { encoding: "utf8", timeout: 3000 });
  return r.status === 0;
}

// sodamharness에 백업 위임
function backupViaHarness(filePath) {
  const r = spawnSync("sodamharness", ["backup", filePath], {
    encoding: "utf8",
    timeout: 10000,
  });
  if (r.status !== 0) {
    throw new Error(`sodamharness backup 실패 (exit ${r.status}): ${r.stderr || r.stdout}`);
  }
  // sodamharness가 백업 경로를 stdout에 출력한다고 가정 (없으면 null)
  const backupPath = (r.stdout || "").trim() || null;
  return { method: "harness", backupPath };
}

// ISO 타임스탬프 (파일명에 안전한 형식: 콜론→하이픈)
function isoStamp() {
  return new Date().toISOString().replace(/:/g, "-").replace(/\..+/, "");
}

// 자체 폴백 백업 (원자적 쓰기)
function backupLocal(filePath, backupDir) {
  const base = path.basename(filePath);
  const stamp = isoStamp();
  const backupPath = path.join(backupDir, `${base}.${stamp}.bak`);
  const tmpPath = backupPath + ".tmp";

  // 원본 읽기 — 실패 시 throw (fail-closed)
  let content;
  try {
    content = readFileSync(filePath);
  } catch (e) {
    throw new Error(`백업 실패: 원본 파일을 읽을 수 없어요 (${filePath}): ${e.message}`);
  }

  // 백업 폴더 생성
  mkdirSync(backupDir, { recursive: true });

  // 원자적 쓰기: 임시 파일 → rename
  try {
    writeFileSync(tmpPath, content);
    renameSync(tmpPath, backupPath);
  } catch (e) {
    // ★수정(QA로 발견): rename 실패 시 tmp 파일이 백업 폴더에 고아로 남았다 — 정리 후 에러 전달.
    try { if (existsSync(tmpPath)) unlinkSync(tmpPath); } catch {}
    throw new Error(`백업 실패: 파일 쓰기 오류 (${backupPath}): ${e.message}`);
  }

  return backupPath;
}

/**
 * 파일을 처방 전에 백업합니다.
 * @param {string} filePath 백업할 파일의 절대경로
 * @param {object} opts
 * @param {string} [opts.projectRoot] git root (미전달 시 자동 탐색)
 * @param {boolean} [opts.useHarness=true] Harness 위임 시도 여부
 * @returns {{ method: "harness"|"local", backupPath: string|null }}
 * @throws 백업 실패 시 반드시 throw (fail-closed)
 */
export async function backupFile(filePath, opts = {}) {
  const absPath = path.resolve(filePath);

  if (!existsSync(absPath)) {
    throw new Error(`백업 실패: 파일이 없어요 (${absPath})`);
  }

  // Harness 시도 (기본값: true)
  const tryHarness = opts.useHarness !== false;
  if (tryHarness && harnessAvailable()) {
    return backupViaHarness(absPath);
  }

  // 자체 폴백
  const fileDir = path.dirname(absPath);
  const projectRoot = opts.projectRoot
    ? path.resolve(opts.projectRoot)
    : (findGitRoot(fileDir) || fileDir);

  // T3 방어: .gitignore 자동 추가
  try {
    ensureGitignore(projectRoot);
  } catch (e) {
    // .gitignore 추가 실패는 경고만 (백업은 계속)
    process.stderr.write(`[backup] .gitignore 추가 실패 (무시): ${e.message}\n`);
  }

  const backupDir = path.join(projectRoot, BACKUP_SUBDIR);
  const backupPath = backupLocal(absPath, backupDir);

  return { method: "local", backupPath };
}

/**
 * 백업된 파일을 원본 위치로 복원합니다.
 * @param {string} backupPath backupFile()이 반환한 backupPath
 * @param {string} targetPath 복원 대상 (원본 파일 경로)
 * @throws 복원 실패 시 throw
 */
// ★보안(2026-07-13 감사로 발견): backupPath에 백업 폴더 밖의 임의 파일(예: .ssh/id_rsa)을
// 지정하면 그 내용이 그대로 CLAUDE.md/AGENTS.md에 복사되는 "임의 파일 읽기" 결함이 있었다.
// 복원 소스는 반드시 이 도구가 만든 .sodamcontext/backups/ 안의 파일이어야 한다.
// ★보안 2차 수정(같은 날 자동 리뷰로 발견): 최초 수정은 문자열에 "/.sodamcontext/backups/"가
// '어디에든' 들어있으면 통과시켜서, 그 이름의 폴더를 아무 데나 만들면 우회 가능했다(anchored되지
// 않은 substring 검사). targetPath 기준 "진짜" 백업 폴더 하나에만 앵커링하고, realpathSync로
// 심볼릭 링크 우회도 막는다.
function resolveExpectedBackupDir(targetPath) {
  const fileDir = path.dirname(path.resolve(String(targetPath || "")));
  const projectRoot = findGitRoot(fileDir) || fileDir;
  return path.join(projectRoot, BACKUP_SUBDIR);
}

export function isBackupPath(backupPath, targetPath) {
  try {
    const realExpectedDir = realpathSync(resolveExpectedBackupDir(targetPath));
    const realBackupPath = realpathSync(path.resolve(String(backupPath || "")));
    const rel = path.relative(realExpectedDir, realBackupPath);
    return !!rel && rel !== ".." && !rel.startsWith(".." + path.sep) && !path.isAbsolute(rel);
  } catch {
    return false; // 백업 폴더가 아직 없거나 backupPath가 존재하지 않으면 안전하게 거부
  }
}

export function restoreBackup(backupPath, targetPath) {
  if (!isBackupPath(backupPath, targetPath)) {
    throw new Error(
      `복원 실패: 백업 파일 위치가 아니에요 — 안전을 위해 이 파일의 진짜 백업 폴더 안의 파일만 복원할 수 있어요 (${backupPath})`
    );
  }
  if (!existsSync(backupPath)) {
    throw new Error(`복원 실패: 백업 파일이 없어요 (${backupPath})`);
  }
  const tmpPath = targetPath + ".restore.tmp";
  try {
    const content = readFileSync(backupPath);
    writeFileSync(tmpPath, content);
    renameSync(tmpPath, targetPath);
  } catch (e) {
    // ★수정(QA로 발견): rename 실패 시 tmp 파일이 원본 폴더에 고아로 남았다 — 정리 후 에러 전달.
    try { if (existsSync(tmpPath)) unlinkSync(tmpPath); } catch {}
    throw new Error(`복원 실패: ${e.message}`);
  }
}
