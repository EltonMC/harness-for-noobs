# Work Item: establish database DBA stewardship

## Outcome

Add a reviewable, beginner-friendly DBA guard that validates database construction and alteration before implementation and merge.

## Acceptance criteria

- Database changes require proposal, data-dictionary comparison, DBA review, migration, and executable validation.
- The review distinguishes blockers, conditions, and recommendations in plain language.
- The database-steward skill connects modelling, performance, migrations, and Supabase security without executing remote changes.

## Scope

- Harness documentation, templates, workflow, skill, and memory only.
- No Supabase project, schema, migration, remote SQL, or production data is changed.

## Verification

- Configuration and skill frontmatter validate.
- Required database governance artifacts and adapter copies exist.

## TDD evidence

Not applicable: this establishes a non-executable governance layer. Future schema changes require database tests before implementation.
