# ADR 0016: Enforce application code conventions and quality gates

## Status

Accepted — 2026-09-15.

## Context

The Harness enforced process, security, and database rules, but not the shape of application code. The app template held only a heading and a Supabase client, so every agent chose its own structure, data fetching, validation, error handling, and copy strategy:

- `agent-readable-code.md` held sound guidance, but no skill or workflow told agents to read it;
- the rule "user-facing copy uses English translation keys" had no mechanism;
- the Supabase client was untyped, and any component could import it;
- Biome ran only its recommended preset, so `any`, non-null assertions, and skipped tests passed;
- nothing measured coverage, dead code, or accessibility, although skills required tests and accessible interfaces;
- the fresh-context review relied on a generic reviewer that did not know these rules;
- after one blocked stop, the Stop hook let the agent finish even when verification still failed;
- `.codex/hooks.json` used `$CLAUDE_PROJECT_DIR`, which Codex does not set, so Codex could not start the hooks.

## Decision

1. **Conventions.** `.harness/context/code-conventions.md` (renamed from `agent-readable-code.md`) defines structure (`app/`, `features/<feature>/{api,hooks,components}`, `shared/`, `lib/`), data access, server state, validation, i18n, errors, React and TypeScript rules, size, tests, and a refactor checklist. `harness-feature-delivery`, `harness-ux-tdd`, the quick-change workflow, and `AGENTS.md` require it.
2. **Libraries in the template.** React Router 8 (routing and route error pages), TanStack Query 5 (server state with retries only for network failures), zod 4 (boundaries), and a typed in-house i18n catalog (`translate`, compile-time complete catalogs for pt-BR, en-US, and es-ES). No i18n library: products have one locale, and a typed object keeps missing keys a type error with no dependency. MSW is not included: tests fake the feature's `api` module, and RLS is proven by pgTAP.
3. **Typed database.** `createClient<Database>` with `src/lib/database.types.ts`. Full `verify` and the Database gate fail when the file does not match `supabase gen types typescript --local`.
4. **Static rules.** Biome errors on `any`, non-null assertions, parameter reassignment, `console.log`, focused and skipped tests, unused imports and variables, non-exhaustive effect dependencies, cognitive complexity above 15, and imports of Supabase outside `src/lib` and `src/features/*/api`. TypeScript adds `noImplicitReturns` and `noImplicitOverride`, and the `@/` alias.
5. **Test quality.** Vitest coverage thresholds (80% lines, functions, and statements; 75% branches) run in full `verify` and CI through `test:coverage`. Component tests use `renderRoute` and `expectNoAccessibilityViolations` (axe-core); the E2E smoke test runs `@axe-core/playwright`. Knip runs in full `verify`, the Quality gate, and the template smoke. `verify` and CI use these scripts only when a project defines them, so older projects keep working.
6. **Stop hook.** A green quick verification still returns, once per change set, warnings for source changes without test changes, test diffs that remove more assertions than they add, and added `.skip`, `.only`, or `.todo`. Failing verification now blocks up to three consecutive stops in a session, instead of one, before it lets the agent finish.
7. **Review and discovery.** A new read-only `harness-code-reviewer` subagent (Claude Code and Codex) reviews the work item, conventions, and diff, and returns must-fix, should-fix, and consider findings with a verdict. `harness-scout` reports existing code to reuse. The work-item and PR templates record quality evidence.
8. **Codex hooks.** `.codex/hooks.json` resolves hook scripts from the Git root.

## Consequences

- New projects start with more structure and about 400 kB of JavaScript (126 kB gzip) before product code; route-level code splitting is the remedy when it matters.
- Stricter rules make agents write more code up front (states, copy keys, tests). Exceptions are local Biome suppression comments with a reason, reviewed in the PR.
- Coverage thresholds can push toward low-value tests; the conventions and reviewer reject tests of implementation details.
- Projects created before this ADR keep their files (product-owned `package.json` and application code). They gain the new gates only after adding the `knip`, `test:coverage`, and `db:types` scripts.
- The Stop hook warnings are heuristics; a pure copy or style change triggers them once and is resolved by recording the reason.
- Codex edits made with `apply_patch` still bypass the edit rules of the pre-tool hook; Git hooks and CI remain the enforced guardrails for them.
- The database types check compares bytes with the output of the local Supabase CLI. It must match the version pinned in `app-ci.yml` (2.117.0), because generator output changes between versions. Projects that never generated the file skip the check.
- `init-app` refuses a `product_locale` with no copy catalog (pt-BR, en-US, es-ES) before writing any file.
- Mutation testing is not included; it can be added later as a scheduled job.
