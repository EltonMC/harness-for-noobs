# 2026-09-15-application-security-baseline: enforce the application security baseline

## Outcome

Projects built with the Harness keep deploy secrets out of branch-reachable scope, ship security headers, start with hardened Auth, Storage, and Edge Function settings, run dependency, static, dynamic, and workflow security checks, constrain agents against exfiltration, and give the owner an incident procedure.

## Gate

- Size: session — source: direct owner request after the security assessment ("executa todos", all 14 items).
- Intent gaps: none.
- Irreversible actions: none locally. Guardrail files (`.claude/settings.json`, `.codex/config.toml`, `.harness/hooks/`, `.github/workflows/`, `.harness/database/guards/`) changed at the owner's explicit request. Moving secrets to environments and `github-protect --apply` are left to the owner.
- Footprint: hooks, verify, new Supabase config guard, Storage guards, github-protect, CI (Quality gate, Security scan, preview, deploy smoke, Harness CI, Harness update), app template (`public/_headers`, header test, Biome rules, config hardening in init-app), skills, templates, guides 02/04/05/07/09/10, ADR 0015, `SECURITY.md`.
- Readiness: PASS. Stacked on `feature/database-guardrails` (shared guardrail files).

## Acceptance criteria

- [x] Deploy secrets documented in environments; github-protect warns about repository-level deploy secrets and creates `preview`.
- [x] Template security headers with a failing test on weakening and a production header check.
- [x] Supabase config and Edge Function baseline enforced in verify and CI, with init-app hardening and `--fix`.
- [x] Storage guards enforced against a local database.
- [x] Dependency audit, Semgrep, ZAP baseline, actionlint, and zizmor in CI; checkout credentials not persisted.
- [x] Agent upload confirmation, MCP auto-enable off, Codex without network, untrusted-content rule.
- [x] Threat-model section, security patterns, incident guide with LGPD notification, `SECURITY.md`, owner security guide.

## Scope

- In scope: items 1–14 of the security assessment.
- Explicit non-goals: pushing production Auth config from `config.toml` (risk of breaking production sign-in); making ZAP findings blocking; a Sentry integration in the template (account required).

## Security

- Protecting: deploy credentials, user sessions, user data and files, CI integrity, the owner's repository.
- Abuse cases: agent or compromised account exfiltrating repository secrets through a branch workflow; XSS stealing sessions; credential stuffing and weak passwords; public buckets; open Edge Functions; vulnerable dependencies; workflow credential leakage; prompt-injected exfiltration; compromised Harness update.
- Mitigations and tests: environment secrets plus `auditRepositorySecrets` test; `_headers` plus Vitest header test and deploy check; config guard tests; Storage pgTAP guards; Semgrep and audit in CI; zizmor and actionlint; hook upload tests; update PR guardrail highlight.
- New third-party origins added to `public/_headers`: `*.supabase.co` only.

## Evidence

- Red: `node --test` for hook uploads, config guard, verify config step, and github-protect audit → failed before implementation (missing behavior or export).
- Red: header test with `'unsafe-eval'` added → 1 failed; Biome → `lint/security/noDangerouslySetInnerHtml` on a sample; Semgrep → exit 1 on open redirect and `eval` samples; Storage guards → 3/3 failed on a public bucket without limits and a `true` policy.
- Green: `npm run check` → 153 tests pass, skills ✔, secrets ✔; `npm run harness -- verify` → Tudo verde; scaffolded template (locked deps) lint, typecheck, 6 tests, build ✔; `pnpm audit --audit-level high --ignore-unfixable` ✔; Semgrep clean; Storage guards and security advisors pass on compliant buckets; config guard on real `supabase init` output → 5 weak defaults, 0 after hardening; actionlint 1.7.12 with shellcheck 0.11.0 → no findings; zizmor 1.30.1 → no findings.
- Review: fresh-context reviewer → 4 P1, 9 P2. Fixed: update PR guardrail banner never rendered (origin/HEAD missing) (P1); environments now restricted to `main` through custom branch policies, and docs corrected, including the private Free-plan limit (P1); Edge Function template CORS preflight headers (P1); config guard multi-line arrays, inline tables, and secret keys (`pass`, `*.secrets.*`, `*_api_key`, `secret_key`) (P1); P2: `_shared` function scanning and comment-proof caller checks; `--fix` adds missing keys; hook upload bypasses (combined curl flags, bare hosts, `gh gist`, `ssh <`); guide 02 table; exact bucket match, read-only public exception, always-true detection (`1 = 1`, `or true`); deploy header check follows redirects; SECURITY.md fallback. Accepted: `[remotes.*]` sections are not checked.
- Re-verify: `npm run check` → 158 tests pass, skills ✔, secrets ✔; actionlint + shellcheck and zizmor → no findings; Storage guards failed on img/images, `1 = 1`, `or true`, and allow-public uploads, and passed on compliant buckets.
- Course correction: not needed.
- Remaining risks: preview Cloudflare token can deploy the Worker; registry-dependent checks (audit, Semgrep) can flake; production Auth settings rely on the checklist; agents other than Claude Code rely on Git hooks and CI.
- Memory consulted / captured: none needed; ADR 0015 records the decision.
