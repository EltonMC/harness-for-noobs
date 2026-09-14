# Work Item: newcomer readiness overhaul

## Outcome

A person with little software experience can create a project from the Harness, set it up with one command, work daily with a few plain-language commands, and receive Harness updates as reviewed pull requests. Safety rules are enforced by hooks, Git hooks, and CI instead of relying only on agent compliance, and token use drops through deterministic scripts and a smaller always-loaded context.

## Delivery gate

- Change size: epic (Harness-only; no product code)
- Upstream source or direct-intent rationale: owner-requested review of the Harness (2026-09-13) with owner decisions: host Node toolchain plus Docker only for Supabase, pnpm, Copier distribution with weekly update PRs, PT-BR-first human documentation.
- Intent gaps: none open; the four architecture choices above were decided by the owner.
- Irreversible actions: none executed. GitHub protection, deployments, and remote database pushes are delivered as scripts/workflows that the owner runs explicitly.
- Footprint: Harness scripts and tests, agent hooks and settings, Git hooks, CI workflows, skill-source lock, skills, templates, application template, documentation, ADRs, memory.
- Readiness verdict: PASS

## Plan

### Phase 0 — Defects

1. Add `CLAUDE.md` importing `AGENTS.md` (Claude Code does not read `AGENTS.md`).
2. Install Impeccable from `plugin/skills/impeccable` instead of the whole repository; verify every installed skill is loadable (`SKILL.md` with matching `name` and a `description`).
3. Narrow `.gitignore` so committed agent settings, hooks, and Harness subagents are versioned.
4. Detect and clean stray empty agent directories left by earlier installers.
5. Stream child-process output so failing checks show their real errors.
6. Verify BMad adapters only for the agents selected at setup; reduce copies to `.agents/skills`, `.claude/skills`, and optionally `.cline/skills`.
7. Replace `git clone` onboarding with Copier.
8. Resolve the host-Node contradiction through ADR 0009.

### Phase 1 — Enforced guardrails

1. Commit `.claude/settings.json` with deny/ask permissions and hooks for dangerous shell commands, edits on `main`, secret files, and managed skill files.
2. Zero-dependency Git hooks (`core.hooksPath`): block commits/pushes on `main`, scan staged changes for secrets, run fast checks.
3. CI: Harness tests and secret scan now; application template CI with lint, type-check, tests, build, bundle-secret scan, E2E smoke, database lint, pgTAP RLS-enabled test, dependency review.
4. `harness github-protect`: dry-run by default; applies the `main` ruleset, secret scanning with push protection, and CodeQL default setup.
5. Dependabot with cooldown; pnpm `minimumReleaseAge` and blocked dependency build scripts.

### Phase 2 — Onboarding

1. One `setup` command orchestrating doctor, skills, hooks, and next steps in PT-BR.
2. `doctor` with OS-specific install hints; `Brewfile` and Windows (WSL2/winget) guide.
3. Locked application template installed by `harness init-app` (Vite + React + TypeScript, Vitest, Playwright, Biome, Supabase, Wrangler).
4. Entry skill `harness-start` and recovery skill `harness-recovery`; plain-language PR summary and manual test script.
5. PT-BR guides: installation, accounts and secrets, daily flow, recovery, production checklist, costs and tokens, updates, glossary.
6. Per-PR preview deployment in the application template.

### Phase 3 — Tokens

1. `harness verify`: runs configured checks, stores full logs, prints only failure summaries.
2. Lighter work-item template; `direct` changes need no work-item file.
3. Remove duplicated memory pages that repeat ADRs and workflows.
4. Slim `AGENTS.md`; install an essential BMad skill profile.
5. Haiku-backed read-only scout subagent; Caveman restricted to agent-to-agent handoffs.
6. RTK pilot procedure and doctor detection.

### Phase 4 — Distribution and updates

1. `copier.yml` with Harness-owned vs product-owned boundaries.
2. `.harness/VERSION`, PT-BR `CHANGELOG.md` with "do you need to act?" notes.
3. Weekly `harness-update` workflow that runs `copier update`, the Harness checks, and opens a pull request.

## Acceptance criteria

- [x] `npm test` passes, including new tests for every new script behavior.
- [x] `npm run harness -- doctor` reports Impeccable as loadable and flags stray directories.
- [x] Guard hooks block push to `main`, force push, remote database push, production deploy, and `.env` reads in tests.
- [x] The application template installs, lints, type-checks, tests, and builds in a scratch copy.
- [x] `copier copy` of the Harness produces a project without Harness-history artifacts.
- [x] README and guides are PT-BR first; agent-facing artifacts stay English.

