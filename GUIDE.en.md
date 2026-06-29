# SoDamContext — Step-by-Step Beginner Guide 👶

> Written in a **"press this now"** style so that even **first-time** computer/AI users can follow along.
> (For a short summary, command list, and license, see `README.en.md` in the same folder.)

---

## 3 things to know first

1. This tool runs **inside Claude Code**. (Claude Code = a program where you code by chatting with AI in plain language.)
2. You only need to **install once**. After that, just type commands.
3. **"Input box"** = the line where you type in Claude Code. In this guide, "type ~ in the input box" means typing there.

---

## Step 1 · Check prerequisites (1 min)

Type this in the input box and press Enter:
```
!node --version
```
- If it shows **`v18` or higher** (e.g. v20, v22) → you're ready ✅
- If you see red text / `not found` → open a web browser, go to **nodejs.org**, click the green **LTS** button to install, then restart your computer.

---

## Step 2 · Install (one line at a time)

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

## Step 2-B · Codex users — manual install

Codex (OpenAI Codex) has no plugin marketplace, so you **copy the folders directly**.

1. **Copy these two folders** from this repository:
   - `skills/sodam-context-checkup`
   - `skills/sodam-context-intake`

2. **Paste them into `.agents/skills/` inside your project folder**:
   - Windows example: `C:\MyProject\.agents\skills\sodam-context-checkup\SKILL.md`
   - Mac example: `~/MyProject/.agents/skills/sodam-context-checkup/SKILL.md`

   *Create the `.agents` folder if it doesn't exist. Create `skills` inside it too.*

3. **Try in Codex using natural language**:
   ```
   check my AI manual
   ```
   *(Codex uses natural language, not `/commands`.)*

> **Korean character size note**: 1 Korean character = 3 bytes. Even a short-looking manual can hit Codex's 32 KiB limit. The checkup will warn you automatically.

---

## Step 3 · Restart (important!)

What you just installed appears only after a **restart**.
- Type `exit` in the input box and press Enter → **fully close** the window (the X)
- Reopen Claude Code (in a terminal, type `claude`)

Check: type just `/` in the input box. If you see **`sodam-context-checkup`** and **`sodam-context-intake`** in the list, you're ready! 🎉

---

## Step 4 · Create your first manual (Intake)

If you don't have an AI manual (`CLAUDE.md`) yet, let's make one.

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

## Step 5 · Check a manual (Checkup)

If you already have a `CLAUDE.md` in a folder:

1. Type:
   ```
   /sodam-context-checkup
   ```
2. When asked "which file?", give the file path (e.g. `C:\MyFolder\CLAUDE.md`).
3. Shortly after, you get a **plain report**:
   - Shown as a **count** like "N problems" (the score is hidden on purpose)
   - Any password/key is shown **masked** (`sk-ant-…REDACTED`) only
   - For more, answer **`why?`** and it explains the reason.

---

## Step 6 · When you get stuck (don't panic)

| If this happens | Do this |
|---|---|
| `/sodam-context-...` isn't in the list | Redo Step 3 (restart). If still missing, type `! claude plugin marketplace update sodamcontext-marketplace`, then restart again |
| Something else responds | Don't use plain language; use a command starting with **`/sodam-context-...`** |
| It says "node not found" | Go back to Step 1 and install Node.js |
| It created/edited a file without asking | 🚨 Stop and tell someone who can help (it should always ask first) |
| Codex skill doesn't work | Check Step 2-B — verify `.agents/skills/sodam-context-checkup/SKILL.md` exists |
| "Why?" button is missing | There's no button in CLI. Just type `why?` and it explains |
| Score isn't shown | Hidden on purpose — "N problems" is the count (prevents inflated scores) |
| Korean text looks broken | Check Node.js v18+. On Windows, verify terminal UTF-8 encoding |
| It says there's a password but I don't see one | The regex also flags things that look similar. It never auto-deletes — check it yourself and decide |
| Is it safe to use in auto-accept (permission) mode? | Auto-accept mode can skip the confirmation step. For safety, the default (ask) mode is recommended |
| It stopped suddenly during checkup | It's designed to stop before touching the original file. Your original is untouched |

---

## Step 7 · Safety promises (relax)

- 🔒 Passwords/keys: it confirms only that one **exists** (without reading the value) and shows it **masked**.
- ✋ It never **creates or edits** files until you say **"yes"**.
- 🙇 It does **not** promise "absolutely safe". It only catches known patterns, so manage important passwords yourself.

---

> You made it to the end — great job! 👏 For a shorter summary, commands, and license, see `README.en.md`.
