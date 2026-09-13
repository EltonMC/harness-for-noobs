# Database change review

## Type

Procedure

## Summary

Propose the data model, review it as a DBA, implement a versioned migration with tests, reset and lint locally, then attach the final review evidence to the pull request.

## Evidence

- `.harness/workflows/database-change-review.md`
- `.harness/templates/database-change-proposal.md`
- `.harness/templates/database-review.md`

## Consequence

Block unresolved integrity, security, and irreversible-data risks. Ask the user to resolve semantic ambiguity rather than inventing a model.

## Status

Active
