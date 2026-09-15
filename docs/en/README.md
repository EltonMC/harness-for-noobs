# Harness for Noobs (English overview)

A portable starting kit for building a React + Supabase application with AI coding agents when the owner has little software experience. Owner-facing guides are in Portuguese (`docs/guia/`, ADR 0013); agent-facing artifacts are English.

## What it provides

- **One entry point:** agents start unclear requests with the `harness-start` skill and recover with `harness-recovery`.
- **Enforced guardrails (ADR 0012):** Claude Code hooks, Git hooks, and CI block pushes and commits to `main`, force pushes, secrets in files or the browser bundle, local production deploys, remote database changes, and PR merges by agents. `npm run harness -- github-protect` configures the GitHub ruleset and security features.
- **Deterministic, low-token workflow:** `init-app` installs a locked React + Vite + TypeScript + Supabase + Vitest + Playwright + Biome template; `verify` runs every gate and prints only failure summaries; `doctor` diagnoses the machine with platform-specific install commands.
- **Supply-chain defaults (ADR 0010):** pnpm with `minimumReleaseAge` and explicit build-script approval; exact versions; Dependabot with cooldown; SHA-pinned Actions.
- **Database safety (ADR 0004, ADR 0014):** an owner-approved plain-language data card, DBA review, immutable versioned migrations, pgTAP schema guards (RLS, `security_invoker` views, policies, functions, personal-data column classification, account deletion), Supabase security advisors, a change guard that requires documentation and a separate owner approval for destructive SQL, a PR risk comment, a GitHub environment approval before destructive production migrations, and hooks that keep agents off the production database.
- **Application security (ADR 0015):** deploy secrets in GitHub environments, strict CSP and security headers tested and checked in production, Supabase Auth/Storage/Edge Function baseline guard, Storage pgTAP guards, dependency audit, Semgrep, OWASP ZAP baseline on previews, actionlint and zizmor on workflows, agent upload and MCP controls, a threat-model step, security patterns, an incident guide with LGPD notification, and `SECURITY.md`.
- **Delivery:** per-PR Cloudflare preview URLs, CI-only production deploys (migrations first), plain-language PR summaries with a manual test script.
- **Updates (ADR 0011):** projects are created with Copier; a weekly workflow opens a pull request (with the `HARNESS_UPDATE_TOKEN` secret) or an issue (without it) for the new Harness version, with its changelog and test results. Product-owned files (`.harness/project.yaml`, project context, design, memory pages, README, `package.json`) are never overwritten.
- **Languages (ADR 0013):** `owner_locale` drives agent conversation, PR summaries, and BMad; `product_locale` drives the product UI.
- **Versioned external skills (ADR 0008):** BMad (essential profile), Impeccable, and Caveman at locked revisions, installed only for the selected agents and verified to be loadable.

## Quick start

```bash
uvx copier@9.18.2 copy gh:EltonMC/harness-for-noobs my-app
cd my-app && git init -b main && git add -A && git commit -m "chore: create project from Harness"
npm run harness -- setup
```

Then open your agent in the folder and ask: "use harness-start".

## Commands

| Command | Purpose |
| --- | --- |
| `npm run harness -- doctor` | Diagnose tools and project state |
| `npm run harness -- setup [--agents claude-code,codex,cursor,github-copilot,cline]` | Install skills and Git hooks |
| `npm run harness -- init-app` | Create the application from the locked template |
| `npm run harness -- verify [--quick] [--e2e]` | Run gates with quiet output |
| `npm run harness -- github-protect [--apply]` | Plan or apply GitHub protections |
| `npm run harness -- clean [--apply]` | Remove empty directories left by old installers |
| `npm run harness -- update-skills --apply` | Prepare an external-skill update |
| `npm run check` | Harness self-tests, skill integrity, secret scan |
