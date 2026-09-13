---
name: harness-git-pr-delivery
description: Prepare a safe Git branch, pull request, review, merge, and CI-only production release for this repository. Use when work is ready to share, review, merge, release, or recover from a deployment.
---

Read `.harness/workflows/git-pr-production.md`, the current work item, and relevant architecture decisions before taking Git or deployment actions.

- Work in one scoped feature or fix branch. Do not push directly to `main`, force-push shared history, merge, or deploy production without explicit user authorization.
- Before opening a pull request, run the configured Docker-based checks and complete the PR template with readiness, intent gaps, irreversible actions, footprint, test evidence, risk, migration impact, and rollback notes.
- Keep `main` protected with pull-request, required-check, and resolved-conversation rules. Use squash merge.
- Treat the owner's passing-PR review as the solo-maintainer approval. Add an independent required reviewer only when a second maintainer can satisfy it.
- CI deploys only the merged `main` revision. Store least-privileged deploy credentials in CI secrets, pin third-party Actions to full commit SHAs, and serialize production jobs.
- For Supabase changes, require migration compatibility, RLS evidence, and a rollback or forward-fix plan before release.
- Require a fresh-context independent review for non-trivial, security, data, authorization, migration, or public-interface changes. Do not open a PR with an unresolved `FAIL` readiness verdict.
- After a deployment, verify the public result and record the deployment identifier. If it fails, roll back through the platform and open a fix work item; never patch production manually.
