# Git and pull-request production flow

## Mental model

`main` is the production candidate. A feature branch is a safe workspace. A pull request is the review record. CI is the automated verifier. A merge is the human decision to release the reviewed change.

## Feature flow

1. Create or select a work item.
2. Update `main`, then create `feature/<work-item>` or `fix/<work-item>`.
3. Make one focused change, following TDD inside Docker Compose.
4. Commit meaningful checkpoints; never commit secrets, `.env` files, build output, or Docker volumes.
5. Open a pull request using `.github/PULL_REQUEST_TEMPLATE.md`.
6. CI must pass before review. Address requested changes and rerun checks after every material update.
7. The owner reviews the summary, acceptance criteria, test evidence, risk, and rollback. With multiple maintainers, a separate required reviewer approves.
8. Squash-merge the approved pull request into `main`; delete the branch.
9. CI deploys the exact merged commit to production. Verify the deployment URL and record the result in the work item.

## Required `main` protections

- Pull request required; direct push and force push blocked.
- Require up-to-date passing CI checks and resolved conversations.
- Require one independent approval when at least two maintainers exist; dismiss prior approval when new commits are pushed.
- Squash merge only; restrict bypasses to an emergency owner and document every bypass in a follow-up work item.

## Production workflow

- Trigger only from `main` after merge, never from a pull-request event or local machine.
- Use a `production` environment, deployment concurrency of one, least-privileged CI credentials, and immutable commit-SHA pins for third-party Actions.
- The job sequence is: retrieve the merged revision, run the containerized quality gate, deploy the verified static output with Wrangler, smoke-test the public URL, and publish the deployment identifier.
- If a smoke test fails, stop the release and roll back to the last known-good Cloudflare deployment. Open a fix work item; do not patch production manually.

## When a schema migration is present

Require explicit expand/contract compatibility, RLS allow/deny evidence, a rollback or forward-fix decision, and a production verification query. A destructive or irreversible migration requires a separate user approval before release.

## GitHub capability check

Before activating environment reviewers, verify repository visibility and plan capabilities. For a private repository with one maintainer, rely on protected-branch CI plus the owner's manual PR review/merge; do not configure a reviewer requirement that cannot be satisfied.
