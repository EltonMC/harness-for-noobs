---
name: harness-supabase-security
description: Design or review Supabase schema, RLS, Auth, Storage, views, functions, and data access for this repository. Use for any change that affects client data access or authorization.
---

Read `.harness/context/access-matrix.md` and the relevant work item before changing Supabase resources.

For schema construction or alteration, also read the approved database change proposal and DBA review under `.harness/database/` before implementation.

- Use migrations for persistent schema, grants, and policy changes. Never edit a migration that already exists on `main`.
- For every exposed table, define least-privilege grants, enable RLS, add operation-specific policies, and write allow and deny tests before the policy implementation. Each access scenario in the owner card is one test with the same wording.
- Treat views, RPC functions, Edge Functions, and Storage buckets as separate authorization surfaces.
- Wrap `auth.uid()` as `(select auth.uid())` in policies and index the columns they filter. Never authorize with `user_metadata`; it is editable by the user. Use `app_metadata` or a table instead.
- Keep secret and `service_role` credentials out of React/browser code.
- `.harness/database/guards/000_harness_guards.test.sql` fails when a `public` table lacks RLS, a public view lacks `security_invoker = true`, a materialized view is readable by API roles, a policy is a bare `true`, a policy uses `user_metadata`, a public function is `security definer`, a function lacks a fixed `search_path`, a view reads `auth.users`, a table or view lacks a purpose comment, a column lacks a `pii:` classification, or a foreign key blocks account deletion. Never delete or weaken it; justified exceptions are `harness:allow-public`, `harness:allow-security-definer`, or `harness:allow-restrict-user-delete` comments listed in the access matrix.
- `supabase db advisors --local --type security --level warn --fail-on warn` must pass; it runs in `verify`, the Database gate, and the deploy.
- The browser bundle is scanned for privileged keys by `verify` and CI; a finding is a release blocker.
- Sign-in, Storage, and Edge Functions follow `.harness/context/security-patterns.md` (load only the matching section). `supabase/config.toml` and `supabase/functions/` must pass `node .harness/scripts/supabase-config-guard.mjs` (also in `verify` and the Security scan check); weak `supabase init` defaults are fixed with `--fix`, and exceptions are `# harness:allow <reason>` lines the owner approved.
- Storage buckets are private with size and type limits; `.harness/database/guards/001_storage_guards.test.sql` enforces it. Object paths start with the owner id.
- Edge Functions check the caller (`auth.getUser`) before any privileged step, validate input, and list CORS origins.
- Admin-only data and actions require MFA (`aal2`) and write an audit log entry.
- The agent never queries a remote database (psql, `supabase db query --linked`, `db dump`, or database MCP tools); hooks deny it. Investigate with the local stack and fictitious seed data.
- Verify with `npm run harness -- verify` and record its result in the work item before declaring completion.
