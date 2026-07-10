# SoDamContext — AI Manual Health Check 🩺

> A tool that **checks, creates, and tidies** your **"AI manual"** (`CLAUDE.md` / `AGENTS.md`)
> in plain language — **even if you don't know how to code** — so that AI (Claude Code · Codex) understands your project well.
>
> New to computers or AI? That's fine. This document is written as **one step at a time**.

> ⚠️ **Honest current status (as of 2026-07-11)**
> - **Works (live-verified in real sessions):** Checkup · Intake · Treatment · Codex checkup — **confirmed on both Claude Code and Codex**
> - **Security hardening:** writes to sensitive locations (system/credential folders) are now automatically rejected
> - **In progress (planned):** Prevention (auto pre-block), auto-sync of the two files — ready to start, not yet begun
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

> A picture-book style beginner walkthrough is in **`GUIDE.en.md`** (English) / **`GUIDE.md`** (Korean) in the same folder.

---

## 4. Quick Start

Once installed and restarted, remember just two things.

1. **You already have a manual → check it (Checkup):**
   ```
   /sodam-context-checkup
   ```
   When it asks "which file?", give the absolute path to the folder's `CLAUDE.md`.

2. **You don't have a manual yet → create one (Intake):**
   ```
   /sodam-context-intake
   ```
   Answer 5–6 easy questions; it shows a **preview → asks "create it?" → only then** makes a small manual.

> You can also say it in plain language: **"check my AI manual with sodam-context"**.

---

## 5. How to Run

This tool is **not a program you launch directly** — it works when you **call it by command / natural language** inside Claude Code · Codex.

- **Claude Code:** type a slash command in the input box. e.g. `/sodam-context-checkup`, `/sodam-context-intake`, `/sodam-context-treat`.
- **Codex:** there are no slash commands, so you call it with **natural language**. e.g. "check my AGENTS.md", "fix my manual". (Always run Codex from the **repository root folder**.)
- Giving the file to check as an **absolute path** is the most accurate. e.g. `C:\MyProject\CLAUDE.md`.

---

## 6. How to Use

### 6-1. Checkup — `✅ Works`

1. Type `/sodam-context-checkup`.
2. When asked "which file?", give the absolute path.
3. Shortly after, you get a **plain report**:
   - Shown as a **count** like "N problems" (score is hidden on purpose — prevents inflation).
   - Any password/key is shown **masked** (`sk-ant-…REDACTED`) only.
   - Items like **staleness, unrefined auto-generation, skill leakage** are shown as "suspect" (with a false-positive caveat).
   - For more, reply **`why?`** and it explains the reason and evidence.

### 6-2. Intake (create) — `✅ Works`

1. Type `/sodam-context-intake`.
2. When asked "which folder?", give the path or answer **"this folder"**.
3. Answer easy questions one at a time (what project / language & tools / a must-follow rule / something to never do / tone).
4. The AI **shows the content first** and asks "create it like this?" → only when you say **`yes`** are the files created.
5. The result is **under 200 lines, 0 secrets**. Say `yes` to "shall I run a checkup too?" to also check it.

### 6-3. Treatment (tidy) — `✅ Works (live-verified)`

1. When the checkup finds problems, type `/sodam-context-treat`.
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

---

## 8. Command List

| Command | Easy name | What it does | Status |
|---|---|---|---|
| `/sodam-context-checkup` | Checkup | Checks bloat, duplication, staleness/unrefined ("suspect"), secrets, size → plain report | ✅ Works |
| `/sodam-context-intake` | Intake | Creates a small manual via questions when none exists | ✅ Works |
| `/sodam-context-treat` | Treat | Backup → preview → after confirmation, tidies duplicates/blank lines (restore supported) | ✅ Works |
| (Prevention) | Prevent | Blocks secrets / excess length in advance | ⏳ In progress |

> In Codex, call the same features with **natural language** ("run a health check", etc.) instead of the slash commands.

---

## 9. Update Summary

<details>
<summary><b>📋 Click to expand — version history</b></summary>

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
| This manual | The plugin folder's `README.md`·`README.html` (Korean), `README.en.md`·`README.en.html` (English) |
| Beginner step-by-step guide | The plugin folder's `GUIDE.md`·`GUIDE.html` (Korean), `GUIDE.en.md`·`GUIDE.en.html` (English) |
| Codex install guide | `codex/README.ko.md` in the repo |

> The md and html documents have **identical content** (html is generated from the same md). md reads well on GitHub; html opens directly in a browser.

---

## 11. Workflow

```
Install → Restart → [Do you have a manual?]
                     ├─ No  → /sodam-context-intake → preview & confirm → create a small manual
                     └─ Yes → /sodam-context-checkup → problem report
                                     ├─ "why?" → reason & evidence
                                     └─ has problems → /sodam-context-treat
                                                        → backup → preview → confirm → tidy safely (restore possible)
```

