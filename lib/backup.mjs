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
} from "node:fs";
import { spawnSync } from "node:child_process";

const BACKUP_SUBDIR = ".sodamcontext/backups";
const GITIGNORE_ENTRY = ".sodamcontext/backups/\n";

// git root 탐색 (filePath 기준 위로 .git 찾기)
function findGitRoot(startDir) {
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
export function restoreBackup(backupPath, targetPath) {
  if (!existsSync(backupPath)) {
    throw new Error(`복원 실패: 백업 파일이 없어요 (${backupPath})`);
  }
  const tmpPath = targetPath + ".restore.tmp";
  try {
    const content = readFileSync(backupPath);
    writeFileSync(tmpPath, content);
    renameSync(tmpPath, targetPath);
  } catch (e) {
    throw new Error(`복원 실패: ${e.message}`);
  }
}
