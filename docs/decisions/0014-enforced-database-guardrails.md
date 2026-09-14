# ADR 0014: Enforce database modelling, security, and personal-data rules mechanically

## Status

Accepted — 2026-09-14.

## Context

ADR 0004 made every database change pass a DBA review, but the review, the data dictionary, the access matrix, and the destructive-change approval were instructions. Only "every `public` table has RLS" was tested. An owner with little database experience cannot notice when an agent skips the proposal, publishes a view that bypasses RLS, stores personal data without a purpose, edits a migration that already ran in production, or ships a migration that deletes data. Several paths also reached the production database outside the Supabase CLI rules (psql, `supabase db query --linked`, `supabase db dump`, and database MCP tools).

## Decision

1. **Schema guards (pgTAP, Harness-owned).** `.harness/database/guards/000_harness_guards.test.sql` runs against the local database built from migrations and fails on: a `public` table without RLS; a `public` view without `security_invoker = true`; a materialized view readable by `anon` or `authenticated`; a bare `true` policy; a policy that uses `user_metadata`; a `security definer` function in `public`; a function in `public` or `private` without a fixed `search_path`; a view that reads `auth.users`; a table or view without a purpose comment; a column without a `pii:none|pii:personal|pii:sensitive` classification; a foreign key to `auth.users` that blocks account deletion. Exceptions are explicit object comments (`harness:allow-public`, `harness:allow-security-definer`, `harness:allow-restrict-user-delete`), visible in the migration and justified in the review. The guards live outside `supabase/tests`, so Harness updates reach existing projects.
2. **Supabase security advisors.** `supabase db advisors --local --type security --level warn --fail-on warn` runs on the same local database.
3. **Database change guard (Node, deterministic).** SQL is classified after removing comments, string literals, and function bodies (which run when called, not when migrated); `do` blocks are kept, and a dropped view, function, policy, trigger, or type recreated in the same migration is not a rewrite. Approvals require a name and a date. `.harness/scripts/database-guard.mjs` compares the branch with its base and fails when a migration that exists on the base is edited or deleted, a migration file name would be ignored by the Supabase CLI, migrations exist without `supabase/config.toml`, a new migration has no DBA review naming it or the review has no single verdict or is `BLOCK`, the linked proposal lacks the owner's approval, a new `public` table is missing from the data dictionary or access matrix, or SQL that deletes, rewrites, renames, or retypes data lacks the owner's separate written approval. It also renders a plain-language risk report (🟢 additive, 🟠 rewrite, 🔴 destructive).
4. **Owner-facing proposal.** The proposal starts with a "Ficha do dado" in owner_locale: what is stored and why, who sees and changes it, personal and sensitive data, retention, account deletion, what is lost on failure, access scenarios that map one-to-one to allow/deny tests, and a diagram. The approval lines are filled only after the owner answers.
5. **Where it runs.** `verify` (the guard always; schema guards and advisors with the local stack on; a stopped stack fails verification when the branch changes `supabase/`), the Database gate on every pull request (with the report posted as a PR comment), and the production deploy.
6. **Release gate.** The deploy classifies the migrations still pending in production (`supabase db push --dry-run`), not only the pushed diff, so a destructive migration left pending by a rejected release still needs approval. Unreadable dry-run output requires approval. A 🟠 or 🔴 release waits for a required reviewer on the `production-destructive` GitHub environment (created by `github-protect --apply`) and fails if the environment has no reviewer. On private repositories, a schema-only dump (no data) is stored as a 30-day artifact before `db push`.
7. **Agent hooks.** Deny Postgres clients (`psql`, `pg_dump`, `pg_dumpall`, `pg_restore`, `pgcli`) and `export PGHOST` aimed at non-local hosts (URIs anywhere in an argument, `host=`/`hostaddr=`, `-h`), ask when the target is a variable or a service name, ignore Supabase global flags before the subcommand, deny `supabase db query|diff|test db|inspect|migration up|down|squash|seed` with `--linked` or `--project-ref`, deny `supabase db dump` without `--local`, ask before `supabase db pull`, deny database MCP tools that run SQL, read logs, or change a project (listings and searches stay allowed), deny edits to migrations that exist on `main`, and ask before editing the schema guards.

## Consequences

- Every column needs a classification comment and every table a purpose comment. This is deliberate friction: personal data is decided when the column is created, not before launch.
- Regex classification of SQL is conservative. False positives cost an owner approval, and a destructive statement hidden in dynamic SQL can still evade it; the DBA review and schema dump remain the backstop.
- Required reviewers on environments are unavailable for private repositories on GitHub's free plan. There, the deploy of a destructive release fails with instructions instead of proceeding silently.
- The published-migration edit rule covers the agent's file tools; shell writes to a published migration are caught by the change guard in `verify` and CI.
- The dry-run output format of the Supabase CLI was not exercised against a real project (agent hooks deny `db push`); if it changes, every release asks for approval until the parser is updated.
- The preview database still does not receive migrations; testing database changes on a preview (Supabase branching) is a separate decision that changes ADR 0003.

## Evidence

- `.harness/database/guards/000_harness_guards.test.sql` failed all 11 assertions against a deliberately insecure migration and passed against a compliant one (Supabase CLI 2.117.0, local database).
- `supabase db advisors --local` exited 1 for a security definer view and 0 for the compliant migration.
- `.harness/scripts/database-guard.test.mjs`, `.harness/hooks/hook-policy.test.mjs`, `.harness/scripts/verify.test.mjs`, `.harness/scripts/github-protect.test.mjs`, `.harness/scripts/upsert-pr-comment.test.mjs`.
