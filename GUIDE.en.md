# SoDamContext — Step-by-Step Beginner Guide 👶

> Written in a **"press this now"** style so that even **first-time** computer/AI/messenger/smartphone users can follow along.
> (For a short summary, command list, architecture, and full license, see `README.en.md` in the same folder.)

> ⚠️ **Honest note (as of 2026-07-11):** Three features **work now: Checkup, Intake (create), and Treatment (tidy)** — **verified in real use on both Claude Code and Codex**. **Prevention (auto-block) and auto-sync are in progress (planned).** This tool runs on a **computer (Windows · macOS)** — it is not a phone app.

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

> **Korean character size note**: 1 Korean character = 3 bytes. Even a short-looking manual can hit Codex's 32 KiB limit. The checkup will warn you automatically.

---

## Step 3 Restart

What you just installed appears only after a **restart**.
- Type `exit` in the input box and press Enter → **fully close** the window (the X)
- Reopen Claude Code (in a terminal, type `claude`)

Check: type just `/` in the input box. If you see **`sodam-context-checkup`**, **`sodam-context-intake`**, and **`sodam-context-treat`** in the list, you're ready! 🎉

---

## Step 4 Create Your Manual

If you don't have an AI manual (`CLAUDE.md`) yet, let's make one. (This feature = **Intake**.)

1. Type:
   ```
   /sodam-context-intake
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
   /sodam-context-checkup
   ```
2. When asked "which file?", give the file path (e.g. `C:\MyFolder\CLAUDE.md`).
3. Shortly after, you get a **plain report**:
   - Shown as a **count** like "N problems" (the score is hidden on purpose)
   - Any password/key is shown **masked** (`sk-ant-…REDACTED`) only
   - Items like staleness/unrefined are shown as **"suspect"** (for reference, not confirmed)
   - For more, answer **`why?`** and it explains the reason.

---

## Step 6 Tidy

If the checkup found problems, you can tidy safely. (This feature = **Treatment**, new.)

1. Type:
   ```
   /sodam-context-treat
   ```
2. It **backs up first** and **shows what it will change**.
3. It edits **only after you say `yes`** (removes duplicate lines / unnecessary blank lines).
4. If you don't like it, use **restore** to roll back to the backup.
5. **Safety/forbidden rule lines** (e.g. "never", "no passwords") are **auto-preserved** (never removed).
6. **It can't touch the wrong place:** if you accidentally point it at an important system folder (like one holding your login credentials), it notices ahead of time and **refuses**.

> ⚠️ Treatment is still "new", so for your first use, keep **a separate copy of important files**.

---

## Step 7 When You Get Stuck

Don't panic. Just follow the table.

| If this happens | Do this |
|---|---|
| `/sodam-context-...` isn't in the list | Redo Step 3 (restart). If still missing, type `! claude plugin marketplace update sodamcontext-marketplace`, then restart again |
| Something else responds | Don't use plain language; use a command starting with **`/sodam-context-...`** |
| It says "node not found" | Go back to Step 1 and install Node.js |
| It created/edited a file without asking | 🚨 Stop and tell someone who can help (it should always ask first) |
| Codex "Cannot find module" error | Re-run Codex from the **repo root folder** (`SoDam-Context-Eng`) |
| "Why?" button is missing | There's no button in CLI. Just type `why?` and it explains |
| Score isn't shown | Hidden on purpose — "N problems" is the count (prevents inflated scores) |
| Korean text looks broken | Check Node.js v18+. On Windows, verify terminal UTF-8 encoding |
| It says there's a password but I don't see one | The regex also flags things that look similar. It never auto-deletes — check it yourself and decide |
| Is it safe in auto-accept (permission) mode? | Auto-accept mode can skip the confirmation step. For safety, the default (ask) mode is recommended |
| It stopped suddenly during checkup | It's designed to stop before touching the original file. Your original is untouched |

---

## Step 8 Safety Promises

Here are the promises this tool keeps. Relax.

- 🔒 **Passwords/keys:** it confirms only that one **exists** (without reading the value) and shows it **masked**. It **never auto-deletes**.
- ✋ **Ask first:** it never **creates or edits** files until you say **"yes"**.
- 🌐 **No internet:** checkup, intake, and treatment run **on your computer only** (internet only for install).
- ♻️ **Edits safely:** treatment backs up first and writes via a temp file, so your original isn't corrupted if it stops midway.
- 🔍 **Only looks at one file:** Codex checks up through parent folders too, but Claude Code currently checks **only the one file you point it at**. If you've split rules across multiple folders, check each one separately.
- 🙇 **No "absolutely safe" promise:** it only catches known patterns, so manage important passwords yourself.

> Data flow (simply): the tool reads the original **only internally** and passes the AI just a **summary (no secret values)**. That's why secrets don't leak.

---

## Update Summary

<details>
<summary><b>📋 Click to expand — what changed</b></summary>

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
