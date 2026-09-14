---
name: harness-git-pr-delivery
description: Prepare a safe Git branch, commit, pull request with a plain-language summary and manual test script, review, and CI-only production release. Use when work is ready to share, review, merge, or release, or when the user says "entregar" or "abrir PR".
---

Read `.harness/workflows/git-pr-production.md` and the current work item first.

1. Confirm `npm run harness -- verify` is green (or that every skipped gate is explained) and the work item has its evidence. Do not open a PR with readiness `FAIL`.
2. Commit on the feature branch with a Conventional Commit message (`feat:`, `fix:`, `chore:`). Git hooks block commits to `main`, secrets, and lint failures: fix the cause, never bypass.
3. Push the branch (`git push -u origin <branch-name>`) after the person confirms.
4. Open the PR with `gh pr create` using `.github/PULL_REQUEST_TEMPLATE.md`. Write **O que muda** and **Como testar** in `owner_locale` for a non-technical owner: numbered clicks and the expected result.
   - With a preview (CI comments the link): use the preview URL.
   - Without a preview (Cloudflare not configured, fork, bot PR) or when the PR changes `supabase/migrations`: write local steps (`pnpm db:reset`, `pnpm dev`, open `http://localhost:5173`) and say why the preview is not enough.
5. Watch CI (`gh pr checks --watch`). On failure, read only the failing job summary and fix it on the same branch.
6. The owner reviews by testing and reading the summary, then merges. **Never merge, approve, or deploy on the owner's behalf.** CI verifies the merged commit, applies database migrations, then deploys the frontend.
7. After merge: confirm with `gh pr view <number> --json state` that it is `MERGED`, then `git switch main && git pull` and `git branch -D <branch>` (squash merges need `-D`). Confirm the production URL loads. On failure, follow `harness-recovery`: roll back the frontend in Cloudflare and revert the PR; migrations already applied need a forward fix.

For Supabase changes, the PR must include migration compatibility (expand/contract), RLS allow/deny tests, and a rollback or forward-fix note. Third-party Actions stay pinned to full commit SHAs; deploy credentials live only in GitHub secrets.
