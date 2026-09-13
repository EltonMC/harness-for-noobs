# Agent Instructions

This repository contains a portable development harness for a React and Supabase application. Treat the files in `.harness/` as the source of truth for agent workflows and evidence.

The accepted frontend architecture is React + Vite as a static SPA on Cloudflare Workers Static Assets, with Supabase as the backend. Read `docs/decisions/0001-frontend-hosting-cloudflare-workers.md` before proposing a hosting or runtime change.

The accepted delivery process is Docker Compose locally and in CI, then GitHub pull requests into protected `main`. Read `docs/decisions/0003-docker-git-pr-production-governance.md` before changing Docker, Git, CI, or deployment behavior.

For non-trivial upstream product work, use `harness-upstream-bmad` and the installed BMad skills. Only an approved upstream handoff may enter downstream implementation; read `docs/decisions/0005-bmad-upstream-integration.md` and `docs/decisions/0007-upstream-context-on-demand.md` before changing that boundary.

## Working rules

- Start each change from a work item that states its outcome, acceptance criteria, affected areas, and verification plan.
- Size each change before implementation: direct for a clear, low-risk correction; session-sized for one bounded outcome; story or epic for upstream-planned work. Record intent gaps, irreversible actions, footprint, and a `PASS`/`CONCERNS`/`FAIL` readiness verdict for non-trivial work.
- Keep product decisions, architecture decisions, and implementation evidence in the artifact locations declared in `.harness/harness.yaml`.
- Query `.harness/memory/` only for the task's domain; load the matching page, never the whole memory tree. Capture durable decisions, gotchas, procedures, and cross-agent handoffs as concise Markdown, never as transcripts or raw logs.
- Treat source code, migrations, and accepted ADRs as canonical. Update or retire a conflicting memory page instead of trusting stale memory.
- Use BMad artifacts when BMad is installed; do not require BMad to perform ordinary work.
- Treat `_bmad-output/` as canonical upstream reference material, not default downstream context. Start from the approved handoff and work item; retrieve only the smallest mapped source section when a decision is unresolved, conflicting, or high risk, then record the concise conclusion.
- Treat BMad, Impeccable, and Caveman as versioned external dependencies. Read `.harness/workflows/skill-source-maintenance.md`; do not manually edit or bulk-copy their installed files, and never merge an update without the required PR review.
- Prefer small, reviewable changes. Do not combine feature work with unrelated refactors.
- Keep code easy for agents to navigate: focused modules, specific searchable names, predictable paths, headless checks, and structured logs when logging is needed.
- Write code and developer-facing technical text in English: identifiers, paths, tests, comments, logs, API/database names, and errors. User-facing copy follows the documented product locale; its translation keys remain English.
- For UI work, read the relevant `.harness/design/` context. Define the user job and interaction states before code, then use `harness-ux-tdd`; visual polish never replaces accessible, behavior-focused tests.
- Develop every feature with TDD: write a behavior-focused test, run it to observe the intended failure, implement the minimum change that makes it pass, then refactor with the suite green.
- A missing test harness is setup work to complete before the first feature; it is not an exception to TDD.
- Stop and route a material requirement, UX, or architecture discovery back upstream. Do not silently correct course only in downstream code or a pull request.
- Require a fresh-context independent review before PR for non-trivial, security, data, authorization, migration, or public-interface changes; use `bmad-code-review` when available.
- Work in a feature branch. Never commit directly to `main`, force-push a shared branch, merge a pull request, or deploy production on the user's behalf without explicit authorization.
- Run development, test, type-check, build, and local verification inside Docker Compose once the scaffold exists. Do not add an undocumented host-only runtime path.
- Do not claim a change is complete without running the configured checks and recording the result in the work item.
- Before modifying Supabase schema, Auth, Storage, or Edge Functions, update the access matrix and include migration plus RLS test coverage where client data access changes.
- Before creating or changing database schema, read `.harness/database/` and use `harness-database-steward`. Create a change proposal and review report before implementation; run local migration reset, database lint, and database tests before review.
- Never expose Supabase secret or `service_role` credentials to browser code. Use the publishable client credential only in the React app.

## Commands

Vite is the selected React starter, but the application has not been scaffolded yet. Inspect `package.json` before selecting package-manager, lint, type-check, test, build, E2E, or deploy commands. Record the chosen commands in `.harness/harness.yaml`.

## Completion

A work item is ready for review only when its acceptance criteria have evidence, its TDD red/green results are recorded, relevant checks have passed, and any security or migration impact is documented.
