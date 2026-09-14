# Git and pull-request production flow

## Mental model

`main` is production. A branch is a safe workspace. A pull request is the review record, with a preview link. CI is the verifier and the only deployer. The owner's merge is the release decision.

## Feature flow

1. Create or select a work item (`direct` changes need none).
2. `git switch main && git pull`, then `git switch -c feature/<name>` or `fix/<name>`.
3. Make one focused change test-first; `npm run harness -- verify`.
4. Commit with a Conventional Commit message. Git hooks block commits on `main`, secrets, and lint failures.
5. `git push -u origin <branch>` and open a pull request from the template, with a plain-language summary and a numbered "Como testar" script (local steps when there is no preview or the PR changes the database).
6. CI runs the Harness checks, Quality gate, and Database gate; after the Quality gate passes, a preview URL is commented.
7. The owner tests the preview, reads the summary, and squash-merges. Agents never merge.
8. CI verifies the merged commit, applies database migrations, then deploys the frontend and smoke-tests the production URL.
9. `git switch main && git pull`, then `git branch -D <branch>` (squash merges need `-D`).

## Required protections (`npm run harness -- github-protect --apply`)

- Ruleset on the default branch: pull request required, conversations resolved, required checks (`Harness checks`, `Quality gate`, `Database gate`) green and up to date, no force push, no deletion, squash only. The application checks pass with a notice before `init-app`, so they are required from day one.
- Zero required approvals while there is a single maintainer; raise it when a second maintainer exists.
- `production` environment limited to protected branches.
- Secret scanning with push protection, Dependabot alerts and security updates, CodeQL default setup, and permission for Actions to open pull requests (used by the Harness update workflow), where the GitHub plan allows.
- Private repositories on the free plan cannot enforce rulesets or secret scanning: make the repository public or use a paid plan, and say so explicitly to the owner.

## Production workflow

- Triggered only by a push to `main`; never from a pull request or a laptop.
- Serialized jobs in the `production` environment, least-privileged tokens in GitHub secrets, third-party Actions pinned to full commit SHAs.
- Order: verification of the merged commit (including database lint and tests) → database migrations (`supabase db push`) → production build → bundle secret scan → `wrangler deploy` → smoke test.
- On failure: roll back the frontend in Cloudflare (Workers → Deployments), revert the pull request, open a fix work item. A rollback does not undo applied migrations; fix forward with a migration PR. Never patch production manually.

## When a schema migration is present

Require expand/contract compatibility, RLS allow/deny evidence, and a rollback or forward-fix decision. A destructive or irreversible migration needs a separate explicit owner approval before merge.
