# ADR 0004: Review every database change through a DBA stewardship gate

## Status

Accepted — 2026-09-13

## Context

The application uses Supabase Postgres and is built by people and agents with varying database experience. Schema decisions are difficult to reverse after production data exists. Mechanical tooling can lint SQL, but cannot reliably decide whether two tables represent the same business concept or whether a proposed model expresses the intended rules.

## Decision

- Every database construction or alteration receives a lightweight DBA review before implementation and a final review before merge.
- The review uses a change proposal, a data dictionary, migrations, database tests, linting, and the existing Supabase security workflow.
- The DBA review reports one of: `APPROVE`, `APPROVE WITH CONDITIONS`, or `BLOCK`, with severity, evidence, and a plain-language correction for each finding.
- Versioned migrations are the canonical schema history. Remote dashboard changes are not a substitute for committed migrations.
- The reviewer checks semantic duplication against the data dictionary. It may flag a duplicate candidate, but it must not claim two concepts are duplicates without domain evidence.

## Required validation

- Reset the local database from migrations successfully.
- Run `supabase db lint` with errors blocking merge.
- Run `supabase test db`; include pgTAP allow and deny tests for client-access rules.
- Review Supabase security and performance advisors when available.
- Review index choices against actual query, join, sort, and RLS filter paths; do not add indexes automatically without a read/write trade-off.

## Design baseline

- Give every durable entity a documented purpose, owner, primary key, lifecycle, and source of truth.
- Express invariants in the database when possible: primary keys, foreign keys, `not null`, `unique`, and `check` constraints.
- Prefer lowercase `snake_case` names, `timestamptz` for instants, exact numeric types for money, and explicit lifecycle semantics.
- Evaluate a foreign-key index by default and document an exception. Index columns that support frequent RLS predicates or proven query paths.
- Exposed Supabase tables require least-privilege grants, RLS, operation-specific policies, and allow/deny tests.
- Treat views, functions, triggers, RPCs, Storage, and Auth as separate database authorization or operational surfaces.
- Use additive, compatible migrations first. Destructive, irreversible, or data-rewriting changes require explicit user approval and a rollback or forward-fix strategy.

## Consequences

- A schema change takes a small amount of planning before SQL is written, but the proposal makes the change reviewable by a non-DBA owner.
- The first application scaffold must add the actual Supabase CLI and Docker commands to `.harness/harness.yaml`; this ADR does not invent commands before tooling exists.
- The review is a decision aid and gate, not a substitute for product ownership. The owner resolves semantic questions the database cannot answer.

## Evidence

- [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase database testing and linting](https://supabase.com/docs/guides/local-development/cli/testing-and-linting)
- [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase query optimization](https://supabase.com/docs/guides/database/query-optimization)
- `.harness/workflows/database-change-review.md`
- ADR 0014 turns this review into enforced checks.
