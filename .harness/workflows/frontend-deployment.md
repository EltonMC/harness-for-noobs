# Frontend deployment: Vite SPA to Cloudflare Workers Static Assets

The application template ships `wrangler.jsonc` (static assets with SPA fallback). The Harness-managed workflows `.github/workflows/app-ci.yml` and `app-deploy.yml` deploy it; both report success with a notice until the application exists.

## Preconditions (one-time, see `docs/guia/02-contas-e-segredos.md`)

- GitHub secrets: `CLOUDFLARE_API_TOKEN` (Workers edit permission only), `CLOUDFLARE_ACCOUNT_ID`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`.
- GitHub variables (public values): `SUPABASE_PROJECT_REF`, `PRODUCTION_SUPABASE_URL`, `PRODUCTION_SUPABASE_PUBLISHABLE_KEY`, `PREVIEW_SUPABASE_URL`, `PREVIEW_SUPABASE_PUBLISHABLE_KEY`, `PRODUCTION_URL`.
- Previews and deploys skip with a notice while secrets are missing. Once Cloudflare secrets exist, missing production Supabase variables fail the deploy instead of shipping a broken build.

## Contract

1. **Pull request** → Quality gate and Database gate → preview version uploaded with alias `pr-<number>` (only after the Quality gate passes) → preview URL commented on the PR. The first preview works only after one production deploy has created the Worker.
2. **Previews use the preview Supabase project, which never receives migrations.** When a PR changes `supabase/migrations`, the comment warns and the owner tests locally (`pnpm db:reset`, `pnpm dev`).
3. **Merge to `main`** → verification of the merged commit (lint, type-check, tests, build, database lint and tests) → production migrations → production build → bundle secret scan → deploy → smoke test.
4. Record the deployment in the work item when the change is user-visible.

## Rollback

A Cloudflare rollback (Workers → Deployments) restores the previous frontend only. Migrations already applied stay applied: design them expand/contract so the previous frontend still works, and fix forward with a new migration pull request when needed.

## Edge escalation

Add Worker code only when a work item names an edge/server responsibility that cannot live in the static SPA or a Supabase Edge Function, with its request boundary, secret handling, tests, observability, cost, and rollback.
