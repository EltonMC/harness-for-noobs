---
name: harness-supabase-security
description: Design or review Supabase schema, RLS, Auth, Storage, views, functions, and data access for this repository. Use for any change that affects client data access or authorization.
---

Read `.harness/context/access-matrix.md` and the relevant work item before changing Supabase resources.

For schema construction or alteration, also read the approved database change proposal and DBA review under `.harness/database/` before implementation.

- Use migrations for persistent schema, grants, and policy changes.
- For every exposed table, define least-privilege grants, enable RLS, add operation-specific policies, and write allow and deny tests before the policy implementation.
- Treat views, RPC functions, Edge Functions, and Storage buckets as separate authorization surfaces.
- Keep secret and `service_role` credentials out of React/browser code.
- `supabase/tests/database/000_rls_enabled.test.sql` fails when any `public` table lacks RLS; never delete or weaken it. It runs in the Database gate only when `supabase/config.toml` exists — confirm it does. Add operation-specific allow and deny pgTAP tests next to it.
- The browser bundle is scanned for privileged keys by `verify` and CI; a finding is a release blocker.
- Verify the policy suite with `pnpm db:test` and record its result in the work item before declaring completion.
