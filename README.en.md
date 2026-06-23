# SoDamContext — AI Manual Health Check 🩺

> A tool that **checks and creates** your **"AI manual"** (`CLAUDE.md` / `AGENTS.md`)
> in plain language — **even if you don't know how to code** — so that AI (Claude Code · Codex) understands your project well.

---

## 0. What is this? (1-minute intro)

- AI coding tools (Claude Code · Codex) read an **"AI manual"** file called **`CLAUDE.md` / `AGENTS.md`** before they work.
- If that manual is **too long, contains a password/secret, or contradicts itself**, the AI gets confused and costs go up.
- **SoDamContext** gives that manual a **health check in plain language**, and if you don't have one, **creates a small one from a few easy questions**.
- It hides jargon (`CLAUDE.md` → **"AI manual"**) and explains the real reason when you ask **"why?"**.

> ⚠️ **Honest note:** In this version, **only two features actually work: "Checkup" and "Intake (create)".**
> "Treatment (auto-trim)", "Prevention (auto-block)", and "auto-sync of the two files" are **still in progress (planned)**.

---

## 1. Prerequisites (required programs)

| Requirement | Why | How to check / install |
|---|---|---|
| **Claude Code** | Where this tool runs | OK if you already use it |
| **Node.js 18+** | The checkup tool runs Node internally | Type `!node --version` — if it shows `v18` or higher, you're set. Otherwise install **LTS** from [nodejs.org](https://nodejs.org) |
| (optional) **Codex** | Only if you also manage Codex's `AGENTS.md` | Codex users only |

- OS: works on **Windows and macOS**. (Path examples here are Windows-based.)
- Internet: needed only for installation. Checkup and Intake run **100% on your own computer** (no data is sent out).

---

## 2. Download · Install

### Claude Code (automatic install)
Paste the following into the Claude Code **input box** (the chat line), **one line at a time**, pressing Enter.

```
/plugin marketplace add sodam-ai/SoDam-Context-Eng
/plugin install sodam-context
```
- Or just type `/plugin` to open the **menu**, find SoDamContext, and click **Install**.
- **After installing, fully close and reopen Claude Code (restart).** Otherwise the commands won't appear.

> 💡 **Using a local folder directly** (development/testing): replace `sodam-ai/SoDam-Context-Eng` with **the absolute path of that folder**.
> e.g. `/plugin marketplace add D:\...\SoDam-Context-Eng`

### Codex (manual install — partial support)
Codex has no marketplace, so you **place the skill folder under `.agents/skills`**. (Codex support is currently **partial** — detailed guide coming soon.)

---

## 3. Quick Start (5 minutes)

After install and restart:

1. **Just check** — in the input box:
   ```
   /sodam-context-checkup
   ```
   When it asks "which file?", give the path to the `CLAUDE.md` of the folder you want to check.

2. **No manual yet (create one)** — in the input box:
   ```
   /sodam-context-intake
   ```
   Answer 5–6 easy questions; it shows a **preview → asks "create it?" → only then** makes a small manual.

> You can also say it in plain language: **"check my AI manual with sodam-context"**.

---

## 4. Command List

| Command | Easy name | What it does | Status |
|---|---|---|---|
| `/sodam-context-checkup` | Checkup | Checks the manual for bloat, duplication, **secrets**, size → plain report | ✅ Works |
| `/sodam-context-intake` | Intake | Creates a small manual via questions when none exists | ✅ Works |
| (Treatment) | Treat | Backs up, then safely trims | ⏳ In progress |
| (Prevention) | Prevent | Blocks secrets / excess length in advance | ⏳ In progress |

---

## 5. How it works

