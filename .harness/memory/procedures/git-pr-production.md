# Git pull request to production

## Type

Procedure

## Summary

Use one feature branch and one pull request per scoped work item. A passing, reviewed PR is squash-merged to protected `main`, which is the only CI source permitted to deploy production.

## Evidence

- `.harness/workflows/git-pr-production.md`
- `.github/PULL_REQUEST_TEMPLATE.md`

## Consequence

Keep commits small and meaningful. Never push directly to `main` or run a local production deployment. Ask the user before any merge or external deployment.

## Status

Active