## Scope

- Explicit non-goals: product features, running `github-protect --apply`, deployments, remote Supabase changes, committing.
- Memory consulted: `decisions/INDEX.md`, `procedures/INDEX.md`.
- Memory captured: `gotchas/app-template-dependency-pins.md`; duplicated decision and procedure pages removed in favor of ADR and workflow routing.

## Implementation evidence

- TDD: red observed first for `hook-policy` (missing module; later heredoc false positive, `git -c core.hooksPath` bypass, `.git/config` edit, `cp .env.example .env.local`), `verify`, `doctor` (`_bmad-output` false positive, pnpm < 10), `init-app`, and the Impeccable loadability regression. `secret-scan`, `github-protect`, `agent-hosts`, and the CLI rewrite had tests written immediately after implementation, not red-first.
- `npm run check` → 64 tests pass; skill integrity current for bmad, impeccable, impeccable-claude, caveman; no secrets in tracked files.
- Real setup: `npm run harness -- setup --agents claude-code,codex` reinstalled from the network; BMad essential profile digest matched across directories; generated skill storage dropped from ~420 MB (69 MB Impeccable repository copied to six directories) to ~11 MB. `clean --apply` removed 53 empty directories.
- Hooks exercised with real inputs: Claude pre-tool JSON denies push to `main` and `.env.local` writes; Git pre-commit blocks commits on `main` and a staged `sb_secret_` value; pre-push blocks `refs/heads/main`; post-edit reports Biome a11y/unused-variable errors with exit 2; stop hook returns the failing test summary and skips when `stop_hook_active`.
- Application template in scratch (pnpm 12.4.1): install, lint, typecheck, 4 unit tests, build, bundle secret scan, and Playwright smoke all green; a known lint violation is still reported.
- Copier: `copy` produced a project without Harness history; `setup` → `init-app` → `verify` green → commit through Git hooks. Simulated release v0.3.0 → v0.3.1: `copier update` applied the Harness change and kept product edits in `README.md` and `project-context.md`; the changelog excerpt script produced the 0.3.1 section.
- `actionlint` on all five workflows: only style findings, two fixed; the remaining are intentional (single-quoted Node script, sed).
- Always-loaded context: `AGENTS.md` 5,424 → 3,461 bytes; skills visible to Claude Code 41 → 28.
- Not verified locally: Supabase CLI (`supabase init`, `db start`, `db test`) because the local CLI binary is killed on launch on this machine; GitHub API calls in `github-protect --apply` (dry-run logic only, unit-tested); Cloudflare preview/production deploy jobs; the scheduled update workflow on GitHub.
- Review: fresh-context independent review completed 2026-09-14 (see Review Findings); all 22 patch findings applied.
- Remaining risks: hooks rely on pattern matching and can be evaded deliberately; Codex, Cursor, Copilot, and Cline get Git hooks and CI but not agent hooks; private free-plan GitHub repositories cannot enforce rulesets.

### Review Findings

Independent review (bmad-code-review, 2026-09-14): two lots (code/guardrails; docs/skills), four layers each (blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor). No layer failed.

