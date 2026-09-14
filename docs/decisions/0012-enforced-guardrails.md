# ADR 0012: Enforce guardrails with hooks, Git hooks, CI, and GitHub protection

## Status

Accepted — 2026-09-13.

## Context

The Harness expressed its safety rules as instructions to agents. An owner with little experience cannot notice when an agent ignores an instruction, so rules that matter must be mechanisms.

## Decision

Layered controls, each independent of agent compliance:

1. **Agent hooks** (Claude Code `.claude/settings.json` → `.harness/hooks/`, covering Bash, file edits, and Read/Grep/Glob): a quote-aware shell parser that sees through package runners, wrappers, nested shells, command substitution, and Git global options. Deny force pushes, pushes or commits to `main`, skipping Git hooks, reading or writing `.env` files, secrets in edited content, privileged Supabase keys in browser code, remote Supabase and Cloudflare mutations, PR merges, and edits to generated skills or locks; ask before discarding local work or changing guardrail files. Post-edit lint on the edited file and a quick verification before the agent finishes. Hooks fail open on internal errors so a defect never blocks all work.
2. **Git hooks** (`core.hooksPath=.harness/git-hooks`, set by `setup`): block commits and pushes to `main`, scan staged content for secrets (built-in patterns plus Gitleaks when installed), lint staged files, run the quick gate before push.
3. **CI**: Harness self-tests and secret scan; the Harness-managed `app-ci.yml` (lint, type-check, tests, build, bundle secret scan, Playwright smoke, database lint, pgTAP tests including a guard that every `public` table has RLS enabled, dependency review on public repositories) and `app-deploy.yml` (verification before production migrations).
4. **GitHub** (`npm run harness -- github-protect --apply`): ruleset on the default branch, squash-only merges, `production` environment, secret scanning with push protection, Dependabot alerts, and CodeQL where the plan allows.

## Consequences

- Hooks are a safety net with known limits (a determined command can evade pattern matching); protected `main`, CI-only deployment, and least-privileged secrets remain authoritative.
- Codex, Cursor, Copilot, and Cline rely on Git hooks and CI; Codex also uses its sandbox configuration.
- Private repositories on GitHub's free plan cannot enforce rulesets; the owner is told explicitly.
