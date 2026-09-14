# Access Matrix

Update this before a Supabase schema or policy change that affects client access. The database guard fails when a migration creates a `public` table that is not named here.

| Resource | Actor | Read | Create | Update | Delete | Enforcement | Tests |
| --- | --- | --- | --- | --- | --- | --- | --- |
| _Add per resource_ | _anon/authenticated/admin_ |  |  |  |  | _grant + RLS policy_ | _allow + deny case_ |

## Access scenarios

Plain-language scenarios copied from the owner card of each database change proposal. Each line has one pgTAP test with the same wording.

- _✅ A signed-in person reads their own records. → `supabase/tests/database/<resource>_rls.test.sql`_
- _❌ A signed-in person cannot read another person's records. → `supabase/tests/database/<resource>_rls.test.sql`_

Rules:

- Model grants and RLS policies together; a policy alone is not an access model.
- Scope ownership predicates to the actual tenant or user boundary.
- Document Edge Functions, views, Storage buckets, and RPC functions when they bypass or supplement client-table access.
- A `harness:allow-public` or `harness:allow-security-definer` exception is listed here with its reason.
