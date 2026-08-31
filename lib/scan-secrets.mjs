// SoDamContext — scan-secrets.mjs
// "비밀키가 있는지"만 확인하는 보안 검사. (검진의 보안 파트 — PRD 07_SECURITY §2.3)
//
// ★불변 규칙 (T1 = 최대 위협): 비밀키 '값'을 절대 읽어서 내보내지 않는다.
//   - 매칭은 boolean(RegExp.test())로만 한다 → 매칭된 문자열을 변수에 담지 않는다.
//   - 반환 객체에는 원문(매칭 값) 필드가 '아예 없다' → 구조적으로 유출 0건.
//   - 화면 표시문자열(masked)은 패턴 파일의 '상수'(safe_prefix)로만 조립한다.
//     파일 내용에서 잘라오지 않으므로, 비밀 값이 리포트·로그·세션기록(jsonl)으로 샐 수 없다.
// ★불변: 자동삭제 안 함(발견·표시만). 외부 전송 0. 외부 코드 실행 0.

import path from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// rules/secret-patterns.json 을 읽어 정규식을 컴파일한다.
// (lib/ 와 rules/ 는 플러그인 폴더 안의 형제 폴더 — '../'가 아니라 내부 경로라 안전)
export function loadSecretPatterns(rulesDir) {
  const dir = rulesDir || path.join(here, "..", "rules");
  const raw = JSON.parse(readFileSync(path.join(dir, "secret-patterns.json"), "utf8"));
  const compile = (list, tier) =>
    (list || []).map((p) => ({
      id: p.id,
      label: p.label,
      tier,
      // safe_prefix 는 '비밀이 아닌 공개 접두사'(상수). 이것만으로 표시문자열을 만든다.
      masked: `${p.safe_prefix ? p.safe_prefix : ""}…REDACTED`,
      // 'g' 플래그 미사용(.test() lastIndex 부작용 방지). 필요한 플래그(예: 'i')만.
      re: new RegExp(p.regex, p.flags || ""),
    }));
  const patterns = [...compile(raw.confirmed, "confirmed"), ...compile(raw.suspect, "suspect")];
  // ★C-G2(2026-08-31 실측): AKIA...EXAMPLE(AWS 공식 문서 관례)·sk-ant-xxxx.../ghp_XXXX...(흔한
  // 플레이스홀더 표기) 같은 '진짜 값이 아닌 예시'까지 확정 비밀키로 오탐해 정상 문서 쓰기를 막던
  // 결함 발견 → 같은 줄에 allowlist 마커가 있으면 finding에서 제외. 배열 위에 얹는 이유: 기존
  // 콜백(prevent-write.mjs 등)이 patterns를 그대로 배열로 다뤄도(for-of, .filter 등) 회귀 없이
  // scanText() 내부에서만 자동으로 적용되게 하기 위함(호출부 변경 0건).
  const allow = (raw.allowlist && raw.allowlist.patterns) || [];
  patterns.allowlist = allow.map((p) => ({ id: p.id, re: new RegExp(p.regex, p.flags || "") }));
  return patterns;
}

// 텍스트에서 비밀키 '있음'만 줄 단위로 확인한다. 값은 절대 반환하지 않는다.
// 반환 findings 항목: { tier, severity, confidence, label, masked, line }  ← 원문 필드 없음
export function scanText(text, patterns) {
  const lines = String(text).split(/\r?\n/);
  const allow = (patterns && patterns.allowlist) || [];
  const findings = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // ★C-G2: 같은 줄에 '예시/플레이스홀더' 마커가 있으면 확정/의심 매칭이 있어도 통째로 건너뛴다
    // (값을 잘라 비교하지 않음 — 줄 전체 재검사라 T1과 무관).
    if (allow.some((a) => a.re.test(line))) continue;
    for (const p of patterns) {
      // ★ .test() 는 boolean만 돌려준다 → 비밀 값이 변수로 새지 않는다.
      if (p.re.test(line)) {
        findings.push({
          tier: p.tier,
          severity: p.tier === "confirmed" ? "높음" : "보통",
          confidence: p.tier === "confirmed" ? "확정" : "의심",
          label: p.label,
          masked: p.masked,
          line: i + 1,
        });
      }
    }
  }
  return findings;
}

// 텍스트에서 비밀키로 보이는 '줄 전체'를 가린 텍스트를 만든다(Phase 3 "AI 판단 강화"용).
// ★T1 안전: 부분 문자열 추출이 아니라 매칭된 줄 전체를 상수 문구로 치환한다 — 정규식 매치
// 위치 계산 실수로 키 일부가 새는 위험을 원천 차단(가장 단순하고 가장 보수적인 방식).
// 반환: { maskedText, maskedLineCount } — 원문 findings가 필요하면 scanText()를 별도 호출.
export function maskSecretsInLines(text, patterns) {
  const lines = String(text).split(/\r?\n/);
  let maskedLineCount = 0;
  const out = lines.map((line) => {
    const hit = (patterns || []).some((p) => p.re.test(line));
    if (hit) {
      maskedLineCount++;
      return "[비밀키로 의심되는 줄 — 확인을 위해 가려짐]";
    }
    return line;
  });
  return { maskedText: out.join("\n"), maskedLineCount };
}

// 파일을 읽어 비밀키 검사. 파일 내용은 메모리에 잠깐 들어오되 '절대 반환·로그하지 않는다'.
// 반환: { ok, file, found, count, findings }  (없는 파일도 안전하게 found:false)
export function scanFile(filePath, patterns) {
  try {
    if (!existsSync(filePath)) {
      return { ok: true, file: filePath, found: false, count: 0, findings: [] };
    }
    const text = readFileSync(filePath, "utf8");
    const findings = scanText(text, patterns);
    return { ok: true, file: filePath, found: findings.length > 0, count: findings.length, findings };
  } catch (e) {
    // 에러 메시지에도 파일 '내용'을 넣지 않는다(e.message 는 fs 시스템 메시지뿐).
    return { ok: false, file: filePath, found: false, count: 0, findings: [], error: e.message };
  }
}
