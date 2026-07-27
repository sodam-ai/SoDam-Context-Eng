# SoDamContext — AI Manual Health Check 🩺

> A tool that **checks, creates, and tidies** your **"AI manual"** (`CLAUDE.md` / `AGENTS.md`)
> in plain language — **even if you don't know how to code** — so that AI (Claude Code · Codex) understands your project well.
>
> New to computers or AI? That's fine. This document is written as **one step at a time**.

> ⚠️ **Honest current status (as of 2026-07-18)**
> - **Works (live-verified in real sessions):** Checkup · Intake · Treatment · Codex checkup · Sync (compare the two files) · Prevention (auto-block before saving) — **confirmed on both Claude Code and Codex**
> - **Security hardening:** writes to sensitive locations (system/credential folders) are now automatically rejected
> - **Code complete, CLI-verified (live session confirmation pending):** Freshness reminder (auto-notes how many days since the last checkup) · Reference health score — both are now automatically included in the checkup result, and their accuracy has been confirmed by unit tests and direct command-line runs. We just haven't yet confirmed these appear naturally in a real conversational checkup session.
> - **⚠️ How you call this changed in Claude Code (2026-07-18):** natural language ("check my manual") used to occasionally find it; now it works **only** when you type the **exact slash command**, e.g. `/sodam-context:checkup` (a structural change made to remove ambiguity). **Codex is unaffected** — natural language still works exactly as before.
> - We do not exaggerate. We do **not** claim "100% safe / perfect".

---

## Table of Contents

