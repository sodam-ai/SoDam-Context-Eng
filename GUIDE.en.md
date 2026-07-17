# SoDamContext — Step-by-Step Beginner Guide 👶

> Written in a **"press this now"** style so that even **first-time** computer/AI/messenger/smartphone users can follow along.
> (For a short summary, command list, architecture, and full license, see `README.en.md` in the same folder.)

> ⚠️ **Honest note (as of 2026-07-18):** Five features **are verified working: Checkup, Intake (create), Treatment (tidy), Sync (compare the two files), and Prevention (auto-block before saving)** — **verified in real use on both Claude Code and Codex**. **The freshness reminder and reference health score** are fully coded and confirmed by automated tests and direct command-line runs, but we haven't yet confirmed they show up naturally on the real chat screen. **⚠️ How you call this changed in Claude Code (2026-07-18):** plain language ("check my manual") used to sometimes work; now it works **only** when you type the **exact slash command**, e.g. `/sodam-context:checkup`. **Codex is unaffected** — it still works with natural language exactly as before. This tool runs on a **computer (Windows · macOS)** — it is not a phone app.

---

## Table of Contents

- [Things to Know First](#things-to-know-first)
- [Step 1 Check Prerequisites](#step-1-check-prerequisites)
- [Step 2 Install](#step-2-install)
- [Step 2-B Codex Manual Install](#step-2-b-codex-manual-install)
- [Step 3 Restart](#step-3-restart)
- [Step 4 Create Your Manual](#step-4-create-your-manual)
- [Step 5 Check a Manual](#step-5-check-a-manual)
- [Step 6 Tidy](#step-6-tidy)
- [Step 6-B Match the Two Manuals (Sync)](#step-6-b-match-the-two-manuals-sync)
- [Step 7 When You Get Stuck](#step-7-when-you-get-stuck)
- [Step 8 Safety Promises](#step-8-safety-promises)
- [Update Summary](#update-summary)
- [FAQ](#faq)
- [License Note](#license-note)

---

## Things to Know First

1. This tool runs **inside Claude Code**. (Claude Code = a computer program where you code by chatting with AI in plain language.)
2. You only need to **install once**. After that, just type commands.
3. **"Input box"** = the line where you type in Claude Code. In this guide, "type ~ in the input box" means typing there.

> 💡 What's an "AI manual"? The `CLAUDE.md` · `AGENTS.md` file the AI reads before working — a note that says "handle this project like this."

---

## Step 1 Check Prerequisites

Type this in the input box and press Enter:
```
!node --version
```
- If it shows **`v18` or higher** (e.g. v20, v22) → you're ready ✅
- If you see red text / `not found` → open a web browser, go to **nodejs.org**, click the green **LTS** button to install, then restart your computer.

(If you'll also use Codex, type `!git --version` and check a number shows. Otherwise install from **git-scm.com**.)

---

## Step 2 Install

Paste these **two lines, one at a time**, pressing Enter after each:
```
/plugin marketplace add sodam-ai/SoDam-Context-Eng
```
```
/plugin install sodam-context
```
- A message like "installed" means success.
- *(For a direct local-folder install, replace `sodam-ai/SoDam-Context-Eng` on the first line with that folder's path.)*

---

## Step 2-B Codex Manual Install

Codex (OpenAI Codex) has no plugin marketplace, so you **clone the whole repository and run inside it**.
(If you copy only the skill folders, the `lib` and `rules` folders the checker needs are missing, and you'll get a "file not found" error.)

1. **Get the repository** — in a terminal, one line at a time:
   ```
   git clone https://github.com/sodam-ai/SoDam-Context-Eng.git
   cd SoDam-Context-Eng
   ```
   *(If you already have the folder, just move into it.)*

2. **Start Codex from this repository's root folder.** (The root has `AGENTS.md`, `skills`, `lib`, and `rules`.)
   ⚠️ Running from a different folder causes a "file not found" error.

3. **Try in Codex using natural language**:
   ```
   check my AGENTS.md
   ```
   - Give the file to check as an **absolute path** (e.g. `C:\MyProject\AGENTS.md`).
   - *(Codex uses natural language, not `/commands`.)*
   - For a fuller install guide + FAQ, see **`codex/README.ko.md`** in the repo.

> 💡 **One-click install (optional, Windows):** running `codex/install.ps1` from the repo automates step 1 above (prerequisite check, get the repository, create `AGENTS.md`). The repository is **private**, so you must do the `git clone` in step 1 manually once to get the script itself.

> **Korean character size note**: 1 Korean character = 3 bytes. Even a short-looking manual can hit Codex's 32 KiB limit. The checkup will warn you automatically.

---

## Step 3 Restart

What you just installed appears only after a **restart**.
- Type `exit` in the input box and press Enter → **fully close** the window (the X)
- Reopen Claude Code (in a terminal, type `claude`)

Check: type just `/` in the input box. If you see **`sodam-context:checkup`**, **`sodam-context:intake`**, **`sodam-context:treat`**, and **`sodam-context:sync`** in the list, you're ready! 🎉

---

## Step 4 Create Your Manual

If you don't have an AI manual (`CLAUDE.md`) yet, let's make one. (This feature = **Intake**.)

1. Type:
   ```
   /sodam-context:intake
   ```
2. When asked "which folder?", give the folder path or answer **"this folder"**.
3. The AI asks easy questions **one at a time**. If stuck, you can answer like this:

   | Question | You can answer |
   |---|---|
   | What project is this? | `just practice` |
   | What language/tools? | `not sure` |
   | A must-follow rule? | `answer in Korean` |
   | Something to never do? | `don't put passwords in code` |
   | Tone? | `simple and short` |

4. The AI **shows you the content first** and asks "create it like this?".
   → If you like it, answer **`yes`** and the files are created then. (It never creates before asking.)
5. When "Created!" appears, you're done. If it asks "shall I run a checkup too?", answer `yes` to also check it.

---

## Step 5 Check a Manual

If you already have a `CLAUDE.md` in a folder: (This feature = **Checkup**.)

1. Type:
   ```
   /sodam-context:checkup
   ```
2. When asked "which file?", give the file path (e.g. `C:\MyFolder\CLAUDE.md`).
3. Shortly after, you get a **plain report**:
   - Shown as a **count** like "N problems", front and center
   - Any password/key is shown **masked** (`sk-ant-…REDACTED`) only
   - Items like staleness/unrefined are shown as **"suspect"** (for reference, not confirmed)
   - **Wholesale paste-ins** (an overly long code block pasted in as-is) are flagged as a **"confirmed"** problem (judged by length alone, content is never read)
   - A **reference score** (e.g. "85 pts") is added after the count, always paired with the **"reference only (unvalidated)"** label (meaning it isn't a formula tuned on real, diverse usage data yet)
   - If it's been **over 30 days** since your last checkup, you'll get a short "want to check again?" note (not a background alert — it only compares the moment you run a checkup; no note if it's under 30 days)
   - For more, answer **`why?`** and it explains the reason.

---

## Step 6 Tidy

If the checkup found problems, you can tidy safely. (This feature = **Treatment**, new.)

1. Type:
   ```
   /sodam-context:treat
   ```
2. It **backs up first** and **shows what it will change**.
3. It edits **only after you say `yes`** (removes duplicate lines / unnecessary blank lines).
4. If you don't like it, use **restore** to roll back to the backup.
5. **Safety/forbidden rule lines** (e.g. "never", "no passwords") are **auto-preserved** (never removed).
6. **It can't touch the wrong place:** if you accidentally point it at an important system folder (like one holding your login credentials), it notices ahead of time and **refuses**.

> ⚠️ Treatment is still "new", so for your first use, keep **a separate copy of important files**.

---

## Step 6-B Match the Two Manuals (Sync)

**If you use both a Claude Code manual (`CLAUDE.md`) and a Codex manual (`AGENTS.md`)**, this step checks whether they hold different safety rules. (This feature = **Sync**, live-verified.)

1. Type:
   ```
   /sodam-context:sync
   ```
2. Give the paths of the two files to compare (e.g. `CLAUDE.md` and `AGENTS.md`).
3. It reports things like **"this rule is only in the Claude manual (line N)"**.
4. **It does not edit either file for you** — you decide which side to match and copy it over by hand. This is by design, to avoid accidentally changing other content.

> 💡 If you only use one AI tool (only Claude Code, or only Codex), you can skip this step.

---

## Step 7 When You Get Stuck

Don't panic. Just follow the table.

| If this happens | Do this |
|---|---|
| `/sodam-context:...` isn't in the list | Redo Step 3 (restart). If still missing, type `! claude plugin marketplace update sodamcontext-marketplace`, then restart again |
| Something else responds | Don't use plain language; use a command starting with **`/sodam-context:...`** |
| It says "node not found" | Go back to Step 1 and install Node.js |
| It created/edited a file without asking | 🚨 Stop and tell someone who can help (it should always ask first) |
| Codex "Cannot find module" error | Re-run Codex from the **repo root folder** (`SoDam-Context-Eng`) |
| "Why?" button is missing | There's no button in CLI. Just type `why?` and it explains |
| Score isn't shown | Hidden on purpose — "N problems" is the count (prevents inflated scores) |
| Korean text looks broken | Check Node.js v18+. On Windows, verify terminal UTF-8 encoding |
| It says there's a password but I don't see one | The regex also flags things that look similar. It never auto-deletes — check it yourself and decide |
| Is it safe in auto-accept (permission) mode? | Auto-accept mode can skip the confirmation step. For safety, the default (ask) mode is recommended |
| It stopped suddenly during checkup | It's designed to stop before touching the original file. Your original is untouched |
| Restore refuses with "not a backup file location" | The file you pointed to isn't a real backup this tool made (this is the safety feature working, not a bug) | Use the backup path shown to you in Step 6 |

---

## Step 8 Safety Promises

Here are the promises this tool keeps. Relax.

- 🔒 **Passwords/keys:** it confirms only that one **exists** (without reading the value) and shows it **masked**. It **never auto-deletes**.
- ✋ **Ask first:** it never **creates or edits** files until you say **"yes"**.
- 🌐 **No internet:** checkup, intake, and treatment run **on your computer only** (internet only for install).
- ♻️ **Edits safely:** treatment backs up first and writes via a temp file, so your original isn't corrupted if it stops midway.
- 🔍 **Only looks at one file:** Codex checks up through parent folders too, but Claude Code currently checks **only the one file you point it at**. If you've split rules across multiple folders, check each one separately.
- 🛡️ **Restore source is checked too (added 2026-07-13):** "Restore" only uses files inside the tool's own backup folder. Pointing it at any other file, pretending it's a backup, is refused — this stops the wrong content from accidentally being copied into your manual.
- 🛑 **Prevents before saving (confirmed live 2026-07-17):** if your manual gets a real secret or grows too long (300+ lines / 32KB+), it's blocked before saving; a borderline length (200–299 lines) triggers "still save this?". **We've now directly confirmed in a real usage session that this prompt genuinely appears** when saving a 252-line file.
- 🗓️ **The freshness reminder stores no content either (added 2026-07-15):** the "when was this last checked" record keeps only the file path and a timestamp. Your manual's actual content never goes into this record.
- 🔢 **The reference score isn't a hidden calculation (added 2026-07-15):** it doesn't re-read your file to make the score — it calculates on the spot from the problem count the checkup already found, and the formula (confirmed = −15 pts, suspect = −5 pts) is fully disclosed.
- 🙇 **No "absolutely safe" promise:** it only catches known patterns, so manage important passwords yourself.

> Data flow (simply): the tool reads the original **only internally** and passes the AI just a **summary (no secret values)**. That's why secrets don't leak.

---

## Update Summary

<details>
<summary><b>📋 Click to expand — what changed</b></summary>

**After 0.1.0 (in progress, 2026-07-18)**

- **Changed how Claude Code calls this:** removed the old form that sometimes worked via plain language, so now you must type the **exact slash command**, e.g. `/sodam-context:checkup` (done to remove confusion). **Codex is unchanged** — plain language still works.

**After 0.1.0 (in progress, 2026-07-17)**

- **Confirmed Prevention (auto-block before saving) actually works live:** what used to be "the parts are right, but we haven't seen it fire live" is now directly confirmed — saving a 252-line file in a real session triggered the confirmation prompt exactly as designed.

**After 0.1.0 (in progress, 2026-07-16)**

- **Now flags "wholesale paste-ins" as a confirmed problem:** an overly long code block (15+ lines) pasted in as-is is flagged by **length alone** — content is never read.
- **Added a one-click Codex install script (`codex/install.ps1`, Windows):** automates the prerequisite check, getting the repo, and creating `AGENTS.md`.
- **Test suite expanded to 142**, all passing.

**After 0.1.0 (in progress, 2026-07-15)**

- **Now remembers "when was this last checked":** if it's been over 30 days, the next checkup gently suggests checking again. No content is stored, only the date.
- **Added a reference score (health score):** a supplementary "85 pts"-style score now appears after the checkup result. Since it isn't a validated formula yet, it's always labeled "reference only".
- **Fixed an old safety rule that said "never show a score"**, which had drifted out of sync with the new reference-score feature above.
- **Test suite expanded to 134**, all passing.

**After 0.1.0 (in progress, 2026-07-13)**

- **Found and fixed a real issue during a security review:** Restore would copy any file you pointed it at, even if it wasn't a real backup. Fixed so restore only works with files from the tool's own backup folder.
- **Fixed treatment/restore failing on a different drive:** if your project isn't on drive C, this could fail — a real user hit this, and it's now fixed.
- **Unified inconsistent wording across documents:** Prevention and Sync status descriptions no longer contradict each other between documents.
- **Test suite expanded to 118**, all passing.

**After 0.1.0 (in progress, 2026-07-11)**

- Treatment and Codex checkup have now been **run and verified in real use** (previously confirmed only by automated tests).
- **New safeguard:** if you accidentally point it at an important system or credential folder, it notices ahead of time and refuses.
- Fixed a checkup accuracy issue that could occur with a custom Codex setup.
- License finalized as Apache 2.0.
- Automated tests grew from 67 to **82** for more thorough checking.

**After 0.1.0 (2026-07-07)**

- Checkup now also flags **"staleness / unrefined / skill leakage"** as "suspect" (with line numbers).
- Fixed the treatment **restore** bug (it now restores correctly).
- Unified the Codex install method to **the one that actually works**.
- Updated README·GUIDE (KO/EN) to honestly match current abilities; PDFs removed, replaced by HTML.

**0.1.0 (2026-06-28) — first release**

- Core Checkup / Intake / Treatment, Codex support (merge chain, size check), KO/EN docs, Apache-2.0 license.

</details>

---

## FAQ

**Q. Does my file go out to the internet?** → No. It runs **on your computer only**.

**Q. Does it delete passwords automatically?** → No. It only confirms one **exists** and shows it **masked**. Reissue it yourself.

**Q. Does it work on a smartphone?** → No. Only inside Claude Code · Codex on a **computer (Windows · Mac)**.

**Q. Can I use Claude Code and Codex together?** → Yes. Claude Code reads `CLAUDE.md`, Codex reads `AGENTS.md`. They coexist fine.

**Q. Does it cost anything?** → The tool itself runs free, but **AI usage (Claude · Codex)** follows each provider's pricing.

**Q. I said "check my manual" in plain language in Claude Code and it wasn't found.** → That's expected, not a bug. Since 2026-07-18, Claude Code works **only via slash commands** — type it exactly, e.g. `/sodam-context:checkup`. Codex was always natural-language-only and keeps working as before.

**Q. Can I trust the reference score (health score)?** → The **"reference only (unvalidated)"** label that's always shown with it is the honest answer — it's not an official score yet, just a **helpful extra**. The real information is "N problems"; the score is a small addition after that.

---

## License Note

> ⚖️ **This is not legal advice.** Your own review / legal review is required before public release, distribution, or commercial use.

- **License: Apache License 2.0** © 2026 **SoDam AI Studio**. You may modify · copy · redistribute · **use commercially** · fork · sell · run as a service · use in education · deliver. You must keep the license & **copyright notice**, **state changes**, and include `NOTICE`. **No warranty**; no trademark rights granted.
- **Disclaimer:** provided "AS IS", with **no warranty or liability** for results/damages. No "100% safe" guarantee.
- **Trademarks:** "Claude Code" · "Claude" are Anthropic's, "Codex" is OpenAI's. This tool is **nominative-use compatibility only** and **not affiliated / endorsed**.
- **Ownership of outputs:** the `CLAUDE.md` · `AGENTS.md` created by Intake are **yours**.

> For full license/copyright/commercial terms, see `README.en.md` section 16 and the `LICENSE` · `NOTICE` files.

---

> You made it to the end — great job! 👏 For a shorter summary, commands, architecture, and full license, see `README.en.md`. (한국어: `README.md`, `GUIDE.md`)
