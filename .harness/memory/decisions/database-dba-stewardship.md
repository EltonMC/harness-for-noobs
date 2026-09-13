# Database DBA stewardship

## Type

Decision

## Summary

Every Supabase Postgres construction or alteration has a change proposal, pragmatic DBA review, tracked migration, and executable local validation. The data dictionary gives semantic context so duplicate business concepts are caught early.

## Evidence

- `docs/decisions/0004-database-dba-stewardship.md`
- `.harness/workflows/database-change-review.md`
- `.harness/skills/harness-database-steward/SKILL.md`

## Consequence

Do not write or merge schema SQL before the review. A linter finding or schema-name similarity is evidence to investigate, not a substitute for product judgment.

## Status

Active