1. [What Is This](#1-what-is-this)
2. [Prerequisites and Required Programs](#2-prerequisites-and-required-programs)
3. [Download and Install](#3-download-and-install)
4. [Quick Start](#4-quick-start)
5. [How to Run](#5-how-to-run)
6. [How to Use](#6-how-to-use)
7. [How It Works](#7-how-it-works)
8. [Command List](#8-command-list)
9. [Update Summary](#9-update-summary)
10. [File and Document Locations](#10-file-and-document-locations)
11. [Workflow](#11-workflow)
12. [Architecture](#12-architecture)
13. [Security and Data Flow](#13-security-and-data-flow)
14. [Troubleshooting](#14-troubleshooting)
15. [FAQ](#15-faq)
16. [License Copyright Commercial Use Disclaimer](#16-license-copyright-commercial-use-disclaimer)

---

## 1. What Is This

- AI coding tools (**Claude Code** · **Codex**) read a file called **`CLAUDE.md` / `AGENTS.md`** before they start working. That file is the **"AI manual"** — a note you write ahead of time saying "handle this project like this."
- If that manual is **too long, contains a password/secret, or contradicts itself**, the AI gets confused, answers less accurately, and costs go up.
- **SoDamContext** gives that manual a **health check in plain language**, **creates a small one** from a few easy questions if you don't have one, and **safely tidies** it when there are problems.
- It hides jargon (`CLAUDE.md` → **"AI manual"**). Reply **"why?"** and it explains the real reason.

> 💡 **One-line summary:** "A tool that helps you check and tidy the manual that makes AI understand your project — even if you can't code."

> 📱 **Note (honest):** This tool runs **inside Claude Code / Codex on a computer (Windows · macOS)**. It is **not a phone app.** If you only have a smartphone, you cannot use it.

---

## 2. Prerequisites and Required Programs

| Requirement | Why | How to check / install |
|---|---|---|
| **Claude Code** | Where this tool runs | OK if you already use it. Otherwise follow [claude.com/claude-code](https://claude.com/claude-code) |
| **Node.js 18+** | The checkup tool runs Node internally | Type `!node --version` — if it shows `v18` or higher (e.g. v20, v22), you're set. Otherwise install **LTS** from [nodejs.org](https://nodejs.org) and restart your computer |
| **Git** | To get the repo for Codex / local install | Type `!git --version` — if a number shows, you're set. Otherwise install from [git-scm.com](https://git-scm.com) |
| (optional) **Codex** | Only if you also manage Codex's `AGENTS.md` | Codex users only |

- **OS:** works on **Windows and macOS**. (Path examples here are Windows-based.)
- **Internet:** needed only for installation. Checkup and Intake run **100% on your own computer** (no data is sent out).
- **"Input box"** = the line where you type in Claude Code. In this doc, "type ~ in the input box" means typing there.

---

## 3. Download and Install

### 3-1. Claude Code (automatic install, recommended)

Paste the following **two lines, one at a time**, into the Claude Code **input box**, pressing Enter after each.

```
/plugin marketplace add sodam-ai/SoDam-Context-Eng
```
```
/plugin install sodam-context
```

- Or just type `/plugin` to open the **menu**, find SoDamContext, and click **Install**.
- **After installing, fully close and reopen Claude Code (restart).** Otherwise the commands won't appear.

> 💡 **Using a local folder directly** (development/testing): replace `sodam-ai/SoDam-Context-Eng` on the first line with **the absolute path of that folder**.
> e.g. `/plugin marketplace add D:\...\SoDam-Context-Eng`

### 3-2. Codex (manual install)

Codex has no plugin marketplace, so you **clone the whole repository and run inside it**. (If you copy only the skill folders, the `lib` and `rules` folders the checker needs are missing, and you'll get a "file not found" error.)

1. In a terminal, one line at a time:
   ```
   git clone https://github.com/sodam-ai/SoDam-Context-Eng.git
   cd SoDam-Context-Eng
   ```
2. **Start Codex from this repository's root folder.** (The root has `AGENTS.md`, `skills`, `lib`, and `rules`.)
3. For fuller steps + FAQ, see **`codex/README.ko.md`** in the repo, or **[How to Use](#6-how-to-use)** below.

> 💡 **One-click install script (optional, Windows):** `codex/install.ps1` in the repo automates steps 1–2 above (prerequisite check, clone, `AGENTS.md` creation). Note the repository is **PRIVATE**, so you must do step 1 (`git clone`) manually once to get the script itself. If execution policy blocks it, right-click the file → **Run with PowerShell**, or run once with `powershell -ExecutionPolicy Bypass -File install.ps1`. Full guide: `codex/README.ko.md` (Korean).

---

## 4. Quick Start

Once installed and restarted, remember just two things.

1. **You already have a manual → check it (Checkup):**
   ```
   /sodam-context:checkup
   ```
   When it asks "which file?", give the absolute path to the folder's `CLAUDE.md`.

2. **You don't have a manual yet → create one (Intake):**
   ```
   /sodam-context:intake
   ```
   Answer 5–6 easy questions; it shows a **preview → asks "create it?" → only then** makes a small manual.

> **In Claude Code, natural language won't find this** — please type the **exact slash command** above (it used to sometimes work, but the tool is now slash-command-only by design). **Codex is different** — Codex never had slash commands, so it's always called with natural language, and that still works exactly as before.

---

## 5. How to Run

This tool is **not a program you launch directly** — it works when you **call it by command / natural language** inside Claude Code · Codex.

- **Claude Code:** type a slash command in the input box. e.g. `/sodam-context:checkup`, `/sodam-context:intake`, `/sodam-context:treat`.
- **Codex:** there are no slash commands, so you call it with **natural language**. e.g. "check my AGENTS.md", "fix my manual". (Always run Codex from the **repository root folder**.)
- Giving the file to check as an **absolute path** is the most accurate. e.g. `C:\MyProject\CLAUDE.md`.

---

## 6. How to Use

### 6-1. Checkup — `✅ Works`

1. Type `/sodam-context:checkup`.
2. When asked "which file?", give the absolute path.
3. Shortly after, you get a **plain report**:
   - Shown as a **count** like "N problems", front and center.
   - Any password/key is shown **masked** (`sk-ant-…REDACTED`) only.
   - Items like **staleness, unrefined auto-generation, skill leakage** are shown as "suspect" (with a false-positive caveat).
   - **Wholesale paste-ins** (an overly long code block pasted in as-is) can be judged from structure alone (length), so it's flagged as a **confirmed** problem.
   - A **reference score** (e.g. "85 pts") is added after the count, always paired with the **"reference only (unvalidated)"** label — meaning it hasn't been tuned against real, diverse user data yet (prevents inflated claims — see §9).
   - If it's been **more than 30 days** since your last checkup, you'll get a short note like "want to check again while you're here?" (this is not a background alert — it only compares timestamps the moment you run a checkup). No note appears if it's under 30 days, or this is your first checkup.
   - For more, reply **`why?`** and it explains the reason and evidence (including how the reference score was calculated).

### 6-2. Intake (create) — `✅ Works`

1. Type `/sodam-context:intake`.
2. When asked "which folder?", give the path or answer **"this folder"**.
3. Answer easy questions one at a time (what project / language & tools / a must-follow rule / something to never do / tone).
4. The AI **shows the content first** and asks "create it like this?" → only when you say **`yes`** are the files created.
5. The result is **under 200 lines, 0 secrets**. Say `yes` to "shall I run a checkup too?" to also check it.

### 6-3. Treatment (tidy) — `✅ Works (live-verified)`

1. When the checkup finds problems, type `/sodam-context:treat`.
2. It **backs up first** and shows a **preview of what it will change**.
3. It edits **only after you say `yes`** (removes duplicate lines / unnecessary blank lines).
4. **Restore is supported** — roll back to the backup if you don't like it.
5. **Safety/forbidden rule lines** (e.g. "never", "no passwords") are **auto-preserved** (never removed).

> ⚠️ Treatment has been verified with live, real-session testing (safe-keyword preservation and restore accuracy confirmed). Still, for your first use, keep a copy of important files.

---

## 7. How It Works

- **Checkup:** the tool **does not open your original file directly.** It runs an internal checker (`checkup-cli.mjs`) and reads **only the summary JSON**. So **secrets do not leak.** The report shows **"N problems" instead of a score**, and any secret is shown **masked**.
- **Intake:** questions → **preview → "create it?" confirmation → only then writes.** It never creates files without asking.
- **Treatment:** **backup first → preview → confirm → safe write** (writes to a temp file then renames, so your original isn't corrupted if it stops midway). After treatment, the file must be **smaller** to count as success.
- **Codex (`AGENTS.md`):** Codex reads the **merged chain** of parent-folder and global manuals. The checkup verifies that **combined size (32 KiB limit)** too. (Korean is 3 bytes per character, so byte size exceeds character count.)
- **Freshness reminder:** every checkup records, per absolute file path, only "when was this last checked" as a timestamp (no content stored). The next checkup compares against that timestamp and only speaks up if it's been over 30 days. **There is no background alert** — comparison only happens the moment you run a checkup.
- **Reference score:** it doesn't re-read the file to compute this — it uses the **problem counts** the checkup already found (confirmed problems −15 pts each, suspects −5 pts each, out of 100) and calculates on the spot. It's a fully transparent subtraction formula, so if you ask "why this score?", it can show its work.

---

## 8. Command List

| Command | Easy name | What it does | Status |
|---|---|---|---|
| `/sodam-context:checkup` | Checkup | Checks bloat, duplication, staleness/unrefined ("suspect"), wholesale paste-ins (confirmed), secrets, size → plain report (includes freshness reminder & reference score) | ✅ Works |
| `/sodam-context:intake` | Intake | Creates a small manual via questions when none exists | ✅ Works |
| `/sodam-context:treat` | Treat | Backup → preview → after confirmation, tidies duplicates/blank lines (restore supported) | ✅ Works |
| `/sodam-context:sync` | Sync | Finds safety rules present in only one of the two manuals and reports the line numbers (does not merge). Slash command only, no natural-language trigger | ✅ Works |
| (Prevention) | Prevent | Blocks secrets / excess length before saving | ✅ Works (confirmed live in a real session on 2026-07-17, including the confirmation prompt actually firing) |

> ⚠️ **In Claude Code, the 4 commands above must be typed exactly as slash commands** (natural language won't find them). **Codex** has no slash commands at all, so it calls the same features with **natural language** ("run a health check", etc.) — that's always been true and still works.

---

## 9. Update Summary

<details>
<summary><b>📋 Click to expand — version history</b></summary>

**After 0.1.0 (in progress, 2026-07-27)**

- **Found and fixed one more real issue during a security review:** discovered that "backup" didn't check whether its target was a credential folder (like `.ssh`/`.aws`) before copying — added the same sensitive-path check that treatment and restore already had.
- **Built backup directly into applying a treatment (apply):** found that calling apply directly, without going through the normal backup step, could overwrite the original with no backup at all — fixed so the apply code itself now always backs up first internally (enforced in code, not just conversational instructions).
- **Fixed a temp-file cleanup gap:** restore, backup, and apply could leave an orphaned temp file behind if the rename step failed — now cleaned up on failure too.
- **Improved freshness-reminder wording accuracy:** fixed a case where the tool said "checked yesterday" when it should have stayed silent (no change since the last checkup) — tightened the guidance for accuracy.
- All **153** tests pass (`npm test`), including the new regression test; `selftest` 60/60 pass.

**After 0.1.0 (in progress, 2026-07-18)**

- **Changed how Claude Code calls this tool:** removed the old hyphenated form (`/sodam-context-checkup`) that duplicated the natural-language auto-discovery mechanism, keeping only the exact colon slash command (`/sodam-context:checkup`). Natural language ("check my manual") no longer finds it in Claude Code — you must type the exact slash command (a change made to remove ambiguity). **Codex is unaffected** — natural language keeps working exactly as before.

**After 0.1.0 (in progress, 2026-07-17)**

- **Prevention (auto-block before saving) confirmed live in real use:** what was previously "code complete, live behavior still being verified" has now been directly confirmed — a real usage session saving a 252-line file triggered the "still save this?" prompt exactly as designed. Updated the command table and security section status to "Works".

**After 0.1.0 (in progress, 2026-07-16)**

- **Added confirmed detection for "wholesale paste-ins":** a code block (` ``` `) that's too long (15+ lines) and clearly pasted in as-is is now flagged as a **confirmed** problem, judged purely by structural length — without reading the content — so it doesn't conflict with the no-secret-reading principle.
- **Added a one-click Codex install script (`codex/install.ps1`, Windows):** automates the prerequisite check, repository clone, and `AGENTS.md` creation steps from the manual install. Never changes your system execution policy.
- **Test suite expanded:** 134 → **142** tests, all passing.

**After 0.1.0 (in progress, 2026-07-15)**

- **Added a freshness reminder:** every checkup now remembers "when was this last checked", and if it's been **over 30 days**, gently suggests checking again. It's not a background notification — it only compares the moment you run a checkup, so it doesn't overlap with other tools' (e.g. SoDamLoop's) scheduled-alert features.
- **Added a reference health score:** the checkup report now shows a supplementary score like "85 pts". Since it isn't a formula tuned on real, diverse user data yet, it's always labeled **"reference only (unvalidated)"**. The calculation itself (confirmed problem = −15 pts, suspect = −5 pts) is fully disclosed, not hidden.
- **Fixed an internal documentation contradiction:** an old safety rule that said "never show a score" conflicted with the new reference-score feature above — clarified to "show it as supplementary info, always paired with the reference-only label."
- **Test suite expanded:** 118 → **134** tests, all passing.

**After 0.1.0 (in progress, 2026-07-13)**

- **OWASP-style security audit — found and fixed a real vulnerability:** Restore accepted any readable file as the backup source, so pointing it outside the backup folder would copy that file's raw content straight into the manual. Fixed: restore now only accepts sources that are actually inside the tool's own backup folder, with symlink-escape protection added on top.
- **Fixed restore failing across drives:** If your project lives on a different drive than the system temp folder (e.g. drive D on Windows), Treatment/Restore could fail. Reported by a real user, reproduced, and fixed — now works regardless of drive.
- **Documentation honesty cleanup:** Prevention (auto-block) was described inconsistently across documents ("in progress" in one place, "already works" in another) — unified to "code complete, live behavior still being verified." Sync is now listed under "Works" since it has been confirmed by a real user.
- **Test suite expanded further:** 82 → **118** tests (including the new security regression tests), all passing. Also ran `npm audit` (dependency vulnerability check) — 0 findings.

**After 0.1.0 (in progress, 2026-07-11)**

- **Treatment & Codex checkup live-verified:** what was previously confirmed only by automated tests has now been run and confirmed in real sessions — safe-keyword preservation and restore accuracy verified.
- **New safeguard — never writes to sensitive locations:** if a treatment/restore target accidentally resolves to a system folder or a credential folder (`.ssh`, `.aws`, `.gnupg`, `.docker`, etc.), the write is rejected automatically with a reason.
- **Codex checkup accuracy fix:** fixed a case where a custom `CODEX_HOME` setup could cause checkup to look at the wrong location instead of what Codex actually reads.
- **CLI stability fix:** fixed an inconsistency where running without a file path reported failure but still exited with a "success" code (could mislead automation scripts).
- **License finalized:** Apache License 2.0 confirmed as final.
- **Test suite expanded:** automated tests grew from 67 to **82**, covering more edge cases, failure paths, and the new security check. All passing.

**After 0.1.0 (2026-07-07)**

- **Deeper checkup:** detects "staleness (/init left as-is), unrefined auto-generation, skill leakage" as **"suspect"** via rule data (with line numbers and matched phrase). Extend by editing JSON only (no code change), secret-safety (T1) preserved.
- **Treatment restore fix:** the `restore` command's argument order was reversed vs. the code, which could make restore fail — corrected (automated e2e passes).
- **Codex run-path & install docs cleanup:** added run-path guidance so skills actually run in Codex, and unified two conflicting install methods (copy-only-skills ↔ clone-whole-repo) into **the one that works**.
- **Docs accuracy update:** README·GUIDE (KO/EN) honestly reflect current abilities. PDFs removed (replaced by HTML).
- **Tests added:** a regression test that verifies the whole checkup → backup → preview → apply → restore chain for real.

**0.1.0 (2026-06-28) — first release**

- **Checkup:** data-driven rules auto-check the AI manual (size, lint duplication, skill duplication, conflicts, init fossilization, blind references, etc.). Secret-safe (T1) design.
- **Intake:** 5–6 question interview → auto-creates `CLAUDE.md` + `AGENTS.md` (writes only after confirmation).
- **Treatment:** tidies problem lines — backup first → preview → safe-keyword preservation → atomic write.
- **Codex support:** merge chain (sums `AGENTS.md` from global to current folder, 32 KiB check), `config.toml` detection.
- **Docs & license:** README·GUIDE (KO/EN), Apache-2.0 + NOTICE.

</details>

---

## 10. File and Document Locations

| What | Location (Windows example) |
|---|---|
| Check/create target | `CLAUDE.md` · `AGENTS.md` in **your working project folder** |
| (Treatment) backup folder | `<project folder>\.sodamcontext\backups\` (created automatically when treatment runs) |
| (Freshness reminder) last-checkup record | `<project folder>\.sodamcontext\last-checkup.json` (created/updated automatically on each checkup; stores only the path + timestamp) |
| This manual | The plugin folder's `README.md`·`README.html` (Korean), `README.en.md`·`README.en.html` (English) |
| Codex install guide | `codex/README.ko.md` in the repo |

> The md and html documents have **identical content** (html is generated from the same md). md reads well on GitHub; html opens directly in a browser.

---

## 11. Workflow

```
Install → Restart → [Do you have a manual?]
                     ├─ No  → /sodam-context:intake → preview & confirm → create a small manual
                     └─ Yes → /sodam-context:checkup → problem report
                                     ├─ "why?" → reason & evidence
                                     └─ has problems → /sodam-context:treat
                                                        → backup → preview → confirm → tidy safely (restore possible)
```

---

## 12. Architecture

Internal structure for the technically curious. (You don't need this to use the tool.)

- **Data-driven:** checkup/treatment rules live in `rules/*.json`, not in code. To add a new check, add **one object to a JSON array** (no code change).
- **CLI–JSON boundary (the core of safety):** the AI/skill **does not read the original file directly** — it reads **only the summary JSON** emitted by `lib/checkup-cli.mjs`. Secret "values" never appear in any result or log.
- **Engine (lib) parts:** `scan-secrets` (secret detection) · `checkup-rules` (size, lint duplication, suspect detection) · `intake-verify` (output safety gate) · `treat`+`treat-verify` (tidy, safe-keyword preservation, regression check) · `backup` (atomic backup/restore) · `codex-merge` (Codex merge chain, 32 KiB) · `path-safety` (blocks writes to sensitive paths) · `checkup-cli` (orchestrator: checkup/backup/preview/apply/restore).
- **Zero dependencies:** no external npm packages (minimizes supply-chain risk). **Node 18+ ESM**, **100% local** (no network).
- **Entry points (commands) ×4:** `sodam-context:intake` · `sodam-context:checkup` · `sodam-context:treat` · `sodam-context:sync` — Claude Code uses slash commands, Codex uses natural language (reads the same content from `commands/*.md`).
- **No natural-language auto-discovery (2026-07-18, deliberate design):** the Claude Code side intentionally has no "skills" (the mechanism that auto-registers a feature for natural-language discovery) — having one caused `/sodam-context:checkup` (the correct form) and `/sodam-context-checkup` (an auto-exposed hyphenated duplicate) to appear **at the same time**, which was confusing. So in Claude Code, all 4 commands above must be called via the **exact slash form**. Codex never had the concept of "skills" to begin with (it works from natural language plus `AGENTS.md` guidance alone), so it's unaffected by this change.

---

## 13. Security and Data Flow

- **No secret reading (T1):** the tool never **reads or prints** a secret's "value". It only confirms one **exists** and shows it **masked** (`sk-ant-…REDACTED`). It **never auto-deletes** (false-positive risk).
- **No automatic changes (Fail-Closed):** it never **creates or edits** files until you say **"yes"**.
- **No network:** checkup, intake, and treatment run **on your computer only**. Internet is needed just for install.
- **Atomic write + backup first:** treatment writes to a temp file then renames, and **aborts immediately if the backup fails**.
- **Applying (apply) enforces its own backup (hardened 2026-07-27):** rather than relying on conversational instructions alone, the code that applies a treatment always creates a backup internally before changing the original — no matter how it's called, it can never overwrite without one.
- **Safe-keyword preservation:** lines with key rules ("never / forbidden / must / always / secret / force push") are **auto-preserved** (excluded from tidying).
- **Never writes to sensitive locations:** if a treatment/restore target resolves to the home directory root, a credential folder (`.ssh`, `.aws`, etc.), or a system folder, the write is **rejected automatically** with a reason before anything is touched.
- **Prevents before saving (Prevention, confirmed live on 2026-07-17):** if a confirmed secret or an oversized manual (300+ lines / 32KB+) is about to be written to `CLAUDE.md`/`AGENTS.md`, the write is blocked before it happens; a borderline size (200–299 lines) triggers a **"still save this?"** confirmation. Beyond checking the decision logic and hook protocol at the code level, we've now confirmed in a real usage session that this confirmation prompt genuinely appears when saving a 252-line file (a real user confirmation, not auto-approved). Nothing outside these two manual files is ever touched.
- **Checkup looks at only the one file you point it at:** Codex (`AGENTS.md`) checks the merged chain up through parent and global manuals, but Claude Code (`CLAUDE.md`) currently checks **only the single file you specify**. If you've split rules across a nested `CLAUDE.md` or `.claude/rules/`, those aren't scanned automatically — check each one separately.
- **Restore source is validated too (added 2026-07-13):** "Restore" only accepts files inside the tool's own backup folder (`.sodamcontext/backups/`) as the source. Anything else is rejected — this prevents the content of an arbitrary file from accidentally being copied into your manual.
- **Backup target is validated too (added 2026-07-27):** "Backup" also rejects sensitive targets (credential folders like `.ssh`/`.aws`, or system folders) before running — this prevents the content of a credential file from accidentally being copied into the backup folder.
- **The freshness reminder stores no content either (added 2026-07-15):** the "when was this last checked" record keeps only the file's **absolute path string + a timestamp string**, in your project folder (`.sodamcontext/last-checkup.json`). The manual's actual content never enters this record.
- **The reference score is not a black box (added 2026-07-15):** computing it reads no new files — it just subtracts from the "confirmed problem count" / "suspect count" the checkup already produced. The weights (−15 for confirmed, −5 for suspect) are written as data in `rules/thresholds.json`, not buried in code, so anyone can inspect them, and asking "why?" shows the exact math.
- **Honest limits:** it only catches **known patterns**, so it does **not guarantee "100% safe / perfect detection"** (for reference only). Reissue/manage important keys yourself.

**Data flow (checkup):**
```
[original manual file]
      │  (read only internally by the tool — the AI never sees the original directly)
      ▼
[checkup-cli.mjs = internal checker]
      │  emits summary JSON only (no secret "value" · masked display only)
      ▼
[AI / skill] → plain-language report ("N problems", masked keys)
```

---

## 14. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Commands not in the list | **Did not restart** after install | **Fully close and reopen** Claude Code |
| Still not visible after restart | Installed copy not refreshed | Run `! claude plugin marketplace update sodamcontext-marketplace`, then restart |
| "node not found" | Node.js missing/old | Install LTS from [nodejs.org](https://nodejs.org), then restart |
| A different feature responds | A similarly-named plugin intercepts | Use the **`/sodam-context:...`** slash command instead of plain language |
| Checks the wrong file | "which folder?" was ambiguous | Give the exact **absolute path** of the file |
| Says there's a password | Something looks like a key in the manual | **Reissue** that key and remove it from the manual (use env vars) — the tool never deletes it automatically |
| Codex says "Cannot find module" | Run from a folder that isn't the repo root | Re-run Codex from the **repo root folder** (`SoDam-Context-Eng`) |
| Created/edited a file without asking | 🚨 Not normal | Stop and tell someone who can help (it should always ask first) |
| Restore says "not a backup file location" and refuses | The file you pointed to isn't a real backup this tool made (this is a safety feature working correctly, not a bug) | Use the backup path shown to you during `/sodam-context:treat` — don't point restore at a file you made yourself |
| Backup says "can't back up this location" and refuses | The target you gave is a sensitive location — a credential folder (`.ssh`/`.aws`) or a system folder (this is a safety feature working correctly, not a bug) | Only point backup at ordinary project files — credential/system folders are out of scope for this tool |

---

## 15. FAQ

**Q. What exactly is an "AI manual"?**
A. The `CLAUDE.md` (for Claude Code) / `AGENTS.md` (for Codex) file that AI coding tools read before starting — a note that says "handle this project like this."

**Q. Does my file content go out to the internet?**
A. No. Checkup, intake, and treatment run **100% on your computer**. Internet is only needed for install.

**Q. Does it delete passwords automatically?**
A. **No.** It only confirms one **exists** and shows it **masked** — it never auto-deletes (false-positive risk). Check and reissue it yourself.

**Q. Can I trust the reference score (health score)?**
A. The **"reference only (unvalidated)"** label that always appears alongside it is the honest answer — it hasn't been tuned against real, diverse usage data yet. The real information is "N problems", shown first; the score is a **reference-only supplement** after it. The calculation is fully disclosed, never hidden (confirmed problem = −15 pts, suspect = −5 pts, out of 100).

**Q. How does the "N days since your last checkup" note work?**
A. It's not a background notification suddenly popping up. It only compares against your last checkup timestamp **at the moment you run** `/sodam-context:checkup`. If it's under 30 days, or this is your first checkup, the note doesn't appear at all (to avoid unnecessary noise).

**Q. Korean text looks broken.**
A. Check that Node.js is v18+. On Windows, verify the terminal is using UTF-8 encoding.

**Q. Is it safe to use in auto-accept (permission) mode?**
A. Auto-accept mode can skip the confirmation step. For safety, the default (ask) mode is recommended.

**Q. Can I use Claude Code and Codex together?**
A. Yes. In the same project, Claude Code reads `CLAUDE.md` and Codex reads `AGENTS.md`. The two files coexist fine.

**Q. How do I update?**
A. Claude Code: `! claude plugin marketplace update sodamcontext-marketplace`, then restart. Codex (local repo): `git pull` in the folder.

**Q. I said "check my manual" in plain language in Claude Code, and it wasn't found.**
A. That's expected, not a bug. Since 2026-07-18, Claude Code has no natural-language auto-discovery (skills) for this tool anymore — it's **slash-command only**. Type it exactly, e.g. `/sodam-context:checkup`. Codex was always natural-language-only and is unaffected by this change — it keeps working with plain language as before.

**Q. Does it cost anything?**
A. The tool itself runs locally with no separate fee, but **using AI (Claude · Codex) is subject to each provider's pricing** (outside our scope).

---

## 16. License Copyright Commercial Use Disclaimer

> ⚖️ **This is not legal advice.** The following is general guidance; **your own review / legal review is required** before public release, distribution, or commercial use.

- **License: Apache License 2.0** © 2026 **SoDam AI Studio**.
  - **You may:** modify · copy · redistribute · **use commercially** · fork · sell · operate as a service · use in education · deliver to clients.
  - **You must:** keep the license & **copyright notice** · **state changes** · include `NOTICE` if present.
  - **Excluded:** **no warranty** · **no trademark rights granted**.
- **Disclaimer (no warranty / limited liability):** this software is provided **"AS IS"**, and we accept **no warranty or liability** for any results or damages from its use. We do **not** guarantee it is "100% legally safe".
- **Trademarks:** **"Claude Code" · "Claude"** are trademarks of Anthropic, and **"Codex"** of OpenAI. This tool merely indicates **compatibility (nominative use)** and is **not affiliated with, endorsed, or sponsored by** Anthropic or OpenAI.
- **AI usage responsibility:** using AI (Claude · Codex) is subject to **each provider's terms and pricing** (outside our license scope).
- **Ownership of outputs:** the `CLAUDE.md`·`AGENTS.md` created by Intake **belong to the user's project**; we claim no rights over them.
- **Privacy:** this tool sends no data out, but what you send to the AI provider (Claude · Codex) follows their policies. Do not put secrets or personal data in the manual.
- **Pre-release check status (for developers, as of 2026-07-13):** final license confirmation (✅ done · Apache-2.0) · copyright holder (✅ in `NOTICE`) · liability wording (✅ in `NOTICE`) · third-party source attribution (✅ zero external code dependencies, nothing borrowed) · **only the product-name trademark conflict check remains unfinished** (a quick informational search found no obvious conflict, but this is not a formal trademark search — a **human legal review is still required before public release**).

---

> 한국어 문서: `README.md` (및 `README.html`).
