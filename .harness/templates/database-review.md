# DBA Review: <short-slug>

## Verdict

`APPROVE` | `APPROVE WITH CONDITIONS` | `BLOCK`

## Plain-language summary

Explain whether the change is safe to implement and what the owner needs to decide or fix.

## Findings

| Severity | Area | Evidence | Required action |
| --- | --- | --- | --- |
| P0 blocker / P1 condition / P2 recommendation | integrity / duplication / security / performance / migration / operations | path, query plan, or proposal section | concrete correction |

## DBA checklist

- [ ] Every entity has a documented purpose and source of truth.
- [ ] Semantic duplicate candidates were compared with the data dictionary.
- [ ] Primary keys, relationships, required fields, unique rules, checks, and delete behavior express the intended invariants.
- [ ] Types, names, timestamps, money, and nullable fields are intentional.
- [ ] Query, join, sort, RLS, and foreign-key index choices have evidence and no redundant index is introduced.
- [ ] Public exposure, grants, RLS, views, functions, triggers, RPCs, and Storage were assessed where applicable.
- [ ] Migration is compatible, has lock/backfill assessment, and has rollback or forward-fix handling.
- [ ] Reset, lint, pgTAP, and relevant integration/performance tests are planned or recorded.

## Final evidence

- Proposal:
- Migration(s):
- Commands and results:
- Reviewer:
- Review date:
