# Database change review

## Before implementation

1. Create a database change proposal and compare it with the data dictionary.
2. Ask the smallest necessary product question when the meaning, ownership, lifecycle, or source of truth is ambiguous.
3. Produce a DBA review report. Block P0 security, integrity, or destructive-data risks; record P1 conditions before implementation.
4. Update the access matrix before an exposed Supabase access change.
5. Write the smallest failing database or behavior test before the migration or policy implementation.

## Implementation and verification

1. Create a versioned migration; do not make an untracked remote schema change.
2. Add primary keys, relationships, constraints, policies, and indexes justified by the proposal.
3. Reset the local database from migrations, then run database lint and pgTAP tests.
4. Run RLS allow and deny tests for every applicable client operation.
5. Inspect query plans or the advisor for high-volume or changed query paths. Record why an index is retained, added, or rejected.
6. Update the final DBA report and attach it to the work item and pull request.

## Merge and release

- A database PR cannot merge with an unresolved P0 or P1 condition.
- A destructive, irreversible, or large backfill change needs a separate user approval before production.
- Deploy compatible additive schema changes before application code. Remove deprecated schema only in a later approved change.
