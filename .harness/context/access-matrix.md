# Access Matrix

Update this before a Supabase schema or policy change that affects client access.

| Resource | Actor | Read | Create | Update | Delete | Enforcement | Tests |
| --- | --- | --- | --- | --- | --- | --- | --- |
| _Add per resource_ | _anon/authenticated/admin_ |  |  |  |  | _grant + RLS policy_ | _allow + deny case_ |

Rules:

- Model grants and RLS policies together; a policy alone is not an access model.
- Scope ownership predicates to the actual tenant or user boundary.
- Document Edge Functions, views, Storage buckets, and RPC functions when they bypass or supplement client-table access.
