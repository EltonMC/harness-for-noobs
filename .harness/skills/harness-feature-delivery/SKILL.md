---
name: harness-feature-delivery
description: Deliver a React and Supabase feature through a scoped work item, test-first implementation, verification evidence, and review-ready handoff. Use when implementing a feature, bug fix, or behavior change in this repository.
---

1. **Size it.** `direct` (clear, reversible, tiny: no work-item file), `session` (one bounded outcome), `story`/`epic` (upstream-planned). Never downsize to skip a gate.
2. **Work item.** For `session` and larger, create one from `.harness/templates/work-item.md`; fill only the sections that apply. Readiness `FAIL` blocks work; `CONCERNS` need the owner's accepted condition.
3. **Branch.** Never work on `main`. Stay on the current `feature/`/`fix/`/`chore/` branch when it holds this work; otherwise `git switch -c feature/<name>` (or `git switch <name>` if it exists).
4. **Context, cheaply.** Read `.harness/context/code-conventions.md` before writing application code, every time. Start from the work item (and approved handoff when upstream-backed). Use the `harness-scout` subagent when available to locate files and **existing code to reuse** instead of reading broadly. Search `.harness/memory/` by domain terms; read only matches. Open `_bmad-output/` only for a mapped, unresolved decision.
5. **Specialists only when touched.** Schema → `harness-database-steward`. Who can read/write data, sign-in, Storage, or Edge Functions → `harness-supabase-security` (access matrix first). Screens → `harness-ux-tdd`.
   **Threat model.** When the work touches sign-in, personal data, payments, file uploads, admin actions, third-party services, or Edge Functions, fill the work item's Security section using `.harness/context/security-patterns.md`; each mitigation gets a test.
6. **Plan the shape.** Before the first test, write in the work item's Footprint which files you will add or change, following the conventions' structure (`features/<feature>/{api,hooks,components}`, `shared/`), and which existing code you will reuse.
7. **Red.** Write the smallest behavior test; run it; confirm it fails for the expected reason. Record the command and the one-line failure.
8. **Green.** Implement the minimum to pass.
9. **Refactor.** With tests green, walk the refactor checklist at the end of `code-conventions.md`: duplication, domain names, logic out of JSX, size, dead code (`pnpm knip`), and every UX state covered. Rerun the focused tests.
10. **Verify.** `npm run harness -- verify` (full) before review: lint, types, Knip, tests with coverage thresholds, build, bundle secrets, and database gates. It prints only failures and keeps logs in `.harness/logs/`. Do not paste whole logs into the conversation or the work item. Never lower a threshold, add a coverage exclusion, or skip a test to get green.
11. **Review.** Non-trivial, security, data, authorization, migration, or public-interface changes get a fresh-context review by the `harness-code-reviewer` subagent (or `bmad-code-review` when that subagent is unavailable), given only the work item, the diff (`git diff main...HEAD`), acceptance criteria, and risks. Fix every `must fix` finding, rerun verify, and record findings and dispositions.
12. **Course-correct.** If the work invalidates a requirement, UX, or architecture decision, stop and route upstream.
13. **Record.** Fill the work item's Evidence section: files changed, red/green commands with one-line results, quality (Knip, coverage, refactor checklist), verify result (including skipped gates), review outcome, course-correction record, remaining risks. Capture memory only for a durable decision, gotcha, or procedure.
14. **Hand off.** When ready, use `harness-git-pr-delivery`.

Code and developer-facing text are English; user-facing copy follows the product locale through `translate(...)` keys in English.
