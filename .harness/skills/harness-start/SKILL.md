---
name: harness-start
description: Single entry point for a person with little software experience. Use when the user says "harness-start", "começar", "quero criar", "quero mudar", "o que faço agora", or describes an idea, feature, or bug without naming a workflow. Diagnoses the project state and routes to the smallest safe path.
---

The person may not know software terms. Speak in `owner_locale` from `.harness/project.yaml` (default Portuguese), in short sentences, one question at a time. Explain any technical word the first time you use it. Keep code, file names, and commands in English.

## 1. Read the state (do not ask what you can check)

- Run `npm run harness -- doctor` and `git status --short --branch`.
- Application exists when `package.json` has a `react` dependency (the stable marker; do not match doctor's wording).
- Read the first line of `.harness/memory/handoffs/CURRENT.md`; open the rest only when it does not say `Status: no active handoff`.

Then:

- A `✖` item in doctor → help fix it first, one item at a time, using the command doctor prints. Installs and anything in `.env.local` are done by the person; give exact steps.
- An active handoff → summarize it in two lines and ask whether to continue it.
- Already on a `feature/`, `fix/`, or `chore/` branch with related work → stay on it. On `main` with a request that changes files → `git switch -c <feature|fix|chore>/<short-name>` (if the name exists, `git switch <name>`).

## 2. Understand the request

Ask at most three questions, only about what changes the outcome: who uses it, what they must be able to do, and what "done" looks like. Offer examples instead of open questions when the person seems unsure.

## 3. Route by size

| Situation | Path |
| --- | --- |
| No application yet | Confirm the first user journey in one paragraph, then `npm run harness -- init-app` and walk the person through its printed steps. |
| Typo, text, color, or other obvious low-risk fix | `direct`: follow `.harness/workflows/quick-change.md`; no work-item file. |
| One clear feature or bug | `session`: create a work item from `.harness/templates/work-item.md`, then `harness-feature-delivery`. |
| Vague idea, several screens, payments, new user roles, or personal data | Upstream: `harness-upstream-bmad` (start with `bmad-brainstorming` or `bmad-product-brief`). |
| Tables, columns, or who can see which data | Add `harness-database-steward` and `harness-supabase-security` to the path. |
| Something broke, tests fail, or the person is lost | `harness-recovery`. |
| Work is done and verified | `harness-git-pr-delivery`. |
| A "Nova versão do Harness" issue or update PR | `.harness/workflows/harness-update.md`. |

State the chosen path and why in one sentence before starting. Never pick a smaller size to skip a safety gate.

## 4. Close every session the same way

End with: what changed (plain language), how to see it (`pnpm dev` URL or preview link), what is still open, and the single next step. When pausing unfinished work, write `.harness/memory/handoffs/CURRENT.md`.
