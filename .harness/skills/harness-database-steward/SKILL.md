---
name: harness-database-steward
description: Review a proposed or implemented Supabase Postgres schema change as a pragmatic DBA. Use for tables, columns, migrations, indexes, constraints, RLS-adjacent design, views, functions, triggers, or data lifecycle changes.
---

Read `.harness/database/DATA_DICTIONARY.md`, the current work item, the database change proposal, and `.harness/workflows/database-change-review.md` before proposing or changing SQL.

1. Identify the durable business concepts, their source of truth, ownership/tenant boundary, lifecycle, and any semantic duplicate candidate. Ask the owner only about ambiguities the schema cannot answer.
2. Review primary keys, types, relationships, cardinality, `not null`, `unique`, `check`, defaults, delete behavior, timestamps, and data-retention needs. Prefer lower-case `snake_case` names and prevent business invariants from living only in application code.
3. Review expected query, join, sort, foreign-key, and RLS predicate paths. Require evidence for each index and flag redundant indexes; default to indexing foreign-key and RLS filter columns unless the proposal documents why not.
4. For exposed Supabase resources, hand off to `harness-supabase-security`: grants, RLS, operation-specific policies, and allow/deny tests are mandatory.
5. Review migration compatibility, lock/backfill risk, idempotence where appropriate, rollback or forward-fix strategy, and destructive-change authorization.
6. Write the DBA review report with `APPROVE`, `APPROVE WITH CONDITIONS`, or `BLOCK`. P0 security, integrity, or irreversible-data risks block implementation or merge.
7. After implementation, require `pnpm db:reset` (local reset from migrations), `pnpm db:lint`, `pnpm db:test` (includes the guard that every `public` table has RLS enabled), relevant integration tests, and advisor/query-plan review when available. CI repeats lint and tests. Record one-line evidence in the report and work item.

Do not treat a linter, advisor, or naming similarity as proof of business duplication. Do not execute remote SQL, modify production data, or approve an irreversible release without the user's explicit authorization.
