---
name: harness-feature-delivery
description: Deliver a React and Supabase feature through a scoped work item, test-first implementation, verification evidence, and review-ready handoff. Use when implementing a feature, bug fix, or behavior change in this repository.
---

1. **Size it.** `direct` (clear, reversible, tiny: no work-item file), `session` (one bounded outcome), `story`/`epic` (upstream-planned). Never downsize to skip a gate.
2. **Work item.** For `session` and larger, create one from `.harness/templates/work-item.md`; fill only the sections that apply. Readiness `FAIL` blocks work; `CONCERNS` need the owner's accepted condition.
3. **Branch.** Never work on `main`. Stay on the current `feature/`/`fix/`/`chore/` branch when it holds this work; otherwise `git switch -c feature/<name>` (or `git switch <name>` if it exists).
4. **Context, cheaply.** Start from the work item (and approved handoff when upstream-backed). Use the `harness-scout` subagent when available to locate files instead of reading broadly. Search `.harness/memory/` by domain terms; read only matches. Open `_bmad-output/` only for a mapped, unresolved decision.
5. **Specialists only when touched.** Schema → `harness-database-steward`. Who can read/write data → `harness-supabase-security` (access matrix first). Screens → `harness-ux-tdd`.
6. **Red.** Write the smallest behavior test; run it; confirm it fails for the expected reason. Record the command and the one-line failure.
7. **Green.** Implement the minimum to pass. Then refactor with tests green.
8. **Verify.** `npm run harness -- verify` (full) before review; it prints only failures and keeps logs in `.harness/logs/`. Do not paste whole logs into the conversation or the work item.
9. **Review.** Non-trivial, security, data, authorization, migration, or public-interface changes get a fresh-context review (`bmad-code-review` when installed) given only the diff, acceptance criteria, and risks. Record findings and dispositions.
10. **Course-correct.** If the work invalidates a requirement, UX, or architecture decision, stop and route upstream.
11. **Record.** Fill the work item's Evidence section: files changed, red/green commands with one-line results, verify result (including skipped gates), review outcome, course-correction record, remaining risks. Capture memory only for a durable decision, gotcha, or procedure.
12. **Hand off.** When ready, use `harness-git-pr-delivery`.

Code and developer-facing text are English; user-facing copy follows the product locale with English translation keys.
