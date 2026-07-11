// SoDamContext — path-safety.mjs
// 쓰기(apply/restore) 전 민감 경로 최소 방어선 (07_SECURITY §2.2 Must).
// ★설계 의도: Harness가 없는 환경(코덱스·CLI 단독 실행)에서도 최소 폴백으로 작동.
//   Harness의 전체 보안 책임을 대체/중복하지 않는다 — 여기선 "명백히 위험한 소수"만 막는다.
// ★교훈 반영(다른 SoDam 프로젝트 실측): AppData\Roaming 전체 차단은 과잉이었음
//   (claude-code 등 정상 작업 폴더까지 막힘) → 자격증명 하위 폴더만 선별 차단.

import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const CRED_SUBDIRS = [".ssh", ".aws", ".gnupg", ".docker"];
const WIN_SYSTEM = ["c:\\windows", "c:\\program files", "c:\\program files (x86)", "c:\\programdata"];
const POSIX_SYSTEM = ["/etc", "/usr", "/bin", "/sbin", "/var", "/boot", "/dev", "/proc"];

function toComparable(p, platform) {
  return platform === "win32" ? p.replace(/\//g, "\\").toLowerCase() : p;
}

// 문자열 판정 로직(순수 함수) — 리터럴 경로와 심볼릭 링크 해석 경로 양쪽에 재사용한다.
function isSensitiveAgainst(a, home, platform, sep) {
  const h = toComparable(home, platform);
  if (a === h) {
    return { sensitive: true, reason: "홈 폴더 루트 자체는 쓰기 대상이 될 수 없어요" };
  }
  for (const sub of CRED_SUBDIRS) {
    const sd = toComparable(path.join(home, sub), platform);
    if (a === sd || a.startsWith(sd + sep)) {
      return { sensitive: true, reason: `자격증명 폴더(${sub})는 보호 대상이에요` };
    }
  }
  const sysList = platform === "win32" ? WIN_SYSTEM : POSIX_SYSTEM;
  for (const s of sysList) {
    if (a === s || a.startsWith(s + sep)) {
      return { sensitive: true, reason: "시스템 폴더는 보호 대상이에요" };
    }
  }
  if (platform === "win32" && /^[a-z]:\\?$/.test(a)) {
    return { sensitive: true, reason: "드라이브 루트는 쓰기 대상이 될 수 없어요" };
  }
  return null;
}

// 심볼릭 링크가 가리키는 실제 위치까지 최선을 다해 풀어본다.
// 존재하지 않는 경로거나 해석에 실패하면 원본 경로를 그대로 반환(더 엄격해지기만 할 뿐, 절대 깨지지 않음).
function bestEffortRealpath(targetPath) {
  try {
    return fs.realpathSync(targetPath);
  } catch {
    return targetPath;
  }
}

// opts: { homeDir, platform } — 둘 다 선택(테스트 주입용, 미지정 시 실제 환경값)
export function isSensitiveWritePath(targetPath, opts = {}) {
  const platform = opts.platform || process.platform;
  const home = opts.homeDir || os.homedir();
  const sep = platform === "win32" ? "\\" : "/";

  let abs;
  try {
    abs = path.isAbsolute(targetPath) ? targetPath : path.resolve(targetPath);
  } catch {
    return { sensitive: true, reason: "경로를 해석할 수 없어요(판정 불가라 안전하게 막았어요)" };
  }

  const literalHit = isSensitiveAgainst(toComparable(abs, platform), home, platform, sep);
  if (literalHit) return literalHit;

  // ★ 심볼릭 링크 우회 방어: 문자열만 보면 안전해 보여도 실제로 가리키는 곳이 민감하면 막는다.
  // 시뮬레이션 중인 platform이 실제 실행 환경과 다르면 realpath가 무의미하므로 건너뜀(안전한 폴백 유지).
  if (platform === process.platform) {
    const real = bestEffortRealpath(abs);
    if (real !== abs) {
      const realHit = isSensitiveAgainst(toComparable(real, platform), home, platform, sep);
      if (realHit) {
        return { sensitive: true, reason: `${realHit.reason}(심볼릭 링크로 연결된 실제 위치 기준)` };
      }
    }
  }

  return { sensitive: false, reason: "" };
}
