# DBA Review: <short-slug>

## Verdict

<!-- Keep exactly one verdict; the database guard rejects an unfilled template. -->

`APPROVE` | `APPROVE WITH CONDITIONS` | `BLOCK`

## Plain-language summary

Explain whether the change is safe to implement and what the owner needs to decide or fix.

## Findings

| Severity | Area | Evidence | Required action |
| --- | --- | --- | --- |
| P0 blocker / P1 condition / P2 recommendation | integrity / duplication / security / personal-data / performance / migration / operations | path, query plan, or proposal section | concrete correction |

## DBA checklist

- [ ] Every entity has a documented purpose and source of truth, and a table comment.
- [ ] Semantic duplicate candidates were compared with the data dictionary, and new tables were added to it.
- [ ] Primary keys, relationships, required fields, unique rules, checks, and delete behavior express the intended invariants.
- [ ] Types, names, timestamps, money, and nullable fields are intentional.
- [ ] Every column is classified `pii:none`, `pii:personal`, or `pii:sensitive`; personal and sensitive data have a purpose, retention, and deletion path.
- [ ] Foreign keys to `auth.users` let an account be deleted.
- [ ] Query, join, sort, RLS, and foreign-key index choices have evidence and no redundant index is introduced.
- [ ] Public exposure, grants, RLS, views (`security_invoker`), functions (`search_path`, `security definer`), triggers, RPCs, and Storage were assessed; every guard exception is justified.
- [ ] Access scenarios in the owner card map one-to-one to allow/deny tests.
- [ ] Migration is compatible, has lock/backfill assessment, and has rollback or forward-fix handling; destructive or rewriting SQL has the owner's written approval.
- [ ] Reset, lint, pgTAP, Harness guards, security advisors, and relevant integration/performance tests are planned or recorded.

## Final evidence

- Proposal: .harness/database/changes/<file>.md
- Migration(s): <timestamp_name.sql, one per migration; the database guard matches these names>
- Commands and results:
- Reviewer:
- Review date:
