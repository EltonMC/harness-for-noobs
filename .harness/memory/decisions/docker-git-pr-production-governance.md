# Docker, Git, PR, and production governance

## Type

Decision

## Summary

Run local development and CI verification in Docker Compose. Deliver each change through a feature branch and protected pull request; only CI deploys an approved merge from `main` to production.

## Evidence

- `docs/decisions/0003-docker-git-pr-production-governance.md`
- `.harness/workflows/local-development.md`
- `.harness/workflows/git-pr-production.md`

## Consequence

Do not add host-only execution, direct pushes to `main`, or local production deployment paths. Keep production credentials in CI, and add database compatibility evidence for every Supabase change.

## Status

Active