---

## 12. Architecture

Internal structure for the technically curious. (You don't need this to use the tool.)

- **Data-driven:** checkup/treatment rules live in `rules/*.json`, not in code. To add a new check, add **one object to a JSON array** (no code change).
- **CLI–JSON boundary (the core of safety):** the AI/skill **does not read the original file directly** — it reads **only the summary JSON** emitted by `lib/checkup-cli.mjs`. Secret "values" never appear in any result or log.
- **Engine (lib) parts:** `scan-secrets` (secret detection) · `checkup-rules` (size, lint duplication, suspect detection) · `intake-verify` (output safety gate) · `treat`+`treat-verify` (tidy, safe-keyword preservation, regression check) · `backup` (atomic backup/restore) · `codex-merge` (Codex merge chain, 32 KiB) · `path-safety` (blocks writes to sensitive paths) · `checkup-cli` (orchestrator: checkup/backup/preview/apply/restore).
- **Zero dependencies:** no external npm packages (minimizes supply-chain risk). **Node 18+ ESM**, **100% local** (no network).
- **Entry points (skills) ×3:** `sodam-context-intake` · `sodam-context-checkup` · `sodam-context-treat` — shared by Claude Code and Codex.

---

## 13. Security and Data Flow

- **No secret reading (T1):** the tool never **reads or prints** a secret's "value". It only confirms one **exists** and shows it **masked** (`sk-ant-…REDACTED`). It **never auto-deletes** (false-positive risk).
- **No automatic changes (Fail-Closed):** it never **creates or edits** files until you say **"yes"**.
- **No network:** checkup, intake, and treatment run **on your computer only**. Internet is needed just for install.
- **Atomic write + backup first:** treatment writes to a temp file then renames, and **aborts immediately if the backup fails**.
- **Safe-keyword preservation:** lines with key rules ("never / forbidden / must / always / secret / force push") are **auto-preserved** (excluded from tidying).
- **Never writes to sensitive locations:** if a treatment/restore target resolves to the home directory root, a credential folder (`.ssh`, `.aws`, etc.), or a system folder, the write is **rejected automatically** with a reason before anything is touched.
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
| A different feature responds | A similarly-named plugin intercepts | Use the **`/sodam-context-...`** slash command instead of plain language |
| Checks the wrong file | "which folder?" was ambiguous | Give the exact **absolute path** of the file |
| Says there's a password | Something looks like a key in the manual | **Reissue** that key and remove it from the manual (use env vars) — the tool never deletes it automatically |
| Codex says "Cannot find module" | Run from a folder that isn't the repo root | Re-run Codex from the **repo root folder** (`SoDam-Context-Eng`) |
| Created/edited a file without asking | 🚨 Not normal | Stop and tell someone who can help (it should always ask first) |

---

## 15. FAQ

**Q. What exactly is an "AI manual"?**
A. The `CLAUDE.md` (for Claude Code) / `AGENTS.md` (for Codex) file that AI coding tools read before starting — a note that says "handle this project like this."

**Q. Does my file content go out to the internet?**
A. No. Checkup, intake, and treatment run **100% on your computer**. Internet is only needed for install.

**Q. Does it delete passwords automatically?**
A. **No.** It only confirms one **exists** and shows it **masked** — it never auto-deletes (false-positive risk). Check and reissue it yourself.

**Q. Why is no score shown?**
A. Unverified scores can be misleading, so they're **hidden on purpose.** You see "N problems" instead.

**Q. Korean text looks broken.**
A. Check that Node.js is v18+. On Windows, verify the terminal is using UTF-8 encoding.

**Q. Is it safe to use in auto-accept (permission) mode?**
A. Auto-accept mode can skip the confirmation step. For safety, the default (ask) mode is recommended.

**Q. Can I use Claude Code and Codex together?**
A. Yes. In the same project, Claude Code reads `CLAUDE.md` and Codex reads `AGENTS.md`. The two files coexist fine.

**Q. How do I update?**
A. Claude Code: `! claude plugin marketplace update sodamcontext-marketplace`, then restart. Codex (local repo): `git pull` in the folder.

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
- **Pre-release check status (for developers, as of 2026-07-11):** final license confirmation (✅ done · Apache-2.0) · copyright holder (✅ in `NOTICE`) · liability wording (✅ in `NOTICE`) · third-party source attribution (✅ zero external code dependencies, nothing borrowed) · **only the product-name trademark conflict check remains unfinished** (a quick informational search found no obvious conflict, but this is not a formal trademark search — a **human legal review is still required before public release**).

---

> For a detailed **step-by-step beginner walkthrough**, see **`GUIDE.en.md`** (English) / **`GUIDE.md`** (Korean) in the same folder.
> 한국어 문서: `README.md`, `GUIDE.md` (및 `.html` 버전).
