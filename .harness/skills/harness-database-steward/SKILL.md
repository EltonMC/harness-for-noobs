---
name: harness-database-steward
description: Review a proposed or implemented Supabase Postgres schema change as a pragmatic DBA. Use for tables, columns, migrations, indexes, constraints, RLS-adjacent design, views, functions, triggers, personal data, or data lifecycle changes.
---

Read `.harness/database/DATA_DICTIONARY.md`, the current work item, the database change proposal, and `.harness/workflows/database-change-review.md` before proposing or changing SQL.

1. Identify the durable business concepts, their source of truth, ownership/tenant boundary, lifecycle, and any semantic duplicate candidate. Ask the owner only about ambiguities the schema cannot answer.
2. Write the proposal's "Ficha do dado" in owner_locale, without SQL or jargon: what is stored and why, who sees and changes it, personal or sensitive data (LGPD), retention, account deletion, what is lost if it fails, access scenarios, and a mermaid diagram. Present it to the owner and wait for an explicit answer before recording "Aprovado por". Never fill an approval line yourself.
3. Review primary keys, types, relationships, cardinality, `not null`, `unique`, `check`, defaults, delete behavior, timestamps, and data-retention needs. Prefer lower-case `snake_case` names and prevent business invariants from living only in application code.
4. Classify every column with `comment on column … is 'pii:none|pii:personal|pii:sensitive <purpose>'`, comment every table and view, and make foreign keys to `auth.users` cascade or set null so an account can be deleted. Challenge any sensitive column: collect only what the stated purpose needs.
5. Review expected query, join, sort, foreign-key, and RLS predicate paths. Require evidence for each index and flag redundant indexes; default to indexing foreign-key and RLS filter columns unless the proposal documents why not.
6. For exposed Supabase resources, hand off to `harness-supabase-security`: grants, RLS, operation-specific policies, and allow/deny tests (one per access scenario) are mandatory.
7. Review migration compatibility, lock/backfill risk, idempotence where appropriate, rollback or forward-fix strategy, and destructive-change authorization. Published migrations are immutable; fixes are new migrations. For SQL the guard classifies as rewriting or destructive, explain in plain language exactly what data changes or disappears, confirm a recent backup, and require the owner's separate written approval.
8. Write the DBA review report with exactly one verdict (`APPROVE`, `APPROVE WITH CONDITIONS`, or `BLOCK`), the proposal path, and every migration file name. P0 security, integrity, personal-data, or irreversible-data risks block implementation or merge.
9. After implementation, run `npm run harness -- verify` with the local stack on. It runs the database change guard, `db:lint`, `db:test`, the Harness guards (`supabase test db .harness/database/guards`), and `supabase db advisors --local --type security`. Record one-line evidence in the report and work item.

Do not treat a linter, advisor, or naming similarity as proof of business duplication. Do not execute remote SQL, read production data, modify production data, or approve an irreversible release without the user's explicit authorization. Never weaken or delete a Harness guard; an exception is a justified `harness:allow-*` comment recorded in the review.
