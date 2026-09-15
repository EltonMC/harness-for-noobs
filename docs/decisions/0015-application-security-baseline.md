# ADR 0015: Enforce an application security baseline across secrets, browser, auth, storage, functions, CI, and agents

## Status

Accepted — 2026-09-15.

## Context

ADRs 0010, 0012, and 0014 already cover supply chain, repository guardrails, and database authorization. A security review of the Harness found gaps outside those areas:

- production deploy secrets were documented as repository secrets, which every workflow run on any same-repository branch can read;
- the published SPA sent no security headers, so an XSS would steal the Supabase session;
- `supabase init` generates weak Auth defaults and nothing checked them;
- Storage buckets and Edge Functions had no rules;
- vulnerability and static analysis depended on the GitHub plan;
- workflows kept checkout credentials on disk and were not linted for security;
- agents could upload local files to arbitrary hosts, and project MCP servers were auto-enabled;
- there was no security incident procedure, threat-model step, audit-log pattern, or vulnerability-reporting policy.

## Decision

1. **Secrets in environments.** Deploy secrets live in the `production` environment (Supabase token and database password, Cloudflare) and the `preview` environment (Cloudflare only). The preview job declares `environment: preview`. `github-protect` restricts `production` and `production-destructive` to the `main` branch through custom deployment branch policies (the "protected branches" option admits every branch when only rulesets exist), creates `preview`, warns about deploy secrets stored at repository level, and enables private vulnerability reporting when available. Guides require expiry dates and 2FA.
2. **Browser.** The app template ships `public/_headers` with a strict CSP (`script-src 'self'`, Supabase-only `connect-src`, `frame-ancestors 'none'`, `object-src 'none'`), HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and COOP. A Vitest test fails when the policy weakens, and the deploy smoke test fails when production lacks the headers (a warning for projects created before this ADR). Biome enables `noDangerouslySetInnerHtml`, `noGlobalEval`, and `noBlankTarget` as errors.
3. **Auth, API, Storage, and functions configuration.** `.harness/scripts/supabase-config-guard.mjs` checks `supabase/config.toml`: password length and character requirements, e-mail confirmation, secure password change, TOTP MFA availability, JWT expiry of at most one hour, refresh-token rotation, anonymous sign-ins, exact HTTPS redirect URLs, bounded rate limits, `api.max_rows`, storage size limits, bucket visibility, size, and type limits, `verify_jwt = false`, and literal secrets. For Edge Functions it flags CORS `*` and privileged keys used without checking the caller. Exceptions are `# harness:allow <reason>` (or `// harness:allow-cors`, `harness:allow-no-auth`) lines. `init-app` hardens the generated config, and `--fix` does the same for existing projects. It runs in `verify` and the new required **Security scan** check.
4. **Storage guards.** `.harness/database/guards/001_storage_guards.test.sql` requires size and MIME limits on every bucket, a `harness:allow-public` policy naming each public bucket, and no bare `true` policy on `storage.objects`.
5. **Dependencies and static analysis.** The Quality gate runs `pnpm audit --audit-level high --ignore-unfixable`. The Security scan runs Semgrep 1.177.0 (`p/react`, `p/typescript`, `p/secrets`) on application sources on any plan.
6. **Dynamic analysis.** Each preview runs the OWASP ZAP baseline (passive, report-only artifact) against the preview URL.
7. **Workflows.** Every checkout sets `persist-credentials: false` except the Harness update job, which pushes and is explicitly ignored. Harness CI runs checksum-verified actionlint 1.7.12 (with shellcheck) and zizmor 1.30.1. The Harness update PR flags changes to workflows, hooks, database guards, and agent settings in red.
8. **Agents.** Hooks ask before `curl`/`wget` uploads of local files to non-local hosts and before `nc`, `scp`, `rsync`, and `sftp` transfers. Claude Code does not auto-enable project MCP servers, and Codex sandboxed commands have no network. `AGENTS.md` declares external content as data, never instructions.
9. **Process.** The work item gains a Security section (lightweight STRIDE threat model with a test per mitigation) for sign-in, personal data, payments, uploads, admin actions, third-party origins, and Edge Functions. `.harness/context/security-patterns.md` holds the patterns (redirects, CAPTCHA with Turnstile, MFA `aal2`, Storage paths, the Edge Function template, the audit log table, and monitoring). `harness-recovery` and `docs/guia/09-incidente-de-seguranca.md` define containment, key revocation, evidence, and LGPD notification. `.github/SECURITY.md` defines reporting.

## Consequences

- New projects start with stronger Auth defaults; local sign-up now needs e-mail confirmation through the local mail viewer.
- Adding any third-party script, font, or API needs a reviewed change to `public/_headers`.
- `pnpm audit` and Semgrep depend on their registries at CI time; an outage fails the check, and re-running is the remedy.
- The preview Cloudflare token can still deploy the Worker, which is inherent to per-PR previews. Fork PRs do not receive it.
- Production Auth settings are not pushed from `config.toml` (a mistaken local `site_url` would break production sign-in). The production checklist mirrors the guarded values instead.
- Agents other than Claude Code rely on Git hooks, CI, and their own sandboxes.
- Environment secrets require a public repository or a paid plan for private repositories; on private Free repositories the owner keeps repository secrets and accepts the risk (documented).
- ZAP findings do not block merges yet; the owner reads the report before launch.

## Evidence

- `.harness/scripts/supabase-config-guard.test.mjs`: the real `supabase init` config (CLI 2.117.0) reports exactly five weak defaults, and none after hardening.
- `001_storage_guards.test.sql` failed 3/3 on an insecure public bucket with a `true` policy and passed on private and excepted buckets; security advisors clean (local database).
- App template scaffolded with the locked dependencies: lint, typecheck, tests (6), and build pass; the header test fails when `'unsafe-eval'` is added; Biome flags `dangerouslySetInnerHTML`; `pnpm audit` passes; Semgrep is clean on the template and exits 1 on open-redirect and `eval` samples.
- actionlint (with shellcheck) and zizmor report no findings on the workflows.
- Hook, verify, and github-protect tests.