- [x] [Review][Patch] (decided: dedicated `HARNESS_UPDATE_TOKEN` with issue fallback; `github-protect` enables Actions PR creation; guide 07 explains the token) Weekly update PR cannot push workflow changes — `GITHUB_TOKEN` pushes touching `.github/workflows/` are rejected and PR creation by Actions is off by default in new repositories; choose token strategy or a different delivery mechanism.
- [x] [Review][Patch] (decided: split ownership — Harness-owned `harness.yaml` and memory indexes, product config in `.harness/project.yaml`, Harness invariants out of `project-context.md`, managed app workflows gated on app existence, stable CLI scripts in `package.json`) Mixed-ownership files never receive Harness updates — `package.json`, `.harness/harness.yaml`, `project-context.md`, `.harness/memory/**`, and the app CI/deploy workflows copied by `init-app` are skipped by Copier; choose split-ownership restructure or changelog-driven manual steps.
- [x] [Review][Patch] (decided: new Copier question `owner_locale`, default pt-BR, drives conversation, PR summaries, and BMad language) Owner language is tied to the product UI locale — `AGENTS.md` and skills use `product_locale`, so a PT-BR owner of an English product gets English conversation, PR summaries, and BMad; choose fixed PT-BR owner language or a separate `owner_locale` answer.
- [x] [Review][Patch] (decided: preview comment warns when `supabase/migrations` changed; "Como testar" uses `pnpm db:reset` + `pnpm dev`) PR previews use a Supabase project whose migrations are never applied — schema-changing PRs break or mislead in preview; choose preview migration job or local-testing rule with a PR warning.
- [x] [Review][Patch] Pre-push hook blocks the documented first publish of `main` (`gh repo create --push`) [.harness/hooks/git-pre-push.mjs:8]
- [x] [Review][Patch] Agent shell guard misses everyday forms: `git -C`, combined `-uf`, `commit -n`, `pnpm supabase|wrangler`, `npx pkg@version`, `env/time/nohup`, `bash -lc`, `&`, `$(...)`, heredoc piped to shell, `rm --recursive`, push `HEAD` on main, Bash redirects into `.env` or guardrail files, case variants [.harness/hooks/hook-policy.mjs]
- [x] [Review][Patch] Agent guard false denials: separators inside quotes, read-only `git config --get core.hooksPath`, first commit on a fresh `main`, template `supabase-config` files matched by the browser-credential rule [.harness/hooks/hook-policy.mjs]
- [x] [Review][Patch] `.env` reads through Claude Read/Grep/Glob are not hooked and the deny list covers root paths only [.claude/settings.json]
- [x] [Review][Patch] `skill-source-maintenance.yml` ships to generated projects and fails there (`npm test` is Vitest after `init-app`; setup requires Docker/Supabase) [copier.yml, .github/workflows/skill-source-maintenance.yml]
- [x] [Review][Patch] Update workflow overwrites owner conflict-resolution commits, edits closed PRs, and drops conflicted paths with spaces [.github/workflows/harness-update.yml]
- [x] [Review][Patch] Deploy workflow runs production migrations before verification, previews skip the quality gate, missing production variables deploy a broken build, first preview fails before the Worker exists, CI build lacks placeholder Supabase env, dependency review fails on private repositories [.harness/app-template/.github/workflows/deploy.yml, ci.yml]
- [x] [Review][Patch] Secret scanner gaps: Supabase `sbp_` tokens, Postgres URLs with passwords, bundle files over 1 MB skipped, gitlink EISDIR crash, `.envrc`/`.env.*.example` classification, stale `dist` scanned after a failed build [.harness/scripts/secret-scan.mjs, verify.mjs]
- [x] [Review][Patch] Missing tests: secret scanner, pre-push parser, `runVerification` outcomes, BMad integrity round trip, required-check names vs workflow job names, Harness skills loadable, template smoke job in CI [.harness/scripts, .github/workflows/harness-ci.yml]
- [x] [Review][Patch] Legacy adapter state (tool-name keys) leaves retired `harness-local-docker` installed; legacy external copies in `.cursor/.github/.devin` never cleaned [.harness/scripts/install-skill-adapters.mjs, doctor.mjs]
- [x] [Review][Patch] `github-protect`: required checks not refreshed after `init-app`, duplicate ruleset id breaks PUT, Dependabot security updates not enabled [.harness/scripts/github-protect.mjs]
- [x] [Review][Patch] `verify` and the Stop hook skip database gates; Stop hook re-runs on stale uncommitted changes every turn [.harness/scripts/verify.mjs, .harness/hooks/claude-stop-verify.mjs]
- [x] [Review][Patch] `init-app`: names with quotes break generated TSX, success steps printed after failed install, existing dependencies dropped on merge, no lockfile despite "locked template", missing `supabase/config.toml` makes Database gate fail [.harness/scripts/init-app.mjs, .harness/app-template]
- [x] [Review][Patch] Process utilities: UTF-8 chunk corruption, no timeouts, Windows argument quoting with `shell: true`, stdin EPIPE, binary staged content decoded as text [.harness/scripts/process-utils.mjs, secret-scan.mjs]
- [x] [Review][Patch] Doctor reports a stopped Docker daemon as "not installed" [.harness/scripts/doctor.mjs]
- [x] [Review][Patch] Copier excludes hard-code `2026-*` and ship the maintainer-only gotcha [copier.yml]
- [x] [Review][Patch] Consistency: Copier vs CLI default agents, Linux pnpm hint relies on corepack, lock policy still says "draft", scout subagent has Bash, invalid local state crashes, updater drops BMad language and pins unselected sources, application detection duplicated in four places [.harness/scripts/*, .claude/agents/harness-scout.md]
- [x] [Review][Patch] Documentation contradicts behavior: agent told to write `.env.local`, no "Como testar" fallback without preview, rollback guidance ignores applied migrations, ADR 0003 deployment section still containerized, preview described as gated, work-item template lacks fields skills require, PR template dropped UI-evidence and English checks, `harness-start` circular handoff rule and localized-string routing, branch deletion after squash, recovery undo edge cases, `switch -c` when already on a branch, guide 07 missing `--vcs-ref`, CHANGELOG missing manual/breaking steps, guide 05 private-repo item, LICENSE excluded while notices ship, gotcha "a week" vs 3 days, install guide pins [.harness/skills, docs, .github/PULL_REQUEST_TEMPLATE.md, CHANGELOG.md]
- [x] [Review][Defer] `AGENTS.md` sentence "Protections are also changed only with the owner's approval" reads as a fragment [AGENTS.md:15] — deferred: fix edits an agent-context file; applied together with the owner-language patch (the sentence now names the protected files).
- [x] [Review][Defer] Cursor, GitHub Copilot, and Cline skill discovery from `.agents/skills`/`.cline/skills` unverified [.harness/adapters/README.md] — deferred: maybe-false (medium if true); settle by running setup for each host and invoking `harness-start`.

### Post-review evidence (2026-09-14)

- Tests: 110 pass across 16 test files (was 64). New suites: `secret-scan`, `process-utils`, `agent-hosts`, `project-config`, `harness-skills` (every Harness skill loadable), `git-pre-push`, `claude-stop-verify`; extended `hook-policy` (25), `verify` (integration with failing scripts), `init-app` (real template, escaping, lockfile), `github-protect` (required checks match workflow job names), `check-skill-sources` (BMad round trip), `install-skill-adapters` (v0.2 state), `doctor` (legacy copies, stopped Docker).
- TDD: red observed before implementation for hook-policy review cases, pre-push first publish, secret-scan rules and large bundles, verify database gates, Stop hook parsing, legacy adapter state, legacy copies, stopped Docker, agent-host state, and init-app real-template cases. `project-config` and the new `github-protect` plan tests were written in the same step as the implementation. The two earlier "tests written after implementation" notes are superseded: `secret-scan` and `agent-hosts` now have dedicated test files.
- Guardrails exercised: Claude `Read`/`Grep`/`Glob` inputs for nested `.env` paths and globs are denied while `.env.example` is allowed; the agent hook itself blocked `git push origin …:main` during verification.
- End to end in a fresh Copier project (name with a double quote and backslash, `owner_locale=pt-BR`, `product_locale=en-US`): setup installed BMad with "Brazilian Portuguese"; `init-app` installed with `--frozen-lockfile`; `project.yaml` commands written; `verify` green with database gates reported as skipped (no `supabase init`); commit through Git hooks; against a local bare remote the first publish of `main` succeeded, a commit on published `main` and a push to `main` were blocked by the Git hooks.
- Template smoke locally (name `Pão d'Água & Cia`): frozen install, lint, typecheck, tests, build green; TSX and HTML escaping verified.
- Copier update v0.3.0 → v0.3.1: Harness-owned `harness.yaml` and `app-ci.yml` updated; product-owned `project.yaml` and `project-context.md` kept their edits and ignored template changes.
- Still not verified: Supabase CLI locally, GitHub API calls of `github-protect --apply`, Cloudflare preview and deploy jobs, and the scheduled update workflow on GitHub (token and issue paths).

Rejected:
- low: `claude-pre-tool` skips paths outside the project (`..`) — the host already prompts for out-of-project access; guard adds complexity for a rare case.
- low: Linux install hints use `curl | sh`, which the agent guard blocks — hints are for the owner to run; agents are expected not to pipe downloads into shells.
- low: re-running setup with fewer agents leaves the dropped agent's skills — uncommon; safe removal needs extra state and branching.
- spec edit: Impeccable source path differs from the plan text — fix is editing the work item under review.
- spec edit: work item overstates test and verification evidence — fix is editing the work item under review (to be corrected when patches land).
