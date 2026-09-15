# 2026-09-15-code-quality-baseline: make agents produce consistent, well-tested application code

## Outcome

Agents building on the Harness follow one concrete set of application code conventions (structure, data access, server state, validation, i18n, errors, routing), stricter lint and type rules enforce them, tests prove behavior and accessibility with coverage and dead-code gates, and a Harness-specific reviewer checks quality before a pull request.

## Gate

- Size: session — source: direct owner request after the code-quality assessment ("faça todas as correções").
- Intent gaps: library choices (React Router, TanStack Query, zod, typed in-house i18n, Knip, axe-core) are recorded in ADR 0016 for the owner to review in the PR.
- Irreversible actions: none. Guardrail files (`.harness/hooks/`, `.github/workflows/`, `.codex/`) change at the owner's explicit request.
- Footprint: app template (dependencies, lockfile, Biome, tsconfig, Vite, Knip, source layout, tests, E2E), verify, Stop hook, App CI, template smoke, Codex hooks, skills (feature delivery, UX TDD), work-item and PR templates, agents (scout, new reviewer), conventions context, harness.yaml, ADR 0016, CHANGELOG, guides.
- Readiness: PASS. Stacked on `feature/security-guardrails`.

## Acceptance criteria

- [x] `code-conventions.md` replaces `agent-readable-code.md` and is loaded by `harness-feature-delivery` and `harness-ux-tdd`.
- [x] The app template ships the conventions: `src/app`, `src/features`, `src/shared`, typed Supabase client, TanStack Query, zod, typed i18n, route error page, test render helper, and axe accessibility checks.
- [x] Biome and TypeScript are stricter (no `any`, no focused or skipped tests, restricted Supabase imports, complexity limit).
- [x] `verify` runs coverage and Knip when the scripts exist and fails on stale database types.
- [x] The Stop hook flags source changes without test changes and removed assertions once per change set.
- [x] A `harness-code-reviewer` agent exists for Claude Code and Codex; the scout reports reusable code.
- [x] Codex hooks resolve the project directory.

## Scope

- In scope: all items of the code-quality assessment.
- Explicit non-goals: filling product-owned design and project context (owner decisions); mutation testing (documented as optional); MSW (feature `api` modules are faked instead).

## Evidence

- Files changed: see the acceptance criteria footprint; app template restructured (`src/app`, `src/features/home`, `src/shared/{i18n,errors}`, `src/lib/query-client.ts`, `src/test/{render.tsx,accessibility.ts}`), `knip.json`, verify, Stop hook, init-app, App CI, template smoke, Codex hooks and agents, skills, templates, conventions, ADR 0016, CHANGELOG, guides 03 and 10.
- Red: `node --test verify.test.mjs` → 3 failed (no knip/coverage plan, no `db:types-check`); `claude-stop-verify.test.mjs` → missing `qualityWarnings` export; after the review, verify (byte comparison, missing file), init-app (unsupported locale), and the Stop hook (deleted files, repeated warnings, untracked tests) → failed. On the scaffolded app: `pnpm lint` reported `noRestrictedImports`, `noExplicitAny`, `noNonNullAssertion`, `noConsole`, `useAltText`, and `noSkippedTests` on samples; axe failed on an unlabeled input; Knip reported an unused export; with a real local Supabase, `db:types-check` failed on stale types.
- Green: `npm run check` → 168 tests pass, skills ✔, secrets ✔. Fresh scaffold (pt-BR, es-ES, en-US with a 62-character name) with `pnpm install --frozen-lockfile` → lint, typecheck, Knip, 17 tests with coverage 100% lines / 91% branches, build, bundle secrets ✔; E2E with axe → 1 passed. The Stop hook run end to end: a single missing-test warning (also from a subdirectory `cwd`), `.skip` in a new untracked test flagged, `.only` failed by Vitest, and a type error blocked three stops and then released.
- Quality: refactor checklist done; Knip clean; coverage thresholds 80/80/80/75 met by the template.
- Verify: scaffolded project with `supabase init`, hardened config, and an isolated local stack → `npm run harness -- verify` → Tudo verde (including db:lint, db:test, guards, advisors, db:types-check). actionlint 1.7.12 and zizmor 1.30.1 on changed workflows → no findings (shellcheck not installed locally).
- Review: fresh-context reviewer → 0 must fix, 5 should fix, 6 consider. Fixed: verify failing projects that predate the types file (now skipped); a long project name breaking lint in the home test; unsupported product locale (init-app refuses it); hook file naming contradiction; repeated warnings looping (one raise per warning kind); untracked tests not inspected; deleted files flagged as missing tests; trimmed vs byte comparison between verify and CI; Codex hooks outside a Git root and from a subdirectory `cwd`; Codex reviewer running Vitest in a read-only sandbox. Accepted and documented: local Supabase CLI must match the CI pin for the types check.
- Course correction: not needed.
- Remaining risks: Stop hook warnings are heuristics; Codex `apply_patch` edits bypass edit rules; the template bundle is about 126 kB gzip before product code; existing projects adopt the conventions only by an explicit follow-up.
- Memory consulted / captured: `gotchas/app-template-dependency-pins.md` consulted (versions older than one week, lockfile regeneration, `allowBuilds`).
