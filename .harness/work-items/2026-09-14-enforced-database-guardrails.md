# 2026-09-14-enforced-database-guardrails: enforce database modelling, security, and personal-data rules

## Outcome

A non-technical owner approves database changes through a plain-language data card, and scripts, pgTAP guards, CI, the deploy, and agent hooks enforce the DBA process, RLS/view/function security, personal-data classification, immutable migrations, and a second approval for destructive SQL.

## Gate

- Size: session — source: direct owner request after the database-stage assessment ("executa as mudanças").
- Intent gaps: none. Preview database branching (item 7 of the assessment) is out of scope: it changes ADR 0003 and needs an upstream decision.
- Irreversible actions: none locally. Guardrail files (`.claude/settings.json`, `.harness/hooks/`, `.github/workflows/`) changed with the owner's explicit request. `github-protect --apply` (creates a GitHub environment) is left for the owner to run.
- Footprint: hooks, verify, new database guard and PR comment scripts, CI and deploy workflows, GitHub protection plan, database templates, skills, ADR 0014, owner guides, app template seed and scripts.
- Readiness: PASS

## Acceptance criteria

- [x] pgTAP guards fail on insecure or undocumented schema objects and pass on a compliant schema.
- [x] Security advisors run locally, in CI, and in the deploy, and fail on warnings.
- [x] The database change guard blocks edited published migrations, missing DBA review, missing owner approval, undocumented new tables, invalid migration names, missing `config.toml`, and unapproved destructive SQL.
- [x] `verify` runs the guard and fails when the branch changes `supabase/` while the local database is off.
- [x] The PR receives a plain-language risk report without overwriting the preview comment.
- [x] Destructive releases wait for a required reviewer and fail when none is configured; the deploy prints a dry-run and stores a schema-only dump.
- [x] Hooks deny remote Postgres clients, remote Supabase queries/dumps, database MCP write tools, and edits to published migrations.
- [x] The owner has a Portuguese guide and templates for approval.

## Scope

- In scope: items 1–6 of the assessment (automated guards, change guard, destructive release approval, closing remote paths, owner data card, LGPD from modelling).
- Explicit non-goals: Supabase branching for previews; foreign-key index enforcement (performance, stays in DBA review).

## Data and authorization

- Tables, RLS, Storage, Auth, RPC, Edge Functions: no product schema; guards cover RLS, views, materialized views, policies, functions, `auth.users` exposure, comments, personal data, and account deletion.
- Access matrix and DBA review: templates updated with scenarios and guard exceptions.
- Allow/deny tests: guard fixtures (insecure and compliant migrations) exercised against a local database.

## Evidence

- Files changed: see `git diff --stat` on `feature/database-guardrails`.
- Red: `supabase test db .harness/database/guards` on an insecure migration → 11/11 assertions failed, each naming the offending object.
- Red: `node --test .harness/scripts/database-guard.test.mjs` → module missing; hook, verify, github-protect, and upsert-pr-comment tests failed before implementation.
- Green: same guards on a compliant migration → PASS; `supabase db advisors --local --type security --fail-on warn` → exit 1 on a security definer view, exit 0 on the compliant migration.
- Green: end-to-end scratch project (Supabase CLI 2.117.0) — a branch editing a published migration and adding an undocumented destructive migration failed `verify` with `db:guard, db:test, db:guards, db:advisors`; after the fix, `verify` → Tudo verde; `--classify-only` wrote `requires_owner_approval=true`.
- Verify: `npm run check` → 134 tests pass, skill integrity ✔, tracked-file secret scan ✔. `actionlint` on the changed workflows → only the pre-existing SC2016 info.
- Review: fresh-context reviewer → 1 P0, 4 P1, 9 P2. Fixed: frontend skipped after a skipped approval job (P0); deploy now classifies pending migrations instead of the push diff (P1); classifier misses (`drop` without `column`, aliased `update`, `merge`, `cascade`, `drop owned`, `--` inside strings) (P1); hook gaps (`--dbname=URI`, `hostaddr=`, `export PGHOST`, Supabase global flags, `db diff`/`inspect --linked`, service names) (P1); approvals accepted "pendente" (P1); P2: glob exemption limited to shell words, function-body and recreate false positives, table-cell documentation match, MCP listings/logs/generic servers, clearer environment API error, schema dump only on private repositories. Accepted: shell writes to published migrations rely on the change guard in verify/CI; `supabase` must be on PATH for verify; `security_invoker=yes` and partition-child comment nits.
- Re-verify: `npm run check` → 142 tests pass, skill integrity ✔, secret scan ✔; actionlint → no new findings.
- Course correction: not needed.
- Remaining risks: the Supabase CLI dry-run output format was not run against a real project (unreadable output fails safe to approval); regex SQL classification can miss dynamic SQL; required environment reviewers are unavailable on private free-plan repositories (deploy fails safe); existing projects with tables must add comments and fix findings when they update.
- Memory consulted / captured: none needed; ADR 0014 records the decision.
