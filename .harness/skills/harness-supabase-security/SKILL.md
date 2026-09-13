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
- Verify the policy suite and record its exact result in the work item before declaring completion.