- **Checkup**: the tool **does not open your original file directly** — it runs an internal checker and reads **only the result**. So **secrets do not leak**. The report shows **"N problems" instead of a score**, and any secret is shown **masked (`sk-ant-…REDACTED`)**. Reply **"why?"** for the reason and evidence.
- **Intake**: questions → **preview → "create it?" confirmation → only then writes the file**. It never creates files without asking. The result is **under 200 lines, 0 secrets**.
- **Codex (`AGENTS.md`)**: Codex reads the **merged chain** of parent-folder and global manuals. The checkup verifies that **combined size (32KiB limit)** too. (Korean is 3 bytes per character, so byte size exceeds character count.)

---

## 6. Workflow

```
Install → Restart → [Do you have a manual?]
                     ├─ No  → /sodam-context-intake → create a small manual
                     └─ Yes → /sodam-context-checkup → problem report
                                     └─ "why?" → reason & evidence
```

---

## 7. File · Document locations

| What | Location (Windows example) |
|---|---|
| Check/create target | `CLAUDE.md` · `AGENTS.md` in **your working project folder** |
| (Treatment) backup folder | `<project folder>\.sodamcontext\backups\` (treatment in progress) |
| This manual | `README.md` · `GUIDE.md` in the plugin folder (KO/EN, md·pdf) |

---

## 8. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Commands not in the list | **Did not restart** after install | **Fully close and reopen** Claude Code |
| Still not visible after restart | Installed copy not refreshed | Run `! claude plugin marketplace update sodamcontext-marketplace`, then restart |
| "node not found" | Node.js missing/old | Install LTS from [nodejs.org](https://nodejs.org), then restart |
| A different feature responds | A similarly-named plugin intercepts | Use the **`/sodam-context-...`** slash command instead of plain language |
| Checks the wrong file | "which folder?" was ambiguous | Give the exact **absolute path** of the file |
| Says there's a password | Something looks like a key in the manual | **Reissue** that key and remove it from the manual (use env vars) — the tool never deletes it automatically |

---

## 9. Uninstall

```
/plugin uninstall sodam-context
```
- Generated `CLAUDE.md`·`AGENTS.md` are **your files** and remain (delete them yourself if you wish).

---

## 10. Safety · Security (one-liners)

- **No secret reading**: the tool never reads or prints a secret's "value"; it only confirms one **exists** and shows it **masked**.
- **No automatic changes**: it never creates or edits files without your confirmation.
- **Honest limits**: it only catches **known patterns**, so it does **not guarantee "100% safe / perfect detection"** (for reference only). Reissue/manage important keys yourself.

---

## 11. License · Copyright · Commercial Use · Disclaimer

> ⚖️ **This is not legal advice.** The following is general guidance; **your own review / legal review is required** before public release, distribution, or commercial use.

- **License: Apache License 2.0** © 2026 **SoDam AI Studio**.
  - **You may**: modify · copy · redistribute · **use commercially** · fork · sell · operate as a service · use in education · deliver to clients.
  - **You must**: keep the license & **copyright notice** · **state changes** · include `NOTICE` if present.
  - **Excluded**: **no warranty** · no trademark rights granted.
- **Disclaimer (no warranty / limited liability)**: this software is provided **"AS IS"**, and we accept **no warranty or liability** for any results or damages from its use. We do **not** guarantee it is "100% legally safe".
- **Trademarks**: **"Claude Code" · "Claude"** are trademarks of Anthropic, and **"Codex"** of OpenAI. This tool merely indicates **compatibility (nominative use)** and is **not affiliated with, endorsed, or sponsored by** Anthropic or OpenAI.
- **AI usage responsibility**: using AI (Claude · Codex) is subject to **each provider's terms and pricing** (outside our license scope).
- **Ownership of outputs**: the `CLAUDE.md`·`AGENTS.md` created by Intake **belong to the user's project**; we claim no rights over them.
- **Pre-release checks (for developers)**: final license confirmation · copyright holder · product-name trademark conflicts · liability wording · third-party source attribution (NOTICE) are subject to **legal review before public release**.

---

> For a detailed **step-by-step beginner walkthrough**, see **`GUIDE.en.md`** in the same folder. (한국어: `README.md`, `GUIDE.md`)
