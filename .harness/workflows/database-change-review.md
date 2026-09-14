# Database change review

Enforced by `.harness/scripts/database-guard.mjs` (in `verify` and the Database gate), the pgTAP guards in `.harness/database/guards/`, and the Supabase security advisors. ADR 0004 defines the review; ADR 0014 defines the enforcement.

## Before implementation

1. Create a database change proposal from `.harness/templates/database-change-proposal.md` and compare it with the data dictionary.
2. Fill the "Ficha do dado" in owner_locale with no SQL: what is stored and why, who sees and changes it, personal or sensitive data, retention, account deletion, what is lost if it goes wrong, access scenarios, and a mermaid diagram.
3. Show the card to the owner and ask the smallest necessary product question. Record the owner's approval ("Aprovado por") only after the owner answers; never fill it on their behalf.
4. Add the entity to the data dictionary and the access matrix (the guard fails for undocumented new tables).
5. Produce a DBA review report with a single verdict and the migration file names. Block P0 security, integrity, or destructive-data risks; record P1 conditions before implementation.
6. Write the smallest failing database test first: one allow or deny pgTAP test per access scenario.

## Implementation and verification

1. Create a new migration with `supabase migration new <description>`. Never edit a migration that already exists on `main`; correct it with a new migration.
2. Add primary keys, relationships, constraints, policies, and indexes justified by the proposal, and follow the guard conventions:
   - `comment on table` for every table and view (purpose);
   - `comment on column … is 'pii:none|pii:personal|pii:sensitive <purpose>'` for every column;
   - views `with (security_invoker = true)`; functions `set search_path = ''`; security definer helpers in the `private` schema;
   - foreign keys to `auth.users` with `on delete cascade` or `on delete set null`;
   - exceptions only through `harness:allow-public`, `harness:allow-security-definer`, or `harness:allow-restrict-user-delete` comments, justified in the review.
3. Keep `supabase/seed.sql` fictitious; never copy production data.
4. Run `npm run harness -- verify` with the local stack on: guard, reset from migrations, lint, pgTAP, Harness guards, and security advisors.
5. Inspect query plans or the performance advisor for high-volume or changed query paths. Record why an index is retained, added, or rejected.
6. Update the final DBA report and attach it to the work item and pull request.

## Merge and release

- A database PR cannot merge with an unresolved P0 or P1 condition or a failing Database gate.
- The Database gate comments a plain-language risk report on the PR: 🟢 additive, 🟠 rewrites data or breaks compatibility, 🔴 deletes data.
- A 🟠 or 🔴 migration needs the owner's written approval in the proposal ("Aprovação de mudança que apaga ou reescreve dados") and, at deploy, an approval in the GitHub `production-destructive` environment. Confirm a recent production backup before asking.
- Deploy compatible additive schema changes before application code. Remove deprecated schema only in a later approved change (expand, then contract).
- The deploy classifies every migration pending in production (`db push --dry-run`), not only the merged diff, and on private repositories stores a schema-only dump as a workflow artifact before applying them.
